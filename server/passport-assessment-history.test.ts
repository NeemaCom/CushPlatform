import { describe, expect, it } from "vitest";
import {
  describeAssessmentChange,
  fingerprintAssessmentInputs,
  fingerprintPassportProfileSections,
  getAssessmentChangedInformation,
  getAssessmentMaturity,
} from "./passport-assessment-history";
import { passportFinancialProfileSchema } from "./passport-evidence-service";

describe("progressive Passport assessment history", () => {
  it("keeps Score and Confidence distinct when assessment inputs change", () => {
    expect(describeAssessmentChange({ score: 500, confidence: 35 }, 500, 50))
      .toContain("Cush Score stayed 500");
    expect(describeAssessmentChange({ score: 500, confidence: 35 }, 560, 35))
      .toContain("increased from 500 to 560");
    expect(describeAssessmentChange(undefined, 420, 30))
      .toContain("Initial assessment");
  });

  it("reports maturity from evidence sources without granting stage-completion points", () => {
    expect(getAssessmentMaturity({
      hasScore: false,
      hasInstitutionCredit: false,
      hasBankConnection: false,
      hasReviewedStatement: false,
    })).toBe("getting_started");
    expect(getAssessmentMaturity({
      hasScore: true,
      hasInstitutionCredit: false,
      hasBankConnection: false,
      hasReviewedStatement: false,
    })).toBe("provisional");
    expect(getAssessmentMaturity({
      hasScore: true,
      hasInstitutionCredit: false,
      hasBankConnection: false,
      hasReviewedStatement: true,
    })).toBe("evidence_supported");
    expect(getAssessmentMaturity({
      hasScore: true,
      hasInstitutionCredit: true,
      hasBankConnection: false,
      hasReviewedStatement: true,
    })).toBe("institution_supported");
  });

  it("creates the same history key for the same saved assessment inputs", () => {
    const source = { preArrivalUpdatedAt: "2026-11-22T12:00:00.000Z", score: 650 };
    expect(fingerprintAssessmentInputs(source)).toBe(fingerprintAssessmentInputs(source));
    expect(fingerprintAssessmentInputs(source)).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprintAssessmentInputs(source)).not.toBe(fingerprintAssessmentInputs({ ...source, score: 651 }));
  });

  it("names the confirmed profile section that changed without storing its values in history", () => {
    const before = passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "GBP",
      employer: "Aster Bank",
    });
    const after = passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "GBP",
      employmentStatus: "Employed",
      employer: "Aster Bank",
      incomeAmount: "2400",
      incomeFrequency: "monthly",
    });
    const previous = {
      preArrivalUpdatedAt: "2026-11-20T12:00:00.000Z",
      ...fingerprintPassportProfileSections(before, "preArrival"),
    };
    const current = {
      preArrivalUpdatedAt: "2026-11-22T12:00:00.000Z",
      ...fingerprintPassportProfileSections(after, "preArrival"),
    };

    expect(getAssessmentChangedInformation(previous, current))
      .toEqual(["Pre-Arrival income and employment"]);
    expect(JSON.stringify(current)).not.toContain("Aster Bank");
    expect(JSON.stringify(current)).not.toContain("2400");
  });

  it("does not claim a category changed when an older history row lacks category fingerprints", () => {
    const current = {
      preArrivalUpdatedAt: "2026-11-22T12:00:00.000Z",
      ...fingerprintPassportProfileSections(null, "preArrival"),
    };
    expect(getAssessmentChangedInformation(
      { preArrivalUpdatedAt: current.preArrivalUpdatedAt },
      current,
    )).toEqual([]);
  });

  it("names changes to the saved manual assessment categories", () => {
    expect(getAssessmentChangedInformation(
      {
        storedInputsUpdatedAt: "2026-11-20T12:00:00.000Z",
        manualAvailableFundsFingerprint: fingerprintAssessmentInputs([{ amountPence: 10000 }]),
      },
      {
        storedInputsUpdatedAt: "2026-11-22T12:00:00.000Z",
        manualAvailableFundsFingerprint: fingerprintAssessmentInputs([{ amountPence: 20000 }]),
      },
    )).toEqual(["Manual funds and savings"]);
  });
});
