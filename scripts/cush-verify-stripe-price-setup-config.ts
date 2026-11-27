export type StripePriceSetupEnvironment = Record<string, string | undefined>;

export type StripePriceSetupConfig = {
  secretKey: string;
  verifyDatabaseUrl: string;
  mode: "test" | "live";
};

function isPostgresUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
      Boolean(url.hostname) &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

export function resolveStripePriceSetupConfig(
  environment: StripePriceSetupEnvironment = process.env,
  args: string[] = process.argv,
): StripePriceSetupConfig {
  const secretKey = environment.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Set STRIPE_SECRET_KEY through the workspace secrets flow before running this setup script.");
  }

  const verifyDatabaseUrl = environment.CUSH_VERIFY_DATABASE_URL?.trim();
  if (!verifyDatabaseUrl || !isPostgresUrl(verifyDatabaseUrl)) {
    throw new Error("CUSH_VERIFY_DATABASE_URL must be a valid PostgreSQL URL for the dedicated Cush Verify database.");
  }
  if (
    environment.DATABASE_URL?.trim() &&
    verifyDatabaseUrl === environment.DATABASE_URL.trim()
  ) {
    throw new Error("CUSH_VERIFY_DATABASE_URL must not reuse DATABASE_URL.");
  }

  const isLive = secretKey.startsWith("sk_live_");
  if (!isLive && !secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test key, or a confirmed live key.");
  }

  const deploymentEnvironment = environment.CUSH_VERIFY_DEPLOYMENT_ENV?.trim();
  if (isLive) {
    if (deploymentEnvironment !== "production") {
      throw new Error("Live Stripe prices require CUSH_VERIFY_DEPLOYMENT_ENV=production.");
    }
    if (!args.includes("--confirm-live")) {
      throw new Error("Live Stripe price creation requires the explicit --confirm-live flag.");
    }
    if (environment.CONFIRM_LIVE_STRIPE_PRICE_SETUP !== "YES") {
      throw new Error("Set CONFIRM_LIVE_STRIPE_PRICE_SETUP=YES only after confirming live product and price creation.");
    }
    return { secretKey, verifyDatabaseUrl, mode: "live" };
  }

  if (deploymentEnvironment !== "staging") {
    throw new Error("Stripe test prices require CUSH_VERIFY_DEPLOYMENT_ENV=staging.");
  }
  if (
    environment.NODE_ENV === "production" &&
    environment.CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION !== "true"
  ) {
    throw new Error("Test-mode price setup on a production-mode staging service requires CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION=true.");
  }

  return { secretKey, verifyDatabaseUrl, mode: "test" };
}
