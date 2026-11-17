export const CUSH_VERIFY_HOST = "verify.we-cush.com";
export const CUSH_VERIFY_ORIGIN = `https://${CUSH_VERIFY_HOST}`;

export function isCushVerifyHost(hostname: string): boolean {
  return hostname.trim().toLowerCase() === CUSH_VERIFY_HOST;
}

export function isCushVerifyPath(pathname: string): boolean {
  const path = pathname.split(/[?#]/, 1)[0];
  return path === "/verify" || path.startsWith("/verify/");
}

export function buildCushVerifyUrl(pathname: string, search = "", hash = ""): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = new URL(path, CUSH_VERIFY_ORIGIN);
  url.search = search;
  url.hash = hash;
  return url.toString();
}
