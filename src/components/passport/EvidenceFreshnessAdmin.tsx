import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api-base";

type ReviewCase = {
  source: "mono" | "credit";
  evidenceId: number;
  userId: number;
  email: string;
  displayName: string;
  retrievedAt: string;
  detectedSourceDate: string | null;
  effectiveDate: string | null;
  ageDays: number | null;
  reason: string;
};

type ReviewQueue = {
  generatedAt: string;
  cases: ReviewCase[];
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload as T;
}

function formatDate(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function ReviewCaseCard({
  item,
  canManage,
  onReview,
  isSaving,
}: {
  item: ReviewCase;
  canManage: boolean;
  onReview: (item: ReviewCase, sourceDate: string | null) => void;
  isSaving: boolean;
}) {
  const [sourceDate, setSourceDate] = useState("");

  return (
    <article className="rounded-xl border border-[#e2e0d7] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7c7e77]">
            {item.source === "mono" ? "Bank statement" : "Credit report"} · Record {item.evidenceId}
          </p>
          <h3 className="mt-1 font-semibold text-[#24252a]">{item.displayName || item.email}</h3>
          <p className="mt-1 text-xs text-[#6f706f]">{item.email} · User {item.userId}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbf0dc] px-3 py-1 text-xs font-semibold text-[#855d20]">
          <Clock3 className="h-3.5 w-3.5" />
          Date needs review
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#60625d]">{item.reason}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-[#f7f6f1] p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#85867f]">Source date</dt>
          <dd className="mt-1 font-medium text-[#353630]">{item.detectedSourceDate ?? "Not provided"}</dd>
        </div>
        <div className="rounded-lg bg-[#f7f6f1] p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#85867f]">Retrieved</dt>
          <dd className="mt-1 font-medium text-[#353630]">{formatDate(item.retrievedAt)}</dd>
        </div>
        <div className="rounded-lg bg-[#f7f6f1] p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#85867f]">Age used for confidence</dt>
          <dd className="mt-1 font-medium text-[#353630]">{item.ageDays === null ? "Unknown" : `${item.ageDays} days`}</dd>
        </div>
      </dl>

      {canManage && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-medium text-[#62645e]">
            Confirm the provider’s source date
            <input
              type="date"
              value={sourceDate}
              onChange={(event) => setSourceDate(event.target.value)}
              className="mt-1.5 block min-h-10 w-full rounded-lg border border-[#d9d7cd] bg-white px-3 text-sm text-[#292a27] outline-none focus:border-[#514ba5] focus:ring-2 focus:ring-[#514ba5]/15"
            />
          </label>
          <button
            type="button"
            disabled={!sourceDate || isSaving}
            onClick={() => onReview(item, sourceDate || null)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#29266f] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Confirm source date
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onReview(item, null)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d9d7cd] bg-white px-4 text-xs font-semibold text-[#4d4e49] disabled:opacity-50"
          >
            Use retrieval date
          </button>
        </div>
      )}
    </article>
  );
}

export default function EvidenceFreshnessAdmin({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery<ReviewQueue>({
    queryKey: ["/api/admin/evidence-freshness/review-queue"],
    queryFn: () => request("GET", "/api/admin/evidence-freshness/review-queue"),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: ({ item, sourceDate }: { item: ReviewCase; sourceDate: string | null }) =>
      request("POST", `/api/admin/evidence-freshness/${item.source}/${item.evidenceId}`, { sourceDate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/evidence-freshness/review-queue"] }),
  });

  return (
    <section aria-labelledby="evidence-freshness-heading">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Cush Passport · Admin</p>
        <h1 id="evidence-freshness-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[#24252a]">Evidence freshness review</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f706f]">
          The system uses source dates where available and retrieval dates as a fallback. Age affects confidence only; it does not remove otherwise valid evidence from scoring.
        </p>
      </div>

      {mutation.isError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-[#e5c9b9] bg-[#fbf2ec] p-3 text-sm text-[#79594c]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {mutation.error instanceof Error ? mutation.error.message : "Could not save this review."}
        </div>
      )}

      {query.isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#e2e0d7] bg-white p-5 text-sm text-[#686a64]">
          <RefreshCw className="h-4 w-4 animate-spin" /> Checking evidence dates…
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl border border-[#e5c9b9] bg-[#fbf2ec] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" />
            <div>
              <h2 className="font-semibold text-[#5b3226]">Review queue unavailable</h2>
              <p className="mt-1 text-sm leading-6 text-[#79594c]">
                {query.error instanceof Error ? query.error.message : "The review queue could not be loaded."}
              </p>
            </div>
          </div>
        </div>
      ) : query.data?.cases.length ? (
        <div className="space-y-3">
          {query.data.cases.map((item) => (
            <ReviewCaseCard
              key={`${item.source}-${item.evidenceId}`}
              item={item}
              canManage={canManage}
              onReview={(reviewItem, sourceDate) => mutation.mutate({ item: reviewItem, sourceDate })}
              isSaving={mutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#cddfd6] bg-[#f3f8f5] p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#438471]" />
            <div>
              <h2 className="font-semibold text-[#285a49]">No evidence dates need review</h2>
              <p className="mt-1 text-sm leading-6 text-[#557366]">Evidence with a verified source date is reviewed automatically.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
