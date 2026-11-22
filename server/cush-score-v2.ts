import { and, desc, eq } from "drizzle-orm";
import {
  cushAssessmentInputs,
  cushEvidenceFreshnessReviews,
  cushPassportAssessmentHistory,
  cushPassportEvidenceSubmissions,
  cushPassportFinancialProfiles,
  cushPassportPostArrivalFinancialProfiles,
  cushPostArrivalProfiles,
  cushScorePolicyVersions,
  cushScorePolicyConfigSchema,
  interswitchCreditHistoryEvidence,
  monoLinkedAccounts,
  monoV2AssessmentEvidence,
  monoV2AssessmentEvidenceSchema,
  v2AssessmentInputSchema,
  type CushScorePolicyConfig,
  type V2AssessmentInput,
  type MonoV2AssessmentEvidence,
} from "@shared/schema";
import { db } from "./db";
import {
  calculateCushScore,
  COMPONENT_WEIGHTS,
  CUSH_SCORE_VERSION,
  type CushScoreInput,
  type CushScoreResult,
  type CushScorePolicy,
  type DestinationBaseline,
} from "./cush-score-service";
import {
  toCustomerCalculation,
  type CustomerCalculation,
} from "./cush-score-presentation";
import {
  INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION,
  creditAssessmentFromInterswitchEvidence,
} from "./interswitch-credit-history-scoring";
import { interswitchCreditHistoryClient } from "./interswitch-credit-history-service";
import { ageInDays, resolveEvidenceFreshnessDate } from "./evidence-freshness";
import {
  selectVersionedDestinationBaseline,
  type DestinationBaselinePolicy,
} from "./cush-score-policy-selection";
import {
  describeAssessmentChange,
  fingerprintAssessmentInputs,
  getAssessmentMaturity,
} from "./passport-assessment-history";
import {
  decryptEvidenceJson,
  EvidenceEncryptionUnavailableError,
  getFinancialProfileProgress,
  passportFinancialProfileSchema,
  type PassportFinancialProfile,
} from "./passport-evidence-service";
import { buildProfileScoreInputs } from "./passport-manual-score-input";

export const EMPTY_V2_ASSESSMENT: V2AssessmentInput = {
  selectedBaselineId: null,
  availableFunds: [],
  incomeHistory: [],
  cashFlowHistory: [],
  creditClassification: "unavailable",
};

export interface V2AssessmentView {
  calculation: CustomerCalculation;
  monoImports: Array<{
    linkedAccountId: number;
    fetchedAt: string;
    statementPeriodMonths: number;
    balancePence: number | null;
    incomeMonths: number;
    cashFlowMonths: number;
  }>;
  schemaReady: true;
  monoDataReady: boolean;
  unscoredCurrencyCodes: string[];
  progression: {
    maturityStatus: "getting_started" | "provisional" | "evidence_supported" | "institution_supported";
    sourceTypes: string[];
    preArrival: ReturnType<typeof getFinancialProfileProgress>;
    postArrival: ReturnType<typeof getFinancialProfileProgress> & { activated: boolean };
    documents: { submitted: number; approved: number };
    nextActions: string[];
    historyReady: boolean;
    history: Array<{
      id: number;
      previousScore: number | null;
      score: number | null;
      previousConfidence: number | null;
      confidence: number | null;
      scoreCoveragePercent: number;
      assessmentStatus: string;
      maturityStatus: string;
      sourceTypes: string[];
      changedInformation: string[];
      changeSummary: string;
      createdAt: string;
    }>;
  };
}

export class ScoringPolicyValidationError extends Error {}

function asPolicyConfig(value: unknown): CushScorePolicyConfig {
  return cushScorePolicyConfigSchema.parse(value);
}

function engineInput(
  userId: number,
  input: V2AssessmentInput,
  destinationBaseline: DestinationBaseline | null,
  now: Date,
  monoImports: Array<{ id: number; linkedAccountId: number; fetchedAt: Date; evidence: MonoV2AssessmentEvidence }>,
  linkedAccountCount: number,
  creditHistoryEvidence: { id: number; evidenceData: unknown; mappingVersion: string; fetchedAt: Date } | null,
  freshnessReviews: Array<typeof cushEvidenceFreshnessReviews.$inferSelect> = [],
  reviewedStatementCount = 0,
): CushScoreInput {
  const monoMonthSet = new Set(monoImports.flatMap(({ evidence }) =>
    evidence.cashFlowHistory.map((item) => item.month),
  ));
  const monoFunds = monoImports.flatMap(({ evidence }) => evidence.availableFunds);
  const monoIncome = monoImports.flatMap(({ evidence }) => evidence.incomeHistory);
  const monoCashFlows = new Map<string, {
    eligibleRecurringIncomePence: number;
    eligibleExpensesPence: number;
    completeAccountIds: Set<number>;
  }>();
  for (const imported of monoImports) {
    for (const item of imported.evidence.cashFlowHistory) {
      const month = monoCashFlows.get(item.month) ?? {
        eligibleRecurringIncomePence: 0,
        eligibleExpensesPence: 0,
        completeAccountIds: new Set<number>(),
      };
      month.eligibleRecurringIncomePence += item.eligibleRecurringIncomePence;
      month.eligibleExpensesPence += item.eligibleExpensesPence;
      if (item.complete) month.completeAccountIds.add(imported.linkedAccountId);
      monoCashFlows.set(item.month, month);
    }
  }
  const monoCashFlowRows = [...monoCashFlows.entries()].map(([month, value]) => ({
    month,
    eligibleRecurringIncomePence: value.eligibleRecurringIncomePence,
    eligibleExpensesPence: value.eligibleExpensesPence,
    complete: monoImports.length > 0 &&
      monoImports.length === linkedAccountCount &&
      value.completeAccountIds.size === monoImports.length,
    evidenceQuality: "documented" as const,
  }));
  const manualIncome = input.incomeHistory.filter((item) => !monoMonthSet.has(item.month));
  const manualCashFlow = input.cashFlowHistory.filter((item) => !monoMonthSet.has(item.month));
  const manualFunds = input.availableFunds.map((item) => ({
    id: `self-reported-${item.id}`,
    deduplicationKey: `self-reported-${item.deduplicationKey}`,
    amountPence: item.amountPence,
    accessible: item.accessible,
    evidenceQuality: "self_reported" as const,
  }));
  const hasSubmittedFinancialData =
    input.availableFunds.length > 0 ||
    input.incomeHistory.length > 0 ||
    input.cashFlowHistory.length > 0 ||
    monoFunds.length > 0 ||
    monoIncome.length > 0 ||
    monoCashFlowRows.length > 0;
  const monoRecordCount = monoFunds.length + monoIncome.length + monoCashFlowRows.length;
  const selfReportedRecordCount = manualFunds.length + manualIncome.length + manualCashFlow.length;
  const sourceRecordCount = monoRecordCount + selfReportedRecordCount + reviewedStatementCount;
  const sourceEvidenceShares = sourceRecordCount === 0
    ? []
    : [
        ...(monoRecordCount > 0 ? [{ sourceType: "bank_connection" as const, share: monoRecordCount / sourceRecordCount }] : []),
        ...(reviewedStatementCount > 0 ? [{ sourceType: "verified_statement" as const, share: reviewedStatementCount / sourceRecordCount }] : []),
        ...(selfReportedRecordCount > 0 ? [{ sourceType: "self_reported" as const, share: selfReportedRecordCount / sourceRecordCount }] : []),
      ];
  const creditAssessment = creditHistoryEvidence
    ? creditAssessmentFromInterswitchEvidence(
        creditHistoryEvidence.evidenceData,
        creditHistoryEvidence.mappingVersion,
      )
    : creditAssessmentFromInterswitchEvidence(null, INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION);
  const freshnessAges: number[] = [];
  for (const imported of monoImports) {
    const candidateReview = freshnessReviews.find((item) => item.monoEvidenceId === imported.id);
    const review = candidateReview?.evidenceFetchedAt.getTime() === imported.fetchedAt.getTime()
      ? candidateReview
      : undefined;
    const dateCandidates = [
      ...(imported.evidence.statementDataThroughDate ? [imported.evidence.statementDataThroughDate] : []),
      ...(imported.evidence.balanceAsOfDate ? [imported.evidence.balanceAsOfDate] : []),
    ];
    const hasStatementEvidence = imported.evidence.incomeHistory.length > 0 ||
      imported.evidence.cashFlowHistory.length > 0;
    const hasBalanceEvidence = imported.evidence.availableFunds.length > 0;
    const candidateDates = [
      ...(hasStatementEvidence
        ? [imported.evidence.statementDataThroughDate ?? null]
        : []),
      ...(hasBalanceEvidence
        ? [imported.evidence.balanceAsOfDate ?? null]
        : []),
    ];
    const reviewedSourceDate = review?.decision === "confirm_source_date"
      ? review.confirmedSourceDate
      : null;
    const reviewedDateDecision = review?.decision as "confirm_source_date" | "confirm_retrieval_date" | undefined;
    const sourceDate = reviewedSourceDate ?? dateCandidates.sort()[0] ?? null;
    const resolved = resolveEvidenceFreshnessDate({
      sourceDate,
      retrievedAt: imported.fetchedAt,
      reviewDecision: reviewedDateDecision,
      reviewedSourceDate,
      now,
    });
    const age = ageInDays(resolved.effectiveDate, now);
    if (age !== null) freshnessAges.push(age);
  }
  if (creditHistoryEvidence) {
    const candidateReview = freshnessReviews.find((item) => item.creditEvidenceId === creditHistoryEvidence.id);
    const review = candidateReview?.evidenceFetchedAt.getTime() === creditHistoryEvidence.fetchedAt.getTime()
      ? candidateReview
      : undefined;
    const creditData = creditHistoryEvidence.evidenceData as { sourceReportDate?: unknown } | null;
    const sourceReportDate = typeof creditData?.sourceReportDate === "string"
      ? creditData.sourceReportDate
      : null;
    const reviewDecision = review?.decision as "confirm_source_date" | "confirm_retrieval_date" | undefined;
    const resolved = resolveEvidenceFreshnessDate({
      sourceDate: sourceReportDate,
      retrievedAt: creditHistoryEvidence.fetchedAt,
      reviewDecision,
      reviewedSourceDate: review?.decision === "confirm_source_date"
        ? review.confirmedSourceDate
        : null,
      now,
    });
    const age = ageInDays(resolved.effectiveDate, now);
    if (age !== null) freshnessAges.push(age);
  }
  // Confidence reflects the least-fresh contributing source. Age never removes
  // otherwise valid or relevant evidence from score processing.
  const dataAgeDays = freshnessAges.length ? Math.max(...freshnessAges) : null;
  return {
    individualUserId: userId,
    assessmentMonth: now.toISOString().slice(0, 7),
    destinationBaseline,
    hasSubmittedFinancialData,
    availableFunds: [
      ...manualFunds,
      ...monoFunds.map((item) => ({
        id: item.id,
        deduplicationKey: item.deduplicationKey,
        amountPence: item.amountPence,
        accessible: item.accessible,
        evidenceQuality: "verified" as const,
      })),
    ],
    incomeHistory: [
      ...manualIncome.map((item) => ({
        month: item.month,
        sourceId: item.sourceId,
        category: item.category,
        amountPence: item.amountPence,
        recurring: item.recurring,
        variable: item.variable,
        evidenceQuality: "self_reported" as const,
      })),
      ...monoIncome.map((item) => ({
      month: item.month,
      sourceId: item.sourceId,
      category: item.category,
      amountPence: item.amountPence,
      recurring: item.recurring,
      variable: item.variable,
        evidenceQuality: "documented" as const,
      })),
    ],
    sourceEvidenceShares,
    cashFlowHistory: [
      ...manualCashFlow.map((item) => ({
      month: item.month,
      eligibleRecurringIncomePence: item.eligibleRecurringIncomePence,
      eligibleExpensesPence: item.eligibleExpensesPence,
      complete: item.complete,
        evidenceQuality: "self_reported" as const,
      })),
      ...monoCashFlowRows,
    ],
    // User-entered classifications are not supported evidence for V2 scoring.
    credit: creditAssessment,
    dataAgeDays,
    coveredAccountCount: monoImports.length,
    declaredAccountCount: Math.max(linkedAccountCount, monoImports.length),
    integrityFlags: [],
  };
}

async function loadMonoImports(userId: number) {
  const rows = await db.select({
    id: monoV2AssessmentEvidence.id,
    linkedAccountId: monoV2AssessmentEvidence.monoLinkedAccountId,
    evidenceData: monoV2AssessmentEvidence.evidenceData,
    fetchedAt: monoV2AssessmentEvidence.fetchedAt,
    statementPeriodMonths: monoV2AssessmentEvidence.statementPeriodMonths,
  }).from(monoV2AssessmentEvidence)
    .where(eq(monoV2AssessmentEvidence.userId, userId));
  return rows.map((row) => ({
    id: row.id,
    linkedAccountId: row.linkedAccountId,
    fetchedAt: row.fetchedAt,
    statementPeriodMonths: row.statementPeriodMonths,
    evidence: monoV2AssessmentEvidenceSchema.parse(row.evidenceData),
  }));
}

async function loadMonoAssessmentData(userId: number) {
  try {
    const [imports, linkedAccounts] = await Promise.all([
      loadMonoImports(userId),
      db.select({ id: monoLinkedAccounts.id }).from(monoLinkedAccounts)
        .where(eq(monoLinkedAccounts.userId, userId)),
    ]);
    return { imports, linkedAccountCount: linkedAccounts.length, monoDataReady: true };
  } catch (error) {
    if (isV2SchemaMissing(error)) {
      return { imports: [], linkedAccountCount: 0, monoDataReady: false };
    }
    throw error;
  }
}

async function loadCreditHistoryEvidence(userId: number) {
  const providerReadiness = interswitchCreditHistoryClient.getReadiness();
  if (providerReadiness.mode !== "production" || !providerReadiness.configured) return null;
  try {
    const [row] = await db.select({
      id: interswitchCreditHistoryEvidence.id,
      evidenceData: interswitchCreditHistoryEvidence.evidenceData,
      mappingVersion: interswitchCreditHistoryEvidence.mappingVersion,
      fetchedAt: interswitchCreditHistoryEvidence.fetchedAt,
    }).from(interswitchCreditHistoryEvidence)
      .where(eq(interswitchCreditHistoryEvidence.userId, userId))
      .orderBy(desc(interswitchCreditHistoryEvidence.fetchedAt))
      .limit(1);
    return row ?? null;
  } catch (error) {
    if (isCreditHistorySchemaMissing(error)) return null;
    throw error;
  }
}

async function loadEvidenceFreshnessReviews(userId: number) {
  try {
    return await db.select().from(cushEvidenceFreshnessReviews)
      .where(eq(cushEvidenceFreshnessReviews.userId, userId));
  } catch (error) {
    if (isV2SchemaMissing(error)) return [];
    throw error;
  }
}

async function loadStoredInputs(userId: number) {
  const [row] = await db.select().from(cushAssessmentInputs).where(eq(cushAssessmentInputs.userId, userId)).limit(1);
  return {
    input: row ? v2AssessmentInputSchema.parse(row.inputData) : EMPTY_V2_ASSESSMENT,
    updatedAt: row?.updatedAt ?? null,
  };
}

async function loadFinancialProfile(userId: number) {
  try {
    const [row] = await db.select({
      encryptedProfile: cushPassportFinancialProfiles.encryptedProfile,
      updatedAt: cushPassportFinancialProfiles.updatedAt,
    }).from(cushPassportFinancialProfiles)
      .where(eq(cushPassportFinancialProfiles.userId, userId))
      .limit(1);
    return {
      profile: row
        ? passportFinancialProfileSchema.parse(decryptEvidenceJson<unknown>(row.encryptedProfile))
        : null,
      updatedAt: row?.updatedAt ?? null,
    };
  } catch (error) {
    if (isV2SchemaMissing(error)) return { profile: null, updatedAt: null };
    throw error;
  }
}

async function loadPostArrivalFinancialProfile(userId: number) {
  try {
    const [arrival] = await db.select({
      arrivalStatus: cushPostArrivalProfiles.arrivalStatus,
      updatedAt: cushPostArrivalProfiles.updatedAt,
    })
      .from(cushPostArrivalProfiles)
      .where(eq(cushPostArrivalProfiles.userId, userId))
      .limit(1);
    if (arrival?.arrivalStatus !== "arrived") {
      return { profile: null, updatedAt: arrival?.updatedAt ?? null, activated: false };
    }
    const [row] = await db.select({
      encryptedProfile: cushPassportPostArrivalFinancialProfiles.encryptedProfile,
      updatedAt: cushPassportPostArrivalFinancialProfiles.updatedAt,
    }).from(cushPassportPostArrivalFinancialProfiles)
      .where(eq(cushPassportPostArrivalFinancialProfiles.userId, userId))
      .limit(1);
    return {
      profile: row
        ? passportFinancialProfileSchema.parse(decryptEvidenceJson<unknown>(row.encryptedProfile))
        : null,
      updatedAt: row?.updatedAt ?? arrival.updatedAt,
      activated: true,
    };
  } catch (error) {
    if (isV2SchemaMissing(error)) return { profile: null, updatedAt: null, activated: false };
    throw error;
  }
}

async function loadEvidenceDocumentProgress(userId: number) {
  try {
    const rows = await db.select({
      reviewStatus: cushPassportEvidenceSubmissions.reviewStatus,
      evidenceClassification: cushPassportEvidenceSubmissions.evidenceClassification,
      documentType: cushPassportEvidenceSubmissions.documentType,
      id: cushPassportEvidenceSubmissions.id,
      updatedAt: cushPassportEvidenceSubmissions.updatedAt,
    }).from(cushPassportEvidenceSubmissions)
      .where(eq(cushPassportEvidenceSubmissions.userId, userId));
    return {
      submitted: rows.length,
      approved: rows.filter((row) => row.reviewStatus === "approved").length,
      reviewedStatements: rows.filter((row) =>
        row.reviewStatus === "approved" &&
        row.documentType === "bank_statement" &&
        ["document_supported", "independently_verified", "institution_confirmed"].includes(row.evidenceClassification),
      ).length,
      reviewedStatementEvidence: rows
        .filter((row) =>
          row.reviewStatus === "approved" &&
          row.documentType === "bank_statement" &&
          ["document_supported", "independently_verified", "institution_confirmed"].includes(row.evidenceClassification),
        )
        .map((row) => `${row.id}:${row.updatedAt.toISOString()}`)
        .sort(),
    };
  } catch (error) {
    if (isV2SchemaMissing(error)) {
      return { submitted: 0, approved: 0, reviewedStatements: 0, reviewedStatementEvidence: [] };
    }
    throw error;
  }
}

function mergeManualProfileInputs(
  input: V2AssessmentInput,
  profileInput: Pick<V2AssessmentInput, "availableFunds" | "incomeHistory" | "cashFlowHistory">,
): V2AssessmentInput {
  const profileFundKeys = new Set(profileInput.availableFunds.map((fund) => fund.deduplicationKey.toLowerCase()));
  const profileIncomeKeys = new Set(profileInput.incomeHistory.map((income) => `${income.sourceId}:${income.month}`));
  const profileCashFlowMonths = new Set(profileInput.cashFlowHistory.map((row) => row.month));
  return {
    ...input,
    availableFunds: [
      ...input.availableFunds.filter((fund) => !profileFundKeys.has(fund.deduplicationKey.toLowerCase())),
      ...profileInput.availableFunds,
    ],
    incomeHistory: [
      ...input.incomeHistory.filter((income) => !profileIncomeKeys.has(`${income.sourceId}:${income.month}`)),
      ...profileInput.incomeHistory,
    ],
    cashFlowHistory: [
      ...input.cashFlowHistory.filter((row) => !profileCashFlowMonths.has(row.month)),
      ...profileInput.cashFlowHistory,
    ],
  };
}

async function loadActivePolicy() {
  const [row] = await db.select().from(cushScorePolicyVersions)
    .where(eq(cushScorePolicyVersions.status, "active"))
    .orderBy(desc(cushScorePolicyVersions.version))
    .limit(1);
  return row ? { row, configuration: asPolicyConfig(row.configuration) } : null;
}

interface CalculatedV2Assessment {
  calculation: CushScoreResult;
  monoImports: Awaited<ReturnType<typeof loadMonoAssessmentData>>["imports"];
  monoDataReady: boolean;
  unscoredCurrencyCodes: string[];
  activePolicyVersion: number | null;
  baselinePolicy: DestinationBaselinePolicy | null;
  sourceTypes: string[];
  maturityStatus: V2AssessmentView["progression"]["maturityStatus"];
  inputFingerprint: string;
  preArrivalProgress: ReturnType<typeof getFinancialProfileProgress>;
  postArrivalProgress: ReturnType<typeof getFinancialProfileProgress> & { activated: boolean };
  documentProgress: { submitted: number; approved: number };
  sourceState: Record<string, unknown>;
}

function getChangedInformation(previous: unknown, current: Record<string, unknown>): string[] {
  const previousState = typeof previous === "object" && previous !== null
    ? previous as Record<string, unknown>
    : null;
  if (!previousState) return ["Initial assessment"];
  const labels: Record<string, string> = {
    algorithmVersion: "Scoring method",
    policyVersion: "Scoring policy",
    storedInputsUpdatedAt: "Manual assessment details",
    preArrivalUpdatedAt: "Pre-arrival financial profile",
    postArrivalUpdatedAt: "Post-arrival financial profile",
    bankEvidence: "Connected bank evidence",
    creditEvidenceAt: "Credit history evidence",
    reviewedStatementEvidence: "Reviewed bank statements",
  };
  return Object.keys(current)
    .filter((key) => JSON.stringify(previousState[key]) !== JSON.stringify(current[key]))
    .map((key) => labels[key] ?? "Assessment information");
}

async function calculateV2AssessmentForUser(
  userId: number,
  now: Date,
): Promise<CalculatedV2Assessment> {
  const [storedInputsResult, preArrivalProfileResult, postArrivalProfileResult, activePolicy, monoData, creditHistoryEvidence, freshnessReviews, documentProgress] = await Promise.all([
    loadStoredInputs(userId),
    loadFinancialProfile(userId),
    loadPostArrivalFinancialProfile(userId),
    loadActivePolicy(),
    loadMonoAssessmentData(userId),
    loadCreditHistoryEvidence(userId),
    loadEvidenceFreshnessReviews(userId),
    loadEvidenceDocumentProgress(userId),
  ]);
  const storedInputs = storedInputsResult.input;
  const preArrivalProfile = preArrivalProfileResult.profile;
  const postArrivalProfile = postArrivalProfileResult.profile;
  const [preArrivalInputs, postArrivalInputs] = await Promise.all([
    buildProfileScoreInputs(preArrivalProfile, now.toISOString().slice(0, 7)),
    buildProfileScoreInputs(postArrivalProfile, now.toISOString().slice(0, 7)),
  ]);
  const availableFundsByKey = new Map<string, (typeof preArrivalInputs.availableFunds)[number]>();
  for (const fund of [...preArrivalInputs.availableFunds, ...postArrivalInputs.availableFunds]) {
    availableFundsByKey.set(fund.deduplicationKey.toLowerCase(), fund);
  }
  const incomeBySourceMonth = new Map<string, (typeof preArrivalInputs.incomeHistory)[number]>();
  for (const income of [...preArrivalInputs.incomeHistory, ...postArrivalInputs.incomeHistory]) {
    incomeBySourceMonth.set(`${income.sourceId}:${income.month}`, income);
  }
  const cashFlowByMonth = new Map<string, (typeof preArrivalInputs.cashFlowHistory)[number]>();
  for (const row of [...preArrivalInputs.cashFlowHistory, ...postArrivalInputs.cashFlowHistory]) {
    cashFlowByMonth.set(row.month, row);
  }
  const profileInputs = {
    availableFunds: [...availableFundsByKey.values()],
    incomeHistory: [...incomeBySourceMonth.values()],
    cashFlowHistory: [...cashFlowByMonth.values()],
    unscoredCurrencyCodes: [...new Set([
      ...preArrivalInputs.unscoredCurrencyCodes,
      ...postArrivalInputs.unscoredCurrencyCodes,
    ])].sort(),
  };
  const inputs = mergeManualProfileInputs(storedInputs, profileInputs);
  const baselinePolicy = selectVersionedDestinationBaseline(
    activePolicy?.configuration ?? null,
    inputs.selectedBaselineId,
    now.toISOString().slice(0, 10),
  );
  const selectedBaseline: DestinationBaseline | null = baselinePolicy
    ? {
        destination: baselinePolicy.destination,
        monthlyBaselinePence: baselinePolicy.monthlyBaselinePence,
        effectiveDate: baselinePolicy.effectiveDate,
        countryCode: baselinePolicy.countryCode,
      }
    : null;
  const scoringPolicy: CushScorePolicy = activePolicy
    ? {
        creditMappings: activePolicy.configuration.creditMappings,
        ...(activePolicy.configuration.confidence
          ? { confidence: activePolicy.configuration.confidence }
          : {}),
      }
    : { creditMappings: {} };
  const calculation = calculateCushScore(
    engineInput(
      userId,
      inputs,
      selectedBaseline,
      now,
      monoData.imports,
      monoData.linkedAccountCount,
      creditHistoryEvidence,
      freshnessReviews,
      documentProgress.reviewedStatements,
    ),
    scoringPolicy,
  );
  const hasSelfDeclaredInputs = inputs.availableFunds.length > 0 ||
    inputs.incomeHistory.length > 0 ||
    inputs.cashFlowHistory.length > 0;
  const sourceTypes = [
    ...(hasSelfDeclaredInputs ? ["self_declared"] : []),
    ...(documentProgress.reviewedStatements > 0 ? ["verified_statement"] : []),
    ...(monoData.imports.length ? ["bank_connected"] : []),
    ...(creditHistoryEvidence ? ["credit_history"] : []),
  ];
  const maturityStatus = getAssessmentMaturity({
    hasScore: calculation.cushScore !== null || calculation.provisionalScore !== null,
    hasInstitutionCredit: Boolean(creditHistoryEvidence),
    hasBankConnection: monoData.imports.length > 0,
    hasReviewedStatement: documentProgress.reviewedStatements > 0,
  });
  const sourceState = {
    algorithmVersion: calculation.algorithmVersion,
    policyVersion: activePolicy?.row.version ?? null,
    storedInputsUpdatedAt: storedInputsResult.updatedAt?.toISOString() ?? null,
    preArrivalUpdatedAt: preArrivalProfileResult.updatedAt?.toISOString() ?? null,
    postArrivalUpdatedAt: postArrivalProfileResult.updatedAt?.toISOString() ?? null,
    bankEvidence: monoData.imports.map((item) => `${item.id}:${item.fetchedAt.toISOString()}`).sort(),
    creditEvidenceAt: creditHistoryEvidence?.fetchedAt.toISOString() ?? null,
    reviewedStatementEvidence: documentProgress.reviewedStatementEvidence,
  };
  const sourceFingerprint = {
    ...sourceState,
    result: {
      score: calculation.cushScore ?? calculation.provisionalScore,
      confidence: calculation.confidenceScore,
      coverage: calculation.scoreCoveragePercent,
      status: calculation.assessmentStatus,
      maturityStatus,
    },
  };
  const inputFingerprint = fingerprintAssessmentInputs(sourceFingerprint);
  return {
    calculation,
    monoImports: monoData.imports,
    monoDataReady: monoData.monoDataReady,
    unscoredCurrencyCodes: profileInputs.unscoredCurrencyCodes,
    activePolicyVersion: activePolicy?.row.version ?? null,
    baselinePolicy,
    sourceTypes,
    maturityStatus,
    inputFingerprint,
    sourceState,
    preArrivalProgress: getFinancialProfileProgress(preArrivalProfile),
    postArrivalProgress: {
      ...getFinancialProfileProgress(postArrivalProfile),
      activated: postArrivalProfileResult.activated,
    },
    documentProgress,
  };
}

async function recordAssessmentSnapshot(userId: number, result: CalculatedV2Assessment) {
  const [previous] = await db.select({
    score: cushPassportAssessmentHistory.score,
    confidence: cushPassportAssessmentHistory.confidence,
    sourceState: cushPassportAssessmentHistory.sourceState,
  }).from(cushPassportAssessmentHistory)
    .where(eq(cushPassportAssessmentHistory.userId, userId))
    .orderBy(desc(cushPassportAssessmentHistory.createdAt), desc(cushPassportAssessmentHistory.id))
    .limit(1);
  const score = result.calculation.cushScore ?? result.calculation.provisionalScore;
  const changedInformation = getChangedInformation(previous?.sourceState, result.sourceState);
  await db.insert(cushPassportAssessmentHistory).values({
    userId,
    inputFingerprint: result.inputFingerprint,
    sourceState: result.sourceState,
    algorithmVersion: result.calculation.algorithmVersion,
    policyVersion: result.activePolicyVersion,
    previousScore: previous?.score ?? null,
    score,
    previousConfidence: previous?.confidence ?? null,
    confidence: result.calculation.confidenceScore,
    scoreCoveragePercent: result.calculation.scoreCoveragePercent,
    assessmentStatus: result.calculation.assessmentStatus,
    maturityStatus: result.maturityStatus,
    sourceTypes: result.sourceTypes,
    changedInformation,
    changeSummary: describeAssessmentChange(previous, score, result.calculation.confidenceScore),
  }).onConflictDoNothing({
    target: [cushPassportAssessmentHistory.userId, cushPassportAssessmentHistory.inputFingerprint],
  });
}

export async function getV2Assessment(userId: number, now = new Date()): Promise<V2AssessmentView> {
  const result = await calculateV2AssessmentForUser(userId, now);
  let historyReady = true;
  let history: V2AssessmentView["progression"]["history"] = [];
  try {
    await recordAssessmentSnapshot(userId, result);
    const rows = await db.select().from(cushPassportAssessmentHistory)
      .where(eq(cushPassportAssessmentHistory.userId, userId))
      .orderBy(desc(cushPassportAssessmentHistory.createdAt), desc(cushPassportAssessmentHistory.id))
      .limit(12);
    history = rows.map((row) => ({
      id: row.id,
      previousScore: row.previousScore,
      score: row.score,
      previousConfidence: row.previousConfidence,
      confidence: row.confidence,
      scoreCoveragePercent: row.scoreCoveragePercent,
      assessmentStatus: row.assessmentStatus,
      maturityStatus: row.maturityStatus,
      sourceTypes: row.sourceTypes,
      changedInformation: row.changedInformation,
      changeSummary: row.changeSummary,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (error) {
    if (!isV2SchemaMissing(error)) throw error;
    historyReady = false;
  }
  return {
    calculation: toCustomerCalculation(result.calculation),
    monoImports: result.monoImports.map(({ linkedAccountId, fetchedAt, statementPeriodMonths, evidence }) => ({
      linkedAccountId,
      fetchedAt: fetchedAt.toISOString(),
      statementPeriodMonths,
      balancePence: evidence.availableFunds[0]?.amountPence ?? null,
      incomeMonths: new Set(evidence.incomeHistory.map((item) => item.month)).size,
      cashFlowMonths: evidence.cashFlowHistory.length,
    })),
    schemaReady: true,
    monoDataReady: result.monoDataReady,
    unscoredCurrencyCodes: result.unscoredCurrencyCodes,
    progression: {
      maturityStatus: result.maturityStatus,
      sourceTypes: result.sourceTypes,
      preArrival: result.preArrivalProgress,
      postArrival: result.postArrivalProgress,
      documents: result.documentProgress,
      nextActions: result.calculation.missingRequirements.slice(0, 4),
      historyReady,
      history,
    },
  };
}

const COMPONENT_PRESENTATION = [
  { key: "availableFunds", label: "Available funds", weightPercent: COMPONENT_WEIGHTS.availableFunds * 100 },
  { key: "incomeStrength", label: "Income strength", weightPercent: COMPONENT_WEIGHTS.incomeStrength * 100 },
  { key: "cashFlow", label: "Cash-flow behaviour", weightPercent: COMPONENT_WEIGHTS.cashFlow * 100 },
  { key: "creditHistory", label: "Credit history", weightPercent: COMPONENT_WEIGHTS.creditHistory * 100 },
] as const;

export async function getAdminV2Assessment(userId: number, now = new Date()) {
  const result = await calculateV2AssessmentForUser(userId, now);
  const { calculation } = result;
  return {
    algorithmVersion: calculation.algorithmVersion,
    assessmentStatus: calculation.assessmentStatus,
    score: calculation.cushScore,
    provisionalScore: calculation.provisionalScore,
    scoreCoveragePercent: calculation.scoreCoveragePercent,
    scoredComponentCount: calculation.scoredComponentCount,
    confidenceScore: calculation.confidenceScore,
    confidenceBand: calculation.confidenceBand,
    components: COMPONENT_PRESENTATION.map(({ key, label, weightPercent }) => ({
      key,
      label,
      weightPercent,
      score: calculation.componentScores[key],
      weightedContribution: calculation.weightedContributions[key],
    })),
    confidenceBreakdown: calculation.confidenceBreakdown,
    usableHistoryMonths: calculation.usableHistoryMonths,
    missingRequirements: calculation.missingRequirements,
    unscoredCurrencyCodes: result.unscoredCurrencyCodes,
    activePolicyVersion: result.activePolicyVersion,
    baseline: result.baselinePolicy,
    generatedAt: now.toISOString(),
  };
}

export async function saveV2Assessment(userId: number, value: unknown): Promise<V2AssessmentView> {
  const inputs = v2AssessmentInputSchema.parse(value);
  await db.insert(cushAssessmentInputs)
    .values({ userId, inputData: inputs, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: cushAssessmentInputs.userId,
      set: { inputData: inputs, updatedAt: new Date() },
    });
  return getV2Assessment(userId);
}

export async function getAdminPolicyVersions() {
  const rows = await db.select().from(cushScorePolicyVersions)
    .orderBy(desc(cushScorePolicyVersions.version))
    .limit(25);
  const activeRow = rows.find((row) => row.status === "active");
  const draftRow = rows.find((row) => row.status === "draft");
  return {
    active: activeRow ? {
      id: activeRow.id,
      version: activeRow.version,
      configuration: asPolicyConfig(activeRow.configuration),
      approvedAt: activeRow.approvedAt,
    } : null,
    draft: draftRow ? {
      id: draftRow.id,
      version: draftRow.version,
      configuration: asPolicyConfig(draftRow.configuration),
      updatedAt: draftRow.updatedAt,
    } : null,
  };
}

export async function saveScoringPolicyDraft(userId: number, value: unknown) {
  const configuration = cushScorePolicyConfigSchema.parse(value);
  const [existingDraft] = await db.select().from(cushScorePolicyVersions)
    .where(eq(cushScorePolicyVersions.status, "draft"))
    .orderBy(desc(cushScorePolicyVersions.version))
    .limit(1);
  if (existingDraft) {
    const [updated] = await db.update(cushScorePolicyVersions)
      .set({ configuration, updatedAt: new Date() })
      .where(eq(cushScorePolicyVersions.id, existingDraft.id))
      .returning();
    return { id: updated.id, version: updated.version, configuration };
  }
  const [latest] = await db.select({ version: cushScorePolicyVersions.version })
    .from(cushScorePolicyVersions)
    .orderBy(desc(cushScorePolicyVersions.version))
    .limit(1);
  const [created] = await db.insert(cushScorePolicyVersions).values({
    version: (latest?.version ?? 0) + 1,
    status: "draft",
    configuration,
    createdBy: userId,
    updatedAt: new Date(),
  }).returning();
  return { id: created.id, version: created.version, configuration };
}

export async function activateScoringPolicy(policyId: number, userId: number) {
  const [draft] = await db.select().from(cushScorePolicyVersions)
    .where(and(
      eq(cushScorePolicyVersions.id, policyId),
      eq(cushScorePolicyVersions.status, "draft"),
    ))
    .limit(1);
  if (!draft) throw new ScoringPolicyValidationError("Draft scoring policy not found.");

  const configuration = asPolicyConfig(draft.configuration);
  const today = new Date().toISOString().slice(0, 10);
  if (!configuration.destinationBaselines.some((baseline) =>
    baseline.countryCode === "GB" &&
    baseline.currencyCode === "GBP" &&
    baseline.effectiveDate <= today,
  )) {
    throw new ScoringPolicyValidationError("At least one current GBP destination baseline is required before activation.");
  }

  return db.transaction(async (transaction) => {
    await transaction.update(cushScorePolicyVersions)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(cushScorePolicyVersions.status, "active"));
    const [activated] = await transaction.update(cushScorePolicyVersions)
      .set({
        status: "active",
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(cushScorePolicyVersions.id, policyId),
        eq(cushScorePolicyVersions.status, "draft"),
      ))
      .returning();
    if (!activated) throw new ScoringPolicyValidationError("Draft scoring policy changed before activation.");
    return { id: activated.id, version: activated.version, approvedAt: activated.approvedAt };
  });
}

export function isV2SchemaMissing(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    if ("code" in current && (current as { code?: string }).code === "42P01") return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

function isCreditHistorySchemaMissing(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && typeof current === "object" && current !== null; depth += 1) {
    if (
      "code" in current &&
      ["42P01", "42703"].includes(String((current as { code?: unknown }).code))
    ) return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}
