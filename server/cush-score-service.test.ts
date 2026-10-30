import { describe, expect, it } from "vitest";
import {
  calculateCushScore,
  type CushScoreInput,
  type CushScorePolicy,
  type MonthlyCashFlow,
  type MonthlyIncomeObservation,
} from "./cush-score-service";

// These are explicit test fixtures, not production credit or confidence policies.
const policy: CushScorePolicy = {
  creditMappings: {
    strong: 90,
    average: 60,
    poor: 20,
    no_history: 30,
  },
  confidence: {
    historyMonthsForMaximum: 6,
    evidenceQualityWeights: {
      verified: 1,
      documented: 0.7,
      self_reported: 0.3,
    },
    creditAvailabilityWeights: {
      verified: 1,
      documented: 0.7,
      self_reported: 0.3,
    },
    incomeReliabilityByCategory: {
      salary: 1,
      self_employment: 0.8,
      freelance: 0.75,
      business: 0.8,
      scholarship: 0.7,
      family_support: 0.65,
      other: 0.5,
    },
    freshnessBands: [
      { maxAgeDays: 30, points: 10 },
      { maxAgeDays: 90, points: 7 },
      { maxAgeDays: 180, points: 3 },
    ],
  },
};

const BASELINE_PENCE = 120_300;
const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

function completeIncomeHistory(
  amountPence = BASELINE_PENCE * 2,
  options: Partial<MonthlyIncomeObservation> = {},
): MonthlyIncomeObservation[] {
  return months.map((month) => ({
    month,
    sourceId: "salary-1",
    category: "salary",
    amountPence,
    recurring: true,
    variable: false,
    evidenceQuality: "verified",
    ...options,
  }));
}

function completeCashFlow(
  incomePence = BASELINE_PENCE * 2,
  expensesPence = Math.round(incomePence * 0.7),
): MonthlyCashFlow[] {
  return months.map((month) => ({
    month,
    eligibleRecurringIncomePence: incomePence,
    eligibleExpensesPence: expensesPence,
    complete: true,
    evidenceQuality: "verified",
  }));
}

function completeInput(overrides: Partial<CushScoreInput> = {}): CushScoreInput {
  return {
    individualUserId: 42,
    assessmentMonth: "2026-10",
    destinationBaseline: {
      destination: "Outside London, United Kingdom",
      monthlyBaselinePence: BASELINE_PENCE,
      effectiveDate: "2026-01-01",
      countryCode: "GB",
    },
    hasSubmittedFinancialData: true,
    availableFunds: [{
      id: "fund-1",
      deduplicationKey: "bank-account-1",
      amountPence: BASELINE_PENCE * 6,
      accessible: true,
      evidenceQuality: "verified",
    }],
    incomeHistory: completeIncomeHistory(),
    sourceEvidenceQualities: ["verified"],
    cashFlowHistory: completeCashFlow(),
    credit: { classification: "thin_file", evidenceQuality: "verified" },
    dataAgeDays: 10,
    coveredAccountCount: 2,
    declaredAccountCount: 2,
    integrityFlags: [],
    ...overrides,
  };
}

describe("Cush Score V2 engine", () => {
  it("calculates the prompt weights and leaves thin-file credit neutral", () => {
    const result = calculateCushScore(completeInput(), policy);

    expect(result.assessmentStatus).toBe("complete");
    expect(result.componentScores).toEqual({
      availableFunds: 100,
      incomeStrength: 100,
      cashFlow: 100,
      creditHistory: 50,
    });
    expect(result.weightedContributions).toEqual({
      availableFunds: 350,
      incomeStrength: 300,
      cashFlow: 200,
      creditHistory: 75,
    });
    expect(result.cushScore).toBe(925);
    expect(result.provisionalScore).toBeNull();
    expect(result.confidenceScore).toBe(100);
  });

  it("only counts verified, accessible funds and rejects duplicate funds", () => {
    const result = calculateCushScore(completeInput({
      availableFunds: [
        {
          id: "verified",
          deduplicationKey: "one-account",
          amountPence: BASELINE_PENCE,
          accessible: true,
          evidenceQuality: "verified",
        },
        {
          id: "unverified",
          deduplicationKey: "another-account",
          amountPence: BASELINE_PENCE * 100,
          accessible: true,
          evidenceQuality: "documented",
        },
        {
          id: "locked",
          deduplicationKey: "locked-account",
          amountPence: BASELINE_PENCE * 100,
          accessible: false,
          evidenceQuality: "verified",
        },
      ],
    }), policy);

    expect(result.fundsMonths).toBe(1);
    expect(result.componentScores.availableFunds).toBe(20);
    expect(() => calculateCushScore(completeInput({
      availableFunds: [
        {
          id: "one",
          deduplicationKey: "same-source",
          amountPence: 1,
          accessible: true,
          evidenceQuality: "verified",
        },
        {
          id: "two",
          deduplicationKey: "same-source",
          amountPence: 2,
          accessible: true,
          evidenceQuality: "verified",
        },
      ],
    }), policy)).toThrow(/Duplicate funds/);
  });

  it("interpolates funds between the prompt's benchmark points", () => {
    const result = calculateCushScore(completeInput({
      availableFunds: [{
        id: "fund-2-months",
        deduplicationKey: "two-months",
        amountPence: BASELINE_PENCE * 2,
        accessible: true,
        evidenceQuality: "verified",
      }],
    }), policy);

    expect(result.fundsMonths).toBe(2);
    expect(result.componentScores.availableFunds).toBe(40);
  });

  it("uses the lower of median income and the variable-income haircut", () => {
    const variableHistory = months.map((month, index) => ({
      month,
      sourceId: "freelance-1",
      category: "freelance" as const,
      amountPence: (index + 1) * 100_000,
      recurring: true,
      variable: true,
      evidenceQuality: "documented" as const,
    }));
    const oneOff = {
      month: "2026-10",
      sourceId: "one-off",
      category: "other" as const,
      amountPence: 99_000_000,
      recurring: false,
      variable: true,
      evidenceQuality: "verified" as const,
    };

    const result = calculateCushScore(completeInput({
      incomeHistory: [...variableHistory, oneOff],
    }), policy);

    // Median is £3,500; mean × 80% is £2,800. One-off money is ignored.
    expect(result.recognizedMonthlyIncomePence).toBe(280_000);
  });

  it("applies the 80% haircut to a verified UK offer and does not double-count its source", () => {
    const result = calculateCushScore(completeInput({
      incomeHistory: completeIncomeHistory(100_000, { sourceId: "job-1" }),
      verifiedUkEmploymentOffer: {
        sourceId: "job-1",
        monthlyAmountPence: 200_000,
        evidenceQuality: "verified",
      },
    }), policy);

    expect(result.recognizedMonthlyIncomePence).toBe(160_000);
  });

  it("recognizes documented recurring family support as the applicant's own inflow", () => {
    const result = calculateCushScore(completeInput({
      incomeHistory: completeIncomeHistory(BASELINE_PENCE, {
        sourceId: "support-1",
        category: "family_support",
        evidenceQuality: "documented",
      }),
    }), policy);

    expect(result.recognizedMonthlyIncomePence).toBe(BASELINE_PENCE);
    expect(result.componentScores.incomeStrength).toBe(60);
    expect(result.assessmentStatus).toBe("complete");
  });

  it("keeps a confirmed no-history result distinct from thin-file neutral scoring", () => {
    const result = calculateCushScore(completeInput({
      credit: { classification: "no_history", evidenceQuality: "verified" },
    }), policy);

    expect(result.componentScores.creditHistory).toBe(30);
    expect(result.cushScore).toBe(895);
  });

  it("does not treat unavailable credit information as thin-file credit", () => {
    const result = calculateCushScore(completeInput({
      credit: { classification: "unavailable", evidenceQuality: null },
    }), policy);

    expect(result.componentScores.creditHistory).toBeNull();
    expect(result.cushScore).toBeNull();
    expect(result.assessmentStatus).toBe("incomplete");
    expect(result.missingRequirements).toContain("Completed, supported credit assessment");
  });

  it("caps cash-flow points according to the recognized income ratio", () => {
    const incomePence = Math.round(BASELINE_PENCE * 0.5);
    const result = calculateCushScore(completeInput({
      incomeHistory: completeIncomeHistory(incomePence),
      cashFlowHistory: completeCashFlow(incomePence, 0),
    }), policy);

    expect(result.cashFlowCap).toBe(70);
    expect(result.componentScores.cashFlow).toBe(70);
  });

  it("scores zero safely when recognized income is zero", () => {
    const result = calculateCushScore(completeInput({
      incomeHistory: completeIncomeHistory(0),
      cashFlowHistory: completeCashFlow(0, 0),
    }), policy);

    expect(result.componentScores.incomeStrength).toBe(0);
    expect(result.componentScores.cashFlow).toBe(0);
    expect(result.cashFlowCap).toBe(40);
  });

  it("keeps strong savings and low income as distinct component results", () => {
    const lowIncome = Math.round(BASELINE_PENCE * 0.5);
    const result = calculateCushScore(completeInput({
      availableFunds: [{
        id: "savings",
        deduplicationKey: "verified-savings",
        amountPence: BASELINE_PENCE * 6,
        accessible: true,
        evidenceQuality: "verified",
      }],
      incomeHistory: completeIncomeHistory(lowIncome),
      cashFlowHistory: completeCashFlow(lowIncome, lowIncome),
    }), policy);

    expect(result.componentScores.availableFunds).toBe(100);
    expect(result.componentScores.incomeStrength).toBe(30);
    expect(result.componentScores.cashFlow).toBe(0);
  });

  it("does not let strong income hide limited available funds", () => {
    const result = calculateCushScore(completeInput({
      availableFunds: [{
        id: "small-balance",
        deduplicationKey: "small-balance",
        amountPence: BASELINE_PENCE,
        accessible: true,
        evidenceQuality: "verified",
      }],
      incomeHistory: completeIncomeHistory(BASELINE_PENCE * 2),
      cashFlowHistory: completeCashFlow(BASELINE_PENCE * 2, BASELINE_PENCE * 2),
      credit: { classification: "strong", evidenceQuality: "verified" },
    }), policy);

    expect(result.componentScores.availableFunds).toBe(20);
    expect(result.componentScores.incomeStrength).toBe(100);
    expect(result.componentScores.creditHistory).toBe(90);
  });

  it("does not invent a credit score when no approved mapping exists", () => {
    const result = calculateCushScore(completeInput({
      credit: { classification: "strong", evidenceQuality: "verified" },
    }), {
      ...policy,
      creditMappings: {},
    });

    expect(result.componentScores.creditHistory).toBeNull();
    expect(result.cushScore).toBeNull();
    expect(result.provisionalScore).toBeNull();
    expect(result.assessmentStatus).toBe("incomplete");
  });

  it("keeps a provisional total separate until all minimum requirements are met", () => {
    const result = calculateCushScore(completeInput({
      cashFlowHistory: completeCashFlow().slice(3),
    }), policy);

    expect(result.assessmentStatus).toBe("provisional");
    expect(result.cushScore).toBeNull();
    expect(result.provisionalScore).toBe(925);
    expect(result.missingRequirements).toContain("At least four months of usable financial history");
  });

  it("does not calculate baseline-dependent components before a destination is selected", () => {
    const result = calculateCushScore(completeInput({
      destinationBaseline: null,
    }), policy);

    expect(result.assessmentStatus).toBe("incomplete");
    expect(result.cushScore).toBeNull();
    expect(result.componentScores.availableFunds).toBeNull();
    expect(result.componentScores.incomeStrength).toBeNull();
    expect(result.componentScores.cashFlow).toBeNull();
    expect(result.missingRequirements).toContain("Selected destination and approved monthly baseline");
  });

  it("keeps a weighted score provisional without approved confidence rules", () => {
    const { confidence: _confidence, ...unapprovedConfidencePolicy } = policy;
    const result = calculateCushScore(completeInput(), unapprovedConfidencePolicy);

    expect(result.assessmentStatus).toBe("provisional");
    expect(result.cushScore).toBeNull();
    expect(result.provisionalScore).toBe(925);
    expect(result.confidenceScore).toBeNull();
    expect(result.missingRequirements).toContain("Approved confidence-scoring policy");
  });

  it("deducts five confidence points only for confirmed, evidenced integrity flags", () => {
    const result = calculateCushScore(completeInput({
      integrityFlags: [
        {
          id: "flag-confirmed",
          reason: "A reviewed duplicate transaction was confirmed.",
          evidenceReference: "review:123",
          recordedAt: "2026-10-10T10:00:00.000Z",
          reviewStatus: "confirmed",
        },
        {
          id: "flag-pending",
          reason: "Awaiting review.",
          evidenceReference: "review:124",
          recordedAt: "2026-10-11T10:00:00.000Z",
          reviewStatus: "pending",
        },
      ],
    }), policy);

    expect(result.confidenceScore).toBe(95);
    expect(result.confidenceBreakdown?.integrityDeduction).toBe(5);
  });

  it("ignores history older than the six-month assessment window", () => {
    const oldIncome = [{
      month: "2025-12",
      sourceId: "old-job",
      category: "salary" as const,
      amountPence: 10_000_000,
      recurring: true,
      variable: false,
      evidenceQuality: "verified" as const,
    }];
    const result = calculateCushScore(completeInput({
      incomeHistory: oldIncome,
    }), policy);

    expect(result.recognizedMonthlyIncomePence).toBeNull();
    expect(result.componentScores.incomeStrength).toBeNull();
  });

  it("rejects future and duplicate monthly observations", () => {
    expect(() => calculateCushScore(completeInput({
      incomeHistory: [...completeIncomeHistory(), {
        month: "2026-11",
        sourceId: "future",
        category: "salary",
        amountPence: 100,
        recurring: true,
        variable: false,
        evidenceQuality: "verified",
      }],
    }), policy)).toThrow(/future months/);

    expect(() => calculateCushScore(completeInput({
      incomeHistory: [...completeIncomeHistory(), completeIncomeHistory()[0]],
    }), policy)).toThrow(/one aggregated record per source and month/);

    expect(() => calculateCushScore(completeInput({
      cashFlowHistory: [...completeCashFlow(), completeCashFlow()[0]],
    }), policy)).toThrow(/one record per month/);
  });
});
