import { describe, expect, it } from "vitest";
import { getFirebaseVerificationContinueUrl } from "./auth-action-url";

describe("Firebase verification continuation URL", () => {
  it("returns users to the exact allowed frontend origin after verifying", () => {
    expect(getFirebaseVerificationContinueUrl(
      "https://app.we-cush.com",
      new Set(["https://app.we-cush.com"]),
    )).toBe("https://app.we-cush.com/login?emailVerified=1");
  });

  it("does not accept an untrusted origin as the email link destination", () => {
    expect(getFirebaseVerificationContinueUrl(
      "https://attacker.example",
      new Set(["https://app.we-cush.com"]),
    )).toBe("https://app.we-cush.com/login?emailVerified=1");
  });
});
