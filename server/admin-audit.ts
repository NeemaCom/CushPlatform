import type { Request } from "express";
import { adminAuditLogs } from "@shared/schema";
import { db } from "./db";
import { and, gte, isNotNull, lt } from "drizzle-orm";

// Existing audit rows are intentionally outside this policy's new retention window.
export const ADMIN_AUDIT_IP_RETENTION_EFFECTIVE_AT = new Date("2026-11-07T09:33:00.000Z");

export function getAdminAuditIpRetentionCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return cutoff;
}

export async function clearExpiredAdminAuditIps(now = new Date()): Promise<number> {
  const cutoff = getAdminAuditIpRetentionCutoff(now);
  const cleared = await db
    .update(adminAuditLogs)
    .set({ ipAddress: null })
    .where(and(
      isNotNull(adminAuditLogs.ipAddress),
      gte(adminAuditLogs.createdAt, ADMIN_AUDIT_IP_RETENTION_EFFECTIVE_AT),
      lt(adminAuditLogs.createdAt, cutoff),
    ))
    .returning({ id: adminAuditLogs.id });

  return cleared.length;
}

export interface AdminAuditEvent {
  action: string;
  resourceType?: string;
  resourceId?: string | number;
  outcome?: "success" | "denied" | "failed";
}

export type AdminAuditExecutor = Pick<typeof db, "insert">;

export async function recordAdminAuditEvent(
  req: Request & { userId?: number },
  event: AdminAuditEvent,
  executor: AdminAuditExecutor = db,
): Promise<void> {
  if (!req.userId) {
    throw new Error("An authenticated admin user is required for audit records.");
  }

  await executor.insert(adminAuditLogs).values({
    adminUserId: req.userId,
    action: event.action,
    resourceType: event.resourceType ?? null,
    resourceId: event.resourceId == null ? null : String(event.resourceId),
    outcome: event.outcome ?? "success",
    ipAddress: req.ip ?? null,
  });
}

export function isAdminAuditTableMissing(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current === "object" && current !== null) {
      const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
      const message = typeof candidate.message === "string" ? candidate.message : "";
      if (
        candidate.code === "42P01" &&
        message.toLowerCase().includes("admin_audit_logs")
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
