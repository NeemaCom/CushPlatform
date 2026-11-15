import type { Express, Request, Response } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  cushVerifyPricingPlans,
  cushVerifyPricingVersions,
} from "@shared/schema";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import {
  cushVerifyPricingCatalogSchema,
  toPublicCushVerifyPricingCatalog,
  type CushVerifyPricingCatalogInput,
} from "@shared/cush-verify-pricing";
import { db } from "./db";
import {
  isAuthenticated,
  requireAdminPermission,
  requireTrustedAdminOrigin,
} from "./auth";
import { isAdminAuditTableMissing, recordAdminAuditEvent } from "./admin-audit";

const PRICING_VERSION_ADVISORY_LOCK = 1_724_913_087;
const restoreRequestSchema = z.object({
  replaceExistingDraft: z.boolean().default(false),
}).strict();
const updateDraftRequestSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
  catalog: cushVerifyPricingCatalogSchema,
}).strict();

type AdminRequest = Request & { userId?: number };
type PricingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

class PricingConflictError extends Error {}
class PricingNotFoundError extends Error {}
class PricingInputError extends Error {}

function getErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && typeof (current as { code?: unknown }).code === "string") {
      return (current as { code: string }).code;
    }
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return undefined;
}

function isPricingSchemaMissing(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code !== "42P01" && code !== "42703") return false;
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    const message = "message" in current ? String((current as { message?: unknown }).message ?? "") : "";
    if (message.toLowerCase().includes("cush_verify_pricing_")) return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

function respondToRouteError(error: unknown, res: Response, operation: string) {
  if (error instanceof PricingConflictError) {
    return res.status(409).json({ code: "PRICING_VERSION_CONFLICT", error: error.message });
  }
  if (error instanceof PricingNotFoundError) {
    return res.status(404).json({ code: "PRICING_VERSION_NOT_FOUND", error: error.message });
  }
  if (error instanceof PricingInputError) {
    return res.status(400).json({ code: "INVALID_PRICING_CATALOG", error: error.message });
  }
  if (isPricingSchemaMissing(error)) {
    return res.status(503).json({
      code: "CUSH_VERIFY_PRICING_SCHEMA_MISSING",
      error: "Cush Verify pricing storage is not set up yet. Apply the provided Supabase migration first.",
    });
  }
  if (isAdminAuditTableMissing(error)) {
    return res.status(503).json({
      code: "ADMIN_AUDIT_SCHEMA_MISSING",
      error: "Admin audit storage is not available. Pricing changes were not saved.",
    });
  }
  console.error(`${operation}:`, error);
  return res.status(500).json({ error: "Unable to complete the pricing request." });
}

function toPlanInsertValues(
  versionId: number,
  plan: CushVerifyPricingCatalogInput["plans"][number],
) {
  return {
    versionId,
    planKey: plan.planKey,
    name: plan.name,
    description: plan.description,
    currency: plan.currency,
    monthlyPriceMinor: plan.monthlyPriceMinor,
    includedReports: plan.includedReports,
    allocationMode: plan.allocationMode,
    additionalReportPriceMinor: plan.additionalReportPriceMinor,
    salesMode: plan.salesMode,
    isActive: plan.isActive,
    isArchived: plan.isArchived,
    featureFlags: plan.featureFlags,
    apiLimits: plan.apiLimits,
    supportLevel: plan.supportLevel,
  };
}

function toAdminVersion(
  version: typeof cushVerifyPricingVersions.$inferSelect,
  plans: Array<typeof cushVerifyPricingPlans.$inferSelect>,
) {
  return {
    id: version.id,
    version: version.version,
    status: version.status,
    defaultCurrency: version.defaultCurrency,
    annualDiscountBps: version.annualDiscountBps,
    faqs: version.faqItems,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    publishedAt: version.publishedAt,
    createdBy: version.createdBy,
    publishedBy: version.publishedBy,
    plans: plans.map((plan) => ({
      planKey: plan.planKey,
      name: plan.name,
      description: plan.description,
      currency: plan.currency,
      monthlyPriceMinor: plan.monthlyPriceMinor,
      includedReports: plan.includedReports,
      allocationMode: plan.allocationMode,
      additionalReportPriceMinor: plan.additionalReportPriceMinor,
      salesMode: plan.salesMode,
      isActive: plan.isActive,
      isArchived: plan.isArchived,
      featureFlags: plan.featureFlags,
      apiLimits: plan.apiLimits,
      supportLevel: plan.supportLevel,
    })),
  };
}

async function lockPricingVersions(transaction: PricingTransaction) {
  await transaction.execute(sql`SELECT pg_advisory_xact_lock(${PRICING_VERSION_ADVISORY_LOCK})`);
}

async function createDraftFromVersion(
  transaction: PricingTransaction,
  source: typeof cushVerifyPricingVersions.$inferSelect,
  sourcePlans: Array<typeof cushVerifyPricingPlans.$inferSelect>,
  userId: number,
) {
  const [latest] = await transaction
    .select({ version: sql<number>`coalesce(max(${cushVerifyPricingVersions.version}), 0)` })
    .from(cushVerifyPricingVersions);
  const [created] = await transaction.insert(cushVerifyPricingVersions).values({
    version: Number(latest?.version ?? 0) + 1,
    status: "draft",
    defaultCurrency: source.defaultCurrency,
    annualDiscountBps: source.annualDiscountBps,
    faqItems: source.faqItems,
    createdBy: userId,
    updatedAt: new Date(),
  }).returning();
  if (!created) throw new Error("Could not create a pricing draft.");

  if (sourcePlans.length) {
    await transaction.insert(cushVerifyPricingPlans).values(
      sourcePlans.map((plan) => ({
        versionId: created.id,
        planKey: plan.planKey,
        name: plan.name,
        description: plan.description,
        currency: plan.currency,
        monthlyPriceMinor: plan.monthlyPriceMinor,
        includedReports: plan.includedReports,
        allocationMode: plan.allocationMode,
        additionalReportPriceMinor: plan.additionalReportPriceMinor,
        salesMode: plan.salesMode,
        isActive: plan.isActive,
        isArchived: plan.isArchived,
        featureFlags: plan.featureFlags,
        apiLimits: plan.apiLimits,
        supportLevel: plan.supportLevel,
      })),
    );
  }
  return created;
}

export function registerCushVerifyPricingRoutes(app: Express) {
  app.get("/api/verify/pricing", async (_req, res) => {
    try {
      const [published] = await db.select().from(cushVerifyPricingVersions)
        .where(eq(cushVerifyPricingVersions.status, "published"))
        .limit(1);
      if (!published) {
        return res.status(503).json({
          code: "CUSH_VERIFY_PRICING_NOT_PUBLISHED",
          error: "Cush Verify pricing has not been published yet.",
        });
      }
      const plans = await db.select().from(cushVerifyPricingPlans)
        .where(eq(cushVerifyPricingPlans.versionId, published.id));
      const catalog = toPublicCushVerifyPricingCatalog(published, plans);
      if (!catalog.plans.length) {
        return res.status(503).json({
          code: "CUSH_VERIFY_PRICING_NOT_CONFIGURED",
          error: "The published Cush Verify pricing catalog has no active plans.",
        });
      }
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return res.json({
        ...catalog,
        availability: "pricing_preview",
        checkoutEnabled: false,
      });
    } catch (error) {
      return respondToRouteError(error, res, "GET public Cush Verify pricing");
    }
  });

  app.get(
    "/api/admin/verify/pricing",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyPricingRead),
    async (_req, res) => {
      try {
        const versions = await db.select().from(cushVerifyPricingVersions)
          .orderBy(desc(cushVerifyPricingVersions.version))
          .limit(25);
        const versionIds = versions.map((version) => version.id);
        const plans = versionIds.length
          ? await db.select().from(cushVerifyPricingPlans)
            .where(inArray(cushVerifyPricingPlans.versionId, versionIds))
          : [];
        const plansByVersion = new Map<number, Array<typeof cushVerifyPricingPlans.$inferSelect>>();
        for (const plan of plans) {
          const versionPlans = plansByVersion.get(plan.versionId) ?? [];
          versionPlans.push(plan);
          plansByVersion.set(plan.versionId, versionPlans);
        }
        const published = versions.find((version) => version.status === "published");
        const draft = versions.find((version) => version.status === "draft");
        const serialize = (version: typeof cushVerifyPricingVersions.$inferSelect) =>
          toAdminVersion(version, plansByVersion.get(version.id) ?? []);
        return res.json({
          published: published ? serialize(published) : null,
          draft: draft ? serialize(draft) : null,
          history: versions
            .filter((version) => version.status !== "draft")
            .map((version) => ({
              id: version.id,
              version: version.version,
              status: version.status,
              createdAt: version.createdAt,
              updatedAt: version.updatedAt,
              publishedAt: version.publishedAt,
              defaultCurrency: version.defaultCurrency,
              annualDiscountBps: version.annualDiscountBps,
              faqs: version.faqItems,
              planCount: plansByVersion.get(version.id)?.length ?? 0,
              plans: (plansByVersion.get(version.id) ?? []).map((plan) => ({
                planKey: plan.planKey,
                name: plan.name,
                description: plan.description,
                currency: plan.currency,
                monthlyPriceMinor: plan.monthlyPriceMinor,
                includedReports: plan.includedReports,
                allocationMode: plan.allocationMode,
                additionalReportPriceMinor: plan.additionalReportPriceMinor,
                salesMode: plan.salesMode,
                isActive: plan.isActive,
                isArchived: plan.isArchived,
                featureFlags: plan.featureFlags,
                apiLimits: plan.apiLimits,
                supportLevel: plan.supportLevel,
              })),
            })),
        });
      } catch (error) {
        return respondToRouteError(error, res, "GET admin Cush Verify pricing");
      }
    },
  );

  app.post(
    "/api/admin/verify/pricing/draft",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyPricingManage),
    requireTrustedAdminOrigin,
    async (req: AdminRequest, res) => {
      try {
        const created = await db.transaction(async (transaction) => {
          await lockPricingVersions(transaction);
          const [existingDraft] = await transaction.select().from(cushVerifyPricingVersions)
            .where(eq(cushVerifyPricingVersions.status, "draft"))
            .limit(1);
          if (existingDraft) {
            throw new PricingConflictError("A pricing draft already exists. Edit or publish the current draft first.");
          }
          const [published] = await transaction.select().from(cushVerifyPricingVersions)
            .where(eq(cushVerifyPricingVersions.status, "published"))
            .limit(1);
          if (!published) throw new PricingNotFoundError("Publish an initial pricing catalog before creating a draft.");
          const publishedPlans = await transaction.select().from(cushVerifyPricingPlans)
            .where(eq(cushVerifyPricingPlans.versionId, published.id));
          const draft = await createDraftFromVersion(
            transaction,
            published,
            publishedPlans,
            req.userId!,
          );
          await recordAdminAuditEvent(req, {
            action: "admin.cush_verify.pricing.draft_created",
            resourceType: "cush_verify_pricing_version",
            resourceId: draft.id,
          }, transaction);
          return { id: draft.id, version: draft.version };
        });
        return res.status(201).json(created);
      } catch (error) {
        return respondToRouteError(error, res, "Create Cush Verify pricing draft");
      }
    },
  );

  app.put(
    "/api/admin/verify/pricing/draft",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyPricingManage),
    requireTrustedAdminOrigin,
    async (req: AdminRequest, res) => {
      const parsed = updateDraftRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          code: "INVALID_PRICING_CATALOG",
          error: parsed.error.issues[0]?.message ?? "Invalid pricing draft.",
        });
      }
      try {
        const saved = await db.transaction(async (transaction) => {
          await lockPricingVersions(transaction);
          const [draft] = await transaction.select().from(cushVerifyPricingVersions)
            .where(eq(cushVerifyPricingVersions.status, "draft"))
            .limit(1);
          if (!draft) throw new PricingNotFoundError("No pricing draft exists to update.");
          if (draft.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
            throw new PricingConflictError("The draft changed since you loaded it. Reload the latest version before saving.");
          }
          const updatedAt = new Date(Math.max(Date.now(), draft.updatedAt.getTime() + 1));
          await transaction.delete(cushVerifyPricingPlans)
            .where(eq(cushVerifyPricingPlans.versionId, draft.id));
          await transaction.insert(cushVerifyPricingPlans).values(
            parsed.data.catalog.plans.map((plan) => toPlanInsertValues(draft.id, plan)),
          );
          const [updated] = await transaction.update(cushVerifyPricingVersions)
            .set({
              defaultCurrency: parsed.data.catalog.defaultCurrency,
              annualDiscountBps: parsed.data.catalog.annualDiscountBps,
              faqItems: parsed.data.catalog.faqs,
              updatedAt,
            })
            .where(and(
              eq(cushVerifyPricingVersions.id, draft.id),
              eq(cushVerifyPricingVersions.status, "draft"),
            ))
            .returning();
          if (!updated) throw new PricingConflictError("The draft changed before it could be saved.");
          await recordAdminAuditEvent(req, {
            action: "admin.cush_verify.pricing.draft_updated",
            resourceType: "cush_verify_pricing_version",
            resourceId: draft.id,
          }, transaction);
          const savedPlans = await transaction.select().from(cushVerifyPricingPlans)
            .where(eq(cushVerifyPricingPlans.versionId, draft.id));
          return toAdminVersion(updated, savedPlans);
        });
        return res.json(saved);
      } catch (error) {
        return respondToRouteError(error, res, "Save Cush Verify pricing draft");
      }
    },
  );

  app.post(
    "/api/admin/verify/pricing/draft/publish",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyPricingManage),
    requireTrustedAdminOrigin,
    async (req: AdminRequest, res) => {
      try {
        const published = await db.transaction(async (transaction) => {
          await lockPricingVersions(transaction);
          const [draft] = await transaction.select().from(cushVerifyPricingVersions)
            .where(eq(cushVerifyPricingVersions.status, "draft"))
            .limit(1);
          if (!draft) throw new PricingNotFoundError("No pricing draft exists to publish.");
          const planRows = await transaction.select().from(cushVerifyPricingPlans)
            .where(eq(cushVerifyPricingPlans.versionId, draft.id));
          const validated = cushVerifyPricingCatalogSchema.safeParse({
            defaultCurrency: draft.defaultCurrency,
            annualDiscountBps: draft.annualDiscountBps,
            faqs: draft.faqItems,
            plans: planRows.map((plan) => ({
              planKey: plan.planKey,
              name: plan.name,
              description: plan.description,
              currency: plan.currency,
              monthlyPriceMinor: plan.monthlyPriceMinor,
              includedReports: plan.includedReports,
              allocationMode: plan.allocationMode,
              additionalReportPriceMinor: plan.additionalReportPriceMinor,
              salesMode: plan.salesMode,
              isActive: plan.isActive,
              isArchived: plan.isArchived,
              featureFlags: plan.featureFlags,
              apiLimits: plan.apiLimits,
              supportLevel: plan.supportLevel,
            })),
          });
          if (!validated.success) {
            throw new PricingInputError(validated.error.issues[0]?.message ?? "The saved draft is invalid.");
          }
          const now = new Date();
          await transaction.update(cushVerifyPricingVersions)
            .set({ status: "superseded", updatedAt: now })
            .where(eq(cushVerifyPricingVersions.status, "published"));
          const [activated] = await transaction.update(cushVerifyPricingVersions)
            .set({
              status: "published",
              publishedBy: req.userId!,
              publishedAt: now,
              updatedAt: now,
            })
            .where(and(
              eq(cushVerifyPricingVersions.id, draft.id),
              eq(cushVerifyPricingVersions.status, "draft"),
            ))
            .returning();
          if (!activated) throw new PricingConflictError("The draft changed before it could be published.");
          await recordAdminAuditEvent(req, {
            action: "admin.cush_verify.pricing.published",
            resourceType: "cush_verify_pricing_version",
            resourceId: activated.id,
          }, transaction);
          return { id: activated.id, version: activated.version, publishedAt: activated.publishedAt };
        });
        return res.json(published);
      } catch (error) {
        return respondToRouteError(error, res, "Publish Cush Verify pricing");
      }
    },
  );

  app.post(
    "/api/admin/verify/pricing/versions/:id/restore",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verifyPricingManage),
    requireTrustedAdminOrigin,
    async (req: AdminRequest, res) => {
      const versionId = Number(req.params.id);
      if (!Number.isSafeInteger(versionId) || versionId < 1) {
        return res.status(400).json({ error: "Invalid pricing version ID." });
      }
      const request = restoreRequestSchema.safeParse(req.body ?? {});
      if (!request.success) {
        return res.status(400).json({ error: "Invalid restore request." });
      }
      try {
        const restored = await db.transaction(async (transaction) => {
          await lockPricingVersions(transaction);
          const [source] = await transaction.select().from(cushVerifyPricingVersions)
            .where(eq(cushVerifyPricingVersions.id, versionId))
            .limit(1);
          if (!source || source.status === "draft" || source.status === "abandoned") {
            throw new PricingNotFoundError("Choose a published pricing version to restore.");
          }
          const [existingDraft] = await transaction.select().from(cushVerifyPricingVersions)
            .where(eq(cushVerifyPricingVersions.status, "draft"))
            .limit(1);
          if (existingDraft && !request.data.replaceExistingDraft) {
            throw new PricingConflictError("A draft already exists. Confirm replacement before restoring an older version.");
          }
          if (existingDraft) {
            await transaction.update(cushVerifyPricingVersions)
              .set({ status: "abandoned", updatedAt: new Date() })
              .where(and(
                eq(cushVerifyPricingVersions.id, existingDraft.id),
                eq(cushVerifyPricingVersions.status, "draft"),
              ));
          }
          const sourcePlans = await transaction.select().from(cushVerifyPricingPlans)
            .where(eq(cushVerifyPricingPlans.versionId, source.id));
          const draft = await createDraftFromVersion(
            transaction,
            source,
            sourcePlans,
            req.userId!,
          );
          await recordAdminAuditEvent(req, {
            action: "admin.cush_verify.pricing.restored_as_draft",
            resourceType: "cush_verify_pricing_version",
            resourceId: draft.id,
          }, transaction);
          return { id: draft.id, version: draft.version, restoredFromVersion: source.version };
        });
        return res.status(201).json(restored);
      } catch (error) {
        return respondToRouteError(error, res, "Restore Cush Verify pricing version");
      }
    },
  );
}
