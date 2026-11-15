import { describe, expect, it } from "vitest";
import {
  addUtcMonth,
  billingCanUseSubscription,
  getReportChargeDecision,
} from "../shared/cush-verify-billing-rules";

const now = new Date("2024-01-31T15:42:18.123Z");

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    status: "active",
    currentPeriodEndAt: new Date("2024-02-29T15:42:18.123Z"),
    graceEndsAt: null,
    cancelAtPeriodEnd: false,
    additionalReportPriceMinor: 200,
    ...overrides,
  };
}

describe("Cush Verify billing rules", () => {
  it("allocates annual credit months without overflowing short months", () => {
    expect(addUtcMonth(now).toISOString()).toBe("2024-02-29T15:42:18.123Z");
    expect(addUtcMonth(new Date("2025-01-31T00:00:00.000Z")).toISOString())
      .toBe("2025-02-28T00:00:00.000Z");
  });

  it("allows an active term and a still-open payment grace period only", () => {
    expect(billingCanUseSubscription(subscription(), now)).toBe(true);
    expect(billingCanUseSubscription(subscription({
      status: "past_due",
      graceEndsAt: new Date("2024-02-01T00:00:00.000Z"),
    }), now)).toBe(true);
    expect(billingCanUseSubscription(subscription({
      status: "past_due",
      graceEndsAt: new Date("2024-01-30T00:00:00.000Z"),
    }), now)).toBe(false);
    expect(billingCanUseSubscription(subscription({
      status: "canceled",
      cancelAtPeriodEnd: true,
    }), now)).toBe(true);
    expect(billingCanUseSubscription(subscription({
      status: "canceled",
      cancelAtPeriodEnd: false,
    }), now)).toBe(false);
  });

  it("uses a credit before applying a configured overage", () => {
    expect(getReportChargeDecision({
      availableCredits: 2,
      subscription: subscription(),
      stripeBillingEnabled: false,
      stripeCustomerAvailable: false,
      now,
    })).toEqual({ kind: "credit" });

    expect(getReportChargeDecision({
      availableCredits: 0,
      subscription: subscription(),
      stripeBillingEnabled: true,
      stripeCustomerAvailable: true,
      now,
    })).toEqual({ kind: "overage" });
  });

  it("does not allow an unconfigured or inactive subscription to create a billable report", () => {
    expect(getReportChargeDecision({
      availableCredits: 0,
      subscription: subscription(),
      stripeBillingEnabled: false,
      stripeCustomerAvailable: true,
      now,
    })).toEqual({ kind: "denied", code: "BILLING_NOT_CONFIGURED" });
    expect(getReportChargeDecision({
      availableCredits: 0,
      subscription: subscription({ status: "suspended" }),
      stripeBillingEnabled: true,
      stripeCustomerAvailable: true,
      now,
    })).toEqual({ kind: "denied", code: "SUBSCRIPTION_INACTIVE" });
    expect(getReportChargeDecision({
      availableCredits: 0,
      subscription: null,
      stripeBillingEnabled: true,
      stripeCustomerAvailable: true,
      now,
    })).toEqual({ kind: "denied", code: "CREDITS_REQUIRED" });
  });

  it("permits explicitly free overage prices without collecting payment", () => {
    expect(getReportChargeDecision({
      availableCredits: 0,
      subscription: subscription({ additionalReportPriceMinor: 0 }),
      stripeBillingEnabled: false,
      stripeCustomerAvailable: false,
      now,
    })).toEqual({ kind: "overage" });
  });

  it("keeps prepaid credits usable after cancellation without allowing new overages", () => {
    const canceled = subscription({
      status: "canceled",
      cancelAtPeriodEnd: false,
      currentPeriodEndAt: new Date("2024-01-30T00:00:00.000Z"),
    });
    expect(getReportChargeDecision({
      availableCredits: 3,
      subscription: canceled,
      stripeBillingEnabled: false,
      stripeCustomerAvailable: true,
      now,
    })).toEqual({ kind: "credit" });
    expect(getReportChargeDecision({
      availableCredits: 0,
      subscription: canceled,
      stripeBillingEnabled: true,
      stripeCustomerAvailable: true,
      now,
    })).toEqual({ kind: "denied", code: "SUBSCRIPTION_INACTIVE" });
  });
});
