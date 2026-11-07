import type { Express } from "express";
import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  ADMIN_PERMISSION,
  canManageUserRoles,
  hasAdminPermission,
} from "@shared/admin-permissions";
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
import { sendAccountStatusEmail } from "./account-status-email";
import { ageInDays, resolveEvidenceFreshnessDate } from "./evidence-freshness";
import { normalizedCreditHistorySchema } from "./interswitch-credit-history-scoring";
import { getAdminV2Assessment, isV2SchemaMissing } from "./cush-score-v2";
import {
  adminUserDirectoryQuerySchema,
  userDirectorySearchPattern,
} from "./admin-user-directory";
import {
  adminUserRoleChangeSchema,
  getUserRoleChangeBlockReason,
} from "./admin-user-roles";
import {
  adminUserStatusSchema,
  getUserStatusBlockReason,
} from "./admin-user-status";

const ADMIN_ACCESS_CHANGE_ADVISORY_LOCK_KEY = 847_216_319;

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

function isUserAccountStatusColumnMissing(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (typeof current === "object") {
      const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
      if (
        candidate.code === "42703" &&
        typeof candidate.message === "string" &&
        candidate.message.toLowerCase().includes("is_active")
      ) {
        return true;
      }
      current = candidate.cause;
    } else {
      break;
    }
  }
  return false;
}

function isCushSessionTableMissing(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (typeof current === "object") {
      const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
      if (
        candidate.code === "42P01" &&
        typeof candidate.message === "string" &&
        candidate.message.toLowerCase().includes("cush_sessions")
      ) {
        return true;
      }
      current = candidate.cause;
    } else {
      break;
    }
  }
  return false;
}

function accountStatusMigrationResponse(res: import("express").Response) {
  return res.status(503).json({
    code: "ACCOUNT_STATUS_SCHEMA_MISSING",
    error: "Account status storage is not initialized. Apply migrations/manual/add-user-account-status.sql first.",
  });
}

export function registerAdminRoutes(app: Express): void {
  app.get(
    "/api/admin/users",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.usersRead),
    async (req: AuthenticatedRequest, res) => {
      const parsed = adminUserDirectoryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: "Use a valid search and page range." });
      }

      const { q, limit, offset } = parsed.data;
      const searchFilter = q
        ? or(
            ilike(users.email, userDirectorySearchPattern(q)),
            ilike(users.username, userDirectorySearchPattern(q)),
            ilike(users.firstName, userDirectorySearchPattern(q)),
            ilike(users.lastName, userDirectorySearchPattern(q)),
          )
        : undefined;

      try {
        // Fail closed if the access itself cannot be recorded.
        await recordAdminAuditEvent(req, {
          action: "admin.users.directory_read",
          resourceType: "user_directory",
        });

        const [countRows, rows] = await Promise.all([
          db.select({ total: count() }).from(users).where(searchFilter),
          db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            isActive: users.isActive,
            isEmailVerified: users.isEmailVerified,
            createdAt: users.createdAt,
            lastLoginAt: users.lastLoginAt,
          })
            .from(users)
            .where(searchFilter)
            .orderBy(desc(users.createdAt), desc(users.id))
            .limit(limit)
            .offset(offset),
        ]);

        return res.json({
          users: rows.map((row) => ({
            ...row,
            createdAt: row.createdAt?.toISOString() ?? null,
            lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
          })),
          total: Number(countRows[0]?.total ?? 0),
          limit,
          offset,
        });
      } catch (error) {
        if (isUserAccountStatusColumnMissing(error)) {
          return accountStatusMigrationResponse(res);
        }
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
            error: "Admin audit storage is not initialized. Apply migrations/manual/create-admin-audit-logs.sql first.",
          });
        }
        console.error("Admin user directory query failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to load the user directory." });
      }
    },
  );

  app.get(
    "/api/admin/users/:id",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.usersRead),
    async (req: AuthenticatedRequest, res) => {
      const userId = Number(req.params.id);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.status(400).json({ error: "Provide a valid account ID." });
      }

      try {
        await recordAdminAuditEvent(req, {
          action: "admin.users.account_detail_read",
          resourceType: "user_account",
          resourceId: userId,
        });

        const [account] = await db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          isEmailVerified: users.isEmailVerified,
          isPhoneVerified: users.isPhoneVerified,
          mfaEnabled: users.mfaEnabled,
          acceptTerms: users.acceptTerms,
          acceptPrivacy: users.acceptPrivacy,
          marketingConsent: users.marketingConsent,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLoginAt: users.lastLoginAt,
        }).from(users).where(eq(users.id, userId)).limit(1);

        if (!account) return res.status(404).json({ error: "Account not found." });
        return res.json({
          ...account,
          createdAt: account.createdAt?.toISOString() ?? null,
          updatedAt: account.updatedAt?.toISOString() ?? null,
          lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
        });
      } catch (error) {
        if (isUserAccountStatusColumnMissing(error)) {
          return accountStatusMigrationResponse(res);
        }
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
            error: "Admin audit storage is not initialized. Apply migrations/manual/create-admin-audit-logs.sql first.",
          });
        }
        console.error("Admin user account detail lookup failed", {
          adminUserId: req.userId,
          targetUserId: userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to load account details." });
      }
    },
  );

  app.put(
    "/api/admin/users/:id/role",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.usersManage),
    async (req: AuthenticatedRequest, res) => {
      const userId = Number(req.params.id);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.status(400).json({ error: "Provide a valid account ID." });
      }
      const parsed = adminUserRoleChangeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Choose one of the supported account roles." });
      }

      try {
        const result = await db.transaction(async (tx) => {
          // Serialize role changes so concurrent requests cannot demote every full admin.
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADMIN_ACCESS_CHANGE_ADVISORY_LOCK_KEY})`);

          const [actor] = await tx.select({ role: users.role })
            .from(users)
            .where(eq(users.id, req.userId!))
            .limit(1)
            .for("update");
          if (!actor || !canManageUserRoles(actor.role)) {
            await recordAdminAuditEvent(req, {
              action: "admin.users.role_change_denied.non_full_admin",
              resourceType: "user_role",
              resourceId: userId,
              outcome: "denied",
            }, tx);
            return { kind: "not_full_admin" as const };
          }

          const [target] = await tx.select({
            id: users.id,
            role: users.role,
          }).from(users)
            .where(eq(users.id, userId))
            .limit(1)
            .for("update");

          if (!target) {
            await recordAdminAuditEvent(req, {
              action: "admin.users.role_change_target_missing",
              resourceType: "user_role",
              resourceId: userId,
              outcome: "failed",
            }, tx);
            return { kind: "not_found" as const };
          }

          const currentRole = target.role ?? "user";
          let fullAdminCount = 0;
          if (currentRole === "admin" && parsed.data.role !== "admin") {
            const [adminCount] = await tx.select({ total: count() })
              .from(users)
              .where(eq(users.role, "admin"));
            fullAdminCount = Number(adminCount?.total ?? 0);
          }

          const blockReason = getUserRoleChangeBlockReason({
            actorUserId: req.userId!,
            targetUserId: userId,
            currentRole,
            requestedRole: parsed.data.role,
            fullAdminCount,
          });

          if (blockReason === "no_change") {
            await recordAdminAuditEvent(req, {
              action: "admin.users.role_change.noop",
              resourceType: "user_role",
              resourceId: userId,
              outcome: "success",
            }, tx);
            return { kind: "unchanged" as const, role: currentRole };
          }

          if (blockReason) {
            await recordAdminAuditEvent(req, {
              action: `admin.users.role_change_denied.${blockReason}`,
              resourceType: "user_role",
              resourceId: userId,
              outcome: "denied",
            }, tx);
            return { kind: blockReason, role: currentRole };
          }

          await tx.update(users)
            .set({ role: parsed.data.role, updatedAt: new Date() })
            .where(eq(users.id, userId));

          await recordAdminAuditEvent(req, {
            action: `admin.users.role_changed.${currentRole}_to_${parsed.data.role}`,
            resourceType: "user_role",
            resourceId: userId,
          }, tx);

          return {
            kind: "updated" as const,
            previousRole: currentRole,
            role: parsed.data.role,
          };
        });

        if (result.kind === "not_found") {
          return res.status(404).json({ error: "Account not found." });
        }
        if (result.kind === "not_full_admin") {
          return res.status(403).json({ error: "Only a full admin can change account roles." });
        }
        if (result.kind === "self_change") {
          return res.status(403).json({ error: "You cannot change your own role." });
        }
        if (result.kind === "last_admin") {
          return res.status(409).json({ error: "At least one full admin must remain. Assign another full admin before demoting this account." });
        }
        if (result.kind === "unchanged") {
          return res.json({ success: true, changed: false, role: result.role });
        }
        return res.json({
          success: true,
          changed: true,
          previousRole: result.previousRole,
          role: result.role,
        });
      } catch (error) {
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
            error: "Admin audit storage is not initialized. Apply migrations/manual/create-admin-audit-logs.sql first.",
          });
        }
        console.error("Admin user role change failed", {
          adminUserId: req.userId,
          targetUserId: userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to change the account role." });
      }
    },
  );

  app.put(
    "/api/admin/users/:id/status",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.usersManage),
    async (req: AuthenticatedRequest, res) => {
      const userId = Number(req.params.id);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.status(400).json({ error: "Provide a valid account ID." });
      }
      const parsed = adminUserStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Choose active or suspended account status." });
      }

      try {
        const result = await db.transaction(async (tx) => {
          // Serialize access-state changes with role changes to preserve an active full admin.
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADMIN_ACCESS_CHANGE_ADVISORY_LOCK_KEY})`);

          const [actor] = await tx.select({ role: users.role })
            .from(users)
            .where(eq(users.id, req.userId!))
            .limit(1)
            .for("update");
          if (!actor || !hasAdminPermission(actor.role, ADMIN_PERMISSION.usersManage)) {
            await recordAdminAuditEvent(req, {
              action: "admin.users.account_status_denied.permission_changed",
              resourceType: "user_account",
              resourceId: userId,
              outcome: "denied",
            }, tx);
            return { kind: "actor_not_allowed" as const };
          }

          const [target] = await tx.select({
            id: users.id,
            role: users.role,
            isActive: users.isActive,
            email: users.email,
          }).from(users)
            .where(eq(users.id, userId))
            .limit(1)
            .for("update");

          if (!target) {
            await recordAdminAuditEvent(req, {
              action: "admin.users.account_status_target_missing",
              resourceType: "user_account",
              resourceId: userId,
              outcome: "failed",
            }, tx);
            return { kind: "not_found" as const };
          }

          const targetRole = target.role ?? "user";
          let activeAdminCount = 0;
          if (parsed.data.status === "suspended" && target.isActive && targetRole === "admin") {
            const [activeAdmins] = await tx.select({ total: count() })
              .from(users)
              .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
            activeAdminCount = Number(activeAdmins?.total ?? 0);
          }

          const blockReason = getUserStatusBlockReason({
            actorUserId: req.userId!,
            targetUserId: userId,
            actorRole: actor.role,
            targetRole,
            requestedStatus: parsed.data.status,
            targetIsActive: target.isActive,
            activeAdminCount,
          });
          if (blockReason) {
            await recordAdminAuditEvent(req, {
              action: `admin.users.account_status_denied.${blockReason}`,
              resourceType: "user_account",
              resourceId: userId,
              outcome: "denied",
            }, tx);
            return { kind: blockReason };
          }

          const nextIsActive = parsed.data.status === "active";
          if (!nextIsActive) {
            // Revoke every stored session before committing suspension.
            await tx.execute(sql`
              DELETE FROM public.cush_sessions
              WHERE sess->>'userId' = ${String(userId)}
            `);
          }

          if (target.isActive === nextIsActive) {
            await recordAdminAuditEvent(req, {
              action: nextIsActive
                ? "admin.users.account_status_noop"
                : "admin.users.account_suspension_reapplied",
              resourceType: "user_account",
              resourceId: userId,
              outcome: "success",
            }, tx);
            return { kind: "unchanged" as const, isActive: nextIsActive };
          }

          const changedAt = new Date();
          await tx.update(users)
            .set({ isActive: nextIsActive, updatedAt: changedAt })
            .where(eq(users.id, userId));

          await recordAdminAuditEvent(req, {
            action: nextIsActive
              ? "admin.users.account_reactivated"
              : "admin.users.account_suspended",
            resourceType: "user_account",
            resourceId: userId,
          }, tx);

          return {
            kind: "updated" as const,
            previousStatus: target.isActive ? "active" : "suspended",
            status: parsed.data.status,
            email: target.email,
            changedAt,
          };
        });

        if (result.kind === "not_found") {
          return res.status(404).json({ error: "Account not found." });
        }
        if (result.kind === "actor_not_allowed") {
          return res.status(403).json({ error: "Your current role cannot manage account status." });
        }
        if (result.kind === "self_change") {
          return res.status(403).json({ error: "You cannot suspend or reactivate your own account." });
        }
        if (result.kind === "admin_target_requires_full_admin") {
          return res.status(403).json({ error: "Only a full admin can change another administrator's account status." });
        }
        if (result.kind === "last_active_admin") {
          return res.status(409).json({ error: "At least one active full admin must remain." });
        }
        if (result.kind === "unchanged") {
          return res.json({
            success: true,
            changed: false,
            status: result.isActive ? "active" : "suspended",
            sessionsRevoked: !result.isActive,
            notificationStatus: "not_sent",
          });
        }
        if (result.kind !== "updated") {
          return res.status(500).json({ error: "Unable to change the account status." });
        }
        const notification = await sendAccountStatusEmail({
          userId,
          email: result.email,
          status: result.status,
          changedAt: result.changedAt,
        });
        try {
          await recordAdminAuditEvent(req, {
            action: notification.status === "sent"
              ? "admin.users.account_status_email_sent"
              : "admin.users.account_status_email_failed",
            resourceType: "user_account",
            resourceId: userId,
            outcome: notification.status === "sent" ? "success" : "failed",
          });
        } catch {
          console.error("Account status notification audit failed", {
            adminUserId: req.userId,
            targetUserId: userId,
            notificationStatus: notification.status,
          });
        }
        if (notification.status !== "sent") {
          console.warn("Account status notification was not sent", {
            adminUserId: req.userId,
            targetUserId: userId,
            status: notification.status,
            reason: notification.status === "failed" ? notification.reason : undefined,
          });
        }
        return res.json({
          success: true,
          changed: true,
          previousStatus: result.previousStatus,
          status: result.status,
          sessionsRevoked: result.status === "suspended",
          notificationStatus: notification.status,
        });
      } catch (error) {
        if (isUserAccountStatusColumnMissing(error)) {
          return accountStatusMigrationResponse(res);
        }
        if (isCushSessionTableMissing(error)) {
          return res.status(503).json({
            code: "SESSION_SCHEMA_MISSING",
            error: "Session storage is not initialized. Apply migrations/manual/create-cush-sessions-table.sql first.",
          });
        }
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
            error: "Admin audit storage is not initialized. Apply migrations/manual/create-admin-audit-logs.sql first.",
          });
        }
        console.error("Admin user account status change failed", {
          adminUserId: req.userId,
          targetUserId: userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to change the account status." });
      }
    },
  );

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
        const decision = sourceDate ? "confirm_source_date" : "confirm_retrieval_date";
        const saved = await db.transaction(async (tx) => {
          const isMono = source === "mono";
          const [evidence] = isMono
            ? await tx.select({
                id: monoV2AssessmentEvidence.id,
                userId: monoV2AssessmentEvidence.userId,
                fetchedAt: monoV2AssessmentEvidence.fetchedAt,
              }).from(monoV2AssessmentEvidence)
                .where(eq(monoV2AssessmentEvidence.id, evidenceId)).limit(1)
            : await tx.select({
                id: interswitchCreditHistoryEvidence.id,
                userId: interswitchCreditHistoryEvidence.userId,
                fetchedAt: interswitchCreditHistoryEvidence.fetchedAt,
              }).from(interswitchCreditHistoryEvidence)
                .where(eq(interswitchCreditHistoryEvidence.id, evidenceId)).limit(1);
          if (!evidence) return null;

          const existingRows = isMono
            ? await tx.select({ id: cushEvidenceFreshnessReviews.id })
                .from(cushEvidenceFreshnessReviews)
                .where(eq(cushEvidenceFreshnessReviews.monoEvidenceId, evidenceId)).limit(1)
            : await tx.select({ id: cushEvidenceFreshnessReviews.id })
                .from(cushEvidenceFreshnessReviews)
                .where(eq(cushEvidenceFreshnessReviews.creditEvidenceId, evidenceId)).limit(1);
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
            await tx.update(cushEvidenceFreshnessReviews).set(reviewValues)
              .where(eq(cushEvidenceFreshnessReviews.id, existingRows[0].id));
          } else {
            await tx.insert(cushEvidenceFreshnessReviews).values(reviewValues);
          }

          await recordAdminAuditEvent(req, {
            action: sourceDate
              ? "admin.evidence_freshness.source_date_confirmed"
              : "admin.evidence_freshness.retrieval_date_confirmed",
            resourceType: `${source}_evidence`,
            resourceId: evidenceId,
          }, tx);
          return { decision, sourceDate };
        });
        if (!saved) return res.status(404).json({ error: "Evidence record not found." });
        return res.json({ success: true, ...saved });
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
