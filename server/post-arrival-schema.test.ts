import { describe, expect, it } from "vitest";
import {
  confirmUkArrivalSchema,
  postArrivalProfileDataSchema,
  postArrivalRecordSchema,
} from "@shared/schema";

describe("Post-Arrival input validation", () => {
  it("accepts a confirmed arrival date without residency evidence", () => {
    expect(confirmUkArrivalSchema.safeParse({ arrivalDate: "2026-10-23" }).success).toBe(true);
  });

  it("rejects invalid calendar dates", () => {
    expect(confirmUkArrivalSchema.safeParse({ arrivalDate: "2026-02-30" }).success).toBe(false);
  });

  it("allows optional personal circumstances to be saved progressively", () => {
    expect(postArrivalProfileDataSchema.safeParse({}).success).toBe(true);
    expect(postArrivalProfileDataSchema.safeParse({
      currentLocation: "Leeds",
      studying: true,
      startedWorking: false,
    }).success).toBe(true);
  });

  it("keeps received income separate and preserves its date, country, and currency", () => {
    const result = postArrivalRecordSchema.safeParse({
      recordType: "income",
      label: "First monthly salary",
      activityDate: "2026-10-31",
      countryCode: "GB",
      currencyCode: "GBP",
      details: {
        sourceType: "salary",
        amount: "2450.75",
        paymentFrequency: "monthly",
        grossOrNet: "net",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currencyCode).toBe("GBP");
      expect(result.data.activityDate).toBe("2026-10-31");
      expect(result.data.details).toMatchObject({ amount: "2450.75" });
    }
  });

  it("accepts accommodation with no formal tenancy or rent amount", () => {
    expect(postArrivalRecordSchema.safeParse({
      recordType: "accommodation",
      label: "Staying with family",
      countryCode: "GB",
      currencyCode: "GBP",
      details: { arrangementType: "family_or_friends", hasFormalTenancy: false },
    }).success).toBe(true);
  });

  it("requires meaningful banking or savings information", () => {
    const empty = postArrivalRecordSchema.safeParse({
      recordType: "banking_savings",
      label: "Savings",
      countryCode: "GB",
      currencyCode: "GBP",
      details: {},
    });
    const populated = postArrivalRecordSchema.safeParse({
      recordType: "banking_savings",
      label: "Savings balance",
      countryCode: "GB",
      currencyCode: "GBP",
      details: { availableSavings: "125.50" },
    });
    expect(empty.success).toBe(false);
    expect(populated.success).toBe(true);
  });

  it("rejects client attempts to label a record verified", () => {
    const result = postArrivalRecordSchema.safeParse({
      recordType: "expense",
      label: "Monthly travel",
      countryCode: "GB",
      currencyCode: "GBP",
      evidenceStatus: "independently_verified",
      details: { category: "transport", amount: "45", frequency: "monthly" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid country and currency codes", () => {
    const result = postArrivalRecordSchema.safeParse({
      recordType: "financial_activity",
      label: "Transfer",
      activityDate: "2026-10-31",
      countryCode: "UK",
      currencyCode: "gbp",
      details: { activityType: "international_transfer", amount: "200" },
    });
    expect(result.success).toBe(false);
  });
});
