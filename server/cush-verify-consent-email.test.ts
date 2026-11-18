import { describe, expect, it, vi } from "vitest";
import { sendCushVerifyConsentRequestEmail } from "./cush-verify-consent-email";

describe("Cush Verify consent request email", () => {
  it("sends a generic secure review link without including report purpose or financial data", async () => {
    let body: Record<string, unknown> | undefined;
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(null, { status: 200 });
    });
    const result = await sendCushVerifyConsentRequestEmail({
      email: "person@example.com",
      institutionName: "Example Housing",
      consentUrl: "https://app.we-cush.com/passport/consent-invite?token=secret",
      requestId: "8b47d421-47d4-4a38-937c-a50b6efc77f4",
    }, {
      apiKey: "test-key",
      from: "Cush Verify <no-reply@example.com>",
      fetcher,
    });

    expect(result).toEqual({ status: "sent" });
    expect(body).toMatchObject({
      to: ["person@example.com"],
      subject: "A Cush Verify request from Example Housing needs your review",
    });
    expect(JSON.stringify(body)).toContain("consent-invite");
    expect(JSON.stringify(body)).not.toContain("salary");
    expect(JSON.stringify(body)).not.toContain("financial data");
  });

  it("reports unavailable mail configuration without making a request", async () => {
    const fetcher = vi.fn();
    const result = await sendCushVerifyConsentRequestEmail({
      email: "person@example.com",
      institutionName: "Example Housing",
      consentUrl: "https://app.we-cush.com/passport/consent-invite?token=secret",
      requestId: "8b47d421-47d4-4a38-937c-a50b6efc77f4",
    }, { apiKey: "", from: "", fetcher });
    expect(result).toEqual({ status: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
