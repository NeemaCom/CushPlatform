import type { Express, NextFunction, Request, Response } from "express";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, gt, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import {
  cushVerifyDiscoverySearches,
  cushVerifyInstitutions,
  cushVerifyReportConsents,
  cushVerifyReportDeliveries,
  cushVerifyReportEvents,
  cushVerifyReportRequests,
  cushVerifyApiUsage,
} from "@shared/schema";
import {
  cushVerifyReportDecisionSchema,
  cushVerifyReportRequestSchema,
  type CushVerifyReportCategory,
} from "@shared/cush-verify-reports";
import { cushVerifyApiReportHistoryQuerySchema } from "@shared/cush-verify-api";
import { isAuthenticated, type AuthenticatedRequest } from "./auth";
import { cushVerifyDb } from "./db";
import {
  getInstitutionalWorkspaceState,
  isInstitutionalAuthenticated,
  requireApprovedInstitution,
  type InstitutionalRequest,
} from "./cush-verify-institutional-routes";
import { requireCushVerifyApiScope } from "./cush-verify-api-key-service";
import { authRateLimit } from "./security";
import { isV2SchemaMissing } from "./cush-score-v2";
import {
  findEligiblePassportByEmail,
  getConsentBoundPassportReportData,
  getEligiblePassportUserById,
} from "./cush-verify-passport-data";
import {
  buildCushVerifyReport,
  checkCushVerifyReportAuthorization,
  getCushVerifyReportDigest,
  maskCushVerifyRecipientEmail,
} from "./cush-verify-report-service";
import { sendCushVerifyConsentRequestEmail } from "./cush-verify-consent-email";
import {
  allocateDueAnnualCredits,
  CushVerifyBillingEntitlementError,
  processPendingCushVerifyBillingOutbox,
  refreshBillingSubscriptionStatus,
  recordReportCreditUse,
} from "./cush-verify-billing-service";
import { enqueueCushVerifyWebhookEvent } from "./cush-verify-webhooks";

const DAY_MS = 24 * 60 * 60 * 1000;
const REQUEST_TTL_MS = 14 * DAY_MS;
const MAX_OPEN_REQUESTS_PER_INSTITUTION = 100;
const discoverySchema = z.object({
  identifierType: z.enum(["email", "reference_code"]),
  identifier: z.string().trim().min(3).max(254),
}).strict();

function digestValue(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Cush Verify identifier hashing is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function invitationDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function passportAppOrigin(): string {
  const configured = process.env.CUSH_PASSPORT_APP_URL || "https://app.we-cush.com";
  const url = new URL(configured);
  const isLocalDevelopment = process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" && url.hostname === "localhost";
  if (
    (url.protocol !== "https:" && !isLocalDevelopment) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Cush Passport invitation origin is not permitted.");
  }
  return url.origin;
}

function reportSchemaUnavailable(error: unknown, res: Response): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && typeof current === "object" && current !== null; depth += 1) {
    if ("code" in current && (current as { code?: string }).code === "42P01") {
      res.status(503).json({
        code: "CUSH_VERIFY_REPORT_SCHEMA_REQUIRED",
        error: "Cush Verify report storage is not ready. Apply the authorized reports and workspace MVP migrations first.",
      });
      return true;
    }
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

function effectiveStatus(request: {
  status: "awaiting_consent" | "authorized" | "declined" | "revoked" | "expired";
  requestExpiresAt: Date;
  authorizationExpiresAt: Date | null;
}, now: Date) {
  if (request.status === "awaiting_consent" && request.requestExpiresAt <= now) return "expired" as const;
  if (
    request.status === "authorized" &&
    (!request.authorizationExpiresAt || request.authorizationExpiresAt <= now)
  ) return "expired" as const;
  return request.status;
}

async function getWorkspaceActor(req: InstitutionalRequest) {
  if (!req.cushVerifyInstitutionalUserId) return null;
  const membership = await getInstitutionalWorkspaceState(req.cushVerifyInstitutionalUserId);
  if (
    !membership ||
    membership.membershipStatus !== "active" ||
    membership.institutionStatus !== "approved" ||
    membership.applicationStatus !== "approved"
  ) return null;
  return {
    institutionalUserId: req.cushVerifyInstitutionalUserId,
    institutionId: membership.institutionId,
    role: membership.role,
    institutionName: membership.tradingName || membership.institutionName,
  };
}

function canManageRequests(role: string) {
  return role === "organisation_admin" || role === "analyst";
}

function isCategorySubset(
  selected: CushVerifyReportCategory[],
  allowed: CushVerifyReportCategory[],
) {
  return selected.every((category) => allowed.includes(category));
}

function missingReportSchema(res: Response) {
  return res.status(503).json({
    code: "CUSH_VERIFY_REPORT_SCHEMA_REQUIRED",
    error: "Cush Verify report storage is not ready. Apply the authorized reports and workspace MVP migrations first.",
  });
}

function billingSchemaUnavailable(error: unknown, res: Response): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && typeof current === "object" && current !== null; depth += 1) {
    const record = current as { code?: string; message?: string; cause?: unknown };
    if (
      (record.code === "42P01" || record.code === "42703") &&
      /cush_verify_(billing|subscriptions|credit_ledger)/i.test(record.message ?? "")
    ) {
      res.status(503).json({
        code: "CUSH_VERIFY_BILLING_SCHEMA_REQUIRED",
        error: "Cush Verify billing storage is not ready. Apply the billing migration first.",
      });
      return true;
    }
    current = record.cause ?? null;
  }
  return false;
}

function reportRouteRateLimit(req: Request, res: Response, next: NextFunction) {
  if (req.originalUrl.startsWith("/api/v1/")) {
    next();
    return;
  }
  return authRateLimit(req, res, next);
}

export function registerCushVerifyReportRoutes(app: Express): void {
  app.post(
    ["/api/verify/passport-discovery", "/api/v1/verify/passport-discovery"],
    reportRouteRateLimit,
    requireCushVerifyApiScope("passport:discover"),
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = discoverySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Enter a valid email address or report reference." });

      try {
        const actor = await getWorkspaceActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!canManageRequests(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators and analysts can search for Passport holders." });
        }
        const identifier = parsed.data.identifierType === "email"
          ? parsed.data.identifier.toLowerCase()
          : parsed.data.identifier.toLowerCase();
        let found = false;
        let recipientLabel: string | null = null;

        if (parsed.data.identifierType === "email") {
          const normalizedEmail = z.string().email().safeParse(identifier);
          if (!normalizedEmail.success) return res.status(400).json({ error: "Enter a valid email address." });
          const target = await findEligiblePassportByEmail(identifier);
          found = Boolean(target);
          if (target) recipientLabel = maskCushVerifyRecipientEmail(target.email);
        } else {
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)) {
            return res.status(400).json({ error: "Enter a valid report reference." });
          }
          const [request] = await cushVerifyDb.select({
            recipientLabel: cushVerifyReportRequests.recipientLabel,
          })
            .from(cushVerifyReportRequests)
            .where(and(
              eq(cushVerifyReportRequests.id, identifier),
              eq(cushVerifyReportRequests.institutionId, actor.institutionId),
            ))
            .limit(1);
          found = Boolean(request);
          recipientLabel = request?.recipientLabel ?? null;
        }

        await cushVerifyDb.insert(cushVerifyDiscoverySearches).values({
          institutionId: actor.institutionId,
          institutionalUserId: actor.institutionalUserId,
          identifierType: parsed.data.identifierType,
          identifierDigest: digestValue(`${parsed.data.identifierType}:${identifier}`),
          matchFound: found,
        });
        return res.json({
          matchFound: found,
          recipientLabel,
          message: found
            ? "A minimal Passport match is available. No financial details are exposed."
            : "No eligible match was found. You can still send a secure Passport invitation.",
        });
      } catch (error) {
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify Passport discovery failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Passport discovery could not be completed." });
      }
    },
  );

  app.post(
    ["/api/verify/report-requests", "/api/v1/verify/report-requests"],
    reportRouteRateLimit,
    requireCushVerifyApiScope("reports:request"),
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = cushVerifyReportRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Check the recipient, stated purpose, report categories, and authorization period." });
      }

      try {
        const actor = await getWorkspaceActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership cannot create requests." });
        if (!canManageRequests(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators and analysts can request reports." });
        }

        const normalizedEmail = parsed.data.recipientEmail.trim().toLowerCase();
        const targetUser = await findEligiblePassportByEmail(normalizedEmail);

        const now = new Date();
        const pending = await cushVerifyDb.select({ id: cushVerifyReportRequests.id })
          .from(cushVerifyReportRequests)
          .where(and(
            eq(cushVerifyReportRequests.institutionId, actor.institutionId),
            eq(cushVerifyReportRequests.status, "awaiting_consent"),
            gt(cushVerifyReportRequests.requestExpiresAt, now),
          ))
          .limit(MAX_OPEN_REQUESTS_PER_INSTITUTION);
        if (pending.length >= MAX_OPEN_REQUESTS_PER_INSTITUTION) {
          return res.status(429).json({ error: "This organisation has reached its open request limit." });
        }

        const requestId = randomUUID();
        const invitationToken = randomBytes(32).toString("hex");
        const recipientLabel = maskCushVerifyRecipientEmail(normalizedEmail);
        const invitationExpiresAt = new Date(now.getTime() + REQUEST_TTL_MS);
        await cushVerifyDb.transaction(async (tx) => {
          await tx.insert(cushVerifyReportRequests).values({
            id: requestId,
            institutionId: actor.institutionId,
            requestedByInstitutionalUserId: actor.institutionalUserId,
            targetUserId: targetUser?.id ?? null,
            recipientEmailHash: digestValue(`email:${normalizedEmail}`),
            invitationTokenHash: invitationDigest(invitationToken),
            invitationExpiresAt,
            recipientLabel,
            purpose: parsed.data.purpose,
            requestedCategories: parsed.data.categories,
            requestedAuthorizationDays: parsed.data.authorizationDays,
            status: "awaiting_consent",
            requestExpiresAt: invitationExpiresAt,
            createdAt: now,
            updatedAt: now,
          });
          await tx.insert(cushVerifyReportEvents).values({
            requestId,
            eventType: "request_created",
            actorType: "institutional_user",
            actorInstitutionalUserId: actor.institutionalUserId,
            details: {
              categories: parsed.data.categories,
              requestedAuthorizationDays: parsed.data.authorizationDays,
            },
            createdAt: now,
          });
          await enqueueCushVerifyWebhookEvent(tx, {
            institutionId: actor.institutionId,
            eventType: "report.requested",
            idempotencyKey: `report-request:${requestId}`,
            data: { requestId, status: "awaiting_consent" },
            createdAt: now,
          });
        });

        const consentUrl = new URL("/passport/consent-invite", passportAppOrigin());
        consentUrl.searchParams.set("token", invitationToken);
        const emailResult = await sendCushVerifyConsentRequestEmail({
          email: normalizedEmail,
          institutionName: actor.institutionName,
          consentUrl: consentUrl.toString(),
          requestId,
        });
        return res.status(201).json({
          success: true,
          requestId,
          invitationEmailStatus: emailResult.status,
          invitationUrl: consentUrl.toString(),
          message: emailResult.status === "sent"
            ? "The request was saved and a secure review link was emailed. No financial information is shared unless the individual approves."
            : "The request was saved, but the review email could not be sent. Share the secure link below with the intended recipient; account matching is not disclosed.",
        });
      } catch (error) {
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify report request creation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "The report request could not be saved." });
      }
    },
  );

  app.get(
    ["/api/verify/report-requests", "/api/v1/verify/report-requests"],
    requireCushVerifyApiScope("reports:read"),
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      try {
        const actor = await getWorkspaceActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });

        const rows = await cushVerifyDb.select()
          .from(cushVerifyReportRequests)
          .where(eq(cushVerifyReportRequests.institutionId, actor.institutionId))
          .orderBy(desc(cushVerifyReportRequests.createdAt))
          .limit(100);
        const requestIds = rows.map((row) => row.id);
        const deliveries = requestIds.length
          ? await cushVerifyDb.select({
              id: cushVerifyReportDeliveries.id,
              requestId: cushVerifyReportDeliveries.requestId,
              deliveredAt: cushVerifyReportDeliveries.deliveredAt,
            })
            .from(cushVerifyReportDeliveries)
            .where(inArray(cushVerifyReportDeliveries.requestId, requestIds))
            .orderBy(desc(cushVerifyReportDeliveries.deliveredAt))
          : [];
        const deliveriesByRequest = new Map<string, typeof deliveries>();
        for (const delivery of deliveries) {
          const current = deliveriesByRequest.get(delivery.requestId) ?? [];
          current.push(delivery);
          deliveriesByRequest.set(delivery.requestId, current);
        }
        const now = new Date();

        return res.json({
          requests: rows.map((row) => {
            const requestDeliveries = deliveriesByRequest.get(row.id) ?? [];
            return {
              id: row.id,
              recipientLabel: row.recipientLabel,
              purpose: row.purpose,
              requestedCategories: row.requestedCategories,
              requestedAuthorizationDays: row.requestedAuthorizationDays,
              status: effectiveStatus(row, now),
              requestExpiresAt: row.requestExpiresAt.toISOString(),
              authorizationExpiresAt: row.authorizationExpiresAt?.toISOString() ?? null,
              createdAt: row.createdAt.toISOString(),
              lastReportDeliveredAt: requestDeliveries[0]?.deliveredAt.toISOString() ?? null,
              deliveredReportCount: requestDeliveries.length,
            };
          }),
        });
      } catch (error) {
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify report request listing failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Report request history could not be loaded." });
      }
    },
  );

  app.get(
    "/api/v1/verify/report-requests/:requestId",
    requireCushVerifyApiScope("reports:read"),
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsedId = z.string().uuid().safeParse(req.params.requestId);
      if (!parsedId.success) return res.status(404).json({ code: "REQUEST_NOT_FOUND", error: "Report request not found." });
      try {
        const actor = await getWorkspaceActor(req);
        if (!actor || !canManageRequests(actor.role)) {
          return res.status(403).json({ error: "Your organisation role cannot view report requests." });
        }
        const [request] = await cushVerifyDb.select()
          .from(cushVerifyReportRequests)
          .where(and(
            eq(cushVerifyReportRequests.id, parsedId.data),
            eq(cushVerifyReportRequests.institutionId, actor.institutionId),
          ))
          .limit(1);
        if (!request) return res.status(404).json({ code: "REQUEST_NOT_FOUND", error: "Report request not found." });

        const [consent] = request.targetUserId
          ? await cushVerifyDb.select()
              .from(cushVerifyReportConsents)
              .where(and(
                eq(cushVerifyReportConsents.requestId, request.id),
                eq(cushVerifyReportConsents.userId, request.targetUserId),
              ))
              .limit(1)
          : [];
        const now = new Date();
        const authorization = checkCushVerifyReportAuthorization({
          requestInstitutionId: request.institutionId,
          expectedInstitutionId: actor.institutionId,
          targetUserId: request.targetUserId,
          consentUserId: consent?.userId ?? null,
          requestStatus: request.status,
          consentStatus: consent?.status ?? null,
          requestedCategories: request.requestedCategories,
          approvedCategories: consent?.approvedCategories ?? [],
          requestExpiresAt: request.requestExpiresAt,
          authorizationExpiresAt: request.authorizationExpiresAt,
          consentExpiresAt: consent?.expiresAt ?? null,
          now,
        });
        const deliveries = authorization.allowed
          ? await cushVerifyDb.select({
              id: cushVerifyReportDeliveries.id,
              categories: cushVerifyReportDeliveries.categories,
              deliveredAt: cushVerifyReportDeliveries.deliveredAt,
            }).from(cushVerifyReportDeliveries)
              .where(eq(cushVerifyReportDeliveries.requestId, request.id))
              .orderBy(desc(cushVerifyReportDeliveries.deliveredAt))
              .limit(100)
          : [];
        const currentStatus = effectiveStatus(request, now);
        return res.json({
          request: {
            id: request.id,
            status: currentStatus,
            purpose: request.purpose,
            recipientLabel: request.recipientLabel,
            requestedCategories: request.requestedCategories,
            requestedAuthorizationDays: request.requestedAuthorizationDays,
            requestExpiresAt: request.requestExpiresAt.toISOString(),
            authorizationExpiresAt: request.authorizationExpiresAt?.toISOString() ?? null,
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
          },
          consent: {
            status: consent?.status ?? "pending",
            approvedCategories: authorization.allowed ? authorization.categories : [],
            approvedAt: consent?.approvedAt?.toISOString() ?? null,
            expiresAt: consent?.expiresAt?.toISOString() ?? null,
            accessAvailable: authorization.allowed,
          },
          reports: authorization.allowed
            ? deliveries.map((delivery) => ({
                id: String(delivery.id),
                categories: delivery.categories,
                deliveredAt: delivery.deliveredAt.toISOString(),
              }))
            : [],
        });
      } catch (error) {
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify report request status lookup failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ code: "REQUEST_STATUS_UNAVAILABLE", error: "Report request status is temporarily unavailable." });
      }
    },
  );

  app.get(
    "/api/v1/reports",
    requireCushVerifyApiScope("reports:read"),
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = cushVerifyApiReportHistoryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ code: "INVALID_QUERY", error: "Choose a valid report-history date range and page." });
      }
      try {
        const actor = await getWorkspaceActor(req);
        if (!actor || !canManageRequests(actor.role)) {
          return res.status(403).json({ error: "Your organisation role cannot view reports." });
        }
        const now = new Date();
        const to = parsed.data.to ? new Date(parsed.data.to) : now;
        const from = parsed.data.from
          ? new Date(parsed.data.from)
          : parsed.data.to
            ? new Date(to.getTime() - 90 * DAY_MS)
            : new Date(now.getTime() - 30 * DAY_MS);
        const rows = await cushVerifyDb.select({
          id: cushVerifyReportDeliveries.id,
          requestId: cushVerifyReportRequests.id,
          purpose: cushVerifyReportRequests.purpose,
          categories: cushVerifyReportDeliveries.categories,
          deliveredAt: cushVerifyReportDeliveries.deliveredAt,
          authorizationExpiresAt: cushVerifyReportRequests.authorizationExpiresAt,
          consentExpiresAt: cushVerifyReportConsents.expiresAt,
        }).from(cushVerifyReportDeliveries)
          .innerJoin(
            cushVerifyReportRequests,
            eq(cushVerifyReportRequests.id, cushVerifyReportDeliveries.requestId),
          )
          .innerJoin(
            cushVerifyReportConsents,
            and(
              eq(cushVerifyReportConsents.requestId, cushVerifyReportRequests.id),
              eq(cushVerifyReportConsents.userId, cushVerifyReportRequests.targetUserId),
            ),
          )
          .where(and(
            eq(cushVerifyReportRequests.institutionId, actor.institutionId),
            eq(cushVerifyReportRequests.status, "authorized"),
            eq(cushVerifyReportConsents.status, "approved"),
            gt(cushVerifyReportRequests.authorizationExpiresAt, now),
            gt(cushVerifyReportConsents.expiresAt, now),
            gte(cushVerifyReportDeliveries.deliveredAt, from),
            lte(cushVerifyReportDeliveries.deliveredAt, to),
          ))
          .orderBy(desc(cushVerifyReportDeliveries.deliveredAt), desc(cushVerifyReportDeliveries.id))
          .offset(parsed.data.offset)
          .limit(parsed.data.limit + 1);
        const hasMore = rows.length > parsed.data.limit;
        return res.json({
          range: { from: from.toISOString(), to: to.toISOString() },
          page: { limit: parsed.data.limit, offset: parsed.data.offset, hasMore },
          reports: rows.slice(0, parsed.data.limit).map((row) => ({
            id: String(row.id),
            requestId: row.requestId,
            purpose: row.purpose,
            categories: row.categories,
            deliveredAt: row.deliveredAt.toISOString(),
            authorizationExpiresAt: row.authorizationExpiresAt?.toISOString() ?? null,
            consentExpiresAt: row.consentExpiresAt?.toISOString() ?? null,
            consentReference: row.requestId,
            accessAvailable: true,
          })),
        });
      } catch (error) {
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify report history query failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ code: "REPORT_HISTORY_UNAVAILABLE", error: "Report history is temporarily unavailable." });
      }
    },
  );

  app.get(
    "/api/v1/reports/:reportId",
    requireCushVerifyApiScope("reports:read"),
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const reportId = Number(req.params.reportId);
      if (!Number.isSafeInteger(reportId) || reportId <= 0) {
        return res.status(404).json({ code: "REPORT_NOT_FOUND", error: "Report not found." });
      }
      try {
        const actor = await getWorkspaceActor(req);
        if (!actor || !canManageRequests(actor.role)) {
          return res.status(403).json({ error: "Your organisation role cannot retrieve reports." });
        }
        const [stored] = await cushVerifyDb.select({
          delivery: cushVerifyReportDeliveries,
          request: cushVerifyReportRequests,
        }).from(cushVerifyReportDeliveries)
          .innerJoin(
            cushVerifyReportRequests,
            eq(cushVerifyReportRequests.id, cushVerifyReportDeliveries.requestId),
          )
          .where(and(
            eq(cushVerifyReportDeliveries.id, reportId),
            eq(cushVerifyReportRequests.institutionId, actor.institutionId),
          ))
          .limit(1);
        if (!stored) return res.status(404).json({ code: "REPORT_NOT_FOUND", error: "Report not found." });
        const request = stored.request;
        const [consent] = request.targetUserId
          ? await cushVerifyDb.select()
              .from(cushVerifyReportConsents)
              .where(and(
                eq(cushVerifyReportConsents.requestId, request.id),
                eq(cushVerifyReportConsents.userId, request.targetUserId),
              ))
              .limit(1)
          : [];
        const now = new Date();
        const authorization = checkCushVerifyReportAuthorization({
          requestInstitutionId: request.institutionId,
          expectedInstitutionId: actor.institutionId,
          targetUserId: request.targetUserId,
          consentUserId: consent?.userId ?? null,
          requestStatus: request.status,
          consentStatus: consent?.status ?? null,
          requestedCategories: request.requestedCategories,
          approvedCategories: consent?.approvedCategories ?? [],
          requestExpiresAt: request.requestExpiresAt,
          authorizationExpiresAt: request.authorizationExpiresAt,
          consentExpiresAt: consent?.expiresAt ?? null,
          now,
        });
        if (!authorization.allowed || !request.targetUserId) {
          return res.status(403).json({ code: "CONSENT_REQUIRED", error: "Current consent is not available for this report." });
        }
        const categories = stored.delivery.categories as CushVerifyReportCategory[];
        if (!isCategorySubset(categories, authorization.categories)) {
          return res.status(403).json({ code: "CONSENT_SCOPE_CHANGED", error: "Current consent does not cover this report." });
        }
        const passportData = await getConsentBoundPassportReportData(request.targetUserId, categories);
        const report = buildCushVerifyReport(
          passportData.assessment.calculation,
          categories,
          now,
          passportData.assessment,
          passportData.financialRecords.map((record) => ({
            recordType: record.recordType,
            activityDate: record.activityDate,
            countryCode: record.countryCode,
            currencyCode: record.currencyCode,
            evidenceStatus: record.evidenceStatus,
            details: record.details,
          })),
        );
        if (getCushVerifyReportDigest(report) !== stored.delivery.reportDigest) {
          return res.status(410).json({
            code: "REPORT_SNAPSHOT_UNAVAILABLE",
            error: "This historical report snapshot is no longer available. Request a fresh report; it will be charged only if successfully delivered.",
          });
        }
        await cushVerifyDb.transaction(async (tx) => {
          await tx.insert(cushVerifyReportEvents).values({
            requestId: request.id,
            eventType: "report_accessed",
            actorType: "institutional_user",
            actorInstitutionalUserId: actor.institutionalUserId,
            details: {
              reportDeliveryId: reportId,
              reportDigest: stored.delivery.reportDigest,
              categories,
            },
            createdAt: now,
          });
          await enqueueCushVerifyWebhookEvent(tx, {
            institutionId: actor.institutionId,
            eventType: "report.accessed",
            idempotencyKey: `report-access:${randomUUID()}`,
            data: { requestId: request.id, reportDeliveryId: reportId, status: "accessed" },
            createdAt: now,
          });
        });
        return res.json({
          report,
          delivery: {
            id: String(stored.delivery.id),
            deliveredAt: stored.delivery.deliveredAt.toISOString(),
            consentReference: request.id,
            authorizationExpiresAt: request.authorizationExpiresAt?.toISOString() ?? null,
            billing: { charged: false, type: "none", reason: "previously_delivered" },
          },
        });
      } catch (error) {
        if (isV2SchemaMissing(error)) {
          return res.status(503).json({
            code: "CUSH_VERIFY_REPORT_DATA_UNAVAILABLE",
            error: "The data needed to retrieve this report is not available right now.",
          });
        }
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify report retrieval failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ code: "REPORT_RETRIEVAL_UNAVAILABLE", error: "Report retrieval is temporarily unavailable." });
      }
    },
  );

  app.get("/api/passport/verification-requests", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const now = new Date();
      const rows = await cushVerifyDb.select({
        id: cushVerifyReportRequests.id,
        purpose: cushVerifyReportRequests.purpose,
        requestedCategories: cushVerifyReportRequests.requestedCategories,
        requestedAuthorizationDays: cushVerifyReportRequests.requestedAuthorizationDays,
        status: cushVerifyReportRequests.status,
        requestExpiresAt: cushVerifyReportRequests.requestExpiresAt,
        authorizationExpiresAt: cushVerifyReportRequests.authorizationExpiresAt,
        createdAt: cushVerifyReportRequests.createdAt,
        institutionName: cushVerifyInstitutions.legalName,
        tradingName: cushVerifyInstitutions.tradingName,
      })
        .from(cushVerifyReportRequests)
        .innerJoin(cushVerifyInstitutions, eq(cushVerifyInstitutions.id, cushVerifyReportRequests.institutionId))
        .where(eq(cushVerifyReportRequests.targetUserId, req.userId!))
        .orderBy(desc(cushVerifyReportRequests.createdAt))
        .limit(30);

      return res.json({
        requests: rows.map((row) => ({
          id: row.id,
          institutionName: row.tradingName || row.institutionName,
          purpose: row.purpose,
          requestedCategories: row.requestedCategories,
          requestedAuthorizationDays: row.requestedAuthorizationDays,
          status: effectiveStatus(row, now),
          requestExpiresAt: row.requestExpiresAt.toISOString(),
          authorizationExpiresAt: row.authorizationExpiresAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      if (reportSchemaUnavailable(error, res)) return;
      console.error("Cush Verify personal request inbox failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(500).json({ error: "Cush Verify requests could not be loaded." });
    }
  });

  app.post(
    "/api/passport/verification-invitations/claim",
    authRateLimit,
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      const token = typeof req.body?.token === "string" ? req.body.token : "";
      if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ error: "The invitation link is invalid." });
      try {
        const passportUser = await getEligiblePassportUserById(req.userId!);
        if (!passportUser?.isActive || !passportUser.isEmailVerified) {
          return res.status(403).json({ error: "Sign in with the verified email address that received the invitation." });
        }
        const emailDigest = digestValue(`email:${passportUser.email.trim().toLowerCase()}`);
        const now = new Date();
        const result = await cushVerifyDb.transaction(async (tx) => {
          const [request] = await tx.select()
            .from(cushVerifyReportRequests)
            .where(and(
              eq(cushVerifyReportRequests.invitationTokenHash, invitationDigest(token)),
              eq(cushVerifyReportRequests.recipientEmailHash, emailDigest),
              gt(cushVerifyReportRequests.invitationExpiresAt, now),
            ))
            .for("update")
            .limit(1);
          if (!request) return "not_found" as const;
          if (request.targetUserId && request.targetUserId !== passportUser.id) return "not_found" as const;
          if (request.status !== "awaiting_consent" || request.requestExpiresAt <= now) return "expired" as const;

          await tx.update(cushVerifyReportRequests).set({
            targetUserId: passportUser.id,
            invitationTokenHash: null,
            updatedAt: now,
          }).where(eq(cushVerifyReportRequests.id, request.id));
          await tx.insert(cushVerifyReportEvents).values({
            requestId: request.id,
            eventType: "request_linked",
            actorType: "passport_user",
            actorUserId: passportUser.id,
            details: {},
            createdAt: now,
          });
          await enqueueCushVerifyWebhookEvent(tx, {
            institutionId: request.institutionId,
            eventType: "request.linked",
            idempotencyKey: `request-linked:${request.id}:${passportUser.id}`,
            data: { requestId: request.id, status: "awaiting_consent" },
            createdAt: now,
          });
          return "linked" as const;
        });
        if (result === "not_found") {
          return res.status(404).json({ error: "This invitation is unavailable for the signed-in account." });
        }
        if (result === "expired") return res.status(410).json({ error: "This invitation has expired." });
        return res.json({ success: true });
      } catch (error) {
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify Passport invitation claim failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "The invitation could not be linked to this Passport." });
      }
    },
  );

  app.post(
    "/api/passport/verification-requests/:requestId/decision",
    authRateLimit,
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      const parsedId = parseRequestId(req.params.requestId);
      const parsedDecision = cushVerifyReportDecisionSchema.safeParse(req.body);
      if (!parsedId || !parsedDecision.success) {
        return res.status(400).json({ error: "The consent decision is invalid." });
      }

      const now = new Date();
      try {
        const result = await cushVerifyDb.transaction(async (tx) => {
          const [request] = await tx.select()
            .from(cushVerifyReportRequests)
            .where(and(
              eq(cushVerifyReportRequests.id, parsedId),
              eq(cushVerifyReportRequests.targetUserId, req.userId!),
            ))
            .for("update")
            .limit(1);
          if (!request) return { status: 404 as const };
          if (request.status !== "awaiting_consent" || request.requestExpiresAt <= now) {
            return { status: 409 as const };
          }

          const decision = parsedDecision.data;
          if (decision.decision === "approve") {
            if (
              decision.authorizationDays > request.requestedAuthorizationDays ||
              !isCategorySubset(decision.categories, request.requestedCategories)
            ) return { status: 400 as const };

            const expiresAt = new Date(now.getTime() + decision.authorizationDays * DAY_MS);
            await tx.insert(cushVerifyReportConsents).values({
              requestId: request.id,
              userId: req.userId!,
              status: "approved",
              approvedCategories: decision.categories,
              approvedAt: now,
              expiresAt,
              createdAt: now,
              updatedAt: now,
            });
            await tx.update(cushVerifyReportRequests).set({
              status: "authorized",
              authorizationExpiresAt: expiresAt,
              updatedAt: now,
            }).where(eq(cushVerifyReportRequests.id, request.id));
            await tx.insert(cushVerifyReportEvents).values({
              requestId: request.id,
              eventType: "consent_approved",
              actorType: "passport_user",
              actorUserId: req.userId!,
              details: { categories: decision.categories, authorizationDays: decision.authorizationDays },
              createdAt: now,
            });
            await enqueueCushVerifyWebhookEvent(tx, {
              institutionId: request.institutionId,
              eventType: "consent.approved",
              idempotencyKey: `consent-decision:${request.id}:approved`,
              data: { requestId: request.id, status: "authorized" },
              createdAt: now,
            });
            return { status: 200 as const, decision: "approved" as const };
          }

          await tx.insert(cushVerifyReportConsents).values({
            requestId: request.id,
            userId: req.userId!,
            status: "declined",
            approvedCategories: [],
            declinedAt: now,
            createdAt: now,
            updatedAt: now,
          });
          await tx.update(cushVerifyReportRequests).set({
            status: "declined",
            authorizationExpiresAt: null,
            updatedAt: now,
          }).where(eq(cushVerifyReportRequests.id, request.id));
          await tx.insert(cushVerifyReportEvents).values({
            requestId: request.id,
            eventType: "consent_declined",
            actorType: "passport_user",
            actorUserId: req.userId!,
            details: {},
            createdAt: now,
          });
          await enqueueCushVerifyWebhookEvent(tx, {
            institutionId: request.institutionId,
            eventType: "consent.declined",
            idempotencyKey: `consent-decision:${request.id}:declined`,
            data: { requestId: request.id, status: "declined" },
            createdAt: now,
          });
          return { status: 200 as const, decision: "declined" as const };
        });

        if (result.status === 404) return res.status(404).json({ error: "Request not found." });
        if (result.status === 409) return res.status(409).json({ error: "This request is no longer awaiting your decision." });
        if (result.status === 400) return res.status(400).json({ error: "Choose only requested categories and a period no longer than the institution requested." });
        return res.json({ success: true, status: result.decision });
      } catch (error) {
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify consent decision failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Your decision could not be saved." });
      }
    },
  );

  app.post(
    "/api/passport/verification-requests/:requestId/revoke",
    authRateLimit,
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      const requestId = parseRequestId(req.params.requestId);
      if (!requestId) return res.status(400).json({ error: "The request ID is invalid." });
      const now = new Date();
      try {
        const result = await cushVerifyDb.transaction(async (tx) => {
          const [request] = await tx.select()
            .from(cushVerifyReportRequests)
            .where(and(
              eq(cushVerifyReportRequests.id, requestId),
              eq(cushVerifyReportRequests.targetUserId, req.userId!),
            ))
            .for("update")
            .limit(1);
          if (!request) return "not_found" as const;
          if (request.status !== "authorized" || !request.authorizationExpiresAt || request.authorizationExpiresAt <= now) {
            return "not_active" as const;
          }
          const [consent] = await tx.select()
            .from(cushVerifyReportConsents)
            .where(and(
              eq(cushVerifyReportConsents.requestId, requestId),
              eq(cushVerifyReportConsents.userId, req.userId!),
              eq(cushVerifyReportConsents.status, "approved"),
            ))
            .for("update")
            .limit(1);
          if (!consent || consent.expiresAt === null || consent.expiresAt <= now) return "not_active" as const;

          await tx.update(cushVerifyReportConsents).set({
            status: "revoked",
            revokedAt: now,
            updatedAt: now,
          }).where(eq(cushVerifyReportConsents.id, consent.id));
          await tx.update(cushVerifyReportRequests).set({
            status: "revoked",
            authorizationExpiresAt: null,
            updatedAt: now,
          }).where(eq(cushVerifyReportRequests.id, requestId));
          await tx.insert(cushVerifyReportEvents).values({
            requestId,
            eventType: "consent_revoked",
            actorType: "passport_user",
            actorUserId: req.userId!,
            details: {},
            createdAt: now,
          });
          await enqueueCushVerifyWebhookEvent(tx, {
            institutionId: request.institutionId,
            eventType: "consent.revoked",
            idempotencyKey: `consent-revoked:${requestId}`,
            data: { requestId, status: "revoked" },
            createdAt: now,
          });
          return "revoked" as const;
        });

        if (result === "not_found") return res.status(404).json({ error: "Request not found." });
        if (result === "not_active") return res.status(409).json({ error: "This authorization is no longer active." });
        return res.json({
          success: true,
          status: "revoked",
          message: "Future report access is blocked. This cannot delete a report the institution already viewed or copied.",
        });
      } catch (error) {
        if (reportSchemaUnavailable(error, res)) return;
        console.error("Cush Verify consent revocation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "The authorization could not be revoked." });
      }
    },
  );

  app.post(
    ["/api/verify/report-requests/:requestId/deliver", "/api/v1/verify/report-requests/:requestId/deliver"],
    reportRouteRateLimit,
    requireCushVerifyApiScope("reports:read"),
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const requestId = parseRequestId(req.params.requestId);
      if (!requestId) return res.status(400).json({ error: "The request ID is invalid." });

      try {
        const actor = await getWorkspaceActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!canManageRequests(actor.role)) {
          return res.status(403).json({ error: "Only organisation administrators and analysts can retrieve reports." });
        }
        const [request] = await cushVerifyDb.select()
          .from(cushVerifyReportRequests)
          .where(eq(cushVerifyReportRequests.id, requestId))
          .limit(1);
        if (!request) return res.status(404).json({ error: "Report request not found." });

        const now = new Date();
        if (request.institutionId !== actor.institutionId) {
          return res.status(404).json({ error: "Report request not found." });
        }
        const [consent] = request.targetUserId
          ? await cushVerifyDb.select()
              .from(cushVerifyReportConsents)
              .where(and(
                eq(cushVerifyReportConsents.requestId, requestId),
                eq(cushVerifyReportConsents.userId, request.targetUserId),
              ))
              .limit(1)
          : [];
        const authorization = checkCushVerifyReportAuthorization({
          requestInstitutionId: request.institutionId,
          expectedInstitutionId: actor.institutionId,
          targetUserId: request.targetUserId,
          consentUserId: consent?.userId ?? null,
          requestStatus: request.status,
          consentStatus: consent?.status ?? null,
          requestedCategories: request.requestedCategories,
          approvedCategories: consent?.approvedCategories ?? [],
          requestExpiresAt: request.requestExpiresAt,
          authorizationExpiresAt: request.authorizationExpiresAt,
          consentExpiresAt: consent?.expiresAt ?? null,
          now,
        });
        if (!authorization.allowed || !request.targetUserId) {
          return res.status(403).json({ error: "There is no active authorization for this report." });
        }
        const reportCategories = authorization.categories;
        await refreshBillingSubscriptionStatus(actor.institutionId);
        await allocateDueAnnualCredits(actor.institutionId);
        const passportData = await getConsentBoundPassportReportData(
          request.targetUserId,
          reportCategories,
        );
        const report = buildCushVerifyReport(
          passportData.assessment.calculation,
          reportCategories,
          now,
          passportData.assessment,
          passportData.financialRecords.map((record) => ({
            recordType: record.recordType,
            activityDate: record.activityDate,
            countryCode: record.countryCode,
            currencyCode: record.currencyCode,
            evidenceStatus: record.evidenceStatus,
            details: record.details,
          })),
        );
        const reportDigest = getCushVerifyReportDigest(report);

        const delivery = await cushVerifyDb.transaction(async (tx) => {
          if (req.cushVerifyApiContext) {
            await tx.select({ id: cushVerifyInstitutions.id })
              .from(cushVerifyInstitutions)
              .where(eq(cushVerifyInstitutions.id, actor.institutionId))
              .for("update")
              .limit(1);
          }
          const [lockedRequest] = await tx.select()
            .from(cushVerifyReportRequests)
            .where(eq(cushVerifyReportRequests.id, requestId))
            .for("update")
            .limit(1);
          const [lockedConsent] = lockedRequest?.targetUserId
            ? await tx.select()
                .from(cushVerifyReportConsents)
                .where(and(
                  eq(cushVerifyReportConsents.requestId, requestId),
                  eq(cushVerifyReportConsents.userId, lockedRequest.targetUserId),
                ))
                .for("update")
                .limit(1)
            : [];
          const finalAuthorization = lockedRequest
            ? checkCushVerifyReportAuthorization({
                requestInstitutionId: lockedRequest.institutionId,
                expectedInstitutionId: actor.institutionId,
                targetUserId: lockedRequest.targetUserId,
                consentUserId: lockedConsent?.userId ?? null,
                requestStatus: lockedRequest.status,
                consentStatus: lockedConsent?.status ?? null,
                requestedCategories: lockedRequest.requestedCategories,
                approvedCategories: lockedConsent?.approvedCategories ?? [],
                requestExpiresAt: lockedRequest.requestExpiresAt,
                authorizationExpiresAt: lockedRequest.authorizationExpiresAt,
                consentExpiresAt: lockedConsent?.expiresAt ?? null,
                now: new Date(),
              })
            : { allowed: false as const, reason: "no_active_consent" as const };
          if (
            !finalAuthorization.allowed ||
            lockedRequest?.targetUserId !== request.targetUserId ||
            !isCategorySubset(reportCategories, finalAuthorization.categories)
          ) return { denied: true as const };

          const [priorDelivery] = await tx.select({
            id: cushVerifyReportDeliveries.id,
          })
            .from(cushVerifyReportDeliveries)
            .where(and(
              eq(cushVerifyReportDeliveries.requestId, requestId),
              eq(cushVerifyReportDeliveries.reportDigest, reportDigest),
            ))
            .limit(1);
          const apiContext = req.cushVerifyApiContext;
          if (
            apiContext &&
            !priorDelivery &&
            apiContext.apiLimits?.monthlyReportLimit !== null &&
            apiContext.apiLimits?.monthlyReportLimit !== undefined &&
            !apiContext.overageConfigured
          ) {
            const [usageCount] = await tx.select({ used: count() })
              .from(cushVerifyApiUsage)
              .where(and(
                eq(cushVerifyApiUsage.institutionId, actor.institutionId),
                eq(cushVerifyApiUsage.environment, "production"),
                eq(cushVerifyApiUsage.billableReport, true),
                gte(cushVerifyApiUsage.createdAt, apiContext.periodStartAt),
              ));
            if (Number(usageCount?.used ?? 0) >= apiContext.apiLimits.monthlyReportLimit) {
              return { monthlyLimitExceeded: true as const };
            }
          }

          const [inserted] = await tx.insert(cushVerifyReportDeliveries).values({
            requestId,
            reportDigest,
            categories: reportCategories,
            deliveredByInstitutionalUserId: actor.institutionalUserId,
          }).onConflictDoNothing().returning({
            id: cushVerifyReportDeliveries.id,
            deliveredAt: cushVerifyReportDeliveries.deliveredAt,
          });
          const existing = inserted ?? (await tx.select({
            id: cushVerifyReportDeliveries.id,
            deliveredAt: cushVerifyReportDeliveries.deliveredAt,
          })
            .from(cushVerifyReportDeliveries)
            .where(and(
              eq(cushVerifyReportDeliveries.requestId, requestId),
              eq(cushVerifyReportDeliveries.reportDigest, reportDigest),
            ))
            .limit(1))[0];
          if (!existing) throw new Error("Idempotent report delivery event was not available.");
          const billing = inserted
            ? await recordReportCreditUse(tx, {
                institutionId: actor.institutionId,
                reportDeliveryId: inserted.id,
                now,
              })
            : { charged: false as const, overageLedgerId: null };
          if (inserted && apiContext) {
            await tx.update(cushVerifyApiUsage)
              .set({ billableReport: billing.charged })
              .where(eq(cushVerifyApiUsage.id, apiContext.usageId));
          }
          await tx.insert(cushVerifyReportEvents).values({
            requestId,
            eventType: inserted ? "report_delivered" : "report_accessed",
            actorType: "institutional_user",
            actorInstitutionalUserId: actor.institutionalUserId,
            details: { reportDigest, categories: reportCategories },
          });
          await enqueueCushVerifyWebhookEvent(tx, {
            institutionId: actor.institutionId,
            environment: apiContext?.environment ?? "production",
            eventType: inserted ? "report.delivered" : "report.accessed",
            idempotencyKey: inserted
              ? `report-delivery:${existing.id}`
              : `report-access:${randomUUID()}`,
            data: {
              requestId,
              reportDeliveryId: existing.id,
              status: inserted ? "delivered" : "accessed",
            },
            createdAt: now,
          });
          if (
            inserted &&
            billing.charged &&
            apiContext?.apiLimits?.monthlyReportLimit &&
            apiContext.apiLimits.monthlyReportLimit > 0
          ) {
            const [periodUsage] = await tx.select({ used: count() })
              .from(cushVerifyApiUsage)
              .where(and(
                eq(cushVerifyApiUsage.institutionId, actor.institutionId),
                eq(cushVerifyApiUsage.environment, apiContext.environment),
                eq(cushVerifyApiUsage.billableReport, true),
                gte(cushVerifyApiUsage.createdAt, apiContext.periodStartAt),
              ));
            const reportsUsed = Number(periodUsage?.used ?? 0);
            const reportLimit = apiContext.apiLimits.monthlyReportLimit;
            for (const thresholdPercentage of [5, 10, 20, 25, 50, 75, 80, 90, 95, 100]) {
              const thresholdCount = Math.ceil(reportLimit * thresholdPercentage / 100);
              if (reportsUsed < thresholdCount) continue;
              await enqueueCushVerifyWebhookEvent(tx, {
                institutionId: actor.institutionId,
                environment: apiContext.environment,
                eventType: "usage.threshold_reached",
                idempotencyKey: `usage-threshold:${apiContext.environment}:${apiContext.periodStartAt.toISOString()}:${thresholdPercentage}`,
                data: {
                  metric: "monthly_reports",
                  thresholdPercentage,
                  reportsUsed,
                  reportLimit,
                  periodStartAt: apiContext.periodStartAt.toISOString(),
                },
                createdAt: now,
              });
            }
          }
          return { ...existing, denied: false as const, newDeliveryEvent: Boolean(inserted), billing };
        });

        if ("monthlyLimitExceeded" in delivery) {
          return res.status(429).json({
            code: "CUSH_VERIFY_MONTHLY_REPORT_LIMIT",
            error: "The configured monthly API report limit has been reached. Contact Cush about the plan’s overage option.",
          });
        }
        if (delivery.denied) return res.status(403).json({ error: "There is no active authorization for this report." });
        if (delivery.billing.overageLedgerId !== null) {
          res.once("finish", () => {
            void processPendingCushVerifyBillingOutbox(1).catch((error) => {
              console.error("Cush Verify report overage posting failed", {
                errorType: error instanceof Error ? error.name : "UnknownError",
              });
            });
          });
        }
        return res.json({
          report,
          delivery: {
            id: delivery.id,
            deliveredAt: delivery.deliveredAt.toISOString(),
            consentReference: requestId,
            consentApprovedAt: consent.approvedAt?.toISOString() ?? null,
            authorizationExpiresAt: request.authorizationExpiresAt?.toISOString() ?? null,
            newDeliveryEvent: delivery.newDeliveryEvent,
            billing: {
              charged: delivery.billing.charged,
              type: delivery.billing.overageLedgerId !== null
                ? "overage"
                : delivery.billing.charged
                  ? "report_credit"
                  : "none",
            },
          },
        });
      } catch (error) {
        if (billingSchemaUnavailable(error, res)) return;
        if (error instanceof CushVerifyBillingEntitlementError) {
          const status = error.code === "BILLING_NOT_CONFIGURED" ? 503 : 402;
          return res.status(status).json({
            code: `CUSH_VERIFY_${error.code}`,
            error: error.message,
          });
        }
        if (reportSchemaUnavailable(error, res)) return;
        if (isV2SchemaMissing(error)) {
          return res.status(503).json({
            code: "CUSH_VERIFY_REPORT_DATA_UNAVAILABLE",
            error: "The assessment data needed for this report is not available yet.",
          });
        }
        console.error("Cush Verify report delivery failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "The report could not be retrieved." });
      }
    },
  );
}

function parseRequestId(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}
