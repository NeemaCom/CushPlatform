import type { Request, RequestHandler } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function shouldRejectUnsafeRequest(
  method: string,
  origin: string | undefined,
  referer: string | undefined,
  cookieHeader: string | undefined,
  allowedOrigins: ReadonlySet<string>,
  requestOrigin?: string,
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;

  if (origin) return !allowedOrigins.has(origin) && origin !== requestOrigin;

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return !allowedOrigins.has(refererOrigin) && refererOrigin !== requestOrigin;
    } catch {
      return true;
    }
  }

  return /(?:^|;\s*)connect\.sid=/.test(cookieHeader ?? "");
}

export function createApiOriginGuard(
  allowedOrigins: ReadonlySet<string>,
): RequestHandler {
  return (req, res, next) => {
    if (shouldRejectUnsafeRequest(
      req.method,
      req.get("Origin"),
      req.get("Referer"),
      req.get("Cookie"),
      allowedOrigins,
      `${req.protocol}://${req.get("host")}`,
    )) {
      res.status(403).json({ error: "Request origin not allowed" });
      return;
    }
    next();
  };
}

export function createSecurityHeaders(isProduction: boolean): RequestHandler {
  return (_req: Request, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (isProduction) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    }
    next();
  };
}
