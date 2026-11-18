import { describe, expect, it } from "vitest";
import { sendCushVerifyInvitationEmail } from "./cush-verify-invitation-email";

describe("Cush Verify team invitation email", () => {
  it("explains that a team membership activates after official email verification", async () => {
    let captured: RequestInit | undefined;
    const fetcher: typeof fetch = async (_input, init) => {
      captured = init;
      return new Response("{}", { status: 200 });
    };

    const result = await sendCushVerifyInvitationEmail({
      email: "analyst@another-official-domain.example",
      contactName: "Amina Example",
      institutionName: "Example University",
      inviteUrl: "https://verify.we-cush.com/verify/register?token=secure",
      invitationId: 42,
      role: "analyst",
      institutionApproved: true,
    }, {
      apiKey: "test-key",
      from: "Cush Verify <support@we-cush.com>",
      fetcher,
    });

    expect(result).toEqual({ status: "sent" });
    const message = JSON.parse(String(captured?.body)) as { text: string; html: string };
    expect(message.text).toContain("membership will be active");
    expect(message.text).toContain("No additional Cush Admin approval is required");
    expect(message.text).not.toContain("organisation remains under review");
    expect(message.html).toContain("Analyst membership will be active");
  });

  it("keeps initial organisation onboarding behind the existing organisation review", async () => {
    let captured: RequestInit | undefined;
    const fetcher: typeof fetch = async (_input, init) => {
      captured = init;
      return new Response("{}", { status: 200 });
    };

    await sendCushVerifyInvitationEmail({
      email: "admin@university.example",
      contactName: "Amina Example",
      institutionName: "Example University",
      inviteUrl: "https://verify.we-cush.com/verify/register?token=secure",
      invitationId: 43,
      role: "organisation_admin",
    }, {
      apiKey: "test-key",
      from: "Cush Verify <support@we-cush.com>",
      fetcher,
    });

    const message = JSON.parse(String(captured?.body)) as { text: string };
    expect(message.text).toContain("organisation remains under review");
    expect(message.text).toContain("does not grant access");
  });
});
