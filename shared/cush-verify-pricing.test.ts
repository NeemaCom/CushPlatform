import { describe, expect, it } from "vitest";
import {
  calculateAnnualPricing,
  cushVerifyPricingCatalogSchema,
  emptyCushVerifyPricingApiLimits,
  emptyCushVerifyPricingFeatureFlags,
  toPublicCushVerifyPricingCatalog,
  type CushVerifyPricingPlanInput,
} from "./cush-verify-pricing";

function plan(
  overrides: Partial<CushVerifyPricingPlanInput> = {},
): CushVerifyPricingPlanInput {
  return {
    planKey: "starter",
    name: "Starter",
    description: "25 reports per month.",
    currency: "USD",
    monthlyPriceMinor: 4900,
    includedReports: 25,
    allocationMode: "exact",
    additionalReportPriceMinor: 200,
    salesMode: "self_service",
    isActive: true,
    isArchived: false,
    featureFlags: { ...emptyCushVerifyPricingFeatureFlags },
    apiLimits: { ...emptyCushVerifyPricingApiLimits },
    supportLevel: "not_configured",
    ...overrides,
  };
}

describe("Cush Verify annual pricing", () => {
  it("calculates the requested annual prices and savings in minor units", () => {
    expect(calculateAnnualPricing(4900, 1500)).toEqual({
      annualTotalMinor: 49980,
      annualSavingsMinor: 8820,
      annualEffectiveMonthlyMinor: 4165,
    });
    expect(calculateAnnualPricing(14900, 1500)).toEqual({
      annualTotalMinor: 151980,
      annualSavingsMinor: 26820,
      annualEffectiveMonthlyMinor: 12665,
    });
    expect(calculateAnnualPricing(39900, 1500)).toEqual({
      annualTotalMinor: 406980,
      annualSavingsMinor: 71820,
      annualEffectiveMonthlyMinor: 33915,
    });
  });

  it("handles free plans and rounds fractional-cent discounts to the nearest minor unit", () => {
    expect(calculateAnnualPricing(0, 1500)).toEqual({
      annualTotalMinor: 0,
      annualSavingsMinor: 0,
      annualEffectiveMonthlyMinor: 0,
    });
    expect(calculateAnnualPricing(3, 1500)).toEqual({
      annualTotalMinor: 31,
      annualSavingsMinor: 5,
      annualEffectiveMonthlyMinor: 3,
    });
  });

  it("rejects non-integer amounts and invalid discounts", () => {
    expect(() => calculateAnnualPricing(1.5, 1500)).toThrow(RangeError);
    expect(() => calculateAnnualPricing(100, 10_000)).toThrow(RangeError);
  });
});

describe("Cush Verify public pricing catalog", () => {
  it("returns only active plans and strips negotiated enterprise prices", () => {
    const enterprise = plan({
      planKey: "enterprise",
      name: "Enterprise",
      description: "Negotiated institutional terms.",
      monthlyPriceMinor: null,
      includedReports: 1000,
      allocationMode: "minimum",
      additionalReportPriceMinor: null,
      salesMode: "contact_sales",
    });
    const catalog = toPublicCushVerifyPricingCatalog({
      version: 3,
      defaultCurrency: "USD",
      annualDiscountBps: 1500,
      publishedAt: new Date("2026-11-15T10:00:00.000Z"),
    }, [
      { ...plan(), id: 1, versionId: 3 },
      enterprise,
      plan({ planKey: "old", isActive: false }),
      plan({ planKey: "archived", isActive: false, isArchived: true }),
    ]);

    expect(catalog.plans).toHaveLength(2);
    expect(catalog.plans[0].annualTotalMinor).toBe(49980);
    expect(catalog.plans[1]).toMatchObject({
      planKey: "enterprise",
      monthlyPriceMinor: null,
      additionalReportPriceMinor: null,
      annualTotalMinor: null,
      annualSavingsMinor: null,
      annualEffectiveMonthlyMinor: null,
    });
    expect(catalog.plans[0]).not.toHaveProperty("id");
    expect(catalog.plans[0]).not.toHaveProperty("versionId");
    expect(catalog.plans[0]).not.toHaveProperty("isArchived");
  });

  it("rejects duplicate plan keys and prices on contact-sales plans", () => {
    expect(cushVerifyPricingCatalogSchema.safeParse({
      defaultCurrency: "USD",
      annualDiscountBps: 1500,
      plans: [plan(), plan()],
    }).success).toBe(false);
    expect(cushVerifyPricingCatalogSchema.safeParse({
      defaultCurrency: "USD",
      annualDiscountBps: 1500,
      plans: [plan({
        planKey: "enterprise",
        salesMode: "contact_sales",
        monthlyPriceMinor: 1000,
        additionalReportPriceMinor: 20,
      })],
    }).success).toBe(false);
    expect(cushVerifyPricingCatalogSchema.safeParse({
      defaultCurrency: "USD",
      annualDiscountBps: 1500,
      plans: [plan({ salesMode: "sandbox_only", allocationMode: "exact" })],
    }).success).toBe(false);
  });
});
