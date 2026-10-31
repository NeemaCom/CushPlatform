import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCbnRateCacheForTests,
  convertMinorToGbpPence,
  getCbnDailyRates,
} from "./cbn-fx-rates";

function response(rows: unknown[]) {
  return new Response(JSON.stringify(rows), { status: 200 });
}

describe("CBN central exchange rates", () => {
  afterEach(() => {
    clearCbnRateCacheForTests();
    vi.restoreAllMocks();
  });

  it("uses the most recent published rate on or before the transaction date", async () => {
    const fetcher = vi.fn(async () => response([
      { currency: "US DOLLAR", ratedate: "2026-06-12", centralrate: "1500.0000" },
      { currency: "POUNDS STERLING", ratedate: "2026-06-12", centralrate: "2000.0000" },
    ]));
    const result = await getCbnDailyRates("2026-06-14", fetcher as typeof fetch);
    expect(result.effectiveDate).toBe("2026-06-12");
    expect(result.usdNgnCentralRate).toBe("1500.0000");
  });

  it("converts naira and dollars to GBP pence using the paired CBN rates", () => {
    const rates = { usdNgnCentralRate: "1500.0000", gbpNgnCentralRate: "2000.0000" };
    expect(convertMinorToGbpPence(1_000_000, "NGN", rates)).toBe(500);
    expect(convertMinorToGbpPence(10_000, "USD", rates)).toBe(7_500);
    expect(convertMinorToGbpPence(12_345, "GBP", rates)).toBe(12_345);
  });

  it("does not silently use a rate older than seven days", async () => {
    const fetcher = vi.fn(async () => response([
      { currency: "US DOLLAR", ratedate: "2026-06-01", centralrate: "1500.0000" },
      { currency: "POUNDS STERLING", ratedate: "2026-06-01", centralrate: "2000.0000" },
    ]));
    await expect(getCbnDailyRates("2026-06-10", fetcher as typeof fetch))
      .rejects.toThrow("No recent CBN central exchange rate");
  });
});
