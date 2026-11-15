import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, Check, Clock3, ShieldCheck, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import {
  CUSH_VERIFY_REPORT_CATEGORIES,
  type CushVerifyReportCategory,
} from "@shared/cush-verify-reports";

type ConsentRequest = {
  id: string;
  institutionName: string;
  purpose: string;
  requestedCategories: CushVerifyReportCategory[];
  requestedAuthorizationDays: number;
  status: "awaiting_consent" | "authorized" | "declined" | "revoked" | "expired";
  requestExpiresAt: string;
  authorizationExpiresAt: string | null;
  createdAt: string;
};

async function requestJson<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error((payload as { error?: string }).error || "Request could not be completed.") as Error & { code?: string };
    error.code = (payload as { code?: string }).code;
    throw error;
  }
  return payload as T;
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not applicable";
}

function RequestCard({ request }: { request: ConsentRequest }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<CushVerifyReportCategory[]>([]);
  const [days, setDays] = useState(Math.min(request.requestedAuthorizationDays, 30));
  const actionable = request.status === "awaiting_consent";
  const canRevoke = request.status === "authorized" &&
    request.authorizationExpiresAt !== null &&
    new Date(request.authorizationExpiresAt).getTime() > Date.now();

  const decisionMutation = useMutation({
    mutationFn: (decision: { decision: "approve"; categories: CushVerifyReportCategory[]; authorizationDays: number } | { decision: "decline" }) =>
      requestJson(`/api/passport/verification-requests/${encodeURIComponent(request.id)}/decision`, "POST", decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/passport/verification-requests"] });
      toast({ title: "Decision saved", description: "Your choice has been recorded for this request." });
    },
    onError: (error: Error) => toast({ title: "Could not save your decision", description: error.message, variant: "destructive" }),
  });
  const revokeMutation = useMutation({
    mutationFn: () =>
      requestJson(`/api/passport/verification-requests/${encodeURIComponent(request.id)}/revoke`, "POST", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/passport/verification-requests"] });
      toast({ title: "Access revoked", description: "Cush Verify can no longer retrieve new reports under this request." });
    },
    onError: (error: Error) => toast({ title: "Could not revoke access", description: error.message, variant: "destructive" }),
  });

  function toggleCategory(category: CushVerifyReportCategory) {
    setSelected((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  const statusLabel = request.status === "awaiting_consent"
    ? "Awaiting your decision"
    : request.status === "authorized"
      ? canRevoke ? "Authorized" : "Authorization expired"
      : request.status === "declined" ? "Declined"
        : request.status === "revoked" ? "Revoked"
          : "Expired";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">{request.institutionName}</h3>
            <p className="mt-1 text-xs text-slate-500">Requested {dateLabel(request.createdAt)}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
          actionable ? "bg-amber-50 text-amber-800" : canRevoke ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
        }`}>
          {actionable ? <Clock3 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stated purpose</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{request.purpose}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-700">Requested report categories</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {request.requestedCategories.map((category) => {
            const label = CUSH_VERIFY_REPORT_CATEGORIES.find((item) => item.value === category)?.label ?? category;
            return (
              <li key={category} className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="h-4 w-4 text-indigo-600" aria-hidden="true" /> {label}
              </li>
            );
          })}
        </ul>
      </div>

      {actionable && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-900">Choose what you consent to share</p>
          <div className="mt-2 grid gap-2">
            {request.requestedCategories.map((category) => {
              const label = CUSH_VERIFY_REPORT_CATEGORIES.find((item) => item.value === category)?.label ?? category;
              return (
                <label key={category} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selected.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
          <label className="mt-3 flex items-center gap-3 text-sm text-slate-700">
            Authorization period
            <input
              aria-label="Authorization period in days"
              type="number"
              min={1}
              max={request.requestedAuthorizationDays}
              value={days}
              onChange={(event) => setDays(Math.max(1, Math.min(request.requestedAuthorizationDays, Number(event.target.value) || 1)))}
              className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-center"
            />
            <span>days maximum requested</span>
          </label>
          <p className="mt-2 text-xs text-slate-500">This request expires {dateLabel(request.requestExpiresAt)} if you do not respond.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selected.length || decisionMutation.isPending}
              onClick={() => decisionMutation.mutate({ decision: "approve", categories: selected, authorizationDays: days })}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Approve selected
            </button>
            <button
              type="button"
              disabled={decisionMutation.isPending}
              onClick={() => decisionMutation.mutate({ decision: "decline" })}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Decline
            </button>
          </div>
        </div>
      )}

      {canRevoke && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="flex items-start gap-2 text-xs leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Revoking blocks future access in Cush. It cannot remove a report the institution already viewed or copied.
          </p>
          <button
            type="button"
            disabled={revokeMutation.isPending}
            onClick={() => revokeMutation.mutate()}
            className="mt-3 min-h-10 rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            Revoke future access
          </button>
        </div>
      )}
    </article>
  );
}

export default function CushVerifyConsentInbox() {
  const requestsQuery = useQuery<{ requests: ConsentRequest[] }>({
    queryKey: ["/api/passport/verification-requests"],
    queryFn: async () => {
      try {
        return await requestJson<{ requests: ConsentRequest[] }>("/api/passport/verification-requests");
      } catch (error) {
        if ((error as Error & { code?: string }).code === "CUSH_VERIFY_REPORT_SCHEMA_REQUIRED") {
          return { requests: [] };
        }
        throw error;
      }
    },
    retry: false,
  });
  if (requestsQuery.isLoading || (!requestsQuery.isError && !requestsQuery.data?.requests.length)) return null;
  if (requestsQuery.isError) {
    return (
      <section aria-label="Institutional report requests" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Institutional report requests could not be loaded. Your existing Cush Passport account remains available.
      </section>
    );
  }

  return (
    <section aria-label="Institutional report requests" className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Cush Verify requests</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">Review the institution, purpose, categories, and access period before sharing. Nothing is released unless you approve.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {requestsQuery.data!.requests.map((request) => <RequestCard key={request.id} request={request} />)}
      </div>
    </section>
  );
}
