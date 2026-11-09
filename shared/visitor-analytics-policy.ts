export const VISITOR_ANALYTICS_POLICY_VERSION = "visitor-analytics-v2";
export const VISITOR_ANALYTICS_RETENTION_DAYS = 90;

export const VISITOR_EVENT_TYPES = [
  "page_view",
  "signup_started",
  "signup_completed",
  "login_completed",
  "session_ping",
] as const;

export type VisitorEventType = (typeof VISITOR_EVENT_TYPES)[number];

export const VISITOR_ROUTE_ALLOWLIST = [
  "/",
  "/login",
  "/dashboard",
  "/admin",
  "/verify",
  "/sample",
  "/passport",
  "/passport/:share",
  "/account/profile",
  "/account/security",
  "/account/preferences",
  "/account/connected-accounts",
  "/account/financial-identity",
  "/account/documents",
  "/account/verification",
  "/support",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
] as const;

const safeRoutes = new Set<string>(VISITOR_ROUTE_ALLOWLIST);
const safeAccountSections = new Set([
  "profile",
  "security",
  "preferences",
  "connected-accounts",
  "financial-identity",
  "documents",
  "verification",
]);

export function canonicalizeVisitorRoute(path: string) {
  const pathname = path.split(/[?#]/, 1)[0] || "/";
  if (/^\/passport\/[^/]+/.test(pathname)) return "/passport/:share";
  const accountMatch = pathname.match(/^\/account\/([^/]+)/);
  if (accountMatch) {
    return safeAccountSections.has(accountMatch[1])
      ? `/account/${accountMatch[1]}`
      : null;
  }
  return safeRoutes.has(pathname) ? pathname : null;
}
