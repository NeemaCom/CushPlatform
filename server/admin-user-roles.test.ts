import { describe, expect, it } from "vitest";
import { ASSIGNABLE_USER_ROLES } from "@shared/admin-permissions";
import { adminUserRoleChangeSchema, getUserRoleChangeBlockReason } from "./admin-user-roles";

describe("admin user role changes", () => {
  it("accepts only the ordinary user role and defined admin roles", () => {
    for (const role of ASSIGNABLE_USER_ROLES) {
      expect(adminUserRoleChangeSchema.safeParse({ role }).success).toBe(true);
    }
    expect(adminUserRoleChangeSchema.safeParse({ role: "super_admin" }).success).toBe(false);
    expect(adminUserRoleChangeSchema.safeParse({ role: "customer" }).success).toBe(false);
    expect(adminUserRoleChangeSchema.safeParse({ role: "admin", extra: true }).success).toBe(false);
  });

  it("blocks administrators from changing their own role", () => {
    expect(getUserRoleChangeBlockReason({
      actorUserId: 4,
      targetUserId: 4,
      currentRole: "admin",
      requestedRole: "user",
      fullAdminCount: 2,
    })).toBe("self_change");
  });

  it("prevents demoting the last full admin", () => {
    expect(getUserRoleChangeBlockReason({
      actorUserId: 1,
      targetUserId: 2,
      currentRole: "admin",
      requestedRole: "read_only_admin",
      fullAdminCount: 1,
    })).toBe("last_admin");
  });

  it("allows demotion when another full admin remains", () => {
    expect(getUserRoleChangeBlockReason({
      actorUserId: 1,
      targetUserId: 2,
      currentRole: "admin",
      requestedRole: "read_only_admin",
      fullAdminCount: 2,
    })).toBeNull();
  });

  it("identifies unchanged assignments without treating them as role changes", () => {
    expect(getUserRoleChangeBlockReason({
      actorUserId: 1,
      targetUserId: 2,
      currentRole: "operations_admin",
      requestedRole: "operations_admin",
      fullAdminCount: 1,
    })).toBe("no_change");
  });
});
