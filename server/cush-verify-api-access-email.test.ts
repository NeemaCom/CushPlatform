import { describe, expect, it, vi } from "vitest";
import { sendCushVerifyApiAccessApprovedEmail } from "./cush-verify-api-access-email";

describe("Cush Verify API access approval email", () => {
  it("emails the requester with the plan gate and a workspace link", async () => {
    let body: Record<string, unknown> | undefined;
    let headers: HeadersInit | undefined;
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      headers = init?.headers;
      return new Response(null, { status: 200 });
    });

    const result = await sendCushVerifyApiAccessApprovedEmail({
      email: "admin@example.com",
      contactName: "Amina <Admin>",
      institutionName: "Example Housing",
      requestId: 41,
      workspaceUrl: "https://verify.we-cush.com/verify/workspace",
    }, {
      apiKey: "test-key",
      from: "Cush Verify <support@example.com>",
      fetcher,
    });

    expect(result).toEqual({ status: "sent" });
    expect(body).toMatchObject({
      to: ["admin@example.com"],
      subject: "Your Cush Verify production API access request was approved",
    });
    expect(JSON.stringify(body)).toContain("active subscription that includes API access");
    expect(JSON.stringify(body)).toContain("https://verify.we-cush.com/verify/workspace");
    expect(JSON.stringify(body)).toContain("Amina &lt;Admin&gt;");
    expect(new Headers(headers).get("Idempotency-Key")).toBe("cush-verify-api-access-approved-41");
  });

  it("does not call Resend when email settings are missing", async () => {
    const fetcher = vi.fn();
    const result = await sendCushVerifyApiAccessApprovedEmail({
      email: "admin@example.com",
      contactName: "Amina",
      institutionName: "Example Housing",
      requestId: 41,
    }, { apiKey: "", from: "", fetcher });

    expect(result).toEqual({ status: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports provider failures without throwing", async () => {
    const result = await sendCushVerifyApiAccessApprovedEmail({
      email: "admin@example.com",
      contactName: "Amina",
      institutionName: "Example Housing",
      requestId: 41,
    }, {
      apiKey: "test-key",
      from: "Cush Verify <support@example.com>",
      fetcher: vi.fn(async () => new Response(null, { status: 500 })),
    });

    expect(result).toEqual({ status: "failed" });
  });
});
