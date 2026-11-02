import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import {
  monoLinkedAccounts,
  monoV2AssessmentEvidence,
} from "@shared/schema";
import { authRateLimit } from "./security";
import { isAuthenticated, type AuthenticatedRequest } from "./auth";
import { getV2Assessment } from "./cush-score-v2";
import {
  getMonoCallbackUrl,
  getMonoClient,
  resolveMonoSettings,
  MonoNotConfiguredError,
  MonoRequestError,
} from "./mono-service";
import {
  buildMonoV2Evidence,
  MonoV2PreviewError,
  createMonoV2Preview,
  type MonoV2ImportSelection,
} from "./mono-v2-import";

const exchangeSchema = z.object({
  code: z.string().trim().min(1).max(500),
});

const statementSchema = z.object({
  periodMonths: z.number().int().min(1).max(12),
});

const monoV2PreviewSchema = z.object({
  periodMonths: z.number().int().min(1).max(12),
  consent: z.literal(true),
}).strict();

const monoV2ImportSchema = z.object({
  previewToken: z.string().uuid(),
  recurringIncome: z.array(z.object({
    transactionId: z.string().uuid(),
    category: z.enum(["salary", "self_employment", "freelance", "business", "scholarship", "family_support", "other"]),
    variable: z.boolean(),
  }).strict()).max(5000),
  eligibleExpenseIds: z.array(z.string().uuid()).max(5000),
  completeMonths: z.array(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)).max(12),
  includeBalance: z.boolean(),
  consent: z.literal(true),
}).strict();

function noStore(res: import("express").Response) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
}

function providerFailure(res: import("express").Response, error: unknown) {
  if (error instanceof MonoNotConfiguredError) {
    return res.status(503).json({ error: "Mono is not configured on the production server." });
  }
  if (error instanceof MonoRequestError) {
    const status = error.status === 429 ? 429 : error.status >= 500 ? 503 : 400;
    return res.status(status).json({ error: "Mono could not complete the request. Check the details and try again." });
  }
  console.error("Mono integration request failed.");
  return res.status(503).json({ error: "Mono is temporarily unavailable." });
}

export function registerMonoRoutes(app: Express) {
  app.get("/api/mono/status", isAuthenticated, async (_req, res) => {
    noStore(res);
    const monoSettings = resolveMonoSettings();
    let schemaReady = true;
    try {
      await db.select({ id: monoLinkedAccounts.id }).from(monoLinkedAccounts).limit(0);
      await db.select({ id: monoV2AssessmentEvidence.id }).from(monoV2AssessmentEvidence).limit(0);
    } catch {
      schemaReady = false;
    }
    return res.json({
      configured: Boolean(monoSettings.secretKey),
      environment: monoSettings.environment,
      callbackConfigured: Boolean(getMonoCallbackUrl()),
      schemaReady,
    });
  });

  app.get("/api/mono/accounts", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    try {
      const rows = await db.select({
        id: monoLinkedAccounts.id,
        linkedAt: monoLinkedAccounts.linkedAt,
      }).from(monoLinkedAccounts).where(eq(monoLinkedAccounts.userId, req.userId!));
      return res.json({ accounts: rows });
    } catch {
      return res.status(503).json({ error: "Mono account storage is unavailable. Apply the Mono database migration." });
    }
  });

  app.post("/api/mono/connect/initiate", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const redirectUrl = getMonoCallbackUrl();
    if (!redirectUrl) {
      return res.status(503).json({ error: "Set MONO_REDIRECT_URL to the HTTPS dashboard callback on Render." });
    }
    if (!req.user?.email) return res.status(400).json({ error: "Your account needs an email before linking a bank." });

    try {
      const result = await getMonoClient().request<any>("/v2/accounts/initiate", {
        method: "POST",
        body: {
          customer: {
            name: [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || req.user.email,
            email: req.user.email,
          },
          scope: "auth",
          redirect_url: redirectUrl,
        },
      });
      const monoUrl = result?.data?.mono_url;
      if (typeof monoUrl !== "string" || !monoUrl.startsWith("https://")) {
        return res.status(502).json({ error: "Mono returned an unexpected account-link response." });
      }
      return res.json({ monoUrl });
    } catch (error) {
      return providerFailure(res, error);
    }
  });

  app.post("/api/mono/connect/exchange", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const parsed = exchangeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid Mono connection code." });

    try {
      const result = await getMonoClient().request<any>("/v2/accounts/auth", {
        method: "POST",
        body: { code: parsed.data.code },
      });
      const monoAccountId = result?.data?.id;
      if (typeof monoAccountId !== "string" || monoAccountId.length > 200) {
        return res.status(502).json({ error: "Mono returned an unexpected account response." });
      }

      const [existing] = await db.select().from(monoLinkedAccounts)
        .where(eq(monoLinkedAccounts.monoAccountId, monoAccountId)).limit(1);
      if (existing && existing.userId !== req.userId) {
        return res.status(409).json({ error: "This bank account is already linked to another Cush profile." });
      }
      if (!existing) {
        await db.insert(monoLinkedAccounts).values({ userId: req.userId!, monoAccountId });
      }
      return res.json({ success: true });
    } catch (error) {
      return providerFailure(res, error);
    }
  });

  app.post("/api/mono/accounts/:id/statement", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const localId = Number(req.params.id);
    const parsed = statementSchema.safeParse(req.body);
    if (!Number.isSafeInteger(localId) || localId < 1 || !parsed.success) {
      return res.status(400).json({ error: "Select an account and a statement period from 1 to 12 months." });
    }

    try {
      const [account] = await db.select().from(monoLinkedAccounts).where(and(
        eq(monoLinkedAccounts.id, localId),
        eq(monoLinkedAccounts.userId, req.userId!),
      )).limit(1);
      if (!account) return res.status(404).json({ error: "Linked account not found." });

      const statement = await getMonoClient().request<unknown>(
        `/v2/accounts/${encodeURIComponent(account.monoAccountId)}/statement`,
        {
          query: { period: String(parsed.data.periodMonths), output: "json" },
        },
      );
      return res.json({ statement, periodMonths: parsed.data.periodMonths });
    } catch (error) {
      return providerFailure(res, error);
    }
  });

  app.post("/api/mono/accounts/:id/v2-preview", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const localId = Number(req.params.id);
    const parsed = monoV2PreviewSchema.safeParse(req.body);
    if (!Number.isSafeInteger(localId) || localId < 1 || !parsed.success) {
      return res.status(400).json({ error: "Confirm assessment consent and choose a statement period from 1 to 12 months." });
    }

    try {
      const [account] = await db.select().from(monoLinkedAccounts).where(and(
        eq(monoLinkedAccounts.id, localId),
        eq(monoLinkedAccounts.userId, req.userId!),
      )).limit(1);
      if (!account) return res.status(404).json({ error: "Linked account not found." });

      const client = getMonoClient();
      const [statement, accountDetails] = await Promise.all([
        client.request<unknown>(`/v2/accounts/${encodeURIComponent(account.monoAccountId)}/statement`, {
          query: { period: String(parsed.data.periodMonths), output: "json" },
        }),
        client.request<unknown>(`/v2/accounts/${encodeURIComponent(account.monoAccountId)}`),
      ]);
      const preview = await createMonoV2Preview({
        userId: req.userId!,
        linkedAccountId: localId,
        periodMonths: parsed.data.periodMonths,
        statement,
        accountDetails,
      });
      return res.json(preview);
    } catch (error) {
      if (error instanceof MonoV2PreviewError) {
        return res.status(422).json({ error: error.message });
      }
      if (error instanceof Error && error.message.includes("CBN")) {
        return res.status(503).json({ error: "CBN official rates are unavailable for this statement date. No converted amounts were imported." });
      }
      return providerFailure(res, error);
    }
  });

  app.post("/api/mono/accounts/:id/v2-import", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const localId = Number(req.params.id);
    const parsed = monoV2ImportSchema.safeParse(req.body);
    if (!Number.isSafeInteger(localId) || localId < 1 || !parsed.success) {
      return res.status(400).json({ error: parsed.success ? "Invalid linked account." : parsed.error.errors[0]?.message ?? "Invalid Mono assessment review." });
    }

    try {
      const [account] = await db.select().from(monoLinkedAccounts).where(and(
        eq(monoLinkedAccounts.id, localId),
        eq(monoLinkedAccounts.userId, req.userId!),
      )).limit(1);
      if (!account) return res.status(404).json({ error: "Linked account not found." });

      const selection: MonoV2ImportSelection = { ...parsed.data, consent: true };
      const evidence = buildMonoV2Evidence({
        userId: req.userId!,
        linkedAccountId: localId,
        selection,
      });
      if (!evidence.availableFunds.length && !evidence.incomeHistory.length &&
          !evidence.cashFlowHistory.length) {
        return res.status(400).json({ error: "Select a balance, recurring income, or eligible expenses before importing." });
      }

      const fetchedAt = new Date(evidence.fetchedAt);
      const consentAcceptedAt = new Date(evidence.consentAcceptedAt);
      await db.insert(monoV2AssessmentEvidence).values({
        userId: req.userId!,
        monoLinkedAccountId: localId,
        evidenceData: evidence,
        statementPeriodMonths: evidence.statementPeriodMonths,
        consentVersion: evidence.consentVersion,
        consentAcceptedAt,
        fetchedAt,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: monoV2AssessmentEvidence.monoLinkedAccountId,
        set: {
          evidenceData: evidence,
          statementPeriodMonths: evidence.statementPeriodMonths,
          consentVersion: evidence.consentVersion,
          consentAcceptedAt,
          fetchedAt,
          updatedAt: new Date(),
        },
      });

      return res.json(await getV2Assessment(req.userId!));
    } catch (error) {
      if (error instanceof MonoV2PreviewError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof Error && error.message.includes("CBN")) {
        return res.status(503).json({ error: "CBN official rates are unavailable. No converted amounts were imported." });
      }
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "42P01") {
        return res.status(503).json({ error: "Mono V2 storage is not ready. Apply migrations/manual/create-mono-v2-assessment-evidence.sql in the intended Supabase project." });
      }
      console.error("Mono V2 statement import failed.");
      return res.status(503).json({ error: "Could not import the reviewed Mono data. No raw statement was stored." });
    }
  });
}
