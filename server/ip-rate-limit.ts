import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { RequestHandler } from "express";
import { pgPool } from "./db";

export type IpRateLimitScope = "auth" | "password-signin";

export interface IpRateLimitOptions {
  scope: IpRateLimitScope;
  maxRequests: number;
  windowMs: number;
  message: string;
  errorCode?: string;
  includeError?: boolean;
}

const RATE_LIMIT_ROW_RETENTION_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastCleanupAt = 0;
let cleanupPromise: Promise<void> | null = null;

function expandIPv6(address: string): number[] | null {
  let value = address.toLowerCase();
  const mappedDotted = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedDotted && isIP(mappedDotted[1]) === 4) return null;

  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const ipv4 = value.slice(lastColon + 1);
    if (isIP(ipv4) !== 4) return null;
    const octets = ipv4.split(".").map(Number);
    const groupOne = ((octets[0] << 8) | octets[1]).toString(16);
    const groupTwo = ((octets[2] << 8) | octets[3]).toString(16);
    value = `${value.slice(0, lastColon + 1)}${groupOne}:${groupTwo}`;
  }

  const halves = value.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length > 1 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8) return null;
  const parsed = groups.map((group) => Number.parseInt(group || "0", 16));
  return parsed.every(Number.isInteger) ? parsed : null;
}

export function canonicalizeClientIp(ip: string): string {
  const address = ip.trim().split("%")[0];
  const mappedDotted = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mappedDotted && isIP(mappedDotted[1]) === 4) return mappedDotted[1];
  if (isIP(address) === 4) return address;
  if (isIP(address) !== 6) return address.toLowerCase();

  const groups = expandIPv6(address);
  if (!groups) return address.toLowerCase();
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`;
  }
  return `${groups.slice(0, 4).map((group) => group.toString(16).padStart(4, "0")).join(":")}/64`;
}

export function hashClientIp(ip: string, secret = process.env.SESSION_SECRET): string {
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured before IP rate limiting can run");
  }
  return createHmac("sha256", secret).update(canonicalizeClientIp(ip)).digest("hex");
}

async function pruneExpiredRateLimitRows(nowMs: number): Promise<void> {
  if (nowMs - lastCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;
  if (cleanupPromise) return cleanupPromise;

  lastCleanupAt = nowMs;
  cleanupPromise = pgPool.query(
    `DELETE FROM public.cush_ip_rate_limits
     WHERE updated_at < $1`,
    [new Date(nowMs - RATE_LIMIT_ROW_RETENTION_MS)],
  )
    .then(() => undefined)
    .catch((error) => {
      console.warn(
        "[IP rate limit cleanup failed]",
        error instanceof Error ? error.message : "unknown",
      );
    })
    .finally(() => {
      cleanupPromise = null;
    });
  return cleanupPromise;
}

export function createIpRateLimit(options: IpRateLimitOptions): RequestHandler {
  const {
    scope,
    maxRequests,
    windowMs,
    message,
    errorCode = "IP_RATE_LIMIT",
    includeError = false,
  } = options;

  return async (req, res, next) => {
    const now = new Date();
    const bucketStartMs = Math.floor(now.getTime() / windowMs) * windowMs;
    const resetSeconds = Math.max(1, Math.ceil((bucketStartMs + windowMs - now.getTime()) / 1000));
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    try {
      const ipHash = hashClientIp(clientIp);
      const result = await pgPool.query(
        `INSERT INTO public.cush_ip_rate_limits
           (scope, ip_hash, window_start, request_count, updated_at)
         VALUES ($1, $2, $3, 1, now())
         ON CONFLICT (scope, ip_hash) DO UPDATE SET
           window_start = GREATEST(public.cush_ip_rate_limits.window_start, EXCLUDED.window_start),
           request_count = CASE
             WHEN public.cush_ip_rate_limits.window_start < EXCLUDED.window_start THEN 1
             ELSE public.cush_ip_rate_limits.request_count + 1
           END,
           updated_at = now()
         RETURNING request_count AS "requestCount"`,
        [scope, ipHash, new Date(bucketStartMs)],
      );
      const requestCount = Number(result.rows[0]?.requestCount ?? 0);
      void pruneExpiredRateLimitRows(now.getTime());
      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - requestCount)));
      res.setHeader("RateLimit-Reset", String(resetSeconds));

      if (requestCount > maxRequests) {
        res.setHeader("Retry-After", String(resetSeconds));
        return res.status(429).json({
          ...(includeError ? { error: message } : {}),
          code: errorCode,
          message,
        });
      }
      return next();
    } catch (error) {
      console.error(`[IP rate limit unavailable] scope=${scope}`, error instanceof Error ? error.message : "unknown");
      return res.status(503).json({
        code: "RATE_LIMIT_UNAVAILABLE",
        message: "Sign-in is temporarily unavailable. Please try again shortly.",
      });
    }
  };
}
