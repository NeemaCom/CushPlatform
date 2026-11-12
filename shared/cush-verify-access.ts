export interface CushVerifyAccessState {
  applicationStatus: string;
  institutionStatus: string;
  membershipStatus: string;
  emailVerified?: boolean;
}

export function canAccessCushVerifyWorkspace(state: CushVerifyAccessState): boolean {
  return state.applicationStatus === "approved" &&
    state.institutionStatus === "approved" &&
    state.membershipStatus === "active" &&
    state.emailVerified !== false;
}

export function canFinalApproveCushVerifyApplication(
  state: CushVerifyAccessState & { invitationAccepted: boolean },
): boolean {
  return state.applicationStatus === "under_review" &&
    state.institutionStatus === "pending_approval" &&
    state.membershipStatus === "pending_approval" &&
    state.invitationAccepted &&
    state.emailVerified === true;
}
