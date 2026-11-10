import { createHash, randomBytes } from "node:crypto";
import type { Express, Request, Response, NextFunction } from "express";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  cushVerifyApplications,
  cushVerifyApplicationEvents,
  cushVerifyInstitutionalMemberships,
  cushVerifyInstitutionalUsers,
  cushVerifyInstitutions,
  cushVerifyInvitations,
} from "@shared/schema";
import {
  cushVerifyApplicationSchema,
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
import { verifyCushVerifyFirebaseIdentity } from "./firebase-auth";
import { recordAdminAuditEvent } from "./admin-audit";
import { getAllowedFrontendOrigins } from "./origin-policy";
import { sendCushVerifyInvitationEmail } from "./cush-verify-invitation-email";
import { authRateLimit } from "./security";
import { SESSION_IDLE_TIMEOUT_MS } from "@shared/auth-constants";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const APPLICATION_CONFIRMATION =
  "Thank you for your interest in Cush Verify. Your institutional interest has been received. The Cush team will be in touch.";

type InstitutionalRequest = Request & {
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
    error: "An application for this institution or business email already exists. Contact Cush support if you need help.",
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

async function getInstitutionalWorkspaceState(institutionalUserId: number) {
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

async function isInstitutionalAuthenticated(
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

function requireApprovedInstitution(
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
          error: "Cush Admin must approve your organisation before verification workspace access is enabled.",
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
    const parsed = cushVerifyApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Check the required institution and contact details." });
    }

    const input = parsed.data;
    const businessEmail = normalizeEmail(input.businessEmail);
    const duplicateKey = normalizeDuplicateKey(input.legalName, input.countryOfRegistration);
    const submittedAt = new Date();

    try {
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
          contactConsentAcceptedAt: submittedAt,
        }).returning({ id: cushVerifyApplications.id });
        await tx.insert(cushVerifyApplicationEvents).values({
          applicationId: application.id,
          eventType: "submitted",
        });
        return application;
      });
      return res.status(201).json({ success: true, message: APPLICATION_CONFIRMATION, applicationId: created.id });
    } catch (error) {
      if (respondIfInstitutionalSchemaMissing(error, res)) return;
      if (isUniqueViolation(error)) return publicApplicationError(res);
      console.error("Cush Verify institutional application submission failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(500).json({ error: "We could not save your application. Please try again later." });
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
        const [allEvents, allInvites, allMembers] = applicationIds.length
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
            ])
          : [[], [], []];
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
        const enriched = applications.map((application) => {
          const invite = inviteByApplication.get(application.id);
          return {
            ...application,
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
