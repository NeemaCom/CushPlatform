import type { Express, Response } from "express";
import { z } from "zod";
import { interswitchCreditLookupConsents } from "@shared/schema";
import { isAuthenticated, type AuthenticatedRequest } from "./auth";
import { db } from "./db";
import { authRateLimit } from "./security";
import { storage } from "./storage";
import {
  InterswitchCreditProviderError,
  interswitchCreditReportClient,
  maskPhoneNumber,
  normalizeVerifiedNigerianPhone,
} from "./interswitch-credit-service";

const consentSchema = z.object({ consent: z.literal(true) });
const CONSENT_VERSION = "interswitch-bureau-credit-report-v1";

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function isMissingConsentTable(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && (current as { code?: unknown }).code === "42P01") return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

export function registerInterswitchCreditRoutes(app: Express) {
  app.get("/api/interswitch/credit-report/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(401).json({ error: "Authentication required" });
      const phone = user.phoneNumber && user.isPhoneVerified
        ? normalizeVerifiedNigerianPhone(user.phoneNumber)
        : null;
      let consentSchemaReady = true;
      try {
        await db.select({ id: interswitchCreditLookupConsents.id })
          .from(interswitchCreditLookupConsents)
          .limit(0);
      } catch {
        consentSchemaReady = false;
      }
      return res.json({
        configured: interswitchCreditReportClient.isConfigured(),
        verifiedNigerianPhoneAvailable: phone !== null,
        maskedPhone: phone ? maskPhoneNumber(phone) : null,
        consentSchemaReady,
      });
    } catch {
      return res.status(503).json({ error: "Credit lookup status is temporarily unavailable." });
    }
  });

  app.post(
    "/api/interswitch/credit-report",
    isAuthenticated,
    authRateLimit,
    async (req: AuthenticatedRequest, res) => {
      noStore(res);
      const parsed = consentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Explicit consent is required before requesting a credit report." });
      }

      if (!interswitchCreditReportClient.isConfigured()) {
        return res.status(503).json({
          code: "INTERSWITCH_NOT_CONFIGURED",
          error: "The Interswitch credit-report service is not configured yet.",
        });
      }

      let phoneNo: string;
      try {
        const user = await storage.getUser(req.userId!);
        if (!user) return res.status(401).json({ error: "Authentication required" });
        if (!user.isPhoneVerified || !user.phoneNumber) {
          return res.status(400).json({
            code: "VERIFIED_PHONE_REQUIRED",
            error: "Verify a Nigerian phone number on your account before requesting a report.",
          });
        }
        const normalizedPhone = normalizeVerifiedNigerianPhone(user.phoneNumber);
        if (!normalizedPhone) {
          return res.status(400).json({
            code: "NIGERIAN_PHONE_REQUIRED",
            error: "This Interswitch lookup currently supports verified Nigerian phone numbers only.",
          });
        }
        phoneNo = normalizedPhone;
      } catch {
        return res.status(503).json({ error: "Your verified phone number could not be checked." });
      }

      try {
        await db.insert(interswitchCreditLookupConsents).values({
          userId: req.userId!,
          consentVersion: CONSENT_VERSION,
        });
      } catch (error) {
        if (isMissingConsentTable(error)) {
          return res.status(503).json({
            code: "INTERSWITCH_CONSENT_SCHEMA_MISSING",
            error: "Apply the Interswitch consent migration before enabling credit lookups.",
          });
        }
        return res.status(503).json({ error: "Your consent could not be recorded, so no lookup was started." });
      }

      try {
        const report = await interswitchCreditReportClient.lookup(phoneNo);
        return res.json({
          provider: "Interswitch",
          completedAt: new Date().toISOString(),
          scoreApplied: false,
          report,
        });
      } catch (error) {
        const providerStatus = error instanceof InterswitchCreditProviderError ? error.statusCode : undefined;
        if (providerStatus) {
          res.setHeader("X-Provider-Status", String(providerStatus));
        }
        return res.status(502).json({
          code: "INTERSWITCH_CREDIT_REPORT_FAILED",
          error: "Interswitch did not return a usable credit report. The report was not stored.",
        });
      }
    },
  );
}
