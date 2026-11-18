import { describe, expect, it } from "vitest";
import {
  canAccessCushVerifyWorkspace,
  canFinalApproveCushVerifyApplication,
  resolveCushVerifyInvitationAccess,
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

  it("opens the full workspace after verified email activation", () => {
    const activatedAccount = {
      applicationStatus: "approved",
      institutionStatus: "approved",
      membershipStatus: "active",
      emailVerified: true,
    };
    expect(canAccessCushVerifyWorkspace(activatedAccount)).toBe(true);
    expect(canAccessCushVerifyWorkspace({ ...activatedAccount, emailVerified: false })).toBe(false);
  });

  it("activates a verified colleague immediately for an already-approved institution", () => {
    expect(resolveCushVerifyInvitationAccess({
      applicationStatus: "approved",
      institutionStatus: "approved",
      invitationRole: "analyst",
    })).toEqual({ membershipStatus: "active", accessGranted: true });
    expect(resolveCushVerifyInvitationAccess({
      applicationStatus: "approved",
      institutionStatus: "approved",
      invitationRole: "viewer",
    })).toEqual({ membershipStatus: "active", accessGranted: true });
  });

  it("keeps the initial organisation-admin invitation behind the institution approval gate", () => {
    expect(resolveCushVerifyInvitationAccess({
      applicationStatus: "under_review",
      institutionStatus: "pending_approval",
      invitationRole: "organisation_admin",
    })).toEqual({ membershipStatus: "pending_approval", accessGranted: false });
    expect(resolveCushVerifyInvitationAccess({
      applicationStatus: "under_review",
      institutionStatus: "pending_approval",
      invitationRole: "analyst",
    })).toBeNull();
    expect(resolveCushVerifyInvitationAccess({
      applicationStatus: "under_review",
      institutionStatus: "approved",
      invitationRole: "viewer",
    })).toBeNull();
  });
});
