import { describe, expect, it, vi } from "vitest";
import {
  MonoClient,
  MonoNotConfiguredError,
  MonoRequestError,
  resolveMonoSettings,
} from "./mono-service";

describe("MonoClient", () => {
  it("selects only the live key in production", () => {
    expect(resolveMonoSettings("production", {
      MONO_LIVE_SECRET_KEY: "  live-secret  ",
      MONO_SANDBOX_SECRET_KEY: "sandbox-secret",
      MONO_SECRET_KEY: "legacy-secret",
    })).toEqual({
      environment: "live",
      secretKey: "live-secret",
    });
  });

  it("does not fall back to sandbox or the legacy key in production", () => {
    expect(resolveMonoSettings("production", {
      MONO_SANDBOX_SECRET_KEY: "sandbox-secret",
      MONO_SECRET_KEY: "legacy-secret",
    })).toEqual({
      environment: "live",
      secretKey: null,
    });
  });

  it("selects only the sandbox key outside production", () => {
    expect(resolveMonoSettings("development", {
      MONO_LIVE_SECRET_KEY: "live-secret",
      MONO_SANDBOX_SECRET_KEY: "sandbox-secret",
      MONO_SECRET_KEY: "legacy-secret",
    })).toEqual({
      environment: "sandbox",
      secretKey: "sandbox-secret",
    });
  });

  it("sends the secret and session ID only in server-side headers", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ status: "successful" }), { status: 200 }),
    );
    const client = new MonoClient("server-secret", fetcher as typeof fetch);

    await client.request("/v2/accounts/account-id", { method: "GET" });

    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ "mono-sec-key": "server-secret" });
    expect(init.body).toBeUndefined();
  });

  it("rejects provider failures without exposing their response body", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ error: "sensitive provider details" }), { status: 400 }),
    );
    const client = new MonoClient("server-secret", fetcher as typeof fetch);

    await expect(client.request("/v2/accounts/account-id", { method: "POST", body: {} }))
      .rejects.toMatchObject({ name: "MonoRequestError", status: 400 });
    try {
      await client.request("/v2/accounts/account-id", { method: "POST", body: {} });
    } catch (error) {
      expect((error as Error).message).not.toContain("sensitive provider details");
    }
  });

  it("requires a server secret", () => {
    expect(() => new MonoClient(" ")).toThrow(MonoNotConfiguredError);
  });

});
