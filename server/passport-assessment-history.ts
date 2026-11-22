import { createHash } from "node:crypto";

export type AssessmentMaturity =
  | "getting_started"
  | "provisional"
  | "evidence_supported"
  | "institution_supported";

export function getAssessmentMaturity(input: {
  hasScore: boolean;
  hasInstitutionCredit: boolean;
  hasBankConnection: boolean;
  hasReviewedStatement: boolean;
}): AssessmentMaturity {
  if (!input.hasScore) return "getting_started";
  if (input.hasInstitutionCredit || input.hasBankConnection) return "institution_supported";
  if (input.hasReviewedStatement) return "evidence_supported";
  return "provisional";
}

export function fingerprintAssessmentInputs(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function describeAssessmentChange(
  previous: { score: number | null; confidence: number | null } | undefined,
  score: number | null,
  confidence: number | null,
): string {
  if (!previous) return "Initial assessment created from the financial information currently available.";
  if (previous.score !== score) {
    const confidenceChange = previous.confidence !== confidence
      ? ` Confidence changed from ${previous.confidence ?? "pending"} to ${confidence ?? "pending"} separately.`
      : "";
    if (previous.score === null) return `A provisional Cush Score is now available from the information currently saved.${confidenceChange}`;
    if (score === null) return `The assessment changed and a complete score is no longer available; review the outstanding information.${confidenceChange}`;
    return `Cush Score ${score > previous.score ? "increased" : "decreased"} from ${previous.score} to ${score} after the assessment was recalculated.${confidenceChange}`;
  }
  if (previous.confidence !== confidence) {
    return `Cush Score stayed ${score ?? "unavailable"}; Confidence changed as the available information or evidence changed.`;
  }
  return "The saved assessment inputs changed; Cush Score and Confidence stayed the same.";
}
