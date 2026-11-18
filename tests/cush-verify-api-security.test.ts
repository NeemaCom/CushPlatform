import { describe, expect, it } from "vitest";
import {
  findCushVerifyApiLimitViolation,
  mintCushVerifyApiKey,
  parseCushVerifyApiKey,
  requireCushVerifyApiScope,
  requiredCushVerifyApiScopeForRequest,
} from "../server/cush-verify-api-key-service";
import { cushVerifyPricingApiLimitsSchema } from "@shared/cush-verify-pricing";

describe("Cush Verify API credential handling", () => {
  it.each(["sandbox", "production"] as const)("mints a %s key with a verifiable prefix and hash", (environment) => {
    const minted = mintCushVerifyApiKey(environment);
    const parsed = parseCushVerifyApiKey(minted.secret);
    expect(parsed).toEqual({
      keyPrefix: minted.keyPrefix,
      environment,
      secretHash: minted.secretHash,
    });
    expect(minted.secret).not.toContain(minted.secretHash);
    expect(minted.keyPrefix).toMatch(new RegExp(`^cvk_${environment}_[a-f0-9]{24}$`));
  });

  it("rejects malformed or tampered API keys", () => {
    const minted = mintCushVerifyApiKey("production");
    expect(parseCushVerifyApiKey("")).toBeNull();
    expect(parseCushVerifyApiKey("cvk_production_invalid.secret")).toBeNull();
    expect(parseCushVerifyApiKey(`${minted.secret}x`)).toBeNull();
  });
});

describe("Cush Verify configured API limits", () => {
  const now = new Date("2026-11-18T12:34:45.000Z");
  const limits = cushVerifyPricingApiLimitsSchema.parse({
    requestsPerMinute: 10,
    requestsPerHour: 100,
    maxConcurrentRequests: 4,
    monthlyReportLimit: 50,
  });

  it("allows requests below configured limits", () => {
    expect(findCushVerifyApiLimitViolation(limits, {
      requestsInMinute: 9,
      requestsInHour: 90,
      inFlightRequests: 3,
    }, now)).toBeNull();
  });

  it("enforces the per-minute limit with a retry reset", () => {
    expect(findCushVerifyApiLimitViolation(limits, {
      requestsInMinute: 10,
      requestsInHour: 10,
      inFlightRequests: 1,
    }, now)).toMatchObject({
      limit: 10,
      used: 10,
      resetAt: new Date("2026-11-18T12:35:00.000Z"),
    });
  });

  it("enforces the hourly and concurrent limits", () => {
    expect(findCushVerifyApiLimitViolation(limits, {
      requestsInMinute: 1,
      requestsInHour: 100,
      inFlightRequests: 0,
    }, now)?.message).toContain("per-hour");
    expect(findCushVerifyApiLimitViolation(limits, {
      requestsInMinute: 1,
      requestsInHour: 10,
      inFlightRequests: 4,
    }, now)?.message).toContain("concurrent");
  });

  it("treats unconfigured plan limits as unlimited", () => {
    expect(findCushVerifyApiLimitViolation({
      requestsPerMinute: null,
      requestsPerHour: null,
      maxConcurrentRequests: null,
      monthlyReportLimit: null,
    }, {
      requestsInMinute: 100_000,
      requestsInHour: 1_000_000,
      inFlightRequests: 1_000,
    }, now)).toBeNull();
  });
});

describe("Cush Verify API scope enforcement", () => {
  function invokeScope(scope: "passport:discover" | "reports:request" | "reports:read" | "sandbox:simulate", apiScopes?: string[]) {
    let nextCalled = false;
    let responseStatus = 200;
    let responseBody: unknown;
    const req = apiScopes ? {
      cushVerifyApiContext: { scopes: apiScopes },
    } : {};
    const res = {
      status(status: number) {
        responseStatus = status;
        return this;
      },
      json(body: unknown) {
        responseBody = body;
        return this;
      },
    };
    requireCushVerifyApiScope(scope)(req as never, res as never, () => {
      nextCalled = true;
    });
    return { nextCalled, responseStatus, responseBody };
  }

  it("lets authenticated web-session routes pass through without API context", () => {
    expect(invokeScope("reports:read")).toMatchObject({ nextCalled: true, responseStatus: 200 });
  });

  it("blocks a key that lacks the endpoint permission", () => {
    expect(invokeScope("reports:read", ["reports:request"])).toMatchObject({
      nextCalled: false,
      responseStatus: 403,
      responseBody: { code: "CUSH_VERIFY_API_SCOPE_REQUIRED" },
    });
  });

  it("allows a key with the required endpoint permission", () => {
    expect(invokeScope("sandbox:simulate", ["sandbox:simulate"])).toMatchObject({
      nextCalled: true,
      responseStatus: 200,
    });
  });

  it("requires the sandbox-only permission for every synthetic endpoint", () => {
    for (const originalUrl of [
      "/api/v1/sandbox/status",
      "/api/v1/sandbox/discovery",
      "/api/v1/sandbox/report-workflow",
    ]) {
      expect(requiredCushVerifyApiScopeForRequest({ originalUrl, method: "POST" } as never)).toBe("sandbox:simulate");
    }
  });
});

