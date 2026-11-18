import { describe, expect, it } from "vitest";
import type { CustomerCalculation } from "./cush-score-presentation";
import { buildCushVerifyReport } from "./cush-verify-report-service";

describe("Cush Verify financial evidence report sections", () => {
  it("returns only consented category summaries and maps supported evidence states", () => {
    const report = buildCushVerifyReport(
      {} as CustomerCalculation,
      ["income_employment", "rent_housing"],
      new Date("2026-11-17T10:00:00.000Z"),
      undefined,
      [
        {
          recordType: "employment",
          activityDate: "2026-02-01",
          evidenceStatus: "user_recorded",
          countryCode: "GB",
          currencyCode: "GBP",
          details: { employer: "Example Ltd", salaryAmount: "42000", note: "private free text" },
        },
        { recordType: "income", activityDate: "2026-03-01", evidenceStatus: "document_supported", details: { amount: "2200" } },
        { recordType: "accommodation", activityDate: "2026-01-01", evidenceStatus: "independently_verified" },
        { recordType: "banking_savings", activityDate: "2026-04-01", evidenceStatus: "user_recorded" },
      ],
    );

    expect(report.reportingPeriod).toEqual({ start: "2026-01-01", end: "2026-03-01" });
    expect(report.categories.financialEvidence?.income_employment).toMatchObject({
      recordCount: 2,
      latestRecordDate: "2026-03-01",
      evidenceClassifications: {
        selfDeclared: 1,
        documentSupported: 1,
        independentlyVerified: 0,
        pendingReview: 0,
        disputedOrRejected: 0,
      },
    });
    expect(report.categories.financialEvidence?.income_employment?.records[0]).toMatchObject({
      recordType: "employment",
      countryCode: "GB",
      currencyCode: "GBP",
      details: { employer: "Example Ltd", salaryAmount: "42000" },
    });
    expect(report.categories.financialEvidence?.income_employment?.records[0].details).not.toHaveProperty("note");
    expect(report.categories.financialEvidence?.rent_housing?.recordCount).toBe(1);
    expect(report.categories.financialEvidence?.savings).toBeUndefined();
  });
});
