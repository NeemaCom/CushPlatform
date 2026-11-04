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
  contactConsent: true,
  website: "",
};

describe("Cush Verify institution interest", () => {
  it("normalizes form strings and email addresses", () => {
    const result = cushVerifyInstitutionInterestSchema.parse(validInterest);
    expect(result.email).toBe("partnerships@example.com");
    expect(result.institutionName).toBe("Example Bank");
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
});
