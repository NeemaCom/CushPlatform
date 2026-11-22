import { describe, expect, it } from "vitest";
import { passportFinancialProfileSchema } from "./passport-evidence-service";
import { buildProfileScoreInputs } from "./passport-manual-score-input";

describe("Passport manual financial assessment inputs", () => {
  it("maps current self-declared income, savings, and complete monthly expenses", async () => {
    const profile = passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "GBP",
      employmentStatus: "Employed",
      employer: "Example employer",
      jobTitle: "Analyst",
      incomeAmount: "2500.00",
      incomeFrequency: "monthly",
      incomeCategory: "salary",
      housingStatus: "Renting",
      housingCost: "800.00",
      savingsAmount: "1500.00",
      savingsLabel: "Current account",
      commitmentsAmount: "200.00",
      completeCashFlow: true,
      financialHistorySummary: "",
      financialHistory: [],
    });

    const input = await buildProfileScoreInputs(profile, "2026-11");

    expect(input.availableFunds).toHaveLength(1);
    expect(input.availableFunds[0]).toMatchObject({
      label: "Current account",
      amountPence: 150_000,
      currencyCode: "GBP",
      accessible: true,
    });
    expect(input.incomeHistory).toHaveLength(1);
    expect(input.incomeHistory[0]).toMatchObject({
      month: "2026-11",
      amountPence: 250_000,
      category: "salary",
      recurring: true,
    });
    expect(input.cashFlowHistory).toHaveLength(1);
    expect(input.cashFlowHistory[0]).toMatchObject({
      month: "2026-11",
      eligibleRecurringIncomePence: 250_000,
      eligibleExpensesPence: 100_000,
      complete: true,
    });
  });

  it("keeps a declared monthly row incomplete unless the user confirms full spending coverage", async () => {
    const profile = passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "GBP",
      incomeAmount: "",
      incomeFrequency: "",
      housingCost: "",
      savingsAmount: "",
      commitmentsAmount: "",
      financialHistorySummary: "",
      financialHistory: [{
        id: "7dcf2e87-c8b9-4eae-8d31-3c7454e173a8",
        month: "2026-10",
        label: "Salary",
        countryCode: "GB",
        currencyCode: "GBP",
        incomeAmount: "2100",
        incomeFrequency: "monthly",
        incomeCategory: "salary",
        recurring: true,
        variable: false,
        savingsAmount: "",
        savingsLabel: "",
        expensesAmount: "900",
        completeCashFlow: false,
      }],
    });

    const input = await buildProfileScoreInputs(profile, "2026-11");

    expect(input.incomeHistory).toHaveLength(1);
    expect(input.cashFlowHistory).toHaveLength(1);
    expect(input.cashFlowHistory[0]).toMatchObject({
      month: "2026-10",
      eligibleRecurringIncomePence: 210_000,
      eligibleExpensesPence: 90_000,
      complete: false,
    });
  });
});
