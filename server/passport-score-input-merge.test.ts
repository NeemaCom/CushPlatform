import { describe, expect, it } from "vitest";
import { extractPassportDocumentFinancialFacts } from "@shared/passport-document-facts";
import {
  passportFinancialProfileSchema,
  validatePassportFinancialProfilePeriod,
} from "./passport-evidence-service";
import { buildProfileScoreInputs } from "./passport-manual-score-input";
import { mergePassportScoreInputs } from "./passport-score-input-merge";
import { calculateCushScore } from "./cush-score-service";
import type { V2AssessmentInput } from "@shared/schema";

function provisionalScoreForProfileInputs(input: V2AssessmentInput) {
  return calculateCushScore({
    individualUserId: 17,
    assessmentMonth: "2026-11",
    destinationBaseline: {
      destination: "United Kingdom",
      monthlyBaselinePence: 100_000,
      effectiveDate: "2026-01-01",
      countryCode: "GB",
    },
    hasSubmittedFinancialData: input.availableFunds.length > 0 ||
      input.incomeHistory.length > 0 || input.cashFlowHistory.length > 0,
    availableFunds: input.availableFunds.map((fund) => ({
      id: fund.id,
      deduplicationKey: fund.deduplicationKey,
      amountPence: fund.amountPence,
      accessible: fund.accessible,
      evidenceQuality: "self_reported" as const,
    })),
    incomeHistory: input.incomeHistory.map((income) => ({
      ...income,
      evidenceQuality: "self_reported" as const,
    })),
    sourceEvidenceShares: input.availableFunds.length || input.incomeHistory.length
      ? [{ sourceType: "self_reported", share: 1 }]
      : [],
    cashFlowHistory: input.cashFlowHistory.map((row) => ({
      ...row,
      evidenceQuality: "self_reported" as const,
    })),
    credit: { classification: "unavailable", evidenceQuality: null, checkStatus: "not_done" },
    dataAgeDays: null,
    coveredAccountCount: 0,
    declaredAccountCount: 0,
    unresolvedUnconnectedTransferShare: 0,
    incomeSourceType: "other",
    integrityFlags: [],
  }, { creditMappings: {} });
}

describe("progressive Pre-Arrival and Post-Arrival score inputs", () => {
  it("builds a provisional assessment from Post-Arrival data with no Pre-Arrival profile", async () => {
    const postArrival = passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "GBP",
      incomeAmount: "",
      incomeFrequency: "",
      savingsAmount: "",
      financialHistory: [{
        id: "71dcfd1f-6f47-4af2-b4de-4ff2d572f834",
        month: "2026-10",
        label: "Post-arrival payslip",
        countryCode: "GB",
        currencyCode: "GBP",
        incomeAmount: "2500",
        incomeFrequency: "monthly",
        incomeCategory: "salary",
        recurring: true,
        variable: false,
        savingsAmount: "1200",
        savingsLabel: "Post-arrival current account",
        expensesAmount: "800",
        completeCashFlow: false,
      }],
    });
    const [preInputs, postInputs] = await Promise.all([
      buildProfileScoreInputs(null, "2026-11"),
      buildProfileScoreInputs(postArrival, "2026-11"),
    ]);

    expect(validatePassportFinancialProfilePeriod(postArrival, "post_arrival", null)).toBe("arrival_required");
    expect(validatePassportFinancialProfilePeriod(postArrival, "post_arrival", "2026-10-01")).toBeNull();
    const merged = mergePassportScoreInputs(preInputs, postInputs);

    expect(merged.availableFunds).toHaveLength(1);
    expect(merged.incomeHistory).toHaveLength(1);
    expect(merged.incomeHistory[0]).toMatchObject({
      month: "2026-10",
      amountPence: 250_000,
      sourceId: "passport-manual:GB:GBP:post-arrival payslip",
    });
    const assessment = provisionalScoreForProfileInputs({
      selectedBaselineId: null,
      availableFunds: merged.availableFunds,
      incomeHistory: merged.incomeHistory,
      cashFlowHistory: merged.cashFlowHistory,
      creditClassification: "unavailable",
    });
    expect(assessment.cushScore).toBeNull();
    expect(assessment.provisionalScore).not.toBeNull();
  });

  it("does not double-count the same source-month when both stages contain it", async () => {
    const profile = passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "GBP",
      incomeAmount: "",
      incomeFrequency: "",
      savingsAmount: "",
      financialHistory: [{
        id: "d7c5c037-a59a-4b3b-ae3d-a9072c9af187",
        month: "2026-10",
        label: "Same salary source",
        countryCode: "GB",
        currencyCode: "GBP",
        incomeAmount: "2500",
        incomeFrequency: "monthly",
        incomeCategory: "salary",
        recurring: true,
        variable: false,
        savingsAmount: "",
        savingsLabel: "",
        expensesAmount: "",
        completeCashFlow: false,
      }],
    });
    const part = await buildProfileScoreInputs(profile, "2026-11");
    const merged = mergePassportScoreInputs(part, part);

    expect(merged.incomeHistory).toHaveLength(1);
    expect(merged.cashFlowHistory).toHaveLength(1);
  });

  it("scores extracted financial figures only after the user confirms them in the profile", async () => {
    const facts = extractPassportDocumentFinancialFacts(
      "Statement period: October 2026\nNet pay: GBP 2,500.00\nClosing balance: GBP 4,000.00",
      "bank_statement",
      "application/pdf",
    );
    const empty = passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "GBP",
      financialHistory: [],
    });
    const emptyInputs = await buildProfileScoreInputs(empty, "2026-11");
    expect(provisionalScoreForProfileInputs({
      selectedBaselineId: null,
      availableFunds: emptyInputs.availableFunds,
      incomeHistory: emptyInputs.incomeHistory,
      cashFlowHistory: emptyInputs.cashFlowHistory,
      creditClassification: "unavailable",
    }).provisionalScore).toBeNull();

    const confirmed = passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "GBP",
      financialHistory: facts.map((fact) => ({
        id: "4c984b7f-bdca-4e43-aea0-1caaf12f7718",
        month: fact.month!,
        label: `Statement: ${fact.label}`,
        countryCode: "GB",
        currencyCode: "GBP",
        incomeAmount: fact.incomeAmount,
        incomeFrequency: fact.incomeFrequency,
        incomeCategory: fact.incomeCategory,
        recurring: fact.recurring,
        variable: fact.variable,
        savingsAmount: fact.savingsAmount,
        savingsLabel: fact.savingsAmount ? fact.label : "",
        expensesAmount: fact.expensesAmount,
        completeCashFlow: false,
      })),
    });
    const confirmedInputs = await buildProfileScoreInputs(confirmed, "2026-11");
    const assessment = provisionalScoreForProfileInputs({
      selectedBaselineId: null,
      availableFunds: confirmedInputs.availableFunds,
      incomeHistory: confirmedInputs.incomeHistory,
      cashFlowHistory: confirmedInputs.cashFlowHistory,
      creditClassification: "unavailable",
    });

    expect(confirmedInputs.availableFunds).toHaveLength(1);
    expect(confirmedInputs.incomeHistory).toHaveLength(1);
    expect(assessment.provisionalScore).not.toBeNull();
    expect(assessment.componentScores.availableFunds).not.toBeNull();
    expect(assessment.componentScores.incomeStrength).not.toBeNull();
  });
});
