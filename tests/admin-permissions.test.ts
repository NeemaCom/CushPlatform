import { describe, expect, it } from "vitest";
import {
  ADMIN_PERMISSION,
  hasAdminPermission,
  isAdminRole,
} from "@shared/admin-permissions";

describe("admin permission policy", () => {
  it("gives the existing admin role full access", () => {
    expect(hasAdminPermission("admin", ADMIN_PERMISSION.settingsManage)).toBe(true);
    expect(hasAdminPermission("admin", ADMIN_PERMISSION.scoringPolicyManage)).toBe(true);
  });

  it("keeps financial administrators out of technical settings", () => {
    expect(hasAdminPermission("financial_identity_admin", ADMIN_PERMISSION.scoringPolicyManage)).toBe(true);
    expect(hasAdminPermission("financial_identity_admin", ADMIN_PERMISSION.settingsManage)).toBe(false);
  });

  it("keeps read-only administrators from changing policy", () => {
    expect(hasAdminPermission("read_only_admin", ADMIN_PERMISSION.scoringPolicyRead)).toBe(true);
    expect(hasAdminPermission("read_only_admin", ADMIN_PERMISSION.scoringPolicyManage)).toBe(false);
  });

  it("limits visitor analytics to authorized admin roles", () => {
    expect(hasAdminPermission("admin", ADMIN_PERMISSION.visitorAnalyticsRead)).toBe(true);
    expect(hasAdminPermission("operations_admin", ADMIN_PERMISSION.visitorAnalyticsRead)).toBe(true);
    expect(hasAdminPermission("read_only_admin", ADMIN_PERMISSION.visitorAnalyticsRead)).toBe(true);
    expect(hasAdminPermission("financial_identity_admin", ADMIN_PERMISSION.visitorAnalyticsRead)).toBe(false);
    expect(hasAdminPermission("technical_admin", ADMIN_PERMISSION.visitorAnalyticsRead)).toBe(false);
    expect(hasAdminPermission("user", ADMIN_PERMISSION.visitorAnalyticsRead)).toBe(false);
  });

  it("does not infer admin access for ordinary roles", () => {
    for (const role of ["user", "customer", "toString", "constructor", undefined, null]) {
      expect(isAdminRole(role)).toBe(false);
      expect(hasAdminPermission(role, ADMIN_PERMISSION.dashboardRead)).toBe(false);
    }
  });
});
