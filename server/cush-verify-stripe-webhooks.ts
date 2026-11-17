import express, { type Express } from "express";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import {
  cushVerifyBillingAccounts,
  cushVerifyPricingPlans,
  cushVerifyStripePriceMappings,
  cushVerifyStripeWebhookEvents,
  cushVerifySubscriptions,
} from "@shared/schema";
import { cushVerifyDb as db } from "./db";
import {
  allocatePaidInvoiceCredits,
  addUtcMonth,
} from "./cush-verify-billing-service";
import {
  CushVerifyStripeUnavailableError,
  getCushVerifyStripeClient,
  getCushVerifyStripeWebhookSecret,
} from "./cush-verify-stripe";

function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === "string") return value;
  return value && typeof value.id === "string" ? value.id : null;
}

function fromUnixSeconds(value: number | null | undefined, fallback: Date): Date {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? new Date(value * 1000)
    : fallback;
}

function subscriptionStatus(status: string): typeof cushVerifySubscriptions.$inferInsert.status {
  if (status === "incomplete_expired") return "canceled";
  if (
    status === "incomplete" || status === "trialing" || status === "active" ||
    status === "past_due" || status === "canceled" || status === "unpaid" ||
    status === "paused" || status === "suspended"
  ) return status;
  return "incomplete";
}

function paymentGraceDays(): number {
  const configured = Number(process.env.CUSH_VERIFY_PAYMENT_GRACE_DAYS);
  return Number.isInteger(configured) && configured >= 1 && configured <= 30 ? configured : 7;
}

async function syncStripeSubscription(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], stripeSubscription: Stripe.Subscription) {
  const stripeSubscriptionId = stripeSubscription.id;
  const customerId = stripeId(stripeSubscription.customer);
  if (!customerId) return;
  const [account] = await tx.select().from(cushVerifyBillingAccounts)
    .where(eq(cushVerifyBillingAccounts.stripeCustomerId, customerId))
    .limit(1);
  if (!account) return;

  const item = stripeSubscription.items.data[0];
  const stripePriceId = item?.price?.id;
  if (!stripePriceId) return;
  const [mapping] = await tx.select().from(cushVerifyStripePriceMappings)
    .where(eq(cushVerifyStripePriceMappings.stripePriceId, stripePriceId))
    .limit(1);
  const [existing] = await tx.select().from(cushVerifySubscriptions)
    .where(eq(cushVerifySubscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .for("update")
    .limit(1);
  const now = new Date();

  if (!mapping) {
    if (existing) {
      await tx.update(cushVerifySubscriptions).set({
        status: "suspended",
        updatedAt: now,
      }).where(eq(cushVerifySubscriptions.id, existing.id));
    }
    return;
  }

  const [plan] = await tx.select().from(cushVerifyPricingPlans)
    .where(and(
      eq(cushVerifyPricingPlans.versionId, mapping.pricingVersionId),
      eq(cushVerifyPricingPlans.planKey, mapping.planKey),
    ))
    .limit(1);
  if (!plan) throw new Error("Stripe price mapping does not match the Cush Verify pricing catalog.");

  const stripeFields = stripeSubscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const periodStart = fromUnixSeconds(stripeFields.current_period_start, now);
  const periodEnd = fromUnixSeconds(
    stripeFields.current_period_end,
    new Date(periodStart.getTime() + (mapping.billingInterval === "annual" ? 366 : 32) * 24 * 60 * 60_000),
  );
  const status = subscriptionStatus(stripeSubscription.status);
  const graceEndsAt = status === "past_due"
    ? existing?.graceEndsAt ?? new Date(now.getTime() + paymentGraceDays() * 24 * 60 * 60_000)
    : null;
  const values = {
    institutionId: account.institutionId,
    pricingVersionId: mapping.pricingVersionId,
    planKey: mapping.planKey,
    stripeSubscriptionId,
    stripePriceId,
    billingInterval: mapping.billingInterval,
    status,
    currency: mapping.currency,
    unitAmountMinor: mapping.unitAmountMinor,
    includedReports: plan.includedReports,
    additionalReportPriceMinor: plan.additionalReportPriceMinor,
    currentPeriodStartAt: periodStart,
    currentPeriodEndAt: periodEnd,
    nextCreditAllocationAt: mapping.billingInterval === "annual"
      ? existing?.nextCreditAllocationAt ?? null
      : null,
    rolloverPolicy: "carry_all" as const,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    graceEndsAt,
    updatedAt: now,
    endedAt: status === "canceled" ? existing?.endedAt ?? now : null,
  };

  if (existing) {
    await tx.update(cushVerifySubscriptions).set(values)
      .where(eq(cushVerifySubscriptions.id, existing.id));
  } else {
    await tx.insert(cushVerifySubscriptions).values(values);
  }
}

async function markSubscriptionDeleted(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  stripeSubscription: Stripe.Subscription,
) {
  const now = new Date();
  await tx.update(cushVerifySubscriptions).set({
    status: "canceled",
    cancelAtPeriodEnd: false,
    graceEndsAt: null,
    endedAt: now,
    updatedAt: now,
  }).where(eq(cushVerifySubscriptions.stripeSubscriptionId, stripeSubscription.id));
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
  return stripeId(raw.subscription);
}

async function markInvoicePaid(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  invoice: Stripe.Invoice,
) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  const [subscription] = await tx.select().from(cushVerifySubscriptions)
    .where(eq(cushVerifySubscriptions.stripeSubscriptionId, subscriptionId))
    .for("update")
    .limit(1);
  if (!subscription) throw new Error("Paid Cush Verify subscription has not been synchronized yet.");

  const now = new Date();
  const rawInvoice = invoice as Stripe.Invoice & { period_start?: number; period_end?: number };
  const subscriptionLine = invoice.lines.data.find((line) =>
    (line as unknown as { type?: string }).type === "subscription",
  );
  const periodStart = fromUnixSeconds(rawInvoice.period_start ?? subscriptionLine?.period.start, subscription.currentPeriodStartAt);
  const periodEnd = fromUnixSeconds(rawInvoice.period_end ?? subscriptionLine?.period.end, subscription.currentPeriodEndAt);
  if (periodEnd <= periodStart) throw new Error("Stripe invoice period is invalid.");

  const firstCreditPeriodEnd = subscription.billingInterval === "annual"
    ? new Date(Math.min(addUtcMonth(periodStart).getTime(), periodEnd.getTime()))
    : periodEnd;
  const updatedSubscription = {
    ...subscription,
    status: "active" as const,
    currentPeriodStartAt: periodStart,
    currentPeriodEndAt: periodEnd,
    nextCreditAllocationAt: subscription.billingInterval === "annual"
      ? addUtcMonth(periodStart)
      : null,
    graceEndsAt: null,
    updatedAt: now,
  };
  await tx.update(cushVerifySubscriptions).set({
    status: "active",
    currentPeriodStartAt: periodStart,
    currentPeriodEndAt: periodEnd,
    nextCreditAllocationAt: updatedSubscription.nextCreditAllocationAt,
    graceEndsAt: null,
    updatedAt: now,
  }).where(eq(cushVerifySubscriptions.id, subscription.id));
  await allocatePaidInvoiceCredits(
    tx,
    updatedSubscription,
    invoice.id,
    periodStart,
    firstCreditPeriodEnd,
  );
}

async function markInvoicePaymentFailed(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  invoice: Stripe.Invoice,
) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  const now = new Date();
  const [subscription] = await tx.select().from(cushVerifySubscriptions)
    .where(eq(cushVerifySubscriptions.stripeSubscriptionId, subscriptionId))
    .for("update")
    .limit(1);
  if (!subscription) return;
  const graceEndsAt = subscription.graceEndsAt ??
    new Date(now.getTime() + paymentGraceDays() * 24 * 60 * 60_000);
  await tx.update(cushVerifySubscriptions).set({
    status: "past_due",
    graceEndsAt,
    updatedAt: now,
  }).where(eq(cushVerifySubscriptions.stripeSubscriptionId, subscriptionId));
}

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  const object = event.data.object as { id?: string };
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(cushVerifyStripeWebhookEvents).values({
      eventId: event.id,
      eventType: event.type,
      stripeObjectId: typeof object.id === "string" ? object.id : null,
    }).onConflictDoNothing().returning({ eventId: cushVerifyStripeWebhookEvents.eventId });
    if (!inserted) return;

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      await syncStripeSubscription(tx, event.data.object as Stripe.Subscription);
    } else if (event.type === "customer.subscription.deleted") {
      await markSubscriptionDeleted(tx, event.data.object as Stripe.Subscription);
    } else if (event.type === "invoice.paid") {
      await markInvoicePaid(tx, event.data.object as Stripe.Invoice);
    } else if (event.type === "invoice.payment_failed") {
      await markInvoicePaymentFailed(tx, event.data.object as Stripe.Invoice);
    }
  });
}

export function registerCushVerifyStripeWebhook(app: Express): void {
  app.post(
    "/api/verify/billing/stripe/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req, res) => {
      const signature = req.get("stripe-signature");
      if (!signature || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: "A signed Stripe event is required." });
      }
      try {
        const stripe = getCushVerifyStripeClient({ requireBillingEnabled: false });
        const event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          getCushVerifyStripeWebhookSecret(),
        );
        await processStripeEvent(event);
        return res.json({ received: true });
      } catch (error) {
        if (error instanceof CushVerifyStripeUnavailableError) {
          return res.status(503).json({ error: "Stripe webhook verification is not configured." });
        }
        if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
          return res.status(400).json({ error: "Stripe event signature is invalid." });
        }
        console.error("Cush Verify Stripe webhook processing failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Stripe event could not be processed." });
      }
    },
  );
}
