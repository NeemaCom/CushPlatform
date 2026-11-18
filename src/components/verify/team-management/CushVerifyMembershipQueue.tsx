import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, MailCheck, RefreshCw, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, readableError, roleLabel, statusLabel, type MemberRole } from "./team-management-shared";

type QueueMembership = {
  membershipId: number;
  institutionId: number;
  institutionLegalName: string;
  userId: number;
  fullName: string;
  email: string;
  jobTitle: string;
  role: MemberRole;
  status: "pending_approval" | "active" | "revoked" | "suspended";
  emailVerified: boolean;
  createdAt: string;
  applicationStatus: string;
  institutionStatus: string;
};
type QueueResponse = { memberships: QueueMembership[] };
type MembershipAction = "revoke";
type ActionResponse = { success: boolean; status: string };

const actionName: Record<MembershipAction, string> = { revoke: "Revoke access" };
const actionColor: Record<MembershipAction, string> = {
  revoke: "border border-[#e5c9b9] bg-white text-[#8d4b36] hover:bg-[#fbf2ec]",
};

function QueueStatus({ value }: { value: string }) {
  const tone = value === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : value === "pending_approval"
      ? "border-amber-200 bg-amber-50 text-amber-900"
        : value === "revoked" || value === "suspended"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-[#deddd4] bg-[#f5f4ef] text-[#656760]";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{statusLabel(value)}</span>;
}

export default function CushVerifyMembershipQueue() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending_approval" | "active" | "closed">("all");
  const [message, setMessage] = useState("");

  const queueQuery = useQuery<QueueResponse>({
    queryKey: ["/api/admin/cush-verify/memberships"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/cush-verify/memberships");
      return response.json() as Promise<QueueResponse>;
    },
    retry: false,
  });
  const actionMutation = useMutation({
    mutationFn: async ({ membershipId, action }: { membershipId: number; action: MembershipAction }) => {
      const response = await apiRequest("PUT", `/api/admin/cush-verify/memberships/${membershipId}`, { action });
      return response.json() as Promise<ActionResponse>;
    },
    onSuccess: async (result) => {
      setMessage(`Membership updated: ${statusLabel(result.status)}.`);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/cush-verify/memberships"] });
    },
  });

  if (queueQuery.isLoading) {
    return <div aria-label="Loading membership queue" className="space-y-4"><div className="h-28 animate-pulse rounded-2xl bg-[#eeede7]" /><div className="h-24 animate-pulse rounded-xl bg-[#eeede7]" /><div className="h-24 animate-pulse rounded-xl bg-[#eeede7]" /></div>;
  }
  if (queueQuery.isError) {
    return <section role="alert" className="rounded-2xl border border-[#e5c9b9] bg-[#fbf2ec] p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" /><div><h2 className="font-semibold text-[#5b3226]">Membership queue unavailable</h2><p className="mt-1 text-sm leading-6 text-[#79594c]">{readableError(queueQuery.error)}</p><button type="button" onClick={() => void queueQuery.refetch()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9b6a5] bg-[#fffaf7] px-3 text-sm font-semibold text-[#70402f]"><RefreshCw className="h-4 w-4" />Retry</button></div></div></section>;
  }

  const memberships = queueQuery.data?.memberships ?? [];
  const pendingCount = memberships.filter((item) => item.status === "pending_approval").length;
  const activeCount = memberships.filter((item) => item.status === "active").length;
  const filtered = memberships.filter((item) => {
    if (filter === "pending_approval") return item.status === "pending_approval";
    if (filter === "active") return item.status === "active";
    if (filter === "closed") return item.status !== "pending_approval" && item.status !== "active";
    return true;
  });

  function runAction(item: QueueMembership, action: MembershipAction) {
    const confirmation = `Revoke ${item.fullName}’s active Cush Verify access?`;
    if (window.confirm(confirmation)) {
      setMessage("");
      actionMutation.mutate({ membershipId: item.membershipId, action });
    }
  }

  return (
    <section aria-labelledby="cush-verify-memberships-heading">
      <header className="relative overflow-hidden rounded-2xl border border-[#343279] bg-[#29266f] px-5 py-6 text-[#f7f6f1] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-1 -top-10 h-40 w-40 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c7c5ee]"><span className="h-px w-5 bg-[#c7c5ee]" />Cush Verify · Cush Admin</p>
            <h1 id="cush-verify-memberships-heading" className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Membership oversight</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d2d1eb]">View institutional memberships and official-email status. Colleagues at approved institutions receive access as soon as they verify their email. Cush Admin can revoke active access. Email verification does not independently verify legal identity.</p>
          </div>
          <div className="flex gap-2">
            <div className="min-w-[100px] rounded-xl border border-white/15 bg-white/5 px-3 py-2.5"><p className="text-[10px] uppercase tracking-[0.12em] text-[#c7c5ee]">Pending institution</p><p className="mt-1 font-mono text-xl text-white">{pendingCount}</p></div>
            <div className="min-w-[100px] rounded-xl border border-white/15 bg-white/5 px-3 py-2.5"><p className="text-[10px] uppercase tracking-[0.12em] text-[#c7c5ee]">Active access</p><p className="mt-1 font-mono text-xl text-white">{activeCount}</p></div>
          </div>
        </div>
      </header>

      {message && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p>}
      {actionMutation.isError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">{readableError(actionMutation.error)}</p>}

      <div className="mb-4 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
         <div><h2 className="text-lg font-semibold tracking-tight text-[#24252a]">Institutional memberships</h2><p className="mt-1 text-xs text-[#777973]">{memberships.length} total membership records</p></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter memberships">
          {([
            ["all", "All"],
             ["pending_approval", "Pending institution"],
            ["active", "Active"],
            ["closed", "Closed"],
          ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition ${filter === value ? "bg-[#29266f] text-white" : "border border-[#deddd4] bg-[#fbfaf6] text-[#555750] hover:bg-white"}`}>{label}</button>)}
        </div>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d7cd] bg-[#fbfaf6] px-5 py-12 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-[#82847d]" /><h3 className="mt-3 text-sm font-semibold text-[#393a39]">No membership records</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#7b7c76]">Institutional memberships will appear here for Cush Admin oversight.</p></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d7cd] bg-[#fbfaf6] px-5 py-10 text-center"><p className="text-sm font-semibold text-[#393a39]">No records in this view</p><p className="mt-1 text-xs text-[#7b7c76]">Choose another membership status filter.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const active = item.status === "active";
            const actions: MembershipAction[] = active ? ["revoke"] : [];
            return (
              <article key={item.membershipId} className="rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-[#24252a]">{item.institutionLegalName}</h3><QueueStatus value={item.status} /></div>
                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#393a39]"><UserRound className="h-4 w-4 text-[#777973]" />{item.fullName}<span className="text-[#a2a299]">·</span>{item.jobTitle}</p>
                    <p className="mt-1 break-all text-sm text-[#57539c]">{item.email}</p>
                    <p className="mt-1 text-xs text-[#777973]">{roleLabel(item.role)} · Membership {item.membershipId} · Institution {item.institutionId}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#555750]">
                      <span className="inline-flex items-center gap-1.5">{item.emailVerified ? <MailCheck className="h-3.5 w-3.5 text-[#16816f]" /> : <Clock3 className="h-3.5 w-3.5 text-[#a97518]" />}Official email {item.emailVerified ? "verified" : "not verified"}</span>
                      <span>Application: {statusLabel(item.applicationStatus)}</span>
                      <span>Institution: {statusLabel(item.institutionStatus)}</span>
                      <span>Requested {formatDate(item.createdAt)}</span>
                    </div>
                    {item.status === "pending_approval" && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{item.emailVerified ? "This initial organisation account is waiting for the organisation application review." : "The official email is not yet verified. Team memberships at approved organisations do not require an additional Cush Admin approval."}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 xl:w-44 xl:flex-col">
                    {actions.map((action) => <button key={action} type="button" disabled={actionMutation.isPending} onClick={() => runAction(item, action)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${actionColor[action]}`}>
                      <XCircle className="h-4 w-4" />
                      {actionName[action]}
                    </button>)}
                    {actions.length === 0 && <p className="rounded-lg border border-[#e4e2d9] bg-white px-3 py-2 text-center text-[11px] leading-5 text-[#777973]">No action available for this status</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
