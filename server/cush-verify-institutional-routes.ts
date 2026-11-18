import { createHash, randomBytes } from "node:crypto";
import type { Express, Request, Response, NextFunction } from "express";
import { and, desc, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import {
  cushVerifyApplications,
  cushVerifyApplicationEvents,
  cushVerifyEmailActivations,
  cushVerifyBillingAccounts,
  cushVerifyCreditLedger,
  cushVerifyInstitutionalMemberships,
  cushVerifyMembershipEvents,
  cushVerifyInstitutionalUsers,
  cushVerifyInstitutions,
  cushVerifyInvitations,
} from "@shared/schema";
import {
  cushVerifyApplicationSchema,
  cushVerifyInstitutionalRegistrationSchema,
  cushVerifyApplicationStatusSchema,
  cushVerifyTeamInvitationSchema,
  cushVerifyMembershipActionSchema,
} from "@shared/cush-verify";
import { getCushVerifyActivationPromotionalGrant } from "@shared/cush-verify-billing-rules";
import {
  canAccessCushVerifyWorkspace,
  canFinalApproveCushVerifyApplication,
  resolveCushVerifyInvitationAccess,
} from "@shared/cush-verify-access";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import { cushVerifyDb as db } from "./db";
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
import { recordAdminAuditEventAfterCommit } from "./admin-audit";
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

function membershipRoleLabel(role: unknown): string {
  if (role === "organisation_admin") return "Organisation administrator";
  if (role === "analyst") return "Analyst";
  if (role === "viewer") return "Viewer";
  return "Unknown role";
}

function membershipEventSummary(eventType: string, details: Record<string, unknown>): string {
  if (eventType === "membership_role_changed") {
    return `${membershipRoleLabel(details.previousRole)} → ${membershipRoleLabel(details.newRole)}`;
  }
  if (eventType === "invitation_created" || eventType === "invitation_accepted") {
    const role = membershipRoleLabel(details.role);
    return eventType === "invitation_created" ? `Invited as ${role}` : `Joined as ${role}`;
  }
  if (eventType === "invitation_delivery_failed") return "Invitation email could not be sent";
  if (eventType === "invitation_revoked") return "Invitation cancelled or expired";
  if (eventType === "membership_suspended") return "Workspace access suspended";
  if (eventType === "membership_reactivated") return "Workspace access restored";
  if (eventType === "membership_revoked") return "Workspace access revoked";
  if (eventType === "invitation_sent") return "Invitation email sent";
  return "Team access updated";
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

function getErrorChain(error: unknown): Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (typeof current !== "object") break;
    const candidate = current as Record<string, unknown>;
    chain.push(candidate);
    current = candidate.cause;
  }
  return chain;
}

function isUniqueViolation(error: unknown): boolean {
  return getErrorChain(error).some((candidate) => candidate.code === "23505");
}

function activationFailureDetails(error: unknown) {
  const chain = getErrorChain(error);
  let code: string | undefined;
  let databaseCode: string | undefined;
  let constraint: string | undefined;

  for (const candidate of chain) {
    const candidateCode = typeof candidate.code === "string" ? candidate.code : "";
    const candidateMessage = typeof candidate.message === "string" ? candidate.message : "";
    if (!code && candidateCode.startsWith("CUSH_VERIFY_")) code = candidateCode;
    if (!code && candidateMessage.startsWith("CUSH_VERIFY_")) code = candidateMessage;
    if (!databaseCode && /^[0-9A-Z]{5}$/i.test(candidateCode)) databaseCode = candidateCode;
    if (
      !constraint &&
      typeof candidate.constraint === "string" &&
      /^[a-zA-Z0-9_]{1,128}$/.test(candidate.constraint)
    ) {
      constraint = candidate.constraint;
    }
  }

  return {
    errorType: error instanceof Error ? error.name : "UnknownError",
    code,
    databaseCode,
    constraint,
  };
}

function respondIfInstitutionalSchemaMissing(error: unknown, res: Response): boolean {
  const institutionalTables = [
    "cush_verify_applications",
    "cush_verify_institutions",
    "cush_verify_institutional_users",
    "cush_verify_invitations",
    "cush_verify_email_activations",
    "cush_verify_institutional_memberships",
    "cush_verify_application_events",
    "cush_verify_membership_events",
  ];
  for (const candidate of getErrorChain(error)) {
    const code = candidate.code;
    const message = String(candidate.message ?? "").toLowerCase();
    if (
      (code === "42P01" || code === "42703") &&
      institutionalTables.some((table) => message.includes(table))
    ) {
      res.status(503).json({
        code: "CUSH_VERIFY_SCHEMA_MISSING",
        error: "Institutional accounts are not available until the Cush Verify database migration has been applied.",
      });
      return true;
    }
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
  res.clearCookie("cush.verify.sid", {
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
    institutionType: cushVerifyInstitutions.institutionType,
    countryOfRegistration: cushVerifyInstitutions.countryOfRegistration,
    website: cushVerifyInstitutions.website,
    businessEmail: cushVerifyInstitutions.businessEmail,
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
      if (firebaseUid) {
        await deleteCushVerifyFirebaseUser(firebaseUid).catch((cleanupError) => {
          console.error("Cush Verify pending identity cleanup failed", {
            errorType: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
          });
        });
      }
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
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
        claimedAt: cushVerifyEmailActivations.claimedAt,
        consumedAt: cushVerifyEmailActivations.consumedAt,
        revokedAt: cushVerifyEmailActivations.revokedAt,
        applicationStatus: cushVerifyApplications.status,
      })
        .from(cushVerifyEmailActivations)
        .innerJoin(
          cushVerifyApplications,
          eq(cushVerifyApplications.id, cushVerifyEmailActivations.applicationId),
        )
        .where(and(
          eq(cushVerifyEmailActivations.tokenHash, hashActivationToken(token)),
          isNull(cushVerifyEmailActivations.revokedAt),
        ))
        .limit(1);
      if (!activation) return res.status(404).json({ error: "This activation link is invalid or has expired." });
      if (activation.consumedAt && activation.applicationStatus === "approved") {
        return res.json({
          email: activation.email,
          contactName: activation.contactName,
          institutionName: activation.institutionName,
          alreadyActivated: true,
        });
      }
      if (activation.claimedAt) {
        return res.json({
          email: activation.email,
          contactName: activation.contactName,
          institutionName: activation.institutionName,
          activationInProgress: true,
        });
      }
      if (
        activation.consumedAt ||
        activation.revokedAt ||
        activation.expiresAt <= new Date() ||
        activation.applicationStatus !== "submitted"
      ) {
        return res.status(404).json({ error: "This activation link is invalid or has expired." });
      }
      return res.json({
        email: activation.email,
        contactName: activation.contactName,
        institutionName: activation.institutionName,
        expiresAt: activation.expiresAt,
        alreadyActivated: false,
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
    let failureStage = "find_activation";
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

      failureStage = "claim_activation";
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
        failureStage = "activate_firebase_identity";
        await setCushVerifyFirebaseUserActivated(candidate.firebaseUid, true);
        firebaseActivated = true;
        failureStage = "create_organisation_and_membership";
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
          await tx.insert(cushVerifyBillingAccounts).values({
            institutionId: institution.id,
          }).onConflictDoNothing();
          const [billingAccount] = await tx.select({
            availableCredits: cushVerifyBillingAccounts.availableCredits,
          }).from(cushVerifyBillingAccounts)
            .where(eq(cushVerifyBillingAccounts.institutionId, institution.id))
            .for("update")
            .limit(1);
          if (!billingAccount) throw new Error("CUSH_VERIFY_BILLING_ACCOUNT_CREATE_FAILED");
          const initialCreditGrant = getCushVerifyActivationPromotionalGrant(application.id);
          const [creditGrant] = await tx.insert(cushVerifyCreditLedger).values({
            institutionId: institution.id,
            ...initialCreditGrant,
          }).onConflictDoNothing().returning({ id: cushVerifyCreditLedger.id });
          if (creditGrant) {
            await tx.update(cushVerifyBillingAccounts).set({
              availableCredits: billingAccount.availableCredits + initialCreditGrant.creditDelta,
              updatedAt: now,
            }).where(eq(cushVerifyBillingAccounts.institutionId, institution.id));
          }
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
            details: {
              emailVerified: true,
              accessEnabled: true,
              promotionalCreditsGranted: initialCreditGrant.creditDelta,
            },
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
      const details = activationFailureDetails(error);
      if (
        details.code === "CUSH_VERIFY_APPLICATION_ALREADY_ACTIVATED" ||
        details.code === "CUSH_VERIFY_APPLICATION_NOT_ACTIVATABLE" ||
        isUniqueViolation(error)
      ) {
        return res.status(409).json({ error: "This application could not be activated. Contact Cush support for help." });
      }
      console.error("Cush Verify account activation failed", {
        ...details,
        stage: failureStage,
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
        jobTitle: cushVerifyInvitations.jobTitle,
        role: cushVerifyInvitations.role,
        expiresAt: cushVerifyInvitations.expiresAt,
        institutionName: cushVerifyInstitutions.legalName,
        institutionStatus: cushVerifyInstitutions.status,
        applicationStatus: cushVerifyApplications.status,
      })
        .from(cushVerifyInvitations)
        .innerJoin(cushVerifyInstitutions, eq(cushVerifyInstitutions.id, cushVerifyInvitations.institutionId))
        .innerJoin(cushVerifyApplications, eq(cushVerifyApplications.id, cushVerifyInstitutions.sourceApplicationId))
        .where(and(
          eq(cushVerifyInvitations.tokenHash, hashInvitationToken(token)),
          isNull(cushVerifyInvitations.acceptedAt),
          isNull(cushVerifyInvitations.revokedAt),
          gt(cushVerifyInvitations.expiresAt, new Date()),
          or(
            and(
              eq(cushVerifyInstitutions.status, "pending_approval"),
              eq(cushVerifyInvitations.role, "organisation_admin"),
            ),
            and(
              eq(cushVerifyInstitutions.status, "approved"),
              eq(cushVerifyApplications.status, "approved"),
            ),
          ),
        ))
        .limit(1);
      if (!invite) return res.status(404).json({ error: "This invitation is invalid or has expired." });
      return res.json({
        email: invite.email,
        fullName: invite.fullName,
        jobTitle: invite.jobTitle,
        role: invite.role,
        institutionName: invite.institutionName,
        institutionStatus: invite.institutionStatus,
        applicationStatus: invite.applicationStatus,
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
      const normalizedIdentityEmail = normalizeEmail(identity.email);
      const tokenHash = hashInvitationToken(token);
      const now = new Date();
      const accepted = await db.transaction(async (tx) => {
        const [invite] = await tx.update(cushVerifyInvitations)
          .set({ acceptedAt: now })
          .where(and(
            eq(cushVerifyInvitations.tokenHash, tokenHash),
            eq(cushVerifyInvitations.email, normalizedIdentityEmail),
            isNull(cushVerifyInvitations.acceptedAt),
            isNull(cushVerifyInvitations.revokedAt),
            gt(cushVerifyInvitations.expiresAt, now),
          ))
          .returning();
        if (!invite) throw new Error("INVITATION_INVALID_OR_USED");

        const [institution] = await tx.select()
          .from(cushVerifyInstitutions)
          .where(eq(cushVerifyInstitutions.id, invite.institutionId))
          .for("update")
          .limit(1);
        if (!institution || !["pending_approval", "approved"].includes(institution.status)) {
          throw new Error("INSTITUTION_NOT_ACCEPTING_INVITES");
        }
        const [application] = await tx.select({ status: cushVerifyApplications.status })
          .from(cushVerifyApplications)
          .where(eq(cushVerifyApplications.id, invite.applicationId))
          .limit(1);
        if (!application) throw new Error("APPLICATION_NOT_FOUND");
        const invitationAccess = resolveCushVerifyInvitationAccess({
          applicationStatus: application.status,
          institutionStatus: institution.status,
          invitationRole: invite.role,
        });
        if (!invitationAccess) {
          throw new Error(institution.status === "approved"
            ? "APPLICATION_NOT_APPROVED"
            : "INITIAL_INVITATION_ROLE_INVALID");
        }
        const approvedTeamInvite = invitationAccess.accessGranted;

        let [institutionalUser] = await tx.select()
          .from(cushVerifyInstitutionalUsers)
          .where(or(
            eq(cushVerifyInstitutionalUsers.firebaseUid, identity.uid),
            eq(cushVerifyInstitutionalUsers.email, normalizedIdentityEmail),
          ))
          .for("update")
          .limit(1);
        if (institutionalUser && (
          institutionalUser.firebaseUid !== identity.uid ||
          normalizeEmail(institutionalUser.email) !== normalizedIdentityEmail
        )) {
          throw new Error("INSTITUTIONAL_EMAIL_ALREADY_REGISTERED");
        }
        if (!institutionalUser) {
          [institutionalUser] = await tx.insert(cushVerifyInstitutionalUsers).values({
            firebaseUid: identity.uid,
            email: normalizedIdentityEmail,
            fullName: invite.fullName,
            jobTitle: invite.jobTitle,
            businessTelephone: invite.businessTelephone ?? null,
            isEmailVerified: true,
          }).returning();
        } else {
          [institutionalUser] = await tx.update(cushVerifyInstitutionalUsers)
            .set({ isEmailVerified: true, updatedAt: now })
            .where(eq(cushVerifyInstitutionalUsers.id, institutionalUser.id))
            .returning();
        }

        const [existingMembership] = await tx.select({ id: cushVerifyInstitutionalMemberships.id })
          .from(cushVerifyInstitutionalMemberships)
          .where(eq(cushVerifyInstitutionalMemberships.institutionalUserId, institutionalUser.id))
          .for("update")
          .limit(1);
        if (existingMembership) throw new Error("MEMBERSHIP_ALREADY_EXISTS");

        const [membership] = await tx.insert(cushVerifyInstitutionalMemberships).values({
          institutionId: invite.institutionId,
          institutionalUserId: institutionalUser.id,
          role: invite.role,
          status: invitationAccess.membershipStatus,
        }).returning();
        await tx.insert(cushVerifyApplicationEvents).values({
          applicationId: invite.applicationId,
          institutionId: invite.institutionId,
          eventType: "invitation_accepted",
          details: {
            invitationId: invite.id,
            membershipId: membership.id,
            role: invite.role,
            teamMembership: approvedTeamInvite,
          },
        });
        if (approvedTeamInvite) {
          await tx.insert(cushVerifyMembershipEvents).values({
            institutionId: invite.institutionId,
            invitationId: invite.id,
            membershipId: membership.id,
            actorType: "institutional_user",
            actorInstitutionalUserId: institutionalUser.id,
            eventType: "invitation_accepted",
            details: { role: invite.role },
          });
        }
        return { institutionalUser, membership, approvedTeamInvite };
      });
      await createInstitutionalSession(req, accepted.institutionalUser.id);
      return res.status(201).json({
        success: true,
        accessGranted: accepted.approvedTeamInvite,
        membershipStatus: accepted.membership.status,
        message: accepted.approvedTeamInvite
          ? "Your email is verified and your organisation membership is active. You can now use the Cush Verify workspace."
          : "Your institutional account is registered. Cush Admin must complete the organisation review before workspace access is enabled.",
      });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      const message = error instanceof Error ? error.message : "";
      if (message === "INVITATION_INVALID_OR_USED") {
        return res.status(409).json({ error: "This invitation is invalid, expired, or has already been used." });
      }
      if (message === "INSTITUTION_NOT_ACCEPTING_INVITES" || message === "APPLICATION_NOT_APPROVED") {
        return res.status(409).json({ error: "This organisation is no longer accepting this invitation." });
      }
      if (message === "APPLICATION_NOT_FOUND") {
        return res.status(409).json({ error: "This invitation is no longer available." });
      }
      if (message === "INITIAL_INVITATION_ROLE_INVALID") {
        return res.status(409).json({ error: "This invitation cannot be accepted while the organisation is under review." });
      }
      if (message === "MEMBERSHIP_ALREADY_EXISTS") {
        return res.status(409).json({ error: "This person already has a membership for this organisation." });
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
      return res.json({
        success: true,
        accessGranted: canAccessCushVerifyWorkspace({
          applicationStatus: membership.applicationStatus,
          institutionStatus: membership.institutionStatus,
          membershipStatus: membership.membershipStatus,
          emailVerified: true,
        }),
      });
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
          institutionType: membership.institutionType,
          countryOfRegistration: membership.countryOfRegistration,
          website: membership.website,
          businessEmail: membership.businessEmail,
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
    "/api/verify/team",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      try {
        const institutionalUserId = req.cushVerifyInstitutionalUserId!;
        const workspace = await getInstitutionalWorkspaceState(institutionalUserId);
        if (!workspace) return res.status(403).json({ error: "Institutional membership is not available." });
        const canManage = workspace.role === "organisation_admin";
        const memberFilters = canManage
          ? eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId)
          : and(
              eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
              eq(cushVerifyInstitutionalMemberships.role, "organisation_admin"),
              eq(cushVerifyInstitutionalMemberships.status, "active"),
            );
        const members = await db.select({
          membershipId: cushVerifyInstitutionalMemberships.id,
          fullName: cushVerifyInstitutionalUsers.fullName,
          email: cushVerifyInstitutionalUsers.email,
          jobTitle: cushVerifyInstitutionalUsers.jobTitle,
          role: cushVerifyInstitutionalMemberships.role,
          status: cushVerifyInstitutionalMemberships.status,
          emailVerified: cushVerifyInstitutionalUsers.isEmailVerified,
          createdAt: cushVerifyInstitutionalMemberships.createdAt,
        })
          .from(cushVerifyInstitutionalMemberships)
          .innerJoin(
            cushVerifyInstitutionalUsers,
            eq(cushVerifyInstitutionalUsers.id, cushVerifyInstitutionalMemberships.institutionalUserId),
          )
          .where(memberFilters)
          .orderBy(desc(cushVerifyInstitutionalMemberships.createdAt))
          .limit(100);

        const invitationRows = canManage
          ? await db.select({
              invitationId: cushVerifyInvitations.id,
              fullName: cushVerifyInvitations.fullName,
              email: cushVerifyInvitations.email,
              jobTitle: cushVerifyInvitations.jobTitle,
              role: cushVerifyInvitations.role,
              createdAt: cushVerifyInvitations.createdAt,
              expiresAt: cushVerifyInvitations.expiresAt,
              acceptedAt: cushVerifyInvitations.acceptedAt,
              revokedAt: cushVerifyInvitations.revokedAt,
            })
              .from(cushVerifyInvitations)
              .where(eq(cushVerifyInvitations.institutionId, workspace.institutionId))
              .orderBy(desc(cushVerifyInvitations.createdAt))
              .limit(100)
          : [];
        const now = new Date();
        const invitations = invitationRows.map((invitation) => ({
          invitationId: invitation.invitationId,
          fullName: invitation.fullName,
          email: invitation.email,
          jobTitle: invitation.jobTitle,
          role: invitation.role,
          status: invitation.revokedAt
            ? "revoked"
            : invitation.acceptedAt
              ? "accepted"
              : invitation.expiresAt <= now
                ? "expired"
                : "pending",
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
          acceptedAt: invitation.acceptedAt,
        }));
        return res.json({
          institution: {
            id: workspace.institutionId,
            legalName: workspace.institutionName,
            tradingName: workspace.tradingName,
            institutionType: workspace.institutionType,
            countryOfRegistration: workspace.countryOfRegistration,
            website: workspace.website,
            businessEmail: workspace.businessEmail,
            status: workspace.institutionStatus,
            applicationStatus: workspace.applicationStatus,
          },
          members,
          invitations,
        });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        console.error("Cush Verify team listing failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Team details are temporarily unavailable." });
      }
    },
  );

  app.get(
    "/api/verify/team/events",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const institutionalUserId = req.cushVerifyInstitutionalUserId!;
      const workspace = await getInstitutionalWorkspaceState(institutionalUserId).catch(() => null);
      if (!workspace || workspace.role !== "organisation_admin" || workspace.membershipStatus !== "active") {
        return res.status(403).json({ error: "Only active organisation administrators can review team access history." });
      }
      const rawBeforeId = req.query.beforeId;
      const beforeId = rawBeforeId === undefined ? undefined : Number(rawBeforeId);
      if (rawBeforeId !== undefined && (!Number.isSafeInteger(beforeId) || beforeId! <= 0)) {
        return res.status(400).json({ error: "Choose a valid history cursor." });
      }

      try {
        const conditions = [eq(cushVerifyMembershipEvents.institutionId, workspace.institutionId)];
        if (beforeId !== undefined) conditions.push(lt(cushVerifyMembershipEvents.id, beforeId));
        const eventRows = await db.select({
          id: cushVerifyMembershipEvents.id,
          invitationId: cushVerifyMembershipEvents.invitationId,
          membershipId: cushVerifyMembershipEvents.membershipId,
          actorType: cushVerifyMembershipEvents.actorType,
          actorInstitutionalUserId: cushVerifyMembershipEvents.actorInstitutionalUserId,
          eventType: cushVerifyMembershipEvents.eventType,
          details: cushVerifyMembershipEvents.details,
          createdAt: cushVerifyMembershipEvents.createdAt,
        })
          .from(cushVerifyMembershipEvents)
          .where(and(...conditions))
          .orderBy(desc(cushVerifyMembershipEvents.id))
          .limit(51);
        const hasMore = eventRows.length > 50;
        const pageRows = eventRows.slice(0, 50);
        const membershipIds = [...new Set(pageRows.flatMap((event) => event.membershipId ? [event.membershipId] : []))];
        const invitationIds = [...new Set(pageRows.flatMap((event) => event.invitationId ? [event.invitationId] : []))];
        const actorIds = [...new Set(pageRows.flatMap((event) => event.actorInstitutionalUserId
          ? [event.actorInstitutionalUserId]
          : []))];

        const [targetMemberships, invitations, actors] = await Promise.all([
          membershipIds.length
            ? db.select({
                membershipId: cushVerifyInstitutionalMemberships.id,
                fullName: cushVerifyInstitutionalUsers.fullName,
                email: cushVerifyInstitutionalUsers.email,
              })
                .from(cushVerifyInstitutionalMemberships)
                .innerJoin(
                  cushVerifyInstitutionalUsers,
                  eq(cushVerifyInstitutionalUsers.id, cushVerifyInstitutionalMemberships.institutionalUserId),
                )
                .where(and(
                  eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
                  inArray(cushVerifyInstitutionalMemberships.id, membershipIds),
                ))
            : Promise.resolve([]),
          invitationIds.length
            ? db.select({
                invitationId: cushVerifyInvitations.id,
                fullName: cushVerifyInvitations.fullName,
                email: cushVerifyInvitations.email,
              })
                .from(cushVerifyInvitations)
                .where(and(
                  eq(cushVerifyInvitations.institutionId, workspace.institutionId),
                  inArray(cushVerifyInvitations.id, invitationIds),
                ))
            : Promise.resolve([]),
          actorIds.length
            ? db.select({
                id: cushVerifyInstitutionalUsers.id,
                fullName: cushVerifyInstitutionalUsers.fullName,
                email: cushVerifyInstitutionalUsers.email,
              })
                .from(cushVerifyInstitutionalUsers)
                .where(inArray(cushVerifyInstitutionalUsers.id, actorIds))
            : Promise.resolve([]),
        ]);
        const membershipsById = new Map(targetMemberships.map((member) => [member.membershipId, member]));
        const invitationsById = new Map(invitations.map((invite) => [invite.invitationId, invite]));
        const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
        const events = pageRows.map((event) => {
          const target = (event.membershipId && membershipsById.get(event.membershipId))
            || (event.invitationId && invitationsById.get(event.invitationId));
          const actor = event.actorType === "cush_admin"
            ? { name: "Cush Admin", email: null }
            : event.actorType === "system"
              ? { name: "System", email: null }
              : event.actorInstitutionalUserId && actorsById.get(event.actorInstitutionalUserId)
                ? {
                    name: actorsById.get(event.actorInstitutionalUserId)!.fullName,
                    email: actorsById.get(event.actorInstitutionalUserId)!.email,
                  }
                : { name: "Former teammate", email: null };
          const details = event.details && typeof event.details === "object"
            ? event.details as Record<string, unknown>
            : {};
          return {
            id: event.id,
            action: event.eventType,
            actionLabel: event.eventType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
            actor,
            target: target ? { name: target.fullName, email: target.email } : null,
            summary: membershipEventSummary(event.eventType, details),
            createdAt: event.createdAt,
          };
        });
        return res.json({
          events,
          nextBeforeId: hasMore ? pageRows.at(-1)?.id ?? null : null,
        });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        console.error("Cush Verify team access history failed", {
          institutionId: workspace.institutionId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Team access history is temporarily unavailable." });
      }
    },
  );

  app.put(
    "/api/verify/team/members/:membershipId",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const membershipId = Number(req.params.membershipId);
      const parsed = cushVerifyMembershipActionSchema.safeParse(req.body);
      if (!Number.isSafeInteger(membershipId) || membershipId <= 0 || !parsed.success) {
        return res.status(400).json({ error: "Choose a valid membership action." });
      }
      const institutionalUserId = req.cushVerifyInstitutionalUserId!;
      const workspace = await getInstitutionalWorkspaceState(institutionalUserId).catch(() => null);
      if (!workspace || workspace.role !== "organisation_admin" || workspace.membershipStatus !== "active") {
        return res.status(403).json({ error: "Only active organisation administrators can manage team access." });
      }

      try {
        const result = await db.transaction(async (tx) => {
          const [institution] = await tx.select({
            id: cushVerifyInstitutions.id,
            status: cushVerifyInstitutions.status,
            sourceApplicationId: cushVerifyInstitutions.sourceApplicationId,
          })
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.id, workspace.institutionId))
            .for("update")
            .limit(1);
          if (!institution || institution.status !== "approved") return { kind: "institution_unavailable" as const };

          const [actorMembership] = await tx.select({
            role: cushVerifyInstitutionalMemberships.role,
            status: cushVerifyInstitutionalMemberships.status,
          })
            .from(cushVerifyInstitutionalMemberships)
            .where(and(
              eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
              eq(cushVerifyInstitutionalMemberships.institutionalUserId, institutionalUserId),
            ))
            .for("update")
            .limit(1);
          if (!actorMembership || actorMembership.role !== "organisation_admin" || actorMembership.status !== "active") {
            return { kind: "admin_membership_changed" as const };
          }
          const [application] = await tx.select({ status: cushVerifyApplications.status })
            .from(cushVerifyApplications)
            .where(eq(cushVerifyApplications.id, institution.sourceApplicationId))
            .limit(1);
          if (!application || application.status !== "approved") return { kind: "institution_unavailable" as const };

          const [target] = await tx.select()
            .from(cushVerifyInstitutionalMemberships)
            .where(and(
              eq(cushVerifyInstitutionalMemberships.id, membershipId),
              eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
            ))
            .for("update")
            .limit(1);
          if (!target) return { kind: "not_found" as const };
          if (target.status === "revoked" || target.status === "pending_approval") {
            return { kind: "membership_unavailable" as const };
          }

          const now = new Date();
          if (parsed.data.action === "change_role") {
            if (target.role === parsed.data.role) {
              return { kind: "unchanged" as const, role: target.role, status: target.status };
            }
            if (target.role === "organisation_admin" && target.status === "active" && parsed.data.role !== "organisation_admin") {
              const activeAdmins = await tx.select({ id: cushVerifyInstitutionalMemberships.id })
                .from(cushVerifyInstitutionalMemberships)
                .where(and(
                  eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
                  eq(cushVerifyInstitutionalMemberships.role, "organisation_admin"),
                  eq(cushVerifyInstitutionalMemberships.status, "active"),
                ));
              if (activeAdmins.length <= 1) return { kind: "last_admin" as const };
            }
            await tx.update(cushVerifyInstitutionalMemberships)
              .set({ role: parsed.data.role, updatedAt: now })
              .where(and(
                eq(cushVerifyInstitutionalMemberships.id, target.id),
                eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
              ));
            await tx.insert(cushVerifyMembershipEvents).values({
              institutionId: workspace.institutionId,
              membershipId: target.id,
              actorType: "organisation_admin",
              actorInstitutionalUserId: institutionalUserId,
              eventType: "membership_role_changed",
              details: { previousRole: target.role, newRole: parsed.data.role },
            });
            return { kind: "updated" as const, role: parsed.data.role, status: target.status };
          }

          if (parsed.data.action === "suspend") {
            if (target.status === "suspended") {
              return { kind: "unchanged" as const, role: target.role, status: target.status };
            }
            if (target.institutionalUserId === institutionalUserId) return { kind: "cannot_suspend_self" as const };
            if (target.role === "organisation_admin") {
              const activeAdmins = await tx.select({ id: cushVerifyInstitutionalMemberships.id })
                .from(cushVerifyInstitutionalMemberships)
                .where(and(
                  eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
                  eq(cushVerifyInstitutionalMemberships.role, "organisation_admin"),
                  eq(cushVerifyInstitutionalMemberships.status, "active"),
                ));
              if (activeAdmins.length <= 1) return { kind: "last_admin" as const };
            }
            await tx.update(cushVerifyInstitutionalMemberships)
              .set({ status: "suspended", updatedAt: now })
              .where(and(
                eq(cushVerifyInstitutionalMemberships.id, target.id),
                eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
              ));
            await tx.insert(cushVerifyMembershipEvents).values({
              institutionId: workspace.institutionId,
              membershipId: target.id,
              actorType: "organisation_admin",
              actorInstitutionalUserId: institutionalUserId,
              eventType: "membership_suspended",
              details: { role: target.role },
            });
            return { kind: "updated" as const, role: target.role, status: "suspended" };
          }

          if (target.status === "active") {
            return { kind: "unchanged" as const, role: target.role, status: target.status };
          }
          await tx.update(cushVerifyInstitutionalMemberships)
            .set({ status: "active", updatedAt: now })
            .where(and(
              eq(cushVerifyInstitutionalMemberships.id, target.id),
              eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
            ));
          await tx.insert(cushVerifyMembershipEvents).values({
            institutionId: workspace.institutionId,
            membershipId: target.id,
            actorType: "organisation_admin",
            actorInstitutionalUserId: institutionalUserId,
            eventType: "membership_reactivated",
            details: { role: target.role },
          });
          return { kind: "updated" as const, role: target.role, status: "active" };
        });

        if (result.kind === "not_found") return res.status(404).json({ error: "Team membership not found." });
        if (result.kind === "last_admin") {
          return res.status(409).json({ error: "An organisation must keep at least one active administrator." });
        }
        if (result.kind === "cannot_suspend_self") {
          return res.status(409).json({ error: "You cannot suspend your own membership. Ask another organisation administrator to do this." });
        }
        if (result.kind === "admin_membership_changed") {
          return res.status(403).json({ error: "Only active organisation administrators can manage team access." });
        }
        if (result.kind === "institution_unavailable") {
          return res.status(409).json({ error: "Team access can only be changed for an approved organisation." });
        }
        if (result.kind === "membership_unavailable") {
          return res.status(409).json({ error: "This membership is no longer available for organisation-admin changes." });
        }
        return res.json({
          success: true,
          status: result.status,
          role: result.role,
          unchanged: result.kind === "unchanged",
        });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        console.error("Cush Verify team membership update failed", {
          institutionId: workspace.institutionId,
          membershipId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Team access could not be updated. Please try again." });
      }
    },
  );

  app.post(
    "/api/verify/team/invitations",
    authRateLimit,
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = cushVerifyTeamInvitationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Enter a valid name, official email address, job title, and workspace role." });
      }
      const institutionalUserId = req.cushVerifyInstitutionalUserId!;
      const workspace = await getInstitutionalWorkspaceState(institutionalUserId).catch(() => null);
      if (!workspace) return res.status(403).json({ error: "Institutional membership is not available." });
      if (workspace.role !== "organisation_admin" || workspace.membershipStatus !== "active") {
        return res.status(403).json({ error: "Only active organisation administrators can invite colleagues." });
      }

      const normalizedEmail = normalizeEmail(parsed.data.email);
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashInvitationToken(token);
      const now = new Date();
      let created: { invitationId: number; institutionName: string };
      try {
        created = await db.transaction(async (tx) => {
          const [institution] = await tx.select()
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.id, workspace.institutionId))
            .for("update")
            .limit(1);
          if (!institution || institution.status !== "approved") {
            throw new Error("CUSH_VERIFY_INSTITUTION_NOT_APPROVED");
          }
          const [actorMembership] = await tx.select({
            role: cushVerifyInstitutionalMemberships.role,
            status: cushVerifyInstitutionalMemberships.status,
          })
            .from(cushVerifyInstitutionalMemberships)
            .where(and(
              eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
              eq(cushVerifyInstitutionalMemberships.institutionalUserId, institutionalUserId),
            ))
            .for("update")
            .limit(1);
          if (!actorMembership || actorMembership.role !== "organisation_admin" || actorMembership.status !== "active") {
            throw new Error("CUSH_VERIFY_ADMIN_MEMBERSHIP_CHANGED");
          }
          const [application] = await tx.select({
            id: cushVerifyApplications.id,
            status: cushVerifyApplications.status,
          })
            .from(cushVerifyApplications)
            .where(eq(cushVerifyApplications.id, institution.sourceApplicationId))
            .limit(1);
          if (!application || application.status !== "approved") {
            throw new Error("CUSH_VERIFY_APPLICATION_NOT_APPROVED");
          }

          const expiredInvitations = await tx.update(cushVerifyInvitations)
            .set({ revokedAt: now })
            .where(and(
              eq(cushVerifyInvitations.institutionId, institution.id),
              eq(cushVerifyInvitations.email, normalizedEmail),
              isNull(cushVerifyInvitations.acceptedAt),
              isNull(cushVerifyInvitations.revokedAt),
              lt(cushVerifyInvitations.expiresAt, now),
            ))
            .returning({ id: cushVerifyInvitations.id });
          for (const expired of expiredInvitations) {
            await tx.insert(cushVerifyMembershipEvents).values({
              institutionId: institution.id,
              invitationId: expired.id,
              actorType: "system",
              eventType: "invitation_revoked",
              details: { reason: "expired_replaced" },
            });
          }

          const [existingUser] = await tx.select({ id: cushVerifyInstitutionalUsers.id })
            .from(cushVerifyInstitutionalUsers)
            .where(eq(cushVerifyInstitutionalUsers.email, normalizedEmail))
            .limit(1);
          if (existingUser) {
            const [existingMembership] = await tx.select({ id: cushVerifyInstitutionalMemberships.id })
              .from(cushVerifyInstitutionalMemberships)
              .where(eq(cushVerifyInstitutionalMemberships.institutionalUserId, existingUser.id))
              .limit(1);
            if (existingMembership) throw new Error("CUSH_VERIFY_ACCOUNT_ALREADY_LINKED");
          }
          const [existingInvitation] = await tx.select({ id: cushVerifyInvitations.id })
            .from(cushVerifyInvitations)
            .where(and(
              eq(cushVerifyInvitations.institutionId, institution.id),
              eq(cushVerifyInvitations.email, normalizedEmail),
              isNull(cushVerifyInvitations.acceptedAt),
              isNull(cushVerifyInvitations.revokedAt),
              gt(cushVerifyInvitations.expiresAt, now),
            ))
            .limit(1);
          if (existingInvitation) throw new Error("CUSH_VERIFY_INVITATION_EXISTS");

          const [invitation] = await tx.insert(cushVerifyInvitations).values({
            institutionId: institution.id,
            applicationId: application.id,
            email: normalizedEmail,
            fullName: parsed.data.fullName,
            jobTitle: parsed.data.jobTitle,
            businessTelephone: null,
            role: parsed.data.role,
            tokenHash,
            expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
            createdBy: institutionalUserId,
            createdByType: "organisation_admin",
          }).returning({ id: cushVerifyInvitations.id });
          await tx.insert(cushVerifyMembershipEvents).values({
            institutionId: institution.id,
            invitationId: invitation.id,
            actorType: "organisation_admin",
            actorInstitutionalUserId: institutionalUserId,
            eventType: "invitation_created",
            details: { role: parsed.data.role },
          });
          return {
            invitationId: invitation.id,
            institutionName: institution.legalName,
          };
        });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        const message = error instanceof Error ? error.message : "";
        if (message === "CUSH_VERIFY_INSTITUTION_NOT_APPROVED" || message === "CUSH_VERIFY_APPLICATION_NOT_APPROVED") {
          return res.status(409).json({ error: "Only an approved institution can invite colleagues." });
        }
        if (message === "CUSH_VERIFY_ADMIN_MEMBERSHIP_CHANGED") {
          return res.status(403).json({ error: "Only active organisation administrators can invite colleagues." });
        }
        if (message === "CUSH_VERIFY_ACCOUNT_ALREADY_LINKED") {
          return res.status(409).json({ error: "This institutional account is already linked to an organisation." });
        }
        if (message === "CUSH_VERIFY_INVITATION_EXISTS" || isUniqueViolation(error)) {
          return res.status(409).json({ error: "An active invitation already exists for this email address." });
        }
        console.error("Cush Verify team invitation creation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The invitation could not be created. Please try again." });
      }

      const url = invitationUrl(req, token);
      const emailResult = url
        ? await sendCushVerifyInvitationEmail({
            email: normalizedEmail,
            contactName: parsed.data.fullName,
            institutionName: created.institutionName,
            inviteUrl: url,
            invitationId: created.invitationId,
            role: parsed.data.role,
            institutionApproved: true,
          })
        : { status: "failed" as const, reason: "request_failed" as const };
      if (emailResult.status !== "sent") {
        await db.update(cushVerifyInvitations)
          .set({ revokedAt: new Date() })
          .where(and(
            eq(cushVerifyInvitations.id, created.invitationId),
            isNull(cushVerifyInvitations.acceptedAt),
            isNull(cushVerifyInvitations.revokedAt),
          ))
          .catch((error) => {
            console.error("Cush Verify failed invitation cleanup failed", {
              errorType: error instanceof Error ? error.name : "UnknownError",
            });
          });
        await db.insert(cushVerifyMembershipEvents).values({
          institutionId: workspace.institutionId,
          invitationId: created.invitationId,
          actorType: "system",
          eventType: "invitation_delivery_failed",
          details: { providerStatus: emailResult.status },
        }).catch((error) => {
          console.error("Cush Verify invitation delivery failure could not be recorded", {
            errorType: error instanceof Error ? error.name : "UnknownError",
          });
        });
        return res.status(502).json({ error: "The invitation was created but the email could not be sent. Please try again." });
      }
      await db.insert(cushVerifyMembershipEvents).values({
        institutionId: workspace.institutionId,
        invitationId: created.invitationId,
        actorType: "system",
        eventType: "invitation_sent",
      }).catch((error) => {
        console.error("Cush Verify invitation delivery event could not be recorded", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      });
      return res.status(201).json({
        success: true,
        invitationEmailStatus: emailResult.status,
        message: `Invitation sent to ${normalizedEmail}. The membership becomes active after official-email verification.`,
      });
    },
  );

  app.delete(
    "/api/verify/team/invitations/:invitationId",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const invitationId = Number(req.params.invitationId);
      if (!Number.isSafeInteger(invitationId) || invitationId <= 0) {
        return res.status(400).json({ error: "Choose a valid invitation." });
      }
      const institutionalUserId = req.cushVerifyInstitutionalUserId!;
      const workspace = await getInstitutionalWorkspaceState(institutionalUserId).catch(() => null);
      if (!workspace || workspace.role !== "organisation_admin" || workspace.membershipStatus !== "active") {
        return res.status(403).json({ error: "Only active organisation administrators can manage invitations." });
      }
      try {
        const result = await db.transaction(async (tx) => {
          const [institution] = await tx.select({ status: cushVerifyInstitutions.status })
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.id, workspace.institutionId))
            .for("update")
            .limit(1);
          if (!institution || institution.status !== "approved") return { kind: "institution_unavailable" as const };
          const [actorMembership] = await tx.select({
            role: cushVerifyInstitutionalMemberships.role,
            status: cushVerifyInstitutionalMemberships.status,
          })
            .from(cushVerifyInstitutionalMemberships)
            .where(and(
              eq(cushVerifyInstitutionalMemberships.institutionId, workspace.institutionId),
              eq(cushVerifyInstitutionalMemberships.institutionalUserId, institutionalUserId),
            ))
            .for("update")
            .limit(1);
          if (!actorMembership || actorMembership.role !== "organisation_admin" || actorMembership.status !== "active") {
            return { kind: "admin_membership_changed" as const };
          }
          const [invitation] = await tx.select()
            .from(cushVerifyInvitations)
            .where(and(
              eq(cushVerifyInvitations.id, invitationId),
              eq(cushVerifyInvitations.institutionId, workspace.institutionId),
            ))
            .for("update")
            .limit(1);
          if (!invitation) return { kind: "not_found" as const };
          if (invitation.acceptedAt) return { kind: "already_accepted" as const };
          if (invitation.revokedAt) return { kind: "already_revoked" as const };
          if (invitation.expiresAt <= new Date()) return { kind: "expired" as const };
          await tx.update(cushVerifyInvitations)
            .set({ revokedAt: new Date() })
            .where(eq(cushVerifyInvitations.id, invitation.id));
          await tx.insert(cushVerifyMembershipEvents).values({
            institutionId: workspace.institutionId,
            invitationId: invitation.id,
            actorType: "organisation_admin",
            actorInstitutionalUserId: institutionalUserId,
            eventType: "invitation_revoked",
            details: { reason: "cancelled_by_organisation_admin" },
          });
          return { kind: "revoked" as const };
        });
        if (result.kind === "institution_unavailable") {
          return res.status(409).json({ error: "Only an approved organisation can manage invitations." });
        }
        if (result.kind === "admin_membership_changed") {
          return res.status(403).json({ error: "Only active organisation administrators can manage invitations." });
        }
        if (result.kind === "not_found") return res.status(404).json({ error: "Invitation not found." });
        if (result.kind === "already_accepted") return res.status(409).json({ error: "This invitation has already been accepted." });
        if (result.kind === "already_revoked") return res.status(409).json({ error: "This invitation has already been cancelled." });
        if (result.kind === "expired") return res.status(409).json({ error: "This invitation has expired." });
        return res.json({ success: true, message: "Invitation cancelled." });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        console.error("Cush Verify invitation cancellation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Invitation status could not be changed." });
      }
    },
  );

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

  app.get(
    "/api/admin/cush-verify/memberships",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsRead),
    async (_req, res) => {
      try {
        const memberships = await db.select({
          membershipId: cushVerifyInstitutionalMemberships.id,
          institutionId: cushVerifyInstitutions.id,
          institutionLegalName: cushVerifyInstitutions.legalName,
          institutionStatus: cushVerifyInstitutions.status,
          userId: cushVerifyInstitutionalUsers.id,
          fullName: cushVerifyInstitutionalUsers.fullName,
          email: cushVerifyInstitutionalUsers.email,
          jobTitle: cushVerifyInstitutionalUsers.jobTitle,
          role: cushVerifyInstitutionalMemberships.role,
          status: cushVerifyInstitutionalMemberships.status,
          emailVerified: cushVerifyInstitutionalUsers.isEmailVerified,
          createdAt: cushVerifyInstitutionalMemberships.createdAt,
          applicationStatus: cushVerifyApplications.status,
        })
          .from(cushVerifyInstitutionalMemberships)
          .innerJoin(
            cushVerifyInstitutionalUsers,
            eq(cushVerifyInstitutionalUsers.id, cushVerifyInstitutionalMemberships.institutionalUserId),
          )
          .innerJoin(
            cushVerifyInstitutions,
            eq(cushVerifyInstitutions.id, cushVerifyInstitutionalMemberships.institutionId),
          )
          .innerJoin(
            cushVerifyApplications,
            eq(cushVerifyApplications.id, cushVerifyInstitutions.sourceApplicationId),
          )
          .orderBy(desc(cushVerifyInstitutionalMemberships.createdAt))
          .limit(500);
        return res.json({ memberships });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        console.error("Cush Verify memberships list failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to load institutional memberships." });
      }
    },
  );

  app.put(
    "/api/admin/cush-verify/memberships/:membershipId",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsManage),
    requireTrustedAdminOrigin,
    async (req: AdminRequest, res) => {
      const membershipId = Number(req.params.membershipId);
      if (!Number.isSafeInteger(membershipId) || membershipId <= 0 || req.body?.action !== "revoke") {
        return res.status(400).json({ error: "Choose a valid membership and revoke action." });
      }
      try {
        const result = await db.transaction(async (tx) => {
          const [membership] = await tx.select()
            .from(cushVerifyInstitutionalMemberships)
            .where(eq(cushVerifyInstitutionalMemberships.id, membershipId))
            .for("update")
            .limit(1);
          if (!membership) return { kind: "not_found" as const };
          if (membership.status !== "active") return { kind: "not_active" as const };
          await tx.update(cushVerifyInstitutionalMemberships)
            .set({ status: "revoked", updatedAt: new Date() })
            .where(eq(cushVerifyInstitutionalMemberships.id, membership.id));
          await tx.insert(cushVerifyMembershipEvents).values({
            institutionId: membership.institutionId,
            membershipId: membership.id,
            actorType: "cush_admin",
            actorAdminUserId: req.userId ?? null,
            eventType: "membership_revoked",
            details: { role: membership.role },
          });
          return { kind: "revoked" as const };
        });
        if (result.kind === "not_found") return res.status(404).json({ error: "Membership not found." });
        if (result.kind === "not_active") return res.status(409).json({ error: "Only active memberships can be revoked here." });
        await recordAdminAuditEventAfterCommit(req, {
          action: "admin.cush_verify_membership.revoked",
          resourceType: "cush_verify_membership",
          resourceId: membershipId,
        });
        return res.json({ success: true, status: "revoked" });
      } catch (error) {
        if (respondIfInstitutionalSchemaMissing(error, res)) return;
        console.error("Cush Verify membership revocation failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to revoke this institutional membership." });
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
        await recordAdminAuditEventAfterCommit(req, {
          action: `admin.cush_verify_application.status_${nextStatus}`,
          resourceType: "cush_verify_application",
          resourceId: id,
        });
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

      await recordAdminAuditEventAfterCommit(req, {
        action: "admin.cush_verify_application.organisation_onboarded",
        resourceType: "cush_verify_application",
        resourceId: id,
      });
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

      await recordAdminAuditEventAfterCommit(req, {
        action: "admin.cush_verify_application.invitation_resent",
        resourceType: "cush_verify_application",
        resourceId: id,
      });
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
