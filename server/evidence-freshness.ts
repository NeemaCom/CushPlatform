export type EvidenceFreshnessReviewDecision =
  | "confirm_source_date"
  | "confirm_retrieval_date";

export type EvidenceFreshnessDateBasis = "source_date" | "retrieval_date" | "unknown";

export interface EvidenceFreshnessResolution {
  effectiveDate: string | null;
  dateBasis: EvidenceFreshnessDateBasis;
  requiresAdminReview: boolean;
}

function validDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function dateFromTimestamp(value: unknown): string | null {
  if (!(value instanceof Date) && typeof value !== "string") return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

export function resolveEvidenceFreshnessDate(input: {
  sourceDate?: string | null;
  retrievedAt?: Date | string | null;
  reviewDecision?: EvidenceFreshnessReviewDecision | null;
  reviewedSourceDate?: string | null;
  now?: Date;
}): EvidenceFreshnessResolution {
  const nowDate = (input.now ?? new Date()).toISOString().slice(0, 10);
  const retrievalDate = dateFromTimestamp(input.retrievedAt);
  const reviewedDate = input.reviewedSourceDate;
  const sourceDate = input.sourceDate;

  if (input.reviewDecision === "confirm_source_date" &&
      validDateOnly(reviewedDate) && reviewedDate <= nowDate) {
    return { effectiveDate: reviewedDate, dateBasis: "source_date", requiresAdminReview: false };
  }
  if (input.reviewDecision === "confirm_retrieval_date" && retrievalDate) {
    return { effectiveDate: retrievalDate, dateBasis: "retrieval_date", requiresAdminReview: false };
  }
  if (validDateOnly(sourceDate) && sourceDate <= nowDate) {
    return { effectiveDate: sourceDate, dateBasis: "source_date", requiresAdminReview: false };
  }
  if (retrievalDate) {
    return { effectiveDate: retrievalDate, dateBasis: "retrieval_date", requiresAdminReview: true };
  }
  return { effectiveDate: null, dateBasis: "unknown", requiresAdminReview: true };
}

export function ageInDays(asOfDate: string | null, now = new Date()): number | null {
  if (!asOfDate || !validDateOnly(asOfDate)) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const source = Date.parse(`${asOfDate}T00:00:00.000Z`);
  if (source > today) return null;
  return Math.floor((today - source) / 86_400_000);
}

