import { and, desc, eq } from "drizzle-orm";
import {
  cushAssessmentInputs,
  cushScorePolicyVersions,
  cushScorePolicyConfigSchema,
  v2AssessmentInputSchema,
  type CushScorePolicyConfig,
  type V2AssessmentInput,
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
  destinationBaselines: CushScorePolicyConfig["destinationBaselines"];
  policyStatus: "active" | "not_configured";
  policyVersion: number | null;
  schemaReady: true;
}

export class ScoringPolicyValidationError extends Error {}

function asPolicyConfig(value: unknown): CushScorePolicyConfig {
  return cushScorePolicyConfigSchema.parse(value);
}

function daysSinceLatestMonth(input: V2AssessmentInput, now: Date): number | null {
  const months = [
    ...input.incomeHistory.map((row) => row.month),
    ...input.cashFlowHistory.map((row) => row.month),
  ];
  if (months.length === 0) return null;
  const latestMonth = months.sort().at(-1)!;
  const [year, month] = latestMonth.split("-").map(Number);
  const monthEnd = Date.UTC(year, month, 0);
  return Math.max(0, Math.floor((now.getTime() - monthEnd) / 86_400_000));
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
): CushScoreInput {
  const hasSubmittedFinancialData =
    input.availableFunds.length > 0 ||
    input.incomeHistory.length > 0 ||
    input.cashFlowHistory.length > 0 ||
    input.creditClassification !== "unavailable";
  const sourceCount = new Set([
    ...input.availableFunds.map((item) => `fund:${item.id}`),
    ...input.incomeHistory.map((item) => `income:${item.sourceId}`),
    ...input.cashFlowHistory.map((item) => `cashflow:${item.month}`),
  ]).size;
  return {
    individualUserId: userId,
    assessmentMonth: now.toISOString().slice(0, 7),
    destinationBaseline,
    hasSubmittedFinancialData,
    availableFunds: input.availableFunds.map((item) => ({
      id: item.id,
      deduplicationKey: item.deduplicationKey,
      amountPence: item.amountPence,
      accessible: item.accessible,
      evidenceQuality: "self_reported",
    })),
    incomeHistory: input.incomeHistory.map((item) => ({
      month: item.month,
      sourceId: item.sourceId,
      category: item.category,
      amountPence: item.amountPence,
      recurring: item.recurring,
      variable: item.variable,
      evidenceQuality: "self_reported",
    })),
    sourceEvidenceQualities: Array.from({ length: sourceCount }, () => "self_reported"),
    cashFlowHistory: input.cashFlowHistory.map((item) => ({
      month: item.month,
      eligibleRecurringIncomePence: item.eligibleRecurringIncomePence,
      eligibleExpensesPence: item.eligibleExpensesPence,
      complete: item.complete,
      evidenceQuality: "self_reported",
    })),
    credit: {
      classification: input.creditClassification,
      evidenceQuality: input.creditClassification === "unavailable" ? null : "self_reported",
    },
    dataAgeDays: daysSinceLatestMonth(input, now),
    coveredAccountCount: 0,
    declaredAccountCount: 0,
    integrityFlags: [],
  };
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
  const [inputs, activePolicy] = await Promise.all([
    loadStoredInputs(userId),
    loadActivePolicy(),
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
    engineInput(userId, inputs, selectedBaseline, now),
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
    destinationBaselines,
    policyStatus: activePolicy ? "active" : "not_configured",
    policyVersion: activePolicy?.row.version ?? null,
    schemaReady: true,
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
