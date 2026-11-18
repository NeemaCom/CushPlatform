import type { Express, Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  ADMIN_PERMISSION,
} from "@shared/admin-permissions";
import {
  cushVerifyBillingAccounts,
  cushVerifyCreditLedger,
  cushVerifyInstitutions,
  cushVerifyPricingPlans,
  cushVerifyPricingVersions,
  cushVerifyStripePriceMappings,
  cushVerifySubscriptions,
} from "@shared/schema";
import { calculateAnnualPricing } from "@shared/cush-verify-pricing";
import { cushVerifyDb as db } from "./db";
import {
  isAuthenticated,
  requireAdminPermission,
  requireTrustedAdminOrigin,
  type AuthenticatedRequest,
} from "./auth";
import { recordAdminAuditEventAfterCommit } from "./admin-audit";
import { getAllowedFrontendOrigins } from "./origin-policy";
import {
  getInstitutionalWorkspaceState,
  isInstitutionalAuthenticated,
  requireApprovedInstitution,
  type InstitutionalRequest,
} from "./cush-verify-institutional-routes";
import {
  allocateDueAnnualCredits,
  refreshBillingSubscriptionStatus,
} from "./cush-verify-billing-service";
import {
  CushVerifyStripeUnavailableError,
  getCushVerifyStripeClient,
  getCushVerifyStripeReadiness,
} from "./cush-verify-stripe";

const checkoutSchema = z.object({
  planKey: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/),
  interval: z.enum(["monthly", "annual"]),
}).strict();

const adjustmentSchema = z.object({
  requestId: z.string().uuid(),
  kind: z.enum(["promotional_credit", "admin_adjustment"]),
  creditDelta: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
  reason: z.string().trim().min(10).max(500),
}).strict();

const reversalSchema = z.object({
  reason: z.string().trim().min(10).max(500),
}).strict();

function schemaUnavailable(error: unknown, res: Response): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && typeof current === "object" && current !== null; depth += 1) {
    if ("code" in current) {
      const code = (current as { code?: string }).code;
      if (code === "42P01" || code === "42703") {
        res.status(503).json({
          code: "CUSH_VERIFY_BILLING_SCHEMA_REQUIRED",
          error: "Cush Verify billing storage is not ready. Apply the billing migration first.",
        });
        return true;
      }
    }
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

async function getInstitutionActor(req: InstitutionalRequest) {
  const userId = req.cushVerifyInstitutionalUserId;
  if (!userId) return null;
  const membership = await getInstitutionalWorkspaceState(userId);
  if (
    !membership ||
    membership.membershipStatus !== "active" ||
    membership.institutionStatus !== "approved" ||
    membership.applicationStatus !== "approved"
  ) return null;
  return {
    institutionalUserId: userId,
    institutionId: membership.institutionId,
    role: membership.role,
    institutionName: membership.tradingName || membership.institutionName,
  };
}

function requestOrigin(req: InstitutionalRequest): string | null {
  const origin = req.get("Origin");
  const allowed = getAllowedFrontendOrigins();
  if (origin && allowed.has(origin)) return origin;
  return process.env.NODE_ENV === "production" ? "https://app.we-cush.com" : null;
}

function requireOrganisationAdmin(role: string) {
  return role === "organisation_admin";
}

function toAdminInstitutionId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function registerCushVerifyBillingRoutes(app: Express): void {
  app.get(
    "/api/verify/billing",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      try {
        const actor = await getInstitutionActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        await refreshBillingSubscriptionStatus(actor.institutionId);
        await allocateDueAnnualCredits(actor.institutionId);
        const [account] = await db.select().from(cushVerifyBillingAccounts)
          .where(eq(cushVerifyBillingAccounts.institutionId, actor.institutionId))
          .limit(1);
        const subscriptions = await db.select().from(cushVerifySubscriptions)
          .where(eq(cushVerifySubscriptions.institutionId, actor.institutionId))
          .orderBy(desc(cushVerifySubscriptions.updatedAt))
          .limit(1);
        const [version] = await db.select().from(cushVerifyPricingVersions)
          .where(eq(cushVerifyPricingVersions.status, "published"))
          .limit(1);
        const plans = version
          ? await db.select().from(cushVerifyPricingPlans)
              .where(and(
                eq(cushVerifyPricingPlans.versionId, version.id),
                eq(cushVerifyPricingPlans.isActive, true),
                eq(cushVerifyPricingPlans.isArchived, false),
              ))
          : [];
        const mappings = version
          ? await db.select().from(cushVerifyStripePriceMappings)
              .where(eq(cushVerifyStripePriceMappings.pricingVersionId, version.id))
          : [];
        const mappingsByKey = new Map(mappings.map((mapping) => [
          `${mapping.planKey}:${mapping.billingInterval}`,
          mapping,
        ]));
        const readiness = getCushVerifyStripeReadiness();
        const [ledger] = await Promise.all([
          db.select({
            id: cushVerifyCreditLedger.id,
            entryType: cushVerifyCreditLedger.entryType,
            creditDelta: cushVerifyCreditLedger.creditDelta,
            amountMinor: cushVerifyCreditLedger.amountMinor,
            currency: cushVerifyCreditLedger.currency,
            createdAt: cushVerifyCreditLedger.createdAt,
          })
            .from(cushVerifyCreditLedger)
            .where(eq(cushVerifyCreditLedger.institutionId, actor.institutionId))
            .orderBy(desc(cushVerifyCreditLedger.createdAt))
            .limit(20),
        ]);
        const subscription = subscriptions[0] ?? null;
        const currentPlan = subscription
          ? plans.find((plan) => plan.planKey === subscription.planKey)
          : null;
        return res.json({
          institution: { id: actor.institutionId, name: actor.institutionName },
          billingConfigured: readiness.enabled,
          stripeMode: readiness.mode,
          subscription: subscription ? {
            planKey: subscription.planKey,
            planName: currentPlan?.name ?? subscription.planKey,
            status: subscription.status,
            interval: subscription.billingInterval,
            currency: subscription.currency,
            unitAmountMinor: subscription.unitAmountMinor,
            includedReports: subscription.includedReports,
            additionalReportPriceMinor: subscription.additionalReportPriceMinor,
            currentPeriodStartAt: subscription.currentPeriodStartAt.toISOString(),
            currentPeriodEndAt: subscription.currentPeriodEndAt.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            graceEndsAt: subscription.graceEndsAt?.toISOString() ?? null,
          } : null,
          credits: {
            available: account?.availableCredits ?? 0,
            usedThisPeriod: account?.currentPeriodUsed ?? 0,
            periodStartAt: account?.currentPeriodStartAt?.toISOString() ?? null,
            periodEndAt: account?.currentPeriodEndAt?.toISOString() ?? null,
          },
          plans: version ? plans.map((plan) => {
            const annual = calculateAnnualPricing(plan.monthlyPriceMinor, version.annualDiscountBps);
            return {
              planKey: plan.planKey,
              name: plan.name,
              description: plan.description,
              currency: plan.currency,
              monthlyPriceMinor: plan.monthlyPriceMinor,
              annualPriceMinor: annual.annualTotalMinor,
              includedReports: plan.includedReports,
              additionalReportPriceMinor: plan.additionalReportPriceMinor,
              salesMode: plan.salesMode,
              checkoutReady: readiness.enabled &&
                Boolean(mappingsByKey.get(`${plan.planKey}:monthly`)) &&
                Boolean(mappingsByKey.get(`${plan.planKey}:annual`)),
            };
          }) : [],
          ledger: ledger.map((entry) => ({
            id: entry.id,
            type: entry.entryType,
            creditDelta: entry.creditDelta,
            amountMinor: entry.amountMinor,
            currency: entry.currency,
            createdAt: entry.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        if (schemaUnavailable(error, res)) return;
        console.error("Cush Verify billing summary failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Billing information could not be loaded." });
      }
    },
  );

  app.post(
    "/api/verify/billing/checkout",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Choose a valid Cush Verify plan and billing interval." });
      try {
        const actor = await getInstitutionActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!requireOrganisationAdmin(actor.role)) {
          return res.status(403).json({ error: "Only an organisation administrator can change billing." });
        }
        const origin = requestOrigin(req);
        if (!origin) return res.status(403).json({ error: "The billing return address is not allowed." });
        if (!getCushVerifyStripeReadiness().enabled) {
          return res.status(503).json({ error: "Online billing is not enabled for this environment." });
        }
        await refreshBillingSubscriptionStatus(actor.institutionId);

        const [activeSubscription] = await db.select({ id: cushVerifySubscriptions.id })
          .from(cushVerifySubscriptions)
          .where(and(
            eq(cushVerifySubscriptions.institutionId, actor.institutionId),
            inArray(cushVerifySubscriptions.status, ["incomplete", "trialing", "active", "past_due", "unpaid", "paused", "suspended"]),
          ))
          .limit(1);
        if (activeSubscription) {
          return res.status(409).json({ error: "This organisation already has a current subscription. Use Manage billing to change it." });
        }

        const [version] = await db.select().from(cushVerifyPricingVersions)
          .where(eq(cushVerifyPricingVersions.status, "published"))
          .limit(1);
        if (!version) return res.status(503).json({ error: "Cush Verify pricing is not published." });
        const [plan] = await db.select().from(cushVerifyPricingPlans)
          .where(and(
            eq(cushVerifyPricingPlans.versionId, version.id),
            eq(cushVerifyPricingPlans.planKey, parsed.data.planKey),
            eq(cushVerifyPricingPlans.isActive, true),
            eq(cushVerifyPricingPlans.isArchived, false),
            eq(cushVerifyPricingPlans.salesMode, "self_service"),
          ))
          .limit(1);
        if (!plan) return res.status(404).json({ error: "That plan is not available for online subscription." });
        const [mapping] = await db.select().from(cushVerifyStripePriceMappings)
          .where(and(
            eq(cushVerifyStripePriceMappings.pricingVersionId, version.id),
            eq(cushVerifyStripePriceMappings.planKey, plan.planKey),
            eq(cushVerifyStripePriceMappings.billingInterval, parsed.data.interval),
          ))
          .limit(1);
        if (!mapping) return res.status(503).json({ error: "Online checkout is not configured for that plan yet." });

        const [institution] = await db.select({
          id: cushVerifyInstitutions.id,
          legalName: cushVerifyInstitutions.legalName,
          tradingName: cushVerifyInstitutions.tradingName,
        }).from(cushVerifyInstitutions)
          .where(eq(cushVerifyInstitutions.id, actor.institutionId))
          .limit(1);
        if (!institution) return res.status(404).json({ error: "Organisation not found." });

        const stripe = getCushVerifyStripeClient();
        let [billingAccount] = await db.select().from(cushVerifyBillingAccounts)
          .where(eq(cushVerifyBillingAccounts.institutionId, actor.institutionId))
          .limit(1);
        if (!billingAccount?.stripeCustomerId) {
          const customer = await stripe.customers.create({
            name: institution.tradingName || institution.legalName,
            metadata: {
              cush_verify_institution_id: String(actor.institutionId),
              cush_verify_account: "institutional",
            },
          }, { idempotencyKey: `cush-verify-customer-${actor.institutionId}` });
          await db.insert(cushVerifyBillingAccounts).values({
            institutionId: actor.institutionId,
            stripeCustomerId: customer.id,
          }).onConflictDoUpdate({
            target: cushVerifyBillingAccounts.institutionId,
            set: { stripeCustomerId: customer.id, updatedAt: new Date() },
          });
          [billingAccount] = await db.select().from(cushVerifyBillingAccounts)
            .where(eq(cushVerifyBillingAccounts.institutionId, actor.institutionId))
            .limit(1);
        }
        if (!billingAccount?.stripeCustomerId) {
          return res.status(503).json({ error: "A billing customer could not be prepared." });
        }

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: billingAccount.stripeCustomerId,
          client_reference_id: String(actor.institutionId),
          line_items: [{ price: mapping.stripePriceId, quantity: 1 }],
          success_url: `${origin}/verify/workspace?billing=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/verify/workspace?billing=cancel`,
          subscription_data: {
            metadata: {
              cush_verify: "true",
              cush_verify_institution_id: String(actor.institutionId),
              cush_verify_pricing_version: String(version.id),
              cush_verify_plan_key: plan.planKey,
              cush_verify_billing_interval: parsed.data.interval,
            },
          },
          metadata: {
            cush_verify: "true",
            cush_verify_institution_id: String(actor.institutionId),
            cush_verify_plan_key: plan.planKey,
          },
        });
        if (!session.url) return res.status(502).json({ error: "Stripe did not return a checkout link." });
        return res.json({ url: session.url });
      } catch (error) {
        if (schemaUnavailable(error, res)) return;
        if (error instanceof CushVerifyStripeUnavailableError) {
          return res.status(503).json({ error: "Online billing is not enabled for this environment." });
        }
        console.error("Cush Verify checkout creation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(502).json({ error: "Checkout could not be started. Try again later." });
      }
    },
  );

  app.post(
    "/api/verify/billing/portal",
    isInstitutionalAuthenticated,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      try {
        const actor = await getInstitutionActor(req);
        if (!actor) return res.status(403).json({ error: "Your organisation membership is not active." });
        if (!requireOrganisationAdmin(actor.role)) {
          return res.status(403).json({ error: "Only an organisation administrator can change billing." });
        }
        const origin = requestOrigin(req);
        if (!origin) return res.status(403).json({ error: "The billing return address is not allowed." });
        if (!getCushVerifyStripeReadiness().enabled) {
          return res.status(503).json({ error: "Online billing is not enabled for this environment." });
        }
        const [account] = await db.select().from(cushVerifyBillingAccounts)
          .where(eq(cushVerifyBillingAccounts.institutionId, actor.institutionId))
          .limit(1);
        if (!account?.stripeCustomerId) {
          return res.status(404).json({ error: "This organisation does not have a billing account yet." });
        }
        const portal = await getCushVerifyStripeClient().billingPortal.sessions.create({
          customer: account.stripeCustomerId,
          return_url: `${origin}/verify/workspace?billing=returned`,
        });
        return res.json({ url: portal.url });
      } catch (error) {
        if (schemaUnavailable(error, res)) return;
        if (error instanceof CushVerifyStripeUnavailableError) {
          return res.status(503).json({ error: "Online billing is not enabled for this environment." });
        }
        console.error("Cush Verify billing portal creation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(502).json({ error: "Billing settings could not be opened." });
      }
    },
  );

  app.get(
    "/api/admin/verify/billing/institutions",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyBillingRead),
    async (_req, res) => {
      try {
        const institutions = await db.select({
          id: cushVerifyInstitutions.id,
          legalName: cushVerifyInstitutions.legalName,
          tradingName: cushVerifyInstitutions.tradingName,
          status: cushVerifyInstitutions.status,
          availableCredits: cushVerifyBillingAccounts.availableCredits,
          stripeCustomerId: cushVerifyBillingAccounts.stripeCustomerId,
        })
          .from(cushVerifyInstitutions)
          .leftJoin(cushVerifyBillingAccounts, eq(cushVerifyBillingAccounts.institutionId, cushVerifyInstitutions.id))
          .orderBy(desc(cushVerifyInstitutions.createdAt))
          .limit(250);
        const institutionIds = institutions.map((institution) => institution.id);
        const subscriptions = institutionIds.length
          ? await db.select().from(cushVerifySubscriptions)
              .where(inArray(cushVerifySubscriptions.institutionId, institutionIds))
              .orderBy(desc(cushVerifySubscriptions.updatedAt))
          : [];
        const latestSubscription = new Map<number, typeof subscriptions[number]>();
        for (const subscription of subscriptions) {
          if (!latestSubscription.has(subscription.institutionId)) {
            latestSubscription.set(subscription.institutionId, subscription);
          }
        }
        return res.json({
          institutions: institutions.map((row) => {
            const subscription = latestSubscription.get(row.id);
            return ({
            id: row.id,
            name: row.tradingName || row.legalName,
            institutionStatus: row.status,
            availableCredits: row.availableCredits ?? 0,
            hasStripeCustomer: Boolean(row.stripeCustomerId),
            planKey: subscription?.planKey ?? null,
            subscriptionStatus: subscription?.status ?? null,
            subscriptionUpdatedAt: subscription?.updatedAt.toISOString() ?? null,
          });}),
        });
      } catch (error) {
        if (schemaUnavailable(error, res)) return;
        console.error("Admin Cush Verify billing directory failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Billing directory could not be loaded." });
      }
    },
  );

  app.get(
    "/api/admin/verify/billing/institutions/:institutionId/ledger",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyBillingRead),
    async (req, res) => {
      const institutionId = toAdminInstitutionId(req.params.institutionId);
      if (!institutionId) return res.status(400).json({ error: "The organisation ID is invalid." });
      try {
        const [account] = await db.select({
          availableCredits: cushVerifyBillingAccounts.availableCredits,
        }).from(cushVerifyBillingAccounts)
          .where(eq(cushVerifyBillingAccounts.institutionId, institutionId))
          .limit(1);
        const ledger = await db.select({
          id: cushVerifyCreditLedger.id,
          type: cushVerifyCreditLedger.entryType,
          creditDelta: cushVerifyCreditLedger.creditDelta,
          amountMinor: cushVerifyCreditLedger.amountMinor,
          currency: cushVerifyCreditLedger.currency,
          createdAt: cushVerifyCreditLedger.createdAt,
          details: cushVerifyCreditLedger.details,
        }).from(cushVerifyCreditLedger)
          .where(eq(cushVerifyCreditLedger.institutionId, institutionId))
          .orderBy(desc(cushVerifyCreditLedger.createdAt))
          .limit(100);
        return res.json({
          availableCredits: account?.availableCredits ?? 0,
          ledger: ledger.map((entry) => ({
            ...entry,
            createdAt: entry.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        if (schemaUnavailable(error, res)) return;
        console.error("Admin Cush Verify billing ledger failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "The billing ledger could not be loaded." });
      }
    },
  );

  app.post(
    "/api/admin/verify/billing/institutions/:institutionId/adjustments",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyBillingManage),
    requireTrustedAdminOrigin,
    async (req: AuthenticatedRequest, res) => {
      const institutionId = toAdminInstitutionId(req.params.institutionId);
      const parsed = adjustmentSchema.safeParse(req.body);
      if (!institutionId || !parsed.success) {
        return res.status(400).json({ error: "The credit adjustment is invalid." });
      }
      if (parsed.data.kind === "promotional_credit" && parsed.data.creditDelta <= 0) {
        return res.status(400).json({ error: "Promotional credits must be a positive amount." });
      }

      try {
        const result = await db.transaction(async (tx) => {
          await tx.insert(cushVerifyBillingAccounts).values({
            institutionId,
            stripeCustomerId: null,
          }).onConflictDoNothing();
          const [account] = await tx.select().from(cushVerifyBillingAccounts)
            .where(eq(cushVerifyBillingAccounts.institutionId, institutionId))
            .for("update")
            .limit(1);
          if (!account) return { status: 404 as const };
          const idempotencyKey = `admin-adjustment:${institutionId}:${parsed.data.requestId}`;
          const [existing] = await tx.select({ id: cushVerifyCreditLedger.id })
            .from(cushVerifyCreditLedger)
            .where(eq(cushVerifyCreditLedger.idempotencyKey, idempotencyKey))
            .limit(1);
          if (existing) return { status: 200 as const, ledgerId: existing.id, balance: account.availableCredits };
          const newBalance = account.availableCredits + parsed.data.creditDelta;
          if (newBalance < 0) return { status: 409 as const };

          const [entry] = await tx.insert(cushVerifyCreditLedger).values({
            institutionId,
            entryType: parsed.data.kind,
            creditDelta: parsed.data.creditDelta,
            idempotencyKey,
            createdByAdminUserId: req.userId!,
            details: { reason: parsed.data.reason },
          }).returning({ id: cushVerifyCreditLedger.id });
          await tx.update(cushVerifyBillingAccounts).set({
            availableCredits: newBalance,
            updatedAt: new Date(),
          }).where(eq(cushVerifyBillingAccounts.institutionId, institutionId));
          return { status: 201 as const, ledgerId: entry.id, balance: newBalance };
        });
        if (result.status === 404) return res.status(404).json({ error: "Organisation not found." });
        if (result.status === 409) return res.status(409).json({ error: "This adjustment would make the credit balance negative." });
        if (result.status === 201) {
          await recordAdminAuditEventAfterCommit(req, {
            action: parsed.data.kind === "promotional_credit"
              ? "admin.cush_verify.billing.promotional_credit"
              : "admin.cush_verify.billing.credit_adjustment",
            resourceType: "cush_verify_billing_account",
            resourceId: String(institutionId),
          });
        }
        return res.status(result.status).json({
          success: true,
          ledgerId: result.ledgerId,
          availableCredits: result.balance,
        });
      } catch (error) {
        if (schemaUnavailable(error, res)) return;
        console.error("Admin Cush Verify credit adjustment failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "The credit adjustment could not be recorded." });
      }
    },
  );

  app.post(
    "/api/admin/verify/billing/ledger/:entryId/reverse",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyBillingManage),
    requireTrustedAdminOrigin,
    async (req: AuthenticatedRequest, res) => {
      const ledgerId = toAdminInstitutionId(req.params.entryId);
      const parsed = reversalSchema.safeParse(req.body);
      if (!ledgerId || !parsed.success) {
        return res.status(400).json({ error: "The reversal request is invalid." });
      }
      try {
        const result = await db.transaction(async (tx) => {
          const [original] = await tx.select().from(cushVerifyCreditLedger)
            .where(eq(cushVerifyCreditLedger.id, ledgerId))
            .for("update")
            .limit(1);
          if (!original || original.entryType === "reversal") return { status: 404 as const };
          if (original.amountMinor !== null) return { status: 422 as const };
          const idempotencyKey = `admin-reversal:${original.id}`;
          const [existing] = await tx.select({ id: cushVerifyCreditLedger.id })
            .from(cushVerifyCreditLedger)
            .where(eq(cushVerifyCreditLedger.idempotencyKey, idempotencyKey))
            .limit(1);
          if (existing) return { status: 409 as const };
          const [account] = await tx.select().from(cushVerifyBillingAccounts)
            .where(eq(cushVerifyBillingAccounts.institutionId, original.institutionId))
            .for("update")
            .limit(1);
          if (!account) return { status: 404 as const };
          const creditDelta = -original.creditDelta;
          const newBalance = account.availableCredits + creditDelta;
          if (newBalance < 0) return { status: 409 as const };
          const [entry] = await tx.insert(cushVerifyCreditLedger).values({
            institutionId: original.institutionId,
            subscriptionId: original.subscriptionId,
            entryType: "reversal",
            creditDelta,
            amountMinor: original.amountMinor === null ? null : -original.amountMinor,
            currency: original.currency,
            idempotencyKey,
            createdByAdminUserId: req.userId!,
            details: {
              reversesLedgerId: original.id,
              reason: parsed.data.reason,
            },
          }).returning({ id: cushVerifyCreditLedger.id });
          await tx.update(cushVerifyBillingAccounts).set({
            availableCredits: newBalance,
            updatedAt: new Date(),
          }).where(eq(cushVerifyBillingAccounts.institutionId, original.institutionId));
          return { status: 201 as const, ledgerId: entry.id, balance: newBalance };
        });
        if (result.status === 404) return res.status(404).json({ error: "Ledger entry or account not found." });
        if (result.status === 409) return res.status(409).json({ error: "This entry is already reversed or the reversal would make the balance negative." });
        if (result.status === 422) return res.status(422).json({ error: "Monetary charges require a Stripe refund; this action reverses credit entries only." });
        if (result.status === 201) {
          await recordAdminAuditEventAfterCommit(req, {
            action: "admin.cush_verify.billing.ledger_reversal",
            resourceType: "cush_verify_credit_ledger",
            resourceId: String(ledgerId),
          });
        }
        return res.status(result.status).json({
          success: true,
          ledgerId: result.ledgerId,
          availableCredits: result.balance,
        });
      } catch (error) {
        if (schemaUnavailable(error, res)) return;
        console.error("Admin Cush Verify ledger reversal failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "The ledger entry could not be reversed." });
      }
    },
  );
}
