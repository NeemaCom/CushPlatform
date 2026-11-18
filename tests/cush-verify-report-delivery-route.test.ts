import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const {
  database,
  getWorkspaceState,
  getPassportReportData,
  buildReport,
  getReportDigest,
  refreshSubscription,
  allocateAnnualCredits,
  recordReportCreditUse,
} = vi.hoisted(() => ({
  database: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
  getWorkspaceState: vi.fn(),
  getPassportReportData: vi.fn(),
  buildReport: vi.fn(),
  getReportDigest: vi.fn(),
  refreshSubscription: vi.fn(),
  allocateAnnualCredits: vi.fn(),
  recordReportCreditUse: vi.fn(),
}));

vi.mock("../server/db", () => ({ cushVerifyDb: database }));
vi.mock("../server/auth", () => ({
  isAuthenticated: vi.fn(),
}));
vi.mock("../server/security", () => ({ authRateLimit: vi.fn() }));
vi.mock("../server/cush-verify-institutional-routes", () => ({
  getInstitutionalWorkspaceState: getWorkspaceState,
  isInstitutionalAuthenticated: vi.fn(),
  requireApprovedInstitution: vi.fn(),
}));
vi.mock("../server/cush-score-v2", () => ({ isV2SchemaMissing: vi.fn(() => false) }));
vi.mock("../server/cush-verify-passport-data", () => ({
  findEligiblePassportByEmail: vi.fn(),
  getConsentBoundPassportReportData: getPassportReportData,
  getEligiblePassportUserById: vi.fn(),
}));
vi.mock("../server/cush-verify-report-service", () => ({
  buildCushVerifyReport: buildReport,
  checkCushVerifyReportAuthorization: vi.fn((input) => {
    const allowed = input.requestStatus === "authorized" &&
      input.consentStatus === "approved" &&
      input.requestInstitutionId === input.expectedInstitutionId &&
      input.targetUserId === input.consentUserId &&
      input.requestExpiresAt > input.now &&
      input.authorizationExpiresAt > input.now &&
      input.consentExpiresAt > input.now;
    return allowed
      ? { allowed: true, categories: input.approvedCategories }
      : { allowed: false, reason: "no_active_consent" };
  }),
  getCushVerifyReportDigest: getReportDigest,
  maskCushVerifyRecipientEmail: vi.fn(),
}));
vi.mock("../server/cush-verify-consent-email", () => ({
  sendCushVerifyConsentRequestEmail: vi.fn(),
}));
vi.mock("../server/cush-verify-billing-service", () => ({
  allocateDueAnnualCredits: allocateAnnualCredits,
  CushVerifyBillingEntitlementError: class CushVerifyBillingEntitlementError extends Error {
    code = "CREDITS_REQUIRED";
  },
  processPendingCushVerifyBillingOutbox: vi.fn(),
  refreshBillingSubscriptionStatus: refreshSubscription,
  recordReportCreditUse,
}));

import type { Express } from "express";
import {
  cushVerifyApiUsage,
  cushVerifyReportConsents,
  cushVerifyReportDeliveries,
  cushVerifyReportEvents,
  cushVerifyReportRequests,
} from "@shared/schema";
import { registerCushVerifyReportRoutes } from "../server/cush-verify-report-routes";

type Handler = (...args: any[]) => unknown;
type RegisteredRoute = { path: string | string[]; handlers: Handler[] };

const requestId = "b70fa5c4-0f68-4cc8-b7b7-2f4db5af59a1";
const deliveryDate = new Date("2026-11-18T12:00:00.000Z");

const requestRow = {
  id: requestId,
  institutionId: 41,
  targetUserId: 73,
  status: "authorized",
  requestExpiresAt: new Date(Date.now() + 86_400_000),
  authorizationExpiresAt: new Date(Date.now() + 86_400_000),
  requestedCategories: ["score_summary"],
};

const consentRow = {
  requestId,
  userId: 73,
  status: "approved",
  approvedCategories: ["score_summary"],
  expiresAt: new Date(Date.now() + 86_400_000),
  approvedAt: new Date(Date.now() - 1_000),
};

let deliveryRows: Array<{ id: number; deliveredAt: Date; requestId: string; reportDigest: string }>;
let reportEvents: Array<Record<string, unknown>>;
let reportDebits: number[];
let creditBalance: number;
let nextDeliveryId: number;
let latestDeliveryInsert: { requestId: string; reportDigest: string } | null;
let reportContent: Record<string, unknown>;
let failReportEventInsert: boolean;
let apiUsageBillableCount: number;
let apiUsageBillableUpdates: boolean[];

function selectBuilder() {
  let selectedTable: unknown;
  const builder: any = {
    from(table: unknown) {
      selectedTable = table;
      return builder;
    },
    where() {
      return builder;
    },
    for() {
      return builder;
    },
    async limit() {
      if (selectedTable === cushVerifyReportRequests) return [requestRow];
      if (selectedTable === cushVerifyReportConsents) return [consentRow];
      if (selectedTable === cushVerifyReportDeliveries && latestDeliveryInsert) {
        const delivery = deliveryRows.find((row) =>
          row.requestId === latestDeliveryInsert?.requestId &&
          row.reportDigest === latestDeliveryInsert?.reportDigest,
        );
        if (delivery) return [{ id: delivery.id, deliveredAt: delivery.deliveredAt }];
      }
      return [];
    },
    then(resolve: (value: Array<{ used?: number }>) => unknown, reject?: (reason: unknown) => unknown) {
      const result = selectedTable === cushVerifyApiUsage
        ? [{ used: apiUsageBillableCount }]
        : [];
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return builder;
}

function createTransaction() {
  return {
    select: () => selectBuilder(),
    insert(table: unknown) {
      let insertedValues: Record<string, unknown> | null = null;
      const insertQuery: any = {
        onConflictDoNothing() {
          return insertQuery;
        },
        async returning() {
          if (table !== cushVerifyReportDeliveries || !insertedValues) return [];
          const request = String(insertedValues.requestId);
          const digest = String(insertedValues.reportDigest);
          latestDeliveryInsert = { requestId: request, reportDigest: digest };
          if (deliveryRows.some((row) => row.requestId === request && row.reportDigest === digest)) return [];
          const delivery = {
            id: nextDeliveryId++,
            deliveredAt: deliveryDate,
            requestId: request,
            reportDigest: digest,
          };
          deliveryRows.push(delivery);
          return [{ id: delivery.id, deliveredAt: delivery.deliveredAt }];
        },
      };
      return {
        values(values: Record<string, unknown>) {
          insertedValues = values;
          if (table === cushVerifyReportEvents) {
            if (failReportEventInsert) return Promise.reject(new Error("simulated report event write failure"));
            reportEvents.push(values);
            return Promise.resolve(undefined);
          }
          return insertQuery;
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          return {
            async where() {
              if (table === cushVerifyApiUsage && typeof values.billableReport === "boolean") {
                apiUsageBillableUpdates.push(values.billableReport);
                if (values.billableReport) apiUsageBillableCount += 1;
              }
            },
          };
        },
      };
    },
  };
}

function createApp() {
  const routes: RegisteredRoute[] = [];
  const app = {
    get(path: string | string[], ...handlers: Handler[]) {
      routes.push({ path, handlers });
    },
    post(path: string | string[], ...handlers: Handler[]) {
      routes.push({ path, handlers });
    },
  } as unknown as Express;
  return { app, routes };
}

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(value: unknown) {
      this.payload = value;
      return this;
    },
    once() {
      return this;
    },
  };
}

async function invokeDeliveryRoute() {
  const { app, routes } = createApp();
  registerCushVerifyReportRoutes(app);
  const route = routes.find(({ path }) => Array.isArray(path)
    ? path.includes("/api/verify/report-requests/:requestId/deliver")
    : path === "/api/verify/report-requests/:requestId/deliver");
  if (!route) throw new Error("Report delivery route was not registered.");
  const req = {
    params: { requestId },
    cushVerifyInstitutionalUserId: 92,
  } as any;
  const res = createResponse();
  await route.handlers.at(-1)!(req, res);
  return res;
}

async function invokeApiDeliveryRoute() {
  const { app, routes } = createApp();
  registerCushVerifyReportRoutes(app);
  const route = routes.find(({ path }) => Array.isArray(path)
    ? path.includes("/api/v1/verify/report-requests/:requestId/deliver")
    : false);
  if (!route) throw new Error("Versioned report delivery route was not registered.");
  const req = {
    params: { requestId },
    cushVerifyInstitutionalUserId: 92,
    cushVerifyApiContext: {
      apiKeyId: 8,
      institutionId: 41,
      createdByInstitutionalUserId: 92,
      usageId: 15,
      environment: "production",
      scopes: ["reports:read"],
      apiLimits: {
        requestsPerMinute: null,
        requestsPerHour: null,
        maxConcurrentRequests: null,
        monthlyReportLimit: 1,
      },
      overageConfigured: false,
      periodStartAt: new Date(deliveryDate.getTime() - 86_400_000),
    },
  } as any;
  const res = createResponse();
  await route.handlers.at(-1)!(req, res);
  return res;
}

describe("Cush Verify report delivery route billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportEvents = [];
    nextDeliveryId = 100;

    database.select.mockImplementation(() => selectBuilder());
    database.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const previousDeliveries = [...deliveryRows];
      const previousEvents = [...reportEvents];
      const previousDebits = [...reportDebits];
      const previousBalance = creditBalance;
      try {
        return await callback(createTransaction());
      } catch (error) {
        deliveryRows = previousDeliveries;
        reportEvents = previousEvents;
        reportDebits = previousDebits;
        creditBalance = previousBalance;
        throw error;
      }
    });
    getWorkspaceState.mockResolvedValue({
      institutionId: 41,
      institutionalUserId: 92,
      membershipStatus: "active",
      institutionStatus: "approved",
      applicationStatus: "approved",
      role: "organisation_admin",
      institutionName: "Test Institution",
      tradingName: null,
    });
    getPassportReportData.mockResolvedValue({
      assessment: { calculation: {} },
      financialRecords: [],
    });
    reportContent = {
      generatedAt: deliveryDate.toISOString(),
      reportingPeriod: { start: null, end: null },
      categories: { scoreSummary: { score: 700 } },
    };
    buildReport.mockImplementation(() => reportContent);
    getReportDigest.mockImplementation((report: { categories: unknown; reportingPeriod: unknown }) =>
      createHash("sha256")
        .update(JSON.stringify({ reportingPeriod: report.reportingPeriod, categories: report.categories }))
        .digest("hex"),
    );
    refreshSubscription.mockResolvedValue(undefined);
    allocateAnnualCredits.mockResolvedValue(undefined);
    deliveryRows = [];
    reportDebits = [];
    creditBalance = 5;
    latestDeliveryInsert = null;
    failReportEventInsert = false;
    apiUsageBillableCount = 0;
    apiUsageBillableUpdates = [];
    recordReportCreditUse.mockImplementation(async (_tx, input: { reportDeliveryId: number }) => {
      if (reportDebits.includes(input.reportDeliveryId)) {
        return { charged: false as const, overageLedgerId: null };
      }
      reportDebits.push(input.reportDeliveryId);
      creditBalance -= 1;
      return { charged: true as const, overageLedgerId: null };
    });
  });

  it("charges once when the same authorized report is retrieved repeatedly", async () => {
    const firstResponse = await invokeDeliveryRoute();
    const secondResponse = await invokeDeliveryRoute();

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.payload.delivery).toMatchObject({
      newDeliveryEvent: true,
      billing: { charged: true, type: "report_credit" },
    });
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.payload.delivery).toMatchObject({
      newDeliveryEvent: false,
      billing: { charged: false, type: "none" },
    });
    expect(recordReportCreditUse).toHaveBeenCalledTimes(1);
    expect(deliveryRows).toHaveLength(1);
    expect(deliveryRows[0]).toMatchObject({ id: 100, requestId });
    expect(creditBalance).toBe(4);
    expect(reportEvents.map((event) => event.eventType)).toEqual(["report_delivered", "report_accessed"]);
  });

  it("meters an API report charge in the same transaction and permits a free duplicate", async () => {
    const firstResponse = await invokeApiDeliveryRoute();
    const duplicateResponse = await invokeApiDeliveryRoute();

    expect(firstResponse.statusCode).toBe(200);
    expect(duplicateResponse.statusCode).toBe(200);
    expect(reportDebits).toHaveLength(1);
    expect(apiUsageBillableUpdates).toEqual([true]);
    expect(apiUsageBillableCount).toBe(1);
  });

  it("blocks a new API report after the configured monthly limit when overage is unavailable", async () => {
    apiUsageBillableCount = 1;
    reportContent = {
      generatedAt: deliveryDate.toISOString(),
      reportingPeriod: { start: null, end: null },
      categories: { scoreSummary: { score: 701 } },
    };

    const response = await invokeApiDeliveryRoute();

    expect(response.statusCode).toBe(429);
    expect(response.payload).toMatchObject({ code: "CUSH_VERIFY_MONTHLY_REPORT_LIMIT" });
    expect(recordReportCreditUse).not.toHaveBeenCalled();
    expect(deliveryRows).toHaveLength(0);
    expect(apiUsageBillableUpdates).toHaveLength(0);
  });

  it("charges a second time only when report content changes", async () => {
    const firstResponse = await invokeDeliveryRoute();
    reportContent = {
      generatedAt: new Date(deliveryDate.getTime() + 60_000).toISOString(),
      reportingPeriod: { start: null, end: null },
      categories: { scoreSummary: { score: 701 } },
    };
    const changedResponse = await invokeDeliveryRoute();

    expect(firstResponse.statusCode).toBe(200);
    expect(changedResponse.statusCode).toBe(200);
    expect(changedResponse.payload.delivery).toMatchObject({
      newDeliveryEvent: true,
      billing: { charged: true, type: "report_credit" },
    });
    expect(deliveryRows).toHaveLength(2);
    expect(deliveryRows[0].reportDigest).not.toBe(deliveryRows[1].reportDigest);
    expect(recordReportCreditUse).toHaveBeenCalledTimes(2);
    expect(reportDebits).toEqual([100, 101]);
    expect(creditBalance).toBe(3);
    expect(reportEvents.map((event) => event.eventType)).toEqual(["report_delivered", "report_delivered"]);
  });

  it("does not attempt a charge when report generation fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getPassportReportData.mockRejectedValueOnce(new Error("simulated report data failure"));

    const response = await invokeDeliveryRoute();

    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual({ error: "The report could not be retrieved." });
    expect(database.transaction).not.toHaveBeenCalled();
    expect(recordReportCreditUse).not.toHaveBeenCalled();
    expect(deliveryRows).toEqual([]);
    expect(creditBalance).toBe(5);
    expect(reportDebits).toEqual([]);
    errorSpy.mockRestore();
  });

  it("does not return a report or retain a delivery when billing fails in the transaction", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    recordReportCreditUse.mockRejectedValueOnce(new Error("simulated billing write failure"));

    const response = await invokeDeliveryRoute();

    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual({ error: "The report could not be retrieved." });
    expect(recordReportCreditUse).toHaveBeenCalledTimes(1);
    expect(deliveryRows).toEqual([]);
    expect(creditBalance).toBe(5);
    expect(reportDebits).toEqual([]);
    expect(reportEvents).toEqual([]);
    errorSpy.mockRestore();
  });

  it("rolls back delivery and credit when a later transaction write fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    failReportEventInsert = true;

    const response = await invokeDeliveryRoute();

    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual({ error: "The report could not be retrieved." });
    expect(recordReportCreditUse).toHaveBeenCalledTimes(1);
    expect(deliveryRows).toEqual([]);
    expect(reportEvents).toEqual([]);
    expect(reportDebits).toEqual([]);
    expect(creditBalance).toBe(5);

    failReportEventInsert = false;
    const retry = await invokeDeliveryRoute();
    expect(retry.statusCode).toBe(200);
    expect(retry.payload.delivery).toMatchObject({
      newDeliveryEvent: true,
      billing: { charged: true, type: "report_credit" },
    });
    expect(deliveryRows).toHaveLength(1);
    expect(reportDebits).toEqual([101]);
    expect(creditBalance).toBe(4);
    expect(reportEvents.map((event) => event.eventType)).toEqual(["report_delivered"]);
    errorSpy.mockRestore();
  });
});
