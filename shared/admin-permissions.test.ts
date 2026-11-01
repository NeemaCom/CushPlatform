import { describe, expect, it } from "vitest";
import { ADMIN_PERMISSION, hasAdminPermission } from "./admin-permissions";

describe("admin score breakdown access", () => {
  it("limits per-user component detail to score reviewers and full admins", () => {
    expect(hasAdminPermission("admin", ADMIN_PERMISSION.scoreBreakdownRead)).toBe(true);
    expect(hasAdminPermission("financial_identity_admin", ADMIN_PERMISSION.scoreBreakdownRead)).toBe(true);
    expect(hasAdminPermission("read_only_admin", ADMIN_PERMISSION.scoreBreakdownRead)).toBe(false);
    expect(hasAdminPermission("user", ADMIN_PERMISSION.scoreBreakdownRead)).toBe(false);
  });
});
