import { describe, expect, it } from "vitest";
import { detectCurrenciesInText, isIsoCurrencyCode, listIsoCurrencies } from "./currency-catalog";

describe("multi-currency catalog and evidence detection", () => {
  it("lists common international ISO currencies and rejects unknown codes", () => {
    const codes = new Set(listIsoCurrencies().map((currency) => currency.code));
    expect(codes.has("GBP")).toBe(true);
    expect(codes.has("NGN")).toBe(true);
    expect(codes.has("EUR")).toBe(true);
    expect(isIsoCurrencyCode("CAD")).toBe(true);
    expect(isIsoCurrencyCode("FOO")).toBe(false);
  });

  it("detects explicit codes without treating the amounts as verified", () => {
    expect(detectCurrenciesInText("Salary: USD 1,250.00 and EUR 700"))
      .toMatchObject({
        detectedCurrencyCodes: ["EUR", "USD"],
        suggestedCurrencyCode: null,
      });
  });

  it("reports ambiguous symbols as candidates rather than guessing", () => {
    const result = detectCurrenciesInText("Account balance: $450.00");
    expect(result.detectedCurrencyCodes).toEqual([]);
    expect(result.suggestedCurrencyCode).toBeNull();
    expect(result.ambiguousSymbols).toContainEqual(expect.objectContaining({
      symbol: "$",
      candidates: expect.arrayContaining(["USD", "CAD", "AUD"]),
    }));
  });

  it("identifies the naira symbol as NGN", () => {
    expect(detectCurrenciesInText("Balance: ₦45,000").detectedCurrencyCodes).toContain("NGN");
  });

  it("uses an explicit code to disambiguate a matching symbol", () => {
    const result = detectCurrenciesInText("Statement total: GBP £450.00");
    expect(result.detectedCurrencyCodes).toContain("GBP");
    expect(result.ambiguousSymbols).toEqual([]);
  });

  it("recognizes a labeled code without mistaking ordinary uppercase words for currencies", () => {
    expect(detectCurrenciesInText("Currency: EUR").detectedCurrencyCodes).toContain("EUR");
    expect(detectCurrenciesInText("THE ALL EMPLOYEES HAVE SIGNED").detectedCurrencyCodes).not.toContain("ALL");
  });
});
