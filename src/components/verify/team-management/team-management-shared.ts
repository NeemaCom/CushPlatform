export type Institution = {
  id: number;
  legalName: string;
  tradingName: string | null;
  institutionType: string;
  countryOfRegistration: string;
  website: string;
  businessEmail: string;
  status: string;
  applicationStatus: string;
};

export type MemberRole = "organisation_admin" | "analyst" | "viewer";
export type MemberStatus = "pending_approval" | "active" | "revoked" | "suspended";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type Member = {
  membershipId: number;
  fullName: string;
  email: string;
  jobTitle: string;
  role: MemberRole;
  status: MemberStatus;
  emailVerified: boolean;
  createdAt: string;
};

export type Invitation = {
  invitationId: number;
  fullName: string;
  email: string;
  jobTitle: string;
  role: MemberRole;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  const body = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (body) {
    try {
      return (JSON.parse(body) as { error?: string }).error ?? message;
    } catch {
      return message;
    }
  }
  return message;
}

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function roleLabel(role: MemberRole) {
  return role === "organisation_admin" ? "Organisation administrator" : role === "analyst" ? "Analyst" : "Viewer";
}

export function statusLabel(status: string) {
  if (status === "pending_approval") return "Pending institution approval";
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
