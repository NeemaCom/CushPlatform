import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";
import {
  cushVerifyPricingPlans,
  cushVerifyPricingVersions,
  cushVerifyStripePriceMappings,
} from "@shared/schema";
import { calculateAnnualPricing } from "@shared/cush-verify-pricing";

let verifyPool: Pool | undefined;

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("Set STRIPE_SECRET_KEY through the workspace secrets flow before running this setup script.");
  const verifyDatabaseUrl = process.env.CUSH_VERIFY_DATABASE_URL?.trim();
  if (!verifyDatabaseUrl) {
    throw new Error("Set CUSH_VERIFY_DATABASE_URL to the intended Cush Verify database before running this setup script.");
  }
  const deploymentEnvironment = process.env.CUSH_VERIFY_DEPLOYMENT_ENV?.trim();
  const isLive = secretKey.startsWith("sk_live_");
  if (!isLive && !secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test key. Live mode requires --confirm-live.");
  }
  if (isLive) {
    if (deploymentEnvironment !== "production") {
      throw new Error("Live Stripe prices require CUSH_VERIFY_DEPLOYMENT_ENV=production.");
    }
    if (!process.argv.includes("--confirm-live")) {
      throw new Error("Live Stripe price creation requires the explicit --confirm-live flag.");
    }
    if (process.env.CONFIRM_LIVE_STRIPE_PRICE_SETUP !== "YES") {
      throw new Error("Set CONFIRM_LIVE_STRIPE_PRICE_SETUP=YES only after confirming live product and price creation.");
    }
  } else {
    if (deploymentEnvironment !== "staging") {
      throw new Error("Stripe test prices require CUSH_VERIFY_DEPLOYMENT_ENV=staging.");
    }
    if (
      process.env.NODE_ENV === "production" &&
      process.env.CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION !== "true"
    ) {
      throw new Error("Test-mode price setup on a production-mode staging service requires CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION=true.");
    }
  }

  verifyPool = new Pool({
    connectionString: verifyDatabaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000,
  });
  const db = drizzle(verifyPool as never, { schema });
  const stripe = new Stripe(secretKey);
  const [version] = await db.select().from(cushVerifyPricingVersions)
    .where(eq(cushVerifyPricingVersions.status, "published"))
    .limit(1);
  if (!version) throw new Error("Publish a Cush Verify pricing catalog before setting up Stripe prices.");
  const plans = await db.select().from(cushVerifyPricingPlans)
    .where(and(
      eq(cushVerifyPricingPlans.versionId, version.id),
      eq(cushVerifyPricingPlans.isActive, true),
      eq(cushVerifyPricingPlans.isArchived, false),
      eq(cushVerifyPricingPlans.salesMode, "self_service"),
    ));

  let mappedCount = 0;
  for (const plan of plans) {
    if (plan.monthlyPriceMinor === null) continue;
    const annual = calculateAnnualPricing(plan.monthlyPriceMinor, version.annualDiscountBps);
    const intervals = [
      { billingInterval: "monthly" as const, stripeInterval: "month" as const, amount: plan.monthlyPriceMinor },
      { billingInterval: "annual" as const, stripeInterval: "year" as const, amount: annual.annualTotalMinor },
    ];

    const search = await stripe.products.search({
      query: `metadata['cush_verify_pricing_version_id']:'${version.id}' AND metadata['cush_verify_plan_key']:'${plan.planKey}'`,
      limit: 10,
    });
    const product = search.data[0] ?? await stripe.products.create({
      name: `Cush Verify ${plan.name}`,
      description: `Institutional subscription for Cush Verify pricing version ${version.version}.`,
      metadata: {
        cush_verify: "true",
        cush_verify_pricing_version_id: String(version.id),
        cush_verify_plan_key: plan.planKey,
      },
    }, { idempotencyKey: `cush-verify-product-${version.id}-${plan.planKey}` });

    for (const interval of intervals) {
      const [existingMapping] = await db.select().from(cushVerifyStripePriceMappings)
        .where(and(
          eq(cushVerifyStripePriceMappings.pricingVersionId, version.id),
          eq(cushVerifyStripePriceMappings.planKey, plan.planKey),
          eq(cushVerifyStripePriceMappings.billingInterval, interval.billingInterval),
        ))
        .limit(1);
      if (existingMapping) {
        if (
          existingMapping.unitAmountMinor !== interval.amount ||
          existingMapping.currency !== plan.currency
        ) {
          throw new Error(`The published ${plan.name} ${interval.billingInterval} price changed. Publish a new pricing version before changing Stripe prices.`);
        }
        mappedCount += 1;
        continue;
      }

      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });
      const existingPrice = existingPrices.data.find((price) =>
        price.metadata.cush_verify_pricing_version_id === String(version.id) &&
        price.metadata.cush_verify_plan_key === plan.planKey &&
        price.metadata.cush_verify_billing_interval === interval.billingInterval,
      );
      const price = existingPrice ?? await stripe.prices.create({
        product: product.id,
        unit_amount: interval.amount,
        currency: plan.currency.toLowerCase(),
        recurring: { interval: interval.stripeInterval },
        metadata: {
          cush_verify_pricing_version_id: String(version.id),
          cush_verify_plan_key: plan.planKey,
          cush_verify_billing_interval: interval.billingInterval,
          cush_verify_included_reports: String(plan.includedReports),
        },
      }, { idempotencyKey: `cush-verify-price-${version.id}-${plan.planKey}-${interval.billingInterval}` });

      if (price.unit_amount !== interval.amount || price.currency.toUpperCase() !== plan.currency) {
        throw new Error(`Stripe price ${price.id} does not match the published ${plan.name} catalog terms.`);
      }
      await db.insert(cushVerifyStripePriceMappings).values({
        pricingVersionId: version.id,
        planKey: plan.planKey,
        billingInterval: interval.billingInterval,
        stripeProductId: product.id,
        stripePriceId: price.id,
        currency: plan.currency,
        unitAmountMinor: interval.amount,
      }).onConflictDoNothing();
      mappedCount += 1;
    }
  }

  console.log(`Mapped ${mappedCount} Cush Verify subscription prices for published catalog version ${version.version} in ${isLive ? "live" : "test"} mode.`);
}

main().catch((error) => {
  console.error("Cush Verify Stripe price setup failed", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exitCode = 1;
}).finally(async () => {
  await verifyPool?.end();
});
