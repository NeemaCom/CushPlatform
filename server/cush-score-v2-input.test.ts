import { describe, expect, it } from "vitest";
import {
  cushScorePolicyConfigSchema,
  v2AssessmentInputSchema,
} from "@shared/schema";

const emptyInputs = {
  selectedBaselineId: null,
  availableFunds: [],
  incomeHistory: [],
  cashFlowHistory: [],
  creditClassification: "unavailable",
} as const;

function monthAfterCurrent() {
  const nextMonth = new Date();
  nextMonth.setUTCDate(1);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return nextMonth.toISOString().slice(0, 7);
}

describe("Cush Score V2 input and policy validation", () => {
  it("accepts GBP-only records without client-supplied evidence quality", () => {
    const parsed = v2AssessmentInputSchema.safeParse({
      ...emptyInputs,
      availableFunds: [{
        id: "00000000-0000-4000-8000-000000000010",
        label: "Savings",
        deduplicationKey: "savings-account",
        amountPence: 250_000,
        currencyCode: "GBP",
        accessible: true,
      }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects non-GBP amounts", () => {
    const parsed = v2AssessmentInputSchema.safeParse({
      ...emptyInputs,
      availableFunds: [{
        id: "00000000-0000-4000-8000-000000000010",
        label: "Savings",
        deduplicationKey: "savings-account",
        amountPence: 250_000,
        currencyCode: "USD",
        accessible: true,
      }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects future income and cash-flow months", () => {
    const futureMonth = monthAfterCurrent();
    const parsed = v2AssessmentInputSchema.safeParse({
      ...emptyInputs,
      incomeHistory: [{
        id: "00000000-0000-4000-8000-000000000011",
        month: futureMonth,
        sourceId: "salary",
        category: "salary",
        amountPence: 100_000,
        recurring: true,
        variable: false,
      }],
      cashFlowHistory: [{
        id: "00000000-0000-4000-8000-000000000012",
        month: futureMonth,
        eligibleRecurringIncomePence: 100_000,
        eligibleExpensesPence: 50_000,
        complete: true,
      }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate available-funds sources and duplicate monthly observations", () => {
    const fund = {
      id: "00000000-0000-4000-8000-000000000010",
      label: "Savings",
      deduplicationKey: "savings-account",
      amountPence: 250_000,
      currencyCode: "GBP",
      accessible: true,
    };
    const month = new Date().toISOString().slice(0, 7);
    const parsed = v2AssessmentInputSchema.safeParse({
      ...emptyInputs,
      availableFunds: [
        fund,
        { ...fund, id: "00000000-0000-4000-8000-000000000013", label: "Savings account" },
      ],
      cashFlowHistory: [
        {
          id: "00000000-0000-4000-8000-000000000014",
          month,
          eligibleRecurringIncomePence: 100_000,
          eligibleExpensesPence: 50_000,
          complete: true,
        },
        {
          id: "00000000-0000-4000-8000-000000000015",
          month,
          eligibleRecurringIncomePence: 100_000,
          eligibleExpensesPence: 50_000,
          complete: true,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires UK GBP baselines with effective dates and provenance", () => {
    const base = {
      destinationBaselines: [{
        id: "00000000-0000-4000-8000-000000000001",
        destination: "London",
        monthlyBaselinePence: 151_800,
        effectiveDate: "2026-01-01",
        countryCode: "GB",
        currencyCode: "GBP",
        provenance: "Cush Score master prompt",
      }],
      creditMappings: {},
    };
    expect(cushScorePolicyConfigSchema.safeParse(base).success).toBe(true);
    expect(cushScorePolicyConfigSchema.safeParse({
      ...base,
      destinationBaselines: [{ ...base.destinationBaselines[0], currencyCode: "USD" }],
    }).success).toBe(false);
    expect(cushScorePolicyConfigSchema.safeParse({
      ...base,
      destinationBaselines: [{ ...base.destinationBaselines[0], effectiveDate: "2026-02-31" }],
    }).success).toBe(false);
  });
});
