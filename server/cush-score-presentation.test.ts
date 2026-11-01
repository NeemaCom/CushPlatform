import { describe, expect, it } from "vitest";
import type { CushScoreResult } from "./cush-score-service";
import { FLAT_UK_BASELINE, toCustomerCalculation } from "./cush-score-presentation";

const calculation: CushScoreResult = {
  algorithmVersion: "test",
  assessmentStatus: "provisional",
  cushScore: null,
  provisionalScore: 640,
  scoreCoveragePercent: 70,
  scoredComponentCount: 2,
  confidenceScore: 61,
  confidenceBand: "medium",
  componentScores: {
    availableFunds: 80,
    incomeStrength: 60,
    cashFlow: null,
    creditHistory: null,
  },
  weightedContributions: {
    availableFunds: 280,
    incomeStrength: 180,
    cashFlow: null,
    creditHistory: null,
  },
  confidenceBreakdown: null,
  recognizedMonthlyIncomePence: 180_000,
  fundsMonths: 4,
  incomeRatio: 1.8,
  cashFlowCap: null,
  usableHistoryMonths: 3,
  missingRequirements: ["Connect a bank for statements"],
  assessmentContext: {
    individualUserId: 7,
    destinationBaseline: FLAT_UK_BASELINE,
  },
};

describe("customer score presentation", () => {
  it("uses a flat £1,000 UK baseline", () => {
    expect(FLAT_UK_BASELINE).toMatchObject({
      destination: "United Kingdom",
      monthlyBaselinePence: 100_000,
      countryCode: "GB",
    });
  });

  it("keeps the overall score and progress while withholding component details", () => {
    const customerView = toCustomerCalculation(calculation);

    expect(customerView).toMatchObject({
      provisionalScore: 640,
      scoreCoveragePercent: 70,
      confidenceScore: 61,
      usableHistoryMonths: 3,
    });
    expect(customerView).not.toHaveProperty("componentScores");
    expect(customerView).not.toHaveProperty("weightedContributions");
    expect(customerView).not.toHaveProperty("confidenceBreakdown");
    expect(customerView).not.toHaveProperty("assessmentContext");
    expect(customerView).not.toHaveProperty("scoredComponentCount");
  });
});
