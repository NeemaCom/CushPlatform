import type { Express, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  interswitchCreditHistoryEvidence,
  interswitchCreditLookupConsents,
} from "@shared/schema";
import { isAuthenticated, type AuthenticatedRequest } from "./auth";
import { db } from "./db";
import { authRateLimit } from "./security";
import { InterswitchCreditHistoryError, interswitchCreditHistoryClient } from "./interswitch-credit-history-service";
import {
  INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION,
  scoreInterswitchCreditHistory,
} from "./interswitch-credit-history-scoring";

const CONSENT_VERSION = "interswitch-credit-history-bvn-v1";
const lookupSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/),
  consent: z.literal(true),
}).strict();

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function isMissingSchema(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && ["42P01", "42703"].includes(String((current as { code?: unknown }).code))) return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

async function schemaReadiness() {
  let consentSchemaReady = true;
  let evidenceSchemaReady = true;
  try {
    await db.select({ id: interswitchCreditLookupConsents.id })
      .from(interswitchCreditLookupConsents).limit(0);
  } catch {
    consentSchemaReady = false;
  }
  try {
    await db.select({ id: interswitchCreditHistoryEvidence.id })
      .from(interswitchCreditHistoryEvidence).limit(0);
    await db.select({ mappingVersion: interswitchCreditHistoryEvidence.mappingVersion })
      .from(interswitchCreditHistoryEvidence).limit(0);
  } catch {
    evidenceSchemaReady = false;
  }
  return { consentSchemaReady, evidenceSchemaReady };
}

async function schemasReady(): Promise<boolean> {
  const readiness = await schemaReadiness();
  return readiness.consentSchemaReady && readiness.evidenceSchemaReady;
}

export function registerInterswitchCreditHistoryRoutes(app: Express) {
  app.get("/api/interswitch/credit-history/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    try {
      const readiness = await schemaReadiness();
      const [latest] = readiness.evidenceSchemaReady
        ? await db.select({
            evidenceData: interswitchCreditHistoryEvidence.evidenceData,
            mappingStatus: interswitchCreditHistoryEvidence.mappingStatus,
            mappingVersion: interswitchCreditHistoryEvidence.mappingVersion,
            fetchedAt: interswitchCreditHistoryEvidence.fetchedAt,
          }).from(interswitchCreditHistoryEvidence)
            .where(eq(interswitchCreditHistoryEvidence.userId, req.userId!))
            .orderBy(desc(interswitchCreditHistoryEvidence.fetchedAt))
            .limit(1)
        : [];
      const scoring = latest &&
        latest.mappingVersion === INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION
        ? scoreInterswitchCreditHistory(latest.evidenceData)
        : null;
      return res.json({
        configured: interswitchCreditHistoryClient.isConfigured(),
        ...readiness,
        latest: latest ? {
          evidence: latest.evidenceData,
          mappingStatus: scoring?.score !== null && scoring
            ? "score_applied"
            : "no_scoreable_history",
          mappingVersion: latest.mappingVersion,
          creditComponentScore: scoring?.score ?? null,
          scoreableInstallments: scoring?.scoreableInstallments ?? 0,
          scoreReason: scoring?.reason ?? "mapping_version_mismatch",
          fetchedAt: latest.fetchedAt.toISOString(),
          scoreApplied: scoring?.score !== null && scoring !== null,
        } : null,
      });
    } catch {
      return res.status(503).json({ error: "Credit-history lookup status is temporarily unavailable." });
    }
  });

  app.post(
    "/api/interswitch/credit-history",
    isAuthenticated,
    authRateLimit,
    async (req: AuthenticatedRequest, res) => {
      noStore(res);
      const parsed = lookupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Enter an 11-digit BVN and explicitly consent before requesting the Interswitch lookup.",
        });
      }
      const bvn = parsed.data.bvn;
      req.body = {};
      if (!interswitchCreditHistoryClient.isConfigured()) {
        return res.status(503).json({
          code: "INTERSWITCH_NOT_CONFIGURED",
          error: "The Interswitch credit-history service is not configured.",
        });
      }
      if (!(await schemasReady())) {
        return res.status(503).json({
          code: "INTERSWITCH_EVIDENCE_SCHEMA_MISSING",
          error: "Apply both Interswitch credit-history migrations in order before requesting a report.",
        });
      }

      let consentId: number;
      try {
        const [consent] = await db.insert(interswitchCreditLookupConsents).values({
          userId: req.userId!,
          consentVersion: CONSENT_VERSION,
        }).returning({ id: interswitchCreditLookupConsents.id });
        consentId = consent.id;
      } catch {
        return res.status(503).json({
          error: "Your consent could not be recorded, so no lookup was started.",
        });
      }

      try {
        // The BVN is used only for this provider request. Neither it nor the raw
        // provider response is logged, returned to the browser, or persisted.
        const evidence = await interswitchCreditHistoryClient.lookup(bvn);
        const scoring = scoreInterswitchCreditHistory(evidence);
        const mappingStatus = scoring.score === null ? "no_scoreable_history" : "score_applied";
        const fetchedAt = new Date();
        const [stored] = await db.insert(interswitchCreditHistoryEvidence)
          .values({
            userId: req.userId!,
            consentId,
            evidenceData: evidence,
            mappingStatus,
            mappingVersion: INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION,
            fetchedAt,
          })
          .onConflictDoUpdate({
            target: interswitchCreditHistoryEvidence.userId,
            set: {
              consentId,
              evidenceData: evidence,
              mappingStatus,
              mappingVersion: INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION,
              fetchedAt,
            },
          })
          .returning({ id: interswitchCreditHistoryEvidence.id });
        return res.json({
          provider: "Interswitch",
          evidenceId: stored.id,
          fetchedAt: fetchedAt.toISOString(),
          evidence,
          mappingStatus,
          mappingVersion: INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION,
          creditComponentScore: scoring.score,
          scoreableInstallments: scoring.scoreableInstallments,
          scoreReason: scoring.reason,
          scoreApplied: scoring.score !== null,
        });
      } catch (error) {
        if (isMissingSchema(error)) {
          return res.status(503).json({
            code: "INTERSWITCH_EVIDENCE_SCHEMA_MISSING",
            error: "Apply both Interswitch credit-history migrations in order before requesting a report.",
          });
        }
        const providerStatus = error instanceof InterswitchCreditHistoryError ? error.statusCode : undefined;
        if (providerStatus) res.setHeader("X-Provider-Status", String(providerStatus));
        return res.status(error instanceof InterswitchCreditHistoryError ? 502 : 503).json({
          code: "INTERSWITCH_CREDIT_HISTORY_FAILED",
          error: "No usable credit-history result was saved. Try again later.",
        });
      }
    },
  );
}
