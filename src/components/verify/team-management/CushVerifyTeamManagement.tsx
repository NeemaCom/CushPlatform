import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, Check, Clock3, Mail, Plus, RefreshCw, ShieldCheck, Users, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  formatDate,
  readableError,
  roleLabel,
  statusLabel,
  type Institution,
  type Invitation,
  type Member,
  type MemberRole,
} from "./team-management-shared";

type TeamResponse = { institution: Institution; members: Member[]; invitations: Invitation[] };
type InviteResult = { success: boolean; invitationEmailStatus: string; message: string };

const panel = "rounded-2xl border border-[#d8e3f1] bg-white";
const inputClass = "mt-1.5 min-h-11 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-3.5 text-sm text-[#14213a] outline-none transition focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/10";
const roleOptions: MemberRole[] = ["organisation_admin", "analyst", "viewer"];

function StatusPill({ value }: { value: string }) {
  const style = value === "active" || value === "approved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : value === "pending" || value === "pending_approval"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-[#d8e3f1] bg-[#f3f7fc] text-[#61728a]";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${style}`}>{statusLabel(value)}</span>;
}

function LoadingState() {
  return (
    <div aria-label="Loading team details" className="space-y-4">
      <div className="h-28 animate-pulse rounded-2xl bg-[#f1f6fc]" />
      <div className="h-52 animate-pulse rounded-2xl bg-[#f1f6fc]" />
      <div className="h-40 animate-pulse rounded-2xl bg-[#f1f6fc]" />
    </div>
  );
}

export default function CushVerifyTeamManagement({ currentRole }: { currentRole: MemberRole }) {
  const queryClient = useQueryClient();
  const isOrganisationAdmin = currentRole === "organisation_admin";
  const [formOpen, setFormOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<MemberRole>("viewer");
  const [notice, setNotice] = useState("");

  const teamQuery = useQuery<TeamResponse>({
    queryKey: ["/api/verify/team"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/verify/team");
      return response.json() as Promise<TeamResponse>;
    },
    retry: false,
  });
  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; fullName: string; jobTitle: string; role: MemberRole }) => {
      const response = await apiRequest("POST", "/api/verify/team/invitations", payload);
      return response.json() as Promise<InviteResult>;
    },
    onSuccess: async (result) => {
      setNotice(result.message || `Invitation submitted. Email status: ${statusLabel(result.invitationEmailStatus)}.`);
      setFullName("");
      setEmail("");
      setJobTitle("");
      setRole("viewer");
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/verify/team"] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await apiRequest("DELETE", `/api/verify/team/invitations/${invitationId}`);
      return response.json() as Promise<{ success: boolean; message: string }>;
    },
    onSuccess: async (result) => {
      setNotice(result.message || "Invitation cancelled.");
      await queryClient.invalidateQueries({ queryKey: ["/api/verify/team"] });
    },
  });

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    inviteMutation.mutate({ email: email.trim(), fullName: fullName.trim(), jobTitle: jobTitle.trim(), role });
  }

  if (teamQuery.isLoading) return <LoadingState />;
  if (teamQuery.isError) {
    return (
      <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-rose-950">Team details unavailable</h2>
            <p className="mt-1 break-words text-sm leading-6 text-rose-800">{readableError(teamQuery.error)}</p>
            <button type="button" onClick={() => void teamQuery.refetch()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 text-sm font-semibold text-rose-900 hover:bg-rose-50">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const data = teamQuery.data!;
  const canInvite = isOrganisationAdmin
    && data.institution.applicationStatus === "approved"
    && ["approved", "active"].includes(data.institution.status);
  const activeMembers = data.members.filter((member) => member.status === "active");
  const visibleMembers = canInvite
    ? data.members
    : activeMembers.filter((member) => member.role === "organisation_admin");
  const pendingInvitations = data.invitations.filter((invitation) => invitation.status === "pending");

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Institutional workspace · Settings</p>
          <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Team & access</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52627b]">Manage who can access your organisation’s Cush Verify workspace.</p>
        </div>
        {canInvite && (
          <button type="button" onClick={() => { setFormOpen((open) => !open); setNotice(""); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white transition hover:bg-[#275fb7] focus:outline-none focus:ring-4 focus:ring-[#3977e6]/20">
            {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {formOpen ? "Close invite form" : "Invite a colleague"}
          </button>
        )}
      </header>

      <section className={`${panel} overflow-hidden`}>
        <div className="flex items-start gap-3 border-b border-[#e6edf6] bg-[#f8fbff] px-5 py-4 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]"><Building2 className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[#12213d]">{data.institution.legalName}</h3>
              <StatusPill value={data.institution.status} />
            </div>
            {data.institution.tradingName && <p className="mt-1 text-xs text-[#61728a]">Trading as {data.institution.tradingName}</p>}
          </div>
        </div>
        <dl className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {[
            ["Institution type", statusLabel(data.institution.institutionType)],
            ["Country of registration", data.institution.countryOfRegistration],
            ["Website", data.institution.website || "Not provided"],
            ["Business email", data.institution.businessEmail],
            ["Application status", statusLabel(data.institution.applicationStatus)],
          ].map(([label, value]) => <div key={label}><dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#71819b]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#243650]">{value}</dd></div>)}
        </dl>
        <p className="px-5 pb-5 text-xs leading-5 text-[#71819b] sm:px-6">
          These details were provided in the institution’s application. Cush Verify confirms email mailbox ownership, not the organisation’s legal identity or email-domain affiliation.
        </p>
      </section>

      {notice && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-900"><Check className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
      {inviteMutation.isError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">{readableError(inviteMutation.error)}</p>}
      {cancelMutation.isError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">{readableError(cancelMutation.error)}</p>}

      {formOpen && canInvite && (
        <section className={`${panel} p-5 sm:p-6`} aria-labelledby="invite-colleague-heading">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3973c8]">New invitation</p>
            <h3 id="invite-colleague-heading" className="mt-1 text-lg font-semibold text-[#12213d]">Add a colleague</h3>
            <p className="mt-1 text-sm leading-6 text-[#61728a]">Use their official work email address. Other official email domains are welcome. Workspace access begins as soon as the colleague verifies mailbox ownership. The institution’s initial application approval remains separate.</p>
          </div>
          <form onSubmit={submitInvite} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#52627b]">Full name<input className={inputClass} required maxLength={160} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
            <label className="text-xs font-semibold text-[#52627b]">Official work email<input className={inputClass} required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="text-xs font-semibold text-[#52627b]">Job title<input className={inputClass} required maxLength={120} autoComplete="organization-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} /></label>
            <label className="text-xs font-semibold text-[#52627b] sm:col-span-2">Workspace role
              <select className={inputClass} value={role} onChange={(event) => setRole(event.target.value as MemberRole)}>{roleOptions.map((option) => <option key={option} value={option}>{roleLabel(option)}</option>)}</select>
            </label>
            <div className="sm:col-span-2">
              <div className="flex items-start gap-2 rounded-xl bg-[#f4f8fd] p-3 text-xs leading-5 text-[#52627b]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3471d2]" />
                <p>Cush Verify confirms mailbox ownership only. It does not independently verify the colleague’s legal identity, role, or organisation-domain affiliation.</p>
              </div>
              <button type="submit" disabled={inviteMutation.isPending} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#275fb7] disabled:cursor-not-allowed disabled:opacity-60">
                <Mail className="h-4 w-4" />{inviteMutation.isPending ? "Sending invitation…" : "Send invitation"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={`${panel} overflow-hidden`}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6edf6] px-5 py-4 sm:px-6">
          <div><div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#3471d2]" /><h3 className="font-semibold text-[#12213d]">Team members</h3></div><p className="mt-1 text-xs text-[#71819b]">{canInvite ? "Current and awaiting-email memberships" : "Active organisation administrators"}</p></div>
          <span className="rounded-full border border-[#d8e3f1] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-semibold text-[#52627b]">{visibleMembers.length} {visibleMembers.length === 1 ? "person" : "people"}</span>
        </div>
        {visibleMembers.length === 0 ? (
          <div className="px-5 py-10 text-center sm:px-6"><Users className="mx-auto h-6 w-6 text-[#91a1b6]" /><h4 className="mt-3 text-sm font-semibold text-[#243650]">No team members to show</h4><p className="mt-1 text-xs leading-5 text-[#71819b]">{canInvite ? "Invited colleagues and existing memberships will appear here." : "No active organisation administrators are currently listed."}</p></div>
        ) : (
          <ul className="divide-y divide-[#edf1f6]">
            {visibleMembers.map((member) => <li key={member.membershipId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#243650]">{member.fullName}</p><StatusPill value={member.status} /></div>
                <p className="mt-1 break-all text-xs text-[#52627b]">{member.email}</p>
                <p className="mt-1 text-xs text-[#71819b]">{member.jobTitle} · {roleLabel(member.role)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-[#61728a]">
                {member.emailVerified ? <><ShieldCheck className="h-4 w-4 text-[#16816f]" /> Email verified</> : <><Clock3 className="h-4 w-4 text-[#a97518]" /> Email not verified</>}
                <span className="hidden text-[#a6b2c1] sm:inline">·</span><span>Added {formatDate(member.createdAt)}</span>
              </div>
            </li>)}
          </ul>
        )}
      </section>

      {canInvite && (
        <section className={`${panel} overflow-hidden`}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6edf6] px-5 py-4 sm:px-6">
            <div><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#3471d2]" /><h3 className="font-semibold text-[#12213d]">Pending invitations</h3></div><p className="mt-1 text-xs text-[#71819b]">Unaccepted invitations can be cancelled here.</p></div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">{pendingInvitations.length} pending</span>
          </div>
          {pendingInvitations.length === 0 ? (
            <div className="px-5 py-9 text-center sm:px-6"><Mail className="mx-auto h-6 w-6 text-[#91a1b6]" /><h4 className="mt-3 text-sm font-semibold text-[#243650]">No pending invitations</h4><p className="mt-1 text-xs text-[#71819b]">New invitations awaiting acceptance will appear here.</p></div>
          ) : (
            <ul className="divide-y divide-[#edf1f6]">{pendingInvitations.map((invitation) => <li key={invitation.invitationId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#243650]">{invitation.fullName}</p><StatusPill value={invitation.status} /></div><p className="mt-1 break-all text-xs text-[#52627b]">{invitation.email}</p><p className="mt-1 text-xs text-[#71819b]">{invitation.jobTitle} · {roleLabel(invitation.role)}</p><p className="mt-1 text-[11px] text-[#71819b]">Sent {formatDate(invitation.createdAt)} · Expires {formatDate(invitation.expiresAt)}</p></div>
              <button type="button" disabled={cancelMutation.isPending} onClick={() => { if (window.confirm(`Cancel the invitation for ${invitation.email}?`)) cancelMutation.mutate(invitation.invitationId); }} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#cad7e8] bg-white px-3.5 text-xs font-semibold text-[#52627b] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"><X className="h-3.5 w-3.5" />Cancel invite</button>
            </li>)}</ul>
          )}
        </section>
      )}
    </div>
  );
}
