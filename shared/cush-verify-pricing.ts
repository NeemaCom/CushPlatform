import { z } from "zod";
import type {
  CushVerifyPricingApiLimits,
  CushVerifyPricingFeatureFlags,
} from "./schema";

export const CUSH_VERIFY_PRICING_FEATURES = [
  { key: "fullPassportReports", label: "Full Passport reports" },
  { key: "incomeEmploymentHistory", label: "Income and employment history" },
  { key: "rentHousingHistory", label: "Rent and housing history" },
  { key: "savingsHistory", label: "Savings history" },
  { key: "financialCommitments", label: "Financial commitments" },
  { key: "cushScore", label: "Cush Score" },
  { key: "confidenceInformation", label: "Confidence information" },
  { key: "evidenceClassifications", label: "Evidence classifications" },
  { key: "apiAccess", label: "API access" },
  { key: "webhooks", label: "Webhooks" },
  { key: "usageAnalytics", label: "Usage analytics" },
  { key: "auditLogs", label: "Audit logs" },
  { key: "teamAccounts", label: "Team accounts" },
] as const satisfies readonly { key: keyof CushVerifyPricingFeatureFlags; label: string }[];

export const emptyCushVerifyPricingFeatureFlags: CushVerifyPricingFeatureFlags = {
  fullPassportReports: false,
  incomeEmploymentHistory: false,
  rentHousingHistory: false,
  savingsHistory: false,
  financialCommitments: false,
  cushScore: false,
  confidenceInformation: false,
  evidenceClassifications: false,
  apiAccess: false,
  webhooks: false,
  usageAnalytics: false,
  auditLogs: false,
  teamAccounts: false,
};

export const emptyCushVerifyPricingApiLimits: CushVerifyPricingApiLimits = {
  requestsPerMinute: null,
  requestsPerHour: null,
  maxConcurrentRequests: null,
  monthlyReportLimit: null,
};

export const cushVerifyPricingFeatureFlagsSchema = z.object({
  fullPassportReports: z.boolean(),
  incomeEmploymentHistory: z.boolean(),
  rentHousingHistory: z.boolean(),
  savingsHistory: z.boolean(),
  financialCommitments: z.boolean(),
  cushScore: z.boolean(),
  confidenceInformation: z.boolean(),
  evidenceClassifications: z.boolean(),
  apiAccess: z.boolean(),
  webhooks: z.boolean(),
  usageAnalytics: z.boolean(),
  auditLogs: z.boolean(),
  teamAccounts: z.boolean(),
}).strict();

const optionalPositiveLimit = z.number().int().min(1).max(2_000_000_000).nullable();

export const cushVerifyPricingApiLimitsSchema = z.object({
  requestsPerMinute: optionalPositiveLimit,
  requestsPerHour: optionalPositiveLimit,
  maxConcurrentRequests: optionalPositiveLimit,
  monthlyReportLimit: optionalPositiveLimit,
}).strict();

export const cushVerifyPricingPlanSchema = z.object({
  planKey: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500),
  currency: z.string().regex(/^[A-Z]{3}$/),
  monthlyPriceMinor: z.number().int().min(0).max(2_000_000_000).nullable(),
  includedReports: z.number().int().min(0).max(2_000_000_000),
  allocationMode: z.enum(["sandbox", "exact", "minimum"]),
  additionalReportPriceMinor: z.number().int().min(0).max(2_000_000_000).nullable(),
  salesMode: z.enum(["sandbox_only", "self_service", "contact_sales"]),
  isActive: z.boolean(),
  isArchived: z.boolean(),
  featureFlags: cushVerifyPricingFeatureFlagsSchema,
  apiLimits: cushVerifyPricingApiLimitsSchema,
  supportLevel: z.enum(["not_configured", "community", "standard", "priority", "dedicated"]),
}).strict().superRefine((plan, context) => {
  if (plan.isActive && plan.isArchived) {
    context.addIssue({
      code: "custom",
      path: ["isArchived"],
      message: "An archived plan cannot be active.",
    });
  }
  if (plan.salesMode === "contact_sales" &&
    (plan.monthlyPriceMinor !== null || plan.additionalReportPriceMinor !== null)) {
    context.addIssue({
      code: "custom",
      path: ["monthlyPriceMinor"],
      message: "Negotiated enterprise prices must not be stored in the public catalog.",
    });
  }
  if (plan.salesMode !== "contact_sales" && plan.monthlyPriceMinor === null) {
    context.addIssue({
      code: "custom",
      path: ["monthlyPriceMinor"],
      message: "A fixed-price plan must have a monthly price.",
    });
  }
  if (plan.allocationMode === "minimum" && plan.includedReports < 1) {
    context.addIssue({
      code: "custom",
      path: ["includedReports"],
      message: "A minimum allocation must include at least one report.",
    });
  }
  if (plan.allocationMode === "sandbox" && plan.salesMode !== "sandbox_only") {
    context.addIssue({
      code: "custom",
      path: ["salesMode"],
      message: "Sandbox allocations must use sandbox-only access.",
    });
  }
  if (plan.salesMode === "sandbox_only" && plan.allocationMode !== "sandbox") {
    context.addIssue({
      code: "custom",
      path: ["allocationMode"],
      message: "Sandbox-only plans must use a sandbox allocation.",
    });
  }
});

export const cushVerifyPricingCatalogSchema = z.object({
  defaultCurrency: z.string().regex(/^[A-Z]{3}$/),
  annualDiscountBps: z.number().int().min(0).max(9999),
  plans: z.array(cushVerifyPricingPlanSchema).min(1).max(25),
}).strict().superRefine((catalog, context) => {
  const keys = new Set<string>();
  for (const [index, plan] of catalog.plans.entries()) {
    if (keys.has(plan.planKey)) {
      context.addIssue({
        code: "custom",
        path: ["plans", index, "planKey"],
        message: "Plan keys must be unique within a pricing version.",
      });
    }
    keys.add(plan.planKey);
  }
  if (!catalog.plans.some((plan) => plan.isActive && !plan.isArchived)) {
    context.addIssue({
      code: "custom",
      path: ["plans"],
      message: "At least one active plan is required.",
    });
  }
});

export type CushVerifyPricingPlanInput = z.infer<typeof cushVerifyPricingPlanSchema>;
export type CushVerifyPricingCatalogInput = z.infer<typeof cushVerifyPricingCatalogSchema>;

export function calculateAnnualPricing(
  monthlyPriceMinor: number | null,
  annualDiscountBps: number,
): {
  annualTotalMinor: number | null;
  annualSavingsMinor: number | null;
  annualEffectiveMonthlyMinor: number | null;
} {
  if (monthlyPriceMinor === null) {
    return {
      annualTotalMinor: null,
      annualSavingsMinor: null,
      annualEffectiveMonthlyMinor: null,
    };
  }
  if (
    !Number.isSafeInteger(monthlyPriceMinor) ||
    monthlyPriceMinor < 0 ||
    !Number.isSafeInteger(annualDiscountBps) ||
    annualDiscountBps < 0 ||
    annualDiscountBps > 9999
  ) {
    throw new RangeError("Annual pricing requires non-negative integer minor units and a valid discount.");
  }

  // The catalog limits prices to 2 billion minor units, so every intermediate
  // remains an exact safe integer in JavaScript before the explicit rounding.
  const annualGrossMinor = monthlyPriceMinor * 12;
  const annualSavingsMinor = Math.floor(
    (annualGrossMinor * annualDiscountBps + 5000) / 10_000,
  );
  const annualTotalMinor = annualGrossMinor - annualSavingsMinor;
  const annualEffectiveMonthlyMinor = Math.floor((annualTotalMinor + 6) / 12);
  return {
    annualTotalMinor,
    annualSavingsMinor,
    annualEffectiveMonthlyMinor,
  };
}

export type PublicCushVerifyPricingPlan = {
  planKey: string;
  name: string;
  description: string;
  currency: string;
  monthlyPriceMinor: number | null;
  includedReports: number;
  allocationMode: "sandbox" | "exact" | "minimum";
  additionalReportPriceMinor: number | null;
  salesMode: "sandbox_only" | "self_service" | "contact_sales";
  featureFlags: CushVerifyPricingFeatureFlags;
  apiLimits: CushVerifyPricingApiLimits;
  supportLevel: CushVerifyPricingPlanInput["supportLevel"];
  annualTotalMinor: number | null;
  annualSavingsMinor: number | null;
  annualEffectiveMonthlyMinor: number | null;
};

export function toPublicCushVerifyPricingCatalog(
  version: {
    version: number;
    defaultCurrency: string;
    annualDiscountBps: number;
    publishedAt: Date | string | null;
  },
  plans: Array<CushVerifyPricingPlanInput & { id?: number; versionId?: number }>,
) {
  return {
    version: version.version,
    defaultCurrency: version.defaultCurrency,
    annualDiscountBps: version.annualDiscountBps,
    publishedAt: version.publishedAt,
    plans: plans
      .filter((plan) => plan.isActive && !plan.isArchived)
      .map((plan): PublicCushVerifyPricingPlan => {
        const negotiated = plan.salesMode === "contact_sales";
        const monthlyPriceMinor = negotiated ? null : plan.monthlyPriceMinor;
        const annual = calculateAnnualPricing(monthlyPriceMinor, version.annualDiscountBps);
        return {
          planKey: plan.planKey,
          name: plan.name,
          description: plan.description,
          currency: plan.currency,
          monthlyPriceMinor,
          includedReports: plan.includedReports,
          allocationMode: plan.allocationMode,
          additionalReportPriceMinor: negotiated ? null : plan.additionalReportPriceMinor,
          salesMode: plan.salesMode,
          featureFlags: plan.featureFlags,
          apiLimits: plan.apiLimits,
          supportLevel: plan.supportLevel,
          ...annual,
        };
      }),
  };
}
