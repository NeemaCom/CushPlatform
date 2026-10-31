import { describe, expect, it, vi } from "vitest";
import {
  createInterswitchCreditHistoryClient,
  normalizeInterswitchCreditHistory,
} from "./interswitch-credit-history-service";
import { scoreInterswitchCreditHistory } from "./interswitch-credit-history-scoring";

const sandboxEnvironment: Record<string, string> = {
  INTERSWITCH_CLIENT_ID: "test-client",
  INTERSWITCH_SECRET_KEY: "test-secret",
  INTERSWITCH_CREDIT_HISTORY_AUTH_URL:
    "https://sandbox.interswitchng.com/marketplace-routing/api/v1/authentication/client",
  INTERSWITCH_CREDIT_HISTORY_URL:
    "https://sandbox.interswitchng.com/marketplace-routing/api/v1/verify/identity/credit-history-lookup",
};

const sampleResponse = {
  success: true,
  code: "200",
  message: "Request processed successfully",
  data: {
    credit_history: [{
      institution: "PRIVATE BANK NAME",
      history: [{
        loan_status: "open",
        performance_status: "performing",
        repayment_schedule: [
          { date: "06-2022", status: "pending" },
          { date: "07-2022", status: "paid" },
          { date: "08-2022", status: "overdue" },
        ],
      }],
    }],
    profile: {
      full_name: "PRIVATE NAME",
      address_history: [{ address: "PRIVATE ADDRESS" }],
      identifications: [{ no: "PRIVATE ID", type: "BVN" }],
    },
  },
  trackingId: "private-tracking-id",
};

describe("normalizeInterswitchCreditHistory", () => {
  it("retains aggregate status counts only and excludes profile and account details", () => {
    const normalized = normalizeInterswitchCreditHistory(sampleResponse);
    expect(normalized).toEqual({
      accountsReported: 1,
      historyRecords: 1,
      loanStatusCounts: { open: 1, closed: 0, other: 0 },
      performanceStatusCounts: { performing: 1, nonPerforming: 0, other: 0 },
      repaymentStatusCounts: { settled: 1, overdue: 1, adverse: 0, pending: 1, other: 0 },
    });
    expect(JSON.stringify(normalized)).not.toMatch(/PRIVATE|tracking-id|address|BVN/i);
  });

  it("does not interpret empty or unexpected data as a successful report", () => {
    expect(() => normalizeInterswitchCreditHistory({ success: true, code: "200", data: {} }))
      .toThrow("unexpected credit-history response");
    expect(() => normalizeInterswitchCreditHistory({
      success: false,
      code: "400",
      data: { credit_history: [] },
    })).toThrow("unexpected credit-history response");
  });

  it("groups unknown statuses without assigning them a positive or adverse meaning", () => {
    const result = normalizeInterswitchCreditHistory({
      success: true,
      code: "200",
      data: {
        credit_history: [{
          history: [{
            loan_status: "new-provider-state",
            performance_status: "unknown-state",
            repayment_schedule: [{ status: "unrecognized-state" }],
          }],
        }],
      },
    });
    expect(result.loanStatusCounts.other).toBe(1);
    expect(result.performanceStatusCounts.other).toBe(1);
    expect(result.repaymentStatusCounts.other).toBe(1);
  });

  it("does not award credit points for the supplied pending-only repayment schedule", () => {
    const normalized = normalizeInterswitchCreditHistory({
      success: true,
      code: "200",
      data: {
        credit_history: [{
          history: [{
            loan_status: "open",
            performance_status: "performing",
            repayment_schedule: [{ date: "06-2022", status: "pending" }],
          }],
        }],
      },
    });

    expect(scoreInterswitchCreditHistory(normalized)).toEqual({
      score: null,
      scoreableInstallments: 0,
      reason: "no_resolved_installments",
    });
  });
});

describe("Interswitch credit-history client", () => {
  it("uses JSON credentials, submits the BVN only to the lookup endpoint, and returns normalized counts", async () => {
    const calls: Array<{ url: URL; init?: RequestInit }> = [];
    let callIndex = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: new URL(String(input)), init });
      callIndex += 1;
      if (callIndex === 1) {
        return new Response(JSON.stringify({
          success: true,
          code: "200",
          data: { access_token: "test-access-token", expires_in: 1800 },
        }), { status: 200 });
      }
      return new Response(JSON.stringify(sampleResponse), { status: 200 });
    };
    const client = createInterswitchCreditHistoryClient({
      getEnvironment: () => sandboxEnvironment,
      fetchImpl,
    });

    expect(client.isConfigured()).toBe(true);
    expect(client.getReadiness()).toMatchObject({
      mode: "sandbox",
      configured: true,
      providerMappingConfirmed: false,
      identityMatchConfirmed: false,
      inquiryEffectsConfirmed: false,
    });
    const result = await client.lookup("12345678901");
    expect(calls).toHaveLength(2);
    expect(calls[0].url.toString()).toBe(sandboxEnvironment.INTERSWITCH_CREDIT_HISTORY_AUTH_URL);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      clientId: "test-client",
      clientSecret: "test-secret",
    });
    expect(calls[0].init?.headers).not.toHaveProperty("Cookie");
    expect(calls[1].url.toString()).toBe(sandboxEnvironment.INTERSWITCH_CREDIT_HISTORY_URL);
    expect(calls[1].init?.headers).toMatchObject({ Authorization: "Bearer test-access-token" });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ bvn: "12345678901" });
    expect(result.accountsReported).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|tracking-id|address|BVN/i);
  });

  it("blocks production lookups until live mode and every provider confirmation are enabled", async () => {
    const environment: Record<string, string> = {
      ...sandboxEnvironment,
      INTERSWITCH_CREDIT_HISTORY_AUTH_URL:
        "https://api-marketplace-routing.interswitchng.com/marketplace-routing/api/v1/authentication/client",
      INTERSWITCH_CREDIT_HISTORY_URL:
        "https://api-marketplace-routing.interswitchng.com/marketplace-routing/api/v1/verify/identity/credit-history-lookup",
    };
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const client = createInterswitchCreditHistoryClient({
      getEnvironment: () => environment,
      fetchImpl,
    });
    expect(client.isConfigured()).toBe(false);
    await expect(client.lookup("12345678901")).rejects.toThrow("not configured");
    expect(fetchImpl).not.toHaveBeenCalled();
    environment.INTERSWITCH_CREDIT_HISTORY_LIVE_ENABLED = "true";
    expect(client.isConfigured()).toBe(false);
    environment.INTERSWITCH_CREDIT_HISTORY_MAPPING_CONFIRMED = "true";
    expect(client.isConfigured()).toBe(false);
    environment.INTERSWITCH_CREDIT_HISTORY_IDENTITY_MATCH_CONFIRMED = "true";
    expect(client.isConfigured()).toBe(false);
    expect(client.getReadiness()).toMatchObject({
      mode: "production",
      configured: false,
      liveEnabled: true,
      providerMappingConfirmed: true,
      identityMatchConfirmed: true,
      inquiryEffectsConfirmed: false,
    });
    environment.INTERSWITCH_CREDIT_HISTORY_INQUIRY_EFFECTS_CONFIRMED = "true";
    expect(client.isConfigured()).toBe(true);
    expect(client.getReadiness()).toMatchObject({
      mode: "production",
      configured: true,
      inquiryEffectsConfirmed: true,
    });
  });

  it("rejects mixed sandbox and production endpoints", () => {
    const client = createInterswitchCreditHistoryClient({
      getEnvironment: () => ({
        ...sandboxEnvironment,
        INTERSWITCH_CREDIT_HISTORY_URL:
          "https://api-marketplace-routing.interswitchng.com/marketplace-routing/api/v1/verify/identity/credit-history-lookup",
      }),
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    expect(client.isConfigured()).toBe(false);
  });
});
