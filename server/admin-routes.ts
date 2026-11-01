import type { Express } from "express";
import { count, desc, eq, gte } from "drizzle-orm";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import {
  adminAuditLogs,
  cushAssessmentInputs,
  interswitchCreditHistoryEvidence,
  monoLinkedAccounts,
  users,
} from "@shared/schema";
import { db } from "./db";
import { isAuthenticated, requireAdminPermission, type AuthenticatedRequest } from "./auth";
import { isAdminAuditTableMissing, recordAdminAuditEvent } from "./admin-audit";

const allowedRanges = [7, 30, 90] as const;

export function registerAdminRoutes(app: Express): void {
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
