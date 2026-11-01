import { z } from "zod";

const count = z.number().int().min(0).max(1_000_000);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});

export const normalizedCreditHistorySchema = z.object({
  sourceReportDate: isoDate.nullable().optional(),
  accountsReported: count,
  historyRecords: count,
  loanStatusCounts: z.object({
    open: count,
    closed: count,
    other: count,
  }).strict(),
  performanceStatusCounts: z.object({
    performing: count,
    nonPerforming: count,
    other: count,
  }).strict(),
  repaymentStatusCounts: z.object({
    settled: count,
    overdue: count,
    adverse: count,
    pending: count,
    other: count,
  }).strict(),
}).strict().superRefine((value, context) => {
  const loanStatusTotal = Object.values(value.loanStatusCounts).reduce((sum, item) => sum + item, 0);
  const performanceStatusTotal = Object.values(value.performanceStatusCounts).reduce((sum, item) => sum + item, 0);
  const repaymentStatusTotal = Object.values(value.repaymentStatusCounts).reduce((sum, item) => sum + item, 0);
  if (loanStatusTotal !== value.historyRecords || performanceStatusTotal !== value.historyRecords) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["historyRecords"],
      message: "Normalized history record counts do not match the status totals.",
    });
  }
  if ((value.accountsReported === 0 && value.historyRecords > 0) ||
      (value.historyRecords === 0 && repaymentStatusTotal > 0)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["accountsReported"],
      message: "Normalized credit-history counts are inconsistent.",
    });
  }
});

export type NormalizedCreditHistory = z.infer<typeof normalizedCreditHistorySchema>;

export const INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION = "interswitch-repayment-history-v2";
export const INTERSWITCH_CREDIT_HISTORY_SANDBOX_MAPPING_VERSION = "interswitch-repayment-history-v2-sandbox";

export type CreditHistoryScoreResult =
  | { score: number; scoreableInstallments: number; reason: "scored" }
  | { score: null; scoreableInstallments: number; reason: "no_resolved_installments" | "inconsistent_statuses" | "invalid_evidence" };

/**
 * Approved mapping: settled=1, overdue=0.5, confirmed adverse=0.
 * Pending and unrecognized schedule statuses do not enter the denominator.
 */
export function scoreInterswitchCreditHistory(value: unknown): CreditHistoryScoreResult {
  const parsed = normalizedCreditHistorySchema.safeParse(value);
  if (!parsed.success) {
    return { score: null, scoreableInstallments: 0, reason: "invalid_evidence" };
  }

  const evidence = parsed.data;
  const { settled, overdue, adverse } = evidence.repaymentStatusCounts;
  const scoreableInstallments = settled + overdue + adverse;

  // Do not score a report that says an account is non-performing but contains
  // no overdue/default schedule evidence to explain that status.
  if (evidence.performanceStatusCounts.nonPerforming > 0 && overdue + adverse === 0) {
    return { score: null, scoreableInstallments, reason: "inconsistent_statuses" };
  }
  if (scoreableInstallments === 0) {
    return { score: null, scoreableInstallments: 0, reason: "no_resolved_installments" };
  }

  const score = Math.round(((settled + overdue * 0.5) / scoreableInstallments) * 100);
  return { score, scoreableInstallments, reason: "scored" };
}

export function creditAssessmentFromInterswitchEvidence(
  evidenceData: unknown,
  mappingVersion: string,
) {
  const parsed = normalizedCreditHistorySchema.safeParse(evidenceData);
  if (!parsed.success || mappingVersion !== INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION) {
    return {
      classification: "unavailable" as const,
      evidenceQuality: null,
      checkStatus: "not_done" as const,
      score: null,
    };
  }
  return {
    classification: "unavailable" as const,
    evidenceQuality: "verified" as const,
    checkStatus: "matched" as const,
    score: scoreInterswitchCreditHistory(parsed.data).score,
  };
}
