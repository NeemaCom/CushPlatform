import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { monoBvnLookupConsents, monoLinkedAccounts } from "@shared/schema";
import { authRateLimit } from "./security";
import { isAuthenticated, type AuthenticatedRequest } from "./auth";
import {
  getMonoCallbackUrl,
  getMonoClient,
  MonoNotConfiguredError,
  MonoRequestError,
  normalizeBvnAccounts,
} from "./mono-service";

const initiateBvnSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/, "Enter an 11-digit BVN."),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required to request this lookup." }) }),
});

const otpRequestSchema = z.object({
  method: z.enum(["phone", "phone_1", "email", "alternate_phone"]),
  phoneNumber: z.string().trim().min(7).max(20).optional(),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{4,8}$/, "Enter the OTP sent by Mono."),
});

const exchangeSchema = z.object({
  code: z.string().trim().min(1).max(500),
});

const statementSchema = z.object({
  periodMonths: z.number().int().min(1).max(12),
});

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

function getPendingBvnSession(req: AuthenticatedRequest) {
  const pending = req.session.monoBvnLookup;
  if (!pending || pending.expiresAt <= Date.now()) {
    delete req.session.monoBvnLookup;
    return null;
  }
  return pending;
}

export function registerMonoRoutes(app: Express) {
  app.get("/api/mono/status", isAuthenticated, async (_req, res) => {
    noStore(res);
    let schemaReady = true;
    try {
      await db.select({ id: monoLinkedAccounts.id }).from(monoLinkedAccounts).limit(0);
      await db.select({ id: monoBvnLookupConsents.id }).from(monoBvnLookupConsents).limit(0);
    } catch {
      schemaReady = false;
    }
    return res.json({
      configured: Boolean(process.env.MONO_SECRET_KEY),
      callbackConfigured: Boolean(getMonoCallbackUrl()),
      schemaReady,
    });
  });

  // BVN values and OTPs are processed transiently and are never stored or logged.
  app.post("/api/mono/bvn/initiate", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const parsed = initiateBvnSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid BVN lookup request." });

    try {
      // Record consent before initiating the billable provider flow. The record
      // contains no BVN, OTP, session ID, or lookup result.
      await db.insert(monoBvnLookupConsents).values({
        userId: req.userId!,
        consentVersion: "mono-bvn-bank-accounts-v1",
      });

      const result = await getMonoClient().request<any>("/v3/lookup/bvn/initiate", {
        method: "POST",
        body: { bvn: parsed.data.bvn, scope: "bank_accounts" },
      });
      const data = result?.data;
      if (typeof data?.session_id !== "string" || !Array.isArray(data?.methods)) {
        return res.status(502).json({ error: "Mono returned an unexpected lookup response." });
      }

      const methods = data.methods
        .filter((method: any) => typeof method?.method === "string")
        .map((method: any) => ({
          method: method.method,
          hint: typeof method.hint === "string" ? method.hint : "",
        }));
      if (methods.length === 0) return res.status(502).json({ error: "Mono did not return a verification method." });

      req.session.monoBvnLookup = {
        sessionId: data.session_id,
        methods: methods.map((method: { method: string }) => method.method),
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      return res.json({ methods, expiresAt: req.session.monoBvnLookup.expiresAt });
    } catch (error) {
      return providerFailure(res, error);
    }
  });

  app.post("/api/mono/bvn/request-otp", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const parsed = otpRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid OTP request." });

    const pending = getPendingBvnSession(req);
    if (!pending) return res.status(400).json({ error: "This BVN lookup has expired. Start a new lookup." });
    if (!pending.methods.includes(parsed.data.method)) {
      return res.status(400).json({ error: "Choose a verification method returned for this lookup." });
    }
    if (parsed.data.method === "alternate_phone" && !/^\+?[\d\s()-]{7,20}$/.test(parsed.data.phoneNumber ?? "")) {
      return res.status(400).json({ error: "Enter the alternate phone number for this verification method." });
    }

    try {
      await getMonoClient().request("/v3/lookup/bvn/verify", {
        method: "POST",
        sessionId: pending.sessionId,
        body: {
          method: parsed.data.method,
          ...(parsed.data.method === "alternate_phone" ? { phone_number: parsed.data.phoneNumber } : {}),
        },
      });
      return res.json({ success: true });
    } catch (error) {
      return providerFailure(res, error);
    }
  });

  app.post("/api/mono/bvn/fetch-accounts", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const parsed = otpSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid OTP." });

    const pending = getPendingBvnSession(req);
    if (!pending) return res.status(400).json({ error: "This BVN lookup has expired. Start a new lookup." });

    try {
      const result = await getMonoClient().request<any>("/v3/lookup/bvn/details", {
        method: "POST",
        sessionId: pending.sessionId,
        body: { otp: parsed.data.otp },
      });
      const accounts = normalizeBvnAccounts(result?.data);
      delete req.session.monoBvnLookup;
      return res.json({ accounts });
    } catch (error) {
      return providerFailure(res, error);
    }
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
}
