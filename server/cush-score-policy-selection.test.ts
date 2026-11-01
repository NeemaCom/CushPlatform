import { describe, expect, it } from "vitest";
import type { CushScorePolicyConfig } from "@shared/schema";
import { selectVersionedDestinationBaseline } from "./cush-score-policy-selection";

const confidence: CushScorePolicyConfig["confidence"] = {
  historyMonthsForMaximum: 6,
  sourceQualityPoints: { bank_connection: 25, verified_statement: 15, self_reported: 0 },
  creditCheckPoints: { matched: 15, matched_thin: 10, no_match: 5, not_done: 0 },
  incomeSourcePoints: {
    uk_payslip_or_uk_credits: 10,
    steady_employer: 8,
    variable: 5,
    uk_offer_only: 4,
    family_support_only: 3,
    other: 0,
  },
  freshnessBands: [
    { maxAgeDays: 7, points: 10 },
    { maxAgeDays: 30, points: 6 },
    { maxAgeDays: 90, points: 3 },
  ],
};

function configWithBaselines(
  destinationBaselines: CushScorePolicyConfig["destinationBaselines"],
): CushScorePolicyConfig {
  return { destinationBaselines, creditMappings: {}, confidence };
}

function baseline(
  id: string,
  monthlyBaselinePence: number,
  effectiveDate: string,
): CushScorePolicyConfig["destinationBaselines"][number] {
  return {
    id,
    destination: "United Kingdom",
    monthlyBaselinePence,
    effectiveDate,
    countryCode: "GB",
    currencyCode: "GBP",
    provenance: "Admin-reviewed policy",
  };
}

describe("versioned destination baseline selection", () => {
  it("uses the configured amount rather than an unversioned code fallback", () => {
    const activeConfiguration = configWithBaselines([
      baseline("00000000-0000-4000-8000-000000000001", 145_000, "2026-10-01"),
    ]);

    expect(selectVersionedDestinationBaseline(activeConfiguration, null, "2026-11-02"))
      .toMatchObject({ monthlyBaselinePence: 145_000 });
  });

  it("uses the latest effective baseline unless a valid configured one is selected", () => {
    const activeConfiguration = configWithBaselines([
      baseline("00000000-0000-4000-8000-000000000001", 100_000, "2026-01-01"),
      baseline("00000000-0000-4000-8000-000000000002", 125_000, "2026-10-01"),
    ]);

    expect(selectVersionedDestinationBaseline(activeConfiguration, null, "2026-11-02")?.monthlyBaselinePence)
      .toBe(125_000);
    expect(selectVersionedDestinationBaseline(
      activeConfiguration,
      "00000000-0000-4000-8000-000000000001",
      "2026-11-02",
    )?.monthlyBaselinePence).toBe(100_000);
  });

  it("does not apply future baselines or an absent policy", () => {
    const futureConfiguration = configWithBaselines([
      baseline("00000000-0000-4000-8000-000000000003", 150_000, "2026-12-01"),
    ]);

    expect(selectVersionedDestinationBaseline(futureConfiguration, null, "2026-11-02")).toBeNull();
    expect(selectVersionedDestinationBaseline(null, null, "2026-11-02")).toBeNull();
  });
});
