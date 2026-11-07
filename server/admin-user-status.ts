import { z } from "zod";
import { canManageUserRoles, isAdminRole } from "@shared/admin-permissions";

export const adminUserStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
}).strict();

export type UserStatusBlockReason =
  | "self_change"
  | "admin_target_requires_full_admin"
  | "last_active_admin";

export function getUserStatusBlockReason(input: {
  actorUserId: number;
  targetUserId: number;
  actorRole: string | null;
  targetRole: string | null;
  requestedStatus: "active" | "suspended";
  targetIsActive: boolean;
  activeAdminCount: number;
}): UserStatusBlockReason | null {
  if (input.actorUserId === input.targetUserId) return "self_change";

  if (isAdminRole(input.targetRole) && !canManageUserRoles(input.actorRole)) {
    return "admin_target_requires_full_admin";
  }

  if (
    input.requestedStatus === "suspended" &&
    input.targetIsActive &&
    input.targetRole === "admin" &&
    input.activeAdminCount <= 1
  ) {
    return "last_active_admin";
  }

  return null;
}
