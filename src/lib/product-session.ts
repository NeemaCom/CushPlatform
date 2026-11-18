/**
 * Selects the isolated institutional session store on Verify-origin requests.
 * This header is only a routing hint; server authorization still depends on
 * the separate Verify session cookie and the institutional account checks.
 */
export function getProductSessionHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const isVerify =
    import.meta.env.VITE_DEFAULT_APP === "verify" ||
    window.location.hostname.toLowerCase() === "verify.we-cush.com";

  return isVerify ? { "X-Cush-Product": "verify" } : {};
}
