import { createHash, randomBytes } from "node:crypto";
import type { Express, Request, Response, NextFunction } from "express";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  cushVerifyApplications,
  cushVerifyApplicationEvents,
  cushVerifyEmailActivations,
  cushVerifyInstitutionalMemberships,
  cushVerifyInstitutionalUsers,
  cushVerifyInstitutions,
  cushVerifyInvitations,
} from "@shared/schema";
import {
  cushVerifyApplicationSchema,
  cushVerifyInstitutionalRegistrationSchema,
  cushVerifyApplicationStatusSchema,
} from "@shared/cush-verify";
import {
  canAccessCushVerifyWorkspace,
  canFinalApproveCushVerifyApplication,
} from "@shared/cush-verify-access";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import { db } from "./db";
import {
  isAuthenticated,
  requireAdminPermission,
  requireTrustedAdminOrigin,
} from "./auth";
import {
  createCushVerifyPendingFirebaseUser,
  deleteCushVerifyFirebaseUser,
  setCushVerifyFirebaseUserActivated,
  verifyCushVerifyFirebaseIdentity,
} from "./firebase-auth";
import { recordAdminAuditEvent } from "./admin-audit";
import { getAllowedFrontendOrigins } from "./origin-policy";
import {
  sendCushVerifyActivationEmail,
  sendCushVerifyInvitationEmail,
} from "./cush-verify-invitation-email";
import { authRateLimit } from "./security";
import { SESSION_IDLE_TIMEOUT_MS } from "@shared/auth-constants";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
const GENERIC_ACTIVATION_RESEND_MESSAGE =
  "If an application is waiting for email activation, a fresh link has been sent.";

export type InstitutionalRequest = Request & {
  cushVerifyInstitutionalUserId?: number;
};

type AdminRequest = Request & { userId?: number };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDuplicateKey(legalName: string, country: string): string {
  return `${legalName.trim().toLowerCase().replace(/\s+/g, " ")}|${country.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashActivationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error &&
    (error as { code?: unknown }).code === "23505";
}

function respondIfInstitutionalSchemaMissing(error: unknown, res: Response): boolean {
  let current: unknown = error;
  const institutionalTables = [
    "cush_verify_applications",
    "cush_verify_institutions",
    "cush_verify_institutional_users",
    "cush_verify_invitations",
    "cush_verify_email_activations",
    "cush_verify_institutional_memberships",
    "cush_verify_application_events",
  ];
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (typeof current !== "object" || !("code" in current)) break;
    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
    const message = String(candidate.message ?? "").toLowerCase();
    if (
      (candidate.code === "42P01" || candidate.code === "42703") &&
      institutionalTables.some((table) => message.includes(table))
    ) {
      res.status(503).json({
        code: "CUSH_VERIFY_SCHEMA_MISSING",
        error: "Institutional accounts are not available until the Cush Verify database migration has been applied.",
      });
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

function publicApplicationError(res: Response) {
  return res.status(409).json({
    code: "CUSH_VERIFY_DUPLICATE_APPLICATION",
    error: "We could not start a new application with those details. If you have already applied, request a fresh activation link or contact Cush support.",
  });
}

function frontendOrigin(req: Request): string | null {
  const allowedOrigins = getAllowedFrontendOrigins();
  const configured = process.env.CUSH_VERIFY_APP_URL?.trim();
  if (configured) {
    try {
      const origin = new URL(configured).origin;
      if (allowedOrigins.has(origin)) return origin;
    } catch {
      return null;
    }
  }

  if (
    process.env.NODE_ENV === "production" &&
    allowedOrigins.has("https://verify.we-cush.com")
  ) {
    return "https://verify.we-cush.com";
  }

  const requestOrigin = req.get("Origin");
  if (requestOrigin && allowedOrigins.has(requestOrigin)) return requestOrigin;
  return [...allowedOrigins][0] ?? null;
}

function invitationUrl(req: Request, token: string): string | null {
  const origin = frontendOrigin(req);
  if (!origin) return null;
  const url = new URL("/verify/register", origin);
  url.searchParams.set("token", token);
  return url.toString();
}

function emailActivationUrl(req: Request, token: string): string | null {
  const origin = frontendOrigin(req);
  if (!origin) return null;
  const url = new URL("/verify/activate", origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

function sessionPromise(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

async function createInstitutionalSession(req: Request, institutionalUserId: number) {
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.cushVerifyInstitutionalUserId = institutionalUserId;
  req.session.lastActivity = Date.now();
  await sessionPromise(req);
}

function destroyInstitutionalSession(req: Request, res: Response, status: number, body: object) {
  res.clearCookie("connect.sid", {
    path: req.session.cookie.path || "/",
    httpOnly: true,
    secure: req.session.cookie.secure === true || req.secure,
    sameSite: req.session.cookie.sameSite,
  });
  req.session.destroy(() => undefined);
  return res.status(status).json(body);
}

export async function getInstitutionalWorkspaceState(institutionalUserId: number) {
  const [membership] = await db.select({
    membershipId: cushVerifyInstitutionalMemberships.id,
    role: cushVerifyInstitutionalMemberships.role,
    membershipStatus: cushVerifyInstitutionalMemberships.status,
    institutionId: cushVerifyInstitutions.id,
    institutionName: cushVerifyInstitutions.legalName,
    tradingName: cushVerifyInstitutions.tradingName,
    institutionStatus: cushVerifyInstitutions.status,
    applicationId: cushVerifyApplications.id,
    applicationStatus: cushVerifyApplications.status,
  })
    .from(cushVerifyInstitutionalMemberships)
    .innerJoin(
      cushVerifyInstitutions,
      eq(cushVerifyInstitutions.id, cushVerifyInstitutionalMemberships.institutionId),
    )
    .innerJoin(
      cushVerifyApplications,
      eq(cushVerifyApplications.id, cushVerifyInstitutions.sourceApplicationId),
    )
    .where(eq(cushVerifyInstitutionalMemberships.institutionalUserId, institutionalUserId))
    .orderBy(desc(cushVerifyInstitutionalMemberships.createdAt))
    .limit(1);
  return membership;
}

export async function isInstitutionalAuthenticated(
  req: InstitutionalRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session.cushVerifyInstitutionalUserId;
  if (!userId) {
    res.status(401).json({ code: "CUSH_VERIFY_SIGN_IN_REQUIRED", error: "Sign in to your Cush Verify institutional account." });
    return;
  }
  const now = Date.now();
  const lastActivity = req.session.lastActivity ?? 0;
  if (now - lastActivity >= SESSION_IDLE_TIMEOUT_MS) {
    destroyInstitutionalSession(req, res, 401, {
      code: "CUSH_VERIFY_SESSION_EXPIRED",
      error: "Your institutional session expired after 20 minutes of inactivity. Sign in again.",
    });
    return;
  }
  req.session.lastActivity = now;
  try {
    const [user] = await db.select()
      .from(cushVerifyInstitutionalUsers)
      .where(eq(cushVerifyInstitutionalUsers.id, userId))
      .limit(1);
    if (!user || !user.isActive || !user.isEmailVerified) {
      destroyInstitutionalSession(req, res, 401, {
        code: "CUSH_VERIFY_ACCOUNT_UNAVAILABLE",
        error: "This institutional account is not available. Contact Cush support.",
      });
      return;
    }
    const membership = await getInstitutionalWorkspaceState(userId);
    if (
      !membership ||
      membership.membershipStatus === "suspended" ||
      (membership.membershipStatus === "revoked" && membership.institutionStatus !== "rejected")
    ) {
      destroyInstitutionalSession(req, res, 403, {
        code: "CUSH_VERIFY_MEMBERSHIP_UNAVAILABLE",
        error: "This institutional membership is not active.",
      });
      return;
    }
    req.cushVerifyInstitutionalUserId = user.id;
    next();
  } catch (error) {
    console.error("Cush Verify institutional session lookup failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(503).json({ error: "Institutional sign-in is temporarily unavailable." });
  }
}

export function requireApprovedInstitution(
  req: InstitutionalRequest,
  res: Response,
  next: NextFunction,
): void {
  void (async () => {
    if (!req.cushVerifyInstitutionalUserId) {
      return res.status(401).json({ error: "Sign in to your institutional account." });
    }
    try {
      const membership = await getInstitutionalWorkspaceState(req.cushVerifyInstitutionalUserId);
      if (!membership || !canAccessCushVerifyWorkspace({
        applicationStatus: membership.applicationStatus,
        institutionStatus: membership.institutionStatus,
        membershipStatus: membership.membershipStatus,
      })) {
        return res.status(403).json({
          code: "CUSH_VERIFY_APPROVAL_REQUIRED",
          error: "Institutional access is not active. Complete the official email activation or contact Cush support.",
        });
      }
      next();
    } catch {
      res.status(503).json({ error: "Institutional access could not be checked." });
    }
  })();
}

export function registerCushVerifyInstitutionalRoutes(app: Express): void {
  app.post("/api/verify/applications", authRateLimit, async (req, res) => {
    const parsed = cushVerifyInstitutionalRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Check the required institution, contact, and password details." });
    }

    const { password, passwordConfirmation: _passwordConfirmation, ...applicationFields } = parsed.data;
    const input = cushVerifyApplicationSchema.parse(applicationFields);
    const businessEmail = normalizeEmail(input.businessEmail);
    const duplicateKey = normalizeDuplicateKey(input.legalName, input.countryOfRegistration);
    const token = randomBytes(32).toString("hex");
    const now = new Date();
    let firebaseUid: string | undefined;
    let applicationId: number | undefined;
    let activationId: number | undefined;

    try {
      firebaseUid = await createCushVerifyPendingFirebaseUser({
        email: businessEmail,
        password,
        displayName: input.contactFullName,
      });
      const created = await db.transaction(async (tx) => {
        const [application] = await tx.insert(cushVerifyApplications).values({
          legalName: input.legalName,
          tradingName: input.tradingName || null,
          institutionType: input.institutionType,
          countryOfRegistration: input.countryOfRegistration,
          website: input.website,
          businessEmail,
          normalizedBusinessEmail: businessEmail,
          duplicateKey,
          contactFullName: input.contactFullName,
          contactJobTitle: input.contactJobTitle,
          businessTelephone: input.businessTelephone,
          intendedUse: input.intendedUse,
          estimatedMonthlyVerifications: input.estimatedMonthlyVerifications ?? null,
          contactConsentAcceptedAt: now,
        }).returning({ id: cushVerifyApplications.id });
        const [activation] = await tx.insert(cushVerifyEmailActivations).values({
          applicationId: application.id,
          firebaseUid: firebaseUid!,
          tokenHash: hashActivationToken(token),
          expiresAt: new Date(now.getTime() + ACTIVATION_TTL_MS),
        }).returning({ id: cushVerifyEmailActivations.id });
        await tx.insert(cushVerifyApplicationEvents).values({
          applicationId: application.id,
          eventType: "submitted",
        });
        return { applicationId: application.id, activationId: activation.id };
      });
      applicationId = created.applicationId;
      activationId = created.activationId;
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      if (firebaseUid) {
        await deleteCushVerifyFirebaseUser(firebaseUid).catch((cleanupError) => {
          console.error("Cush Verify pending identity cleanup failed", {
            errorType: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
          });
        });
      }
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
      if (code === "CUSH_VERIFY_EMAIL_ALREADY_EXISTS" || isUniqueViolation(error)) {
        return publicApplicationError(res);
      }
      console.error("Cush Verify institutional application submission failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
        code: code.startsWith("CUSH_VERIFY_") ? code : undefined,
      });
      return res.status(503).json({ error: "We could not start your Cush Verify account. Please try again later." });
    }

    const activationLink = emailActivationUrl(req, token);
    const emailResult = activationLink
      ? await sendCushVerifyActivationEmail({
          email: businessEmail,
          contactName: input.contactFullName,
          institutionName: input.legalName,
          activationUrl: activationLink,
          activationId: activationId!,
        })
      : { status: "failed" as const, reason: "request_failed" as const };
    try {
      await db.insert(cushVerifyApplicationEvents).values({
        applicationId: applicationId!,
        eventType: emailResult.status === "sent"
          ? "activation_email_sent"
          : "activation_email_delivery_failed",
        details: { status: emailResult.status },
      });
    } catch (eventError) {
      console.error("Cush Verify activation email event could not be recorded", {
        errorType: eventError instanceof Error ? eventError.name : "UnknownError",
      });
    }

    if (emailResult.status !== "sent") {
      return res.status(202).json({
        success: true,
        emailDeliveryStatus: emailResult.status,
        message: "Your application is saved, but we could not send the activation email. Use the resend option or contact Cush support.",
      });
    }
    return res.status(201).json({
      success: true,
      emailDeliveryStatus: "sent",
      message: "Check your official email for a secure activation link. Activate your account there, then sign in to Cush Verify.",
    });
  });

  app.post("/api/verify/applications/resend-activation", authRateLimit, async (req, res) => {
    const email = typeof req.body?.businessEmail === "string"
      ? normalizeEmail(req.body.businessEmail)
      : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Enter a valid institutional email address." });
    }

    try {
      const [application] = await db.select({
        id: cushVerifyApplications.id,
        legalName: cushVerifyApplications.legalName,
        contactFullName: cushVerifyApplications.contactFullName,
      })
        .from(cushVerifyApplications)
        .where(and(
          eq(cushVerifyApplications.normalizedBusinessEmail, email),
          eq(cushVerifyApplications.status, "submitted"),
        ))
        .limit(1);
      if (!application) return res.json({ success: true, message: GENERIC_ACTIVATION_RESEND_MESSAGE });

      const [previousActivation] = await db.select({
        firebaseUid: cushVerifyEmailActivations.firebaseUid,
      })
        .from(cushVerifyEmailActivations)
        .where(eq(cushVerifyEmailActivations.applicationId, application.id))
        .orderBy(desc(cushVerifyEmailActivations.createdAt))
        .limit(1);
      if (!previousActivation) return res.json({ success: true, message: GENERIC_ACTIVATION_RESEND_MESSAGE });

      const token = randomBytes(32).toString("hex");
      const now = new Date();
      const activation = await db.transaction(async (tx) => {
        await tx.update(cushVerifyEmailActivations)
          .set({ revokedAt: now, claimedAt: null })
          .where(and(
            eq(cushVerifyEmailActivations.applicationId, application.id),
            isNull(cushVerifyEmailActivations.consumedAt),
            isNull(cushVerifyEmailActivations.revokedAt),
          ));
        const [created] = await tx.insert(cushVerifyEmailActivations).values({
          applicationId: application.id,
          firebaseUid: previousActivation.firebaseUid,
          tokenHash: hashActivationToken(token),
          expiresAt: new Date(now.getTime() + ACTIVATION_TTL_MS),
        }).returning({ id: cushVerifyEmailActivations.id });
        return created;
      });
      const activationLink = emailActivationUrl(req, token);
      const emailResult = activationLink
        ? await sendCushVerifyActivationEmail({
            email,
            contactName: application.contactFullName,
            institutionName: application.legalName,
            activationUrl: activationLink,
            activationId: activation.id,
          })
        : { status: "failed" as const, reason: "request_failed" as const };
      await db.insert(cushVerifyApplicationEvents).values({
        applicationId: application.id,
        eventType: emailResult.status === "sent"
          ? "activation_email_resent"
          : "activation_email_delivery_failed",
        details: { status: emailResult.status },
      });
      return res.json({ success: true, message: GENERIC_ACTIVATION_RESEND_MESSAGE });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      console.error("Cush Verify activation resend failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.json({ success: true, message: GENERIC_ACTIVATION_RESEND_MESSAGE });
    }
  });

  app.post("/api/verify/activations/lookup", authRateLimit, async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(404).json({ error: "This activation link is invalid or has expired." });
    }
    try {
      const [activation] = await db.select({
        id: cushVerifyEmailActivations.id,
        email: cushVerifyApplications.normalizedBusinessEmail,
        contactName: cushVerifyApplications.contactFullName,
        institutionName: cushVerifyApplications.legalName,
        expiresAt: cushVerifyEmailActivations.expiresAt,
      })
        .from(cushVerifyEmailActivations)
        .innerJoin(
          cushVerifyApplications,
          eq(cushVerifyApplications.id, cushVerifyEmailActivations.applicationId),
        )
        .where(and(
          eq(cushVerifyEmailActivations.tokenHash, hashActivationToken(token)),
          isNull(cushVerifyEmailActivations.consumedAt),
          isNull(cushVerifyEmailActivations.claimedAt),
          isNull(cushVerifyEmailActivations.revokedAt),
          gt(cushVerifyEmailActivations.expiresAt, new Date()),
          eq(cushVerifyApplications.status, "submitted"),
        ))
        .limit(1);
      if (!activation) return res.status(404).json({ error: "This activation link is invalid or has expired." });
      return res.json({
        email: activation.email,
        contactName: activation.contactName,
        institutionName: activation.institutionName,
        expiresAt: activation.expiresAt,
      });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      console.error("Cush Verify activation lookup failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(503).json({ error: "Activation status is temporarily unavailable." });
    }
  });

  app.post("/api/verify/activations/complete", authRateLimit, async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ error: "A valid activation link is required." });
    }

    const now = new Date();
    try {
      const [candidate] = await db.select({
        id: cushVerifyEmailActivations.id,
        applicationId: cushVerifyEmailActivations.applicationId,
        firebaseUid: cushVerifyEmailActivations.firebaseUid,
        email: cushVerifyApplications.normalizedBusinessEmail,
      })
        .from(cushVerifyEmailActivations)
        .innerJoin(
          cushVerifyApplications,
          eq(cushVerifyApplications.id, cushVerifyEmailActivations.applicationId),
        )
        .where(and(
          eq(cushVerifyEmailActivations.tokenHash, hashActivationToken(token)),
          isNull(cushVerifyEmailActivations.consumedAt),
          isNull(cushVerifyEmailActivations.claimedAt),
          isNull(cushVerifyEmailActivations.revokedAt),
          gt(cushVerifyEmailActivations.expiresAt, now),
          eq(cushVerifyApplications.status, "submitted"),
        ))
        .limit(1);
      if (!candidate) {
        return res.status(409).json({ error: "This activation link is invalid, expired, or has already been used. Request a fresh link if needed." });
      }

      const [claim] = await db.update(cushVerifyEmailActivations)
        .set({ claimedAt: now })
        .where(and(
          eq(cushVerifyEmailActivations.id, candidate.id),
          isNull(cushVerifyEmailActivations.consumedAt),
          isNull(cushVerifyEmailActivations.claimedAt),
          isNull(cushVerifyEmailActivations.revokedAt),
          gt(cushVerifyEmailActivations.expiresAt, now),
        ))
        .returning({ id: cushVerifyEmailActivations.id });
      if (!claim) {
        return res.status(409).json({ error: "This activation link is already being completed or has been used." });
      }

      let firebaseActivated = false;
      try {
        await setCushVerifyFirebaseUserActivated(candidate.firebaseUid, true);
        firebaseActivated = true;
        await db.transaction(async (tx) => {
          const [claimedActivation] = await tx.select({ id: cushVerifyEmailActivations.id })
            .from(cushVerifyEmailActivations)
            .where(and(
              eq(cushVerifyEmailActivations.id, claim.id),
              eq(cushVerifyEmailActivations.claimedAt, now),
              isNull(cushVerifyEmailActivations.consumedAt),
              isNull(cushVerifyEmailActivations.revokedAt),
            ))
            .limit(1);
          if (!claimedActivation) throw new Error("CUSH_VERIFY_ACTIVATION_CLAIM_LOST");

          const [application] = await tx.select()
            .from(cushVerifyApplications)
            .where(eq(cushVerifyApplications.id, candidate.applicationId))
            .limit(1);
          if (!application || application.status !== "submitted") {
            throw new Error("CUSH_VERIFY_APPLICATION_NOT_ACTIVATABLE");
          }
          const [existingInstitution] = await tx.select({ id: cushVerifyInstitutions.id })
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.sourceApplicationId, application.id))
            .limit(1);
          if (existingInstitution) throw new Error("CUSH_VERIFY_APPLICATION_ALREADY_ACTIVATED");

          const [institution] = await tx.insert(cushVerifyInstitutions).values({
            sourceApplicationId: application.id,
            legalName: application.legalName,
            tradingName: application.tradingName,
            institutionType: application.institutionType,
            countryOfRegistration: application.countryOfRegistration,
            website: application.website,
            businessEmail: application.businessEmail,
            normalizedBusinessEmail: application.normalizedBusinessEmail,
            duplicateKey: application.duplicateKey,
            status: "approved",
            approvedAt: now,
          }).returning({ id: cushVerifyInstitutions.id });
          const [institutionalUser] = await tx.insert(cushVerifyInstitutionalUsers).values({
            firebaseUid: candidate.firebaseUid,
            email: candidate.email,
            fullName: application.contactFullName,
            jobTitle: application.contactJobTitle,
            businessTelephone: application.businessTelephone,
            isEmailVerified: true,
            isActive: true,
          }).returning({ id: cushVerifyInstitutionalUsers.id });
          await tx.insert(cushVerifyInstitutionalMemberships).values({
            institutionId: institution.id,
            institutionalUserId: institutionalUser.id,
            role: "organisation_admin",
            status: "active",
          });
          await tx.update(cushVerifyApplications)
            .set({ status: "approved", updatedAt: now })
            .where(eq(cushVerifyApplications.id, application.id));
          await tx.update(cushVerifyEmailActivations)
            .set({ consumedAt: now, claimedAt: null })
            .where(and(
              eq(cushVerifyEmailActivations.id, claim.id),
              isNull(cushVerifyEmailActivations.consumedAt),
            ));
          await tx.insert(cushVerifyApplicationEvents).values({
            applicationId: application.id,
            institutionId: institution.id,
            eventType: "account_activated",
            details: { emailVerified: true, accessEnabled: true },
          });
        });
      } catch (error) {
        if (firebaseActivated) {
          await setCushVerifyFirebaseUserActivated(candidate.firebaseUid, false).catch((rollbackError) => {
            console.error("Cush Verify Firebase activation rollback failed", {
              errorType: rollbackError instanceof Error ? rollbackError.name : "UnknownError",
            });
          });
        }
        await db.update(cushVerifyEmailActivations)
          .set({ claimedAt: null })
          .where(and(
            eq(cushVerifyEmailActivations.id, claim.id),
            isNull(cushVerifyEmailActivations.consumedAt),
          ))
          .catch((releaseError) => {
            console.error("Cush Verify activation claim release failed", {
              errorType: releaseError instanceof Error ? releaseError.name : "UnknownError",
            });
          });
        throw error;
      }

      return res.json({
        success: true,
        accessGranted: true,
        message: "Your Cush Verify account is active. Sign in to open your institutional workspace.",
      });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : error instanceof Error ? error.message : "";
      if (
        code === "CUSH_VERIFY_APPLICATION_ALREADY_ACTIVATED" ||
        code === "CUSH_VERIFY_APPLICATION_NOT_ACTIVATABLE" ||
        isUniqueViolation(error)
      ) {
        return res.status(409).json({ error: "This application could not be activated. Contact Cush support for help." });
      }
      console.error("Cush Verify account activation failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
        code: code.startsWith("CUSH_VERIFY_") ? code : undefined,
      });
      return res.status(503).json({ error: "We could not activate the account. Try again or request a fresh activation link." });
    }
  });

  app.get("/api/verify/invitations/lookup", authRateLimit, async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(404).json({ error: "This invitation is invalid or has expired." });
    }
    try {
      const [invite] = await db.select({
        email: cushVerifyInvitations.email,
        fullName: cushVerifyInvitations.fullName,
        expiresAt: cushVerifyInvitations.expiresAt,
        institutionName: cushVerifyInstitutions.legalName,
      })
        .from(cushVerifyInvitations)
        .innerJoin(cushVerifyInstitutions, eq(cushVerifyInstitutions.id, cushVerifyInvitations.institutionId))
        .where(and(
          eq(cushVerifyInvitations.tokenHash, hashInvitationToken(token)),
          isNull(cushVerifyInvitations.acceptedAt),
          isNull(cushVerifyInvitations.revokedAt),
          gt(cushVerifyInvitations.expiresAt, new Date()),
          eq(cushVerifyInstitutions.status, "pending_approval"),
        ))
        .limit(1);
      if (!invite) return res.status(404).json({ error: "This invitation is invalid or has expired." });
      return res.json({
        email: invite.email,
        fullName: invite.fullName,
        institutionName: invite.institutionName,
        expiresAt: invite.expiresAt,
      });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      console.error("Cush Verify invitation lookup failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(503).json({ error: "Invitation status is temporarily unavailable." });
    }
  });

  app.post("/api/verify/invitations/accept", authRateLimit, async (req: InstitutionalRequest, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken : "";
    if (!/^[a-f0-9]{64}$/i.test(token) || !idToken) {
      return res.status(400).json({ error: "A valid invitation and verified sign-in are required." });
    }
    try {
      const identity = await verifyCushVerifyFirebaseIdentity(idToken);
      if (!identity.emailVerified) {
        return res.status(403).json({
          code: "CUSH_VERIFY_EMAIL_VERIFICATION_REQUIRED",
          error: "Verify your official email address before accepting this invitation.",
        });
      }
      const tokenHash = hashInvitationToken(token);
      const now = new Date();
      const member = await db.transaction(async (tx) => {
        const [invite] = await tx.update(cushVerifyInvitations)
          .set({ acceptedAt: now })
          .where(and(
            eq(cushVerifyInvitations.tokenHash, tokenHash),
            eq(cushVerifyInvitations.email, identity.email),
            isNull(cushVerifyInvitations.acceptedAt),
            isNull(cushVerifyInvitations.revokedAt),
            gt(cushVerifyInvitations.expiresAt, now),
          ))
          .returning();
        if (!invite) throw new Error("INVITATION_INVALID_OR_USED");

        const [institution] = await tx.select()
          .from(cushVerifyInstitutions)
          .where(and(
            eq(cushVerifyInstitutions.id, invite.institutionId),
            eq(cushVerifyInstitutions.status, "pending_approval"),
          ))
          .limit(1);
        if (!institution) throw new Error("INSTITUTION_NOT_PENDING");

        let [institutionalUser] = await tx.select()
          .from(cushVerifyInstitutionalUsers)
          .where(or(
            eq(cushVerifyInstitutionalUsers.firebaseUid, identity.uid),
            eq(cushVerifyInstitutionalUsers.email, identity.email),
          ))
          .limit(1);
        if (institutionalUser && (
          institutionalUser.firebaseUid !== identity.uid ||
          institutionalUser.email !== identity.email
        )) {
          throw new Error("INSTITUTIONAL_EMAIL_ALREADY_REGISTERED");
        }
        if (!institutionalUser) {
          [institutionalUser] = await tx.insert(cushVerifyInstitutionalUsers).values({
            firebaseUid: identity.uid,
            email: identity.email,
            fullName: invite.fullName,
            jobTitle: invite.jobTitle,
            businessTelephone: invite.businessTelephone,
            isEmailVerified: true,
          }).returning();
        } else {
          [institutionalUser] = await tx.update(cushVerifyInstitutionalUsers)
            .set({ isEmailVerified: true, updatedAt: now })
            .where(eq(cushVerifyInstitutionalUsers.id, institutionalUser.id))
            .returning();
        }

        const [membership] = await tx.insert(cushVerifyInstitutionalMemberships).values({
          institutionId: invite.institutionId,
          institutionalUserId: institutionalUser.id,
          role: "organisation_admin",
          status: "pending_approval",
        }).returning();
        await tx.insert(cushVerifyApplicationEvents).values({
          applicationId: invite.applicationId,
          institutionId: invite.institutionId,
          eventType: "invitation_accepted",
        });
        return { institutionalUser, membership };
      });
      await createInstitutionalSession(req, member.institutionalUser.id);
      return res.status(201).json({
        success: true,
        accessGranted: false,
        message: "Your institutional account is registered. Cush Admin must complete the organisation review before workspace access is enabled.",
      });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      const message = error instanceof Error ? error.message : "";
      if (message === "INVITATION_INVALID_OR_USED") {
        return res.status(409).json({ error: "This invitation is invalid, expired, or has already been used." });
      }
      if (message === "INSTITUTION_NOT_PENDING") {
        return res.status(409).json({ error: "This organisation is no longer accepting this invitation." });
      }
      if (message === "INSTITUTIONAL_EMAIL_ALREADY_REGISTERED" || isUniqueViolation(error)) {
        return res.status(409).json({ error: "This institutional email is already registered. Contact Cush support." });
      }
      console.error("Cush Verify invitation acceptance failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
        code: message.startsWith("CUSH_VERIFY_") ? message : undefined,
      });
      return res.status(503).json({ error: "The invitation could not be accepted. Please try again." });
    }
  });

  app.post("/api/verify/auth/session", authRateLimit, async (req, res) => {
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken : "";
    if (!idToken) return res.status(401).json({ error: "Institutional sign-in is required." });
    try {
      const identity = await verifyCushVerifyFirebaseIdentity(idToken);
      if (!identity.emailVerified) {
        return res.status(403).json({
          code: "CUSH_VERIFY_EMAIL_VERIFICATION_REQUIRED",
          error: "Verify your institutional email address before signing in.",
        });
      }
      const [user] = await db.select()
        .from(cushVerifyInstitutionalUsers)
        .where(and(
          eq(cushVerifyInstitutionalUsers.firebaseUid, identity.uid),
          eq(cushVerifyInstitutionalUsers.email, identity.email),
          eq(cushVerifyInstitutionalUsers.isActive, true),
        ))
        .limit(1);
      if (!user) {
        return res.status(403).json({
          code: "CUSH_VERIFY_INSTITUTIONAL_ACCOUNT_NOT_FOUND",
          error: "This sign-in is not linked to an invited Cush Verify institutional account.",
        });
      }
      await db.update(cushVerifyInstitutionalUsers)
        .set({ isEmailVerified: true, updatedAt: new Date() })
        .where(eq(cushVerifyInstitutionalUsers.id, user.id));
      const membership = await getInstitutionalWorkspaceState(user.id);
      if (
        !membership ||
        membership.membershipStatus === "suspended" ||
        (membership.membershipStatus === "revoked" && membership.institutionStatus !== "rejected")
      ) {
        return res.status(403).json({ error: "This institutional membership is not active." });
      }
      await createInstitutionalSession(req, user.id);
      return res.json({ success: true, accessGranted: membership.membershipStatus === "active" && membership.institutionStatus === "approved" });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      console.error("Cush Verify institutional sign-in failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(401).json({ error: "Institutional sign-in could not be completed." });
    }
  });

  app.get("/api/verify/auth/me", isInstitutionalAuthenticated, async (req: InstitutionalRequest, res) => {
    try {
      const [user] = await db.select({
        id: cushVerifyInstitutionalUsers.id,
        email: cushVerifyInstitutionalUsers.email,
        fullName: cushVerifyInstitutionalUsers.fullName,
        jobTitle: cushVerifyInstitutionalUsers.jobTitle,
      })
        .from(cushVerifyInstitutionalUsers)
        .where(eq(cushVerifyInstitutionalUsers.id, req.cushVerifyInstitutionalUserId!))
        .limit(1);
      const membership = await getInstitutionalWorkspaceState(req.cushVerifyInstitutionalUserId!);
      if (!user || !membership) return res.status(403).json({ error: "Institutional membership is not available." });
      const accessGranted = canAccessCushVerifyWorkspace({
        applicationStatus: membership.applicationStatus,
        institutionStatus: membership.institutionStatus,
        membershipStatus: membership.membershipStatus,
      });
      return res.json({
        user,
        institution: {
          id: membership.institutionId,
          legalName: membership.institutionName,
          tradingName: membership.tradingName,
          status: membership.institutionStatus,
        },
        membership: { role: membership.role, status: membership.membershipStatus },
        applicationStatus: membership.applicationStatus,
        accessGranted,
      });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      return res.status(503).json({ error: "Institutional account status is temporarily unavailable." });
    }
  });

  app.get(
    "/api/verify/workspace",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const membership = await getInstitutionalWorkspaceState(req.cushVerifyInstitutionalUserId!);
      return res.json({
        institution: {
          id: membership!.institutionId,
          legalName: membership!.institutionName,
          tradingName: membership!.tradingName,
        },
        sections: [
          "overview",
          "new_verification_request",
          "request_history",
          "consent_and_evidence",
          "reports_and_results",
          "organisation_settings",
        ],
      });
    },
  );

  app.post("/api/verify/auth/logout", async (req, res) => {
    res.clearCookie("connect.sid", {
      path: req.session.cookie.path || "/",
      httpOnly: true,
      secure: req.session.cookie.secure === true || req.secure,
      sameSite: req.session.cookie.sameSite,
    });
    req.session.destroy((error) => {
      if (error) return res.status(500).json({ error: "Could not end the institutional session." });
      return res.json({ success: true });
    });
  });

  app.get(
    "/api/admin/cush-verify/applications",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsRead),
    async (_req, res) => {
      try {
        const applications = await db.select({
          id: cushVerifyApplications.id,
          legalName: cushVerifyApplications.legalName,
          tradingName: cushVerifyApplications.tradingName,
          institutionType: cushVerifyApplications.institutionType,
          countryOfRegistration: cushVerifyApplications.countryOfRegistration,
          website: cushVerifyApplications.website,
          businessEmail: cushVerifyApplications.businessEmail,
          contactFullName: cushVerifyApplications.contactFullName,
          contactJobTitle: cushVerifyApplications.contactJobTitle,
          businessTelephone: cushVerifyApplications.businessTelephone,
          intendedUse: cushVerifyApplications.intendedUse,
          estimatedMonthlyVerifications: cushVerifyApplications.estimatedMonthlyVerifications,
          contactConsentAcceptedAt: cushVerifyApplications.contactConsentAcceptedAt,
          status: cushVerifyApplications.status,
          reviewedAt: cushVerifyApplications.reviewedAt,
          createdAt: cushVerifyApplications.createdAt,
          institutionId: cushVerifyInstitutions.id,
          institutionStatus: cushVerifyInstitutions.status,
        })
          .from(cushVerifyApplications)
          .leftJoin(
            cushVerifyInstitutions,
            eq(cushVerifyInstitutions.sourceApplicationId, cushVerifyApplications.id),
          )
          .orderBy(desc(cushVerifyApplications.createdAt))
          .limit(100);

        const applicationIds = applications.map((application) => application.id);
        const institutionIds = applications.flatMap((application) =>
          application.institutionId ? [application.institutionId] : []);
        const [allEvents, allInvites, allMembers, allActivations] = applicationIds.length
          ? await Promise.all([
              db.select({
                applicationId: cushVerifyApplicationEvents.applicationId,
                eventType: cushVerifyApplicationEvents.eventType,
                createdAt: cushVerifyApplicationEvents.createdAt,
              })
                .from(cushVerifyApplicationEvents)
                .where(inArray(cushVerifyApplicationEvents.applicationId, applicationIds))
                .orderBy(desc(cushVerifyApplicationEvents.createdAt)),
              db.select({
                applicationId: cushVerifyInvitations.applicationId,
                acceptedAt: cushVerifyInvitations.acceptedAt,
                createdAt: cushVerifyInvitations.createdAt,
              })
                .from(cushVerifyInvitations)
                .where(inArray(cushVerifyInvitations.applicationId, applicationIds))
                .orderBy(desc(cushVerifyInvitations.createdAt)),
              institutionIds.length
                ? db.select({
                    institutionId: cushVerifyInstitutionalMemberships.institutionId,
                    emailVerified: cushVerifyInstitutionalUsers.isEmailVerified,
                  })
                    .from(cushVerifyInstitutionalMemberships)
                    .innerJoin(
                      cushVerifyInstitutionalUsers,
                      eq(cushVerifyInstitutionalUsers.id, cushVerifyInstitutionalMemberships.institutionalUserId),
                    )
                    .where(inArray(cushVerifyInstitutionalMemberships.institutionId, institutionIds))
                : Promise.resolve([]),
              db.select({
                applicationId: cushVerifyEmailActivations.applicationId,
                expiresAt: cushVerifyEmailActivations.expiresAt,
                claimedAt: cushVerifyEmailActivations.claimedAt,
                consumedAt: cushVerifyEmailActivations.consumedAt,
                revokedAt: cushVerifyEmailActivations.revokedAt,
                createdAt: cushVerifyEmailActivations.createdAt,
              })
                .from(cushVerifyEmailActivations)
                .where(inArray(cushVerifyEmailActivations.applicationId, applicationIds))
                .orderBy(desc(cushVerifyEmailActivations.createdAt)),
            ])
          : [[], [], [], []];
        const eventsByApplication = new Map<number, typeof allEvents>();
        for (const event of allEvents) {
          const existing = eventsByApplication.get(event.applicationId) ?? [];
          if (existing.length < 20) existing.push(event);
          eventsByApplication.set(event.applicationId, existing);
        }
        const inviteByApplication = new Map<number, (typeof allInvites)[number]>();
        for (const invite of allInvites) {
          if (!inviteByApplication.has(invite.applicationId)) inviteByApplication.set(invite.applicationId, invite);
        }
        const verifiedByInstitution = new Map<number, boolean>();
        for (const member of allMembers) {
          verifiedByInstitution.set(member.institutionId, member.emailVerified);
        }
        const activationByApplication = new Map<number, (typeof allActivations)[number]>();
        for (const activation of allActivations) {
          if (!activationByApplication.has(activation.applicationId)) {
            activationByApplication.set(activation.applicationId, activation);
          }
        }
        const enriched = applications.map((application) => {
          const invite = inviteByApplication.get(application.id);
          const activation = activationByApplication.get(application.id);
          const activationStatus = !activation
            ? "legacy"
            : activation.consumedAt
              ? "activated"
              : activation.revokedAt
                ? "replaced"
                : activation.expiresAt <= new Date()
                  ? "expired"
                  : activation.claimedAt
                    ? "completing"
                    : "pending";
          return {
            ...application,
            selfServiceActivation: Boolean(activation),
            activationStatus,
            invitationAccepted: Boolean(invite?.acceptedAt),
            invitedAccountEmailVerified: application.institutionId
              ? verifiedByInstitution.get(application.institutionId) ?? false
              : false,
            events: eventsByApplication.get(application.id) ?? [],
          };
        });
        return res.json({ applications: enriched });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        console.error("Cush Verify applications queue failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to load institutional applications." });
      }
    },
  );

  app.put(
    "/api/admin/cush-verify/applications/:id/status",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsManage),
    requireTrustedAdminOrigin,
    async (req: AdminRequest, res) => {
      const id = Number(req.params.id);
      const parsed = cushVerifyApplicationStatusSchema.safeParse(req.body?.status);
      if (!Number.isSafeInteger(id) || id <= 0 || !parsed.success) {
        return res.status(400).json({ error: "Choose a valid application status." });
      }
      const nextStatus = parsed.data;
      try {
        const result = await db.transaction(async (tx) => {
          const [application] = await tx.select()
            .from(cushVerifyApplications)
            .where(eq(cushVerifyApplications.id, id))
            .limit(1);
          if (!application) return { kind: "not_found" as const };
          const [selfServiceActivation] = await tx.select({ id: cushVerifyEmailActivations.id })
            .from(cushVerifyEmailActivations)
            .where(eq(cushVerifyEmailActivations.applicationId, id))
            .limit(1);
          if (selfServiceActivation) return { kind: "self_service_activation" as const };
          const [institution] = await tx.select()
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.sourceApplicationId, id))
            .limit(1);

          if (nextStatus === "approved") {
            if (!institution || institution.status !== "pending_approval") return { kind: "onboarding_required" as const };
            const [member] = await tx.select({
              membershipId: cushVerifyInstitutionalMemberships.id,
              membershipStatus: cushVerifyInstitutionalMemberships.status,
              emailVerified: cushVerifyInstitutionalUsers.isEmailVerified,
            })
              .from(cushVerifyInstitutionalMemberships)
              .innerJoin(
                cushVerifyInstitutionalUsers,
                eq(cushVerifyInstitutionalUsers.id, cushVerifyInstitutionalMemberships.institutionalUserId),
              )
              .where(eq(cushVerifyInstitutionalMemberships.institutionId, institution.id))
              .limit(1);
            const [latestInvite] = await tx.select({ acceptedAt: cushVerifyInvitations.acceptedAt })
              .from(cushVerifyInvitations)
              .where(eq(cushVerifyInvitations.applicationId, id))
              .orderBy(desc(cushVerifyInvitations.createdAt))
              .limit(1);
            if (!member || !canFinalApproveCushVerifyApplication({
              applicationStatus: application.status,
              institutionStatus: institution.status,
              membershipStatus: member.membershipStatus,
              emailVerified: member.emailVerified,
              invitationAccepted: Boolean(latestInvite?.acceptedAt),
            })) {
              return { kind: "invite_acceptance_required" as const };
            }
            await tx.update(cushVerifyInstitutions).set({
              status: "approved",
              approvedBy: req.userId ?? null,
              approvedAt: new Date(),
              updatedAt: new Date(),
            }).where(eq(cushVerifyInstitutions.id, institution.id));
            await tx.update(cushVerifyInstitutionalMemberships).set({
              status: "active",
              updatedAt: new Date(),
            }).where(eq(cushVerifyInstitutionalMemberships.id, member.membershipId));
          } else if (nextStatus === "rejected" && institution) {
            await tx.update(cushVerifyInstitutions).set({
              status: "rejected",
              updatedAt: new Date(),
            }).where(eq(cushVerifyInstitutions.id, institution.id));
            await tx.update(cushVerifyInstitutionalMemberships).set({
              status: "revoked",
              updatedAt: new Date(),
            }).where(eq(cushVerifyInstitutionalMemberships.institutionId, institution.id));
          }

          await tx.update(cushVerifyApplications).set({
            status: nextStatus,
            reviewedBy: req.userId ?? null,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(cushVerifyApplications.id, id));
          await tx.insert(cushVerifyApplicationEvents).values({
            applicationId: id,
            institutionId: institution?.id ?? null,
            actorAdminId: req.userId ?? null,
            eventType: nextStatus === "approved" ? "approved" : nextStatus === "rejected" ? "rejected" : "status_changed",
            details: { status: nextStatus },
          });
          await recordAdminAuditEvent(req, {
            action: `admin.cush_verify_application.status_${nextStatus}`,
            resourceType: "cush_verify_application",
            resourceId: id,
          }, tx);
          return { kind: "updated" as const };
        });

        if (result.kind === "not_found") return res.status(404).json({ error: "Application not found." });
        if (result.kind === "self_service_activation") {
          return res.status(409).json({ error: "This signup is activated through the applicant’s official email and is not part of the admin-review flow." });
        }
        if (result.kind === "onboarding_required") {
          return res.status(409).json({ error: "Create the organisation and send its secure invitation before final approval." });
        }
        if (result.kind === "invite_acceptance_required") {
          return res.status(409).json({ error: "The invited organisation administrator must accept the invitation and verify the official email before approval." });
        }
        return res.json({ success: true, status: nextStatus });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        console.error("Cush Verify application status update failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to update this institutional application." });
      }
    },
  );

  app.post(
    "/api/admin/cush-verify/applications/:id/onboard",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsManage),
    requireTrustedAdminOrigin,
    async (req: AdminRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0 || !req.userId) {
        return res.status(400).json({ error: "Choose a valid application." });
      }
      const token = randomBytes(32).toString("hex");
      const now = new Date();
      let created: { institutionId: number; invitationId: number; legalName: string; email: string; contactName: string };

      try {
        created = await db.transaction(async (tx) => {
          const [application] = await tx.select()
            .from(cushVerifyApplications)
            .where(eq(cushVerifyApplications.id, id))
            .limit(1);
          if (!application) throw new Error("APPLICATION_NOT_FOUND");
          if (application.status !== "under_review") throw new Error("APPLICATION_NOT_UNDER_REVIEW");
          const [existingInstitution] = await tx.select({ id: cushVerifyInstitutions.id })
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.sourceApplicationId, id))
            .limit(1);
          if (existingInstitution) throw new Error("ORGANISATION_ALREADY_ONBOARDED");

          const businessEmail = normalizeEmail(application.businessEmail);
          const duplicateKey = normalizeDuplicateKey(application.legalName, application.countryOfRegistration);
          const [institution] = await tx.insert(cushVerifyInstitutions).values({
            sourceApplicationId: id,
            legalName: application.legalName,
            tradingName: application.tradingName,
            institutionType: application.institutionType,
            countryOfRegistration: application.countryOfRegistration,
            website: application.website,
            businessEmail,
            normalizedBusinessEmail: businessEmail,
            duplicateKey,
            status: "pending_approval",
          }).returning({ id: cushVerifyInstitutions.id });
          const [invite] = await tx.insert(cushVerifyInvitations).values({
            institutionId: institution.id,
            applicationId: id,
            email: businessEmail,
            fullName: application.contactFullName,
            jobTitle: application.contactJobTitle,
            businessTelephone: application.businessTelephone,
            tokenHash: hashInvitationToken(token),
            expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
            createdBy: req.userId!,
          }).returning({ id: cushVerifyInvitations.id });
          await tx.update(cushVerifyApplications).set({
            reviewedBy: req.userId!,
            reviewedAt: now,
            updatedAt: now,
          }).where(eq(cushVerifyApplications.id, id));
          await tx.insert(cushVerifyApplicationEvents).values([
            {
              applicationId: id,
              institutionId: institution.id,
              actorAdminId: req.userId!,
              eventType: "organisation_onboarded",
              details: { institutionId: institution.id },
            },
            {
              applicationId: id,
              institutionId: institution.id,
              actorAdminId: req.userId!,
              eventType: "invitation_created",
              details: { invitationId: invite.id },
            },
          ]);
          await recordAdminAuditEvent(req, {
            action: "admin.cush_verify_application.organisation_onboarded",
            resourceType: "cush_verify_application",
            resourceId: id,
          }, tx);
          return {
            institutionId: institution.id,
            invitationId: invite.id,
            legalName: application.legalName,
            email: businessEmail,
            contactName: application.contactFullName,
          };
        });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        const code = error instanceof Error ? error.message : "";
        if (code === "APPLICATION_NOT_FOUND") return res.status(404).json({ error: "Application not found." });
        if (code === "APPLICATION_NOT_UNDER_REVIEW") return res.status(409).json({ error: "Move the application to Under review before creating an organisation." });
        if (code === "ORGANISATION_ALREADY_ONBOARDED" || isUniqueViolation(error)) {
          return res.status(409).json({ error: "This application or institution has already been onboarded." });
        }
        console.error("Cush Verify organisation onboarding failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to start institutional onboarding." });
      }

      const url = invitationUrl(req, token);
      if (!url) {
        await db.insert(cushVerifyApplicationEvents).values({
          applicationId: id,
          institutionId: created.institutionId,
          eventType: "invitation_delivery_failed",
          details: { invitationId: created.invitationId, reason: "frontend_url_not_configured" },
        }).catch(() => undefined);
        return res.status(201).json({
          success: true,
          institutionId: created.institutionId,
          invitationEmailStatus: "not_configured",
          message: "The organisation is pending approval, but Cush Verify’s allowed frontend URL is not configured for invitation delivery.",
        });
      }
      const email = await sendCushVerifyInvitationEmail({
        email: created.email,
        contactName: created.contactName,
        institutionName: created.legalName,
        inviteUrl: url,
        invitationId: created.invitationId,
      });
      await db.insert(cushVerifyApplicationEvents).values({
        applicationId: id,
        institutionId: created.institutionId,
        eventType: email.status === "sent" ? "invitation_sent" : "invitation_delivery_failed",
        details: {
          invitationId: created.invitationId,
          ...(email.status === "failed" ? { reason: email.reason } : {}),
          ...(email.status === "not_configured" ? { reason: "email_not_configured" } : {}),
        },
      }).catch(() => undefined);
      if (email.status !== "sent") {
        console.error("Cush Verify invitation email was not delivered", {
          invitationId: created.invitationId,
          status: email.status,
          reason: email.status === "failed" ? email.reason : undefined,
        });
      }
      return res.status(201).json({
        success: true,
        institutionId: created.institutionId,
        invitationEmailStatus: email.status,
        message: email.status === "sent"
          ? "The organisation is pending approval and a secure invitation has been emailed. Workspace access remains blocked until Cush Admin completes final approval."
          : "The organisation is pending approval, but the invitation email was not delivered. Check the email configuration before retrying.",
      });
    },
  );

  app.post(
    "/api/admin/cush-verify/applications/:id/invitation/resend",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsManage),
    requireTrustedAdminOrigin,
    async (req: AdminRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0 || !req.userId) {
        return res.status(400).json({ error: "Choose a valid application." });
      }
      const token = randomBytes(32).toString("hex");
      const now = new Date();
      let created: { institutionId: number; invitationId: number; legalName: string; email: string; contactName: string };

      try {
        created = await db.transaction(async (tx) => {
          const [application] = await tx.select()
            .from(cushVerifyApplications)
            .where(eq(cushVerifyApplications.id, id))
            .limit(1);
          if (!application) throw new Error("APPLICATION_NOT_FOUND");
          if (application.status !== "under_review") throw new Error("APPLICATION_NOT_UNDER_REVIEW");
          const [institution] = await tx.select()
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.sourceApplicationId, id))
            .limit(1);
          if (!institution || institution.status !== "pending_approval") throw new Error("INSTITUTION_NOT_PENDING");
          const [acceptedInvite] = await tx.select({ id: cushVerifyInvitations.id })
            .from(cushVerifyInvitations)
            .where(eq(cushVerifyInvitations.applicationId, id))
            .orderBy(desc(cushVerifyInvitations.createdAt))
            .limit(1);
          if (acceptedInvite) {
            const [invite] = await tx.select({ acceptedAt: cushVerifyInvitations.acceptedAt })
              .from(cushVerifyInvitations)
              .where(eq(cushVerifyInvitations.id, acceptedInvite.id))
              .limit(1);
            if (invite?.acceptedAt) throw new Error("INVITATION_ALREADY_ACCEPTED");
          }

          await tx.update(cushVerifyInvitations).set({ revokedAt: now })
            .where(and(
              eq(cushVerifyInvitations.applicationId, id),
              isNull(cushVerifyInvitations.acceptedAt),
              isNull(cushVerifyInvitations.revokedAt),
            ));
          const [invite] = await tx.insert(cushVerifyInvitations).values({
            institutionId: institution.id,
            applicationId: id,
            email: application.businessEmail,
            fullName: application.contactFullName,
            jobTitle: application.contactJobTitle,
            businessTelephone: application.businessTelephone,
            tokenHash: hashInvitationToken(token),
            expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
            createdBy: req.userId!,
          }).returning({ id: cushVerifyInvitations.id });
          await tx.insert(cushVerifyApplicationEvents).values({
            applicationId: id,
            institutionId: institution.id,
            actorAdminId: req.userId!,
            eventType: "invitation_created",
            details: { invitationId: invite.id, resent: true },
          });
          await recordAdminAuditEvent(req, {
            action: "admin.cush_verify_application.invitation_resent",
            resourceType: "cush_verify_application",
            resourceId: id,
          }, tx);
          return {
            institutionId: institution.id,
            invitationId: invite.id,
            legalName: application.legalName,
            email: application.businessEmail,
            contactName: application.contactFullName,
          };
        });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        const code = error instanceof Error ? error.message : "";
        if (code === "APPLICATION_NOT_FOUND") return res.status(404).json({ error: "Application not found." });
        if (code === "APPLICATION_NOT_UNDER_REVIEW" || code === "INSTITUTION_NOT_PENDING") {
          return res.status(409).json({ error: "This organisation is not eligible for an invitation." });
        }
        if (code === "INVITATION_ALREADY_ACCEPTED") {
          return res.status(409).json({ error: "The invitation has already been accepted; complete final review instead." });
        }
        console.error("Cush Verify invitation rotation failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to create a replacement invitation." });
      }

      const url = invitationUrl(req, token);
      if (!url) {
        await db.insert(cushVerifyApplicationEvents).values({
          applicationId: id,
          institutionId: created.institutionId,
          eventType: "invitation_delivery_failed",
          details: { invitationId: created.invitationId, reason: "frontend_url_not_configured" },
        }).catch(() => undefined);
        return res.status(503).json({ error: "The allowed Cush Verify frontend URL is not configured." });
      }
      const email = await sendCushVerifyInvitationEmail({
        email: created.email,
        contactName: created.contactName,
        institutionName: created.legalName,
        inviteUrl: url,
        invitationId: created.invitationId,
      });
      if (email.status !== "sent") {
        await db.insert(cushVerifyApplicationEvents).values({
          applicationId: id,
          institutionId: created.institutionId,
          eventType: "invitation_delivery_failed",
          details: { invitationId: created.invitationId, reason: email.status === "failed" ? email.reason : "email_not_configured" },
        }).catch(() => undefined);
        return res.status(502).json({
          error: email.status === "not_configured"
            ? "Invitation email is not configured. Check the Resend sender settings."
            : "Resend did not accept the invitation email. Retry after checking the provider logs.",
        });
      }
      await db.insert(cushVerifyApplicationEvents).values({
        applicationId: id,
        institutionId: created.institutionId,
        eventType: "invitation_sent",
        details: { invitationId: created.invitationId, resent: true },
      }).catch(() => undefined);
      return res.json({ success: true, invitationEmailStatus: "sent", message: "A fresh secure invitation has been sent." });
    },
  );
}
