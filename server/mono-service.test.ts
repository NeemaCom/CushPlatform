import { describe, expect, it, vi } from "vitest";
import { MonoClient, MonoNotConfiguredError, MonoRequestError, normalizeBvnAccounts } from "./mono-service";

describe("MonoClient", () => {
  it("sends the secret and session ID only in server-side headers", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ status: "successful" }), { status: 200 }),
    );
    const client = new MonoClient("server-secret", fetcher as typeof fetch);

    await client.request("/v3/lookup/bvn/verify", {
      method: "POST",
      sessionId: "session-123",
      body: { method: "phone" },
    });

    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      "mono-sec-key": "server-secret",
      "x-session-id": "session-123",
    });
    expect(init.body).toBe(JSON.stringify({ method: "phone" }));
  });

  it("rejects provider failures without exposing their response body", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ error: "sensitive provider details" }), { status: 400 }),
    );
    const client = new MonoClient("server-secret", fetcher as typeof fetch);

    await expect(client.request("/v3/lookup/bvn/initiate", { method: "POST", body: {} }))
      .rejects.toMatchObject({ name: "MonoRequestError", status: 400 });
    try {
      await client.request("/v3/lookup/bvn/initiate", { method: "POST", body: {} });
    } catch (error) {
      expect((error as Error).message).not.toContain("sensitive provider details");
    }
  });

  it("requires a server secret", () => {
    expect(() => new MonoClient(" ")).toThrow(MonoNotConfiguredError);
  });

  it("maps BVN account results to masked, minimal records", () => {
    expect(normalizeBvnAccounts([{
      account_name: "Example Customer",
      account_number: "1234567890",
      account_type: "SAVINGS",
      institution: { name: "Example Bank", bank_code: "058" },
      bvn: "12345678901",
    }])).toEqual([{
      accountName: "Example Customer",
      accountType: "SAVINGS",
      institutionName: "Example Bank",
      bankCode: "058",
      accountLast4: "7890",
    }]);
  });
});
