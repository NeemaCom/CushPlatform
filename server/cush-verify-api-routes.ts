import type { Express, NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  cushVerifyApiKeyEvents,
  cushVerifyApiKeys,
  cushVerifyApiUsage,
  cushVerifyBillingAccounts,
} from "@shared/schema";
import {
  CUSH_VERIFY_API_SCOPES,
  createCushVerifyApiKeySchema,
  cushVerifyApiUsageQuerySchema,
} from "@shared/cush-verify-api";
import { cushVerifyDb as db } from "./db";
import { getAllowedFrontendOrigins } from "./origin-policy";
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
