import { describe, expect, it } from "vitest";
import { ageInDays, resolveEvidenceFreshnessDate } from "./evidence-freshness";

describe("evidence freshness dates", () => {
  const now = new Date("2026-11-02T12:00:00.000Z");

  it("uses a valid provider source date without requesting admin review", () => {
    expect(resolveEvidenceFreshnessDate({
      sourceDate: "2026-10-01",
      retrievedAt: "2026-11-01T10:00:00.000Z",
      now,
    })).toEqual({
      effectiveDate: "2026-10-01",
      dateBasis: "source_date",
      requiresAdminReview: false,
    });
  });

  it("uses retrieval time as a confidence fallback and flags missing source dates", () => {
    const resolved = resolveEvidenceFreshnessDate({
      retrievedAt: "2026-10-20T10:00:00.000Z",
      now,
    });
    expect(resolved).toEqual({
      effectiveDate: "2026-10-20",
      dateBasis: "retrieval_date",
      requiresAdminReview: true,
    });
    expect(ageInDays(resolved.effectiveDate, now)).toBe(13);
  });

  it("keeps an old source date valid while measuring its age", () => {
    const resolved = resolveEvidenceFreshnessDate({
      sourceDate: "2026-05-06",
      retrievedAt: "2026-11-01T10:00:00.000Z",
      now,
    });
    expect(resolved.dateBasis).toBe("source_date");
    expect(resolved.requiresAdminReview).toBe(false);
    expect(ageInDays(resolved.effectiveDate, now)).toBe(180);
  });

  it("uses an admin-confirmed source date instead of the automatic fallback", () => {
    expect(resolveEvidenceFreshnessDate({
      retrievedAt: "2026-10-20T10:00:00.000Z",
      reviewDecision: "confirm_source_date",
      reviewedSourceDate: "2026-09-01",
      now,
    })).toEqual({
      effectiveDate: "2026-09-01",
      dateBasis: "source_date",
      requiresAdminReview: false,
    });
  });

  it("clears the review flag when an admin confirms the retrieval date", () => {
    expect(resolveEvidenceFreshnessDate({
      retrievedAt: "2026-10-20T10:00:00.000Z",
      reviewDecision: "confirm_retrieval_date",
      now,
    })).toEqual({
      effectiveDate: "2026-10-20",
      dateBasis: "retrieval_date",
      requiresAdminReview: false,
    });
  });

  it("routes invalid or future source dates to the retrieval-date fallback", () => {
    expect(resolveEvidenceFreshnessDate({
      sourceDate: "2027-01-01",
      retrievedAt: "2026-10-20T10:00:00.000Z",
      now,
    })).toEqual({
      effectiveDate: "2026-10-20",
      dateBasis: "retrieval_date",
      requiresAdminReview: true,
    });
  });
});
