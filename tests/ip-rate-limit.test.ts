import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../server/db", () => ({ pgPool: { query: mocks.query } }));

import { canonicalizeClientIp, createIpRateLimit, hashClientIp } from "../server/ip-rate-limit";

const originalSecret = process.env.SESSION_SECRET;

function response() {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("shared IP rate limiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough";
  });

  it("normalizes IPv4-mapped and IPv6 addresses to stable network keys", () => {
    expect(canonicalizeClientIp("203.0.113.9")).toBe("203.0.113.9");
    expect(canonicalizeClientIp("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(canonicalizeClientIp("2001:db8:abcd:12::1"))
      .toBe(canonicalizeClientIp("2001:db8:abcd:12::ffff"));
    expect(canonicalizeClientIp("::ffff:c000:0201")).toBe("192.0.2.1");
  });

  it("stores only a keyed hash of the client IP and allows requests below the limit", async () => {
    mocks.query.mockResolvedValue({ rows: [{ requestCount: 1 }] });
    const req = { ip: "203.0.113.9", socket: { remoteAddress: "127.0.0.1" } } as any;
    const res = response();
    const next = vi.fn();
    const middleware = createIpRateLimit({
      scope: "auth",
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many authentication attempts.",
    });

    await middleware(req, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.setHeader).toHaveBeenCalledWith("RateLimit-Limit", "5");
    expect(res.setHeader).toHaveBeenCalledWith("RateLimit-Remaining", "4");
    const [query, values] = mocks.query.mock.calls[0] as [string, unknown[]];
    expect(query).toContain("ON CONFLICT (scope, ip_hash) DO UPDATE");
    expect(values[0]).toBe("auth");
    expect(values[1]).toBe(hashClientIp("203.0.113.9"));
    expect(values[1]).toMatch(/^[a-f0-9]{64}$/);
    expect(values).not.toContain("203.0.113.9");
  });

  it("returns 429 with retry timing when the IP exceeds its request limit", async () => {
    mocks.query.mockResolvedValue({ rows: [{ requestCount: 16 }] });
    const req = { ip: "203.0.113.10", socket: {} } as any;
    const res = response();
    const next = vi.fn();
    const middleware = createIpRateLimit({
      scope: "password-signin",
      maxRequests: 15,
      windowMs: 15 * 60 * 1000,
      message: "Too many sign-in requests.",
    });

    await middleware(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      code: "IP_RATE_LIMIT",
      message: "Too many sign-in requests.",
    });
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed when the shared rate-limit database is unavailable", async () => {
    mocks.query.mockRejectedValue(new Error("database unavailable"));
    const req = { ip: "203.0.113.11", socket: {} } as any;
    const res = response();
    const next = vi.fn();
    const middleware = createIpRateLimit({
      scope: "auth",
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many authentication attempts.",
    });

    await middleware(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      code: "RATE_LIMIT_UNAVAILABLE",
      message: "Sign-in is temporarily unavailable. Please try again shortly.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("uses the configured secret to prevent guessing stored IP hashes", () => {
    const first = hashClientIp("203.0.113.12", "first-secret-with-at-least-32-chars");
    const second = hashClientIp("203.0.113.12", "second-secret-with-at-least-32-chars");
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
});
