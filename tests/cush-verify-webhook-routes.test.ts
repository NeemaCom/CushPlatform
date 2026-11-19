import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

const { database, getMembership } = vi.hoisted(() => ({
  database: { select: vi.fn() },
  getMembership: vi.fn(),
}));

vi.mock("../server/db", () => ({ cushVerifyDb: database }));
vi.mock("../server/cush-verify-institutional-routes", () => ({
  getInstitutionalWorkspaceState: getMembership,
  requireApprovedInstitution: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../server/cush-verify-api-key-service", () => ({
  requireCushVerifyApiScope: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { registerCushVerifyWebhookRoutes } from "../server/cush-verify-webhook-routes";

type Handler = (...args: any[]) => unknown;
type RegisteredRoute = { method: string; path: string; handlers: Handler[] };
const registered: RegisteredRoute[] = [];

function buildApp() {
  const add = (method: string) => (path: string, ...handlers: Handler[]) => {
    registered.push({ method, path, handlers });
  };
  return {
    get: add("get"),
    post: add("post"),
    patch: add("patch"),
    delete: add("delete"),
  } as unknown as Express;
}

function makeResponse() {
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

function selectBuilder(rows: unknown[]) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(async () => rows),
  };
  return builder;
}

async function invokeList() {
  const route = registered.find((entry) => entry.method === "get" && entry.path === "/api/v1/webhooks");
  if (!route) throw new Error("Webhook list route was not registered.");
  const res = makeResponse();
  await route.handlers.at(-1)!({
    cushVerifyInstitutionalUserId: 77,
    cushVerifyApiContext: { createdByInstitutionalUserId: 77 },
  }, res);
  return { res, builder: database.select.mock.results[0]?.value };
}

describe("Cush Verify webhook destination access", () => {
  beforeEach(() => {
    registered.length = 0;
    database.select.mockReset();
    getMembership.mockReset();
    registerCushVerifyWebhookRoutes(buildApp());
  });

  it("denies a non-admin institution member before querying destinations", async () => {
    getMembership.mockResolvedValue({
      institutionId: 12,
      role: "viewer",
      membershipStatus: "active",
      institutionStatus: "approved",
      applicationStatus: "approved",
    });
    const { res } = await invokeList();
    expect(res.statusCode).toBe(403);
    expect(database.select).not.toHaveBeenCalled();
  });

  it("lists only tenant-scoped safe destination fields for an approved organisation admin", async () => {
    getMembership.mockResolvedValue({
      institutionId: 12,
      role: "organisation_admin",
      membershipStatus: "active",
      institutionStatus: "approved",
      applicationStatus: "approved",
    });
    const builder = selectBuilder([{
      id: 3,
      institutionId: 12,
      createdByInstitutionalUserId: 77,
      name: "Reports receiver",
      url: "https://hooks.example.org/cush",
      environment: "production",
      eventTypes: ["consent.approved"],
      usageThresholdPercentages: [],
      secretCiphertext: "ciphertext",
      secretIv: "iv",
      secretTag: "tag",
      status: "active",
      createdAt: new Date("2026-11-19T10:00:00Z"),
      updatedAt: new Date("2026-11-19T10:00:00Z"),
      deletedAt: null,
    }]);
    database.select.mockReturnValue(builder);

    const { res } = await invokeList();

    expect(res.statusCode).toBe(200);
    expect(builder.where).toHaveBeenCalled();
    expect(res.body).toMatchObject({
      destinations: [{
        id: 3,
        name: "Reports receiver",
        environment: "production",
        eventTypes: ["consent.approved"],
      }],
    });
    expect(JSON.stringify(res.body)).not.toContain("ciphertext");
    expect(JSON.stringify(res.body)).not.toContain("secretTag");
  });
});
