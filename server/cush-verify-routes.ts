import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { desc, eq } from "drizzle-orm";
import {
  cushVerifyInstitutionInterests,
} from "@shared/schema";
import {
  cushVerifyInstitutionInterestSchema,
  cushVerifyReviewStatusSchema,
} from "@shared/cush-verify";
import { db } from "./db";
import {
  isAuthenticated,
  requireAdminPermission,
  requireTrustedAdminOrigin,
  type AuthenticatedRequest,
} from "./auth";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import { recordAdminAuditEvent } from "./admin-audit";

const publicInterestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
});

function isInterestSchemaMissing(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (typeof current === "object" && "code" in current) {
      const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
      if (
        (candidate.code === "42P01" || candidate.code === "42703") &&
        String(candidate.message ?? "").toLowerCase().includes("cush_verify_institution_interests")
      ) {
        return true;
      }
      current = candidate.cause;
      continue;
    }
    break;
  }
  return false;
}

function schemaNotReady(res: Parameters<Parameters<Express["get"]>[1]>[1]) {
  return res.status(503).json({
    code: "CUSH_VERIFY_SCHEMA_MISSING",
    error: "Institution interest registration is not available until the Cush Verify database migration is applied.",
  });
}

const confirmationMessage =
  "Your institutional interest has been received. The Cush team will be in touch.";

export function registerCushVerifyRoutes(app: Express): void {
  app.post("/api/verify/institution-interest", publicInterestRateLimit, async (req, res) => {
    const parsed = cushVerifyInstitutionInterestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Check the required fields and confirm that Cush may contact you about this request.",
      });
    }

    // Honeypot submissions receive the same confirmation without being stored.
    if (parsed.data.website) return res.status(201).json({ success: true, message: confirmationMessage });

    try {
      await db.insert(cushVerifyInstitutionInterests).values({
        institutionName: parsed.data.institutionName,
        institutionType: parsed.data.institutionType,
        contactName: parsed.data.contactName,
        jobTitle: parsed.data.jobTitle,
        email: parsed.data.email,
        country: parsed.data.country,
        intendedUse: parsed.data.intendedUse || null,
        verificationRequirements: parsed.data.verificationRequirements || null,
        preferredEngagementModel: parsed.data.preferredEngagementModel ?? null,
        contactConsentAcceptedAt: new Date(),
      });
      return res.status(201).json({ success: true, message: confirmationMessage });
    } catch (error) {
      if (isInterestSchemaMissing(error)) return schemaNotReady(res);
      console.error("Cush Verify interest submission failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(500).json({ error: "We could not save your request. Please try again later." });
    }
  });

  app.get(
    "/api/admin/cush-verify/interests",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsRead),
    async (_req, res) => {
      try {
        const interests = await db.select({
          id: cushVerifyInstitutionInterests.id,
          institutionName: cushVerifyInstitutionInterests.institutionName,
          institutionType: cushVerifyInstitutionInterests.institutionType,
          contactName: cushVerifyInstitutionInterests.contactName,
          jobTitle: cushVerifyInstitutionInterests.jobTitle,
          email: cushVerifyInstitutionInterests.email,
          country: cushVerifyInstitutionInterests.country,
          intendedUse: cushVerifyInstitutionInterests.intendedUse,
          verificationRequirements: cushVerifyInstitutionInterests.verificationRequirements,
          preferredEngagementModel: cushVerifyInstitutionInterests.preferredEngagementModel,
          contactConsentAcceptedAt: cushVerifyInstitutionInterests.contactConsentAcceptedAt,
          status: cushVerifyInstitutionInterests.status,
          reviewedAt: cushVerifyInstitutionInterests.reviewedAt,
          createdAt: cushVerifyInstitutionInterests.createdAt,
        }).from(cushVerifyInstitutionInterests)
          .orderBy(desc(cushVerifyInstitutionInterests.createdAt))
          .limit(100);
        return res.json({ interests });
      } catch (error) {
        if (isInterestSchemaMissing(error)) return schemaNotReady(res);
        console.error("Cush Verify interest queue failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to load Cush Verify interest requests." });
      }
    },
  );

  app.put(
    "/api/admin/cush-verify/interests/:id/status",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.verificationsManage),
    requireTrustedAdminOrigin,
    async (req: AuthenticatedRequest, res) => {
      const id = Number(req.params.id);
      const parsed = cushVerifyReviewStatusSchema.safeParse(req.body?.status);
      if (!Number.isSafeInteger(id) || id <= 0 || !parsed.success || parsed.data === "pending_review") {
        return res.status(400).json({ error: "Choose a valid review status." });
      }

      try {
        const updated = await db.transaction(async (tx) => {
          const [row] = await tx.update(cushVerifyInstitutionInterests).set({
            status: parsed.data,
            reviewedBy: req.userId ?? null,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(cushVerifyInstitutionInterests.id, id)).returning({
            id: cushVerifyInstitutionInterests.id,
            status: cushVerifyInstitutionInterests.status,
            reviewedAt: cushVerifyInstitutionInterests.reviewedAt,
          });
          if (!row) return undefined;
          await recordAdminAuditEvent(req, {
            action: "admin.cush_verify_interest.status_updated",
            resourceType: "cush_verify_institution_interest",
            resourceId: id,
          }, tx);
          return row;
        });
        if (!updated) return res.status(404).json({ error: "Interest request not found." });
        return res.json({ interest: updated, accessGranted: false });
      } catch (error) {
        if (isInterestSchemaMissing(error)) return schemaNotReady(res);
        console.error("Cush Verify interest review failed", {
          adminUserId: req.userId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ error: "Unable to update this interest request." });
      }
    },
  );
}
