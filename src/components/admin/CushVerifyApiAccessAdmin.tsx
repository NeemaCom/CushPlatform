import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type ApiAccessRequest = {
  id: number;
  institutionId: number;
  institutionName: string;
  institutionType: string;
  requesterName: string;
  requesterEmail: string;
  intendedUse: string;
  estimatedMonthlyRequests: number | null;
  status: "submitted" | "approved" | "rejected";
  decisionNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
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

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not reviewed";
}

const statusLabels: Record<ApiAccessRequest["status"], string> = {
  submitted: "Awaiting review",
  approved: "Approved",
  rejected: "Not approved",
};

export default function CushVerifyApiAccessAdmin({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [decisionNoteById, setDecisionNoteById] = useState<Record<number, string>>({});
  const requestsQuery = useQuery<{ requests: ApiAccessRequest[] }>({
    queryKey: ["/api/admin/cush-verify/api-access-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/cush-verify/api-access-requests");
      return response.json() as Promise<{ requests: ApiAccessRequest[] }>;
    },
    retry: false,
  });
  const decisionMutation = useMutation({
    mutationFn: async ({ id, decision, decisionNote }: {
      id: number;
      decision: "approved" | "rejected";
      decisionNote: string;
    }) => {
      const response = await apiRequest("PUT", `/api/admin/cush-verify/api-access-requests/${id}`, {
        decision,
        decisionNote,
      });
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/cush-verify/api-access-requests"] }),
  });

  if (requestsQuery.isLoading) {
    return <div className="animate-pulse rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-8 text-sm text-[#777973]">Loading API access requests…</div>;
  }

  if (requestsQuery.isError) {
    return (
      <section className="rounded-2xl border border-[#e5c9b9] bg-[#fbf2ec] p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" />
          <div className="min-w-0">
            <h2 className="font-semibold text-[#5b3226]">API access queue unavailable</h2>
            <p className="mt-1 break-words text-sm leading-6 text-[#79594c]">{readableError(requestsQuery.error)}</p>
            <button type="button" onClick={() => requestsQuery.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d9b6a5] bg-[#fffaf7] px-3 py-2 text-sm font-semibold text-[#70402f]">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const requests = requestsQuery.data?.requests ?? [];
  return (
    <section aria-label="Cush Verify API access requests">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Cush Verify · API</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#24252a]">Production API access requests</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6f706f]">
            Review the institution’s stated API use. Approval is only one gate: the organisation must also have an active subscription whose plan includes API access.
          </p>
        </div>
        <button type="button" onClick={() => requestsQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-[#deddd4] bg-white px-3 py-2 text-xs font-semibold text-[#555750] hover:bg-[#fbfaf6]">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {decisionMutation.isError && (
        <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {readableError(decisionMutation.error)}
        </p>
      )}
      {decisionMutation.isSuccess && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Decision saved. Production keys remain subject to the organisation’s plan entitlement.
        </p>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d7cd] bg-[#fbfaf6] px-5 py-12 text-center">
          <ShieldCheck className="mx-auto h-6 w-6 text-[#777973]" />
          <h3 className="mt-3 text-sm font-semibold text-[#393a39]">No API access requests</h3>
          <p className="mt-1 text-xs text-[#7b7c76]">Organisation administrators can submit a request from their API workspace.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const note = decisionNoteById[request.id] ?? "";
            const pending = request.status === "submitted";
            return (
              <article key={request.id} className="rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#24252a]">{request.institutionName}</h3>
                    <p className="mt-1 text-xs text-[#777973]">
                      {request.institutionType.replace(/_/g, " ")} · {request.requesterName} · {request.requesterEmail}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    request.status === "submitted"
                      ? "bg-amber-100 text-amber-900"
                      : request.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                  }`}>
                    {request.status === "submitted" ? <Clock3 className="h-3.5 w-3.5" /> : request.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {statusLabels[request.status]}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#888980]">Intended API use</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#4c4d4a]">{request.intendedUse}</p>
                  </div>
                  <div className="space-y-2 text-xs text-[#686963]">
                    <p><span className="font-semibold">Estimated monthly requests:</span> {request.estimatedMonthlyRequests === null ? "Not provided" : request.estimatedMonthlyRequests.toLocaleString()}</p>
                    <p><span className="font-semibold">Submitted:</span> {formatDate(request.createdAt)}</p>
                    <p><span className="font-semibold">Reviewed:</span> {formatDate(request.reviewedAt)}</p>
                  </div>
                </div>
                {request.decisionNote && (
                  <p className="mt-3 rounded-lg border border-[#e5e3db] bg-white p-3 text-sm text-[#555750]">
                    <span className="font-semibold">Review note:</span> {request.decisionNote}
                  </p>
                )}
                {pending && canManage && (
                  <div className="mt-4 border-t border-[#e5e3db] pt-4">
                    <label className="block text-xs font-semibold text-[#62635e]">
                      Decision note {decisionNoteById[request.id] !== undefined ? "" : "(required when rejecting)"}
                      <textarea
                        value={note}
                        onChange={(event) => setDecisionNoteById((current) => ({ ...current, [request.id]: event.target.value }))}
                        maxLength={1200}
                        rows={2}
                        placeholder="Add context for the institution. A reason is required to reject."
                        className="mt-1.5 w-full rounded-lg border border-[#deddd4] bg-white px-3 py-2 text-sm font-normal text-[#24252a]"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => decisionMutation.mutate({ id: request.id, decision: "approved", decisionNote: note })}
                        disabled={decisionMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve request
                      </button>
                      <button
                        type="button"
                        onClick={() => decisionMutation.mutate({ id: request.id, decision: "rejected", decisionNote: note })}
                        disabled={decisionMutation.isPending || note.trim().length < 5}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject request
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
