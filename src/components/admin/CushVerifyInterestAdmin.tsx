import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cushVerifyReviewStatuses, type CushVerifyReviewStatus } from "@shared/cush-verify";

type Interest = {
  id: number;
  institutionName: string;
  institutionType: string;
  contactName: string;
  jobTitle: string;
  email: string;
  country: string;
  intendedUse: string | null;
  verificationRequirements: string | null;
  preferredEngagementModel: string | null;
  contactConsentAcceptedAt: string;
  status: CushVerifyReviewStatus;
  reviewedAt: string | null;
  createdAt: string;
};

const statusLabels: Record<CushVerifyReviewStatus, string> = {
  pending_review: "Pending review",
  in_review: "In review",
  approved_for_follow_up: "Approved for follow-up",
  not_approved: "Not approved",
};

const engagementModelLabels: Record<string, string> = {
  institutional_portal: "Institutional portal",
  api_integration: "API integration",
  partnership_discussion: "Partnership discussion",
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

export default function CushVerifyInterestAdmin({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [statusById, setStatusById] = useState<Record<number, CushVerifyReviewStatus>>({});
  const interestsQuery = useQuery<{ interests: Interest[] }>({
    queryKey: ["/api/admin/cush-verify/interests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/cush-verify/interests");
      return response.json() as Promise<{ interests: Interest[] }>;
    },
    retry: false,
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: CushVerifyReviewStatus }) => {
      const response = await apiRequest("PUT", `/api/admin/cush-verify/interests/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/cush-verify/interests"] }),
  });

  if (interestsQuery.isLoading) {
    return <div className="animate-pulse rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-8 text-sm text-[#777973]">Loading interest requests…</div>;
  }

  if (interestsQuery.isError) {
    return (
      <section className="rounded-2xl border border-[#e5c9b9] bg-[#fbf2ec] p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" />
          <div className="min-w-0">
            <h2 className="font-semibold text-[#5b3226]">Interest queue unavailable</h2>
            <p className="mt-1 break-words text-sm leading-6 text-[#79594c]">{readableError(interestsQuery.error)}</p>
            <button type="button" onClick={() => interestsQuery.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d9b6a5] bg-[#fffaf7] px-3 py-2 text-sm font-semibold text-[#70402f]">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const interests = interestsQuery.data?.interests ?? [];
  return (
    <section aria-label="Cush Verify institution interest requests">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Cush Verify · Beta</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#24252a]">Institution interest requests</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6f706f]">Review prospective partners. Approval here is for follow-up only; it does not provision an account or grant verification access.</p>
        </div>
        <span className="rounded-full border border-[#e5e3db] bg-[#f5f4ef] px-2.5 py-1 text-[11px] font-medium text-[#656760]">{interests.length} recent</span>
      </div>

      {updateMutation.isError && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{readableError(updateMutation.error)}</p>}
      {updateMutation.isSuccess && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Review status saved. No institutional access was granted.</p>}

      {interests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d7cd] bg-[#fbfaf6] px-5 py-12 text-center">
          <Building2 className="mx-auto h-6 w-6 text-[#777973]" />
          <h3 className="mt-3 text-sm font-semibold text-[#393a39]">No interest requests yet</h3>
          <p className="mt-1 text-xs text-[#7b7c76]">New institutional submissions will appear here for review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interests.map((interest) => {
            const selected = statusById[interest.id] ?? interest.status;
            return (
              <article key={interest.id} className="rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[#24252a]">{interest.institutionName}</h3>
                      <span className="rounded-full border border-[#deddd4] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#656760]">{statusLabels[interest.status]}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#555750]">{interest.contactName} · {interest.jobTitle}</p>
                    <p className="mt-1 break-all text-sm font-medium text-[#39358b]">{interest.email}</p>
                    <p className="mt-1 text-xs text-[#777973]">{interest.institutionType.replace(/_/g, " ")} · {interest.country} · Submitted {dateLabel(interest.createdAt)}</p>
                    <p className="mt-2 text-xs font-medium text-[#555750]">Preferred engagement: {interest.preferredEngagementModel ? engagementModelLabels[interest.preferredEngagementModel] ?? interest.preferredEngagementModel : "Not specified"}</p>
                    {interest.intendedUse && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-6 text-[#555750]">{interest.intendedUse}</p>}
                    {interest.verificationRequirements && (
                      <div className="mt-2 rounded-lg border border-[#e4e2d9] bg-white p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#777973]">Verification requirements</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#555750]">{interest.verificationRequirements}</p>
                      </div>
                    )}
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#777973]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#438471]" /> Contact permission recorded {dateLabel(interest.contactConsentAcceptedAt)}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-64 lg:flex-col">
                      <label className="sr-only" htmlFor={`interest-status-${interest.id}`}>Review status for {interest.institutionName}</label>
                      <select
                        id={`interest-status-${interest.id}`}
                        value={selected}
                        onChange={(event) => setStatusById((current) => ({ ...current, [interest.id]: event.target.value as CushVerifyReviewStatus }))}
                        className="min-h-10 rounded-lg border border-[#d5d3c9] bg-white px-3 py-2 text-sm text-[#34353a] outline-none focus:border-[#57539c] focus:ring-2 focus:ring-[#57539c]/15"
                      >
                        {cushVerifyReviewStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={selected === interest.status || updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: interest.id, status: selected })}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#29266f] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#39358b] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Clock3 className="h-3.5 w-3.5" /> Save review status
                      </button>
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
