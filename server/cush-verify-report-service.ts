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

export type CushVerifyFinancialEvidenceRecord = {
  recordType: string;
  activityDate: string | null;
  countryCode?: string;
  currencyCode?: string;
  evidenceStatus: string;
  details?: unknown;
};

type FinancialEvidenceCategory =
  | "income_employment"
  | "rent_housing"
  | "savings"
  | "financial_commitments";

const selectedFinancialTypes: Record<FinancialEvidenceCategory, Set<string>> = {
  income_employment: new Set(["employment", "income"]),
  rent_housing: new Set(["accommodation"]),
  savings: new Set(["banking_savings"]),
  financial_commitments: new Set(["expense"]),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeRecordFields(recordType: string, details: unknown): Record<string, string | boolean> {
  if (!isRecord(details)) return {};
  const fieldsByType: Record<string, string[]> = {
    employment: ["employer", "employmentType", "jobTitle", "startDate", "salaryAmount", "salaryFrequency", "salaryBasis", "firstSalaryDate"],
    income: ["sourceType", "payer", "amount", "paymentFrequency", "grossOrNet"],
    accommodation: ["arrangementType", "provider", "tenancyStartDate", "rentAmount", "rentFrequency", "hasFormalTenancy"],
    banking_savings: ["institution", "availableSavings", "balanceDate"],
    expense: ["category", "amount", "frequency", "provider"],
    financial_activity: ["activityType", "amount", "counterparty"],
  };
  const safe: Record<string, string | boolean> = {};
  for (const key of fieldsByType[recordType] ?? []) {
    const value = details[key];
    if (typeof value === "boolean") safe[key] = value;
    else if (typeof value === "string" && value.trim().length > 0 && value.length <= 160) {
      safe[key] = value.trim();
    }
  }
  return safe;
}

function financialCategory(record: CushVerifyFinancialEvidenceRecord): FinancialEvidenceCategory | null {
  for (const [category, recordTypes] of Object.entries(selectedFinancialTypes) as Array<
    [FinancialEvidenceCategory, Set<string>]
  >) {
    if (recordTypes.has(record.recordType)) return category;
  }
  if (record.recordType === "financial_activity" && isRecord(record.details)) {
    const activityType = record.details.activityType;
    if (activityType === "salary" || activityType === "freelance_income") return "income_employment";
    if (activityType === "rent_payment") return "rent_housing";
    if (activityType === "savings_contribution") return "savings";
  }
  return null;
}

function evidenceClassification(status: string):
  | "self_declared"
  | "document_supported"
  | "independently_verified"
  | "pending_review"
  | "disputed_or_rejected" {
  if (status === "document_supported") return "document_supported";
  if (status === "independently_verified") return "independently_verified";
  if (status === "pending_review") return "pending_review";
  if (status === "disputed_or_rejected") return "disputed_or_rejected";
  return "self_declared";
}

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
  financialRecords: CushVerifyFinancialEvidenceRecord[] = [],
): CushVerifyReportPayload {
  const selected = new Set(categories);
  const groupedFinancialEvidence: NonNullable<CushVerifyReportPayload["categories"]["financialEvidence"]> = {};
  const classifiedRecords = financialRecords.flatMap((record) => {
    const category = financialCategory(record);
    return category && selected.has(category) ? [{ category, record }] : [];
  });
  const reportDates = classifiedRecords
    .map(({ record }) => record.activityDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  for (const category of Object.keys(selectedFinancialTypes) as FinancialEvidenceCategory[]) {
    if (!selected.has(category)) continue;
    const records = classifiedRecords
      .filter((item) => item.category === category)
      .map(({ record }) => record);
    groupedFinancialEvidence[category] = {
      recordCount: records.length,
      latestRecordDate: records.map((record) => record.activityDate).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null,
      records: records.map((record) => ({
        recordType: record.recordType,
        activityDate: record.activityDate,
        countryCode: record.countryCode ?? "—",
        currencyCode: record.currencyCode ?? "—",
        evidenceClassification: evidenceClassification(record.evidenceStatus),
        details: safeRecordFields(record.recordType, record.details),
      })),
      evidenceClassifications: {
        selfDeclared: records.filter((record) => evidenceClassification(record.evidenceStatus) === "self_declared").length,
        documentSupported: records.filter((record) => evidenceClassification(record.evidenceStatus) === "document_supported").length,
        independentlyVerified: records.filter((record) => evidenceClassification(record.evidenceStatus) === "independently_verified").length,
        pendingReview: records.filter((record) => evidenceClassification(record.evidenceStatus) === "pending_review").length,
        disputedOrRejected: records.filter((record) => evidenceClassification(record.evidenceStatus) === "disputed_or_rejected").length,
      },
    };
  }
  const report: CushVerifyReportPayload = {
    generatedAt: generatedAt.toISOString(),
    reportingPeriod: {
      start: reportDates[0] ?? null,
      end: reportDates.at(-1) ?? null,
    },
    categories: {},
  };

  if (Object.keys(groupedFinancialEvidence).length > 0) {
    report.categories.financialEvidence = groupedFinancialEvidence;
  }
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
  // when the authorized report content and coverage have not changed. The
  // generated timestamp is intentionally excluded because it changes on retry.
  return createHash("sha256")
    .update(JSON.stringify({
      reportingPeriod: report.reportingPeriod,
      categories: report.categories,
    }))
    .digest("hex");
}
