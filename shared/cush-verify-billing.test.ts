import { describe, expect, it } from "vitest";
import {
  CUSH_VERIFY_BILLING_EVENTS,
  CUSH_VERIFY_REPORT_CREDIT_RULE,
} from "./cush-verify-billing";

describe("Cush Verify report-credit treatment", () => {
  it("only assigns a credit to a successfully returned full report", () => {
    expect(CUSH_VERIFY_BILLING_EVENTS.filter((event) => event.category === "report_credit")).toEqual([
      {
        event: "Authorized full report successfully returned by Cush",
        treatment: "1 report credit",
        category: "report_credit",
      },
      {
        event: "New report after a material profile update",
        treatment: "1 new report credit after successful return",
        category: "report_credit",
      },
    ]);
    expect(CUSH_VERIFY_REPORT_CREDIT_RULE).toContain("successfully returns an authorized report");
  });

  it("keeps searches, consent, failures, and technical retries non-billable", () => {
    const freeEvents = CUSH_VERIFY_BILLING_EVENTS.filter((event) => event.category === "no_charge");
    expect(freeEvents.map((event) => event.event)).toEqual([
      "Searching for a profile",
      "Profile not found",
      "Customer declines consent",
      "Consent successfully obtained",
      "Failed API request",
      "Repeated technical retry",
    ]);
  });

  it("includes individual endpoints in the full report allocation", () => {
    expect(CUSH_VERIFY_BILLING_EVENTS.find((event) => event.category === "included")).toMatchObject({
      event: "Individual endpoint retrieval",
      treatment: "Included in the full report allocation",
    });
  });
});
