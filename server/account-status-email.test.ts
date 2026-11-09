import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAccountStatusEmail, sendAccountStatusEmailTest } from "./account-status-email";

const input = {
  userId: 24,
  email: "person@example.com",
  status: "suspended" as const,
  changedAt: new Date("2026-11-07T12:00:00.000Z"),
};

describe("account status email", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not attempt delivery until both Render settings are configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const fetcher = vi.fn();

    const result = await sendAccountStatusEmail(input, { fetcher });

    expect(result).toEqual({ status: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends a minimal suspension notice with an idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });

    const result = await sendAccountStatusEmail(input, {
      apiKey: "test-api-key",
      from: "Cush Support <support@example.com>",
      fetcher,
    });

    expect(result).toEqual({ status: "sent" });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.method).toBe("POST");
    expect(request.headers).toMatchObject({
      Authorization: "Bearer test-api-key",
      "Content-Type": "application/json",
      "Idempotency-Key": "cush-account-status-24-suspended-1794052800000",
      "User-Agent": "CushPlatform/1.0",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: "Cush Support <support@example.com>",
      to: ["person@example.com"],
      reply_to: "support@we-cush.com",
      subject: "Important update to your Cush account",
      text: expect.stringContaining("Your account data has not been deleted."),
    });
  });

  it("sends a reactivation message with the sign-in address", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });

    const result = await sendAccountStatusEmail(
      { ...input, status: "active" },
      { apiKey: "test-api-key", from: "support@example.com", fetcher },
    );

    expect(result).toEqual({ status: "sent" });
    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({
      subject: "Your Cush account access has been restored",
      text: expect.stringContaining("https://app.we-cush.com/login"),
    });
  });

  it("reports provider and network failures without exposing response details", async () => {
    const rejectedFetcher = vi.fn().mockResolvedValue({ ok: false, status: 422 });
    const networkErrorFetcher = vi.fn().mockRejectedValue(new Error("private provider detail"));

    await expect(sendAccountStatusEmail(input, {
      apiKey: "test-api-key",
      from: "support@example.com",
      fetcher: rejectedFetcher,
    })).resolves.toEqual({ status: "failed", reason: "provider_rejected" });

    await expect(sendAccountStatusEmail(input, {
      apiKey: "test-api-key",
      from: "support@example.com",
      fetcher: networkErrorFetcher,
    })).resolves.toEqual({ status: "failed", reason: "request_failed" });
  });

  it("sends a clearly labeled test only to the admin account email", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const requestedAt = new Date("2026-11-09T12:00:00.000Z");

    const result = await sendAccountStatusEmailTest({
      adminUserId: 7,
      email: "admin@example.com",
      requestedAt,
    }, {
      apiKey: "test-api-key",
      from: "Cush Support <support@example.com>",
      fetcher,
    });

    expect(result).toEqual({ status: "sent" });
    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers).toMatchObject({
      Authorization: "Bearer test-api-key",
      "Idempotency-Key": `cush-account-status-test-7-${Math.floor(requestedAt.getTime() / 60_000)}`,
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      to: ["admin@example.com"],
      subject: "Cush account-status email test",
      text: expect.stringContaining("This test did not suspend or reactivate any account."),
    });
  });

  it("does not send the test email without Render settings or when Resend rejects it", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 422 });
    const testInput = {
      adminUserId: 7,
      email: "admin@example.com",
      requestedAt: new Date("2026-11-09T12:00:00.000Z"),
    };

    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    await expect(sendAccountStatusEmailTest(testInput, { fetcher }))
      .resolves.toEqual({ status: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();

    await expect(sendAccountStatusEmailTest(testInput, {
      apiKey: "test-api-key",
      from: "support@example.com",
      fetcher,
    })).resolves.toEqual({ status: "failed", reason: "provider_rejected" });
  });
});
