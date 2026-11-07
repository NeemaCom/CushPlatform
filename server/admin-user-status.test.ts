import { describe, expect, it } from "vitest";
import { adminUserStatusSchema, getUserStatusBlockReason } from "./admin-user-status";

describe("admin user account status", () => {
  it("accepts only active and suspended states", () => {
    expect(adminUserStatusSchema.safeParse({ status: "active" }).success).toBe(true);
    expect(adminUserStatusSchema.safeParse({ status: "suspended" }).success).toBe(true);
    expect(adminUserStatusSchema.safeParse({ status: "disabled" }).success).toBe(false);
    expect(adminUserStatusSchema.safeParse({ status: "suspended", extra: true }).success).toBe(false);
  });

  it("prevents an administrator from suspending or reactivating their own account", () => {
    expect(getUserStatusBlockReason({
      actorUserId: 4,
      targetUserId: 4,
      actorRole: "admin",
      targetRole: "admin",
      requestedStatus: "suspended",
      targetIsActive: true,
      activeAdminCount: 2,
    })).toBe("self_change");
  });

  it("limits admin-account status changes to a full admin", () => {
    expect(getUserStatusBlockReason({
      actorUserId: 1,
      targetUserId: 2,
      actorRole: "operations_admin",
      targetRole: "read_only_admin",
      requestedStatus: "suspended",
      targetIsActive: true,
      activeAdminCount: 1,
    })).toBe("admin_target_requires_full_admin");
  });

  it("prevents suspending the last active full admin", () => {
    expect(getUserStatusBlockReason({
      actorUserId: 1,
      targetUserId: 2,
      actorRole: "admin",
      targetRole: "admin",
      requestedStatus: "suspended",
      targetIsActive: true,
      activeAdminCount: 1,
    })).toBe("last_active_admin");
  });

  it("allows operations admins to suspend an ordinary account", () => {
    expect(getUserStatusBlockReason({
      actorUserId: 1,
      targetUserId: 2,
      actorRole: "operations_admin",
      targetRole: "user",
      requestedStatus: "suspended",
      targetIsActive: true,
      activeAdminCount: 1,
    })).toBeNull();
  });

  it("allows a full admin to reactivate a suspended admin account", () => {
    expect(getUserStatusBlockReason({
      actorUserId: 1,
      targetUserId: 2,
      actorRole: "admin",
      targetRole: "admin",
      requestedStatus: "active",
      targetIsActive: false,
      activeAdminCount: 0,
    })).toBeNull();
  });
});
