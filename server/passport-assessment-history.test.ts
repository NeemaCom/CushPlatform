import { describe, expect, it } from "vitest";
import {
  describeAssessmentChange,
  fingerprintAssessmentInputs,
  getAssessmentMaturity,
} from "./passport-assessment-history";

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
});
