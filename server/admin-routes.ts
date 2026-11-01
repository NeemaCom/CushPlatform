import type { Express } from "express";
import { count, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import {
  adminAuditLogs,
  cushAssessmentInputs,
  cushEvidenceFreshnessReviews,
  interswitchCreditHistoryEvidence,
  monoLinkedAccounts,
  monoV2AssessmentEvidence,
  monoV2AssessmentEvidenceSchema,
  users,
} from "@shared/schema";
import { db } from "./db";
import {
  isAuthenticated,
  requireAdminPermission,
  requireTrustedAdminOrigin,
  type AuthenticatedRequest,
} from "./auth";
import { isAdminAuditTableMissing, recordAdminAuditEvent } from "./admin-audit";
import { ageInDays, resolveEvidenceFreshnessDate } from "./evidence-freshness";
import { normalizedCreditHistorySchema } from "./interswitch-credit-history-scoring";
import { getAdminV2Assessment, isV2SchemaMissing } from "./cush-score-v2";

const allowedRanges = [7, 30, 90] as const;
const evidenceReviewSchema = z.object({
  sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).strict();
const scoreBreakdownLookupSchema = z.object({
  email: z.string().trim().email().max(254),
}).strict();

function isMissingEvidenceReviewSchema(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && ["42P01", "42703"].includes(String((current as { code?: unknown }).code))) {
      return true;
    }
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

export function registerAdminRoutes(app: Express): void {
  app.post(
    "/api/admin/score-breakdown",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.scoreBreakdownRead),
    requireTrustedAdminOrigin,
    async (req: AuthenticatedRequest, res) => {
      const parsed = scoreBreakdownLookupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Enter a valid account email address." });
      }
      const email = parsed.data.email.toLowerCase();
      try {
        const [user] = await db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(eq(users.email, email)).limit(1);
        if (!user) return res.status(404).json({ error: "No account was found for that email." });

        const assessment = await getAdminV2Assessment(user.id);
        await recordAdminAuditEvent(req, {
          action: "admin.score_breakdown.read",
          resourceType: "user_score_breakdown",
          resourceId: user.id,
        });
        return res.json({
          user: {
            id: user.id,
            email: user.email,
            displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Cush user",
          },
          assessment,
        });
      } catch (error) {
        if (isV2SchemaMissing(error)) {
          return res.status(503).json({
            code: "V2_SCHEMA_MISSING",
            error: "V2 scoring data is not set up yet. Apply the required Supabase migrations first.",
          });
        }
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
            error: "Admin audit storage is not initialized. Apply migrations/manual/create-admin-audit-logs.sql first.",
          });
        }
        console.error("Admin score breakdown lookup failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to load the user's score breakdown." });
      }
    },
  );

  app.get(
    "/api/admin/evidence-freshness/review-queue",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.evidenceFreshnessRead),
    async (req: AuthenticatedRequest, res) => {
      try {
        const [monoRows, creditRows, decisions] = await Promise.all([
          db.select({
            id: monoV2AssessmentEvidence.id,
            userId: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            evidenceData: monoV2AssessmentEvidence.evidenceData,
            fetchedAt: monoV2AssessmentEvidence.fetchedAt,
          }).from(monoV2AssessmentEvidence)
            .innerJoin(users, eq(users.id, monoV2AssessmentEvidence.userId))
            .orderBy(desc(monoV2AssessmentEvidence.fetchedAt))
            .limit(500),
          db.select({
            id: interswitchCreditHistoryEvidence.id,
            userId: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            evidenceData: interswitchCreditHistoryEvidence.evidenceData,
            fetchedAt: interswitchCreditHistoryEvidence.fetchedAt,
          }).from(interswitchCreditHistoryEvidence)
            .innerJoin(users, eq(users.id, interswitchCreditHistoryEvidence.userId))
            .orderBy(desc(interswitchCreditHistoryEvidence.fetchedAt))
            .limit(500),
          db.select().from(cushEvidenceFreshnessReviews),
        ]);
        const reviewedMono = new Map(decisions.flatMap((item) =>
          item.monoEvidenceId === null ? [] : [[item.monoEvidenceId, item.evidenceFetchedAt.getTime()] as const]));
        const reviewedCredit = new Map(decisions.flatMap((item) =>
          item.creditEvidenceId === null ? [] : [[item.creditEvidenceId, item.evidenceFetchedAt.getTime()] as const]));
        const now = new Date();

        const monoCases = monoRows.flatMap((row) => {
          if (reviewedMono.get(row.id) === row.fetchedAt.getTime()) return [];
          const parsed = monoV2AssessmentEvidenceSchema.safeParse(row.evidenceData);
          const hasStatementData = parsed.success &&
            (parsed.data.incomeHistory.length > 0 || parsed.data.cashFlowHistory.length > 0);
          const hasBalanceData = parsed.success && parsed.data.availableFunds.length > 0;
          const hasAllSourceDates = parsed.success &&
            (!hasStatementData || ageInDays(parsed.data.statementDataThroughDate ?? null, now) !== null) &&
            (!hasBalanceData || ageInDays(parsed.data.balanceAsOfDate ?? null, now) !== null);
          if (hasAllSourceDates) return [];
          const resolved = resolveEvidenceFreshnessDate({
            retrievedAt: row.fetchedAt,
            now,
          });
          return [{
            source: "mono" as const,
            evidenceId: row.id,
            userId: row.userId,
            email: row.email,
            displayName: [row.firstName, row.lastName].filter(Boolean).join(" "),
            retrievedAt: row.fetchedAt.toISOString(),
            detectedSourceDate: parsed.success
              ? parsed.data.statementDataThroughDate ?? parsed.data.balanceAsOfDate ?? null
              : null,
            effectiveDate: resolved.effectiveDate,
            ageDays: ageInDays(resolved.effectiveDate, now),
            reason: parsed.success
              ? "A contributing statement or balance is missing its source date."
              : "The imported bank evidence needs a metadata check.",
          }];
        });
        const creditCases = creditRows.flatMap((row) => {
          if (reviewedCredit.get(row.id) === row.fetchedAt.getTime()) return [];
          const parsed = normalizedCreditHistorySchema.safeParse(row.evidenceData);
          const sourceDate = parsed.success ? parsed.data.sourceReportDate ?? null : null;
          if (sourceDate && ageInDays(sourceDate, now) !== null) return [];
          const resolved = resolveEvidenceFreshnessDate({
            retrievedAt: row.fetchedAt,
            now,
          });
          return [{
            source: "credit" as const,
            evidenceId: row.id,
            userId: row.userId,
            email: row.email,
            displayName: [row.firstName, row.lastName].filter(Boolean).join(" "),
            retrievedAt: row.fetchedAt.toISOString(),
            detectedSourceDate: null,
            effectiveDate: resolved.effectiveDate,
            ageDays: ageInDays(resolved.effectiveDate, now),
            reason: parsed.success
              ? "The provider response has no explicit report date; the lookup date is used for confidence."
              : "The normalized credit evidence needs a metadata check.",
          }];
        });
        await recordAdminAuditEvent(req, {
          action: "admin.evidence_freshness.queue_read",
          resourceType: "evidence_freshness",
        });
        return res.json({ generatedAt: now.toISOString(), cases: [...monoCases, ...creditCases] });
      } catch (error) {
        if (isMissingEvidenceReviewSchema(error)) {
          return res.status(503).json({
            code: "EVIDENCE_FRESHNESS_SCHEMA_MISSING",
            error: "Evidence review is unavailable. Apply migrations/manual/create-cush-evidence-freshness-reviews.sql.",
          });
        }
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
            error: "Admin audit storage is not initialized. Apply migrations/manual/create-admin-audit-logs.sql first.",
          });
        }
        console.error("Admin evidence freshness queue failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to load the evidence review queue." });
      }
    },
  );

  app.post(
    "/api/admin/evidence-freshness/:source/:evidenceId",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.evidenceFreshnessManage),
    async (req: AuthenticatedRequest, res) => {
      const source = req.params.source;
      const evidenceId = Number(req.params.evidenceId);
      const parsedBody = evidenceReviewSchema.safeParse(req.body);
      if (!["mono", "credit"].includes(source) || !Number.isSafeInteger(evidenceId) ||
          evidenceId < 1 || !parsedBody.success) {
        return res.status(400).json({ error: "Provide a valid evidence record and source date decision." });
      }
      const sourceDate = parsedBody.data.sourceDate ?? null;
      if (sourceDate && ageInDays(sourceDate, new Date()) === null) {
        return res.status(400).json({ error: "Enter a valid source date that is not in the future." });
      }
      try {
        const target = source === "mono" ? "mono" : "credit";
        const [evidence] = target === "mono"
          ? await db.select({
              id: monoV2AssessmentEvidence.id,
              userId: monoV2AssessmentEvidence.userId,
            fetchedAt: monoV2AssessmentEvidence.fetchedAt,
            }).from(monoV2AssessmentEvidence).where(eq(monoV2AssessmentEvidence.id, evidenceId)).limit(1)
          : await db.select({
              id: interswitchCreditHistoryEvidence.id,
              userId: interswitchCreditHistoryEvidence.userId,
            fetchedAt: interswitchCreditHistoryEvidence.fetchedAt,
            }).from(interswitchCreditHistoryEvidence).where(eq(interswitchCreditHistoryEvidence.id, evidenceId)).limit(1);
        if (!evidence) return res.status(404).json({ error: "Evidence record not found." });

        const isMono = target === "mono";
        const existingRows = isMono
          ? await db.select({ id: cushEvidenceFreshnessReviews.id })
              .from(cushEvidenceFreshnessReviews)
              .where(eq(cushEvidenceFreshnessReviews.monoEvidenceId, evidenceId)).limit(1)
          : await db.select({ id: cushEvidenceFreshnessReviews.id })
              .from(cushEvidenceFreshnessReviews)
              .where(eq(cushEvidenceFreshnessReviews.creditEvidenceId, evidenceId)).limit(1);
        const decision = sourceDate ? "confirm_source_date" : "confirm_retrieval_date";
        const reviewValues = {
          userId: evidence.userId,
          monoEvidenceId: isMono ? evidenceId : null,
          creditEvidenceId: isMono ? null : evidenceId,
          decision,
          confirmedSourceDate: sourceDate,
          evidenceFetchedAt: evidence.fetchedAt,
          reviewedBy: req.userId!,
          reviewedAt: new Date(),
        };
        if (existingRows[0]) {
          await db.update(cushEvidenceFreshnessReviews).set(reviewValues)
            .where(eq(cushEvidenceFreshnessReviews.id, existingRows[0].id));
        } else {
          await db.insert(cushEvidenceFreshnessReviews).values(reviewValues);
        }
        await recordAdminAuditEvent(req, {
          action: sourceDate
            ? "admin.evidence_freshness.source_date_confirmed"
            : "admin.evidence_freshness.retrieval_date_confirmed",
          resourceType: `${source}_evidence`,
          resourceId: evidenceId,
        });
        return res.json({ success: true, decision, sourceDate });
      } catch (error) {
        if (isMissingEvidenceReviewSchema(error)) {
          return res.status(503).json({
            code: "EVIDENCE_FRESHNESS_SCHEMA_MISSING",
            error: "Evidence review is unavailable. Apply migrations/manual/create-cush-evidence-freshness-reviews.sql.",
          });
        }
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
            error: "Admin audit storage is not initialized. Apply migrations/manual/create-admin-audit-logs.sql first.",
          });
        }
        console.error("Admin evidence freshness review failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to save the evidence review." });
      }
    },
  );

  app.get(
    "/api/admin/overview",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.dashboardRead),
    async (req: AuthenticatedRequest, res) => {
      const requestedRange = Number(req.query.range ?? 30);
      const rangeDays = allowedRanges.includes(requestedRange as (typeof allowedRanges)[number])
        ? requestedRange
        : 30;
      const now = new Date();
      const newUserSince = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
      const activeSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      try {
        await recordAdminAuditEvent(req, {
          action: "admin.overview.read",
          resourceType: "admin_overview",
        });

        const [
          totalUsers,
          activeUsers,
          newUsers,
          emailVerifiedUsers,
          assessmentRecords,
          linkedMonoAccounts,
          creditHistoryRecords,
          recentActivity,
        ] = await Promise.all([
          db.select({ value: count() }).from(users),
          db.select({ value: count() }).from(users).where(gte(users.lastLoginAt, activeSince)),
          db.select({ value: count() }).from(users).where(gte(users.createdAt, newUserSince)),
          db.select({ value: count() }).from(users).where(eq(users.isEmailVerified, true)),
          db.select({ value: count() }).from(cushAssessmentInputs),
          db.select({ value: count() }).from(monoLinkedAccounts),
          db.select({ value: count() }).from(interswitchCreditHistoryEvidence),
          db.select({
            id: adminAuditLogs.id,
            action: adminAuditLogs.action,
            resourceType: adminAuditLogs.resourceType,
            resourceId: adminAuditLogs.resourceId,
            outcome: adminAuditLogs.outcome,
            createdAt: adminAuditLogs.createdAt,
            adminUserId: adminAuditLogs.adminUserId,
          })
            .from(adminAuditLogs)
            .orderBy(desc(adminAuditLogs.createdAt))
            .limit(8),
        ]);

        const asCount = (result: Array<{ value: number }>) => Number(result[0]?.value ?? 0);
        return res.json({
          rangeDays,
          generatedAt: new Date().toISOString(),
          metrics: {
            totalUsers: asCount(totalUsers),
            activeUsers30d: asCount(activeUsers),
            newUsers: asCount(newUsers),
            emailVerifiedUsers: asCount(emailVerifiedUsers),
            assessmentRecords: asCount(assessmentRecords),
            linkedMonoAccounts: asCount(linkedMonoAccounts),
            creditHistoryRecords: asCount(creditHistoryRecords),
          },
          recentActivity: recentActivity.map((event) => ({
            ...event,
            createdAt: event.createdAt?.toISOString() ?? "",
          })),
        });
      } catch (error) {
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
            error: "Admin audit storage is not initialized. Apply migrations/manual/create-admin-audit-logs.sql first.",
          });
        }
        console.error("Admin overview query failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to load the admin overview." });
      }
    },
  );
}
