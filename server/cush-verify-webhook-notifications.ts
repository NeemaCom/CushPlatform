import { and, asc, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import {
  cushVerifyInstitutionalMemberships,
  cushVerifyInstitutionalUsers,
  cushVerifyInstitutions,
  cushVerifyWebhookDeliveries,
  cushVerifyWebhookDestinations,
  cushVerifyWebhookEvents,
  cushVerifyWebhookFailureNotifications,
} from "@shared/schema";
import { cushVerifyDb as db } from "./db";
import { sendCushVerifyWebhookFailureEmail } from "./cush-verify-webhook-failure-email";

const MAX_EMAIL_ATTEMPTS = 5;
const EMAIL_RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];
const EMAIL_LOCK_MS = 20_000;

export async function queueCushVerifyWebhookFailureNotifications(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: { deliveryId: number; institutionId: number },
): Promise<void> {
  const recipients = await tx.select({
    institutionalUserId: cushVerifyInstitutionalUsers.id,
  }).from(cushVerifyInstitutionalMemberships)
    .innerJoin(
      cushVerifyInstitutionalUsers,
      eq(cushVerifyInstitutionalUsers.id, cushVerifyInstitutionalMemberships.institutionalUserId),
    )
    .where(and(
      eq(cushVerifyInstitutionalMemberships.institutionId, input.institutionId),
      eq(cushVerifyInstitutionalMemberships.role, "organisation_admin"),
      eq(cushVerifyInstitutionalMemberships.status, "active"),
      eq(cushVerifyInstitutionalUsers.isActive, true),
      eq(cushVerifyInstitutionalUsers.isEmailVerified, true),
    ));
  if (!recipients.length) return;
  await tx.insert(cushVerifyWebhookFailureNotifications).values(recipients.map((recipient) => ({
    deliveryId: input.deliveryId,
    institutionId: input.institutionId,
    institutionalUserId: recipient.institutionalUserId,
  }))).onConflictDoNothing();
}

export async function processCushVerifyWebhookFailureNotificationEmails(limit = 10): Promise<number> {
  const now = new Date();
  const claimed = await db.transaction(async (tx) => {
    await tx.update(cushVerifyWebhookFailureNotifications).set({
      emailStatus: "failed",
      emailLockedUntil: null,
      emailLastErrorCode: "email_delivery_failed",
      updatedAt: now,
    }).where(and(
      eq(cushVerifyWebhookFailureNotifications.emailStatus, "sending"),
      gte(cushVerifyWebhookFailureNotifications.emailAttemptCount, MAX_EMAIL_ATTEMPTS),
      or(
        isNull(cushVerifyWebhookFailureNotifications.emailLockedUntil),
        lt(cushVerifyWebhookFailureNotifications.emailLockedUntil, now),
      ),
    ));
    const notifications = await tx.select({
      notification: cushVerifyWebhookFailureNotifications,
      user: cushVerifyInstitutionalUsers,
      institution: cushVerifyInstitutions,
      delivery: cushVerifyWebhookDeliveries,
      destination: cushVerifyWebhookDestinations,
      event: cushVerifyWebhookEvents,
    }).from(cushVerifyWebhookFailureNotifications)
      .innerJoin(
        cushVerifyInstitutionalUsers,
        eq(cushVerifyInstitutionalUsers.id, cushVerifyWebhookFailureNotifications.institutionalUserId),
      )
      .innerJoin(
        cushVerifyInstitutionalMemberships,
        and(
          eq(cushVerifyInstitutionalMemberships.institutionId, cushVerifyWebhookFailureNotifications.institutionId),
          eq(cushVerifyInstitutionalMemberships.institutionalUserId, cushVerifyWebhookFailureNotifications.institutionalUserId),
          eq(cushVerifyInstitutionalMemberships.status, "active"),
          eq(cushVerifyInstitutionalMemberships.role, "organisation_admin"),
        ),
      )
      .innerJoin(
        cushVerifyInstitutions,
        eq(cushVerifyInstitutions.id, cushVerifyWebhookFailureNotifications.institutionId),
      )
      .innerJoin(
        cushVerifyWebhookDeliveries,
        and(
          eq(cushVerifyWebhookDeliveries.id, cushVerifyWebhookFailureNotifications.deliveryId),
          eq(cushVerifyWebhookDeliveries.institutionId, cushVerifyWebhookFailureNotifications.institutionId),
        ),
      )
      .innerJoin(
        cushVerifyWebhookDestinations,
        eq(cushVerifyWebhookDestinations.id, cushVerifyWebhookDeliveries.destinationId),
      )
      .innerJoin(
        cushVerifyWebhookEvents,
        eq(cushVerifyWebhookEvents.id, cushVerifyWebhookDeliveries.eventId),
      )
      .where(and(
        eq(cushVerifyInstitutionalUsers.isActive, true),
        eq(cushVerifyInstitutionalUsers.isEmailVerified, true),
        or(
          and(
            eq(cushVerifyWebhookFailureNotifications.emailStatus, "pending"),
            lte(cushVerifyWebhookFailureNotifications.emailNextAttemptAt, now),
            lt(cushVerifyWebhookFailureNotifications.emailAttemptCount, MAX_EMAIL_ATTEMPTS),
          ),
          and(
            eq(cushVerifyWebhookFailureNotifications.emailStatus, "sending"),
            lt(cushVerifyWebhookFailureNotifications.emailAttemptCount, MAX_EMAIL_ATTEMPTS),
            or(
              isNull(cushVerifyWebhookFailureNotifications.emailLockedUntil),
              lt(cushVerifyWebhookFailureNotifications.emailLockedUntil, now),
            ),
          ),
        ),
      ))
      .orderBy(asc(cushVerifyWebhookFailureNotifications.emailNextAttemptAt))
      .limit(Math.max(1, Math.min(limit, 50)))
      .for("update", { skipLocked: true });
    const rows = [];
    for (const row of notifications) {
      const attemptCount = row.notification.emailAttemptCount + 1;
      const [notification] = await tx.update(cushVerifyWebhookFailureNotifications).set({
        emailStatus: "sending",
        emailAttemptCount: attemptCount,
        emailLockedUntil: new Date(now.getTime() + EMAIL_LOCK_MS),
        emailLastAttemptedAt: now,
        updatedAt: now,
      }).where(eq(cushVerifyWebhookFailureNotifications.id, row.notification.id)).returning();
      rows.push({ ...row, notification });
    }
    return rows;
  });

  for (const row of claimed) {
    const result = await sendCushVerifyWebhookFailureEmail({
      notificationId: row.notification.id,
      email: row.user.email,
      contactName: row.user.fullName,
      institutionName: row.institution.legalName,
      destinationName: row.destination.name,
      eventType: row.event.eventType,
      lastErrorCode: row.delivery.lastErrorCode,
      attemptCount: row.notification.emailAttemptCount,
    });
    const completedAt = new Date();
    const retryDelay = EMAIL_RETRY_DELAYS_MS[
      Math.min(row.notification.emailAttemptCount - 1, EMAIL_RETRY_DELAYS_MS.length - 1)
    ] ?? 2 * 60 * 60_000;
    const shouldRetry = result.status === "failed" &&
      row.notification.emailAttemptCount < MAX_EMAIL_ATTEMPTS;
    await db.update(cushVerifyWebhookFailureNotifications).set({
      emailStatus: result.status === "sent"
        ? "sent"
        : result.status === "not_configured"
          ? "not_configured"
          : shouldRetry
            ? "pending"
            : "failed",
      emailNextAttemptAt: shouldRetry
        ? new Date(completedAt.getTime() + retryDelay)
        : completedAt,
      emailLockedUntil: null,
      emailLastErrorCode: result.status === "failed"
        ? "email_delivery_failed"
        : result.status === "not_configured"
          ? "email_not_configured"
          : null,
      updatedAt: completedAt,
    }).where(eq(cushVerifyWebhookFailureNotifications.id, row.notification.id));
  }
  return claimed.length;
}
