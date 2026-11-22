import { describe, expect, it } from "vitest";
import { extractPassportDocumentFinancialFacts } from "@shared/passport-document-facts";

describe("user-reviewed document financial facts", () => {
  it("extracts clearly labeled PDF figures and the statement month for review", () => {
    const facts = extractPassportDocumentFinancialFacts(
      "Statement period: October 2026\nNet pay: GBP 2,500.00\nClosing balance: GBP 4,000.00",
      "bank_statement",
      "application/pdf",
    );

    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      month: "2026-10",
      incomeAmount: "2500.00",
      savingsAmount: "4000.00",
    });
  });

  it("categorizes explicitly typed CSV rows by month without guessing ambiguous dates", () => {
    const facts = extractPassportDocumentFinancialFacts(
      [
        "Date | Description | Amount | Type",
        "2026-10-02 | Salary payroll | 2500.00 | Credit",
        "2026-10-05 | Rent payment | -800.00 | Debit",
        "2026-10-10 | Internal transfer | -500.00 | Debit",
        "10/11/2026 | Salary payroll | 2000.00 | Credit",
      ].join("\n"),
      "bank_statement",
      "text/csv",
    );

    expect(facts).toHaveLength(2);
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ month: "2026-10", incomeAmount: "2500.00", incomeCategory: "salary" }),
      expect.objectContaining({ month: "2026-10", expensesAmount: "800.00" }),
    ]));
  });

  it("does not create score facts from ambiguous or unsupported text", () => {
    expect(extractPassportDocumentFinancialFacts(
      "This document has a balance but no clear labeled amount.",
      "bank_statement",
      "application/pdf",
    )).toEqual([]);
  });
});
