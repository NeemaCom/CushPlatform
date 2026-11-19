import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({ cushVerifyDb: {} }));
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

async function invoke(method: Route["method"], path: string, body?: unknown) {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Sandbox route ${method} ${path} was not registered.`);
  const res = response();
  await route.handlers.at(-1)!({ body }, res);
  return res;
}

describe("Cush Verify API sandbox", () => {
  beforeEach(() => {
    routes.length = 0;
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
