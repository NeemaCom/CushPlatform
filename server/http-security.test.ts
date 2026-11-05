import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import {
  createSecurityHeaders,
  shouldRejectUnsafeRequest,
} from "./http-security";

const allowedOrigins = new Set([
  "https://app.we-cush.com",
  "https://cush-platform.vercel.app",
]);

describe("API request origin checks", () => {
  it("does not reject safe methods based on Origin", () => {
    expect(shouldRejectUnsafeRequest(
      "GET",
      "https://attacker.example",
      undefined,
      undefined,
      allowedOrigins,
    )).toBe(false);
  });

  it("allows state-changing requests from the configured frontend", () => {
    expect(shouldRejectUnsafeRequest(
      "POST",
      "https://cush-platform.vercel.app",
      undefined,
      "connect.sid=session",
      allowedOrigins,
    )).toBe(false);
  });

  it("allows state-changing requests from the Cush custom domain", () => {
    expect(shouldRejectUnsafeRequest(
      "POST",
      "https://app.we-cush.com",
      undefined,
      "connect.sid=session",
      allowedOrigins,
    )).toBe(false);
  });

  it("allows same-origin mutations from the active app host", () => {
    expect(shouldRejectUnsafeRequest(
      "POST",
      "https://cush-preview.replit.dev",
      undefined,
      "connect.sid=session",
      allowedOrigins,
      "https://cush-preview.replit.dev",
    )).toBe(false);
  });

  it("rejects state-changing requests from an untrusted Origin", () => {
    expect(shouldRejectUnsafeRequest(
      "DELETE",
      "https://attacker.example",
      undefined,
      "connect.sid=session",
      allowedOrigins,
    )).toBe(true);
  });

  it("uses Referer when Origin is absent", () => {
    expect(shouldRejectUnsafeRequest(
      "PUT",
      undefined,
      "https://cush-platform.vercel.app/account/profile",
      "connect.sid=session",
      allowedOrigins,
    )).toBe(false);
  });

  it("rejects cookie-authenticated mutations without Origin or Referer", () => {
    expect(shouldRejectUnsafeRequest(
      "POST",
      undefined,
      undefined,
      "theme=dark; connect.sid=session",
      allowedOrigins,
    )).toBe(true);
  });

  it("allows non-browser requests without a Cush session cookie", () => {
    expect(shouldRejectUnsafeRequest(
      "POST",
      undefined,
      undefined,
      "api-client=1",
      allowedOrigins,
    )).toBe(false);
  });
});

describe("security response headers", () => {
  it("adds baseline headers and HSTS only in production", () => {
    const headers = new Map<string, string>();
    const res = {
      setHeader: vi.fn((name: string, value: string) => {
        headers.set(name, value);
        return res;
      }),
    } as unknown as Response;
    const next = vi.fn();

    createSecurityHeaders(true)({} as Request, res, next);

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(next).toHaveBeenCalledOnce();
  });

  it("does not enable HSTS in development", () => {
    const headers = new Map<string, string>();
    const res = {
      setHeader: vi.fn((name: string, value: string) => {
        headers.set(name, value);
        return res;
      }),
    } as unknown as Response;

    createSecurityHeaders(false)({} as Request, res, vi.fn());

    expect(headers.has("Strict-Transport-Security")).toBe(false);
  });
});
