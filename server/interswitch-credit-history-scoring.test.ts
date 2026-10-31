import { describe, expect, it } from "vitest";
import {
  INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION,
  creditAssessmentFromInterswitchEvidence,
  scoreInterswitchCreditHistory,
} from "./interswitch-credit-history-scoring";

function evidence(overrides: Record<string, unknown> = {}) {
  return {
    accountsReported: 1,
    historyRecords: 1,
    loanStatusCounts: { open: 1, closed: 0, other: 0 },
    performanceStatusCounts: { performing: 1, nonPerforming: 0, other: 0 },
    repaymentStatusCounts: { settled: 2, overdue: 1, adverse: 1, pending: 2, other: 3 },
    ...overrides,
  };
}

describe("approved Interswitch credit-history mapping", () => {
  it("versions the rule and averages resolved installment weights", () => {
    expect(INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION).toBe("interswitch-repayment-history-v2");
    expect(scoreInterswitchCreditHistory(evidence())).toEqual({
      score: 63,
      scoreableInstallments: 4,
      reason: "scored",
    });
  });

  it("excludes pending and unknown statuses from the denominator", () => {
    const result = scoreInterswitchCreditHistory(evidence({
      repaymentStatusCounts: { settled: 1, overdue: 0, adverse: 0, pending: 10, other: 12 },
    }));
    expect(result).toEqual({ score: 100, scoreableInstallments: 1, reason: "scored" });
  });

  it("does not turn a report with no resolved installments into a score", () => {
    const result = scoreInterswitchCreditHistory(evidence({
      repaymentStatusCounts: { settled: 0, overdue: 0, adverse: 0, pending: 2, other: 1 },
    }));
    expect(result).toEqual({
      score: null,
      scoreableInstallments: 0,
      reason: "no_resolved_installments",
    });
  });

  it("leaves conflicting non-performing evidence unscored", () => {
    const result = scoreInterswitchCreditHistory(evidence({
      performanceStatusCounts: { performing: 0, nonPerforming: 1, other: 0 },
      repaymentStatusCounts: { settled: 2, overdue: 0, adverse: 0, pending: 0, other: 0 },
    }));
    expect(result).toEqual({
      score: null,
      scoreableInstallments: 2,
      reason: "inconsistent_statuses",
    });
  });

  it("rejects malformed and inconsistent normalized evidence", () => {
    expect(scoreInterswitchCreditHistory({})).toEqual({
      score: null,
      scoreableInstallments: 0,
      reason: "invalid_evidence",
    });
    expect(scoreInterswitchCreditHistory(evidence({
      loanStatusCounts: { open: 0, closed: 0, other: 0 },
    })).reason).toBe("invalid_evidence");
  });

  it("creates a verified credit assessment only for the current mapping version", () => {
    const current = creditAssessmentFromInterswitchEvidence(evidence(), INTERSWITCH_CREDIT_HISTORY_MAPPING_VERSION);
    expect(current).toEqual({
      classification: "unavailable",
      evidenceQuality: "verified",
      checkStatus: "matched",
      score: 63,
    });

    const unsupported = creditAssessmentFromInterswitchEvidence(evidence(), "unknown-version");
    expect(unsupported).toEqual({
      classification: "unavailable",
      evidenceQuality: null,
      checkStatus: "not_done",
      score: null,
    });

    const sandbox = creditAssessmentFromInterswitchEvidence(evidence(), "interswitch-repayment-history-v2-sandbox");
    expect(sandbox).toEqual({
      classification: "unavailable",
      evidenceQuality: null,
      checkStatus: "not_done",
      score: null,
    });
  });
});
