import { describe, expect, it } from "vitest";
import {
  cushVerifyApplicationSchema,
  cushVerifyApplicantInstitutionTypes,
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

describe("Cush Verify institutional applications", () => {
  const validApplication = {
    legalName: "Example Housing Group Ltd",
    tradingName: "Example Homes",
    institutionType: "housing_organisation",
    countryOfRegistration: "United Kingdom",
    website: "https://example.org",
    businessEmail: " PARTNERSHIPS@EXAMPLE.ORG ",
    contactFullName: "Jordan Example",
    contactJobTitle: "Head of Partnerships",
    businessTelephone: "+44 20 5555 0100",
    intendedUse: "Discuss a consent-led verification pilot for new tenants.",
    estimatedMonthlyVerifications: 150,
    contactConsent: true,
  };

  it("normalizes business email and accepts optional volume", () => {
    const result = cushVerifyApplicationSchema.parse(validApplication);
    expect(result.businessEmail).toBe("partnerships@example.org");
    expect(result.estimatedMonthlyVerifications).toBe(150);
  });

  it("allows only the institution types selected by Cush", () => {
    expect(cushVerifyApplicantInstitutionTypes).toEqual([
      "university",
      "housing_organisation",
      "bank",
      "landlord",
    ]);
    expect(cushVerifyApplicationSchema.safeParse({
      ...validApplication,
      institutionType: "employer",
    }).success).toBe(false);
  });

  it("requires contact consent and a valid official website", () => {
    expect(cushVerifyApplicationSchema.safeParse({
      ...validApplication,
      contactConsent: false,
    }).success).toBe(false);
    expect(cushVerifyApplicationSchema.safeParse({
      ...validApplication,
      website: "not a website",
    }).success).toBe(false);
  });

  it("rejects an invalid telephone, huge volume, and unexpected access fields", () => {
    expect(cushVerifyApplicationSchema.safeParse({
      ...validApplication,
      businessTelephone: "1",
    }).success).toBe(false);
    expect(cushVerifyApplicationSchema.safeParse({
      ...validApplication,
      estimatedMonthlyVerifications: 10_000_001,
    }).success).toBe(false);
    expect(cushVerifyApplicationSchema.safeParse({
      ...validApplication,
      accessGranted: true,
    }).success).toBe(false);
  });
});
