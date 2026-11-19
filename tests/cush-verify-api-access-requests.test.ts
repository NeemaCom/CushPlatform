import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, dbUpdateValues, workspaceStateMock, sendApiAccessEmailMock } = vi.hoisted(() => ({
  dbMock: { transaction: vi.fn(), select: vi.fn(), update: vi.fn(), insert: vi.fn() },
  dbUpdateValues: [] as Array<Record<string, unknown>>,
  workspaceStateMock: vi.fn(),
  sendApiAccessEmailMock: vi.fn(),
}));

vi.mock("../server/db", () => ({ cushVerifyDb: dbMock }));
vi.mock("../server/cush-verify-api-access-email", () => ({
  sendCushVerifyApiAccessApprovedEmail: sendApiAccessEmailMock,
}));
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
      emailNotificationStatus: null,
      emailNotificationAttemptCount: 0,
      emailNotificationAttemptedAt: null,
      emailNotificationLastAttemptedByAdminUserId: null,
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
    dbUpdateValues.length = 0;
    routes.length = 0;
    registerCushVerifyApiRoutes(buildApp());
    workspaceStateMock.mockResolvedValue({
      membershipStatus: "active",
      institutionStatus: "approved",
      applicationStatus: "approved",
      institutionId: 11,
      role: "organisation_admin",
    });
    sendApiAccessEmailMock.mockResolvedValue({ status: "sent" });
    dbMock.update.mockImplementation(() => ({
      set(values: Record<string, unknown>) {
        dbUpdateValues.push(values);
        return { where: async () => undefined };
      },
    }));
    dbMock.insert.mockImplementation(() => ({
      values: async () => undefined,
    }));
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
    dbMock.select.mockImplementation(() => {
      const builder: any = {
        from() { return builder; },
        innerJoin() { return builder; },
        where() { return builder; },
        async limit() {
          return [{ email: "admin@example.com", fullName: "Amina Admin", institutionName: "Example Housing" }];
        },
      };
      return builder;
    });
    const route = findRoute("put", "/api/admin/cush-verify/api-access-requests/:requestId");
    const res = response();
    await route.handlers.at(-1)!({
      params: { requestId: "41" },
      userId: 7,
      body: { decision: "approved" },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      request: {
        id: 41,
        status: "approved",
        emailNotificationStatus: "sent",
        emailNotificationAttemptCount: 1,
      },
    });
    expect(res.body).toMatchObject({ emailNotificationStatus: "sent" });
    expect(updated[0]).toMatchObject({
      status: "approved",
      reviewedByAdminUserId: 7,
      emailNotificationStatus: "sending",
      emailNotificationAttemptCount: 1,
      emailNotificationLastAttemptedByAdminUserId: 7,
    });
    expect(dbUpdateValues).toContainEqual({ emailNotificationStatus: "sent" });
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
    expect(sendApiAccessEmailMock).toHaveBeenCalledWith({
      email: "admin@example.com",
      contactName: "Amina Admin",
      institutionName: "Example Housing",
      requestId: 41,
    });
  });

  it("keeps an approval successful when its email notification fails", async () => {
    const pendingRequest = {
      id: 41,
      institutionId: 11,
      status: "submitted",
      decisionNote: null,
      reviewedAt: null,
    };
    const { tx } = requestTx({ existing: pendingRequest });
    dbMock.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) => work(tx));
    dbMock.select.mockImplementation(() => {
      const builder: any = {
        from() { return builder; },
        innerJoin() { return builder; },
        where() { return builder; },
        async limit() {
          return [{ email: "admin@example.com", fullName: "Amina Admin", institutionName: "Example Housing" }];
        },
      };
      return builder;
    });
    sendApiAccessEmailMock.mockResolvedValue({ status: "failed" });
    const route = findRoute("put", "/api/admin/cush-verify/api-access-requests/:requestId");
    const res = response();

    await route.handlers.at(-1)!({
      params: { requestId: "41" },
      userId: 7,
      body: { decision: "approved" },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      request: { id: 41, status: "approved" },
      emailNotificationStatus: "failed",
    });
  });

  it("persists failed delivery, retries only through the admin endpoint, and records the retry result", async () => {
    const lastAttempt = new Date("2026-11-19T11:59:00.000Z");
    const retryRequest = {
      id: 41,
      institutionId: 11,
      status: "approved",
      emailNotificationStatus: "failed",
      emailNotificationAttemptCount: 1,
      emailNotificationAttemptedAt: lastAttempt,
      emailNotificationLastAttemptedByAdminUserId: 6,
    };
    const { tx, inserted, updated } = requestTx({ existing: retryRequest });
    dbMock.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) => work(tx));
    dbMock.select.mockImplementation(() => {
      const builder: any = {
        from() { return builder; },
        innerJoin() { return builder; },
        where() { return builder; },
        async limit() {
          return [{ email: "admin@example.com", fullName: "Amina Admin", institutionName: "Example Housing" }];
        },
      };
      return builder;
    });
    const route = findRoute("post", "/api/admin/cush-verify/api-access-requests/:requestId/email/retry");
    const res = response();

    await route.handlers.at(-1)!({ params: { requestId: "41" }, userId: 7 }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      emailNotificationStatus: "sent",
      emailNotificationAttemptCount: 2,
    });
    expect(sendApiAccessEmailMock).toHaveBeenCalledWith({
      email: "admin@example.com",
      contactName: "Amina Admin",
      institutionName: "Example Housing",
      requestId: 41,
    });
    expect(updated[0]).toMatchObject({
      emailNotificationStatus: "sending",
      emailNotificationAttemptCount: 2,
      emailNotificationLastAttemptedByAdminUserId: 7,
    });
    expect(inserted).toContainEqual(expect.objectContaining({
      eventType: "approval_email_retry_started",
      actorCushUserId: 7,
      details: { attemptNumber: 2 },
    }));
    expect(dbMock.insert).toHaveBeenCalled();
    expect(dbUpdateValues).toContainEqual({ emailNotificationStatus: "sent" });
  });

  it("does not send a duplicate approval email when Resend previously accepted it", async () => {
    const { tx } = requestTx({
      existing: {
        id: 41,
        institutionId: 11,
        status: "approved",
        emailNotificationStatus: "sent",
        emailNotificationAttemptCount: 1,
        emailNotificationAttemptedAt: new Date(),
        emailNotificationLastAttemptedByAdminUserId: 7,
      },
    });
    dbMock.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) => work(tx));
    const route = findRoute("post", "/api/admin/cush-verify/api-access-requests/:requestId/email/retry");
    const res = response();

    await route.handlers.at(-1)!({ params: { requestId: "41" }, userId: 7 }, res);

    expect(res.statusCode).toBe(409);
    expect(sendApiAccessEmailMock).not.toHaveBeenCalled();
  });

  it("allows retry after an earlier email attempt had no sender configuration", async () => {
    const { tx } = requestTx({
      existing: {
        id: 41,
        institutionId: 11,
        status: "approved",
        emailNotificationStatus: "not_configured",
        emailNotificationAttemptCount: 1,
        emailNotificationAttemptedAt: new Date(),
        emailNotificationLastAttemptedByAdminUserId: 7,
      },
    });
    dbMock.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) => work(tx));
    dbMock.select.mockImplementation(() => {
      const builder: any = {
        from() { return builder; },
        innerJoin() { return builder; },
        where() { return builder; },
        async limit() {
          return [{ email: "admin@example.com", fullName: "Amina Admin", institutionName: "Example Housing" }];
        },
      };
      return builder;
    });
    sendApiAccessEmailMock.mockResolvedValue({ status: "not_configured" });
    const route = findRoute("post", "/api/admin/cush-verify/api-access-requests/:requestId/email/retry");
    const res = response();

    await route.handlers.at(-1)!({ params: { requestId: "41" }, userId: 7 }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      emailNotificationStatus: "not_configured",
      emailNotificationAttemptCount: 2,
    });
    expect(sendApiAccessEmailMock).toHaveBeenCalledTimes(1);
  });

  it("returns saved email status and attempt time in the admin queue after reload", async () => {
    const attemptedAt = new Date("2026-11-19T12:30:00.000Z");
    dbMock.select.mockImplementation(() => {
      const builder: any = {
        from() { return builder; },
        innerJoin() { return builder; },
        orderBy() { return builder; },
        async limit() {
          return [{
            id: 41,
            institutionId: 11,
            institutionName: "Example Housing",
            institutionType: "housing",
            requesterName: "Amina Admin",
            requesterEmail: "admin@example.com",
            intendedUse: "Retrieve consented applicant reports through the institution's case workflow.",
            estimatedMonthlyRequests: 150,
            status: "approved",
            decisionNote: null,
            emailNotificationStatus: "failed",
            emailNotificationAttemptCount: 2,
            emailNotificationAttemptedAt: attemptedAt,
            createdAt: new Date("2026-11-19T12:00:00.000Z"),
            reviewedAt: new Date("2026-11-19T12:10:00.000Z"),
          }];
        },
      };
      return builder;
    });
    const route = findRoute("get", "/api/admin/cush-verify/api-access-requests");
    const res = response();

    await route.handlers.at(-1)!({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      requests: [{
        emailNotificationStatus: "failed",
        emailNotificationAttemptCount: 2,
        emailNotificationAttemptedAt: attemptedAt.toISOString(),
      }],
    });
  });
});
