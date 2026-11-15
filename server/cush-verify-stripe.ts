import Stripe from "stripe";

export class CushVerifyStripeUnavailableError extends Error {
  constructor(message = "Cush Verify billing is not configured.") {
    super(message);
    this.name = "CushVerifyStripeUnavailableError";
  }
}

export function getCushVerifyStripeReadiness() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const production = process.env.NODE_ENV === "production";
  const keyHasExpectedMode = production
    ? secretKey.startsWith("sk_live_")
    : secretKey.startsWith("sk_test_") || secretKey.startsWith("sk_live_");
  const enabled = process.env.CUSH_VERIFY_BILLING_ENABLED === "true";
  const configured = enabled && keyHasExpectedMode && Boolean(webhookSecret);
  return {
    enabled: configured,
    webhookReady: keyHasExpectedMode && Boolean(webhookSecret),
    mode: secretKey.startsWith("sk_live_") ? "live" as const : secretKey.startsWith("sk_test_") ? "test" as const : "unconfigured" as const,
  };
}

export function getCushVerifyStripeClient(options: { requireBillingEnabled?: boolean } = {}): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const readiness = getCushVerifyStripeReadiness();
  if (!secretKey || !readiness.webhookReady) {
    throw new CushVerifyStripeUnavailableError();
  }
  if (options.requireBillingEnabled !== false && !readiness.enabled) {
    throw new CushVerifyStripeUnavailableError();
  }
  return new Stripe(secretKey);
}

export function getCushVerifyStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new CushVerifyStripeUnavailableError("Stripe webhook verification is not configured.");
  return secret;
}
