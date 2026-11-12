import { describe, expect, it } from "vitest";
import {
  canAccessCushVerifyWorkspace,
  canFinalApproveCushVerifyApplication,
} from "./cush-verify-access";

describe("Cush Verify institutional access gates", () => {
  it("grants workspace access only when application, institution, and membership are approved", () => {
    expect(canAccessCushVerifyWorkspace({
      applicationStatus: "approved",
      institutionStatus: "approved",
      membershipStatus: "active",
      emailVerified: true,
    })).toBe(true);
    expect(canAccessCushVerifyWorkspace({
      applicationStatus: "under_review",
      institutionStatus: "approved",
      membershipStatus: "active",
      emailVerified: true,
    })).toBe(false);
    expect(canAccessCushVerifyWorkspace({
      applicationStatus: "approved",
      institutionStatus: "pending_approval",
      membershipStatus: "active",
      emailVerified: true,
    })).toBe(false);
    expect(canAccessCushVerifyWorkspace({
      applicationStatus: "approved",
      institutionStatus: "approved",
      membershipStatus: "pending_approval",
      emailVerified: true,
    })).toBe(false);
  });

  it("requires review state, invitation acceptance, and verified email for final approval", () => {
    const pending = {
      applicationStatus: "under_review",
      institutionStatus: "pending_approval",
      membershipStatus: "pending_approval",
      emailVerified: true,
      invitationAccepted: true,
    };
    expect(canFinalApproveCushVerifyApplication(pending)).toBe(true);
    expect(canFinalApproveCushVerifyApplication({ ...pending, emailVerified: false })).toBe(false);
    expect(canFinalApproveCushVerifyApplication({ ...pending, invitationAccepted: false })).toBe(false);
    expect(canFinalApproveCushVerifyApplication({ ...pending, institutionStatus: "approved" })).toBe(false);
  });
});
