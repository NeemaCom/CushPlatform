import { and, desc, eq } from "drizzle-orm";
import {
  cushAssessmentInputs,
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
  CUSH_SCORE_VERSION,
  type CushScoreInput,
  type CushScoreResult,
  type CushScorePolicy,
  type DestinationBaseline,
} from "./cush-score-service";
import {
  INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION,
  creditAssessmentFromInterswitchEvidence,
} from "./interswitch-credit-history-scoring";
import { interswitchCreditHistoryClient } from "./interswitch-credit-history-service";

export const EMPTY_V2_ASSESSMENT: V2AssessmentInput = {
  selectedBaselineId: null,
  availableFunds: [],
  incomeHistory: [],
  cashFlowHistory: [],
  creditClassification: "unavailable",
};

export interface V2AssessmentView {
  inputs: V2AssessmentInput;
  calculation: CushScoreResult;
  monoImports: Array<{
    linkedAccountId: number;
    fetchedAt: string;
    statementPeriodMonths: number;
    balancePence: number | null;
    incomeMonths: number;
    cashFlowMonths: number;
    sourceCurrencies: Array<"GBP" | "USD" | "NGN">;
    fxRateSource: string;
    fxRateDateBasis: "transaction_date";
    fxRates: Array<{
      rateDate: string;
      currencyCode: "USD" | "NGN";
      usdNgnCentralRate: string;
      gbpNgnCentralRate: string;
    }>;
  }>;
  destinationBaselines: CushScorePolicyConfig["destinationBaselines"];
  policyStatus: "active" | "not_configured";
  policyVersion: number | null;
  schemaReady: true;
  monoDataReady: boolean;
}

export class ScoringPolicyValidationError extends Error {}

function asPolicyConfig(value: unknown): CushScorePolicyConfig {
  return cushScorePolicyConfigSchema.parse(value);
}

function baselineFor(
  input: V2AssessmentInput,
  configuration: CushScorePolicyConfig | null,
  today: string,
): DestinationBaseline | null {
  const configured = configuration?.destinationBaselines.find((item) =>
    item.id === input.selectedBaselineId &&
    item.currencyCode === "GBP" &&
    item.countryCode === "GB" &&
    item.effectiveDate <= today,
  );
  if (!configured) return null;
  return {
    destination: configured.destination,
    monthlyBaselinePence: configured.monthlyBaselinePence,
    effectiveDate: configured.effectiveDate,
    countryCode: configured.countryCode,
  };
}

function engineInput(
  userId: number,
  input: V2AssessmentInput,
  destinationBaseline: DestinationBaseline | null,
  now: Date,
  monoImports: Array<{ linkedAccountId: number; fetchedAt: Date; evidence: MonoV2AssessmentEvidence }>,
  linkedAccountCount: number,
  creditHistoryEvidence: { evidenceData: unknown; mappingVersion: string } | null,
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
  const sourceRecordCount = monoRecordCount + selfReportedRecordCount;
  const sourceEvidenceShares = sourceRecordCount === 0
    ? []
    : [
        ...(monoRecordCount > 0 ? [{ sourceType: "bank_connection" as const, share: monoRecordCount / sourceRecordCount }] : []),
        ...(selfReportedRecordCount > 0 ? [{ sourceType: "self_reported" as const, share: selfReportedRecordCount / sourceRecordCount }] : []),
      ];
  const creditAssessment = creditHistoryEvidence
    ? creditAssessmentFromInterswitchEvidence(
        creditHistoryEvidence.evidenceData,
        creditHistoryEvidence.mappingVersion,
      )
    : creditAssessmentFromInterswitchEvidence(null, INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION);
  const oldestImportDate = monoImports.length
    ? Math.min(...monoImports.map(({ fetchedAt }) => fetchedAt.getTime()))
    : null;
  const dataAgeDays = oldestImportDate === null
    ? null
    : Math.max(0, Math.floor((now.getTime() - oldestImportDate) / 86_400_000));
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
    linkedAccountId: monoV2AssessmentEvidence.monoLinkedAccountId,
    evidenceData: monoV2AssessmentEvidence.evidenceData,
    fetchedAt: monoV2AssessmentEvidence.fetchedAt,
    statementPeriodMonths: monoV2AssessmentEvidence.statementPeriodMonths,
  }).from(monoV2AssessmentEvidence)
    .where(eq(monoV2AssessmentEvidence.userId, userId));
  return rows.map((row) => ({
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

async function loadStoredInputs(userId: number): Promise<V2AssessmentInput> {
  const [row] = await db.select().from(cushAssessmentInputs).where(eq(cushAssessmentInputs.userId, userId)).limit(1);
  return row ? v2AssessmentInputSchema.parse(row.inputData) : EMPTY_V2_ASSESSMENT;
}

async function loadActivePolicy() {
  const [row] = await db.select().from(cushScorePolicyVersions)
    .where(eq(cushScorePolicyVersions.status, "active"))
    .orderBy(desc(cushScorePolicyVersions.version))
    .limit(1);
  return row ? { row, configuration: asPolicyConfig(row.configuration) } : null;
}

export async function getV2Assessment(userId: number, now = new Date()): Promise<V2AssessmentView> {
  const [inputs, activePolicy, monoData, creditHistoryEvidence] = await Promise.all([
    loadStoredInputs(userId),
    loadActivePolicy(),
    loadMonoAssessmentData(userId),
    loadCreditHistoryEvidence(userId),
  ]);
  const today = now.toISOString().slice(0, 10);
  const selectedBaseline = baselineFor(inputs, activePolicy?.configuration ?? null, today);
  const scoringPolicy: CushScorePolicy = activePolicy
    ? {
        creditMappings: activePolicy.configuration.creditMappings,
        ...(activePolicy.configuration.confidence
          ? { confidence: activePolicy.configuration.confidence }
          : {}),
      }
    : { creditMappings: {} };
  const calculation = calculateCushScore(
    engineInput(userId, inputs, selectedBaseline, now, monoData.imports, monoData.linkedAccountCount, creditHistoryEvidence),
    scoringPolicy,
  );
  const destinationBaselines = activePolicy?.configuration.destinationBaselines.filter((baseline) =>
    baseline.currencyCode === "GBP" &&
    baseline.countryCode === "GB" &&
    baseline.effectiveDate <= today,
  ) ?? [];
  return {
    inputs,
    calculation,
    monoImports: monoData.imports.map(({ linkedAccountId, fetchedAt, statementPeriodMonths, evidence }) => ({
      linkedAccountId,
      fetchedAt: fetchedAt.toISOString(),
      statementPeriodMonths,
      balancePence: evidence.availableFunds[0]?.amountPence ?? null,
      incomeMonths: new Set(evidence.incomeHistory.map((item) => item.month)).size,
      cashFlowMonths: evidence.cashFlowHistory.length,
      sourceCurrencies: evidence.sourceCurrencies,
      fxRateSource: evidence.fxRateSource,
      fxRateDateBasis: evidence.fxRateDateBasis,
      fxRates: [...new Map(evidence.conversionAudit.map((rate) => [
        `${rate.currencyCode}:${rate.rateDate}`,
        {
          rateDate: rate.rateDate,
          currencyCode: rate.currencyCode,
          usdNgnCentralRate: rate.usdNgnCentralRate,
          gbpNgnCentralRate: rate.gbpNgnCentralRate,
        },
      ])).values()].sort((a, b) => b.rateDate.localeCompare(a.rateDate)).slice(0, 10),
    })),
    destinationBaselines,
    policyStatus: activePolicy ? "active" : "not_configured",
    policyVersion: activePolicy?.row.version ?? null,
    schemaReady: true,
    monoDataReady: monoData.monoDataReady,
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
