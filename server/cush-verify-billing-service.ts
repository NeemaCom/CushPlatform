import { and, desc, eq, gt, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "./db";
import {
  cushVerifyBillingAccounts,
  cushVerifyBillingOutbox,
  cushVerifyCreditLedger,
  cushVerifySubscriptions,
} from "@shared/schema";
import { getCushVerifyStripeClient, getCushVerifyStripeReadiness } from "./cush-verify-stripe";
import {
  addUtcMonth,
  billingCanUseSubscription,
  getReportChargeDecision,
} from "@shared/cush-verify-billing-rules";
export {
  addUtcMonth,
  billingCanUseSubscription,
  getReportChargeDecision,
} from "@shared/cush-verify-billing-rules";

type BillingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type SubscriptionRow = typeof cushVerifySubscriptions.$inferSelect;

export class CushVerifyBillingEntitlementError extends Error {
  readonly code: "CREDITS_REQUIRED" | "SUBSCRIPTION_INACTIVE" | "BILLING_NOT_CONFIGURED";

  constructor(code: CushVerifyBillingEntitlementError["code"]) {
    super(code === "CREDITS_REQUIRED"
      ? "This organisation has no report credits available."
      : code === "SUBSCRIPTION_INACTIVE"
        ? "The organisation's subscription is not active for new report retrievals."
        : "Report-credit billing is not configured for this organisation.");
    this.name = "CushVerifyBillingEntitlementError";
    this.code = code;
  }
}

export async function refreshBillingSubscriptionStatus(institutionId: number, now = new Date()): Promise<void> {
  await db.update(cushVerifySubscriptions).set({
    status: "suspended",
    updatedAt: now,
  }).where(and(
    eq(cushVerifySubscriptions.institutionId, institutionId),
    eq(cushVerifySubscriptions.status, "past_due"),
    lte(cushVerifySubscriptions.graceEndsAt, now),
  ));
  await db.update(cushVerifySubscriptions).set({
    status: "canceled",
    endedAt: now,
    updatedAt: now,
  }).where(and(
    eq(cushVerifySubscriptions.institutionId, institutionId),
    eq(cushVerifySubscriptions.status, "active"),
    eq(cushVerifySubscriptions.cancelAtPeriodEnd, true),
    lte(cushVerifySubscriptions.currentPeriodEndAt, now),
  ));
}

export async function refreshAllBillingSubscriptionStatuses(now = new Date()): Promise<void> {
  await db.update(cushVerifySubscriptions).set({
    status: "suspended",
    updatedAt: now,
  }).where(and(
    eq(cushVerifySubscriptions.status, "past_due"),
    lte(cushVerifySubscriptions.graceEndsAt, now),
  ));
  await db.update(cushVerifySubscriptions).set({
    status: "canceled",
    endedAt: now,
    updatedAt: now,
  }).where(and(
    eq(cushVerifySubscriptions.status, "active"),
    eq(cushVerifySubscriptions.cancelAtPeriodEnd, true),
    lte(cushVerifySubscriptions.currentPeriodEndAt, now),
  ));
}

async function addPeriodAllocation(
  tx: BillingTransaction,
  subscription: SubscriptionRow,
  account: typeof cushVerifyBillingAccounts.$inferSelect,
  periodStart: Date,
  periodEnd: Date,
  idempotencyKey: string,
  invoiceId: string,
) {
  await tx.insert(cushVerifyCreditLedger).values({
    institutionId: subscription.institutionId,
    subscriptionId: subscription.id,
    entryType: "rollover",
    creditDelta: 0,
    idempotencyKey: `rollover:${idempotencyKey}`,
    details: {
      policy: "carry_all",
      carriedCredits: account.availableCredits,
      periodStart: periodStart.toISOString(),
    },
  }).onConflictDoNothing();

  const [allocation] = await tx.insert(cushVerifyCreditLedger).values({
    institutionId: subscription.institutionId,
    subscriptionId: subscription.id,
    entryType: "allocation",
    creditDelta: subscription.includedReports,
    idempotencyKey: `allocation:${idempotencyKey}`,
    currency: subscription.currency,
    details: {
      planKey: subscription.planKey,
      pricingVersionId: subscription.pricingVersionId,
      billingInterval: subscription.billingInterval,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      includedReports: subscription.includedReports,
      invoiceId,
    },
  }).onConflictDoNothing().returning({ id: cushVerifyCreditLedger.id });

  if (!allocation) return false;
  await tx.update(cushVerifyBillingAccounts).set({
    availableCredits: account.availableCredits + subscription.includedReports,
    currentPeriodUsed: 0,
    currentPeriodStartAt: periodStart,
    currentPeriodEndAt: periodEnd,
    updatedAt: new Date(),
  }).where(eq(cushVerifyBillingAccounts.institutionId, subscription.institutionId));
  return true;
}

export async function allocateDueAnnualCredits(institutionId: number, now = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    const [subscription] = await tx.select().from(cushVerifySubscriptions)
      .where(and(
        eq(cushVerifySubscriptions.institutionId, institutionId),
        eq(cushVerifySubscriptions.billingInterval, "annual"),
        eq(cushVerifySubscriptions.status, "active"),
      ))
      .for("update")
      .limit(1);
    if (
      !subscription ||
      !subscription.nextCreditAllocationAt ||
      subscription.currentPeriodEndAt <= now
    ) return;

    const [account] = await tx.select().from(cushVerifyBillingAccounts)
      .where(eq(cushVerifyBillingAccounts.institutionId, institutionId))
      .for("update")
      .limit(1);
    if (!account) return;

    let nextAllocation = subscription.nextCreditAllocationAt;
    let currentBalance = account.availableCredits;
    let allocations = 0;
    while (
      nextAllocation <= now &&
      nextAllocation < subscription.currentPeriodEndAt &&
      allocations < 18
    ) {
      const nextPeriodEnd = addUtcMonth(nextAllocation);
      await tx.insert(cushVerifyCreditLedger).values({
        institutionId,
        subscriptionId: subscription.id,
        entryType: "rollover",
        creditDelta: 0,
        idempotencyKey: `rollover:annual:${subscription.id}:${nextAllocation.toISOString()}`,
        details: {
          policy: "carry_all",
          carriedCredits: currentBalance,
          periodStart: nextAllocation.toISOString(),
        },
      }).onConflictDoNothing().returning({ id: cushVerifyCreditLedger.id });
      const [allocation] = await tx.insert(cushVerifyCreditLedger).values({
        institutionId,
        subscriptionId: subscription.id,
        entryType: "allocation",
        creditDelta: subscription.includedReports,
        currency: subscription.currency,
        idempotencyKey: `allocation:annual:${subscription.id}:${nextAllocation.toISOString()}`,
        details: {
          planKey: subscription.planKey,
          pricingVersionId: subscription.pricingVersionId,
          billingInterval: "annual",
          periodStart: nextAllocation.toISOString(),
          periodEnd: nextPeriodEnd.toISOString(),
          includedReports: subscription.includedReports,
          renewalKind: "monthly_credit_allocation",
        },
      }).onConflictDoNothing().returning({ id: cushVerifyCreditLedger.id });

      if (allocation) {
        currentBalance += subscription.includedReports;
        await tx.update(cushVerifyBillingAccounts).set({
          availableCredits: currentBalance,
          currentPeriodUsed: 0,
          currentPeriodStartAt: nextAllocation,
          currentPeriodEndAt: nextPeriodEnd,
          updatedAt: now,
        }).where(eq(cushVerifyBillingAccounts.institutionId, institutionId));
      }

      nextAllocation = nextPeriodEnd;
      allocations += 1;
    }

    await tx.update(cushVerifySubscriptions).set({
      nextCreditAllocationAt: nextAllocation,
      updatedAt: now,
    }).where(eq(cushVerifySubscriptions.id, subscription.id));
  });
}

export async function allocatePaidInvoiceCredits(
  tx: BillingTransaction,
  subscription: SubscriptionRow,
  invoiceId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const [account] = await tx.select().from(cushVerifyBillingAccounts)
    .where(eq(cushVerifyBillingAccounts.institutionId, subscription.institutionId))
    .for("update")
    .limit(1);
  if (!account) throw new Error("Cush Verify billing account is missing for a paid subscription.");
  return addPeriodAllocation(
    tx,
    subscription,
    account,
    periodStart,
    periodEnd,
    `billing-cycle:${subscription.stripeSubscriptionId}:${periodStart.toISOString()}`,
    invoiceId,
  );
}

export async function recordReportCreditUse(
  tx: BillingTransaction,
  input: { institutionId: number; reportDeliveryId: number; now?: Date },
) {
  const now = input.now ?? new Date();
  const [subscription] = await tx.select().from(cushVerifySubscriptions)
    .where(and(
      eq(cushVerifySubscriptions.institutionId, input.institutionId),
      inArray(cushVerifySubscriptions.status, ["incomplete", "trialing", "active", "past_due", "unpaid", "paused", "canceled", "suspended"]),
    ))
    .orderBy(desc(cushVerifySubscriptions.updatedAt))
    .for("update")
    .limit(1);
  const [account] = await tx.select().from(cushVerifyBillingAccounts)
    .where(eq(cushVerifyBillingAccounts.institutionId, input.institutionId))
    .for("update")
    .limit(1);

  if (!account) throw new CushVerifyBillingEntitlementError("CREDITS_REQUIRED");
  const decision = getReportChargeDecision({
    availableCredits: account.availableCredits,
    subscription: subscription ?? null,
    stripeBillingEnabled: getCushVerifyStripeReadiness().enabled,
    stripeCustomerAvailable: Boolean(account.stripeCustomerId),
    now,
  });
  if (decision.kind === "denied") {
    throw new CushVerifyBillingEntitlementError(decision.code);
  }

  if (decision.kind === "credit") {
    const [entry] = await tx.insert(cushVerifyCreditLedger).values({
      institutionId: input.institutionId,
      subscriptionId: subscription?.id ?? null,
      reportDeliveryId: input.reportDeliveryId,
      entryType: "report_debit",
      creditDelta: -1,
      currency: subscription?.currency ?? null,
      idempotencyKey: `report-delivery:${input.reportDeliveryId}`,
      details: { unitCount: 1 },
    }).onConflictDoNothing().returning({ id: cushVerifyCreditLedger.id });
    if (!entry) return { charged: false as const, overageLedgerId: null };
    await tx.update(cushVerifyBillingAccounts).set({
      availableCredits: account.availableCredits - 1,
      currentPeriodUsed: account.currentPeriodUsed + 1,
      updatedAt: now,
    }).where(eq(cushVerifyBillingAccounts.institutionId, input.institutionId));
    return { charged: true as const, overageLedgerId: null };
  }

  const overagePrice = subscription!.additionalReportPriceMinor!;

  const [overage] = await tx.insert(cushVerifyCreditLedger).values({
    institutionId: input.institutionId,
    subscriptionId: subscription.id,
    reportDeliveryId: input.reportDeliveryId,
    entryType: "overage",
    creditDelta: 0,
    amountMinor: overagePrice,
    currency: subscription.currency,
    idempotencyKey: `report-overage:${input.reportDeliveryId}`,
    details: {
      planKey: subscription.planKey,
      pricingVersionId: subscription.pricingVersionId,
      reportCount: 1,
    },
  }).onConflictDoNothing().returning({ id: cushVerifyCreditLedger.id });
  if (!overage) return { charged: false as const, overageLedgerId: null };

  if (overagePrice > 0 && account.stripeCustomerId) {
    await tx.insert(cushVerifyBillingOutbox).values({
      ledgerId: overage.id,
      stripeCustomerId: account.stripeCustomerId,
    });
  }
  await tx.update(cushVerifyBillingAccounts).set({
    currentPeriodUsed: account.currentPeriodUsed + 1,
    updatedAt: now,
  }).where(eq(cushVerifyBillingAccounts.institutionId, input.institutionId));
  return { charged: true as const, overageLedgerId: overage.id };
}

let billingWorkersStarted = false;

export function startCushVerifyBillingWorkers(): void {
  if (!getCushVerifyStripeReadiness().enabled || billingWorkersStarted) return;
  billingWorkersStarted = true;
  const outboxTimer = setInterval(() => {
    void processPendingCushVerifyBillingOutbox().catch((error) => {
      console.error("Cush Verify billing outbox worker failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    });
  }, 30_000);
  outboxTimer.unref();

  const annualCreditsTimer = setInterval(() => {
    void Promise.all([
      processDueAnnualCredits(),
      refreshAllBillingSubscriptionStatuses(),
    ]).catch((error) => {
      console.error("Cush Verify annual credit allocation failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    });
  }, 60 * 60_000);
  annualCreditsTimer.unref();
  void Promise.all([
    processDueAnnualCredits(),
    refreshAllBillingSubscriptionStatuses(),
  ]).catch((error) => {
    console.error("Cush Verify annual credit allocation failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  });
}

export async function processDueAnnualCredits(now = new Date()): Promise<void> {
  const due = await db.select({ institutionId: cushVerifySubscriptions.institutionId })
    .from(cushVerifySubscriptions)
    .where(and(
      eq(cushVerifySubscriptions.billingInterval, "annual"),
      eq(cushVerifySubscriptions.status, "active"),
      lte(cushVerifySubscriptions.nextCreditAllocationAt, now),
      gt(cushVerifySubscriptions.currentPeriodEndAt, now),
    ))
    .limit(100);
  for (const row of due) {
    await allocateDueAnnualCredits(row.institutionId, now);
  }
}

export async function processPendingCushVerifyBillingOutbox(limit = 10): Promise<number> {
  if (!getCushVerifyStripeReadiness().enabled) return 0;
  const now = new Date();
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx.select({
      outbox: cushVerifyBillingOutbox,
      ledger: cushVerifyCreditLedger,
    })
      .from(cushVerifyBillingOutbox)
      .innerJoin(cushVerifyCreditLedger, eq(cushVerifyCreditLedger.id, cushVerifyBillingOutbox.ledgerId))
      .where(and(
        lte(cushVerifyBillingOutbox.nextAttemptAt, now),
        or(
          eq(cushVerifyBillingOutbox.status, "pending"),
          and(
            eq(cushVerifyBillingOutbox.status, "processing"),
            or(isNull(cushVerifyBillingOutbox.lockedUntil), lt(cushVerifyBillingOutbox.lockedUntil, now)),
          ),
        ),
      ))
      .orderBy(cushVerifyBillingOutbox.nextAttemptAt)
      .limit(Math.max(1, Math.min(limit, 50)))
      .for("update", { skipLocked: true });
    for (const row of rows) {
      await tx.update(cushVerifyBillingOutbox).set({
        status: "processing",
        lockedUntil: new Date(now.getTime() + 60_000),
        attemptCount: row.outbox.attemptCount + 1,
        updatedAt: now,
      }).where(eq(cushVerifyBillingOutbox.id, row.outbox.id));
    }
    return rows;
  });

  const stripe = getCushVerifyStripeClient();
  let sent = 0;
  for (const { outbox, ledger } of claimed) {
    try {
      if (!ledger.amountMinor || !ledger.currency) throw new Error("Invalid overage ledger record.");
      const item = await stripe.invoiceItems.create({
        customer: outbox.stripeCustomerId,
        amount: ledger.amountMinor,
        currency: ledger.currency.toLowerCase(),
        description: "Cush Verify authorized report overage",
        metadata: {
          cush_verify_ledger_id: String(ledger.id),
          institution_id: String(ledger.institutionId),
          report_delivery_id: String(ledger.reportDeliveryId ?? ""),
        },
      }, { idempotencyKey: `cush-verify-overage-${ledger.id}` });
      await db.update(cushVerifyBillingOutbox).set({
        status: "sent",
        stripeInvoiceItemId: item.id,
        lockedUntil: null,
        lastErrorCode: null,
        updatedAt: new Date(),
      }).where(eq(cushVerifyBillingOutbox.id, outbox.id));
      sent += 1;
    } catch (error) {
      const attemptCount = outbox.attemptCount + 1;
      const retryDelay = Math.min(24 * 60 * 60_000, 30_000 * (2 ** Math.min(attemptCount, 10)));
      const maybeCode = error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
      await db.update(cushVerifyBillingOutbox).set({
        status: "pending",
        lockedUntil: null,
        nextAttemptAt: new Date(Date.now() + retryDelay),
        lastErrorCode: /^[a-z0-9_]{1,60}$/i.test(maybeCode) ? maybeCode : "stripe_request_failed",
        updatedAt: new Date(),
      }).where(eq(cushVerifyBillingOutbox.id, outbox.id));
    }
  }
  return sent;
}
