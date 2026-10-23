import type { ConsentPolicyType } from "@shared/schema";

// Increment a policy's version whenever its published text changes.
export const CURRENT_CONSENT_POLICY_VERSIONS: Record<ConsentPolicyType, string> = {
  terms: "terms-v1",
  privacy: "privacy-v1",
};

export interface ConsentAcceptanceInput {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export interface ConsentAcceptanceRecord {
  policyType: ConsentPolicyType;
  policyVersion: string;
  acceptedAt: Date;
}

export function createConsentAcceptanceRecords(
  acceptance: ConsentAcceptanceInput,
  acceptedAt = new Date(),
): ConsentAcceptanceRecord[] {
  const records: ConsentAcceptanceRecord[] = [];

  if (acceptance.acceptTerms) {
    records.push({
      policyType: "terms",
      policyVersion: CURRENT_CONSENT_POLICY_VERSIONS.terms,
      acceptedAt,
    });
  }

  if (acceptance.acceptPrivacy) {
    records.push({
      policyType: "privacy",
      policyVersion: CURRENT_CONSENT_POLICY_VERSIONS.privacy,
      acceptedAt,
    });
  }

  return records;
}
