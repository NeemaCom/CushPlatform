import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptPlaidAccessToken,
  encryptPlaidAccessToken,
  getPlaidReview,
} from "./plaid-service";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Plaid access-token encryption", () => {
  it("round-trips using AES-GCM and rejects modified ciphertext", () => {
    const key = Buffer.alloc(32, 19);
    const encrypted = encryptPlaidAccessToken("access-sample", key);
    expect(decryptPlaidAccessToken(encrypted, key)).toBe("access-sample");
    expect(() => decryptPlaidAccessToken({
      ...encrypted,
      ciphertext: Buffer.from("modified").toString("base64"),
    }, key)).toThrow();
  });
});

describe("Plaid temporary review normalization", () => {
  it("requests only selected identity fields and 90 days of transactions", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAID_ENV", "sandbox");
    vi.stubEnv("PLAID_CLIENT_ID", "test-client");
    vi.stubEnv("PLAID_SECRET", "test-secret");
    vi.stubEnv("PLAID_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 4).toString("base64"));

    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      calls.push({ url, body });
      const result = url.endsWith("/identity/get")
        ? {
            accounts: [{
              account_id: "account-id",
              name: "Current account",
              mask: "9876",
              owners: [{
                names: ["Sam Example"],
                emails: [{ data: "sam@example.com" }],
                phone_numbers: [{ data: "+447700900000" }],
                addresses: [{ data: { street: "Must not be exposed" } }],
              }],
            }],
          }
        : {
            total_transactions: 1,
            transactions: [{
              transaction_id: "transaction-id",
              date: "2026-10-15",
              name: "Salary",
              amount: -2500,
              iso_currency_code: "GBP",
              personal_finance_category: { primary: "INCOME" },
            }],
          };
      return new Response(JSON.stringify(result), { status: 200 });
    });

    const review = await getPlaidReview("test-access-token", fetcher as unknown as typeof fetch);

    expect(calls.map((call) => call.url)).toEqual([
      "https://sandbox.plaid.com/identity/get",
      "https://sandbox.plaid.com/transactions/get",
    ]);
    expect(calls[1]?.body.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(calls[1]?.body.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(review.identityAccounts[0]).toEqual({
      accountKey: "account-1",
      accountName: "Current account",
      owners: [{
        name: "Sam Example",
        emails: ["sam@example.com"],
        phones: ["+447700900000"],
      }],
    });
    expect(JSON.stringify(review)).not.toContain("Must not be exposed");
    expect(review.transactions.items[0]).toMatchObject({
      id: "transaction-id",
      name: "Salary",
      amount: -2500,
      currencyCode: "GBP",
      category: "INCOME",
    });
    expect(review.transactions.returnedCount).toBe(1);
    expect(review.identityNotice).toBeUndefined();
    expect(review.transactionsNotice).toBeUndefined();
  });
});
