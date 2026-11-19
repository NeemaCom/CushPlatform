import { describe, expect, it } from "vitest";
import {
  findCushVerifyApiLimitViolation,
  mintCushVerifyApiKey,
  parseCushVerifyApiKey,
  requireCushVerifyApiScope,
  resolveProductionApiAccessEntitlement,
  requiredCushVerifyApiScopeForRequest,
} from "../server/cush-verify-api-key-service";
import { cushVerifyPricingApiLimitsSchema } from "@shared/cush-verify-pricing";
import {
  createCushVerifyApiAccessRequestSchema,
  decideCushVerifyApiAccessRequestSchema,
  cushVerifyApiPublicUsageQuerySchema,
  cushVerifyApiReportHistoryQuerySchema,
} from "@shared/cush-verify-api";

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
  function invokeScope(scope: "passport:discover" | "reports:request" | "reports:read" | "usage:read" | "webhooks:manage" | "sandbox:simulate", apiScopes?: string[]) {
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
    expect(requiredCushVerifyApiScopeForRequest({
      originalUrl: "/api/v1/sandbox/usage",
      method: "GET",
    } as never)).toBe("sandbox:simulate");
  });

  it("requires separate usage and report-read scopes for versioned resources", () => {
    expect(requiredCushVerifyApiScopeForRequest({
      originalUrl: "/api/v1/usage",
      method: "GET",
    } as never)).toBe("usage:read");
    expect(requiredCushVerifyApiScopeForRequest({
      originalUrl: "/api/v1/usage/breakdown",
      method: "GET",
    } as never)).toBe("usage:read");
    expect(requiredCushVerifyApiScopeForRequest({
      originalUrl: "/api/v1/verify/report-requests/b70fa5c4-0f68-4cc8-b7b7-2f4db5af59a1",
      method: "GET",
    } as never)).toBe("reports:read");
    expect(requiredCushVerifyApiScopeForRequest({
      originalUrl: "/api/v1/reports/17",
      method: "GET",
    } as never)).toBe("reports:read");
    expect(invokeScope("usage:read", ["reports:read"])).toMatchObject({
      nextCalled: false,
      responseStatus: 403,
    });
    expect(invokeScope("usage:read", ["usage:read"])).toMatchObject({
      nextCalled: true,
      responseStatus: 200,
    });
  });

  it("requires the webhook-management permission for all versioned webhook routes", () => {
    for (const [originalUrl, method] of [
      ["/api/v1/webhooks", "GET"],
      ["/api/v1/webhooks", "POST"],
      ["/api/v1/webhooks/7", "PATCH"],
      ["/api/v1/webhooks/7/deliveries", "GET"],
      ["/api/v1/webhooks/7/rotate-secret", "POST"],
    ]) {
      expect(requiredCushVerifyApiScopeForRequest({ originalUrl, method } as never)).toBe("webhooks:manage");
    }
    expect(invokeScope("webhooks:manage", ["reports:read"])).toMatchObject({
      nextCalled: false,
      responseStatus: 403,
    });
    expect(invokeScope("webhooks:manage", ["webhooks:manage"])).toMatchObject({
      nextCalled: true,
      responseStatus: 200,
    });
  });
});

describe("Cush Verify versioned API query validation", () => {
  it("provides bounded report-history pagination defaults", () => {
    expect(cushVerifyApiReportHistoryQuerySchema.parse({})).toEqual({
      limit: 20,
      offset: 0,
    });
    expect(cushVerifyApiReportHistoryQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(cushVerifyApiReportHistoryQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);
  });

  it("rejects overlong usage ranges and client-selected environments", () => {
    expect(cushVerifyApiPublicUsageQuerySchema.safeParse({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-04-15T00:00:00.000Z",
    }).success).toBe(false);
    expect(cushVerifyApiPublicUsageQuerySchema.safeParse({ environment: "production" }).success).toBe(false);
  });
});

describe("Cush Verify production API access approval gate", () => {
  it("does not enable API access from Cush approval alone when the plan excludes API", () => {
    expect(resolveProductionApiAccessEntitlement(false, "approved")).toEqual({
      enabled: false,
      reason: "Your current subscription does not include production API access.",
    });
  });

  it.each([
    [null, "Submit a production API access request to enable production keys."],
    ["submitted", "Your production API access request is awaiting Cush review."],
    ["rejected", "Your production API access request was not approved. You may submit a new request."],
  ] as const)("keeps production API disabled when the plan includes API but request status is %s", (status, reason) => {
    expect(resolveProductionApiAccessEntitlement(true, status)).toEqual({ enabled: false, reason });
  });

  it("enables production API only when both the plan and Cush review allow it", () => {
    expect(resolveProductionApiAccessEntitlement(true, "approved")).toEqual({
      enabled: true,
      reason: null,
    });
  });
});

describe("Cush Verify production API access request validation", () => {
  it("requires a clear use case and bounds optional request volume", () => {
    expect(createCushVerifyApiAccessRequestSchema.safeParse({ intendedUse: "Too short" }).success).toBe(false);
    expect(createCushVerifyApiAccessRequestSchema.safeParse({
      intendedUse: "Use the API to retrieve consented applicant reports.",
      estimatedMonthlyRequests: 1200,
    }).success).toBe(true);
    expect(createCushVerifyApiAccessRequestSchema.safeParse({
      intendedUse: "Use the API to retrieve consented applicant reports.",
      estimatedMonthlyRequests: 10_000_001,
    }).success).toBe(false);
  });

  it("requires an explanation for rejected requests", () => {
    expect(decideCushVerifyApiAccessRequestSchema.safeParse({
      decision: "rejected",
    }).success).toBe(false);
    expect(decideCushVerifyApiAccessRequestSchema.safeParse({
      decision: "rejected",
      decisionNote: "Please provide more details.",
    }).success).toBe(true);
    expect(decideCushVerifyApiAccessRequestSchema.safeParse({
      decision: "approved",
    }).success).toBe(true);
  });
});

