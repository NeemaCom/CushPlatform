import { afterEach, describe, expect, it, vi } from "vitest";
import { sendCushVerifyWebhookFailureEmail } from "../server/cush-verify-webhook-failure-email";

describe("Cush Verify webhook failure email", () => {
  const originalAppUrl = process.env.CUSH_VERIFY_APP_URL;
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalAppUrl === undefined) delete process.env.CUSH_VERIFY_APP_URL;
    else process.env.CUSH_VERIFY_APP_URL = originalAppUrl;
    if (originalFrontendOrigin === undefined) delete process.env.FRONTEND_ORIGIN;
    else process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
  });

  const message = {
    notificationId: 42,
    email: "admin@example.org",
    contactName: "Amina <Admin>",
    institutionName: "Example Institute",
    destinationName: "Reports receiver",
    eventType: "report.delivered",
    lastErrorCode: "http_503",
    attemptCount: 8,
  };

  it("does not attempt delivery when the sender is not configured", async () => {
    const fetcher = vi.fn();
    await expect(sendCushVerifyWebhookFailureEmail(message, {
      apiKey: "",
      from: "support@example.org",
      fetcher: fetcher as unknown as typeof fetch,
    })).resolves.toEqual({ status: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends a safe, escaped, idempotent email without including report data", async () => {
    let sentBody = "";
    let sentHeaders: HeadersInit | undefined;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      sentBody = String(init?.body ?? "");
      sentHeaders = init?.headers;
      return new Response("", { status: 202 });
    });
    await expect(sendCushVerifyWebhookFailureEmail(message, {
      apiKey: "test-api-key",
      from: "Cush Verify <support@example.org>",
      fetcher: fetcher as unknown as typeof fetch,
    })).resolves.toEqual({ status: "sent" });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(new Headers(sentHeaders).get("Idempotency-Key")).toBe("cush-verify-webhook-failure-42");
    const body = JSON.parse(sentBody) as { text: string; html: string; to: string[]; subject: string };
    expect(body.to).toEqual(["admin@example.org"]);
    expect(body.subject).toContain("Reports receiver");
    expect(body.html).toContain("Amina &lt;Admin&gt;");
    expect(body.text).toContain("failed after 8 attempts");
    expect(`${body.text}\n${body.html}`).not.toMatch(/financial record|account number|report payload|signing secret/i);
  });

  it("returns a retryable failure if Resend is unreachable", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network failure");
    });
    await expect(sendCushVerifyWebhookFailureEmail(message, {
      apiKey: "test-api-key",
      from: "Cush Verify <support@example.org>",
      fetcher: fetcher as unknown as typeof fetch,
    })).resolves.toEqual({ status: "failed" });
  });
});
