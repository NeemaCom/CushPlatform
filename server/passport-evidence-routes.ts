import express, { type Express, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  cushPassportEvidenceEvents,
  cushPassportEvidenceSubmissions,
  cushPassportFinancialProfiles,
  cushPassportPostArrivalFinancialProfiles,
  cushPostArrivalProfiles,
  users,
} from "@shared/schema";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import {
  isAuthenticated,
  requireAdminPermission,
  requireTrustedAdminOrigin,
  type AuthenticatedRequest,
} from "./auth";
import { db } from "./db";
import { generalRateLimit } from "./security";
import { detectCurrenciesInText, listIsoCurrencies } from "./currency-catalog";
import {
  decryptEvidenceBytes,
  decryptEvidenceJson,
  encryptEvidenceBytes,
  encryptEvidenceJson,
  EvidenceEncryptionUnavailableError,
  evidenceDraftCorrectionSchema,
  evidenceReviewSchema,
  evidenceUploadMetadataSchema,
  extractEvidenceDraft,
  getFinancialProfileProgress,
  MAX_EVIDENCE_FILE_BYTES,
  passportFinancialProfileSchema,
  validatePassportFinancialProfilePeriod,
} from "./passport-evidence-service";

const storedReviewSchema = z.object({
  notes: z.string(),
  reviewBasis: z.string(),
});

type EvidenceExecutor = Pick<typeof db, "insert">;
type IntakePeriod = "pre_arrival" | "post_arrival";

const intakePeriodSchema = z.enum(["pre_arrival", "post_arrival"]);

function parseIntakePeriod(value: unknown): IntakePeriod | null {
  const parsed = intakePeriodSchema.safeParse(value ?? "pre_arrival");
  return parsed.success ? parsed.data : null;
}

async function getConfirmedArrivalDate(userId: number): Promise<string | null> {
  const [profile] = await db.select({
    arrivalStatus: cushPostArrivalProfiles.arrivalStatus,
    arrivalDate: cushPostArrivalProfiles.arrivalDate,
  })
    .from(cushPostArrivalProfiles)
    .where(eq(cushPostArrivalProfiles.userId, userId))
    .limit(1);
  return profile?.arrivalStatus === "arrived" ? profile.arrivalDate : null;
}

function noStore(res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Pragma", "no-cache");
}

async function recordEvidenceEvent(
  executor: EvidenceExecutor,
  values: {
    submissionId?: number | null;
    userId?: number | null;
    actorUserId?: number | null;
    actorType: "user" | "admin" | "system";
    eventType: string;
    eventData?: Record<string, unknown>;
  },
) {
  await executor.insert(cushPassportEvidenceEvents).values({
    submissionId: values.submissionId ?? null,
    userId: values.userId ?? null,
    actorUserId: values.actorUserId ?? null,
    actorType: values.actorType,
    eventType: values.eventType,
    eventData: values.eventData ?? {},
  });
}

function documentMetadata(row: typeof cushPassportEvidenceSubmissions.$inferSelect) {
  return {
    id: row.id,
    period: row.period as IntakePeriod,
    documentType: row.documentType,
    label: row.label,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    countryCode: row.countryCode,
    currencyCode: row.currencyCode,
    reviewStatus: row.reviewStatus,
    evidenceClassification: row.evidenceClassification,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sendEvidenceError(res: Response, error: unknown, fallback: string) {
  if (error instanceof EvidenceEncryptionUnavailableError) {
    return res.status(503).json({
      code: "PASSPORT_EVIDENCE_ENCRYPTION_NOT_CONFIGURED",
      error: "Secure document storage is not configured. Please contact Cush support.",
    });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message ?? "Invalid evidence details." });
  }
  if (error && typeof error === "object" && "code" in error &&
      ["42P01", "42703"].includes(String((error as { code?: unknown }).code))) {
    return res.status(503).json({
      code: "PASSPORT_EVIDENCE_SCHEMA_MISSING",
      error: "Secure evidence storage is not ready. Apply the initial Passport evidence migration, then migrations/manual/extend-cush-passport-multicurrency.sql.",
    });
  }
  console.error(fallback, {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  return res.status(500).json({ error: "The evidence request could not be completed." });
}

function validId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function safeDownloadName(fileName: string): string {
  return fileName.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "evidence-document";
}

function sendEncryptedFile(
  res: Response,
  row: typeof cushPassportEvidenceSubmissions.$inferSelect,
) {
  const bytes = decryptEvidenceBytes(row.encryptedFile);
  res.setHeader("Content-Type", row.mimeType);
  res.setHeader("Content-Length", bytes.length);
  res.setHeader("Content-Disposition", `attachment; filename="${safeDownloadName(row.fileName)}"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(bytes);
}

export function registerPassportEvidenceRoutes(app: Express) {
  app.get("/api/passport/currencies", isAuthenticated, (_req: AuthenticatedRequest, res) => {
    noStore(res);
    return res.json({ currencies: listIsoCurrencies() });
  });

  app.get("/api/passport/financial-profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const period = parseIntakePeriod(req.query.period);
    if (!period) return res.status(400).json({ error: "Choose pre-arrival or post-arrival." });
    try {
      const arrivalDate = period === "post_arrival"
        ? await getConfirmedArrivalDate(req.userId!)
        : null;
      if (period === "post_arrival" && !arrivalDate) {
        return res.status(409).json({ error: "Confirm your arrival before adding post-arrival financial details." });
      }
      const [row] = period === "pre_arrival"
        ? await db.select().from(cushPassportFinancialProfiles)
          .where(eq(cushPassportFinancialProfiles.userId, req.userId!)).limit(1)
        : await db.select().from(cushPassportPostArrivalFinancialProfiles)
          .where(eq(cushPassportPostArrivalFinancialProfiles.userId, req.userId!)).limit(1);
      const profile = row
        ? passportFinancialProfileSchema.parse(decryptEvidenceJson<unknown>(row.encryptedProfile))
        : null;
      return res.json({
        period,
        arrivalDate,
        profile,
        progress: getFinancialProfileProgress(profile),
        updatedAt: row?.updatedAt.toISOString() ?? null,
      });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport financial profile read failed");
    }
  });

  app.put("/api/passport/financial-profile", isAuthenticated, generalRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const period = parseIntakePeriod(req.query.period);
    if (!period) return res.status(400).json({ error: "Choose pre-arrival or post-arrival." });
    const parsed = passportFinancialProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Check the financial profile fields." });
    }
    try {
      const profile = parsed.data;
      const now = new Date();
      const encryptedProfile = encryptEvidenceJson(profile);
      const arrivalDate = period === "post_arrival"
        ? await getConfirmedArrivalDate(req.userId!)
        : null;
      const periodError = validatePassportFinancialProfilePeriod(profile, period, arrivalDate);
      if (periodError === "arrival_required") {
        return res.status(409).json({ error: "Confirm your arrival before adding post-arrival financial details." });
      }
      if (periodError === "history_before_arrival") {
        return res.status(400).json({ error: "Post-arrival financial history must begin in your confirmed arrival month." });
      }
      await db.transaction(async (tx) => {
        if (period === "pre_arrival") {
          await tx.insert(cushPassportFinancialProfiles).values({
            userId: req.userId!,
            countryCode: profile.countryCode,
            currencyCode: profile.currencyCode,
            encryptedProfile,
            updatedAt: now,
          }).onConflictDoUpdate({
            target: cushPassportFinancialProfiles.userId,
            set: { countryCode: profile.countryCode, currencyCode: profile.currencyCode, encryptedProfile, updatedAt: now },
          });
        } else {
          await tx.insert(cushPassportPostArrivalFinancialProfiles).values({
            userId: req.userId!,
            countryCode: profile.countryCode,
            currencyCode: profile.currencyCode,
            encryptedProfile,
            updatedAt: now,
          }).onConflictDoUpdate({
            target: cushPassportPostArrivalFinancialProfiles.userId,
            set: { countryCode: profile.countryCode, currencyCode: profile.currencyCode, encryptedProfile, updatedAt: now },
          });
        }
        await recordEvidenceEvent(tx, {
          userId: req.userId,
          actorUserId: req.userId,
          actorType: "user",
          eventType: "profile_saved",
          eventData: { period, countryCode: profile.countryCode, currencyCode: profile.currencyCode },
        });
      });
      return res.json({ period, arrivalDate, profile, progress: getFinancialProfileProgress(profile), updatedAt: now.toISOString() });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport financial profile save failed");
    }
  });

  app.delete("/api/passport/financial-profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const period = parseIntakePeriod(req.query.period);
    if (!period) return res.status(400).json({ error: "Choose pre-arrival or post-arrival." });
    try {
      if (period === "post_arrival" && !(await getConfirmedArrivalDate(req.userId!))) {
        return res.status(409).json({ error: "Confirm your arrival before changing post-arrival financial details." });
      }
      await db.transaction(async (tx) => {
        const removed = period === "pre_arrival"
          ? await tx.delete(cushPassportFinancialProfiles)
            .where(eq(cushPassportFinancialProfiles.userId, req.userId!))
            .returning({ userId: cushPassportFinancialProfiles.userId })
          : await tx.delete(cushPassportPostArrivalFinancialProfiles)
            .where(eq(cushPassportPostArrivalFinancialProfiles.userId, req.userId!))
            .returning({ userId: cushPassportPostArrivalFinancialProfiles.userId });
        if (removed.length) {
          await recordEvidenceEvent(tx, {
            userId: req.userId,
            actorUserId: req.userId,
            actorType: "user",
            eventType: "profile_deleted",
            eventData: { period },
          });
        }
      });
      return res.json({ success: true, period });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport financial profile deletion failed");
    }
  });

  app.get("/api/passport/evidence-submissions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const period = parseIntakePeriod(req.query.period);
    if (!period) return res.status(400).json({ error: "Choose pre-arrival or post-arrival." });
    try {
      const rows = await db.select().from(cushPassportEvidenceSubmissions)
        .where(and(
          eq(cushPassportEvidenceSubmissions.userId, req.userId!),
          eq(cushPassportEvidenceSubmissions.period, period),
        ))
        .orderBy(desc(cushPassportEvidenceSubmissions.createdAt));
      return res.json({ submissions: rows.map(documentMetadata) });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport evidence list failed");
    }
  });

  app.post(
    "/api/passport/evidence-submissions",
    isAuthenticated,
    generalRateLimit,
    express.raw({ type: () => true, limit: MAX_EVIDENCE_FILE_BYTES }),
    async (req: AuthenticatedRequest, res) => {
      noStore(res);
      const file = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!file.length) return res.status(400).json({ error: "Choose a non-empty PDF or CSV file." });
      if (file.length > MAX_EVIDENCE_FILE_BYTES) {
        return res.status(413).json({ error: "Files must be 5 MB or smaller." });
      }

      let fileName = "";
      try {
        fileName = decodeURIComponent(req.get("x-evidence-filename") ?? "");
      } catch {
        return res.status(400).json({ error: "The file name is invalid." });
      }
      const contentType = (req.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
      const period = parseIntakePeriod(req.get("x-evidence-period"));
      if (!period) return res.status(400).json({ error: "Choose pre-arrival or post-arrival." });
      const metadata = evidenceUploadMetadataSchema.safeParse({
        documentType: req.get("x-evidence-type"),
        label: req.get("x-evidence-label"),
        countryCode: req.get("x-country-code"),
        currencyCode: req.get("x-currency-code"),
        fileName,
      });
      if (!metadata.success) {
        return res.status(400).json({ error: metadata.error.issues[0]?.message ?? "Enter the document details." });
      }
      if (contentType !== "application/pdf" && contentType !== "text/csv") {
        return res.status(415).json({ error: "Only PDF and CSV files are supported." });
      }
      if (
        (contentType === "application/pdf" && !metadata.data.fileName.toLowerCase().endsWith(".pdf")) ||
        (contentType === "text/csv" && !metadata.data.fileName.toLowerCase().endsWith(".csv"))
      ) {
        return res.status(415).json({ error: "Choose a file whose extension matches its PDF or CSV format." });
      }

      try {
        const extraction = extractEvidenceDraft(file, contentType);
        if (period === "post_arrival" && !(await getConfirmedArrivalDate(req.userId!))) {
          return res.status(409).json({ error: "Confirm your arrival before submitting post-arrival evidence." });
        }
        const currencyDetection = detectCurrenciesInText(extraction);
        const [row] = await db.transaction(async (tx) => {
          const inserted = await tx.insert(cushPassportEvidenceSubmissions).values({
            userId: req.userId!,
            period,
            documentType: metadata.data.documentType,
            label: metadata.data.label,
            fileName: metadata.data.fileName,
            mimeType: contentType,
            fileSize: file.length,
            countryCode: metadata.data.countryCode,
            currencyCode: metadata.data.currencyCode,
            encryptedFile: encryptEvidenceBytes(file),
            encryptedExtraction: encryptEvidenceJson({
              text: extraction,
              parser: contentType === "text/csv" ? "csv-text-v1" : "pdf-text-v1",
              currencyDetection,
            }),
          }).returning();
          await recordEvidenceEvent(tx, {
            submissionId: inserted[0].id,
            userId: req.userId,
            actorUserId: req.userId,
            actorType: "user",
            eventType: "document_uploaded",
            eventData: {
              period,
              documentType: metadata.data.documentType,
              mimeType: contentType,
              fileSize: file.length,
            },
          });
          return inserted;
        });
        return res.status(201).json({
          submission: documentMetadata(row),
          extractedDraft: extraction,
          extractionStatus: extraction ? "text_extracted" : "no_text_found",
          currencyDetection,
        });
      } catch (error) {
        if (error instanceof TypeError && contentType === "text/csv") {
          return res.status(400).json({ error: "The CSV must use valid UTF-8 text." });
        }
        if (error instanceof Error && error.message.includes("decompressed content")) {
          return res.status(413).json({ error: error.message });
        }
        if (error instanceof Error && error.message.includes("valid PDF")) {
          return res.status(400).json({ error: error.message });
        }
        if (error instanceof EvidenceEncryptionUnavailableError) {
          return sendEvidenceError(res, error, "Passport evidence upload failed");
        }
        return sendEvidenceError(res, error, "Passport evidence upload failed");
      }
    },
  );

  app.get("/api/passport/evidence-submissions/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid document ID." });
    try {
      const [row] = await db.select().from(cushPassportEvidenceSubmissions).where(and(
        eq(cushPassportEvidenceSubmissions.id, id),
        eq(cushPassportEvidenceSubmissions.userId, req.userId!),
      )).limit(1);
      if (!row) return res.status(404).json({ error: "Document not found." });
      const extraction = decryptEvidenceJson<{ text: string }>(row.encryptedExtraction);
      const correction = row.encryptedCorrection
        ? decryptEvidenceJson<{ text: string }>(row.encryptedCorrection).text
        : null;
      const events = await db.select({
        eventType: cushPassportEvidenceEvents.eventType,
        createdAt: cushPassportEvidenceEvents.createdAt,
        eventData: cushPassportEvidenceEvents.eventData,
      }).from(cushPassportEvidenceEvents)
        .where(and(
          eq(cushPassportEvidenceEvents.userId, req.userId!),
          eq(cushPassportEvidenceEvents.submissionId, id),
        ))
        .orderBy(desc(cushPassportEvidenceEvents.createdAt));
      return res.json({
        submission: documentMetadata(row),
        extractedDraft: extraction.text,
        correctedDraft: correction,
        currencyDetection: detectCurrenciesInText(correction ?? extraction.text),
        events: events.map((event) => ({
          eventType: event.eventType,
          createdAt: event.createdAt.toISOString(),
          eventData: event.eventData,
        })),
      });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport evidence detail read failed");
    }
  });

  app.put("/api/passport/evidence-submissions/:id/draft", isAuthenticated, generalRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid document ID." });
    const parsed = evidenceDraftCorrectionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid correction." });
    try {
      const correction = encryptEvidenceJson({ text: parsed.data.correctedDraft });
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx.update(cushPassportEvidenceSubmissions).set({
          encryptedCorrection: correction,
          ...(parsed.data.currencyCode ? { currencyCode: parsed.data.currencyCode } : {}),
          updatedAt: new Date(),
        }).where(and(
          eq(cushPassportEvidenceSubmissions.id, id),
          eq(cushPassportEvidenceSubmissions.userId, req.userId!),
          inArray(cushPassportEvidenceSubmissions.reviewStatus, ["draft", "additional_information_required"]),
        )).returning();
        if (!row) return null;
        await recordEvidenceEvent(tx, {
          submissionId: id,
          userId: req.userId,
          actorUserId: req.userId,
          actorType: "user",
          eventType: "draft_corrected",
          eventData: {
            characters: parsed.data.correctedDraft.length,
            ...(parsed.data.currencyCode ? { currencyCode: parsed.data.currencyCode } : {}),
          },
        });
        return row;
      });
      if (!updated) return res.status(409).json({ error: "Corrections are locked after review starts." });
      return res.json({ submission: documentMetadata(updated) });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport evidence correction save failed");
    }
  });

  app.post("/api/passport/evidence-submissions/:id/submit", isAuthenticated, generalRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid document ID." });
    try {
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx.update(cushPassportEvidenceSubmissions).set({
          reviewStatus: "submitted",
          submittedAt: new Date(),
          updatedAt: new Date(),
        }).where(and(
          eq(cushPassportEvidenceSubmissions.id, id),
          eq(cushPassportEvidenceSubmissions.userId, req.userId!),
          inArray(cushPassportEvidenceSubmissions.reviewStatus, ["draft", "additional_information_required"]),
        )).returning();
        if (!row) return null;
        await recordEvidenceEvent(tx, {
          submissionId: id,
          userId: req.userId,
          actorUserId: req.userId,
          actorType: "user",
          eventType: "document_submitted",
        });
        return row;
      });
      if (!updated) return res.status(409).json({ error: "This document cannot be submitted in its current state." });
      return res.json({ submission: documentMetadata(updated) });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport evidence submission failed");
    }
  });

  app.delete("/api/passport/evidence-submissions/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid document ID." });
    try {
      const removed = await db.transaction(async (tx) => {
        const [existing] = await tx.select({
          id: cushPassportEvidenceSubmissions.id,
          reviewStatus: cushPassportEvidenceSubmissions.reviewStatus,
        }).from(cushPassportEvidenceSubmissions).where(and(
          eq(cushPassportEvidenceSubmissions.id, id),
          eq(cushPassportEvidenceSubmissions.userId, req.userId!),
        )).limit(1);
        if (!existing || !["draft", "additional_information_required", "rejected"].includes(existing.reviewStatus)) {
          return false;
        }
        await recordEvidenceEvent(tx, {
          submissionId: id,
          userId: req.userId,
          actorUserId: req.userId,
          actorType: "user",
          eventType: "document_deleted",
        });
        const [row] = await tx.delete(cushPassportEvidenceSubmissions).where(and(
          eq(cushPassportEvidenceSubmissions.id, id),
          eq(cushPassportEvidenceSubmissions.userId, req.userId!),
        )).returning({ id: cushPassportEvidenceSubmissions.id });
        return Boolean(row);
      });
      if (!removed) return res.status(409).json({ error: "A document in active review cannot be deleted." });
      return res.json({ success: true });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport evidence deletion failed");
    }
  });

  app.get("/api/passport/evidence-submissions/:id/file", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid document ID." });
    try {
      const [row] = await db.select().from(cushPassportEvidenceSubmissions).where(and(
        eq(cushPassportEvidenceSubmissions.id, id),
        eq(cushPassportEvidenceSubmissions.userId, req.userId!),
      )).limit(1);
      if (!row) return res.status(404).json({ error: "Document not found." });
      await recordEvidenceEvent(db, {
        submissionId: id,
        userId: req.userId,
        actorUserId: req.userId,
        actorType: "user",
        eventType: "document_accessed",
      });
      return sendEncryptedFile(res, row);
    } catch (error) {
      return sendEvidenceError(res, error, "Passport evidence file access failed");
    }
  });

  app.get(
    "/api/admin/passport/evidence-submissions",
    isAuthenticated,
    generalRateLimit,
    requireAdminPermission(ADMIN_PERMISSION.documentsRead),
    async (req: AuthenticatedRequest, res) => {
      noStore(res);
      try {
        const rows = await db.select({
          document: cushPassportEvidenceSubmissions,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(cushPassportEvidenceSubmissions)
          .innerJoin(users, eq(users.id, cushPassportEvidenceSubmissions.userId))
          .where(inArray(cushPassportEvidenceSubmissions.reviewStatus, [
            "submitted", "under_review", "additional_information_required", "approved", "rejected",
          ]))
          .orderBy(desc(cushPassportEvidenceSubmissions.submittedAt))
          .limit(250);
        return res.json({
          submissions: rows.map(({ document, email, firstName, lastName }) => ({
            ...documentMetadata(document),
            userId: document.userId,
            email,
            displayName: [firstName, lastName].filter(Boolean).join(" ") || "Passport user",
          })),
        });
      } catch (error) {
        return sendEvidenceError(res, error, "Admin Passport evidence queue read failed");
      }
    },
  );

  app.get(
    "/api/admin/passport/evidence-submissions/:id",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.documentsRead),
    async (req: AuthenticatedRequest, res) => {
      noStore(res);
      const id = validId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid document ID." });
      try {
        const [row] = await db.select({
          document: cushPassportEvidenceSubmissions,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(cushPassportEvidenceSubmissions)
          .innerJoin(users, eq(users.id, cushPassportEvidenceSubmissions.userId))
          .where(eq(cushPassportEvidenceSubmissions.id, id)).limit(1);
        if (!row) return res.status(404).json({ error: "Document not found." });
        const extraction = decryptEvidenceJson<{ text: string }>(row.document.encryptedExtraction);
        const correction = row.document.encryptedCorrection
          ? decryptEvidenceJson<{ text: string }>(row.document.encryptedCorrection).text
          : null;
        const review = row.document.encryptedReview
          ? storedReviewSchema.parse(decryptEvidenceJson<unknown>(row.document.encryptedReview))
          : { notes: "", reviewBasis: "" };
        await recordEvidenceEvent(db, {
          submissionId: id,
          userId: row.document.userId,
          actorUserId: req.userId,
          actorType: "admin",
          eventType: "review_opened",
        });
        const events = await db.select({
          eventType: cushPassportEvidenceEvents.eventType,
          actorType: cushPassportEvidenceEvents.actorType,
          createdAt: cushPassportEvidenceEvents.createdAt,
          eventData: cushPassportEvidenceEvents.eventData,
        }).from(cushPassportEvidenceEvents)
          .where(eq(cushPassportEvidenceEvents.submissionId, id))
          .orderBy(desc(cushPassportEvidenceEvents.createdAt));
        return res.json({
          submission: {
            ...documentMetadata(row.document),
            userId: row.document.userId,
            email: row.email,
            displayName: [row.firstName, row.lastName].filter(Boolean).join(" ") || "Passport user",
          },
          extractedDraft: extraction.text,
          correctedDraft: correction,
          currencyDetection: detectCurrenciesInText(correction ?? extraction.text),
          review,
          events: events.map((event) => ({
            eventType: event.eventType,
            actorType: event.actorType,
            createdAt: event.createdAt.toISOString(),
            eventData: event.eventData,
          })),
        });
      } catch (error) {
        return sendEvidenceError(res, error, "Admin Passport evidence detail read failed");
      }
    },
  );

  app.get(
    "/api/admin/passport/evidence-submissions/:id/file",
    isAuthenticated,
    generalRateLimit,
    requireAdminPermission(ADMIN_PERMISSION.documentsRead),
    async (req: AuthenticatedRequest, res) => {
      noStore(res);
      const id = validId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid document ID." });
      try {
        const [row] = await db.select().from(cushPassportEvidenceSubmissions)
          .where(eq(cushPassportEvidenceSubmissions.id, id)).limit(1);
        if (!row) return res.status(404).json({ error: "Document not found." });
        await recordEvidenceEvent(db, {
          submissionId: id,
          userId: row.userId,
          actorUserId: req.userId,
          actorType: "admin",
          eventType: "document_accessed",
        });
        return sendEncryptedFile(res, row);
      } catch (error) {
        return sendEvidenceError(res, error, "Admin Passport evidence file access failed");
      }
    },
  );

  app.patch(
    "/api/admin/passport/evidence-submissions/:id/review",
    isAuthenticated,
    generalRateLimit,
    requireAdminPermission(ADMIN_PERMISSION.documentsReview),
    requireTrustedAdminOrigin,
    async (req: AuthenticatedRequest, res) => {
      noStore(res);
      const id = validId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid document ID." });
      const parsed = evidenceReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Review details are invalid." });
      }
      if (parsed.data.reviewStatus === "approved" &&
          parsed.data.evidenceClassification === "self_declared") {
        return res.status(400).json({
          error: "Approved documents must be classified as document-supported or have a documented independent confirmation basis.",
        });
      }
      try {
        const updated = await db.transaction(async (tx) => {
          const [row] = await tx.update(cushPassportEvidenceSubmissions).set({
            reviewStatus: parsed.data.reviewStatus,
            evidenceClassification: parsed.data.evidenceClassification,
            encryptedReview: encryptEvidenceJson({
              notes: parsed.data.notes,
              reviewBasis: parsed.data.reviewBasis,
            }),
            reviewedAt: new Date(),
            reviewedBy: req.userId!,
            updatedAt: new Date(),
          }).where(and(
            eq(cushPassportEvidenceSubmissions.id, id),
            inArray(cushPassportEvidenceSubmissions.reviewStatus, [
              "submitted", "under_review", "additional_information_required", "approved", "rejected",
            ]),
          )).returning();
          if (!row) return null;
          await recordEvidenceEvent(tx, {
            submissionId: id,
            userId: row.userId,
            actorUserId: req.userId,
            actorType: "admin",
            eventType: "review_decided",
            eventData: {
              reviewStatus: parsed.data.reviewStatus,
              evidenceClassification: parsed.data.evidenceClassification,
            },
          });
          return row;
        });
        if (!updated) return res.status(404).json({ error: "Submitted document not found." });
        return res.json({ submission: documentMetadata(updated) });
      } catch (error) {
        return sendEvidenceError(res, error, "Admin Passport evidence review failed");
      }
    },
  );

  app.get("/api/passport/evidence-history", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    try {
      const events = await db.select({
        id: cushPassportEvidenceEvents.id,
        eventType: cushPassportEvidenceEvents.eventType,
        eventData: cushPassportEvidenceEvents.eventData,
        createdAt: cushPassportEvidenceEvents.createdAt,
      }).from(cushPassportEvidenceEvents)
        .where(eq(cushPassportEvidenceEvents.userId, req.userId!))
        .orderBy(desc(cushPassportEvidenceEvents.createdAt))
        .limit(100);
      return res.json({
        events: events.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          eventData: event.eventData,
          createdAt: event.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      return sendEvidenceError(res, error, "Passport evidence history read failed");
    }
  });
}
