/**
 * Cush Score V2 calculation engine.
 *
 * This module is deliberately pure and is not wired to the current passport
 * routes yet. All monetary inputs must already be normalised to GBP pence by
 * a trusted, separately audited ingestion layer.
 */

export const CUSH_SCORE_VERSION = "2.0.0";

export type EvidenceQuality = "verified" | "documented" | "self_reported";

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
}

export interface ConfirmedIntegrityFlag {
  id: string;
  reason: string;
  evidenceReference: string;
  recordedAt: string;
  reviewStatus: "pending" | "confirmed" | "dismissed";
}

export interface CushScorePolicy {
  /**
   * The prompt fixes thin-file at 50. Other credit mappings are intentionally
   * required from an approved policy; this engine invents no bureau mapping.
   */
  creditMappings: Partial<Record<Exclude<CreditClassification, "thin_file" | "incomplete" | "unavailable">, number>>;
  confidence: {
    historyMonthsForMaximum: number;
    evidenceQualityWeights: Record<EvidenceQuality, number>;
    creditAvailabilityWeights: Record<EvidenceQuality, number>;
    incomeReliabilityByCategory: Record<IncomeCategory, number>;
    freshnessBands: Array<{ maxAgeDays: number; points: number }>;
  };
}

export interface CushScoreInput {
  individualUserId: number;
  destination: string;
  baselineMonthlyPence: number;
  baselineEffectiveDate: string;
  assessmentMonth: string;
  countryCode: string;
  availableFunds: AvailableFund[];
  incomeHistory: MonthlyIncomeObservation[];
  /** One quality entry per distinct evidence source, not per monthly observation. */
  sourceEvidenceQualities: EvidenceQuality[];
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
  /** Only present when all minimum requirements are met. */
  cushScore: number | null;
  /** Present when all four component values exist but gating is not complete. */
  provisionalScore: number | null;
  confidenceScore: number | null;
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
    destination: string;
    baselineMonthlyPence: number;
    baselineEffectiveDate: string;
    countryCode: string;
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
const INCOME_CATEGORIES: IncomeCategory[] = [
  "salary",
  "self_employment",
  "freelance",
  "business",
  "scholarship",
  "family_support",
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

function assertUnitInterval(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1.`);
  }
}

function assertEvidenceQuality(value: string, label: string): asserts value is EvidenceQuality {
  if (!QUALITY_VALUES.includes(value as EvidenceQuality)) {
    throw new Error(`${label} is not a supported evidence quality.`);
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
  if (!Number.isInteger(policy.confidence.historyMonthsForMaximum) ||
      policy.confidence.historyMonthsForMaximum < 1) {
    throw new Error("Confidence historyMonthsForMaximum must be a positive integer.");
  }
  for (const quality of QUALITY_VALUES) {
    assertUnitInterval(policy.confidence.evidenceQualityWeights[quality], `evidenceQualityWeights.${quality}`);
    assertUnitInterval(policy.confidence.creditAvailabilityWeights[quality], `creditAvailabilityWeights.${quality}`);
  }
  for (const category of INCOME_CATEGORIES) {
    assertUnitInterval(policy.confidence.incomeReliabilityByCategory[category], `incomeReliabilityByCategory.${category}`);
  }
  for (const [classification, score] of Object.entries(policy.creditMappings)) {
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`Credit mapping for ${classification} must be between 0 and 100.`);
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

function sourceQualityPoints(
  qualities: EvidenceQuality[],
  weights: Record<EvidenceQuality, number>,
  maximum: number,
): number {
  if (!qualities.length) return 0;
  return maximum * qualities.reduce((sum, quality) => sum + weights[quality], 0) / qualities.length;
}

function calculateConfidence(
  input: CushScoreInput,
  policy: CushScorePolicy,
  usableHistoryMonths: number,
): { score: number | null; breakdown: ConfidenceBreakdown | null } {
  const hasAssessmentData =
    input.availableFunds.length > 0 ||
    input.incomeHistory.length > 0 ||
    input.cashFlowHistory.length > 0 ||
    input.credit.classification !== "unavailable";
  if (!hasAssessmentData) return { score: null, breakdown: null };

  const historyDepth = Math.min(
    usableHistoryMonths / policy.confidence.historyMonthsForMaximum,
    1,
  ) * 30;

  const sourceQuality = sourceQualityPoints(
    input.sourceEvidenceQualities,
    policy.confidence.evidenceQualityWeights,
    25,
  );

  const creditAvailability = input.credit.evidenceQuality
    ? 15 * policy.confidence.creditAvailabilityWeights[input.credit.evidenceQuality]
    : 0;

  let freshness = 0;
  if (input.dataAgeDays !== null) {
    for (const band of policy.confidence.freshnessBands) {
      if (input.dataAgeDays <= band.maxAgeDays) {
        freshness = band.points;
        break;
      }
    }
  }

  const accountCoverage = input.declaredAccountCount > 0
    ? 10 * Math.min(input.coveredAccountCount / input.declaredAccountCount, 1)
    : 0;

  const incomeCategories = [...new Set(
    input.incomeHistory.filter((item) => item.recurring).map((item) => item.category),
  )];
  const incomeReliability = incomeCategories.length
    ? 10 * incomeCategories.reduce(
      (sum, category) => sum + policy.confidence.incomeReliabilityByCategory[category],
      0,
    ) / incomeCategories.length
    : 0;

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
  if (!input.destination.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.baselineEffectiveDate)) {
    throw new Error("Destination and baseline effective date are required.");
  }
  const baselineDate = new Date(`${input.baselineEffectiveDate}T00:00:00Z`);
  if (!Number.isFinite(baselineDate.getTime()) ||
      baselineDate.toISOString().slice(0, 10) !== input.baselineEffectiveDate) {
    throw new Error("baselineEffectiveDate must be a valid calendar date.");
  }
  assertMonth(input.assessmentMonth, "assessmentMonth");
  assertNonNegativeInteger(input.baselineMonthlyPence, "baselineMonthlyPence");
  if (input.baselineMonthlyPence === 0) throw new Error("baselineMonthlyPence must be greater than zero.");
  if (!/^[A-Z]{2}$/.test(input.countryCode)) throw new Error("countryCode must be a two-letter uppercase code.");
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

  for (const quality of input.sourceEvidenceQualities) {
    assertEvidenceQuality(quality, "sourceEvidenceQualities entry");
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
    if (!item.recurring || !isWithinAssessmentWindow(input.assessmentMonth, item.month)) continue;
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
  if (offer && input.countryCode === "GB" && offer.evidenceQuality === "verified") {
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
  if (verifiedFunds.length === 0) return { score: null, months: null };
  const accessiblePence = sumSafeIntegers(
    verifiedFunds.filter((fund) => fund.accessible).map((fund) => fund.amountPence),
    "Available funds",
  );
  const months = accessiblePence / input.baselineMonthlyPence;
  return { score: interpolate(months, FUNDS_CURVE), months };
}

function calculateIncomeScore(recognizedIncomePence: number | null, baselinePence: number): number | null {
  if (recognizedIncomePence === null) return null;
  return interpolate(recognizedIncomePence / baselinePence, INCOME_CURVE);
}

function calculateCashFlowScore(
  input: CushScoreInput,
  recognizedIncomePence: number | null,
): { score: number | null; cap: number | null } {
  const completeMonths = input.cashFlowHistory.filter(
    (item) => item.complete && isWithinAssessmentWindow(input.assessmentMonth, item.month),
  );
  if (completeMonths.length === 0 || recognizedIncomePence === null) {
    return { score: null, cap: null };
  }
  if (recognizedIncomePence <= 0) return { score: 0, cap: 40 };

  const monthlyRatios = completeMonths.map((item) =>
    (item.eligibleRecurringIncomePence - item.eligibleExpensesPence) / recognizedIncomePence,
  );
  const medianSurplusRatio = median(monthlyRatios.map((ratio) => Math.max(ratio, 0))) ?? 0;
  const rawScore = interpolate(medianSurplusRatio, SURPLUS_CURVE);
  const incomeRatio = recognizedIncomePence / input.baselineMonthlyPence;
  const cap = 40 + 60 * Math.min(incomeRatio, 1);
  return { score: Math.min(rawScore, cap), cap };
}

function calculateCreditScore(
  credit: CreditAssessment,
  policy: CushScorePolicy,
): number | null {
  if (credit.classification === "incomplete" || credit.classification === "unavailable") return null;
  if (credit.classification === "thin_file") return 50;
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
  const incomeScore = calculateIncomeScore(recognizedMonthlyIncomePence, input.baselineMonthlyPence);
  const cashFlow = calculateCashFlowScore(input, recognizedMonthlyIncomePence);
  const creditScore = calculateCreditScore(input.credit, policy);

  const componentScores = {
    availableFunds: funds.score,
    incomeStrength: incomeScore,
    cashFlow: cashFlow.score,
    creditHistory: creditScore,
  };
  const weightedTotal = calculateWeightedScore(componentScores);
  const verifiedFundsExist = input.availableFunds.some((fund) => fund.evidenceQuality === "verified");
  const incomeEvidenceSufficient = input.incomeHistory.some(
    (item) => item.recurring &&
      item.evidenceQuality !== "self_reported" &&
      isWithinAssessmentWindow(input.assessmentMonth, item.month),
  ) || (input.countryCode === "GB" &&
    input.verifiedUkEmploymentOffer?.evidenceQuality === "verified");
  const cashFlowEvidenceSufficient = input.cashFlowHistory.filter(
    (item) => item.complete &&
      item.evidenceQuality !== "self_reported" &&
      isWithinAssessmentWindow(input.assessmentMonth, item.month),
  ).length >= 4;
  const creditAssessmentComplete =
    creditScore !== null &&
    input.credit.evidenceQuality !== null &&
    input.credit.evidenceQuality !== "self_reported";

  const missingRequirements: string[] = [];
  if (usableHistoryMonths < 4) missingRequirements.push("At least four months of usable financial history");
  if (!verifiedFundsExist) missingRequirements.push("Verified evidence for available funds");
  if (!incomeEvidenceSufficient) missingRequirements.push("Documented or verified recurring income");
  if (!cashFlowEvidenceSufficient) missingRequirements.push("Four months of supported cash-flow history");
  if (!creditAssessmentComplete) missingRequirements.push("Completed, supported credit assessment");
  if (weightedTotal === null) missingRequirements.push("All four score components");

  const isComplete = missingRequirements.length === 0 && weightedTotal !== null;
  const hasAnyInput =
    input.availableFunds.length > 0 ||
    input.incomeHistory.length > 0 ||
    input.cashFlowHistory.length > 0 ||
    input.credit.classification !== "unavailable";
  const confidence = calculateConfidence(input, policy, usableHistoryMonths);
  const status: CushScoreResult["assessmentStatus"] = !hasAnyInput
    ? "not_started"
    : isComplete
      ? "complete"
      : weightedTotal === null
        ? "incomplete"
        : "provisional";

  const weightedContributions = {
    availableFunds: componentScores.availableFunds === null
      ? null
      : Math.round(componentScores.availableFunds * COMPONENT_WEIGHTS.availableFunds * 100) / 100,
    incomeStrength: componentScores.incomeStrength === null
      ? null
      : Math.round(componentScores.incomeStrength * COMPONENT_WEIGHTS.incomeStrength * 100) / 100,
    cashFlow: componentScores.cashFlow === null
      ? null
      : Math.round(componentScores.cashFlow * COMPONENT_WEIGHTS.cashFlow * 100) / 100,
    creditHistory: componentScores.creditHistory === null
      ? null
      : Math.round(componentScores.creditHistory * COMPONENT_WEIGHTS.creditHistory * 100) / 100,
  };

  return {
    algorithmVersion: CUSH_SCORE_VERSION,
    assessmentStatus: status,
    cushScore: isComplete ? weightedTotal : null,
    provisionalScore: !isComplete ? weightedTotal : null,
    confidenceScore: confidence.score,
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
    incomeRatio: recognizedMonthlyIncomePence === null
      ? null
      : Math.round((recognizedMonthlyIncomePence / input.baselineMonthlyPence) * 10000) / 10000,
    cashFlowCap: cashFlow.cap === null ? null : Math.round(cashFlow.cap * 100) / 100,
    usableHistoryMonths,
    missingRequirements,
    assessmentContext: {
      individualUserId: input.individualUserId,
      destination: input.destination,
      baselineMonthlyPence: input.baselineMonthlyPence,
      baselineEffectiveDate: input.baselineEffectiveDate,
      countryCode: input.countryCode,
    },
  };
}
