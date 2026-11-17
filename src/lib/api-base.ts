// Empty means same-origin /api requests; a configured value is an origin, not an /api path.
import { isCushVerifyHost } from "./cush-verify-domain";

export function getApiBaseUrl(hostname: string | undefined, configuredUrl: string | undefined): string {
  if (hostname && isCushVerifyHost(hostname)) return "";
  return (configuredUrl || "").replace(/\/$/, "");
}

const hostname = typeof window === "undefined" ? undefined : window.location.hostname;
export const API_BASE_URL = getApiBaseUrl(hostname, import.meta.env.VITE_API_URL);