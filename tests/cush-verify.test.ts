import { describe, expect, it } from "vitest";
import {
  cushVerifyInstitutionInterestSchema,
  cushVerifyReviewStatusSchema,
} from "../shared/cush-verify";

const validInterest = {
  institutionName: "Example Bank",
  institutionType: "bank",
  contactName: "Alex Example",
  jobTitle: "Partnerships Director",
  email: " PARTNERSHIPS@EXAMPLE.COM ",
  country: "United Kingdom",
  intendedUse: "Explore a future pilot.",
  verificationRequirements: "Identity confirmation and consented financial history.",
  preferredEngagementModel: "api_integration",
  contactConsent: true,
  website: "",
};

describe("Cush Verify institution interest", () => {
  it("normalizes form strings and email addresses", () => {
    const result = cushVerifyInstitutionInterestSchema.parse(validInterest);
    expect(result.email).toBe("partnerships@example.com");
    expect(result.institutionName).toBe("Example Bank");
    expect(result.preferredEngagementModel).toBe("api_integration");
  });

  it("requires explicit permission to follow up", () => {
    expect(cushVerifyInstitutionInterestSchema.safeParse({
      ...validInterest,
      contactConsent: false,
    }).success).toBe(false);
  });

  it("rejects invalid addresses and unexpected request fields", () => {
    expect(cushVerifyInstitutionInterestSchema.safeParse({
      ...validInterest,
      email: "not-an-email",
    }).success).toBe(false);
    expect(cushVerifyInstitutionInterestSchema.safeParse({
      ...validInterest,
      hasAccess: true,
    }).success).toBe(false);
  });

  it("accepts only the defined review states", () => {
    expect(cushVerifyReviewStatusSchema.safeParse("approved_for_follow_up").success).toBe(true);
    expect(cushVerifyReviewStatusSchema.safeParse("active").success).toBe(false);
  });

  it("accepts university institutions and an empty optional requirements field", () => {
    const result = cushVerifyInstitutionInterestSchema.parse({
      ...validInterest,
      verificationRequirements: "",
      institutionType: "university",
    });
    expect(result.verificationRequirements).toBe("");
    expect(result.preferredEngagementModel).toBe("api_integration");
  });

  it("keeps legacy submissions without an engagement preference compatible", () => {
    const { preferredEngagementModel: _engagement, ...input } = validInterest;
    expect(cushVerifyInstitutionInterestSchema.safeParse(input).success).toBe(true);
    expect(cushVerifyInstitutionInterestSchema.safeParse({
      ...input,
      preferredEngagementModel: "",
    }).success).toBe(false);
  });

  it("rejects unsupported engagement models and oversized requirements", () => {
    expect(cushVerifyInstitutionInterestSchema.safeParse({
      ...validInterest,
      preferredEngagementModel: "automatic_access",
    }).success).toBe(false);
    expect(cushVerifyInstitutionInterestSchema.safeParse({
      ...validInterest,
      verificationRequirements: "x".repeat(1201),
    }).success).toBe(false);
  });
});
