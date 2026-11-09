export const ADMIN_PERMISSION = {
  dashboardRead: "admin.dashboard.read",
  usersRead: "admin.users.read",
  usersManage: "admin.users.manage",
  financialIdentityRead: "admin.financial_identity.read",
  scoringPolicyRead: "admin.scoring_policy.read",
  scoringPolicyManage: "admin.scoring_policy.manage",
  scoreBreakdownRead: "admin.score_breakdown.read",
  evidenceFreshnessRead: "admin.evidence_freshness.read",
  evidenceFreshnessManage: "admin.evidence_freshness.manage",
  documentsRead: "admin.documents.read",
  documentsReview: "admin.documents.review",
  verificationsRead: "admin.verifications.read",
  verificationsManage: "admin.verifications.manage",
  integrationsRead: "admin.integrations.read",
  integrationsManage: "admin.integrations.manage",
  activityRead: "admin.activity.read",
  visitorAnalyticsRead: "admin.visitor_analytics.read",
  reportsRead: "admin.reports.read",
  settingsRead: "admin.settings.read",
  settingsManage: "admin.settings.manage",
} as const;

export type AdminPermission = (typeof ADMIN_PERMISSION)[keyof typeof ADMIN_PERMISSION];

export const ADMIN_ROLES = [
  "admin",
  "operations_admin",
  "financial_identity_admin",
  "technical_admin",
  "read_only_admin",
] as const;

export const ASSIGNABLE_USER_ROLES = ["user", ...ADMIN_ROLES] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];

const allAdminPermissions = Object.values(ADMIN_PERMISSION) as AdminPermission[];

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  // Preserve the existing admin role as full access. No public flow assigns it.
  admin: allAdminPermissions,
  operations_admin: [
    ADMIN_PERMISSION.dashboardRead,
    ADMIN_PERMISSION.usersRead,
    ADMIN_PERMISSION.usersManage,
    ADMIN_PERMISSION.documentsRead,
    ADMIN_PERMISSION.documentsReview,
    ADMIN_PERMISSION.verificationsRead,
    ADMIN_PERMISSION.verificationsManage,
    ADMIN_PERMISSION.activityRead,
    ADMIN_PERMISSION.visitorAnalyticsRead,
  ],
  financial_identity_admin: [
    ADMIN_PERMISSION.dashboardRead,
    ADMIN_PERMISSION.financialIdentityRead,
    ADMIN_PERMISSION.scoringPolicyRead,
    ADMIN_PERMISSION.scoringPolicyManage,
    ADMIN_PERMISSION.scoreBreakdownRead,
    ADMIN_PERMISSION.evidenceFreshnessRead,
    ADMIN_PERMISSION.evidenceFreshnessManage,
    ADMIN_PERMISSION.activityRead,
    ADMIN_PERMISSION.reportsRead,
  ],
  technical_admin: [
    ADMIN_PERMISSION.dashboardRead,
    ADMIN_PERMISSION.integrationsRead,
    ADMIN_PERMISSION.integrationsManage,
    ADMIN_PERMISSION.activityRead,
    ADMIN_PERMISSION.settingsRead,
    ADMIN_PERMISSION.settingsManage,
  ],
  read_only_admin: [
    ADMIN_PERMISSION.dashboardRead,
    ADMIN_PERMISSION.usersRead,
    ADMIN_PERMISSION.financialIdentityRead,
    ADMIN_PERMISSION.scoringPolicyRead,
    ADMIN_PERMISSION.evidenceFreshnessRead,
    ADMIN_PERMISSION.documentsRead,
    ADMIN_PERMISSION.verificationsRead,
    ADMIN_PERMISSION.integrationsRead,
    ADMIN_PERMISSION.activityRead,
    ADMIN_PERMISSION.visitorAnalyticsRead,
    ADMIN_PERMISSION.reportsRead,
    ADMIN_PERMISSION.settingsRead,
  ],
};

export function hasAdminPermission(
  role: string | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!role || !Object.prototype.hasOwnProperty.call(ADMIN_ROLE_PERMISSIONS, role)) {
    return false;
  }
  return ADMIN_ROLE_PERMISSIONS[role as AdminRole].includes(permission);
}

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && Object.prototype.hasOwnProperty.call(ADMIN_ROLE_PERMISSIONS, role);
}

export function canManageUserRoles(role: string | null | undefined): boolean {
  return role === "admin" && hasAdminPermission(role, ADMIN_PERMISSION.usersManage);
}
