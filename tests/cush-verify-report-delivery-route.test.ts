import { beforeEach, describe, expect, it, vi } from "vitest";

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
  cushVerifyReportConsents,
  cushVerifyReportDeliveries,
  cushVerifyReportEvents,
  cushVerifyReportRequests,
} from "@shared/schema";
import { registerCushVerifyReportRoutes } from "../server/cush-verify-report-routes";

type Handler = (...args: any[]) => unknown;
type RegisteredRoute = { path: string; handlers: Handler[] };

const requestId = "b70fa5c4-0f68-4cc8-b7b7-2f4db5af59a1";
const reportDigest = "a".repeat(64);
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

let deliveryRow: { id: number; deliveredAt: Date; requestId: string; reportDigest: string } | null;
let reportEvents: Array<Record<string, unknown>>;
let nextDeliveryId: number;

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
      if (selectedTable === cushVerifyReportDeliveries && deliveryRow) {
        return [{ id: deliveryRow.id, deliveredAt: deliveryRow.deliveredAt }];
      }
      return [];
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
          if (
            deliveryRow?.requestId === insertedValues.requestId &&
            deliveryRow.reportDigest === insertedValues.reportDigest
          ) return [];
          deliveryRow = {
            id: nextDeliveryId++,
            deliveredAt: deliveryDate,
            requestId: String(insertedValues.requestId),
            reportDigest: String(insertedValues.reportDigest),
          };
          return [{ id: deliveryRow.id, deliveredAt: deliveryRow.deliveredAt }];
        },
      };
      return {
        values(values: Record<string, unknown>) {
          insertedValues = values;
          if (table === cushVerifyReportEvents) {
            reportEvents.push(values);
            return Promise.resolve(undefined);
          }
          return insertQuery;
        },
      };
    },
  };
}

function createApp() {
  const routes: RegisteredRoute[] = [];
  const app = {
    get(path: string, ...handlers: Handler[]) {
      routes.push({ path, handlers });
    },
    post(path: string, ...handlers: Handler[]) {
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
  const route = routes.find(({ path }) => path === "/api/verify/report-requests/:requestId/deliver");
  if (!route) throw new Error("Report delivery route was not registered.");
  const req = {
    params: { requestId },
    cushVerifyInstitutionalUserId: 92,
  } as any;
  const res = createResponse();
  await route.handlers.at(-1)!(req, res);
  return res;
}

describe("Cush Verify report delivery route billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deliveryRow = null;
    reportEvents = [];
    nextDeliveryId = 100;

    database.select.mockImplementation(() => selectBuilder());
    database.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const previousDelivery = deliveryRow;
      const previousEvents = [...reportEvents];
      try {
        return await callback(createTransaction());
      } catch (error) {
        deliveryRow = previousDelivery;
        reportEvents = previousEvents;
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
    buildReport.mockReturnValue({ categories: { scoreSummary: { score: 700 } } });
    getReportDigest.mockReturnValue(reportDigest);
    refreshSubscription.mockResolvedValue(undefined);
    allocateAnnualCredits.mockResolvedValue(undefined);
    recordReportCreditUse.mockResolvedValue({ charged: true, overageLedgerId: null });
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
    expect(deliveryRow).toMatchObject({ id: 100, requestId, reportDigest });
    expect(reportEvents.map((event) => event.eventType)).toEqual(["report_delivered", "report_accessed"]);
  });

  it("does not attempt a charge when report generation fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getPassportReportData.mockRejectedValueOnce(new Error("simulated report data failure"));

    const response = await invokeDeliveryRoute();

    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual({ error: "The report could not be retrieved." });
    expect(database.transaction).not.toHaveBeenCalled();
    expect(recordReportCreditUse).not.toHaveBeenCalled();
    expect(deliveryRow).toBeNull();
    errorSpy.mockRestore();
  });

  it("does not return a report or retain a delivery when billing fails in the transaction", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    recordReportCreditUse.mockRejectedValueOnce(new Error("simulated billing write failure"));

    const response = await invokeDeliveryRoute();

    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual({ error: "The report could not be retrieved." });
    expect(recordReportCreditUse).toHaveBeenCalledTimes(1);
    expect(deliveryRow).toBeNull();
    expect(reportEvents).toEqual([]);
    errorSpy.mockRestore();
  });
});
