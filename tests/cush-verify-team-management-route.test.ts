import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("../server/db", () => ({ cushVerifyDb: db }));
vi.mock("../server/auth", () => ({
  isAuthenticated: vi.fn(),
  requireAdminPermission: vi.fn(() => vi.fn()),
  requireTrustedAdminOrigin: vi.fn(),
}));
vi.mock("../server/admin-audit", () => ({ recordAdminAuditEventAfterCommit: vi.fn() }));
vi.mock("../server/origin-policy", () => ({ getAllowedFrontendOrigins: vi.fn(() => new Set(["https://verify.example"])) }));
vi.mock("../server/firebase-auth", () => ({
  createCushVerifyPendingFirebaseUser: vi.fn(),
  deleteCushVerifyFirebaseUser: vi.fn(),
  setCushVerifyFirebaseUserActivated: vi.fn(),
  verifyCushVerifyFirebaseIdentity: vi.fn(),
}));
vi.mock("../server/cush-verify-invitation-email", () => ({
  sendCushVerifyActivationEmail: vi.fn(),
  sendCushVerifyInvitationEmail: vi.fn(),
}));
vi.mock("../server/security", () => ({ authRateLimit: vi.fn() }));

import type { Express } from "express";
import {
  cushVerifyApplications,
  cushVerifyInstitutionalMemberships,
  cushVerifyInstitutionalUsers,
  cushVerifyInstitutions,
  cushVerifyInvitations,
  cushVerifyMembershipEvents,
} from "@shared/schema";
import { registerCushVerifyInstitutionalRoutes } from "../server/cush-verify-institutional-routes";

type RegisteredRoute = { method: string; path: string; handlers: ((...args: any[]) => unknown)[] };

const workspace = {
  institutionId: 41,
  institutionName: "Example Organisation",
  institutionStatus: "approved",
  applicationStatus: "approved",
  role: "organisation_admin",
  membershipStatus: "active",
};

let events: Array<Record<string, unknown>>;
let activeAdmins: Array<{ id: number }>;
let targetMembership: Record<string, unknown> | null;
let actorMembership: Record<string, unknown>;
let storedMembershipChange: Record<string, unknown> | null;
let membershipSelectIndex: number;
let eventRows: Array<Record<string, unknown>>;
let targetMemberRows: Array<Record<string, unknown>>;
let invitationRows: Array<Record<string, unknown>>;
let actorRows: Array<Record<string, unknown>>;

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(value: unknown) {
      this.payload = value;
      return this;
    },
  };
}

function createSelectBuilder(transaction = false) {
  let table: unknown;
  let joinCount = 0;
  let locked = false;
  const builder: any = {
    from(value: unknown) {
      table = value;
      return builder;
    },
    innerJoin() {
      joinCount += 1;
      return builder;
    },
    leftJoin() {
      joinCount += 1;
      return builder;
    },
    where() {
      return builder;
    },
    orderBy() {
      return builder;
    },
    for() {
      locked = true;
      return builder;
    },
    limit() {
      return builder;
    },
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      let rows: unknown[] = [];
      if (transaction) {
        if (table === cushVerifyInstitutions) {
          rows = [{ id: 41, status: "approved", sourceApplicationId: 10 }];
        } else if (table === cushVerifyApplications) {
          rows = [{ status: "approved" }];
        } else if (table === cushVerifyInstitutionalMemberships) {
          if (locked) {
            membershipSelectIndex += 1;
            rows = membershipSelectIndex === 1
              ? [actorMembership]
              : targetMembership
                ? [targetMembership]
                : [];
          } else {
            rows = activeAdmins;
          }
        }
      } else if (table === cushVerifyInstitutionalMemberships && joinCount >= 2) {
        rows = [workspace];
      } else if (table === cushVerifyMembershipEvents) {
        rows = eventRows;
      } else if (table === cushVerifyInstitutionalMemberships && joinCount === 1) {
        rows = targetMemberRows;
      } else if (table === cushVerifyInvitations) {
        rows = invitationRows;
      } else if (table === cushVerifyInstitutionalUsers) {
        rows = actorRows;
      }
      return Promise.resolve(rows).then(resolve, reject);
    },
  };
  return builder;
}

function createTransaction() {
  const tx: any = {
    select: vi.fn(() => createSelectBuilder(true)),
    update: vi.fn(() => ({
      set(values: Record<string, unknown>) {
        storedMembershipChange = values;
        return { where: async () => undefined };
      },
    })),
    insert: vi.fn((table: unknown) => ({
      values: async (values: Record<string, unknown>) => {
        if (table === cushVerifyMembershipEvents) events.push(values);
      },
    })),
  };
  return tx;
}

function createTestApp() {
  const routes: RegisteredRoute[] = [];
  const app = {} as Record<string, unknown>;
  for (const method of ["get", "post", "put", "delete"]) {
    app[method] = (path: string, ...handlers: ((...args: any[]) => unknown)[]) => {
      routes.push({ method, path, handlers });
    };
  }
  return { app: app as unknown as Express, routes };
}

async function callRoute(method: string, path: string, request: Record<string, unknown>) {
  const { app, routes } = createTestApp();
  registerCushVerifyInstitutionalRoutes(app);
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Route not registered: ${method} ${path}`);
  const response = createResponse();
  await route.handlers.at(-1)!(request, response);
  return response;
}

describe("Cush Verify organisation team management routes", () => {
  beforeEach(() => {
    events = [];
    activeAdmins = [{ id: 7 }];
    targetMembership = {
      id: 7,
      institutionId: 41,
      institutionalUserId: 71,
      role: "organisation_admin",
      status: "active",
    };
    actorMembership = { role: "organisation_admin", status: "active" };
    storedMembershipChange = null;
    membershipSelectIndex = 0;
    eventRows = [];
    targetMemberRows = [];
    invitationRows = [];
    actorRows = [];
    db.select.mockImplementation(() => createSelectBuilder(false));
    db.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(createTransaction()));
  });

  it("prevents an organisation from removing its last active administrator", async () => {
    const response = await callRoute("put", "/api/verify/team/members/:membershipId", {
      params: { membershipId: "7" },
      body: { action: "change_role", role: "viewer" },
      cushVerifyInstitutionalUserId: 71,
    });

    expect(response.statusCode).toBe(409);
    expect(response.payload).toEqual({ error: "An organisation must keep at least one active administrator." });
    expect(storedMembershipChange).toBeNull();
    expect(events).toEqual([]);
  });

  it("does not update a membership outside the signed-in organisation", async () => {
    targetMembership = null;
    const response = await callRoute("put", "/api/verify/team/members/:membershipId", {
      params: { membershipId: "88" },
      body: { action: "suspend" },
      cushVerifyInstitutionalUserId: 71,
    });

    expect(response.statusCode).toBe(404);
    expect(storedMembershipChange).toBeNull();
    expect(events).toEqual([]);
  });

  it("changes a teammate role and records the actor, tenant, and role transition", async () => {
    activeAdmins = [{ id: 7 }, { id: 8 }];
    targetMembership = {
      id: 8,
      institutionId: 41,
      institutionalUserId: 81,
      role: "organisation_admin",
      status: "active",
    };
    const response = await callRoute("put", "/api/verify/team/members/:membershipId", {
      params: { membershipId: "8" },
      body: { action: "change_role", role: "analyst" },
      cushVerifyInstitutionalUserId: 71,
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({ success: true, role: "analyst", status: "active" });
    expect(storedMembershipChange).toMatchObject({ role: "analyst" });
    expect(events).toEqual([expect.objectContaining({
      institutionId: 41,
      membershipId: 8,
      actorInstitutionalUserId: 71,
      eventType: "membership_role_changed",
      details: { previousRole: "organisation_admin", newRole: "analyst" },
    })]);
  });

  it("suspends access, records it, and restores it only through the reactivation action", async () => {
    targetMembership = {
      id: 8,
      institutionId: 41,
      institutionalUserId: 81,
      role: "viewer",
      status: "active",
    };
    const suspended = await callRoute("put", "/api/verify/team/members/:membershipId", {
      params: { membershipId: "8" },
      body: { action: "suspend" },
      cushVerifyInstitutionalUserId: 71,
    });
    expect(suspended.statusCode).toBe(200);
    expect(storedMembershipChange).toMatchObject({ status: "suspended" });
    expect(events.at(-1)).toMatchObject({
      institutionId: 41,
      membershipId: 8,
      eventType: "membership_suspended",
    });

    targetMembership.status = "suspended";
    membershipSelectIndex = 0;
    const restored = await callRoute("put", "/api/verify/team/members/:membershipId", {
      params: { membershipId: "8" },
      body: { action: "reactivate" },
      cushVerifyInstitutionalUserId: 71,
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.payload).toMatchObject({ status: "active" });
    expect(storedMembershipChange).toMatchObject({ status: "active" });
    expect(events.at(-1)).toMatchObject({
      institutionId: 41,
      membershipId: 8,
      eventType: "membership_reactivated",
    });
  });

  it("formats team access events without returning invitation tokens", async () => {
    eventRows = [{
      id: 19,
      invitationId: 6,
      membershipId: 8,
      actorType: "organisation_admin",
      actorInstitutionalUserId: 71,
      eventType: "membership_role_changed",
      details: { previousRole: "viewer", newRole: "analyst" },
      createdAt: new Date("2026-11-18T12:00:00.000Z"),
    }];
    targetMemberRows = [{ membershipId: 8, fullName: "Colleague", email: "colleague@example.org" }];
    invitationRows = [{ invitationId: 6, fullName: "Colleague", email: "colleague@example.org", tokenHash: "do-not-return" }];
    actorRows = [{ id: 71, fullName: "Organisation Admin", email: "admin@example.org" }];
    const response = await callRoute("get", "/api/verify/team/events", {
      query: {},
      cushVerifyInstitutionalUserId: 71,
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      events: [{
        id: 19,
        action: "membership_role_changed",
        actor: { name: "Organisation Admin", email: "admin@example.org" },
        target: { name: "Colleague", email: "colleague@example.org" },
        summary: "Viewer → Analyst",
      }],
      nextBeforeId: null,
    });
    expect(JSON.stringify(response.payload)).not.toContain("do-not-return");
  });

  it("paginates the organisation's history by event id", async () => {
    eventRows = Array.from({ length: 51 }, (_, index) => ({
      id: 100 - index,
      invitationId: null,
      membershipId: null,
      actorType: "system",
      actorInstitutionalUserId: null,
      eventType: "invitation_sent",
      details: {},
      createdAt: new Date("2026-11-18T12:00:00.000Z"),
    }));
    const response = await callRoute("get", "/api/verify/team/events", {
      query: {},
      cushVerifyInstitutionalUserId: 71,
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      events: expect.arrayContaining([expect.objectContaining({ id: 100 })]),
      nextBeforeId: 51,
    });
    expect((response.payload as { events: unknown[] }).events).toHaveLength(50);
  });

  it("denies access-history requests for non-admin institutional users", async () => {
    db.select.mockImplementationOnce(() => {
      const builder = createSelectBuilder(false);
      builder.from = () => builder;
      builder.innerJoin = () => builder;
      return {
        from: () => ({
          innerJoin() { return this; },
          where() { return this; },
          orderBy() { return this; },
          limit() { return this; },
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve([{ ...workspace, role: "viewer" }]).then(resolve);
          },
        }),
      };
    });
    const response = await callRoute("get", "/api/verify/team/events", {
      query: {},
      cushVerifyInstitutionalUserId: 81,
    });
    expect(response.statusCode).toBe(403);
    expect(events).toEqual([]);
  });
});
