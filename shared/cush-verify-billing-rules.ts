export type BillingEntitlementCode =
  | "CREDITS_REQUIRED"
  | "SUBSCRIPTION_INACTIVE"
  | "BILLING_NOT_CONFIGURED";

export const CUSH_VERIFY_ACTIVATION_PROMOTIONAL_CREDITS = 5;

export function getCushVerifyActivationPromotionalGrant(applicationId: number) {
  if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
    throw new Error("A valid Cush Verify application ID is required.");
  }

  return {
    entryType: "promotional_credit" as const,
    creditDelta: CUSH_VERIFY_ACTIVATION_PROMOTIONAL_CREDITS,
    idempotencyKey: `verify-email-activation:${applicationId}:promotional-credit`,
    details: {
      source: "official_email_activation",
      grantType: "new_institution_onboarding",
      credits: CUSH_VERIFY_ACTIVATION_PROMOTIONAL_CREDITS,
    },
  };
}

export type BillingSubscriptionEntitlement = {
  status: string;
  currentPeriodEndAt: Date;
  graceEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  additionalReportPriceMinor: number | null;
};

export function addUtcMonth(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year,
    month,
    Math.min(day, lastDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
}

export function billingCanUseSubscription(
  subscription: BillingSubscriptionEntitlement | null,
  now: Date,
): boolean {
  if (!subscription) return false;
  if (
    (subscription.status === "active" || subscription.status === "trialing") &&
    subscription.currentPeriodEndAt > now
  ) return true;
  if (
    subscription.status === "past_due" &&
    subscription.graceEndsAt !== null &&
    subscription.graceEndsAt > now
  ) return true;
  return subscription.status === "canceled" &&
    subscription.cancelAtPeriodEnd &&
    subscription.currentPeriodEndAt > now;
}

export function getReportChargeDecision(input: {
  availableCredits: number;
  subscription: BillingSubscriptionEntitlement | null;
  stripeBillingEnabled: boolean;
  stripeCustomerAvailable: boolean;
  now: Date;
}):
  | { kind: "credit" }
  | { kind: "overage" }
  | { kind: "denied"; code: BillingEntitlementCode } {
  const usable = billingCanUseSubscription(input.subscription, input.now);
  if (
    input.subscription &&
    !usable &&
    !(input.subscription.status === "canceled" && input.availableCredits > 0)
  ) return { kind: "denied", code: "SUBSCRIPTION_INACTIVE" };
  if (input.availableCredits > 0) return { kind: "credit" };
  if (!input.subscription || !usable || input.subscription.additionalReportPriceMinor === null) {
    return { kind: "denied", code: "CREDITS_REQUIRED" };
  }
  if (
    input.subscription.additionalReportPriceMinor > 0 &&
    (!input.stripeBillingEnabled || !input.stripeCustomerAvailable)
  ) return { kind: "denied", code: "BILLING_NOT_CONFIGURED" };
  return { kind: "overage" };
}
