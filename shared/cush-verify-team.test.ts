import { describe, expect, it } from "vitest";
import { cushVerifyTeamInvitationSchema } from "./cush-verify";

describe("Cush Verify team invitation details", () => {
  it("accepts a verified work email on a domain different from the institution's contact email", () => {
    const result = cushVerifyTeamInvitationSchema.safeParse({
      email: "Analyst@another-official-domain.example",
      fullName: "Amina Example",
      jobTitle: "Verification Analyst",
      role: "analyst",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("analyst@another-official-domain.example");
    }
  });

  it("accepts only the supported institutional roles and expected input fields", () => {
    expect(cushVerifyTeamInvitationSchema.safeParse({
      email: "viewer@institution.example",
      fullName: "Amina Example",
      jobTitle: "Viewer",
      role: "owner",
    }).success).toBe(false);

    expect(cushVerifyTeamInvitationSchema.safeParse({
      email: "viewer@institution.example",
      fullName: "Amina Example",
      jobTitle: "Viewer",
      role: "viewer",
      businessTelephone: "not-needed",
    }).success).toBe(false);
  });
});
