import { describe, expect, it } from "vitest";
import { firebaseProfileNamePatch } from "./firebase-profile-name";

describe("Firebase profile-name hydration", () => {
  it("replaces an empty or placeholder name from the verified provider profile", () => {
    expect(firebaseProfileNamePatch(
      { firstName: "User", lastName: "" },
      "Ada Lovelace",
    )).toEqual({ firstName: "Ada", lastName: "Lovelace" });
  });

  it("fills a missing surname only when the provider first name matches", () => {
    expect(firebaseProfileNamePatch(
      { firstName: "Ada", lastName: "" },
      "Ada Lovelace",
    )).toEqual({ lastName: "Lovelace" });
  });

  it("does not overwrite an established profile name", () => {
    expect(firebaseProfileNamePatch(
      { firstName: "Ada", lastName: "Lovelace" },
      "Different Provider Name",
    )).toEqual({});
  });

  it("does nothing when Firebase has no usable display name", () => {
    expect(firebaseProfileNamePatch(
      { firstName: "User", lastName: "" },
      "   ",
    )).toEqual({});
  });
});
