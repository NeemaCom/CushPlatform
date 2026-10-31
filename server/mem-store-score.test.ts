import { describe, expect, it } from "vitest";
import {
  addEvidence,
  addSignal,
  getOrCreatePassport,
  recalculatePassport,
} from "./mem-store";

describe("live passport scoring adapter", () => {
  it("stops deriving a score from legacy signals and returns V2 incomplete status", () => {
    const userId = 8_765_432;
    const passport = getOrCreatePassport(userId);

    addSignal({
      userId,
      passportId: passport.id,
      signalType: "income",
      label: "Monthly income",
      rawAmountCents: 300_000,
      currencyCode: "GBP",
      country: "GB",
      period: "monthly",
    });
    addEvidence({
      userId,
      passportId: passport.id,
      documentType: "bank_statement",
      label: "Bank statement",
      tier: 2,
      fileData: "data:application/pdf;base64,AA==",
      fileName: "statement.pdf",
    });

    const result = recalculatePassport(passport.id, userId);

    expect(result.algorithmVersion).toBe("2.2.0");
    expect(result.score).toBeNull();
    expect(result.assessmentStatus).toBe("incomplete");
    expect(result.legacyDataNotice).toContain("do not contain the dated");
    expect(result.scoreBreakdown).toEqual({
      availableFunds: null,
      incomeStrength: null,
      cashFlow: null,
      creditHistory: null,
    });
    expect(result.missingRequirements).toContain("Selected destination and approved monthly baseline");
  });
});
