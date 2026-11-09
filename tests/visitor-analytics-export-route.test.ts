import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  poolQuery,
  recordAdminAuditEvent,
  requireAdminPermission,
} = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  recordAdminAuditEvent: vi.fn(),
  requireAdminPermission: vi.fn(() => vi.fn()),
}));

vi.mock("../server/db", () => ({
  pgPool: { query: poolQuery, connect: vi.fn() },
}));
vi.mock("../server/storage", () => ({
  storage: { getUser: vi.fn() },
}));
vi.mock("../server/auth", () => ({
  isAuthenticated: vi.fn(),
  requireAdminPermission,
  requireTrustedAdminOrigin: vi.fn(),
}));
vi.mock("../server/admin-audit", () => ({
  isAdminAuditTableMissing: vi.fn(() => false),
  recordAdminAuditEvent,
}));

import type { Express } from "express";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import { registerVisitorIntelligenceRoutes } from "../server/visitor-intelligence-routes";

type RegisteredRoute = { path: string; handlers: ((...args: any[]) => unknown)[] };

function createTestApp() {
  const routes: RegisteredRoute[] = [];
  const app = {
    get: (path: string, ...handlers: ((...args: any[]) => unknown)[]) => routes.push({ path, handlers }),
    post: (path: string, ...handlers: ((...args: any[]) => unknown)[]) => routes.push({ path, handlers }),
  } as unknown as Express;
  return { app, routes };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: new Map<string, string>(),
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers.set(name.toLowerCase(), value);
      return this;
    },
    send(value: unknown) {
      this.payload = value;
      return this;
    },
    json(value: unknown) {
      this.payload = value;
      return this;
    },
  };
}

const exportRow = {
  visitor_id: "d943c21e-f715-47a4-b087-8cc56350fa4f",
  visitor_type: "anonymous",
  session_count: 1,
  first_seen: new Date("2026-11-09T09:00:00.000Z"),
  last_seen: new Date("2026-11-09T10:00:00.000Z"),
  current_route: "/dashboard",
  device_type: "mobile",
  browser: "Chrome",
  operating_system: "Android",
  page_views: 2,
  signup_completions: 0,
  logins: 0,
};

describe("visitor analytics export route", () => {
  beforeEach(() => {
    poolQuery.mockReset();
    recordAdminAuditEvent.mockReset().mockResolvedValue(undefined);
    requireAdminPermission.mockClear();
  });

  it("exports filtered, pseudonymous data and audits the download", async () => {
    poolQuery.mockResolvedValueOnce({ rows: [exportRow] });
    const { app, routes } = createTestApp();
    registerVisitorIntelligenceRoutes(app);
    const route = routes.find(({ path }) => path === "/api/admin/visitor-intelligence/export");
    expect(route).toBeDefined();

    const req = { query: { range: "30", kind: "anonymous", search: "sample" }, userId: 12, ip: "127.0.0.1" } as any;
    const res = createResponse();
    await route!.handlers.at(-1)!(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("x-export-row-count")).toBe("1");
    expect(res.headers.get("x-export-truncated")).toBe("false");
    expect(String(res.payload)).toContain('"visitor_reference"');
    expect(String(res.payload)).not.toContain(exportRow.visitor_id);
    expect(String(res.payload)).not.toContain("email");
    expect(poolQuery).toHaveBeenCalledWith(expect.stringContaining("FROM public.cush_visitor_sessions"), [30, "anonymous", "sample", 5001]);
    expect(requireAdminPermission).toHaveBeenCalledWith(ADMIN_PERMISSION.visitorAnalyticsRead);
    expect(recordAdminAuditEvent).toHaveBeenCalledWith(req, expect.objectContaining({
      action: "visitor_analytics.export",
      resourceType: "visitor_analytics",
      resourceId: "30d:anonymous:rows=1:truncated=false:searched=true",
    }));
  });

  it("caps reports at 5,000 rows and marks the export as truncated", async () => {
    poolQuery.mockResolvedValueOnce({
      rows: Array.from({ length: 5001 }, (_, index) => ({
        ...exportRow,
        visitor_id: `d943c21e-f715-47a4-b087-${String(index).padStart(12, "0")}`,
      })),
    });
    const { app, routes } = createTestApp();
    registerVisitorIntelligenceRoutes(app);
    const route = routes.find(({ path }) => path === "/api/admin/visitor-intelligence/export")!;
    const res = createResponse();
    await route.handlers.at(-1)!({ query: { range: "90", kind: "all" }, userId: 12 } as any, res);

    const lines = String(res.payload).split("\r\n").filter(Boolean);
    expect(res.statusCode).toBe(200);
    expect(res.headers.get("x-export-row-count")).toBe("5000");
    expect(res.headers.get("x-export-truncated")).toBe("true");
    expect(lines).toHaveLength(5001);
  });

  it("shows only safe summaries of recent export audit records", async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [{
        id: 41,
        admin_user_id: 12,
        resource_id: "30d:anonymous:rows=14:truncated=false:searched=true",
        outcome: "success",
        created_at: new Date("2026-11-09T11:30:00.000Z"),
      }],
    });
    const { app, routes } = createTestApp();
    registerVisitorIntelligenceRoutes(app);
    const route = routes.find(({ path }) => path === "/api/admin/visitor-intelligence/exports");
    expect(route).toBeDefined();

    const req = { userId: 12, ip: "127.0.0.1" } as any;
    const res = createResponse();
    await route!.handlers.at(-1)!(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      exports: [{
        id: 41,
        adminUserId: 12,
        outcome: "success",
        createdAt: "2026-11-09T11:30:00.000Z",
        rangeDays: 30,
        visitorKind: "anonymous",
        rowCount: 14,
        truncated: false,
        searchApplied: true,
      }],
    });
    expect(JSON.stringify(res.payload)).not.toContain("resource_id");
    expect(JSON.stringify(res.payload)).not.toContain("127.0.0.1");
    expect(poolQuery).toHaveBeenCalledWith(expect.stringContaining("FROM public.admin_audit_logs"));
    expect(recordAdminAuditEvent).toHaveBeenCalledWith(req, expect.objectContaining({
      action: "visitor_analytics.export_history.read",
      resourceType: "visitor_analytics",
    }));
  });
});
