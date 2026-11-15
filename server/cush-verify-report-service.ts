import { createHash } from "node:crypto";
import type { CustomerCalculation } from "./cush-score-presentation";
import type { V2AssessmentView } from "./cush-score-v2";
import type {
  CushVerifyReportCategory,
  CushVerifyReportPayload,
} from "@shared/cush-verify-reports";

export type CushVerifyReportAuthorization = {
  requestInstitutionId: number;
  expectedInstitutionId: number;
  targetUserId: number | null;
  consentUserId: number | null;
  requestStatus: "awaiting_consent" | "authorized" | "declined" | "revoked" | "expired";
  consentStatus: "approved" | "declined" | "revoked" | null;
  requestedCategories: CushVerifyReportCategory[];
  approvedCategories: CushVerifyReportCategory[];
  requestExpiresAt: Date;
  authorizationExpiresAt: Date | null;
  consentExpiresAt: Date | null;
  now: Date;
};

export function checkCushVerifyReportAuthorization(input: CushVerifyReportAuthorization):
  | { allowed: true; categories: CushVerifyReportCategory[] }
  | { allowed: false; reason: "wrong_tenant" | "no_active_consent" | "expired" | "scope_mismatch" } {
  if (input.requestInstitutionId !== input.expectedInstitutionId) {
    return { allowed: false, reason: "wrong_tenant" };
  }
  if (
    input.requestStatus === "awaiting_consent" &&
    input.requestExpiresAt <= input.now
  ) {
    return { allowed: false, reason: "expired" };
  }
  if (
    input.requestStatus !== "authorized" ||
    input.consentStatus !== "approved" ||
    !input.targetUserId ||
    input.consentUserId !== input.targetUserId
  ) {
    return { allowed: false, reason: "no_active_consent" };
  }
  if (
    !input.authorizationExpiresAt ||
    input.authorizationExpiresAt <= input.now ||
    !input.consentExpiresAt ||
    input.consentExpiresAt <= input.now
  ) {
    return { allowed: false, reason: "expired" };
  }
  if (
    input.approvedCategories.length === 0 ||
    input.approvedCategories.some((category) => !input.requestedCategories.includes(category))
  ) {
    return { allowed: false, reason: "scope_mismatch" };
  }
  return { allowed: true, categories: input.approvedCategories };
}

export function maskCushVerifyRecipientEmail(value: string): string {
  const [local, domain] = value.trim().toLowerCase().split("@");
  if (!local || !domain) return "hidden recipient";
  const visibleLocal = local.length === 1 ? `${local[0]}***` : `${local[0]}***${local.at(-1)}`;
  return `${visibleLocal}@${domain}`;
}

export function buildCushVerifyReport(
  calculation: CustomerCalculation,
  categories: CushVerifyReportCategory[],
  generatedAt = new Date(),
  evidence?: Pick<V2AssessmentView, "monoImports" | "monoDataReady">,
): CushVerifyReportPayload {
  const selected = new Set(categories);
  const report: CushVerifyReportPayload = {
    generatedAt: generatedAt.toISOString(),
    categories: {},
  };

  if (selected.has("score_summary")) {
    report.categories.scoreSummary = {
      score: calculation.cushScore,
      provisionalScore: calculation.provisionalScore,
      confidenceScore: calculation.confidenceScore,
      confidenceBand: calculation.confidenceBand,
    };
  }
  if (selected.has("assessment_status")) {
    report.categories.assessmentStatus = {
      status: calculation.assessmentStatus,
      algorithmVersion: calculation.algorithmVersion,
      missingRequirements: calculation.missingRequirements,
    };
  }
  if (selected.has("evidence_summary")) {
    const imports = evidence?.monoImports ?? [];
    const distinctAccounts = new Map(imports.map((item) => [item.linkedAccountId, item]));
    const latestImport = [...imports].sort((left, right) =>
      right.fetchedAt.localeCompare(left.fetchedAt),
    )[0];
    report.categories.evidenceSummary = {
      bankStatements: {
        status: evidence?.monoDataReady === false
          ? "source_unavailable"
          : distinctAccounts.size > 0
            ? "evidence_imported"
            : "no_imported_evidence",
        importedAccounts: distinctAccounts.size,
        statementPeriodsMonths: [...new Set([...distinctAccounts.values()].map((item) => item.statementPeriodMonths))].sort((a, b) => a - b),
        latestImportDate: latestImport?.fetchedAt.slice(0, 10) ?? null,
      },
    };
  }

  return report;
}

export function getCushVerifyReportDigest(report: CushVerifyReportPayload): string {
  // A retry at a later time must not create another successful-delivery event
  // when the authorized report content has not changed.
  return createHash("sha256").update(JSON.stringify(report.categories)).digest("hex");
}
