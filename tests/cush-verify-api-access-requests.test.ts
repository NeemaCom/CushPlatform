import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, workspaceStateMock } = vi.hoisted(() => ({
  dbMock: { transaction: vi.fn() },
  workspaceStateMock: vi.fn(),
}));

vi.mock("../server/db", () => ({ cushVerifyDb: dbMock }));
vi.mock("../server/cush-verify-institutional-routes", () => ({
  getInstitutionalWorkspaceState: workspaceStateMock,
  isInstitutionalAuthenticated: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireApprovedInstitution: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../server/cush-verify-api-key-service", () => ({
  getProductionApiAccess: vi.fn(),
  getSandboxApiLimits: vi.fn(),
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

function requestTx({ latest, existing }: {
  latest?: { id: number; status: "submitted" | "approved" | "rejected" } | null;
  existing?: Record<string, unknown> | null;
}) {
  let selectIndex = 0;
  const inserted: Array<Record<string, unknown>> = [];
  const updated: Record<string, unknown>[] = [];
  const requestRow = {
    id: 41,
    institutionId: 11,
    requestedByInstitutionalUserId: 22,
    intendedUse: "Retrieve consented applicant reports through the institution's case workflow.",
    estimatedMonthlyRequests: 150,
    status: "submitted",
    decisionNote: null,
    createdAt: new Date("2026-11-19T12:00:00.000Z"),
    reviewedAt: null,
    reviewedByAdminUserId: null,
  };
  const tx = {
    select: vi.fn(() => {
      const builder: any = {
        from() { return builder; },
        where() { return builder; },
        orderBy() { return builder; },
        for() { return builder; },
        async limit() {
          selectIndex += 1;
          if (existing) return [existing];
          return selectIndex === 2 && latest ? [latest] : [];
        },
      };
      return builder;
    }),
    insert: vi.fn(() => ({
      values(values: Record<string, unknown>) {
        inserted.push(values);
        return {
          async returning() {
            return [requestRow];
          },
        };
      },
    })),
    update: vi.fn(() => ({
      set(values: Record<string, unknown>) {
        updated.push(values);
        return {
          where() {
            return {
              async returning() {
                return [{ ...existing, ...values }];
              },
            };
          },
        };
      },
    })),
  };
  return { tx, inserted, updated, requestRow };
}

function findRoute(method: Route["method"], path: string) {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
}

describe("Cush Verify production API access request routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routes.length = 0;
    registerCushVerifyApiRoutes(buildApp());
    workspaceStateMock.mockResolvedValue({
      membershipStatus: "active",
      institutionStatus: "approved",
      applicationStatus: "approved",
      institutionId: 11,
      role: "organisation_admin",
    });
  });

  it("submits a request and records its audit event in the same transaction", async () => {
    const { tx, inserted, requestRow } = requestTx({});
    dbMock.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) => work(tx));
    const route = findRoute("post", "/api/verify/api-access-requests");
    const res = response();
    await route.handlers.at(-1)!({
      cushVerifyInstitutionalUserId: 22,
      body: {
        intendedUse: requestRow.intendedUse,
        estimatedMonthlyRequests: 150,
      },
    }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ request: { id: 41, status: "submitted" } });
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({
      institutionId: 11,
      requestedByInstitutionalUserId: 22,
      estimatedMonthlyRequests: 150,
    });
    expect(inserted[1]).toMatchObject({
      institutionId: 11,
      actorType: "organisation_admin",
      actorInstitutionalUserId: 22,
      eventType: "submitted",
    });
  });

  it("blocks duplicate pending requests and disallows non-admin institutional roles", async () => {
    const { tx, inserted } = requestTx({ latest: { id: 40, status: "submitted" } });
    dbMock.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) => work(tx));
    const route = findRoute("post", "/api/verify/api-access-requests");
    const duplicateResponse = response();
    await route.handlers.at(-1)!({
      cushVerifyInstitutionalUserId: 22,
      body: { intendedUse: "Retrieve consented applicant reports through the workflow." },
    }, duplicateResponse);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(inserted).toHaveLength(0);

    workspaceStateMock.mockResolvedValueOnce({
      membershipStatus: "active",
      institutionStatus: "approved",
      applicationStatus: "approved",
      institutionId: 11,
      role: "analyst",
    });
    const forbiddenResponse = response();
    await route.handlers.at(-1)!({
      cushVerifyInstitutionalUserId: 23,
      body: { intendedUse: "Retrieve consented applicant reports through the workflow." },
    }, forbiddenResponse);
    expect(forbiddenResponse.statusCode).toBe(403);
  });

  it("records an admin approval but keeps plan eligibility as a separate control", async () => {
    const pendingRequest = {
      id: 41,
      institutionId: 11,
      status: "submitted",
      decisionNote: null,
      reviewedAt: null,
    };
    const { tx, inserted, updated } = requestTx({ existing: pendingRequest });
    dbMock.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) => work(tx));
    const route = findRoute("put", "/api/admin/cush-verify/api-access-requests/:requestId");
    const res = response();
    await route.handlers.at(-1)!({
      params: { requestId: "41" },
      userId: 7,
      body: { decision: "approved" },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ request: { id: 41, status: "approved" } });
    expect(updated[0]).toMatchObject({ status: "approved", reviewedByAdminUserId: 7 });
    expect(inserted[0]).toMatchObject({
      requestId: 41,
      institutionId: 11,
      actorType: "cush_admin",
      actorCushUserId: 7,
      eventType: "approved",
    });
    expect(res.body).toMatchObject({
      message: "Request approved. An API-enabled subscription is still required before production keys can be created.",
    });
  });
});
