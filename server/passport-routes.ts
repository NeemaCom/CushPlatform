/**
 * Cush Passport API routes (in-memory store)
 * All routes under /api/passport/*
 */
import type { Express } from "express";
import { z } from "zod";
import { isAuthenticated, requireAdmin, type AuthenticatedRequest } from "./auth";
import { normalizationService } from "./normalization-service";
import {
  addSignalSchema,
  addEvidenceSchema,
  updatePassportModeSchema,
} from "@shared/schema";
import * as mem from "./mem-store";
import {
  activateScoringPolicy,
  getAdminPolicyVersions,
  getV2Assessment,
  isV2SchemaMissing,
  ScoringPolicyValidationError,
  saveScoringPolicyDraft,
  saveV2Assessment,
} from "./cush-score-v2";

function applyV2Calculation<T extends mem.MemPassport>(
  passport: T,
  calculation: Awaited<ReturnType<typeof getV2Assessment>>["calculation"],
): T {
  return {
    ...passport,
    score: calculation.cushScore,
    provisionalScore: calculation.provisionalScore,
    confidenceScore: calculation.confidenceScore,
    assessmentStatus: calculation.assessmentStatus,
    algorithmVersion: calculation.algorithmVersion,
    missingRequirements: calculation.missingRequirements,
    weightedContributions: calculation.weightedContributions,
    scoreBreakdown: calculation.componentScores,
    reasonCodes: null,
    generatedAt: calculation.cushScore === null ? null : new Date(),
    lastUpdated: new Date(),
  };
}

// ─── Route Registration ──────────────────────────────────────────────────────

export function registerPassportRoutes(app: Express) {

  // GET /api/passport/me — fetch or auto-create the user's passport
  app.get("/api/passport/me", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const initialPassport = mem.getOrCreatePassport(userId);
      const storedPassport = initialPassport.lastUpdated
        ? initialPassport
        : mem.recalculatePassport(initialPassport.id, userId);
      const signals = mem.getPassportSignals(storedPassport.id);
      const evidence = mem.getPassportEvidence(storedPassport.id);
      try {
        const assessment = await getV2Assessment(userId);
        return res.json({
          passport: applyV2Calculation(storedPassport, assessment.calculation),
          signals,
          evidence,
          v2SchemaReady: true,
        });
      } catch (error) {
        if (!isV2SchemaMissing(error)) throw error;
        return res.json({ passport: storedPassport, signals, evidence, v2SchemaReady: false });
      }
    } catch (err) {
      console.error("GET /api/passport/me error:", err);
      return res.status(500).json({ error: "Failed to fetch passport" });
    }
  });

  // GET /api/passport/v2 — private, owner-scoped V2 inputs and current calculation.
  app.get("/api/passport/v2", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      return res.json(await getV2Assessment(req.userId!));
    } catch (error) {
      if (isV2SchemaMissing(error)) {
        return res.status(503).json({
          code: "V2_SCHEMA_MISSING",
          error: "V2 assessment storage is not set up yet. Apply the provided Supabase migration first.",
        });
      }
      console.error("GET /api/passport/v2 error:", error);
      return res.status(500).json({ error: "Failed to load V2 assessment" });
    }
  });

  // PUT /api/passport/v2 — replace the owner's validated GBP-only V2 inputs.
  app.put("/api/passport/v2", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      return res.json(await saveV2Assessment(req.userId!, req.body));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid V2 assessment input." });
      }
      if (isV2SchemaMissing(error)) {
        return res.status(503).json({
          code: "V2_SCHEMA_MISSING",
          error: "V2 assessment storage is not set up yet. Apply the provided Supabase migration first.",
        });
      }
      console.error("PUT /api/passport/v2 error:", error);
      return res.status(500).json({ error: "Failed to save V2 assessment" });
    }
  });

  // Scoring policy is global and restricted to database admins.
  app.get(
    "/api/passport/v2/admin/policy",
    isAuthenticated,
    requireAdmin,
    async (_req: AuthenticatedRequest, res) => {
      try {
        return res.json(await getAdminPolicyVersions());
      } catch (error) {
        if (isV2SchemaMissing(error)) {
          return res.status(503).json({
            code: "V2_SCHEMA_MISSING",
            error: "V2 scoring storage is not set up yet. Apply the provided Supabase migration first.",
          });
        }
        console.error("GET V2 scoring policy error:", error);
        return res.status(500).json({ error: "Failed to load scoring policy" });
      }
    },
  );

  app.put(
    "/api/passport/v2/admin/policy/draft",
    isAuthenticated,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        return res.json(await saveScoringPolicyDraft(req.userId!, req.body));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid scoring policy." });
        }
        if (isV2SchemaMissing(error)) {
          return res.status(503).json({
            code: "V2_SCHEMA_MISSING",
            error: "V2 scoring storage is not set up yet. Apply the provided Supabase migration first.",
          });
        }
        console.error("Save V2 scoring policy draft error:", error);
        return res.status(500).json({ error: "Failed to save scoring policy draft" });
      }
    },
  );

  app.post(
    "/api/passport/v2/admin/policy/:id/activate",
    isAuthenticated,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      const policyId = Number(req.params.id);
      if (!Number.isSafeInteger(policyId) || policyId < 1) {
        return res.status(400).json({ error: "Invalid policy version ID." });
      }
      try {
        return res.json(await activateScoringPolicy(policyId, req.userId!));
      } catch (error) {
        if (isV2SchemaMissing(error)) {
          return res.status(503).json({
            code: "V2_SCHEMA_MISSING",
            error: "V2 scoring storage is not set up yet. Apply the provided Supabase migration first.",
          });
        }
        if (error instanceof ScoringPolicyValidationError) {
          return res.status(400).json({ error: error.message });
        }
        console.error("Activate V2 scoring policy error:", error);
        return res.status(500).json({ error: "Failed to activate scoring policy" });
      }
    },
  );

  // POST /api/passport/signals — add a financial signal
  app.post("/api/passport/signals", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const data = addSignalSchema.parse(req.body);
      const passport = mem.getOrCreatePassport(userId);

      const signal = mem.addSignal({
        userId,
        passportId: passport.id,
        signalType: data.signalType,
        label: data.label ?? data.signalType,
        rawAmountCents: data.rawAmountCents,
        currencyCode: data.currencyCode,
        country: data.country,
        period: data.period ?? "monthly",
      });

      const updatedPassport = mem.recalculatePassport(passport.id, userId);
      return res.status(201).json({ signal, passport: updatedPassport });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("POST /api/passport/signals error:", err);
      return res.status(500).json({ error: "Failed to add signal" });
    }
  });

  // DELETE /api/passport/signals/:id — remove a signal
  app.delete("/api/passport/signals/:id", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const signalId = parseInt(req.params.id);
      const existing = mem.getSignal(signalId);

      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Signal not found" });
      }

      mem.deleteSignal(signalId, userId);
      const updatedPassport = mem.recalculatePassport(existing.passportId, userId);
      return res.json({ success: true, passport: updatedPassport });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete signal" });
    }
  });

  // POST /api/passport/evidence — add an evidence item
  app.post("/api/passport/evidence", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const data = addEvidenceSchema.parse(req.body);
      const passport = mem.getOrCreatePassport(userId);

      const item = mem.addEvidence({
        userId,
        passportId: passport.id,
        documentType: data.documentType,
        label: data.label,
        tier: data.tier,
        fileData: data.fileData ?? null,
        fileName: data.fileName ?? null,
      });

      const updatedPassport = mem.recalculatePassport(passport.id, userId);
      return res.status(201).json({ item, passport: updatedPassport });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("POST /api/passport/evidence error:", err);
      return res.status(500).json({ error: "Failed to add evidence" });
    }
  });

  // DELETE /api/passport/evidence/:id
  app.delete("/api/passport/evidence/:id", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const itemId = parseInt(req.params.id);
      const existing = mem.getEvidenceItem(itemId);

      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Evidence item not found" });
      }

      mem.deleteEvidence(itemId, userId);
      const updatedPassport = mem.recalculatePassport(existing.passportId, userId);
      return res.json({ success: true, passport: updatedPassport });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete evidence" });
    }
  });

  // PUT /api/passport/mode — toggle pre_arrival / post_arrival
  app.put("/api/passport/mode", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { mode } = updatePassportModeSchema.parse(req.body);

      if (mode === "post_arrival") {
        const passport = mem.getOrCreatePassport(userId);
        const evs = mem.getPassportEvidence(passport.id);
        const hasProof = evs.some((e) => e.documentType === "proof_of_residency");
        if (!hasProof) {
          return res.status(400).json({
            error: "Proof of Residency required to switch to Post-Arrival mode",
            code: "REQUIRES_PROOF_OF_RESIDENCY",
          });
        }
      }

      const passport = mem.getOrCreatePassport(userId);
      const updated = mem.updatePassportMode(passport.id, mode);
      return res.json({ passport: updated });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      return res.status(500).json({ error: "Failed to update mode" });
    }
  });

  // POST /api/passport/generate-token — create / refresh public share token
  app.post("/api/passport/generate-token", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const passport = mem.getOrCreatePassport(userId);
      const token = mem.generateShareToken(passport.id);
      const updated = mem.getOrCreatePassport(userId);
      return res.json({ shareToken: token, passport: updated });
    } catch (err) {
      return res.status(500).json({ error: "Failed to generate share token" });
    }
  });

  // GET /api/passport/public/:token — unauthenticated landlord view
  app.get("/api/passport/public/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const initialPassport = mem.getPassportByShareToken(token);

      if (!initialPassport) {
        return res.status(404).json({ error: "Passport not found" });
      }
      const storedPassport = initialPassport.lastUpdated
        ? initialPassport
        : mem.recalculatePassport(initialPassport.id, initialPassport.userId);
      let passport = storedPassport;
      try {
        const assessment = await getV2Assessment(storedPassport.userId);
        passport = applyV2Calculation(storedPassport, assessment.calculation);
      } catch (error) {
        if (!isV2SchemaMissing(error)) throw error;
      }

      const evidence = mem.getPassportEvidence(passport.id).map((e) => ({
        documentType: e.documentType,
        label: e.label,
        status: e.status,
        tier: e.tier,
      }));

      const signals = mem.getPassportSignals(passport.id).map((s) => ({
        signalType: s.signalType,
        label: s.label,
        country: s.country,
        currencyCode: s.currencyCode,
        normalizedValue: s.normalizedValue,
        verificationStatus: s.verificationStatus,
      }));

      const confidence = passport.confidenceScore === null
        ? { label: "Pending", color: "text-slate-400" }
        : normalizationService.getConfidenceLabel(passport.confidenceScore);

      return res.json({
        score: passport.score,
        provisionalScore: passport.provisionalScore,
        confidenceScore: passport.confidenceScore,
        confidenceLabel: confidence.label,
        assessmentStatus: passport.assessmentStatus,
        algorithmVersion: passport.algorithmVersion,
        missingRequirements: passport.missingRequirements,
        weightedContributions: passport.weightedContributions,
        legacyDataNotice: passport.legacyDataNotice,
        mode: passport.mode,
        scoreBreakdown: passport.scoreBreakdown,
        reasonCodes: passport.reasonCodes ?? [],
        lastUpdated: passport.lastUpdated,
        evidence,
        signals,
      });
    } catch (err) {
      console.error("GET /api/passport/public/:token error:", err);
      return res.status(500).json({ error: "Failed to fetch public passport" });
    }
  });

  // POST /api/passport/recalculate — force score recalculation
  app.post("/api/passport/recalculate", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const passport = mem.getOrCreatePassport(userId);
      const updated = mem.recalculatePassport(passport.id, userId);
      try {
        const assessment = await getV2Assessment(userId);
        return res.json({ passport: applyV2Calculation(updated, assessment.calculation) });
      } catch (error) {
        if (isV2SchemaMissing(error)) return res.json({ passport: updated, v2SchemaReady: false });
        throw error;
      }
    } catch (err) {
      return res.status(500).json({ error: "Failed to recalculate score" });
    }
  });

  // GET /api/passport/benchmarks — return available PPP country benchmarks
  app.get("/api/passport/benchmarks", (_req, res) => {
    return res.json(normalizationService.getAllBenchmarks());
  });
}
