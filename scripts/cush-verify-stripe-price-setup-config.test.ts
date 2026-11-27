import { describe, expect, it } from "vitest";
import { resolveStripePriceSetupConfig } from "./cush-verify-stripe-price-setup-config";

const stagingEnvironment = {
  STRIPE_SECRET_KEY: "sk_test_example",
  CUSH_VERIFY_DATABASE_URL: "postgresql://verify-staging.example.test:5432/verify",
  DATABASE_URL: "postgresql://passport.example.test:5432/passport",
  CUSH_VERIFY_DEPLOYMENT_ENV: "staging",
  NODE_ENV: "production",
  CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION: "true",
};

describe("Cush Verify Stripe price setup configuration", () => {
  it("accepts a test key only for the dedicated staging database and mode", () => {
    expect(resolveStripePriceSetupConfig(stagingEnvironment, [])).toMatchObject({
      secretKey: "sk_test_example",
      verifyDatabaseUrl: stagingEnvironment.CUSH_VERIFY_DATABASE_URL,
      mode: "test",
    });
  });

  it("rejects a missing or malformed Verify database URL", () => {
    expect(() =>
      resolveStripePriceSetupConfig({
        ...stagingEnvironment,
        CUSH_VERIFY_DATABASE_URL: "not-a-database-url",
      }),
    ).toThrow("CUSH_VERIFY_DATABASE_URL must be a valid PostgreSQL URL");
  });

  it("rejects reuse of the Passport database URL", () => {
    expect(() =>
      resolveStripePriceSetupConfig({
        ...stagingEnvironment,
        CUSH_VERIFY_DATABASE_URL: stagingEnvironment.DATABASE_URL,
      }),
    ).toThrow("must not reuse DATABASE_URL");
  });

  it("rejects Stripe test mode outside staging", () => {
    expect(() =>
      resolveStripePriceSetupConfig({
        ...stagingEnvironment,
        CUSH_VERIFY_DEPLOYMENT_ENV: "production",
      }),
    ).toThrow("Stripe test prices require CUSH_VERIFY_DEPLOYMENT_ENV=staging");
  });

  it("requires an explicit opt-in for test mode on a production-mode service", () => {
    expect(() =>
      resolveStripePriceSetupConfig({
        ...stagingEnvironment,
        CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION: "false",
      }),
    ).toThrow("CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION=true");
  });

  it("requires both live-mode confirmations and the production marker", () => {
    const liveEnvironment = {
      ...stagingEnvironment,
      STRIPE_SECRET_KEY: "sk_live_example",
      CUSH_VERIFY_DEPLOYMENT_ENV: "production",
      CONFIRM_LIVE_STRIPE_PRICE_SETUP: "YES",
    };

    expect(() => resolveStripePriceSetupConfig(liveEnvironment, [])).toThrow("--confirm-live");
    expect(
      resolveStripePriceSetupConfig(liveEnvironment, ["--confirm-live"]).mode,
    ).toBe("live");
    expect(() =>
      resolveStripePriceSetupConfig(
        { ...liveEnvironment, CUSH_VERIFY_DEPLOYMENT_ENV: "staging" },
        ["--confirm-live"],
      ),
    ).toThrow("CUSH_VERIFY_DEPLOYMENT_ENV=production");
  });
});
