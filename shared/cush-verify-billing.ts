export const CUSH_VERIFY_BILLING_EVENTS = [
  {
    event: "Searching for a profile",
    treatment: "Free",
    category: "no_charge",
  },
  {
    event: "Profile not found",
    treatment: "Free",
    category: "no_charge",
  },
  {
    event: "Customer declines consent",
    treatment: "Free",
    category: "no_charge",
  },
  {
    event: "Consent successfully obtained",
    treatment: "Not billable by itself",
    category: "no_charge",
  },
  {
    event: "Authorized full report successfully returned by Cush",
    treatment: "1 report credit",
    category: "report_credit",
  },
  {
    event: "Failed API request",
    treatment: "No charge",
    category: "no_charge",
  },
  {
    event: "Repeated technical retry",
    treatment: "No additional charge",
    category: "no_charge",
  },
  {
    event: "New report after a material profile update",
    treatment: "1 new report credit after successful return",
    category: "report_credit",
  },
  {
    event: "Individual endpoint retrieval",
    treatment: "Included in the full report allocation",
    category: "included",
  },
] as const;

export const CUSH_VERIFY_REPORT_CREDIT_RULE =
  "A report credit is counted only when Cush successfully returns an authorized report.";
