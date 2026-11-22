import { createHash } from "node:crypto";
import type { PassportFinancialProfile } from "./passport-evidence-service";

export type AssessmentMaturity =
  | "getting_started"
  | "provisional"
  | "evidence_supported"
  | "institution_supported";

export function getAssessmentMaturity(input: {
  hasScore: boolean;
  hasInstitutionCredit: boolean;
  hasBankConnection: boolean;
  hasReviewedStatement: boolean;
}): AssessmentMaturity {
  if (!input.hasScore) return "getting_started";
  if (input.hasInstitutionCredit || input.hasBankConnection) return "institution_supported";
  if (input.hasReviewedStatement) return "evidence_supported";
  return "provisional";
}

export function fingerprintAssessmentInputs(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function fingerprintPassportProfileSections(
  profile: PassportFinancialProfile | null,
  period: "preArrival" | "postArrival",
): Record<string, string | null> {
  if (!profile) {
    return {
      [`${period}CountryCurrencyFingerprint`]: null,
      [`${period}IncomeEmploymentFingerprint`]: null,
      [`${period}HousingFingerprint`]: null,
      [`${period}SavingsCommitmentsFingerprint`]: null,
      [`${period}FinancialHistoryFingerprint`]: null,
    };
  }
  return {
    [`${period}CountryCurrencyFingerprint`]: fingerprintAssessmentInputs({
      countryCode: profile.countryCode,
      currencyCode: profile.currencyCode,
    }),
    [`${period}IncomeEmploymentFingerprint`]: fingerprintAssessmentInputs({
      employmentStatus: profile.employmentStatus,
      employer: profile.employer,
      jobTitle: profile.jobTitle,
      incomeAmount: profile.incomeAmount,
      incomeFrequency: profile.incomeFrequency,
      incomeCategory: profile.incomeCategory,
    }),
    [`${period}HousingFingerprint`]: fingerprintAssessmentInputs({
      housingStatus: profile.housingStatus,
      housingCost: profile.housingCost,
    }),
    [`${period}SavingsCommitmentsFingerprint`]: fingerprintAssessmentInputs({
      savingsAmount: profile.savingsAmount,
      savingsLabel: profile.savingsLabel,
      commitmentsAmount: profile.commitmentsAmount,
      completeCashFlow: profile.completeCashFlow,
    }),
    [`${period}FinancialHistoryFingerprint`]: fingerprintAssessmentInputs({
      financialHistory: profile.financialHistory,
      financialHistorySummary: profile.financialHistorySummary,
    }),
  };
}

export function getAssessmentChangedInformation(previous: unknown, current: Record<string, unknown>): string[] {
  const previousState = typeof previous === "object" && previous !== null
    ? previous as Record<string, unknown>
    : null;
  if (!previousState) return ["Initial assessment"];
  const labels: Record<string, string> = {
    algorithmVersion: "Scoring method",
    policyVersion: "Scoring policy",
    storedInputsUpdatedAt: "Manual assessment details",
    manualDestinationFingerprint: "Assessment destination",
    manualAvailableFundsFingerprint: "Manual funds and savings",
    manualIncomeHistoryFingerprint: "Manual income history",
    manualCashFlowHistoryFingerprint: "Manual cash flow",
    manualCreditClassificationFingerprint: "Manual credit classification",
    preArrivalUpdatedAt: "Pre-Arrival profile",
    postArrivalUpdatedAt: "Post-Arrival profile",
    preArrivalCountryCurrencyFingerprint: "Pre-Arrival country and currency",
    preArrivalIncomeEmploymentFingerprint: "Pre-Arrival income and employment",
    preArrivalHousingFingerprint: "Pre-Arrival housing",
    preArrivalSavingsCommitmentsFingerprint: "Pre-Arrival savings and commitments",
    preArrivalFinancialHistoryFingerprint: "Pre-Arrival monthly history and context",
    postArrivalCountryCurrencyFingerprint: "Post-Arrival country and currency",
    postArrivalIncomeEmploymentFingerprint: "Post-Arrival income and employment",
    postArrivalHousingFingerprint: "Post-Arrival housing",
    postArrivalSavingsCommitmentsFingerprint: "Post-Arrival savings and commitments",
    postArrivalFinancialHistoryFingerprint: "Post-Arrival monthly history and context",
    bankEvidence: "Connected bank evidence",
    creditEvidenceAt: "Credit history evidence",
    reviewedStatementEvidence: "Reviewed bank statements",
  };
  const changedKeys = Object.keys(current).filter((key) =>
    Object.prototype.hasOwnProperty.call(previousState, key) &&
    JSON.stringify(previousState[key]) !== JSON.stringify(current[key]),
  );
  const specificPreArrivalChanges = changedKeys.some((key) => key.startsWith("preArrival") && key.endsWith("Fingerprint"));
  const specificPostArrivalChanges = changedKeys.some((key) => key.startsWith("postArrival") && key.endsWith("Fingerprint"));
  const specificManualChanges = changedKeys.some((key) => key.startsWith("manual") && key.endsWith("Fingerprint"));
  return [...new Set(changedKeys
    .filter((key) => !(key === "storedInputsUpdatedAt" && specificManualChanges))
    .filter((key) => !(key === "preArrivalUpdatedAt" && specificPreArrivalChanges))
    .filter((key) => !(key === "postArrivalUpdatedAt" && specificPostArrivalChanges))
    .map((key) => labels[key] ?? "Assessment information"))];
}

export function describeAssessmentChange(
  previous: { score: number | null; confidence: number | null } | undefined,
  score: number | null,
  confidence: number | null,
): string {
  if (!previous) return "Initial assessment created from the financial information currently available.";
  if (previous.score !== score) {
    const confidenceChange = previous.confidence !== confidence
      ? ` Confidence changed from ${previous.confidence ?? "pending"} to ${confidence ?? "pending"} separately.`
      : "";
    if (previous.score === null) return `A provisional Cush Score is now available from the information currently saved.${confidenceChange}`;
    if (score === null) return `The assessment changed and a complete score is no longer available; review the outstanding information.${confidenceChange}`;
    return `Cush Score ${score > previous.score ? "increased" : "decreased"} from ${previous.score} to ${score} after the assessment was recalculated.${confidenceChange}`;
  }
  if (previous.confidence !== confidence) {
    return `Cush Score stayed ${score ?? "unavailable"}; Confidence changed as the available information or evidence changed.`;
  }
  return "The saved assessment inputs changed; Cush Score and Confidence stayed the same.";
}
