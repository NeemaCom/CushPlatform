import { z } from "zod";
import type { CushVerifyReportCategory } from "./schema";
export type { CushVerifyReportCategory } from "./schema";

export const CUSH_VERIFY_REPORT_CATEGORIES = [
  { value: "income_employment", label: "Income and employment" },
  { value: "rent_housing", label: "Rent and housing" },
  { value: "savings", label: "Savings" },
  { value: "financial_commitments", label: "Financial commitments" },
  { value: "score_summary", label: "Cush Score and confidence summary" },
  { value: "assessment_status", label: "Assessment status and outstanding requirements" },
  { value: "evidence_summary", label: "Bank-statement evidence status" },
] as const satisfies readonly { value: CushVerifyReportCategory; label: string }[];

export const cushVerifyReportCategorySchema = z.enum([
  "income_employment",
  "rent_housing",
  "savings",
  "financial_commitments",
  "score_summary",
  "assessment_status",
  "evidence_summary",
]);

export const cushVerifyReportRequestSchema = z.object({
  recipientEmail: z.string().trim().email().max(254),
  purpose: z.string().trim().min(10).max(500),
  categories: z.array(cushVerifyReportCategorySchema).min(1).max(7),
  authorizationDays: z.number().int().min(1).max(90),
}).strict().superRefine((input, context) => {
  if (new Set(input.categories).size !== input.categories.length) {
    context.addIssue({
      code: "custom",
      path: ["categories"],
      message: "Choose each report category once.",
    });
  }
});

export const cushVerifyReportDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    categories: z.array(cushVerifyReportCategorySchema).min(1).max(7),
    authorizationDays: z.number().int().min(1).max(90),
  }).strict(),
  z.object({ decision: z.literal("decline") }).strict(),
]);

export type CushVerifyReportRequestInput = z.infer<typeof cushVerifyReportRequestSchema>;
export type CushVerifyReportDecisionInput = z.infer<typeof cushVerifyReportDecisionSchema>;

export type CushVerifyReportPayload = {
  generatedAt: string;
  reportingPeriod: { start: string | null; end: string | null };
  categories: {
    financialEvidence?: Partial<Record<
      "income_employment" | "rent_housing" | "savings" | "financial_commitments",
      {
        recordCount: number;
        latestRecordDate: string | null;
        records: Array<{
          recordType: string;
          activityDate: string | null;
          countryCode: string;
          currencyCode: string;
          evidenceClassification:
            | "self_declared"
            | "document_supported"
            | "independently_verified"
            | "pending_review"
            | "disputed_or_rejected";
          details: Record<string, string | boolean>;
        }>;
        evidenceClassifications: {
          selfDeclared: number;
          documentSupported: number;
          independentlyVerified: number;
          pendingReview: number;
          disputedOrRejected: number;
        };
      }
    >>;
    scoreSummary?: {
      score: number | null;
      provisionalScore: number | null;
      confidenceScore: number | null;
      confidenceBand: string | null;
    };
    assessmentStatus?: {
      status: "not_started" | "incomplete" | "provisional" | "complete";
      algorithmVersion: string;
      missingRequirements: string[];
    };
    evidenceSummary?: {
      bankStatements: {
        status: "evidence_imported" | "no_imported_evidence" | "source_unavailable";
        importedAccounts: number;
        statementPeriodsMonths: number[];
        latestImportDate: string | null;
      };
    };
  };
};

export type CushVerifyReportRequestView = {
  id: string;
  recipientLabel: string;
  purpose: string;
  requestedCategories: CushVerifyReportCategory[];
  requestedAuthorizationDays: number;
  status: "awaiting_consent" | "authorized" | "declined" | "revoked" | "expired";
  requestExpiresAt: string;
  authorizationExpiresAt: string | null;
  createdAt: string;
  lastReportDeliveredAt: string | null;
  deliveredReportCount: number;
};
