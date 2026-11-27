import { describe, expect, it } from "vitest";
import { updateCachedPassportMode } from "./passport-mode-cache";

describe("updateCachedPassportMode", () => {
  it("changes the selected stage without clearing the current assessment", () => {
    const current = {
      passport: {
        mode: "pre_arrival",
        score: 591,
        provisionalScore: 591,
        scoreCoveragePercent: 85,
        confidenceScore: 42,
        assessmentStatus: "provisional",
        missingRequirements: ["Credit history"],
      },
      progression: { maturityStatus: "provisional" },
    };

    const updated = updateCachedPassportMode(current, "post_arrival");

    expect(updated).toEqual({
      passport: {
        ...current.passport,
        mode: "post_arrival",
      },
      progression: current.progression,
    });
    expect(updated.passport.score).toBe(591);
    expect(updated.passport.provisionalScore).toBe(591);
    expect(updated.passport.confidenceScore).toBe(42);
    expect(updated.passport.scoreCoveragePercent).toBe(85);
  });
});
