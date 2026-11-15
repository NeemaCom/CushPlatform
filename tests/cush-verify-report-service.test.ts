import { describe, expect, it } from "vitest";
import type { CustomerCalculation } from "../server/cush-score-presentation";
import type { V2AssessmentView } from "../server/cush-score-v2";
import {
  buildCushVerifyReport,
  checkCushVerifyReportAuthorization,
  getCushVerifyReportDigest,
  maskCushVerifyRecipientEmail,
} from "../server/cush-verify-report-service";

const now = new Date("2026-11-15T12:00:00.000Z");
const baseAuthorization = {
  requestInstitutionId: 12,
  expectedInstitutionId: 12,
  targetUserId: 34,
  consentUserId: 34,
  requestStatus: "authorized" as const,
  consentStatus: "approved" as const,
  requestedCategories: ["score_summary", "assessment_status"] as const,
  approvedCategories: ["score_summary"] as const,
  requestExpiresAt: new Date("2026-11-30T12:00:00.000Z"),
  authorizationExpiresAt: new Date("2026-12-15T12:00:00.000Z"),
  consentExpiresAt: new Date("2026-12-15T12:00:00.000Z"),
  now,
};

const calculation = {
  cushScore: 720,
  provisionalScore: null,
  confidenceScore: 84,
  confidenceBand: "High",
  assessmentStatus: "complete",
  algorithmVersion: "2.3.0",
  missingRequirements: [],
  componentScores: { availableFunds: 100, incomeStrength: 100 },
  confidenceBreakdown: { evidence: 100 },
} as unknown as CustomerCalculation;

describe("Cush Verify authorized reports", () => {
  it("allows only the approved categories for the same institution and person", () => {
    expect(checkCushVerifyReportAuthorization(baseAuthorization)).toEqual({
      allowed: true,
      categories: ["score_summary"],
    });
  });

  it("denies pending or declined consent", () => {
    expect(checkCushVerifyReportAuthorization({
      ...baseAuthorization,
      requestStatus: "awaiting_consent",
      consentStatus: null,
      consentUserId: null,
      approvedCategories: [],
    }).allowed).toBe(false);
    expect(checkCushVerifyReportAuthorization({
      ...baseAuthorization,
      requestStatus: "declined",
      consentStatus: "declined",
      approvedCategories: [],
    }).allowed).toBe(false);
  });

  it("denies expired requests and authorizations", () => {
    expect(checkCushVerifyReportAuthorization({
      ...baseAuthorization,
      requestStatus: "awaiting_consent",
      requestExpiresAt: new Date(now.getTime() - 1),
      authorizationExpiresAt: null,
      consentExpiresAt: null,
      consentStatus: null,
      consentUserId: null,
      approvedCategories: [],
    })).toMatchObject({ allowed: false, reason: "expired" });
    expect(checkCushVerifyReportAuthorization({
      ...baseAuthorization,
      authorizationExpiresAt: new Date(now.getTime() - 1),
      consentExpiresAt: new Date(now.getTime() - 1),
    })).toMatchObject({ allowed: false, reason: "expired" });
  });

  it("denies revoked consent and cross-tenant access", () => {
    expect(checkCushVerifyReportAuthorization({
      ...baseAuthorization,
      requestStatus: "revoked",
      consentStatus: "revoked",
    }).allowed).toBe(false);
    expect(checkCushVerifyReportAuthorization({
      ...baseAuthorization,
      expectedInstitutionId: 99,
    })).toMatchObject({ allowed: false, reason: "wrong_tenant" });
  });

  it("returns only selected customer-safe fields, never component details", () => {
    const report = buildCushVerifyReport(calculation, ["score_summary"], now);
    expect(report.categories.scoreSummary).toEqual({
      score: 720,
      provisionalScore: null,
      confidenceScore: 84,
      confidenceBand: "High",
    });
    expect(report.categories.assessmentStatus).toBeUndefined();
    expect(JSON.stringify(report)).not.toContain("componentScores");
    expect(JSON.stringify(report)).not.toContain("confidenceBreakdown");
  });

  it("reports only sanitized statement-import status when that category is approved", () => {
    const evidence = {
      monoDataReady: true,
      monoImports: [{
        linkedAccountId: 992,
        fetchedAt: "2026-11-14T08:00:00.000Z",
        statementPeriodMonths: 6,
        balancePence: 920_000,
        incomeMonths: 5,
        cashFlowMonths: 6,
      }],
    } as unknown as V2AssessmentView;
    const report = buildCushVerifyReport(calculation, ["evidence_summary"], now, evidence);
    expect(report.categories.evidenceSummary?.bankStatements).toEqual({
      status: "evidence_imported",
      importedAccounts: 1,
      statementPeriodsMonths: [6],
      latestImportDate: "2026-11-14",
    });
    expect(JSON.stringify(report)).not.toContain("992");
    expect(JSON.stringify(report)).not.toContain("920000");
    expect(JSON.stringify(report)).not.toContain("balancePence");
  });

  it("uses a stable digest for retries and a new digest when report content changes", () => {
    const first = buildCushVerifyReport(calculation, ["score_summary"], now);
    const retriedLater = buildCushVerifyReport(
      { ...calculation, cushScore: 720 },
      ["score_summary"],
      new Date(now.getTime() + 60_000),
    );
    const changed = buildCushVerifyReport(
      { ...calculation, cushScore: 721 },
      ["score_summary"],
      new Date(now.getTime() + 60_000),
    );
    expect(getCushVerifyReportDigest(first)).toBe(getCushVerifyReportDigest(retriedLater));
    expect(getCushVerifyReportDigest(first)).not.toBe(getCushVerifyReportDigest(changed));
  });

  it("masks the recipient address before displaying request history", () => {
    const masked = maskCushVerifyRecipientEmail("alice.smith@example.com");
    expect(masked).toBe("a***h@example.com");
    expect(masked).not.toContain("alice.smith");
  });
});
