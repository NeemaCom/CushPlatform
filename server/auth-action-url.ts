import { getAllowedFrontendOrigins } from "./origin-policy";

const PRODUCTION_APP_ORIGIN = "https://app.we-cush.com";

export function getFirebaseVerificationContinueUrl(
  origin: string | undefined,
  allowedOrigins = getAllowedFrontendOrigins(),
): string {
  const safeOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : PRODUCTION_APP_ORIGIN;
  const continueUrl = new URL("/login", safeOrigin);
  continueUrl.searchParams.set("emailVerified", "1");
  return continueUrl.toString();
}
