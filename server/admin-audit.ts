import type { Request } from "express";
import { adminAuditLogs } from "@shared/schema";
import { db } from "./db";

export interface AdminAuditEvent {
  action: string;
  resourceType?: string;
  resourceId?: string | number;
  outcome?: "success" | "denied" | "failed";
}

export async function recordAdminAuditEvent(
  req: Request & { userId?: number },
  event: AdminAuditEvent,
): Promise<void> {
  if (!req.userId) {
    throw new Error("An authenticated admin user is required for audit records.");
  }

  await db.insert(adminAuditLogs).values({
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
