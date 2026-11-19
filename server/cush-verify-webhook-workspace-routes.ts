import type { Express, Response } from "express";
import { randomBytes } from "node:crypto";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  cushVerifyInstitutions,
  cushVerifyWebhookAuditEvents,
  cushVerifyWebhookDeliveryAttempts,
  cushVerifyWebhookDeliveries,
  cushVerifyWebhookDestinations,
  cushVerifyWebhookEvents,
  cushVerifyWebhookFailureNotifications,
} from "@shared/schema";
import { cushVerifyDb as db } from "./db";
import {
  getWebhookAdmin,
  safeDestinationView,
  updateWebhookDestinationSchema,
  webhookDestinationInputSchema,
} from "./cush-verify-webhook-routes";
import { getProductionApiAccess } from "./cush-verify-api-key-service";
import { isInstitutionalAuthenticated, requireApprovedInstitution, type InstitutionalRequest } from "./cush-verify-institutional-routes";
import {
  CushVerifyWebhookError,
  encryptCushVerifyWebhookSecret,
  validateCushVerifyWebhookUrl,
} from "./cush-verify-webhooks";

function invalidDestinationResponse(error: unknown) {
  return error instanceof CushVerifyWebhookError
    ? "Use an HTTPS destination on a publicly reachable host, without URL credentials or query parameters."
    : "The webhook destination could not be verified.";
}

function validId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function getEligibleWebhookAdmin(req: InstitutionalRequest, res: Response) {
  const actor = await getWebhookAdmin(req);
  if (!actor) {
    res.status(403).json({ error: "Only an active organisation administrator can manage production webhooks." });
    return null;
  }
  const access = await getProductionApiAccess(actor.institutionId);
  if (!access.enabled) {
    res.status(403).json({ error: access.reason || "Production API access is not enabled for this organisation." });
    return null;
  }
  return actor;
}

export function registerCushVerifyWebhookWorkspaceRoutes(app: Express): void {
  app.get(
    "/api/verify/webhooks",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      try {
        const actor = await getEligibleWebhookAdmin(req, res);
        if (!actor) return;
        const [destinations, auditEvents] = await Promise.all([
          db.select().from(cushVerifyWebhookDestinations)
            .where(and(
              eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
              eq(cushVerifyWebhookDestinations.environment, "production"),
            ))
            .orderBy(desc(cushVerifyWebhookDestinations.createdAt))
            .limit(100),
          db.select({
            id: cushVerifyWebhookAuditEvents.id,
            destinationId: cushVerifyWebhookAuditEvents.destinationId,
            actorInstitutionalUserId: cushVerifyWebhookAuditEvents.actorInstitutionalUserId,
            eventType: cushVerifyWebhookAuditEvents.eventType,
            details: cushVerifyWebhookAuditEvents.details,
            createdAt: cushVerifyWebhookAuditEvents.createdAt,
          }).from(cushVerifyWebhookAuditEvents)
            .where(eq(cushVerifyWebhookAuditEvents.institutionId, actor.institutionId))
            .orderBy(desc(cushVerifyWebhookAuditEvents.createdAt))
            .limit(50),
        ]);
        return res.json({
          destinations: destinations.map(safeDestinationView),
          auditEvents: auditEvents.map((event) => ({
            ...event,
            createdAt: event.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        console.error("Cush Verify workspace webhook list failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Webhook settings are temporarily unavailable." });
      }
    },
  );

  app.post(
    "/api/verify/webhooks",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = webhookDestinationInputSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Check the name, HTTPS URL, event types, and usage thresholds." });
      try {
        const actor = await getEligibleWebhookAdmin(req, res);
        if (!actor) return;
        const validatedUrl = await validateCushVerifyWebhookUrl(parsed.data.url);
        const signingSecret = randomBytes(32).toString("base64url");
        const encrypted = encryptCushVerifyWebhookSecret(signingSecret);
        const destination = await db.transaction(async (tx) => {
          await tx.select({ id: cushVerifyInstitutions.id })
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.id, actor.institutionId))
            .for("update")
            .limit(1);
          const [existingCount] = await tx.select({ total: count() })
            .from(cushVerifyWebhookDestinations)
            .where(and(
              eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
              eq(cushVerifyWebhookDestinations.environment, "production"),
              inArray(cushVerifyWebhookDestinations.status, ["active", "disabled"]),
            ));
          if (Number(existingCount?.total ?? 0) >= 20) return null;
          const [created] = await tx.insert(cushVerifyWebhookDestinations).values({
            institutionId: actor.institutionId,
            createdByInstitutionalUserId: actor.userId,
            name: parsed.data.name,
            url: validatedUrl.toString(),
            environment: "production",
            eventTypes: parsed.data.eventTypes,
            usageThresholdPercentages: parsed.data.usageThresholdPercentages,
            ...encrypted,
          }).returning();
          await tx.insert(cushVerifyWebhookAuditEvents).values({
            institutionId: actor.institutionId,
            destinationId: created.id,
            actorInstitutionalUserId: actor.userId,
            eventType: "created",
            details: { eventTypes: parsed.data.eventTypes },
          });
          return created;
        });
        if (!destination) return res.status(429).json({ error: "An organisation can have at most 20 webhook destinations." });
        return res.status(201).json({
          destination: safeDestinationView(destination),
          signingSecret,
          secretNotice: "Copy the signing secret now. It will not be shown again.",
        });
      } catch (error) {
        console.error("Cush Verify workspace webhook creation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return error instanceof CushVerifyWebhookError
          ? res.status(400).json({ error: invalidDestinationResponse(error) })
          : res.status(503).json({ error: "The webhook destination could not be created." });
      }
    },
  );

  app.patch(
    "/api/verify/webhooks/:id",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = validId(req.params.id);
      const parsed = updateWebhookDestinationSchema.safeParse(req.body);
      if (!id || !parsed.success) return res.status(400).json({ error: "Choose a valid destination and at least one supported update." });
      try {
        const actor = await getEligibleWebhookAdmin(req, res);
        if (!actor) return;
        const [current] = await db.select().from(cushVerifyWebhookDestinations).where(and(
          eq(cushVerifyWebhookDestinations.id, id),
          eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
          eq(cushVerifyWebhookDestinations.environment, "production"),
          inArray(cushVerifyWebhookDestinations.status, ["active", "disabled"]),
        )).limit(1);
        if (!current) return res.status(404).json({ error: "Webhook destination not found." });
        const eventTypes = parsed.data.eventTypes ?? current.eventTypes;
        const usageThresholdPercentages = parsed.data.usageThresholdPercentages ?? current.usageThresholdPercentages;
        if (eventTypes.includes("usage.threshold_reached") !== (usageThresholdPercentages.length > 0)) {
          return res.status(400).json({ error: "Usage thresholds must be configured only for usage threshold events." });
        }
        const validatedUrl = parsed.data.url ? await validateCushVerifyWebhookUrl(parsed.data.url) : null;
        const updated = await db.transaction(async (tx) => {
          const [row] = await tx.update(cushVerifyWebhookDestinations).set({
            ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
            ...(validatedUrl ? { url: validatedUrl.toString() } : {}),
            eventTypes,
            usageThresholdPercentages,
            ...(parsed.data.status ? { status: parsed.data.status } : {}),
            updatedAt: new Date(),
          }).where(and(
            eq(cushVerifyWebhookDestinations.id, id),
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
            inArray(cushVerifyWebhookDestinations.status, ["active", "disabled"]),
          )).returning();
          if (!row) return null;
          if (parsed.data.status === "disabled") {
            await tx.update(cushVerifyWebhookDeliveries).set({
              status: "cancelled",
              lockedUntil: null,
              updatedAt: new Date(),
            }).where(and(
              eq(cushVerifyWebhookDeliveries.destinationId, id),
              eq(cushVerifyWebhookDeliveries.institutionId, actor.institutionId),
              inArray(cushVerifyWebhookDeliveries.status, ["pending", "processing"]),
            ));
          }
          await tx.insert(cushVerifyWebhookAuditEvents).values({
            institutionId: actor.institutionId,
            destinationId: id,
            actorInstitutionalUserId: actor.userId,
            eventType: parsed.data.status === "disabled" ? "disabled" : "updated",
            details: {
              fields: Object.keys(parsed.data),
              ...(parsed.data.eventTypes ? { eventTypes: parsed.data.eventTypes } : {}),
            },
          });
          return row;
        });
        return updated
          ? res.json({ destination: safeDestinationView(updated) })
          : res.status(404).json({ error: "Webhook destination not found." });
      } catch (error) {
        console.error("Cush Verify workspace webhook update failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return error instanceof CushVerifyWebhookError
          ? res.status(400).json({ error: invalidDestinationResponse(error) })
          : res.status(503).json({ error: "The webhook destination could not be updated." });
      }
    },
  );

  app.delete(
    "/api/verify/webhooks/:id",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = validId(req.params.id);
      if (!id) return res.status(400).json({ error: "The destination ID is invalid." });
      try {
        const actor = await getEligibleWebhookAdmin(req, res);
        if (!actor) return;
        const now = new Date();
        const deleted = await db.transaction(async (tx) => {
          const [row] = await tx.update(cushVerifyWebhookDestinations).set({
            status: "deleted",
            deletedAt: now,
            secretCiphertext: "",
            secretIv: "",
            secretTag: "",
            updatedAt: now,
          }).where(and(
            eq(cushVerifyWebhookDestinations.id, id),
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
            inArray(cushVerifyWebhookDestinations.status, ["active", "disabled"]),
          )).returning({ id: cushVerifyWebhookDestinations.id });
          if (!row) return false;
          await tx.update(cushVerifyWebhookDeliveries).set({
            status: "cancelled",
            lockedUntil: null,
            updatedAt: now,
          }).where(and(
            eq(cushVerifyWebhookDeliveries.destinationId, id),
            eq(cushVerifyWebhookDeliveries.institutionId, actor.institutionId),
            inArray(cushVerifyWebhookDeliveries.status, ["pending", "processing"]),
          ));
          await tx.insert(cushVerifyWebhookAuditEvents).values({
            institutionId: actor.institutionId,
            destinationId: id,
            actorInstitutionalUserId: actor.userId,
            eventType: "deleted",
            details: {},
          });
          return true;
        });
        return deleted ? res.status(204).end() : res.status(404).json({ error: "Webhook destination not found." });
      } catch (error) {
        console.error("Cush Verify workspace webhook delete failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The webhook destination could not be deleted." });
      }
    },
  );

  app.post(
    "/api/verify/webhooks/:id/rotate-secret",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = validId(req.params.id);
      if (!id) return res.status(400).json({ error: "The destination ID is invalid." });
      try {
        const actor = await getEligibleWebhookAdmin(req, res);
        if (!actor) return;
        const signingSecret = randomBytes(32).toString("base64url");
        const encrypted = encryptCushVerifyWebhookSecret(signingSecret);
        const rotated = await db.transaction(async (tx) => {
          const [row] = await tx.update(cushVerifyWebhookDestinations).set({
            ...encrypted,
            updatedAt: new Date(),
          }).where(and(
            eq(cushVerifyWebhookDestinations.id, id),
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
            inArray(cushVerifyWebhookDestinations.status, ["active", "disabled"]),
          )).returning({ id: cushVerifyWebhookDestinations.id });
          if (!row) return false;
          await tx.insert(cushVerifyWebhookAuditEvents).values({
            institutionId: actor.institutionId,
            destinationId: id,
            actorInstitutionalUserId: actor.userId,
            eventType: "secret_rotated",
            details: {},
          });
          return true;
        });
        if (!rotated) return res.status(404).json({ error: "Webhook destination not found." });
        return res.json({
          destinationId: id,
          signingSecret,
          secretNotice: "Copy the new signing secret now. The previous secret is no longer valid.",
        });
      } catch (error) {
        console.error("Cush Verify workspace webhook secret rotation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The signing secret could not be rotated." });
      }
    },
  );

  app.get(
    "/api/verify/webhooks/:id/deliveries",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = validId(req.params.id);
      if (!id) return res.status(400).json({ error: "The destination ID is invalid." });
      try {
        const actor = await getEligibleWebhookAdmin(req, res);
        if (!actor) return;
        const [destination] = await db.select({ id: cushVerifyWebhookDestinations.id })
          .from(cushVerifyWebhookDestinations)
          .where(and(
            eq(cushVerifyWebhookDestinations.id, id),
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
          )).limit(1);
        if (!destination) return res.status(404).json({ error: "Webhook destination not found." });
        const rows = await db.select({
          delivery: cushVerifyWebhookDeliveries,
          event: cushVerifyWebhookEvents,
        }).from(cushVerifyWebhookDeliveries)
          .innerJoin(cushVerifyWebhookEvents, eq(
            cushVerifyWebhookEvents.id,
            cushVerifyWebhookDeliveries.eventId,
          ))
          .where(and(
            eq(cushVerifyWebhookDeliveries.destinationId, id),
            eq(cushVerifyWebhookDeliveries.institutionId, actor.institutionId),
          ))
          .orderBy(desc(cushVerifyWebhookDeliveries.createdAt))
          .limit(100);
        const attemptsByDelivery = new Map<number, typeof cushVerifyWebhookDeliveryAttempts.$inferSelect[]>();
        if (rows.length) {
          const attempts = await db.select().from(cushVerifyWebhookDeliveryAttempts)
            .where(inArray(cushVerifyWebhookDeliveryAttempts.deliveryId, rows.map(({ delivery }) => delivery.id)))
            .orderBy(desc(cushVerifyWebhookDeliveryAttempts.startedAt));
          for (const attempt of attempts) {
            const items = attemptsByDelivery.get(attempt.deliveryId) ?? [];
            items.push(attempt);
            attemptsByDelivery.set(attempt.deliveryId, items);
          }
        }
        return res.json({
          deliveries: rows.map(({ delivery, event }) => ({
            id: delivery.id,
            eventId: event.id,
            eventType: event.eventType,
            status: delivery.status,
            attemptCount: delivery.attemptCount,
            lastStatusCode: delivery.lastStatusCode,
            lastErrorCode: delivery.lastErrorCode,
            createdAt: delivery.createdAt.toISOString(),
            deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
            attempts: (attemptsByDelivery.get(delivery.id) ?? []).map((attempt) => ({
              attemptNumber: attempt.attemptNumber,
              outcome: attempt.outcome,
              responseStatus: attempt.responseStatus,
              errorCode: attempt.errorCode,
              durationMs: attempt.durationMs,
              startedAt: attempt.startedAt.toISOString(),
              completedAt: attempt.completedAt?.toISOString() ?? null,
            })),
          })),
        });
      } catch (error) {
        console.error("Cush Verify workspace webhook delivery history failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Webhook delivery history is temporarily unavailable." });
      }
    },
  );

  app.get(
    "/api/verify/webhook-notifications",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const limit = Number(req.query.limit ?? 20);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: "Choose a notification limit between 1 and 100." });
      }
      try {
        const actor = await getWebhookAdmin(req);
        if (!actor) return res.status(403).json({ error: "Only organisation administrators can view webhook failure alerts." });
        const rows = await db.select({
          notification: cushVerifyWebhookFailureNotifications,
          delivery: cushVerifyWebhookDeliveries,
          destination: cushVerifyWebhookDestinations,
          event: cushVerifyWebhookEvents,
        }).from(cushVerifyWebhookFailureNotifications)
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
            eq(cushVerifyWebhookFailureNotifications.institutionId, actor.institutionId),
            eq(cushVerifyWebhookFailureNotifications.institutionalUserId, actor.userId),
          ))
          .orderBy(desc(cushVerifyWebhookFailureNotifications.createdAt))
          .limit(limit);
        return res.json({
          notifications: rows.map(({ notification, delivery, destination, event }) => ({
            id: notification.id,
            destinationName: destination.name,
            eventType: event.eventType,
            deliveryStatus: delivery.status,
            attemptCount: delivery.attemptCount,
            lastErrorCode: delivery.lastErrorCode,
            emailStatus: notification.emailStatus,
            createdAt: notification.createdAt.toISOString(),
            readAt: notification.readAt?.toISOString() ?? null,
          })),
        });
      } catch (error) {
        console.error("Cush Verify webhook notification list failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Webhook alerts are temporarily unavailable." });
      }
    },
  );

  app.patch(
    "/api/verify/webhook-notifications/:id/read",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = validId(req.params.id);
      if (!id) return res.status(400).json({ error: "The notification ID is invalid." });
      try {
        const actor = await getWebhookAdmin(req);
        if (!actor) return res.status(403).json({ error: "Only organisation administrators can update webhook alerts." });
        const [notification] = await db.update(cushVerifyWebhookFailureNotifications).set({
          readAt: new Date(),
          updatedAt: new Date(),
        }).where(and(
          eq(cushVerifyWebhookFailureNotifications.id, id),
          eq(cushVerifyWebhookFailureNotifications.institutionId, actor.institutionId),
          eq(cushVerifyWebhookFailureNotifications.institutionalUserId, actor.userId),
        )).returning({ id: cushVerifyWebhookFailureNotifications.id });
        return notification
          ? res.json({ success: true })
          : res.status(404).json({ error: "Webhook alert not found." });
      } catch (error) {
        console.error("Cush Verify webhook notification update failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Webhook alert could not be updated." });
      }
    },
  );
}
