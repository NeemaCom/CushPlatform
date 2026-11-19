import type { Express, NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  type CushVerifyApiAccessEmailStatus,
  cushVerifyApiAccessRequestEvents,
  cushVerifyApiAccessRequests,
  cushVerifyApiKeyEvents,
  cushVerifyApiKeys,
  cushVerifyApiUsage,
  cushVerifyBillingAccounts,
  cushVerifyInstitutionalUsers,
  cushVerifyInstitutions,
  cushVerifySubscriptions,
} from "@shared/schema";
import {
  CUSH_VERIFY_API_SCOPES,
  createCushVerifyApiAccessRequestSchema,
  createCushVerifyApiKeySchema,
  decideCushVerifyApiAccessRequestSchema,
  cushVerifyApiPublicUsageQuerySchema,
  cushVerifyApiUsageQuerySchema,
} from "@shared/cush-verify-api";
import {
  isAuthenticated,
  requireAdminPermission,
  requireTrustedAdminOrigin,
  type AuthenticatedRequest,
} from "./auth";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import { cushVerifyDb as db } from "./db";
import { getAllowedFrontendOrigins } from "./origin-policy";
import { sendCushVerifyApiAccessApprovedEmail } from "./cush-verify-api-access-email";
import {
  getInstitutionalWorkspaceState,
  isInstitutionalAuthenticated,
  requireApprovedInstitution,
  type InstitutionalRequest,
} from "./cush-verify-institutional-routes";
import {
  getProductionApiAccess,
  getSandboxApiLimits,
  mintCushVerifyApiKey,
  registerCushVerifyApiMiddleware,
  requireCushVerifyApiScope,
} from "./cush-verify-api-key-service";

const sandboxDiscoverySchema = z.object({
  scenario: z.enum(["match", "no_match"]),
}).strict();

const sandboxWorkflowSchema = z.object({
  scenario: z.enum([
    "authorized",
    "declined",
    "expired",
    "failed_report",
    "unauthorized",
    "rate_limited",
  ]),
}).strict();

async function countUsageWhere(filters: SQL[]) {
  const [result] = await db.select({ total: count() })
    .from(cushVerifyApiUsage)
    .where(and(...filters));
  return Number(result?.total ?? 0);
}

function isOrganisationAdmin(role: string) {
  return role === "organisation_admin";
}

function requireTrustedInstitutionalOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("Origin");
  if (!origin || !getAllowedFrontendOrigins().has(origin)) {
    res.status(403).json({ error: "This API key action must come from the Cush Verify workspace." });
    return;
  }
  next();
}

async function sendApiAccessApprovalEmail(requestId: number): Promise<"sent" | "not_configured" | "failed"> {
  try {
    const [recipient] = await db.select({
      email: cushVerifyInstitutionalUsers.email,
      fullName: cushVerifyInstitutionalUsers.fullName,
      institutionName: cushVerifyInstitutions.legalName,
    }).from(cushVerifyApiAccessRequests)
      .innerJoin(
        cushVerifyInstitutionalUsers,
        eq(cushVerifyInstitutionalUsers.id, cushVerifyApiAccessRequests.requestedByInstitutionalUserId),
      )
      .innerJoin(
        cushVerifyInstitutions,
        eq(cushVerifyInstitutions.id, cushVerifyApiAccessRequests.institutionId),
      )
      .where(eq(cushVerifyApiAccessRequests.id, requestId))
      .limit(1);
    if (!recipient) return "failed";
    const result = await sendCushVerifyApiAccessApprovedEmail({
      email: recipient.email,
      contactName: recipient.fullName,
      institutionName: recipient.institutionName,
      requestId,
    });
    return result.status;
  } catch (error) {
    console.error("Cush Verify API access approval email failed", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return "failed";
  }
}

async function saveApiAccessApprovalEmailStatus(
  requestId: number,
  status: "sent" | "not_configured" | "failed",
): Promise<CushVerifyApiAccessEmailStatus> {
  try {
    await db.update(cushVerifyApiAccessRequests)
      .set({ emailNotificationStatus: status })
      .where(eq(cushVerifyApiAccessRequests.id, requestId));
    return status;
  } catch (error) {
    console.error("Cush Verify API access email status could not be saved", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return "sending";
  }
}

async function getAdminActor(req: InstitutionalRequest) {
  const userId = req.cushVerifyInstitutionalUserId;
  if (!userId) return null;
  const membership = await getInstitutionalWorkspaceState(userId);
  if (
    !membership ||
    membership.membershipStatus !== "active" ||
    membership.institutionStatus !== "approved" ||
    membership.applicationStatus !== "approved"
  ) return null;
  return {
    userId,
    institutionId: membership.institutionId,
    role: membership.role,
  };
}

function safeKeyView(key: typeof cushVerifyApiKeys.$inferSelect) {
  return {
    id: key.id,
    name: key.name,
    environment: key.environment,
    prefix: key.keyPrefix,
    scopes: key.scopes,
    status: key.status,
    createdAt: key.createdAt.toISOString(),
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
  };
}

export function registerCushVerifyApiRoutes(app: Express): void {
  registerCushVerifyApiMiddleware(app);

  app.get(
    "/api/verify/api-access-requests",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      try {
        const actor = await getAdminActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!isOrganisationAdmin(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators can view API access requests." });
        }
        const [requests, events, productionAccess] = await Promise.all([
          db.select().from(cushVerifyApiAccessRequests)
            .where(eq(cushVerifyApiAccessRequests.institutionId, actor.institutionId))
            .orderBy(desc(cushVerifyApiAccessRequests.createdAt))
            .limit(50),
          db.select({
            id: cushVerifyApiAccessRequestEvents.id,
            requestId: cushVerifyApiAccessRequestEvents.requestId,
            eventType: cushVerifyApiAccessRequestEvents.eventType,
            actorType: cushVerifyApiAccessRequestEvents.actorType,
            details: cushVerifyApiAccessRequestEvents.details,
            createdAt: cushVerifyApiAccessRequestEvents.createdAt,
          }).from(cushVerifyApiAccessRequestEvents)
            .where(eq(cushVerifyApiAccessRequestEvents.institutionId, actor.institutionId))
            .orderBy(desc(cushVerifyApiAccessRequestEvents.createdAt))
            .limit(100),
          getProductionApiAccess(actor.institutionId),
        ]);
        return res.json({
          requests: requests.map((request) => ({
            id: request.id,
            intendedUse: request.intendedUse,
            estimatedMonthlyRequests: request.estimatedMonthlyRequests,
            status: request.status,
            decisionNote: request.decisionNote,
            createdAt: request.createdAt.toISOString(),
            reviewedAt: request.reviewedAt?.toISOString() ?? null,
          })),
          events: events.map((event) => ({
            id: event.id,
            requestId: event.requestId,
            eventType: event.eventType,
            actorType: event.actorType,
            details: event.details,
            createdAt: event.createdAt.toISOString(),
          })),
          productionAccess: {
            enabled: productionAccess.enabled,
            reason: productionAccess.reason,
          },
        });
      } catch (error) {
        console.error("Cush Verify API access request history failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "API access request history is temporarily unavailable." });
      }
    },
  );

  app.post(
    "/api/verify/api-access-requests",
    requireTrustedInstitutionalOrigin,
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = createCushVerifyApiAccessRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Enter a valid API access request." });
      }
      try {
        const actor = await getAdminActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!isOrganisationAdmin(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators can request production API access." });
        }
        const result = await db.transaction(async (tx) => {
          await tx.select({ id: cushVerifyInstitutions.id })
            .from(cushVerifyInstitutions)
            .where(eq(cushVerifyInstitutions.id, actor.institutionId))
            .for("update")
            .limit(1);
          const [latest] = await tx.select({
            id: cushVerifyApiAccessRequests.id,
            status: cushVerifyApiAccessRequests.status,
          }).from(cushVerifyApiAccessRequests)
            .where(eq(cushVerifyApiAccessRequests.institutionId, actor.institutionId))
            .orderBy(desc(cushVerifyApiAccessRequests.createdAt))
            .limit(1);
          if (latest?.status === "submitted" || latest?.status === "approved") {
            return { existing: latest } as const;
          }
          const [request] = await tx.insert(cushVerifyApiAccessRequests).values({
            institutionId: actor.institutionId,
            requestedByInstitutionalUserId: actor.userId,
            intendedUse: parsed.data.intendedUse,
            estimatedMonthlyRequests: parsed.data.estimatedMonthlyRequests ?? null,
          }).returning();
          await tx.insert(cushVerifyApiAccessRequestEvents).values({
            requestId: request.id,
            institutionId: actor.institutionId,
            actorType: "organisation_admin",
            actorInstitutionalUserId: actor.userId,
            eventType: "submitted",
            details: { status: "submitted" },
          });
          return { request } as const;
        });
        if ("existing" in result && result.existing) {
          return res.status(409).json({
            error: result.existing.status === "submitted"
              ? "An API access request is already awaiting review."
              : "This organisation already has an approved API access request.",
          });
        }
        return res.status(201).json({
          request: {
            id: result.request.id,
            status: result.request.status,
            createdAt: result.request.createdAt.toISOString(),
          },
          message: "Your request was submitted. Production access still requires an API-enabled subscription and Cush approval.",
        });
      } catch (error) {
        console.error("Cush Verify API access request submission failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The API access request could not be submitted." });
      }
    },
  );

  app.get(
    "/api/admin/cush-verify/api-access-requests",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsRead),
    async (_req, res) => {
      try {
        const requests = await db.select({
          id: cushVerifyApiAccessRequests.id,
          institutionId: cushVerifyApiAccessRequests.institutionId,
          institutionName: cushVerifyInstitutions.legalName,
          institutionType: cushVerifyInstitutions.institutionType,
          requesterName: cushVerifyInstitutionalUsers.fullName,
          requesterEmail: cushVerifyInstitutionalUsers.email,
          intendedUse: cushVerifyApiAccessRequests.intendedUse,
          estimatedMonthlyRequests: cushVerifyApiAccessRequests.estimatedMonthlyRequests,
          status: cushVerifyApiAccessRequests.status,
          decisionNote: cushVerifyApiAccessRequests.decisionNote,
          emailNotificationStatus: cushVerifyApiAccessRequests.emailNotificationStatus,
          emailNotificationAttemptCount: cushVerifyApiAccessRequests.emailNotificationAttemptCount,
          emailNotificationAttemptedAt: cushVerifyApiAccessRequests.emailNotificationAttemptedAt,
          createdAt: cushVerifyApiAccessRequests.createdAt,
          reviewedAt: cushVerifyApiAccessRequests.reviewedAt,
        }).from(cushVerifyApiAccessRequests)
          .innerJoin(cushVerifyInstitutions, eq(cushVerifyInstitutions.id, cushVerifyApiAccessRequests.institutionId))
          .innerJoin(cushVerifyInstitutionalUsers, eq(
            cushVerifyInstitutionalUsers.id,
            cushVerifyApiAccessRequests.requestedByInstitutionalUserId,
          ))
          .orderBy(desc(cushVerifyApiAccessRequests.createdAt))
          .limit(200);
        return res.json({
          requests: requests.map((request) => ({
            ...request,
            emailNotificationAttemptedAt: request.emailNotificationAttemptedAt?.toISOString() ?? null,
            createdAt: request.createdAt.toISOString(),
            reviewedAt: request.reviewedAt?.toISOString() ?? null,
          })),
        });
      } catch (error) {
        console.error("Cush Verify API access review queue failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The API access review queue is temporarily unavailable." });
      }
    },
  );

  app.put(
    "/api/admin/cush-verify/api-access-requests/:requestId",
    requireTrustedAdminOrigin,
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsManage),
    async (req: AuthenticatedRequest, res) => {
      const requestId = Number(req.params.requestId);
      if (!Number.isSafeInteger(requestId) || requestId < 1) {
        return res.status(400).json({ error: "The API access request reference is invalid." });
      }
      const parsed = decideCushVerifyApiAccessRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Choose a valid review decision." });
      }
      if (!req.userId) return res.status(401).json({ error: "Sign in as a Cush administrator to review this request." });
      try {
        const result = await db.transaction(async (tx) => {
          const [request] = await tx.select().from(cushVerifyApiAccessRequests)
            .where(eq(cushVerifyApiAccessRequests.id, requestId))
            .for("update")
            .limit(1);
          if (!request) return { kind: "missing" } as const;
          if (request.status !== "submitted") {
            return { kind: "decided", status: request.status } as const;
          }
          const reviewedAt = new Date();
          const decisionNote = parsed.data.decisionNote.trim() || null;
          const emailAttemptCount = parsed.data.decision === "approved"
            ? (request.emailNotificationAttemptCount ?? 0) + 1
            : request.emailNotificationAttemptCount;
          const [updated] = await tx.update(cushVerifyApiAccessRequests).set({
            status: parsed.data.decision,
            reviewedByAdminUserId: req.userId!,
            decisionNote,
            reviewedAt,
            ...(parsed.data.decision === "approved" ? {
              emailNotificationStatus: "sending" as const,
              emailNotificationAttemptCount: emailAttemptCount,
              emailNotificationAttemptedAt: reviewedAt,
              emailNotificationLastAttemptedByAdminUserId: req.userId!,
            } : {}),
          }).where(eq(cushVerifyApiAccessRequests.id, request.id)).returning();
          await tx.insert(cushVerifyApiAccessRequestEvents).values({
            requestId: request.id,
            institutionId: request.institutionId,
            actorType: "cush_admin",
            actorCushUserId: req.userId!,
            eventType: parsed.data.decision,
            details: { status: parsed.data.decision },
          });
          return { kind: "updated", request: updated, emailAttemptCount } as const;
        });
        if (result.kind === "missing") return res.status(404).json({ error: "The API access request was not found." });
        if (result.kind === "decided") {
          return res.status(409).json({ error: `This request has already been ${result.status}.` });
        }
        let emailNotificationStatus: CushVerifyApiAccessEmailStatus | null = null;
        if (result.request.status === "approved") {
          const deliveryStatus = await sendApiAccessApprovalEmail(result.request.id);
          emailNotificationStatus = await saveApiAccessApprovalEmailStatus(result.request.id, deliveryStatus);
        }
        return res.json({
          request: {
            id: result.request.id,
            status: result.request.status,
            reviewedAt: result.request.reviewedAt?.toISOString() ?? null,
            emailNotificationStatus,
            emailNotificationAttemptCount: result.emailAttemptCount,
            emailNotificationAttemptedAt: result.request.emailNotificationAttemptedAt?.toISOString() ?? null,
          },
          emailNotificationStatus,
          message: result.request.status === "approved"
            ? "Request approved. An API-enabled subscription is still required before production keys can be created."
            : "Request rejected and recorded.",
        });
      } catch (error) {
        console.error("Cush Verify API access request decision failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The API access request decision could not be saved." });
      }
    },
  );

  app.post(
    "/api/admin/cush-verify/api-access-requests/:requestId/email/retry",
    requireTrustedAdminOrigin,
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsManage),
    async (req: AuthenticatedRequest, res) => {
      const requestId = Number(req.params.requestId);
      if (!Number.isSafeInteger(requestId) || requestId < 1) {
        return res.status(400).json({ error: "The API access request reference is invalid." });
      }
      if (!req.userId) return res.status(401).json({ error: "Sign in as a Cush administrator to retry this email." });

      try {
        const result = await db.transaction(async (tx) => {
          const [request] = await tx.select().from(cushVerifyApiAccessRequests)
            .where(eq(cushVerifyApiAccessRequests.id, requestId))
            .for("update")
            .limit(1);
          if (!request) return { kind: "missing" } as const;
          if (request.status !== "approved") return { kind: "not_approved" } as const;

          const now = new Date();
          const staleSending = request.emailNotificationStatus === "sending"
            && request.emailNotificationAttemptedAt !== null
            && now.getTime() - request.emailNotificationAttemptedAt.getTime() >= 5 * 60_000;
          if (request.emailNotificationStatus === "sending" && !staleSending) {
            return { kind: "in_progress" } as const;
          }
          if (
            request.emailNotificationStatus !== "failed" &&
            request.emailNotificationStatus !== "not_configured" &&
            !staleSending
          ) {
            return { kind: "not_retryable", status: request.emailNotificationStatus } as const;
          }

          const attemptedAt = now;
          const attemptNumber = (request.emailNotificationAttemptCount ?? 0) + 1;
          await tx.update(cushVerifyApiAccessRequests).set({
            emailNotificationStatus: "sending",
            emailNotificationAttemptCount: attemptNumber,
            emailNotificationAttemptedAt: attemptedAt,
            emailNotificationLastAttemptedByAdminUserId: req.userId!,
          }).where(eq(cushVerifyApiAccessRequests.id, request.id));
          await tx.insert(cushVerifyApiAccessRequestEvents).values({
            requestId: request.id,
            institutionId: request.institutionId,
            actorType: "cush_admin",
            actorCushUserId: req.userId!,
            eventType: "approval_email_retry_started",
            details: { attemptNumber },
          });
          return {
            kind: "started",
            institutionId: request.institutionId,
            attemptNumber,
            attemptedAt,
          } as const;
        });

        if (result.kind === "missing") return res.status(404).json({ error: "The API access request was not found." });
        if (result.kind === "not_approved") {
          return res.status(409).json({ error: "Only approved API access requests can have their email retried." });
        }
        if (result.kind === "in_progress") {
          return res.status(409).json({ error: "An email attempt is already in progress. Refresh the queue shortly." });
        }
        if (result.kind === "not_retryable") {
          return res.status(409).json({
            error: result.status === "sent"
              ? "Resend already accepted this email. No duplicate was sent."
              : "This request has no failed or unconfigured email attempt to retry.",
          });
        }

        const deliveryStatus = await sendApiAccessApprovalEmail(requestId);
        const savedStatus = await saveApiAccessApprovalEmailStatus(requestId, deliveryStatus);
        try {
          await db.insert(cushVerifyApiAccessRequestEvents).values({
            requestId,
            institutionId: result.institutionId,
            actorType: "cush_admin",
            actorCushUserId: req.userId!,
            eventType: "approval_email_retry_completed",
            details: {
              attemptNumber: result.attemptNumber,
              emailNotificationStatus: savedStatus,
            },
          });
        } catch (error) {
          console.error("Cush Verify API access email retry audit event failed", {
            requestId,
            errorType: error instanceof Error ? error.name : "UnknownError",
          });
        }
        return res.json({
          emailNotificationStatus: savedStatus,
          emailNotificationAttemptCount: result.attemptNumber,
          emailNotificationAttemptedAt: result.attemptedAt.toISOString(),
          message: savedStatus === "sent"
            ? "Resend accepted the approval email for delivery to the original requester."
            : savedStatus === "not_configured"
              ? "The approval email is still not configured. No email was sent."
              : savedStatus === "failed"
                ? "The approval email could not be sent. You can retry after checking the sender settings."
                : "The email result is still being recorded. Refresh the queue shortly.",
        });
      } catch (error) {
        console.error("Cush Verify API access approval email retry failed", {
          requestId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The approval email could not be retried." });
      }
    },
  );

  app.get(
    "/api/verify/api-keys",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      try {
        const actor = await getAdminActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!isOrganisationAdmin(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators can manage API keys." });
        }
        const [keys, events, productionAccess, sandboxLimits] = await Promise.all([
          db.select().from(cushVerifyApiKeys)
            .where(eq(cushVerifyApiKeys.institutionId, actor.institutionId))
            .orderBy(desc(cushVerifyApiKeys.createdAt))
            .limit(100),
          db.select({
            id: cushVerifyApiKeyEvents.id,
            eventType: cushVerifyApiKeyEvents.eventType,
            environment: cushVerifyApiKeyEvents.environment,
            details: cushVerifyApiKeyEvents.details,
            createdAt: cushVerifyApiKeyEvents.createdAt,
            keyName: cushVerifyApiKeys.name,
          })
            .from(cushVerifyApiKeyEvents)
            .leftJoin(cushVerifyApiKeys, eq(cushVerifyApiKeys.id, cushVerifyApiKeyEvents.apiKeyId))
            .where(eq(cushVerifyApiKeyEvents.institutionId, actor.institutionId))
            .orderBy(desc(cushVerifyApiKeyEvents.createdAt))
            .limit(50),
          getProductionApiAccess(actor.institutionId),
          getSandboxApiLimits(),
        ]);
        return res.json({
          keys: keys.map(safeKeyView),
          sandboxLimits,
          events: events.map((event) => ({
            ...event,
            createdAt: event.createdAt.toISOString(),
          })),
          productionAccess: {
            enabled: productionAccess.enabled,
            reason: productionAccess.reason,
            limits: productionAccess.apiLimits,
            requestStatus: productionAccess.requestStatus,
            requestSubmittedAt: productionAccess.requestSubmittedAt?.toISOString() ?? null,
            requestReviewedAt: productionAccess.requestReviewedAt?.toISOString() ?? null,
            decisionNote: productionAccess.decisionNote,
          },
          scopes: CUSH_VERIFY_API_SCOPES,
        });
      } catch (error) {
        console.error("Cush Verify API key list failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "API key management is temporarily unavailable. Apply the API access migration if it has not been run." });
      }
    },
  );

  app.post(
    "/api/verify/api-keys",
    requireTrustedInstitutionalOrigin,
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = createCushVerifyApiKeySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Check the key name, environment, and selected permissions." });
      const environmentScopes = parsed.data.scopes.filter((scope) => (
        parsed.data.environment === "sandbox"
          ? scope === "sandbox:simulate"
          : scope !== "sandbox:simulate"
      ));
      if (environmentScopes.length !== parsed.data.scopes.length || environmentScopes.length === 0) {
        return res.status(400).json({ error: "Choose permissions that match the selected key environment." });
      }
      try {
        const actor = await getAdminActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!isOrganisationAdmin(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators can create API keys." });
        }
        if (parsed.data.environment === "production") {
          const access = await getProductionApiAccess(actor.institutionId);
          if (!access.enabled) return res.status(403).json({ code: "CUSH_VERIFY_PRODUCTION_API_NOT_ENABLED", error: access.reason });
        }

        const minted = mintCushVerifyApiKey(parsed.data.environment);
        const result = await db.transaction(async (tx) => {
          const [key] = await tx.insert(cushVerifyApiKeys).values({
            institutionId: actor.institutionId,
            createdByInstitutionalUserId: actor.userId,
            name: parsed.data.name,
            environment: parsed.data.environment,
            keyPrefix: minted.keyPrefix,
            secretHash: minted.secretHash,
            scopes: environmentScopes,
          }).returning();
          await tx.insert(cushVerifyApiKeyEvents).values({
            institutionId: actor.institutionId,
            apiKeyId: key.id,
            actorInstitutionalUserId: actor.userId,
            eventType: "created",
            environment: key.environment,
            details: { prefix: key.keyPrefix, scopes: environmentScopes },
          });
          return key;
        });
        return res.status(201).json({
          key: minted.secret,
          oneTimeDisplay: true,
          item: safeKeyView(result),
          message: "Copy this key now. Cush Verify does not store or display the full secret again.",
        });
      } catch (error) {
        console.error("Cush Verify API key creation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The API key could not be created. Confirm the API access migration is applied." });
      }
    },
  );

  app.post(
    "/api/verify/api-keys/:keyId/rotate",
    requireTrustedInstitutionalOrigin,
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const keyId = Number(req.params.keyId);
      if (!Number.isSafeInteger(keyId) || keyId < 1) return res.status(400).json({ error: "The API key reference is invalid." });
      try {
        const actor = await getAdminActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!isOrganisationAdmin(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators can rotate API keys." });
        }
        const result = await db.transaction(async (tx) => {
          const [oldKey] = await tx.select().from(cushVerifyApiKeys)
            .where(and(
              eq(cushVerifyApiKeys.id, keyId),
              eq(cushVerifyApiKeys.institutionId, actor.institutionId),
            ))
            .for("update")
            .limit(1);
          if (!oldKey || oldKey.status !== "active") return null;
          if (oldKey.environment === "production") {
            const access = await getProductionApiAccess(actor.institutionId);
            if (!access.enabled) return { blocked: access.reason ?? "Production API access is not active." } as const;
          }
          const minted = mintCushVerifyApiKey(oldKey.environment);
          const now = new Date();
          await tx.update(cushVerifyApiKeys).set({
            status: "revoked",
            revokedAt: now,
          }).where(eq(cushVerifyApiKeys.id, oldKey.id));
          const [newKey] = await tx.insert(cushVerifyApiKeys).values({
            institutionId: oldKey.institutionId,
            createdByInstitutionalUserId: actor.userId,
            name: oldKey.name,
            environment: oldKey.environment,
            keyPrefix: minted.keyPrefix,
            secretHash: minted.secretHash,
            scopes: oldKey.scopes,
          }).returning();
          await tx.insert(cushVerifyApiKeyEvents).values([
            {
              institutionId: oldKey.institutionId,
              apiKeyId: oldKey.id,
              actorInstitutionalUserId: actor.userId,
              eventType: "rotated",
              environment: oldKey.environment,
              details: { replacementKeyId: newKey.id },
            },
            {
              institutionId: newKey.institutionId,
              apiKeyId: newKey.id,
              actorInstitutionalUserId: actor.userId,
              eventType: "created",
              environment: newKey.environment,
              details: { rotatedFromKeyId: oldKey.id, prefix: newKey.keyPrefix, scopes: newKey.scopes },
            },
          ]);
          return { key: minted.secret, item: safeKeyView(newKey) } as const;
        });
        if (!result) return res.status(404).json({ error: "An active API key was not found for this organisation." });
        if ("blocked" in result) return res.status(403).json({ error: result.blocked });
        return res.json({
          key: result.key,
          oneTimeDisplay: true,
          item: result.item,
          message: "The previous key was revoked. Copy this replacement now; its full secret is shown only once.",
        });
      } catch (error) {
        console.error("Cush Verify API key rotation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The API key could not be rotated." });
      }
    },
  );

  app.post(
    "/api/verify/api-keys/:keyId/revoke",
    requireTrustedInstitutionalOrigin,
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const keyId = Number(req.params.keyId);
      if (!Number.isSafeInteger(keyId) || keyId < 1) return res.status(400).json({ error: "The API key reference is invalid." });
      try {
        const actor = await getAdminActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!isOrganisationAdmin(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators can revoke API keys." });
        }
        const result = await db.transaction(async (tx) => {
          const [key] = await tx.select().from(cushVerifyApiKeys)
            .where(and(
              eq(cushVerifyApiKeys.id, keyId),
              eq(cushVerifyApiKeys.institutionId, actor.institutionId),
            ))
            .for("update")
            .limit(1);
          if (!key || key.status !== "active") return false;
          const now = new Date();
          await tx.update(cushVerifyApiKeys).set({ status: "revoked", revokedAt: now })
            .where(eq(cushVerifyApiKeys.id, key.id));
          await tx.insert(cushVerifyApiKeyEvents).values({
            institutionId: key.institutionId,
            apiKeyId: key.id,
            actorInstitutionalUserId: actor.userId,
            eventType: "revoked",
            environment: key.environment,
            details: { prefix: key.keyPrefix },
          });
          return true;
        });
        if (!result) return res.status(404).json({ error: "An active API key was not found for this organisation." });
        return res.json({ success: true, message: "The API key has been revoked." });
      } catch (error) {
        console.error("Cush Verify API key revocation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The API key could not be revoked." });
      }
    },
  );

  app.get(
    "/api/verify/api-usage",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = cushVerifyApiUsageQuerySchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ error: "Choose a valid usage date range and filter." });
      try {
        const actor = await getAdminActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        const now = new Date();
        const from = parsed.data.from
          ? new Date(parsed.data.from)
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const to = parsed.data.to ? new Date(parsed.data.to) : now;
        const filters = [
          eq(cushVerifyApiUsage.institutionId, actor.institutionId),
          gte(cushVerifyApiUsage.createdAt, from),
          lte(cushVerifyApiUsage.createdAt, to),
        ];
        if (parsed.data.environment) filters.push(eq(cushVerifyApiUsage.environment, parsed.data.environment));
        if (parsed.data.apiKeyId) filters.push(eq(cushVerifyApiUsage.apiKeyId, parsed.data.apiKeyId));
        if (parsed.data.endpoint) filters.push(eq(cushVerifyApiUsage.endpoint, parsed.data.endpoint));
        const where = and(...filters);
        const [summary, history, credits, productionAccess, sandboxLimits] = await Promise.all([
          db.select({
            total: count(),
            successful: sql<number>`count(*) filter (where ${cushVerifyApiUsage.responseStatus} between 200 and 399)`.mapWith(Number),
            failed: sql<number>`count(*) filter (where ${cushVerifyApiUsage.responseStatus} >= 400)`.mapWith(Number),
            rateLimited: sql<number>`count(*) filter (where ${cushVerifyApiUsage.responseStatus} = 429)`.mapWith(Number),
            reportsBilled: sql<number>`count(*) filter (where ${cushVerifyApiUsage.billableReport})`.mapWith(Number),
          }).from(cushVerifyApiUsage).where(where),
          db.select({
            id: cushVerifyApiUsage.id,
            requestId: cushVerifyApiUsage.requestId,
            environment: cushVerifyApiUsage.environment,
            endpoint: cushVerifyApiUsage.endpoint,
            method: cushVerifyApiUsage.method,
            responseStatus: cushVerifyApiUsage.responseStatus,
            durationMs: cushVerifyApiUsage.durationMs,
            billableReport: cushVerifyApiUsage.billableReport,
            createdAt: cushVerifyApiUsage.createdAt,
            keyName: cushVerifyApiKeys.name,
          }).from(cushVerifyApiUsage)
            .leftJoin(cushVerifyApiKeys, eq(cushVerifyApiKeys.id, cushVerifyApiUsage.apiKeyId))
            .where(where)
            .orderBy(desc(cushVerifyApiUsage.createdAt))
            .limit(100),
          db.select().from(cushVerifyBillingAccounts)
            .where(eq(cushVerifyBillingAccounts.institutionId, actor.institutionId))
            .limit(1),
          getProductionApiAccess(actor.institutionId),
          getSandboxApiLimits(),
        ]);
        const minuteSince = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
        const hourSince = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
        const inFlightSince = new Date(now.getTime() - 5 * 60_000);
        const sandboxBase = [
          eq(cushVerifyApiUsage.institutionId, actor.institutionId),
          eq(cushVerifyApiUsage.environment, "sandbox"),
        ];
        const productionBase = [
          eq(cushVerifyApiUsage.institutionId, actor.institutionId),
          eq(cushVerifyApiUsage.environment, "production"),
        ];
        const [
          productionMinute,
          productionHour,
          productionConcurrent,
          productionMonthlyReports,
          sandboxMinute,
          sandboxHour,
          sandboxConcurrent,
        ] = await Promise.all([
          countUsageWhere([...productionBase, gte(cushVerifyApiUsage.createdAt, minuteSince)]),
          countUsageWhere([...productionBase, gte(cushVerifyApiUsage.createdAt, hourSince)]),
          countUsageWhere([
            ...productionBase,
            eq(cushVerifyApiUsage.state, "processing"),
            gte(cushVerifyApiUsage.createdAt, inFlightSince),
          ]),
          countUsageWhere([
            ...productionBase,
            eq(cushVerifyApiUsage.billableReport, true),
            gte(cushVerifyApiUsage.createdAt, productionAccess.periodStartAt),
          ]),
          countUsageWhere([...sandboxBase, gte(cushVerifyApiUsage.createdAt, minuteSince)]),
          countUsageWhere([...sandboxBase, gte(cushVerifyApiUsage.createdAt, hourSince)]),
          countUsageWhere([
            ...sandboxBase,
            eq(cushVerifyApiUsage.state, "processing"),
            gte(cushVerifyApiUsage.createdAt, inFlightSince),
          ]),
        ]);
        return res.json({
          range: { from: from.toISOString(), to: to.toISOString() },
          summary: {
            total: summary[0]?.total ?? 0,
            successful: summary[0]?.successful ?? 0,
            failed: summary[0]?.failed ?? 0,
            rateLimited: summary[0]?.rateLimited ?? 0,
            reportsBilled: summary[0]?.reportsBilled ?? 0,
          },
          credits: {
            available: credits[0]?.availableCredits ?? 0,
            usedThisPeriod: credits[0]?.currentPeriodUsed ?? 0,
            periodStartAt: credits[0]?.currentPeriodStartAt?.toISOString() ?? null,
            periodEndAt: credits[0]?.currentPeriodEndAt?.toISOString() ?? null,
          },
          productionAccess: {
            enabled: productionAccess.enabled,
            reason: productionAccess.reason,
            limits: productionAccess.apiLimits,
          },
          sandboxLimits,
          usageWindows: {
            production: {
              requestsLastMinute: productionMinute,
              requestsLastHour: productionHour,
              concurrentRequests: productionConcurrent,
              reportsThisPeriod: productionMonthlyReports,
            },
            sandbox: {
              requestsLastMinute: sandboxMinute,
              requestsLastHour: sandboxHour,
              concurrentRequests: sandboxConcurrent,
              reportsThisPeriod: 0,
            },
          },
          history: history.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        console.error("Cush Verify API usage query failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "API usage history is temporarily unavailable." });
      }
    },
  );

  async function sendVersionedUsage(
    req: InstitutionalRequest,
    res: Response,
    environment: "production" | "sandbox",
    breakdown: boolean,
  ) {
    const parsed = cushVerifyApiPublicUsageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ code: "INVALID_QUERY", error: "Choose a valid usage date range and page." });
    }
    const apiContext = req.cushVerifyApiContext;
    if (!apiContext || apiContext.environment !== environment) {
      return res.status(403).json({ code: "API_ENVIRONMENT_MISMATCH", error: "This key cannot access that usage environment." });
    }
    if (parsed.data.apiKeyId && environment === "sandbox") {
      return res.status(400).json({ code: "INVALID_QUERY", error: "Sandbox usage cannot be filtered by production key." });
    }
    try {
      const now = new Date();
      const [account] = environment === "production"
        ? await db.select({
            availableCredits: cushVerifyBillingAccounts.availableCredits,
            currentPeriodUsed: cushVerifyBillingAccounts.currentPeriodUsed,
            currentPeriodStartAt: cushVerifyBillingAccounts.currentPeriodStartAt,
            currentPeriodEndAt: cushVerifyBillingAccounts.currentPeriodEndAt,
          }).from(cushVerifyBillingAccounts)
            .where(eq(cushVerifyBillingAccounts.institutionId, apiContext.institutionId))
            .limit(1)
        : [];
      const [subscription] = environment === "production"
        ? await db.select({
            includedReports: cushVerifySubscriptions.includedReports,
            currentPeriodStartAt: cushVerifySubscriptions.currentPeriodStartAt,
            currentPeriodEndAt: cushVerifySubscriptions.currentPeriodEndAt,
          }).from(cushVerifySubscriptions)
            .where(and(
              eq(cushVerifySubscriptions.institutionId, apiContext.institutionId),
              sql`${cushVerifySubscriptions.status} in ('active', 'trialing')`,
            ))
            .orderBy(desc(cushVerifySubscriptions.updatedAt))
            .limit(1)
        : [];
      const to = parsed.data.to ? new Date(parsed.data.to) : now;
      const from = parsed.data.from
        ? new Date(parsed.data.from)
        : parsed.data.to
          ? new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000)
          : account?.currentPeriodStartAt ?? subscription?.currentPeriodStartAt ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const filters: SQL[] = [
        eq(cushVerifyApiUsage.institutionId, apiContext.institutionId),
        eq(cushVerifyApiUsage.environment, environment),
        gte(cushVerifyApiUsage.createdAt, from),
        lte(cushVerifyApiUsage.createdAt, to),
      ];
      if (parsed.data.apiKeyId) filters.push(eq(cushVerifyApiUsage.apiKeyId, parsed.data.apiKeyId));
      if (parsed.data.endpoint) filters.push(eq(cushVerifyApiUsage.endpoint, parsed.data.endpoint));
      const where = and(...filters);

      if (breakdown) {
        const groupedDay = sql<string>`date_trunc('day', ${cushVerifyApiUsage.createdAt})`.mapWith(String);
        const rows = await db.select({
          day: groupedDay,
          endpoint: cushVerifyApiUsage.endpoint,
          apiKeyId: cushVerifyApiUsage.apiKeyId,
          total: count(),
          successful: sql<number>`count(*) filter (where ${cushVerifyApiUsage.responseStatus} between 200 and 399)`.mapWith(Number),
          failed: sql<number>`count(*) filter (where ${cushVerifyApiUsage.responseStatus} >= 400)`.mapWith(Number),
          reportsBilled: sql<number>`count(*) filter (where ${cushVerifyApiUsage.billableReport})`.mapWith(Number),
        }).from(cushVerifyApiUsage)
          .where(where)
          .groupBy(groupedDay, cushVerifyApiUsage.endpoint, cushVerifyApiUsage.apiKeyId)
          .orderBy(desc(groupedDay))
          .offset(parsed.data.offset)
          .limit(parsed.data.limit + 1);
        const hasMore = rows.length > parsed.data.limit;
        return res.json({
          environment,
          range: { from: from.toISOString(), to: to.toISOString() },
          page: { limit: parsed.data.limit, offset: parsed.data.offset, hasMore },
          breakdown: rows.slice(0, parsed.data.limit),
        });
      }

      const [summary] = await db.select({
        total: count(),
        successful: sql<number>`count(*) filter (where ${cushVerifyApiUsage.responseStatus} between 200 and 399)`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${cushVerifyApiUsage.responseStatus} >= 400)`.mapWith(Number),
        rateLimited: sql<number>`count(*) filter (where ${cushVerifyApiUsage.responseStatus} = 429)`.mapWith(Number),
        reportsConsumed: sql<number>`count(*) filter (where ${cushVerifyApiUsage.billableReport})`.mapWith(Number),
      }).from(cushVerifyApiUsage).where(where);
      return res.json({
        environment,
        range: { from: from.toISOString(), to: to.toISOString() },
        summary: {
          totalRequests: summary?.total ?? 0,
          successfulRequests: summary?.successful ?? 0,
          failedRequests: summary?.failed ?? 0,
          rateLimitedRequests: summary?.rateLimited ?? 0,
          reportsConsumed: summary?.reportsConsumed ?? 0,
        },
        credits: environment === "production"
          ? {
              allocatedThisPeriod: subscription?.includedReports ?? 0,
              remaining: account?.availableCredits ?? 0,
              usedThisPeriod: account?.currentPeriodUsed ?? 0,
              periodStartAt: account?.currentPeriodStartAt?.toISOString() ?? subscription?.currentPeriodStartAt?.toISOString() ?? null,
              periodEndAt: account?.currentPeriodEndAt?.toISOString() ?? subscription?.currentPeriodEndAt?.toISOString() ?? null,
            }
          : null,
      });
    } catch (error) {
      console.error("Cush Verify versioned API usage query failed", {
        environment,
        breakdown,
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(503).json({ code: "USAGE_UNAVAILABLE", error: "API usage is temporarily unavailable." });
    }
  }

  app.get("/api/v1/usage", requireCushVerifyApiScope("usage:read"), (req: InstitutionalRequest, res) =>
    sendVersionedUsage(req, res, "production", false));
  app.get("/api/v1/usage/breakdown", requireCushVerifyApiScope("usage:read"), (req: InstitutionalRequest, res) =>
    sendVersionedUsage(req, res, "production", true));
  app.get("/api/v1/sandbox/usage", requireCushVerifyApiScope("sandbox:simulate"), (req: InstitutionalRequest, res) =>
    sendVersionedUsage(req, res, "sandbox", false));

  app.get("/api/v1/sandbox/status", requireCushVerifyApiScope("sandbox:simulate"), (_req, res) => {
    return res.json({
      environment: "sandbox",
      liveData: false,
      reportCreditsUsed: 0,
      note: "Sandbox responses are simulated and do not access Passport records or affect billing.",
    });
  });

  app.post("/api/v1/sandbox/discovery", requireCushVerifyApiScope("sandbox:simulate"), (req, res) => {
    const parsed = sandboxDiscoverySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Choose a supported sandbox discovery scenario." });
    return res.json(parsed.data.scenario === "match"
      ? {
          environment: "sandbox",
          simulated: true,
          matchFound: true,
          passportReference: "sandbox-passport-0001",
          displayLabel: "Synthetic test profile",
          financialInformation: null,
        }
      : {
          environment: "sandbox",
          simulated: true,
          matchFound: false,
          passportReference: null,
          displayLabel: null,
          financialInformation: null,
        });
  });

  app.post("/api/v1/sandbox/report-workflow", requireCushVerifyApiScope("sandbox:simulate"), (req, res) => {
    const parsed = sandboxWorkflowSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Choose a supported sandbox workflow scenario." });
    const requestId = `sandbox-${randomUUID()}`;
    const scenario = parsed.data.scenario;
    if (scenario === "unauthorized") {
      return res.status(403).json({ environment: "sandbox", simulated: true, code: "CONSENT_REQUIRED", requestId, creditsUsed: 0 });
    }
    if (scenario === "expired") {
      return res.status(410).json({ environment: "sandbox", simulated: true, code: "CONSENT_EXPIRED", requestId, creditsUsed: 0 });
    }
    if (scenario === "declined") {
      return res.json({ environment: "sandbox", simulated: true, requestId, status: "declined", report: null, creditsUsed: 0 });
    }
    if (scenario === "rate_limited") {
      return res.status(429).json({ environment: "sandbox", simulated: true, code: "RATE_LIMITED", requestId, creditsUsed: 0 });
    }
    if (scenario === "failed_report") {
      return res.status(503).json({ environment: "sandbox", simulated: true, code: "REPORT_GENERATION_FAILED", requestId, creditsUsed: 0 });
    }
    return res.json({
      environment: "sandbox",
      simulated: true,
      requestId,
      status: scenario === "authorized" ? "authorized" : "awaiting_consent",
      consent: scenario === "authorized" ? "approved" : null,
      report: scenario === "authorized"
        ? {
            simulated: true,
            categories: ["assessment_status"],
            evidenceClassification: "synthetic_test_data",
            generatedAt: new Date().toISOString(),
          }
        : null,
      creditsUsed: 0,
      note: "This sample does not create a real request, contact an individual, access Passport data, or change billing.",
    });
  });
}
