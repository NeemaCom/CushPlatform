import { describe, expect, it } from "vitest";
import { postArrivalProfileDraftSchema } from "@shared/schema";
import { passportFinancialProfileDraftSchema } from "./passport-evidence-service";

const emptyFinancialDraft = {
  countryCode: "",
  currencyCode: "",
  employmentStatus: "",
  employer: "",
  jobTitle: "",
  incomeAmount: "",
  incomeFrequency: "",
  incomeCategory: "other",
  housingStatus: "",
  housingCost: "",
  savingsAmount: "",
  savingsLabel: "",
  commitmentsAmount: "",
  completeCashFlow: false,
  financialHistorySummary: "",
  financialHistory: [],
};

describe("private Passport profile drafts", () => {
  it("accepts incomplete financial inputs without weakening confirmed-profile validation", () => {
    expect(passportFinancialProfileDraftSchema.parse({
      ...emptyFinancialDraft,
      employer: "Employer in progress",
      financialHistory: [{
        id: "draft-row",
        month: "",
        label: "",
        countryCode: "",
        currencyCode: "",
        incomeAmount: "12.",
        incomeFrequency: "",
        incomeCategory: "other",
        recurring: true,
        variable: false,
        savingsAmount: "",
        savingsLabel: "",
        expensesAmount: "",
        completeCashFlow: false,
      }],
    }).financialHistory).toHaveLength(1);

    expect(() => passportFinancialProfileDraftSchema.parse({
      ...emptyFinancialDraft,
      unexpectedScore: 1000,
    })).toThrow();
  });

  it("accepts an incomplete contact value in a draft while keeping fields bounded", () => {
    expect(postArrivalProfileDraftSchema.parse({
      accountHolderEmail: "name@",
      currentLocation: "London",
    }).accountHolderEmail).toBe("name@");
    expect(() => postArrivalProfileDraftSchema.parse({
      changesSinceArrival: "x".repeat(1001),
    })).toThrow();
  });
});
