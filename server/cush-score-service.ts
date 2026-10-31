/**
 * Cush Score V2 calculation engine.
 *
 * This module is deliberately pure. All monetary inputs must already be
 * normalised to GBP pence by a trusted, separately audited ingestion layer.
 */

export const CUSH_SCORE_VERSION = "2.2.0";

export type EvidenceQuality = "verified" | "documented" | "self_reported";
export type SourceEvidenceType = "bank_connection" | "verified_statement" | "self_reported";
export type CreditCheckStatus = "matched" | "matched_thin" | "no_match" | "not_done";
export type IncomeConfidenceSource =
  | "uk_payslip_or_uk_credits"
  | "steady_employer"
  | "variable"
  | "uk_offer_only"
  | "family_support_only"
  | "other";

export type IncomeCategory =
  | "salary"
  | "self_employment"
  | "freelance"
  | "business"
  | "scholarship"
  | "family_support"
  | "other";

export type CreditClassification =
  | "strong"
  | "average"
  | "poor"
  | "thin_file"
  | "no_history"
  | "incomplete"
  | "unavailable";

export interface MonthlyIncomeObservation {
  /** One aggregated recurring amount for this source and calendar month. */
  month: string;
  sourceId: string;
  category: IncomeCategory;
  amountPence: number;
  recurring: boolean;
  variable: boolean;
  evidenceQuality: EvidenceQuality;
}

export interface AvailableFund {
  id: string;
  /** Shared keys identify the same funds across accounts/products. */
  deduplicationKey: string;
  amountPence: number;
  accessible: boolean;
  evidenceQuality: EvidenceQuality;
}

export interface MonthlyCashFlow {
  month: string;
  /** Recurring, eligible income only; one-off deposits must be excluded upstream. */
  eligibleRecurringIncomePence: number;
  eligibleExpensesPence: number;
  complete: boolean;
  evidenceQuality: EvidenceQuality;
}

export interface CreditAssessment {
  classification: CreditClassification;
  evidenceQuality: EvidenceQuality | null;
  /** Server-derived provider score on the 0–100 component scale, if scoreable. */
  score?: number | null;
  /** Set only by a trusted credit-check/review path, never from the V2 form. */
  checkStatus?: CreditCheckStatus;
}

export interface ConfirmedIntegrityFlag {
  id: string;
  reason: string;
  evidenceReference: string;
  recordedAt: string;
  reviewStatus: "pending" | "confirmed" | "dismissed";
}

export interface DestinationBaseline {
  destination: string;
  monthlyBaselinePence: number;
  effectiveDate: string;
  countryCode: string;
}

export interface CushScorePolicy {
  /**
   * The prompt fixes thin-file at 50. Provider-specific classification mappings
   * remain policy-driven; verified credit-history components may supply a
   * server-derived score through CreditAssessment.score.
   */
  creditMappings: Partial<Record<Exclude<CreditClassification, "thin_file" | "incomplete" | "unavailable">, number>>;
  confidence?: {
    historyMonthsForMaximum: number;
    sourceQualityPoints: Record<SourceEvidenceType, number>;
    creditCheckPoints: Record<CreditCheckStatus, number>;
    incomeSourcePoints: Record<IncomeConfidenceSource, number>;
    freshnessBands: Array<{ maxAgeDays: number; points: number }>;
  };
}

export interface CushScoreInput {
  individualUserId: number;
  assessmentMonth: string;
  destinationBaseline: DestinationBaseline | null;
  hasSubmittedFinancialData: boolean;
  availableFunds: AvailableFund[];
  incomeHistory: MonthlyIncomeObservation[];
  /** Share of assessment data attributed to each trusted evidence source. */
  sourceEvidenceShares: Array<{ sourceType: SourceEvidenceType; share: number }>;
  verifiedUkEmploymentOffer?: {
    sourceId: string;
    monthlyAmountPence: number;
    evidenceQuality: EvidenceQuality;
  };
  cashFlowHistory: MonthlyCashFlow[];
  credit: CreditAssessment;
  dataAgeDays: number | null;
  coveredAccountCount: number;
  declaredAccountCount: number;
  /** Share of transfers still unresolved to unconnected accounts; 1 means all unresolved. */
  unresolvedUnconnectedTransferShare?: number;
  /** Derived from submitted income records or trusted evidence, not client-supplied. */
  incomeSourceType?: IncomeConfidenceSource;
  integrityFlags: ConfirmedIntegrityFlag[];
}

export interface ConfidenceBreakdown {
  financialHistoryDepth: number;
  sourceQualityAndVerification: number;
  creditInformationAvailability: number;
  dataFreshness: number;
  accountCoverage: number;
  incomeSourceReliability: number;
  integrityDeduction: number;
}

export interface CushScoreResult {
  algorithmVersion: string;
  assessmentStatus: "not_started" | "incomplete" | "provisional" | "complete";
  /** Only present when all completion requirements are met. */
  cushScore: number | null;
  /** Normalized score from supported components while completion requirements remain. */
  provisionalScore: number | null;
  /** Percentage of the four components' total weight represented by scored components. */
  scoreCoveragePercent: number;
  scoredComponentCount: number;
  confidenceScore: number | null;
  confidenceBand: "low" | "medium" | "high" | null;
  componentScores: {
    availableFunds: number | null;
    incomeStrength: number | null;
    cashFlow: number | null;
    creditHistory: number | null;
  };
  weightedContributions: {
    availableFunds: number | null;
    incomeStrength: number | null;
    cashFlow: number | null;
    creditHistory: number | null;
  };
  confidenceBreakdown: ConfidenceBreakdown | null;
  recognizedMonthlyIncomePence: number | null;
  fundsMonths: number | null;
  incomeRatio: number | null;
  cashFlowCap: number | null;
  usableHistoryMonths: number;
  missingRequirements: string[];
  assessmentContext: {
    individualUserId: number;
    destinationBaseline: DestinationBaseline | null;
  };
}

const COMPONENT_WEIGHTS = {
  availableFunds: 0.35,
  incomeStrength: 0.3,
  cashFlow: 0.2,
  creditHistory: 0.15,
} as const;

const FUNDS_CURVE = [
  { x: 0, y: 0 },
  { x: 1, y: 20 },
  { x: 3, y: 60 },
  { x: 6, y: 100 },
];

const INCOME_CURVE = [
  { x: 0, y: 0 },
  { x: 0.5, y: 30 },
  { x: 1, y: 60 },
  { x: 1.5, y: 80 },
  { x: 2, y: 100 },
];

const SURPLUS_CURVE = [
  { x: 0, y: 0 },
  { x: 0.1, y: 40 },
  { x: 0.2, y: 70 },
  { x: 0.3, y: 100 },
];

const QUALITY_VALUES: EvidenceQuality[] = ["verified", "documented", "self_reported"];
const SOURCE_EVIDENCE_TYPES: SourceEvidenceType[] = ["bank_connection", "verified_statement", "self_reported"];
const CREDIT_CHECK_STATUSES: CreditCheckStatus[] = ["matched", "matched_thin", "no_match", "not_done"];
const INCOME_CONFIDENCE_SOURCES: IncomeConfidenceSource[] = [
  "uk_payslip_or_uk_credits",
  "steady_employer",
  "variable",
  "uk_offer_only",
  "family_support_only",
  "other",
];
function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}

function assertMonth(value: string, label: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM format.`);
  }
}

function monthDistance(assessmentMonth: string, month: string): number {
  const [assessmentYear, assessmentNumber] = assessmentMonth.split("-").map(Number);
  const [year, monthNumber] = month.split("-").map(Number);
  return assessmentYear * 12 + assessmentNumber - (year * 12 + monthNumber);
}

function isWithinAssessmentWindow(assessmentMonth: string, month: string): boolean {
  const distance = monthDistance(assessmentMonth, month);
  return distance >= 0 && distance < 6;
}

function assertEvidenceQuality(value: string, label: string): asserts value is EvidenceQuality {
  if (!QUALITY_VALUES.includes(value as EvidenceQuality)) {
    throw new Error(`${label} is not a supported evidence quality.`);
  }
}

function assertSourceEvidenceType(value: string, label: string): asserts value is SourceEvidenceType {
  if (!SOURCE_EVIDENCE_TYPES.includes(value as SourceEvidenceType)) {
    throw new Error(`${label} is not a supported source evidence type.`);
  }
}

function sumSafeIntegers(values: number[], label: string): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) throw new Error(`${label} exceeds safe integer precision.`);
  return total;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : sorted[middle - 1] / 2 + sorted[middle] / 2;
}

function interpolate(value: number, points: Array<{ x: number; y: number }>): number {
  if (!Number.isFinite(value) || value <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i++) {
    const right = points[i];
    const left = points[i - 1];
    if (value <= right.x) {
      const ratio = (value - left.x) / (right.x - left.x);
      return left.y + ratio * (right.y - left.y);
    }
  }
  return points[points.length - 1].y;
}

function requireValidPolicy(policy: CushScorePolicy): void {
  if (policy.confidence) {
    if (!Number.isInteger(policy.confidence.historyMonthsForMaximum) ||
        policy.confidence.historyMonthsForMaximum < 1) {
      throw new Error("Confidence historyMonthsForMaximum must be a positive integer.");
    }
    for (const sourceType of SOURCE_EVIDENCE_TYPES) {
      const points = policy.confidence.sourceQualityPoints[sourceType];
      if (!Number.isFinite(points) || points < 0 || points > 25) {
        throw new Error(`sourceQualityPoints.${sourceType} must be between 0 and 25.`);
      }
    }
    for (const status of CREDIT_CHECK_STATUSES) {
      const points = policy.confidence.creditCheckPoints[status];
      if (!Number.isFinite(points) || points < 0 || points > 15) {
        throw new Error(`creditCheckPoints.${status} must be between 0 and 15.`);
      }
    }
    for (const source of INCOME_CONFIDENCE_SOURCES) {
      const points = policy.confidence.incomeSourcePoints[source];
      if (!Number.isFinite(points) || points < 0 || points > 10) {
        throw new Error(`incomeSourcePoints.${source} must be between 0 and 10.`);
      }
    }
    let previousAge = -1;
    for (const band of policy.confidence.freshnessBands) {
      if (!Number.isInteger(band.maxAgeDays) || band.maxAgeDays < 0 ||
          band.maxAgeDays <= previousAge || !Number.isFinite(band.points) ||
          band.points < 0 || band.points > 10) {
        throw new Error("Freshness bands must have increasing non-negative day limits and 0-10 points.");
      }
      previousAge = band.maxAgeDays;
    }
  }
  for (const [classification, score] of Object.entries(policy.creditMappings)) {
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`Credit mapping for ${classification} must be between 0 and 100.`);
    }
  }
}

function sourceQualityPoints(
  shares: Array<{ sourceType: SourceEvidenceType; share: number }>,
  points: Record<SourceEvidenceType, number>,
): number {
  if (!shares.length) return 0;
  return shares.reduce((sum, item) => sum + points[item.sourceType] * item.share, 0);
}

function inferIncomeConfidenceSource(input: CushScoreInput): IncomeConfidenceSource {
  const recurringIncome = input.incomeHistory.filter((item) =>
    item.recurring && isWithinAssessmentWindow(input.assessmentMonth, item.month),
  );
  if (!recurringIncome.length) {
    return input.verifiedUkEmploymentOffer?.evidenceQuality === "verified"
      ? "uk_offer_only"
      : "other";
  }
  if (recurringIncome.every((item) => item.category === "family_support")) {
    return "family_support_only";
  }
  if (recurringIncome.some((item) => item.variable)) return "variable";
  if (recurringIncome.some((item) => item.category === "salary")) return "steady_employer";
  return "other";
}

function calculateConfidence(
  input: CushScoreInput,
  policy: CushScorePolicy,
  usableHistoryMonths: number,
): { score: number | null; breakdown: ConfidenceBreakdown | null } {
  const confidencePolicy = policy.confidence;
  const hasAssessmentData =
    input.availableFunds.length > 0 ||
    input.incomeHistory.length > 0 ||
    input.cashFlowHistory.length > 0 ||
    input.sourceEvidenceShares.length > 0 ||
    input.credit.classification !== "unavailable" ||
    input.credit.checkStatus !== undefined && input.credit.checkStatus !== "not_done";
  if (!hasAssessmentData || !confidencePolicy) return { score: null, breakdown: null };

  const historyDepth = Math.min(
    usableHistoryMonths / confidencePolicy.historyMonthsForMaximum,
    1,
  ) * 30;

  const sourceQuality = sourceQualityPoints(
    input.sourceEvidenceShares,
    confidencePolicy.sourceQualityPoints,
  );

  const checkStatus = input.credit.checkStatus ?? "not_done";
  const creditAvailability = input.credit.evidenceQuality &&
      input.credit.evidenceQuality !== "self_reported"
    ? confidencePolicy.creditCheckPoints[checkStatus]
    : 0;

  let freshness = 0;
  if (input.dataAgeDays !== null) {
    for (const band of confidencePolicy.freshnessBands) {
      if (input.dataAgeDays <= band.maxAgeDays) {
        freshness = band.points;
        break;
      }
    }
  }

  const accountCoverage = input.unresolvedUnconnectedTransferShare !== undefined
    ? 10 * (1 - input.unresolvedUnconnectedTransferShare)
    : input.declaredAccountCount > 0
      ? 10 * Math.min(input.coveredAccountCount / input.declaredAccountCount, 1)
      : 0;

  const incomeSourceType = input.incomeSourceType ?? inferIncomeConfidenceSource(input);
  const incomeReliability = confidencePolicy.incomeSourcePoints[incomeSourceType];

  const confirmedFlags = input.integrityFlags.filter((flag) => flag.reviewStatus === "confirmed").length;
  const integrityDeduction = confirmedFlags * 5;
  const total = historyDepth + sourceQuality + creditAvailability + freshness +
    accountCoverage + incomeReliability - integrityDeduction;

  return {
    score: Math.max(1, Math.min(100, Math.round(total))),
    breakdown: {
      financialHistoryDepth: Math.round(historyDepth * 100) / 100,
      sourceQualityAndVerification: Math.round(sourceQuality * 100) / 100,
      creditInformationAvailability: Math.round(creditAvailability * 100) / 100,
      dataFreshness: freshness,
      accountCoverage: Math.round(accountCoverage * 100) / 100,
      incomeSourceReliability: Math.round(incomeReliability * 100) / 100,
      integrityDeduction,
    },
  };
}

function validateInput(input: CushScoreInput, policy: CushScorePolicy): void {
  requireValidPolicy(policy);
  if (!Number.isSafeInteger(input.individualUserId) || input.individualUserId <= 0) {
    throw new Error("individualUserId must be a positive safe integer.");
  }
  if (typeof input.hasSubmittedFinancialData !== "boolean") {
    throw new Error("hasSubmittedFinancialData must be a boolean.");
  }
  if (input.destinationBaseline !== null) {
    const baseline = input.destinationBaseline;
    if (!baseline.destination.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(baseline.effectiveDate)) {
      throw new Error("Destination and baseline effective date are required.");
    }
    const baselineDate = new Date(`${baseline.effectiveDate}T00:00:00Z`);
    if (!Number.isFinite(baselineDate.getTime()) ||
        baselineDate.toISOString().slice(0, 10) !== baseline.effectiveDate) {
      throw new Error("baseline effectiveDate must be a valid calendar date.");
    }
    assertNonNegativeInteger(baseline.monthlyBaselinePence, "monthlyBaselinePence");
    if (baseline.monthlyBaselinePence === 0) {
      throw new Error("monthlyBaselinePence must be greater than zero.");
    }
    if (!/^[A-Z]{2}$/.test(baseline.countryCode)) {
      throw new Error("countryCode must be a two-letter uppercase code.");
    }
  }
  assertMonth(input.assessmentMonth, "assessmentMonth");
  if (!Number.isInteger(input.coveredAccountCount) || input.coveredAccountCount < 0 ||
      !Number.isInteger(input.declaredAccountCount) || input.declaredAccountCount < 0 ||
      input.coveredAccountCount > input.declaredAccountCount) {
    throw new Error("Account coverage counts are invalid.");
  }
  if (input.dataAgeDays !== null && (!Number.isInteger(input.dataAgeDays) || input.dataAgeDays < 0)) {
    throw new Error("dataAgeDays must be null or a non-negative integer.");
  }

  const fundIds = new Set<string>();
  const fundKeys = new Set<string>();
  for (const fund of input.availableFunds) {
    if (!fund.id.trim() || !fund.deduplicationKey.trim()) throw new Error("Fund id and deduplicationKey are required.");
    if (fundIds.has(fund.id) || fundKeys.has(fund.deduplicationKey)) {
      throw new Error("Duplicate funds or duplicate fund references are not allowed.");
    }
    fundIds.add(fund.id);
    fundKeys.add(fund.deduplicationKey);
    assertNonNegativeInteger(fund.amountPence, "fund.amountPence");
    assertEvidenceQuality(fund.evidenceQuality, "fund evidenceQuality");
  }

  let sourceShareTotal = 0;
  for (const source of input.sourceEvidenceShares) {
    assertSourceEvidenceType(source.sourceType, "sourceEvidenceShares sourceType");
    if (!Number.isFinite(source.share) || source.share < 0 || source.share > 1) {
      throw new Error("Each source evidence share must be between 0 and 1.");
    }
    sourceShareTotal += source.share;
  }
  if (input.sourceEvidenceShares.length && Math.abs(sourceShareTotal - 1) > 0.000001) {
    throw new Error("Source evidence shares must add up to 1.");
  }
  if (input.credit.checkStatus && !CREDIT_CHECK_STATUSES.includes(input.credit.checkStatus)) {
    throw new Error("Credit check status is not supported.");
  }
  if (input.credit.score !== undefined && input.credit.score !== null &&
      (!Number.isFinite(input.credit.score) || input.credit.score < 0 || input.credit.score > 100)) {
    throw new Error("Credit score must be null or between 0 and 100.");
  }
  if (input.credit.score !== undefined && input.credit.score !== null &&
      (input.credit.evidenceQuality !== "verified" || input.credit.checkStatus !== "matched")) {
    throw new Error("A mapped provider credit score requires verified matched evidence.");
  }
  if (input.incomeSourceType && !INCOME_CONFIDENCE_SOURCES.includes(input.incomeSourceType)) {
    throw new Error("Income confidence source is not supported.");
  }
  if (input.unresolvedUnconnectedTransferShare !== undefined &&
      (!Number.isFinite(input.unresolvedUnconnectedTransferShare) ||
       input.unresolvedUnconnectedTransferShare < 0 ||
       input.unresolvedUnconnectedTransferShare > 1)) {
    throw new Error("Unresolved unconnected transfer share must be between 0 and 1.");
  }

  const incomeObservations = new Set<string>();
  const sourceVariability = new Map<string, boolean>();
  for (const item of input.incomeHistory) {
    assertMonth(item.month, "income month");
    if (monthDistance(input.assessmentMonth, item.month) < 0) {
      throw new Error("Income history cannot include future months.");
    }
    assertNonNegativeInteger(item.amountPence, "income amountPence");
    const observationKey = `${item.sourceId}:${item.month}`;
    if (!item.sourceId.trim() || incomeObservations.has(observationKey)) {
      throw new Error("Income history must contain one aggregated record per source and month.");
    }
    assertEvidenceQuality(item.evidenceQuality, "income evidenceQuality");
    incomeObservations.add(observationKey);
    const previousVariable = sourceVariability.get(item.sourceId);
    if (previousVariable !== undefined && previousVariable !== item.variable) {
      throw new Error(`Income variability must be consistent for source ${item.sourceId}.`);
    }
    sourceVariability.set(item.sourceId, item.variable);
  }

  if (input.verifiedUkEmploymentOffer) {
    assertNonNegativeInteger(input.verifiedUkEmploymentOffer.monthlyAmountPence, "employment offer amount");
    if (!input.verifiedUkEmploymentOffer.sourceId.trim()) throw new Error("Employment offer sourceId is required.");
  }

  const cashFlowMonths = new Set<string>();
  for (const item of input.cashFlowHistory) {
    assertMonth(item.month, "cash-flow month");
    if (monthDistance(input.assessmentMonth, item.month) < 0) {
      throw new Error("Cash-flow history cannot include future months.");
    }
    assertNonNegativeInteger(item.eligibleRecurringIncomePence, "eligibleRecurringIncomePence");
    assertNonNegativeInteger(item.eligibleExpensesPence, "eligibleExpensesPence");
    assertEvidenceQuality(item.evidenceQuality, "cash-flow evidenceQuality");
    if (cashFlowMonths.has(item.month)) throw new Error("Cash-flow history must contain one record per month.");
    cashFlowMonths.add(item.month);
  }

  const integrityFlagIds = new Set<string>();
  for (const flag of input.integrityFlags) {
    if (!flag.id.trim() || !flag.reason.trim() || !flag.evidenceReference.trim() ||
        !Number.isFinite(Date.parse(flag.recordedAt))) {
      throw new Error("Every integrity flag requires an id, reason, evidence reference, and timestamp.");
    }
    if (integrityFlagIds.has(flag.id)) throw new Error("Duplicate integrity flag ids are not allowed.");
    integrityFlagIds.add(flag.id);
  }
}

function calculateRecognizedMonthlyIncome(input: CushScoreInput): number | null {
  const bySource = new Map<string, MonthlyIncomeObservation[]>();
  for (const item of input.incomeHistory) {
    if (!item.recurring ||
        item.evidenceQuality === "self_reported" ||
        !isWithinAssessmentWindow(input.assessmentMonth, item.month)) continue;
    const source = bySource.get(item.sourceId) ?? [];
    source.push(item);
    bySource.set(item.sourceId, source);
  }

  const recognizedBySource = new Map<string, number>();
  for (const [sourceId, observations] of bySource) {
    const recent = [...observations]
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);
    const values = recent.map((item) => item.amountPence);
    const medianIncome = median(values);
    if (medianIncome === null) continue;
    let recognized = medianIncome;
    if (observations[0].variable) {
      const mean = sumSafeIntegers(values, `Income history for ${sourceId}`) / values.length;
      recognized = Math.min(medianIncome, mean * 0.8);
    }
    recognizedBySource.set(sourceId, Math.round(recognized));
  }

  const offer = input.verifiedUkEmploymentOffer;
  if (offer && input.destinationBaseline?.countryCode === "GB" && offer.evidenceQuality === "verified") {
    const contractIncome = Math.round(offer.monthlyAmountPence * 0.8);
    recognizedBySource.set(
      offer.sourceId,
      Math.max(recognizedBySource.get(offer.sourceId) ?? 0, contractIncome),
    );
  }

  if (recognizedBySource.size === 0) return null;
  return sumSafeIntegers([...recognizedBySource.values()], "Recognized monthly income");
}

function calculateFundsScore(input: CushScoreInput): { score: number | null; months: number | null } {
  const verifiedFunds = input.availableFunds.filter(
    (fund) => fund.evidenceQuality === "verified",
  );
  if (verifiedFunds.length === 0 || input.destinationBaseline === null) {
    return { score: null, months: null };
  }
  const accessiblePence = sumSafeIntegers(
    verifiedFunds.filter((fund) => fund.accessible).map((fund) => fund.amountPence),
    "Available funds",
  );
  const months = accessiblePence / input.destinationBaseline.monthlyBaselinePence;
  return { score: interpolate(months, FUNDS_CURVE), months };
}

function calculateIncomeScore(
  recognizedIncomePence: number | null,
  baselinePence: number | null,
): number | null {
  if (recognizedIncomePence === null || baselinePence === null) return null;
  return interpolate(recognizedIncomePence / baselinePence, INCOME_CURVE);
}

function calculateCashFlowScore(
  input: CushScoreInput,
  recognizedIncomePence: number | null,
): { score: number | null; cap: number | null } {
  const completeMonths = input.cashFlowHistory.filter(
    (item) => item.complete &&
      item.evidenceQuality !== "self_reported" &&
      isWithinAssessmentWindow(input.assessmentMonth, item.month),
  );
  if (completeMonths.length === 0 ||
      recognizedIncomePence === null ||
      input.destinationBaseline === null) {
    return { score: null, cap: null };
  }
  if (recognizedIncomePence <= 0) return { score: 0, cap: 40 };

  const monthlyRatios = completeMonths.map((item) =>
    (item.eligibleRecurringIncomePence - item.eligibleExpensesPence) / recognizedIncomePence,
  );
  const medianSurplusRatio = median(monthlyRatios.map((ratio) => Math.max(ratio, 0))) ?? 0;
  const rawScore = interpolate(medianSurplusRatio, SURPLUS_CURVE);
  const incomeRatio = recognizedIncomePence / input.destinationBaseline.monthlyBaselinePence;
  const cap = 40 + 60 * Math.min(incomeRatio, 1);
  return { score: Math.min(rawScore, cap), cap };
}

function calculateCreditScore(
  credit: CreditAssessment,
  policy: CushScorePolicy,
): number | null {
  if (credit.evidenceQuality === null ||
      credit.evidenceQuality === "self_reported" ||
      credit.checkStatus === undefined ||
      credit.checkStatus === "not_done") return null;
  if (credit.score !== undefined && credit.score !== null) return credit.score;
  if (credit.classification === "incomplete" || credit.classification === "unavailable") return null;
  if (credit.classification === "thin_file") {
    return credit.checkStatus === "matched_thin" ? 50 : null;
  }
  return policy.creditMappings[credit.classification] ?? null;
}

function calculateWeightedScore(scores: CushScoreResult["componentScores"]): number | null {
  const entries = Object.entries(COMPONENT_WEIGHTS) as Array<
    [keyof typeof COMPONENT_WEIGHTS, number]
  >;
  if (entries.some(([key]) => scores[key] === null)) return null;
  const weighted = entries.reduce((total, [key, weight]) => total + (scores[key] ?? 0) * weight, 0);
  return Math.max(0, Math.min(1000, Math.round(weighted * 10)));
}

function calculateProvisionalScore(scores: CushScoreResult["componentScores"]): {
  score: number | null;
  coveragePercent: number;
  componentCount: number;
} {
  const entries = Object.entries(COMPONENT_WEIGHTS) as Array<
    [keyof typeof COMPONENT_WEIGHTS, number]
  >;
  const available = entries.filter(([key]) => scores[key] !== null);
  const availableWeight = available.reduce((total, [, weight]) => total + weight, 0);
  if (availableWeight === 0) {
    return { score: null, coveragePercent: 0, componentCount: 0 };
  }
  const weightedAverage = available.reduce(
    (total, [key, weight]) => total + (scores[key] ?? 0) * weight,
    0,
  ) / availableWeight;
  return {
    score: Math.max(0, Math.min(1000, Math.round(weightedAverage * 10))),
    coveragePercent: Math.round(availableWeight * 100),
    componentCount: available.length,
  };
}

export function calculateCushScore(
  input: CushScoreInput,
  policy: CushScorePolicy,
): CushScoreResult {
  validateInput(input, policy);

  const usableHistoryMonths = new Set(
    input.cashFlowHistory
      .filter((item) => item.complete && isWithinAssessmentWindow(input.assessmentMonth, item.month))
      .map((item) => item.month),
  ).size;
  const funds = calculateFundsScore(input);
  const recognizedMonthlyIncomePence = calculateRecognizedMonthlyIncome(input);
  const incomeScore = calculateIncomeScore(
    recognizedMonthlyIncomePence,
    input.destinationBaseline?.monthlyBaselinePence ?? null,
  );
  const cashFlow = calculateCashFlowScore(input, recognizedMonthlyIncomePence);
  const creditScore = calculateCreditScore(input.credit, policy);

  const componentScores = {
    availableFunds: funds.score,
    incomeStrength: incomeScore,
    cashFlow: cashFlow.score,
    creditHistory: creditScore,
  };
  const weightedTotal = calculateWeightedScore(componentScores);
  const provisional = calculateProvisionalScore(componentScores);
  const supportedFundsExist = input.availableFunds.some((fund) => fund.evidenceQuality !== "self_reported");
  const connectedOrStatementSourceExists = input.sourceEvidenceShares.some(
    (source) => source.sourceType !== "self_reported" && source.share > 0,
  );
  const incomeEvidenceSufficient = input.incomeHistory.some(
    (item) => item.recurring &&
      item.evidenceQuality !== "self_reported" &&
      isWithinAssessmentWindow(input.assessmentMonth, item.month),
  ) || (input.destinationBaseline?.countryCode === "GB" &&
    input.verifiedUkEmploymentOffer?.evidenceQuality === "verified");
  const cashFlowEvidenceSufficient = input.cashFlowHistory.filter(
    (item) => item.complete &&
      item.evidenceQuality !== "self_reported" &&
      isWithinAssessmentWindow(input.assessmentMonth, item.month),
  ).length >= 4;
  const creditCheckStatus = input.credit.checkStatus ?? "not_done";
  const creditAssessmentComplete =
    creditScore !== null &&
    creditCheckStatus !== "not_done" &&
    input.credit.evidenceQuality !== null &&
    input.credit.evidenceQuality !== "self_reported";

  const hasAnyInput =
    input.hasSubmittedFinancialData ||
    input.availableFunds.length > 0 ||
    input.incomeHistory.length > 0 ||
    input.cashFlowHistory.length > 0 ||
    input.credit.classification !== "unavailable" ||
    (input.credit.checkStatus !== undefined && input.credit.checkStatus !== "not_done");

  const missingRequirements: string[] = [];
  if (input.destinationBaseline === null) {
    missingRequirements.push("Selected destination and approved monthly baseline");
  }
  if (usableHistoryMonths < 4) missingRequirements.push("At least four months of usable financial history");
  if (!connectedOrStatementSourceExists) {
    missingRequirements.push("Connected bank account or verified bank statement");
  }
  if (!supportedFundsExist) missingRequirements.push("Verified evidence for available funds");
  if (!incomeEvidenceSufficient) missingRequirements.push("Documented or verified recurring income");
  if (!cashFlowEvidenceSufficient) missingRequirements.push("Four months of supported cash-flow history");
  if (!creditAssessmentComplete) missingRequirements.push("Completed, supported credit assessment");
  if (hasAnyInput && !policy.confidence) {
    missingRequirements.push("Approved confidence-scoring policy");
  }
  if (weightedTotal === null) missingRequirements.push("All four score components");

  const confidence = calculateConfidence(input, policy, usableHistoryMonths);
  const confidenceBand = confidence.score === null
    ? null
    : confidence.score < 40
      ? "low"
      : confidence.score < 70
        ? "medium"
        : "high";
  const isComplete =
    missingRequirements.length === 0 &&
    weightedTotal !== null &&
    confidence.score !== null;
  const status: CushScoreResult["assessmentStatus"] = !hasAnyInput
    ? "not_started"
    : isComplete
      ? "complete"
      : provisional.score !== null
        ? "provisional"
        : "incomplete";

  const weightedContributions = {
    availableFunds: componentScores.availableFunds === null
      ? null
      : Math.round(componentScores.availableFunds * COMPONENT_WEIGHTS.availableFunds * 10 * 100) / 100,
    incomeStrength: componentScores.incomeStrength === null
      ? null
      : Math.round(componentScores.incomeStrength * COMPONENT_WEIGHTS.incomeStrength * 10 * 100) / 100,
    cashFlow: componentScores.cashFlow === null
      ? null
      : Math.round(componentScores.cashFlow * COMPONENT_WEIGHTS.cashFlow * 10 * 100) / 100,
    creditHistory: componentScores.creditHistory === null
      ? null
      : Math.round(componentScores.creditHistory * COMPONENT_WEIGHTS.creditHistory * 10 * 100) / 100,
  };

  return {
    algorithmVersion: CUSH_SCORE_VERSION,
    assessmentStatus: status,
    cushScore: isComplete ? weightedTotal : null,
    provisionalScore: isComplete ? null : provisional.score,
    scoreCoveragePercent: provisional.coveragePercent,
    scoredComponentCount: provisional.componentCount,
    confidenceScore: confidence.score,
    confidenceBand,
    componentScores: Object.fromEntries(
      Object.entries(componentScores).map(([key, value]) => [
        key,
        value === null ? null : Math.round(value * 100) / 100,
      ]),
    ) as CushScoreResult["componentScores"],
    weightedContributions,
    confidenceBreakdown: confidence.breakdown,
    recognizedMonthlyIncomePence,
    fundsMonths: funds.months === null ? null : Math.round(funds.months * 10000) / 10000,
    incomeRatio: recognizedMonthlyIncomePence === null || input.destinationBaseline === null
      ? null
      : Math.round((recognizedMonthlyIncomePence / input.destinationBaseline.monthlyBaselinePence) * 10000) / 10000,
    cashFlowCap: cashFlow.cap === null ? null : Math.round(cashFlow.cap * 100) / 100,
    usableHistoryMonths,
    missingRequirements,
    assessmentContext: {
      individualUserId: input.individualUserId,
      destinationBaseline: input.destinationBaseline,
    },
  };
}
