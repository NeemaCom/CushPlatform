import { z } from "zod";
import {
  ASSIGNABLE_USER_ROLES,
  type AssignableUserRole,
} from "@shared/admin-permissions";

export const adminUserRoleChangeSchema = z.object({
  role: z.enum(ASSIGNABLE_USER_ROLES),
}).strict();

export type UserRoleChangeBlockReason =
  | "self_change"
  | "no_change"
  | "last_admin";

export function getUserRoleChangeBlockReason(input: {
  actorUserId: number;
  targetUserId: number;
  currentRole: string | null;
  requestedRole: AssignableUserRole;
  fullAdminCount: number;
}): UserRoleChangeBlockReason | null {
  if (input.actorUserId === input.targetUserId) return "self_change";

  const currentRole = input.currentRole ?? "user";
  if (currentRole === input.requestedRole) return "no_change";

  if (
    currentRole === "admin" &&
    input.requestedRole !== "admin" &&
    input.fullAdminCount <= 1
  ) {
    return "last_admin";
  }

  return null;
}
