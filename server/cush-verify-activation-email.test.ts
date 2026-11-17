import { describe, expect, it, vi } from "vitest";
import { sendCushVerifyActivationEmail } from "./cush-verify-invitation-email";

describe("Cush Verify activation email", () => {
  it("sends the activation link with a one-time idempotency key", async () => {
    let requestOptions: RequestInit | undefined;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestOptions = init;
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    const result = await sendCushVerifyActivationEmail({
      email: "official@example.org",
      contactName: "Alex <Admin>",
      institutionName: "Example <University>",
      activationUrl: "https://verify.we-cush.com/verify/activate#token=secret",
      activationId: 41,
    }, {
      apiKey: "test-key",
      from: "Cush Verify <support@example.org>",
      fetcher,
    });

    expect(result).toEqual({ status: "sent" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((requestOptions?.headers as Record<string, string>)["Idempotency-Key"])
      .toBe("cush-verify-activation-41");
    const body = JSON.parse(String(requestOptions?.body)) as {
      to: string[];
      text: string;
      html: string;
    };
    expect(body.to).toEqual(["official@example.org"]);
    expect(body.text).toContain("expires in 24 hours");
    expect(body.text).toContain("https://verify.we-cush.com/verify/activate#token=secret");
    expect(body.html).toContain("Alex &lt;Admin&gt;");
    expect(body.html).toContain("Example &lt;University&gt;");
    expect(body.html).not.toContain("Alex <Admin>");
  });

  it("does not call the provider when email delivery is not configured", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const result = await sendCushVerifyActivationEmail({
      email: "official@example.org",
      contactName: "Alex Example",
      institutionName: "Example University",
      activationUrl: "https://verify.we-cush.com/verify/activate#token=secret",
      activationId: 42,
    }, { fetcher });

    expect(result).toEqual({ status: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
