import { describe, expect, it } from "vitest";
import {
  ADMIN_PERMISSION,
  canManageUserRoles,
  hasAdminPermission,
} from "./admin-permissions";

describe("admin score breakdown access", () => {
  it("limits per-user component detail to score reviewers and full admins", () => {
    expect(hasAdminPermission("admin", ADMIN_PERMISSION.scoreBreakdownRead)).toBe(true);
    expect(hasAdminPermission("financial_identity_admin", ADMIN_PERMISSION.scoreBreakdownRead)).toBe(true);
    expect(hasAdminPermission("read_only_admin", ADMIN_PERMISSION.scoreBreakdownRead)).toBe(false);
    expect(hasAdminPermission("user", ADMIN_PERMISSION.scoreBreakdownRead)).toBe(false);
  });

  it("reserves role assignment for the full admin role", () => {
    expect(canManageUserRoles("admin")).toBe(true);
    expect(canManageUserRoles("operations_admin")).toBe(false);
    expect(canManageUserRoles("financial_identity_admin")).toBe(false);
    expect(canManageUserRoles("user")).toBe(false);
    expect(hasAdminPermission("operations_admin", ADMIN_PERMISSION.usersManage)).toBe(true);
  });
});
