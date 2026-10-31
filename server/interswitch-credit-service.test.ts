import { describe, expect, it, vi } from "vitest";
import {
  createInterswitchCreditReportClient,
  normalizeVerifiedNigerianPhone,
} from "./interswitch-credit-service";

describe("normalizeVerifiedNigerianPhone", () => {
  it.each([
    ["08012345678", "2348012345678"],
    ["+234 801 234 5678", "2348012345678"],
    ["8012345678", "2348012345678"],
  ])("normalizes %s to an international format", (input, expected) => {
    expect(normalizeVerifiedNigerianPhone(input)).toBe(expected);
  });

  it.each(["+447700900123", "12345", "23480123456789"])("rejects unsupported number %s", (input) => {
    expect(normalizeVerifiedNigerianPhone(input)).toBeNull();
  });
});

describe("Interswitch credit report client", () => {
  it("requests a token and sends only the verified phone number and client code", async () => {
    const environment: Record<string, string> = {
      INTERSWITCH_CLIENT_ID: "test-client",
      INTERSWITCH_SECRET_KEY: "test-secret",
      INTERSWITCH_CLIENT_CODE: "test-code",
      INTERSWITCH_OAUTH_TOKEN_URL: "https://passport-sandbox.interswitchng.com/passport/oauth/token",
      INTERSWITCH_CREDIT_REPORT_URL: "https://sandbox.interswitchng.com/lending-service/api/v1/credit-report",
    };
    const calls: Array<{ url: URL; init?: RequestInit }> = [];
    let callIndex = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: new URL(String(input)), init });
      callIndex += 1;
      if (callIndex === 1) {
        return new Response(JSON.stringify({ access_token: "test-access-token", expires_in: 3600 }), { status: 200 });
      }
      return new Response(JSON.stringify({ responseCode: "00", report: { file: "present" } }), { status: 200 });
    };
    const client = createInterswitchCreditReportClient({
      getEnvironment: () => environment,
      fetchImpl,
    });

    expect(client.isConfigured()).toBe(true);
    const result = await client.lookup("2348012345678");

    expect(result).toEqual({ responseCode: "00", report: { file: "present" } });
    expect(calls).toHaveLength(2);
    expect(calls[0].url.searchParams.get("grant_type")).toBe("client_credentials");
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("test-client:test-secret").toString("base64")}`,
    });
    expect(calls[1].url.toString()).toBe(environment.INTERSWITCH_CREDIT_REPORT_URL);
    expect(calls[1].init?.headers).toMatchObject({ Authorization: "Bearer test-access-token" });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      phoneNo: "2348012345678",
      clientCode: "test-code",
    });
  });

  it("does not mark unsafe endpoints as configured", () => {
    const client = createInterswitchCreditReportClient({
      getEnvironment: () => ({
        INTERSWITCH_CLIENT_ID: "test-client",
        INTERSWITCH_SECRET_KEY: "test-secret",
        INTERSWITCH_CLIENT_CODE: "test-code",
        INTERSWITCH_OAUTH_TOKEN_URL: "http://localhost/passport/oauth/token",
        INTERSWITCH_CREDIT_REPORT_URL: "https://example.com/lending-service/api/v1/credit-report",
      }),
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });

    expect(client.isConfigured()).toBe(false);
  });

  it("requires an explicit live-environment flag for non-sandbox credit checks", () => {
    const environment: Record<string, string> = {
      INTERSWITCH_CLIENT_ID: "test-client",
      INTERSWITCH_SECRET_KEY: "test-secret",
      INTERSWITCH_CLIENT_CODE: "test-code",
      INTERSWITCH_OAUTH_TOKEN_URL: "https://passport.interswitchng.com/passport/oauth/token",
      INTERSWITCH_CREDIT_REPORT_URL: "https://api.interswitchng.com/lending-service/api/v1/credit-report",
    };
    const client = createInterswitchCreditReportClient({
      getEnvironment: () => environment,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });

    expect(client.isConfigured()).toBe(false);
    environment.INTERSWITCH_CREDIT_REPORT_LIVE_ENABLED = "true";
    expect(client.isConfigured()).toBe(true);
  });
});
