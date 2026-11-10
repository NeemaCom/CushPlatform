import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, CheckCircle2, Mail, RefreshCw, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  cushVerifyApplicationStatuses,
  type CushVerifyApplicationStatus,
} from "@shared/cush-verify";

type Application = {
  id: number;
  legalName: string;
  tradingName: string | null;
  institutionType: string;
  countryOfRegistration: string;
  website: string;
  businessEmail: string;
  contactFullName: string;
  contactJobTitle: string;
  businessTelephone: string;
  intendedUse: string;
  estimatedMonthlyVerifications: number | null;
  contactConsentAcceptedAt: string;
  status: CushVerifyApplicationStatus;
  reviewedAt: string | null;
  createdAt: string;
  institutionId: number | null;
  institutionStatus: string | null;
  invitationAccepted: boolean;
  invitedAccountEmailVerified: boolean;
  events: { eventType: string; createdAt: string }[];
};

const statusLabels: Record<CushVerifyApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  additional_information_required: "Additional information required",
  approved: "Approved",
  rejected: "Rejected",
};

function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
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

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CushVerifyApplicationsAdmin({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [statusById, setStatusById] = useState<Record<number, CushVerifyApplicationStatus>>({});
  const applicationsQuery = useQuery<{ applications: Application[] }>({
    queryKey: ["/api/admin/cush-verify/applications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/cush-verify/applications");
      return response.json() as Promise<{ applications: Application[] }>;
    },
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: CushVerifyApplicationStatus }) => {
      const response = await apiRequest("PUT", `/api/admin/cush-verify/applications/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/cush-verify/applications"] }),
  });
  const onboardMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/admin/cush-verify/applications/${id}/onboard`, {});
      return response.json() as Promise<{ message?: string; invitationEmailStatus?: string }>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/cush-verify/applications"] }),
  });
  const resendMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/admin/cush-verify/applications/${id}/invitation/resend`, {});
      return response.json() as Promise<{ message?: string }>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/cush-verify/applications"] }),
  });

  if (applicationsQuery.isLoading) {
    return <div className="animate-pulse rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-8 text-sm text-[#777973]">Loading institution applications…</div>;
  }
  if (applicationsQuery.isError) {
    return (
      <section className="rounded-2xl border border-[#e5c9b9] bg-[#fbf2ec] p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" />
          <div className="min-w-0">
            <h2 className="font-semibold text-[#5b3226]">Applications unavailable</h2>
            <p className="mt-1 break-words text-sm leading-6 text-[#79594c]">{readableError(applicationsQuery.error)}</p>
            <button type="button" onClick={() => applicationsQuery.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d9b6a5] bg-[#fffaf7] px-3 py-2 text-sm font-semibold text-[#70402f]">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const applications = applicationsQuery.data?.applications ?? [];
  return (
    <section aria-label="Cush Verify institutional applications">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Cush Verify · Institutional accounts</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#24252a]">Institution applications</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6f706f]">Applications do not grant access. Move an application under review, explicitly create the organisation and invite its named contact, then approve only after they register and verify their official email.</p>
        </div>
        <span className="rounded-full border border-[#e5e3db] bg-[#f5f4ef] px-2.5 py-1 text-[11px] font-medium text-[#656760]">{applications.length} recent</span>
      </div>

      {statusMutation.isError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{readableError(statusMutation.error)}</p>}
      {onboardMutation.isError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{readableError(onboardMutation.error)}</p>}
      {resendMutation.isError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{readableError(resendMutation.error)}</p>}
      {onboardMutation.isSuccess && (
        <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {onboardMutation.data.message ?? "Organisation onboarding was started. Final approval is still required."}
        </p>
      )}
      {resendMutation.isSuccess && <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{resendMutation.data.message ?? "A fresh invitation has been sent."}</p>}
      {statusMutation.isSuccess && <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Application status updated.</p>}

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d7cd] bg-[#fbfaf6] px-5 py-12 text-center">
          <Building2 className="mx-auto h-6 w-6 text-[#777973]" />
          <h3 className="mt-3 text-sm font-semibold text-[#393a39]">No applications yet</h3>
          <p className="mt-1 text-xs text-[#7b7c76]">New institutional applications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((application) => {
            const selected = statusById[application.id] ?? application.status;
            const canOnboard = canManage && selected === "under_review" && !application.institutionId;
            const canApprove = canManage && application.institutionId &&
              application.status !== "approved" &&
              application.invitationAccepted &&
              application.invitedAccountEmailVerified;
            const canResend = canManage && application.institutionId &&
              application.status === "under_review" &&
              !application.invitationAccepted;
            return (
              <article key={application.id} className="rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[#24252a]">{application.legalName}</h3>
                      <span className="rounded-full border border-[#deddd4] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#656760]">{statusLabels[application.status]}</span>
                      {application.institutionStatus && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Organisation: {application.institutionStatus.replace(/_/g, " ")}</span>}
                    </div>
                    {application.tradingName && <p className="mt-1 text-xs text-[#777973]">Trading as {application.tradingName}</p>}
                    <p className="mt-2 text-sm text-[#555750]">{application.contactFullName} · {application.contactJobTitle}</p>
                    <p className="mt-1 break-all text-sm font-medium text-[#39358b]">{application.businessEmail}</p>
                    <p className="mt-1 text-xs text-[#777973]">{application.institutionType.replace(/_/g, " ")} · {application.countryOfRegistration} · {application.businessTelephone}</p>
                    <p className="mt-1 break-all text-xs text-[#275fb7]">{application.website}</p>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-6 text-[#555750]">{application.intendedUse}</p>
                    <p className="mt-2 text-xs text-[#777973]">
                      Estimated monthly requests: {application.estimatedMonthlyVerifications?.toLocaleString("en-GB") ?? "Not specified"} · Submitted {dateLabel(application.createdAt)}
                    </p>
                    {application.institutionId && (
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#555750]">
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        Invitation {application.invitationAccepted ? "accepted" : "pending"} · Email {application.invitedAccountEmailVerified ? "verified" : "not verified"}
                      </p>
                    )}
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#777973]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#438471]" /> Contact permission recorded {dateLabel(application.contactConsentAcceptedAt)}
                    </p>
                    <details className="mt-3 max-w-2xl rounded-lg border border-[#e4e2d9] bg-white px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-[#555750]">Registration activity ({application.events.length})</summary>
                      <ol className="mt-2 space-y-1.5 border-l border-[#d8e3f1] pl-3">
                        {application.events.map((event, index) => (
                          <li key={`${event.eventType}-${event.createdAt}-${index}`} className="text-xs text-[#61728a]">
                            <span className="font-medium text-[#34353a]">{event.eventType.replace(/_/g, " ")}</span>
                            <span className="ml-2">{dateLabel(event.createdAt)}</span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:w-64 xl:flex-col">
                      <label className="sr-only" htmlFor={`application-status-${application.id}`}>Application status for {application.legalName}</label>
                      <select
                        id={`application-status-${application.id}`}
                        value={selected}
                        onChange={(event) => setStatusById((current) => ({ ...current, [application.id]: event.target.value as CushVerifyApplicationStatus }))}
                        className="min-h-10 rounded-lg border border-[#d5d3c9] bg-white px-3 py-2 text-sm text-[#34353a] outline-none focus:border-[#57539c] focus:ring-2 focus:ring-[#57539c]/15"
                      >
                        {cushVerifyApplicationStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={selected === application.status || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: application.id, status: selected })}
                        className="min-h-10 rounded-lg border border-[#d5d3c9] bg-white px-3 py-2 text-sm font-semibold text-[#34353a] disabled:opacity-50"
                      >
                        Save application status
                      </button>
                      {canOnboard && (
                        <button
                          type="button"
                          disabled={onboardMutation.isPending}
                          onClick={() => onboardMutation.mutate(application.id)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#29266f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#39358b] disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" /> Create organisation & invite
                        </button>
                      )}
                      {canResend && (
                        <button
                          type="button"
                          disabled={resendMutation.isPending}
                          onClick={() => resendMutation.mutate(application.id)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d5d3c9] bg-white px-3 py-2 text-sm font-semibold text-[#34353a] disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" /> Resend secure invitation
                        </button>
                      )}
                      {canApprove && (
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: application.id, status: "approved" })}
                          className="min-h-10 rounded-lg bg-[#16816f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#126b5c] disabled:opacity-50"
                        >
                          Final approve & enable access
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
