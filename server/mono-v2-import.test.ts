import { afterEach, describe, expect, it } from "vitest";
import {
  buildMonoV2Evidence,
  clearMonoV2PreviewCacheForTests,
  createMonoV2Preview,
  fullClosedMonthsInPeriod,
  parseMonoStatementTransactions,
} from "./mono-v2-import";
import { clearCbnRateCacheForTests } from "./cbn-fx-rates";

describe("Mono V2 statement import", () => {
  afterEach(() => {
    clearMonoV2PreviewCacheForTests();
    clearCbnRateCacheForTests();
  });

  it("parses supported transactions and rejects unsupported currency rows", () => {
    expect(parseMonoStatementTransactions({
      data: {
        transactions: [{
          id: "private-provider-id",
          date: "2026-09-10T08:30:00Z",
          type: "credit",
          amount: 12500,
          currency: "NGN",
          narration: "Private narration",
        }],
      },
    })).toMatchObject([{
      date: "2026-09-10",
      direction: "credit",
      currencyCode: "NGN",
      amountMinor: 12500,
      description: "Private narration",
    }]);
    expect(() => parseMonoStatementTransactions({
      data: { transactions: [{ date: "2026-09-10", type: "credit", amount: 100, currency: "EUR" }] },
    })).toThrow("unsupported currencies");
  });

  it("only offers complete closed months inside the requested statement period", () => {
    expect(fullClosedMonthsInPeriod(3, new Date("2026-10-31T12:00:00Z")))
      .toEqual(["2026-08", "2026-09"]);
    expect(fullClosedMonthsInPeriod(1, new Date("2026-10-31T12:00:00Z"))).toEqual([]);
  });

  it("stores reviewed GBP aggregates and not raw transaction descriptions", async () => {
    const preview = await createMonoV2Preview({
      userId: 44,
      linkedAccountId: 7,
      periodMonths: 3,
      now: new Date("2026-10-31T12:00:00Z"),
      accountDetails: { data: { balance: 250000, currency: "GBP" } },
      statement: {
        data: {
          transactions: [
            {
              date: "2026-09-10",
              type: "credit",
              amount: 180000,
              currency: "GBP",
              narration: "Private employer name",
            },
            {
              date: "2026-09-12",
              type: "debit",
              amount: 50000,
              currency: "GBP",
              narration: "Private merchant name",
            },
          ],
        },
      },
    });
    const [income, expense] = preview.transactions;
    const evidence = buildMonoV2Evidence({
      userId: 44,
      linkedAccountId: 7,
      now: new Date("2026-10-31T12:01:00Z"),
      selection: {
        previewToken: preview.token,
        recurringIncome: [{ transactionId: income.id, category: "salary", variable: false }],
        eligibleExpenseIds: [expense.id],
        completeMonths: ["2026-09"],
        includeBalance: true,
        consent: true,
      },
    });
    expect(evidence.availableFunds[0].amountPence).toBe(250000);
    expect(evidence.incomeHistory[0].amountPence).toBe(180000);
    expect(evidence.cashFlowHistory).toEqual([{
      id: evidence.cashFlowHistory[0].id,
      month: "2026-09",
      eligibleRecurringIncomePence: 180000,
      eligibleExpensesPence: 50000,
      complete: true,
    }]);
    expect(JSON.stringify(evidence)).not.toContain("Private employer name");
    expect(JSON.stringify(evidence)).not.toContain("Private merchant name");
    expect(evidence.consentAcceptedAt).toBe("2026-10-31T12:01:00.000Z");
  });

  it("converts NGN transactions and USD balances using dated CBN central rates", async () => {
    const rateFetcher = async () => new Response(JSON.stringify([
      { currency: "US DOLLAR", ratedate: "2026-09-10", centralrate: "1500.0000" },
      { currency: "POUNDS STERLING", ratedate: "2026-09-10", centralrate: "2000.0000" },
      { currency: "US DOLLAR", ratedate: "2026-10-31", centralrate: "1520.0000" },
      { currency: "POUNDS STERLING", ratedate: "2026-10-31", centralrate: "2050.0000" },
    ]), { status: 200 });
    const preview = await createMonoV2Preview({
      userId: 44,
      linkedAccountId: 7,
      periodMonths: 3,
      now: new Date("2026-10-31T12:00:00Z"),
      rateFetcher: rateFetcher as typeof fetch,
      accountDetails: { data: { balance: 10000, currency: "USD" } },
      statement: {
        data: {
          transactions: [{
            date: "2026-09-10",
            type: "credit",
            amount: 1_000_000,
            currency: "NGN",
            narration: "Private customer name",
          }],
        },
      },
    });
    expect(preview.balance?.amountGbpPence).toBe(7415);
    expect(preview.transactions[0].amountGbpPence).toBe(500);
    const evidence = buildMonoV2Evidence({
      userId: 44,
      linkedAccountId: 7,
      now: new Date("2026-10-31T12:01:00Z"),
      selection: {
        previewToken: preview.token,
        recurringIncome: [{ transactionId: preview.transactions[0].id, category: "salary", variable: false }],
        eligibleExpenseIds: [],
        completeMonths: ["2026-09"],
        includeBalance: true,
        consent: true,
      },
    });
    expect(evidence.fxRateSource).toBe("https://www.cbn.gov.ng/api/GetAllExchangeRates?format=json");
    expect(evidence.fxRateDateBasis).toBe("transaction_date");
    expect(evidence.conversionAudit).toEqual(expect.arrayContaining([
      expect.objectContaining({
        valueDate: "2026-09-10",
        dateBasis: "transaction_date",
        currencyCode: "NGN",
        rateDate: "2026-09-10",
      }),
      expect.objectContaining({
        valueDate: "2026-10-31",
        dateBasis: "balance_snapshot_date",
        currencyCode: "USD",
        rateDate: "2026-10-31",
      }),
    ]));
    expect(JSON.stringify(evidence)).not.toContain("Private customer name");
  });

  it("prevents a review token from being used by another account owner", async () => {
    const preview = await createMonoV2Preview({
      userId: 44,
      linkedAccountId: 7,
      periodMonths: 1,
      now: new Date("2026-10-31T12:00:00Z"),
      accountDetails: { data: { balance: 0, currency: "GBP" } },
      statement: { data: { transactions: [] } },
    });
    expect(() => buildMonoV2Evidence({
      userId: 45,
      linkedAccountId: 7,
      selection: {
        previewToken: preview.token,
        recurringIncome: [],
        eligibleExpenseIds: [],
        completeMonths: [],
        includeBalance: false,
        consent: true,
      },
      now: new Date("2026-10-31T12:01:00Z"),
    })).toThrow("review expired");
  });
});
