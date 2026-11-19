import { createHash, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  cushVerifyApiKeys,
  cushVerifyApiAccessRequests,
  cushVerifyApiUsage,
  cushVerifyInstitutions,
  cushVerifyInstitutionalUsers,
  cushVerifyPricingPlans,
  cushVerifyPricingVersions,
  cushVerifySubscriptions,
} from "@shared/schema";
import {
  CUSH_VERIFY_API_SCOPES,
  type CushVerifyApiKeyEnvironment,
  type CushVerifyApiRequestContext,
  type CushVerifyApiScope,
} from "@shared/cush-verify-api";
import {
  cushVerifyPricingApiLimitsSchema,
  cushVerifyPricingFeatureFlagsSchema,
} from "@shared/cush-verify-pricing";
import { cushVerifyDb as db } from "./db";
import {
  getInstitutionalWorkspaceState,
  type InstitutionalRequest,
} from "./cush-verify-institutional-routes";
import { hashClientIp } from "./ip-rate-limit";

const IN_FLIGHT_STALE_MS = 5 * 60 * 1000;
const INVALID_KEY_WINDOW_MS = 15 * 60 * 1000;
const apiKeyPattern = /^(cvk_(sandbox|production)_([a-f0-9]{24}))\.([A-Za-z0-9_-]{43})$/;

export type ProductionApiAccess = {
  enabled: boolean;
  reason: string | null;
  apiLimits: CushVerifyApiRequestContext["apiLimits"];
  overageConfigured: boolean;
  periodStartAt: Date;
  requestStatus: "submitted" | "approved" | "rejected" | null;
  requestSubmittedAt: Date | null;
  requestReviewedAt: Date | null;
  decisionNote: string | null;
};

export function resolveProductionApiAccessEntitlement(
  planIncludesApi: boolean,
  requestStatus: ProductionApiAccess["requestStatus"],
): { enabled: boolean; reason: string | null } {
  if (!planIncludesApi) {
    return {
      enabled: false,
      reason: "Your current subscription does not include production API access.",
    };
  }
  if (requestStatus !== "approved") {
    return {
      enabled: false,
      reason: requestStatus === "submitted"
        ? "Your production API access request is awaiting Cush review."
        : requestStatus === "rejected"
          ? "Your production API access request was not approved. You may submit a new request."
          : "Submit a production API access request to enable production keys.",
    };
  }
  return { enabled: true, reason: null };
}

export type CushVerifyApiLimitUsage = {
  requestsInMinute: number;
  requestsInHour: number;
  inFlightRequests: number;
};

export function findCushVerifyApiLimitViolation(
  limits: CushVerifyApiRequestContext["apiLimits"],
  usage: CushVerifyApiLimitUsage,
  now: Date,
) {
  if (!limits) return null;
  if (limits.requestsPerMinute !== null && usage.requestsInMinute >= limits.requestsPerMinute) {
    const start = Math.floor(now.getTime() / 60_000) * 60_000;
    return {
      limit: limits.requestsPerMinute,
      used: usage.requestsInMinute,
      resetAt: new Date(start + 60_000),
      message: "The institution has reached its configured per-minute API limit.",
    };
  }
  if (limits.requestsPerHour !== null && usage.requestsInHour >= limits.requestsPerHour) {
    const start = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
    return {
      limit: limits.requestsPerHour,
      used: usage.requestsInHour,
      resetAt: new Date(start + 3_600_000),
      message: "The institution has reached its configured per-hour API limit.",
    };
  }
  if (limits.maxConcurrentRequests !== null && usage.inFlightRequests >= limits.maxConcurrentRequests) {
    return {
      limit: limits.maxConcurrentRequests,
      used: usage.inFlightRequests,
      resetAt: new Date(now.getTime() + 60_000),
      message: "The institution has reached its configured concurrent API request limit.",
    };
  }
  return null;
}

function hashApiKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseCushVerifyApiKey(value: string) {
  const match = apiKeyPattern.exec(value);
  if (!match) return null;
  return {
    keyPrefix: match[1],
    environment: match[2] === "sandbox" ? "sandbox" as const : "production" as const,
    secretHash: hashApiKey(value),
  };
}

export function mintCushVerifyApiKey(environment: CushVerifyApiKeyEnvironment) {
  const keyPrefix = `cvk_${environment}_${randomBytes(12).toString("hex")}`;
  const secret = `${keyPrefix}.${randomBytes(32).toString("base64url")}`;
  return { keyPrefix, secret, secretHash: hashApiKey(secret) };
}

export async function getProductionApiAccess(institutionId: number): Promise<ProductionApiAccess> {
  const [latestRequest] = await db.select({
    status: cushVerifyApiAccessRequests.status,
    createdAt: cushVerifyApiAccessRequests.createdAt,
    reviewedAt: cushVerifyApiAccessRequests.reviewedAt,
    decisionNote: cushVerifyApiAccessRequests.decisionNote,
  })
    .from(cushVerifyApiAccessRequests)
    .where(eq(cushVerifyApiAccessRequests.institutionId, institutionId))
    .orderBy(desc(cushVerifyApiAccessRequests.createdAt))
    .limit(1);

  const requestSummary = {
    requestStatus: latestRequest?.status ?? null,
    requestSubmittedAt: latestRequest?.createdAt ?? null,
    requestReviewedAt: latestRequest?.reviewedAt ?? null,
    decisionNote: latestRequest?.decisionNote ?? null,
  };

  const [subscription] = await db.select()
    .from(cushVerifySubscriptions)
    .where(and(
      eq(cushVerifySubscriptions.institutionId, institutionId),
      inArray(cushVerifySubscriptions.status, ["active", "trialing"]),
    ))
    .orderBy(desc(cushVerifySubscriptions.updatedAt))
    .limit(1);
  if (!subscription) {
    return {
      enabled: false,
      reason: "Production API access requires an active subscription with API access enabled.",
      apiLimits: null,
      overageConfigured: false,
      periodStartAt: new Date(),
      ...requestSummary,
    };
  }

  const [plan] = await db.select({
    featureFlags: cushVerifyPricingPlans.featureFlags,
    apiLimits: cushVerifyPricingPlans.apiLimits,
  })
    .from(cushVerifyPricingPlans)
    .where(and(
      eq(cushVerifyPricingPlans.versionId, subscription.pricingVersionId),
      eq(cushVerifyPricingPlans.planKey, subscription.planKey),
    ))
    .limit(1);
  const flags = cushVerifyPricingFeatureFlagsSchema.safeParse(plan?.featureFlags);
  const limits = cushVerifyPricingApiLimitsSchema.safeParse(plan?.apiLimits);
  if (!flags.success || !limits.success) {
    return {
      enabled: false,
      reason: "Production API plan settings are unavailable. Contact Cush support.",
      apiLimits: null,
      overageConfigured: false,
      periodStartAt: subscription.currentPeriodStartAt,
      ...requestSummary,
    };
  }
  const entitlement = resolveProductionApiAccessEntitlement(flags.data.apiAccess, latestRequest?.status ?? null);
  if (!entitlement.enabled) {
    return {
      enabled: false,
      reason: entitlement.reason,
      apiLimits: limits.data,
      overageConfigured: subscription.additionalReportPriceMinor !== null,
      periodStartAt: subscription.currentPeriodStartAt,
      ...requestSummary,
    };
  }
  return {
    ...entitlement,
    apiLimits: limits.data,
    overageConfigured: subscription.additionalReportPriceMinor !== null,
    periodStartAt: subscription.currentPeriodStartAt,
    ...requestSummary,
  };
}

export async function getSandboxApiLimits(): Promise<CushVerifyApiRequestContext["apiLimits"]> {
  const [published] = await db.select({ id: cushVerifyPricingVersions.id })
    .from(cushVerifyPricingVersions)
    .where(eq(cushVerifyPricingVersions.status, "published"))
    .limit(1);
  if (!published) return null;
  const [plan] = await db.select({ apiLimits: cushVerifyPricingPlans.apiLimits })
    .from(cushVerifyPricingPlans)
    .where(and(
      eq(cushVerifyPricingPlans.versionId, published.id),
      eq(cushVerifyPricingPlans.isActive, true),
      eq(cushVerifyPricingPlans.isArchived, false),
      eq(cushVerifyPricingPlans.allocationMode, "sandbox"),
      eq(cushVerifyPricingPlans.salesMode, "sandbox_only"),
    ))
    .limit(1);
  if (!plan) return null;
  const limits = cushVerifyPricingApiLimitsSchema.safeParse(plan.apiLimits);
  if (!limits.success) throw new Error("Sandbox API limit configuration is invalid.");
  return limits.data;
}

function environmentFromRequest(req: Request): CushVerifyApiKeyEnvironment {
  const path = req.originalUrl.split("?", 1)[0];
  return path.startsWith("/api/v1/sandbox/") ? "sandbox" : "production";
}

function safeEndpoint(path: string): string {
  const noQuery = path.split("?", 1)[0].slice(0, 180);
  return noQuery
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id")
    .replace(/\/\d+(?=\/|$)/g, "/:id");
}

export function requiredCushVerifyApiScopeForRequest(req: Request): CushVerifyApiScope | null {
  const path = req.originalUrl.split("?", 1)[0];
  if (path.startsWith("/api/v1/sandbox/")) {
    return "sandbox:simulate";
  }
  if (path.endsWith("/passport-discovery") && req.method === "POST") return "passport:discover";
  if (path.endsWith("/report-requests") && req.method === "POST") return "reports:request";
  if (
    (path.endsWith("/report-requests") && req.method === "GET") ||
    (/\/report-requests\/[^/]+\/deliver$/.test(path) && req.method === "POST")
  ) return "reports:read";
  return null;
}

function attachUsageFinalizer(
  req: Request,
  res: Response,
  usageId: number,
  requestId: string,
  startedAt: number,
) {
  res.setHeader("X-Request-Id", requestId);
  res.once("finish", () => {
    void db.update(cushVerifyApiUsage)
      .set({
        state: "completed",
        responseStatus: res.statusCode,
        durationMs: Math.max(0, Date.now() - startedAt),
        completedAt: new Date(),
      })
      .where(eq(cushVerifyApiUsage.id, usageId))
      .catch((error) => {
        console.error("Cush Verify API usage finalization failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      });
  });
}

async function insertUsageRow(input: {
  requestId: string;
  institutionId: number | null;
  apiKeyId: number | null;
  environment: CushVerifyApiKeyEnvironment;
  endpoint: string;
  method: string;
  clientIpHash?: string | null;
}) {
  const method = ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(input.method)
    ? input.method
    : "POST";
  const [row] = await db.insert(cushVerifyApiUsage)
    .values({ ...input, method })
    .returning({ id: cushVerifyApiUsage.id });
  return row.id;
}

async function writeDeniedUsage(req: Request, res: Response, environment: CushVerifyApiKeyEnvironment) {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const clientIpHash = hashClientIp(req.ip || req.socket.remoteAddress || "unknown");
  const configuredLimit = Number(process.env.CUSH_VERIFY_API_INVALID_KEY_LIMIT ?? 30);
  if (!Number.isSafeInteger(configuredLimit) || configuredLimit < 1 || configuredLimit > 10_000) {
    throw new Error("The invalid API-key attempt limit is not configured correctly.");
  }
  const windowStart = new Date(Math.floor(startedAt / INVALID_KEY_WINDOW_MS) * INVALID_KEY_WINDOW_MS);
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${clientIpHash}, 0))`);
    const [priorAttempts] = await tx.select({ used: count() })
      .from(cushVerifyApiUsage)
      .where(and(
        eq(cushVerifyApiUsage.clientIpHash, clientIpHash),
        eq(cushVerifyApiUsage.responseStatus, 401),
        gte(cushVerifyApiUsage.createdAt, windowStart),
      ));
    const throttled = Number(priorAttempts?.used ?? 0) >= configuredLimit;
    await tx.insert(cushVerifyApiUsage).values({
      requestId,
      institutionId: null,
      apiKeyId: null,
      environment,
      endpoint: safeEndpoint(req.originalUrl),
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(req.method) ? req.method : "POST",
      clientIpHash,
      state: "completed",
      responseStatus: throttled ? 429 : 401,
      durationMs: Math.max(0, Date.now() - startedAt),
      completedAt: new Date(),
    });
    return { throttled };
  });
  res.setHeader("X-Request-Id", requestId);
  if (result.throttled) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((windowStart.getTime() + INVALID_KEY_WINDOW_MS - Date.now()) / 1000))));
  }
  return result.throttled;
}

function respondWithLimit(res: Response, limit: number, used: number, resetAt: Date, message: string) {
  const remaining = Math.max(0, limit - used);
  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))));
  res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))));
  res.status(429).json({ code: "CUSH_VERIFY_API_RATE_LIMIT", error: message });
}

export async function authenticateCushVerifyApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const environment = environmentFromRequest(req);
  const startedAt = Date.now();
  let usageId: number | null = null;
  try {
    const authorization = req.get("Authorization") ?? "";
    const rawKey = /^Bearer ([^\s]+)$/.exec(authorization)?.[1] ?? "";
    const parsedKey = parseCushVerifyApiKey(rawKey);
    if (!parsedKey) {
      const throttled = await writeDeniedUsage(req, res, environment);
      res.status(throttled ? 429 : 401).json({
        code: throttled ? "CUSH_VERIFY_API_AUTH_RATE_LIMIT" : "CUSH_VERIFY_API_KEY_REQUIRED",
        error: throttled ? "Too many invalid API-key attempts. Wait before retrying." : "A valid Cush Verify API key is required.",
      });
      return;
    }

    const [key] = await db.select()
      .from(cushVerifyApiKeys)
      .where(and(
        eq(cushVerifyApiKeys.keyPrefix, parsedKey.keyPrefix),
        eq(cushVerifyApiKeys.status, "active"),
      ))
      .limit(1);
    const suppliedHash = Buffer.from(parsedKey.secretHash, "hex");
    const storedHash = key ? Buffer.from(key.secretHash, "hex") : Buffer.alloc(suppliedHash.length);
    if (!key || !timingSafeEqual(suppliedHash, storedHash)) {
      const throttled = await writeDeniedUsage(req, res, environment);
      res.status(throttled ? 429 : 401).json({
        code: throttled ? "CUSH_VERIFY_API_AUTH_RATE_LIMIT" : "CUSH_VERIFY_API_KEY_INVALID",
        error: throttled ? "Too many invalid API-key attempts. Wait before retrying." : "The API key is invalid or has been revoked.",
      });
      return;
    }
    if (key.environment !== environment || parsedKey.environment !== environment) {
      const requestId = randomUUID();
      usageId = await insertUsageRow({
        requestId,
        institutionId: key.institutionId,
        apiKeyId: key.id,
        environment,
        endpoint: safeEndpoint(req.originalUrl),
        method: req.method,
      });
      attachUsageFinalizer(req, res, usageId, requestId, startedAt);
      res.status(403).json({ code: "CUSH_VERIFY_API_ENVIRONMENT_MISMATCH", error: "Use a key created for this API environment." });
      return;
    }

    const [user] = await db.select()
      .from(cushVerifyInstitutionalUsers)
      .where(eq(cushVerifyInstitutionalUsers.id, key.createdByInstitutionalUserId))
      .limit(1);
    const membership = await getInstitutionalWorkspaceState(key.createdByInstitutionalUserId);
    if (
      !user ||
      !user.isActive ||
      !user.isEmailVerified ||
      !membership ||
      membership.membershipStatus !== "active" ||
      membership.institutionStatus !== "approved" ||
      membership.applicationStatus !== "approved" ||
      membership.institutionId !== key.institutionId
    ) {
      const requestId = randomUUID();
      usageId = await insertUsageRow({
        requestId,
        institutionId: key.institutionId,
        apiKeyId: key.id,
        environment,
        endpoint: safeEndpoint(req.originalUrl),
        method: req.method,
      });
      attachUsageFinalizer(req, res, usageId, requestId, startedAt);
      res.status(403).json({ code: "CUSH_VERIFY_API_ACCESS_UNAVAILABLE", error: "This institution's API access is not active." });
      return;
    }

    let apiLimits: CushVerifyApiRequestContext["apiLimits"] = null;
    let overageConfigured = false;
    let periodStartAt = new Date();
    if (environment === "production") {
      const access = await getProductionApiAccess(key.institutionId);
      if (!access.enabled) {
        const requestId = randomUUID();
        usageId = await insertUsageRow({
          requestId,
          institutionId: key.institutionId,
          apiKeyId: key.id,
          environment,
          endpoint: safeEndpoint(req.originalUrl),
          method: req.method,
        });
        attachUsageFinalizer(req, res, usageId, requestId, startedAt);
        res.status(403).json({
          code: "CUSH_VERIFY_PRODUCTION_API_NOT_ENABLED",
          error: access.reason ?? "Production API access is not enabled for this organisation.",
        });
        return;
      }
      apiLimits = access.apiLimits;
      overageConfigured = access.overageConfigured;
      periodStartAt = access.periodStartAt;
    } else {
      apiLimits = await getSandboxApiLimits();
    }

    const scope = requiredCushVerifyApiScopeForRequest(req);
    if (scope && !key.scopes.includes(scope)) {
      const requestId = randomUUID();
      usageId = await insertUsageRow({
        requestId,
        institutionId: key.institutionId,
        apiKeyId: key.id,
        environment,
        endpoint: safeEndpoint(req.originalUrl),
        method: req.method,
      });
      attachUsageFinalizer(req, res, usageId, requestId, startedAt);
      res.status(403).json({ code: "CUSH_VERIFY_API_SCOPE_REQUIRED", error: "This API key does not have permission for the requested operation." });
      return;
    }

    const now = new Date();
    const requestId = randomUUID();
    const endpoint = safeEndpoint(req.originalUrl);
    const result = await db.transaction(async (tx) => {
      await tx.select({ id: cushVerifyInstitutions.id })
        .from(cushVerifyInstitutions)
        .where(eq(cushVerifyInstitutions.id, key.institutionId))
        .for("update")
        .limit(1);
      const conditions = [
        eq(cushVerifyApiUsage.institutionId, key.institutionId),
        eq(cushVerifyApiUsage.environment, environment),
      ];
      const startMinute = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
      const startHour = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
      const [minuteCount, hourCount, inFlightCount] = await Promise.all([
        apiLimits?.requestsPerMinute !== null && apiLimits?.requestsPerMinute !== undefined
          ? tx.select({ used: count() }).from(cushVerifyApiUsage)
              .where(and(...conditions, gte(cushVerifyApiUsage.createdAt, startMinute)))
          : Promise.resolve([{ used: 0 }]),
        apiLimits?.requestsPerHour !== null && apiLimits?.requestsPerHour !== undefined
          ? tx.select({ used: count() }).from(cushVerifyApiUsage)
              .where(and(...conditions, gte(cushVerifyApiUsage.createdAt, startHour)))
          : Promise.resolve([{ used: 0 }]),
        apiLimits?.maxConcurrentRequests !== null && apiLimits?.maxConcurrentRequests !== undefined
          ? tx.select({ used: count() }).from(cushVerifyApiUsage)
              .where(and(
                ...conditions,
                eq(cushVerifyApiUsage.state, "processing"),
                gte(cushVerifyApiUsage.createdAt, new Date(now.getTime() - IN_FLIGHT_STALE_MS)),
              ))
          : Promise.resolve([{ used: 0 }]),
      ]);
      const denial = findCushVerifyApiLimitViolation(apiLimits, {
        requestsInMinute: Number(minuteCount[0]?.used ?? 0),
        requestsInHour: Number(hourCount[0]?.used ?? 0),
        inFlightRequests: Number(inFlightCount[0]?.used ?? 0),
      }, now);
      await tx.update(cushVerifyApiKeys)
        .set({ lastUsedAt: now })
        .where(eq(cushVerifyApiKeys.id, key.id));
      const [insertedUsage] = await tx.insert(cushVerifyApiUsage).values({
        requestId,
        institutionId: key.institutionId,
        apiKeyId: key.id,
        environment,
        endpoint,
        method: req.method,
      }).returning({ id: cushVerifyApiUsage.id });
      return { usage: insertedUsage, denial };
    });
    usageId = result.usage.id;
    attachUsageFinalizer(req, res, usageId, requestId, startedAt);
    if (result.denial) {
      respondWithLimit(res, result.denial.limit, result.denial.used, result.denial.resetAt, result.denial.message);
      return;
    }

    const context: CushVerifyApiRequestContext = {
      apiKeyId: key.id,
      institutionId: key.institutionId,
      createdByInstitutionalUserId: key.createdByInstitutionalUserId,
      usageId,
      environment,
      scopes: key.scopes.filter((value): value is CushVerifyApiScope =>
        CUSH_VERIFY_API_SCOPES.includes(value as CushVerifyApiScope)),
      apiLimits,
      overageConfigured,
      periodStartAt,
    };
    (req as InstitutionalRequest).cushVerifyApiContext = context;
    (req as InstitutionalRequest).cushVerifyInstitutionalUserId = key.createdByInstitutionalUserId;
    next();
  } catch (error) {
    console.error("Cush Verify API authentication or metering failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    if (usageId !== null) {
      try {
        attachUsageFinalizer(req, res, usageId, randomUUID(), startedAt);
      } catch {
        // Response errors are already being handled below.
      }
    }
    if (!res.headersSent) {
      res.status(503).json({
        code: "CUSH_VERIFY_API_TEMPORARILY_UNAVAILABLE",
        error: "Cush Verify API access is temporarily unavailable.",
      });
    }
  }
}

export function requireCushVerifyApiScope(scope: CushVerifyApiScope) {
  return (req: InstitutionalRequest, res: Response, next: NextFunction) => {
    const context = req.cushVerifyApiContext;
    if (!context) {
      next();
      return;
    }
    if (!context.scopes.includes(scope)) {
      res.status(403).json({ code: "CUSH_VERIFY_API_SCOPE_REQUIRED", error: "This API key does not have permission for the requested operation." });
      return;
    }
    next();
  };
}

export function registerCushVerifyApiMiddleware(app: Express): void {
  app.use("/api/v1", authenticateCushVerifyApiKey);
}
