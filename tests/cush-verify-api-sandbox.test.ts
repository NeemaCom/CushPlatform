import { beforeEach, describe, expect, it, vi } from "vitest";

const { database } = vi.hoisted(() => ({
  database: { select: vi.fn() },
}));

vi.mock("../server/db", () => ({ cushVerifyDb: database }));
vi.mock("../server/cush-verify-institutional-routes", () => ({
  getInstitutionalWorkspaceState: vi.fn(),
  isInstitutionalAuthenticated: vi.fn(),
  requireApprovedInstitution: vi.fn(),
}));
vi.mock("../server/cush-verify-api-key-service", () => ({
  getProductionApiAccess: vi.fn(),
  mintCushVerifyApiKey: vi.fn(),
  registerCushVerifyApiMiddleware: vi.fn(),
  requireCushVerifyApiScope: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

import type { Express } from "express";
import { registerCushVerifyApiRoutes } from "../server/cush-verify-api-routes";
import {
  cushVerifyApiUsage,
  cushVerifyBillingAccounts,
  cushVerifySubscriptions,
} from "@shared/schema";

type Handler = (...args: any[]) => unknown;
type Route = { method: "get" | "post" | "put"; path: string; handlers: Handler[] };
const routes: Route[] = [];

function buildApp() {
  return {
    use() {},
    get(path: string, ...handlers: Handler[]) {
      routes.push({ method: "get", path, handlers });
    },
    post(path: string, ...handlers: Handler[]) {
      routes.push({ method: "post", path, handlers });
    },
    put(path: string, ...handlers: Handler[]) {
      routes.push({ method: "put", path, handlers });
    },
  } as unknown as Express;
}

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

function createUsageQueryBuilder() {
  let table: unknown;
  const builder: any = {
    from(value: unknown) {
      table = value;
      return builder;
    },
    where() {
      return builder;
    },
    orderBy() {
      return builder;
    },
    async limit() {
      if (table === cushVerifyBillingAccounts) {
        return [{
          availableCredits: 8,
          currentPeriodUsed: 2,
          currentPeriodStartAt: new Date("2026-11-01T00:00:00.000Z"),
          currentPeriodEndAt: new Date("2026-12-01T00:00:00.000Z"),
        }];
      }
      if (table === cushVerifySubscriptions) {
        return [{
          includedReports: 10,
          currentPeriodStartAt: new Date("2026-11-01T00:00:00.000Z"),
          currentPeriodEndAt: new Date("2026-12-01T00:00:00.000Z"),
        }];
      }
      return [];
    },
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      const rows = table === cushVerifyApiUsage
        ? [{ total: 7, successful: 5, failed: 2, rateLimited: 1, reportsConsumed: 1 }]
        : [];
      return Promise.resolve(rows).then(resolve, reject);
    },
  };
  return builder;
}

async function invoke(method: Route["method"], path: string, body?: unknown, context?: unknown) {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Sandbox route ${method} ${path} was not registered.`);
  const res = response();
  await route.handlers.at(-1)!({ body, query: {}, cushVerifyApiContext: context }, res);
  return res;
}

describe("Cush Verify API sandbox", () => {
  beforeEach(() => {
    routes.length = 0;
    database.select.mockImplementation(() => createUsageQueryBuilder());
    registerCushVerifyApiRoutes(buildApp());
  });

  it("reports that sandbox calls are isolated and free", async () => {
    const result = await invoke("get", "/api/v1/sandbox/status");
    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      environment: "sandbox",
      liveData: false,
      reportCreditsUsed: 0,
    });
  });

  it("registers the versioned usage summary for the sandbox key", () => {
    expect(routes.some((route) => route.method === "get" && route.path === "/api/v1/sandbox/usage")).toBe(true);
  });

  it("returns sandbox usage without exposing production credit balances", async () => {
    const result = await invoke("get", "/api/v1/sandbox/usage", undefined, {
      institutionId: 31,
      environment: "sandbox",
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      environment: "sandbox",
      summary: { totalRequests: 7, successfulRequests: 5, failedRequests: 2, reportsConsumed: 1 },
      credits: null,
    });
  });

  it("returns production allocation and remaining credits only for the API key's institution", async () => {
    const result = await invoke("get", "/api/v1/usage", undefined, {
      institutionId: 31,
      environment: "production",
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      environment: "production",
      credits: {
        allocatedThisPeriod: 10,
        remaining: 8,
        usedThisPeriod: 2,
      },
    });
  });

  it.each([
    ["authorized", 200, "authorized"],
    ["declined", 200, "declined"],
    ["expired", 410, undefined],
    ["failed_report", 503, undefined],
    ["unauthorized", 403, undefined],
    ["rate_limited", 429, undefined],
  ] as const)("simulates %s without billing", async (scenario, statusCode, expectedStatus) => {
    const result = await invoke("post", "/api/v1/sandbox/report-workflow", { scenario });
    expect(result.statusCode).toBe(statusCode);
    expect(JSON.stringify(result.body)).toContain("creditsUsed");
    if (expectedStatus) expect(result.body).toMatchObject({ status: expectedStatus, creditsUsed: 0 });
    expect(JSON.stringify(result.body)).toContain('"simulated":true');
  });

  it("returns only a synthetic discovery label", async () => {
    const result = await invoke("post", "/api/v1/sandbox/discovery", { scenario: "match" });
    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      environment: "sandbox",
      simulated: true,
      matchFound: true,
      displayLabel: "Synthetic test profile",
      financialInformation: null,
    });
    expect(JSON.stringify(result.body)).not.toContain("email");
  });
});
