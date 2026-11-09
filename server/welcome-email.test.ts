import { afterEach, describe, expect, it, vi } from "vitest";
import { sendWelcomeEmail } from "./welcome-email";

describe("welcome email", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not attempt delivery until Resend is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const fetcher = vi.fn();

    await expect(sendWelcomeEmail({
      userId: 19,
      email: "new@example.com",
      firstName: "New",
    }, { fetcher })).resolves.toEqual({ status: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends a personalized welcome once for a newly created user", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });

    await expect(sendWelcomeEmail({
      userId: 19,
      email: "new@example.com",
      firstName: "Ari <script>",
    }, {
      apiKey: "test-api-key",
      from: "Cush Support <support@example.com>",
      fetcher,
    })).resolves.toEqual({ status: "sent" });

    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers).toMatchObject({
      Authorization: "Bearer test-api-key",
      "Idempotency-Key": "cush-welcome-19",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: "Cush Support <support@example.com>",
      to: ["new@example.com"],
      reply_to: "support@we-cush.com",
      subject: "Welcome to Cush",
      text: expect.stringContaining("https://app.we-cush.com/dashboard"),
      html: expect.stringContaining("Ari &lt;script&gt;"),
    });
  });

  it("reports delivery failures without exposing provider details", async () => {
    const rejectedFetcher = vi.fn().mockResolvedValue({ ok: false });
    const networkFailureFetcher = vi.fn().mockRejectedValue(new Error("sensitive provider response"));

    await expect(sendWelcomeEmail({
      userId: 19,
      email: "new@example.com",
      firstName: "Ari",
    }, {
      apiKey: "test-api-key",
      from: "support@example.com",
      fetcher: rejectedFetcher,
    })).resolves.toEqual({ status: "failed", reason: "provider_rejected" });

    await expect(sendWelcomeEmail({
      userId: 19,
      email: "new@example.com",
      firstName: "Ari",
    }, {
      apiKey: "test-api-key",
      from: "support@example.com",
      fetcher: networkFailureFetcher,
    })).resolves.toEqual({ status: "failed", reason: "request_failed" });
  });
});
