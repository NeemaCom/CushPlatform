import { afterEach, describe, expect, it, vi } from "vitest";
import { getCushVerifyStripeReadiness } from "../server/cush-verify-stripe";

afterEach(() => vi.unstubAllEnvs());

describe("Cush Verify Stripe runtime configuration", () => {
  it("keeps billing off until explicitly enabled with a matching test key and webhook secret", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CUSH_VERIFY_BILLING_ENABLED", "false");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture_only");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture_only");
    expect(getCushVerifyStripeReadiness()).toMatchObject({
      enabled: false,
      webhookReady: true,
      mode: "test",
    });

    vi.stubEnv("CUSH_VERIFY_BILLING_ENABLED", "true");
    expect(getCushVerifyStripeReadiness().enabled).toBe(true);
  });

  it("rejects live keys outside production and test keys in production", () => {
    vi.stubEnv("CUSH_VERIFY_BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture_only");

    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture_only");
    expect(getCushVerifyStripeReadiness().enabled).toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture_only");
    expect(getCushVerifyStripeReadiness().enabled).toBe(false);
    vi.stubEnv("CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION", "true");
    expect(getCushVerifyStripeReadiness()).toMatchObject({
      enabled: true,
      mode: "test",
    });

    vi.stubEnv("CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION", "false");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture_only");
    expect(getCushVerifyStripeReadiness().enabled).toBe(true);
  });

  it("requires a webhook secret before enabling report billing", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CUSH_VERIFY_BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture_only");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(getCushVerifyStripeReadiness()).toMatchObject({
      enabled: false,
      webhookReady: false,
    });
  });
});
