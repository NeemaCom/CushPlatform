import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { API_BASE_URL } from "@/lib/api-base";
import { getProductSessionHeaders } from "@/lib/product-session";
import { useToast } from "@/hooks/use-toast";

type Submission = {
  id: number;
  period: "pre_arrival" | "post_arrival";
  userId: number;
  email: string;
  displayName: string;
  documentType: string;
  label: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  countryCode: string;
  currencyCode: string;
  reviewStatus: string;
  evidenceClassification: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type Detail = {
  submission: Submission;
  extractedDraft: string;
  correctedDraft: string | null;
  currencyDetection: {
    detectedCurrencyCodes: string[];
    suggestedCurrencyCode: string | null;
    ambiguousSymbols: Array<{ symbol: string; candidates: string[] }>;
  };
  review: { notes: string; reviewBasis: string };
  events: Array<{ eventType: string; actorType: string; createdAt: string }>;
};

type QueueResponse = { submissions: Submission[] };

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "The request failed.");
  return payload as T;
}

function title(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character: string) => character.toUpperCase());
}

function date(value: string | null) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export default function PassportEvidenceAdmin({ canReview }: { canReview: boolean }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState("under_review");
  const [classification, setClassification] = useState("document_supported");
  const [notes, setNotes] = useState("");
  const [reviewBasis, setReviewBasis] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queue = useQuery<QueueResponse>({
    queryKey: ["/api/admin/passport/evidence-submissions"],
    queryFn: async () => readJson(await apiRequest("GET", "/api/admin/passport/evidence-submissions")),
    retry: false,
  });
  const detail = useQuery<Detail>({
    queryKey: ["/api/admin/passport/evidence-submissions", selectedId],
    queryFn: async () => readJson(await apiRequest("GET", `/api/admin/passport/evidence-submissions/${selectedId}`)),
    enabled: selectedId !== null,
    retry: false,
  });
  useEffect(() => {
    if (!detail.data) return;
    setReviewStatus(detail.data.submission.reviewStatus);
    setClassification(detail.data.submission.evidenceClassification);
    setNotes(detail.data.review.notes);
    setReviewBasis(detail.data.review.reviewBasis);
  }, [detail.data]);

  const saveReview = useMutation({
    mutationFn: async () => {
      if (selectedId === null) throw new Error("Select a document first.");
      return readJson(await apiRequest("PATCH", `/api/admin/passport/evidence-submissions/${selectedId}/review`, {
        reviewStatus,
        evidenceClassification: classification,
        notes,
        reviewBasis,
      }));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/passport/evidence-submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/passport/evidence-submissions", selectedId] });
      toast({ title: "Evidence review saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save review", description: error.message, variant: "destructive" }),
  });

  async function downloadFile(id: number, fileName: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/passport/evidence-submissions/${id}/file`, {
        credentials: "include",
        headers: getProductSessionHeaders(),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Download failed.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast({ title: "Could not download document", description: error instanceof Error ? error.message : "Download failed.", variant: "destructive" });
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="passport-evidence-admin-heading">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Cush Passport · Operations</p>
        <h1 id="passport-evidence-admin-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[#24252a]">Evidence review queue</h1>
        <p className="mt-2 text-sm text-[#6f706f]">Review uploaded records and classify evidence. A classification does not automatically feed a document into the Score.</p>
      </header>

      {queue.isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          {queue.error instanceof Error ? queue.error.message : "The evidence queue could not be loaded."}
        </p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="rounded-2xl border border-[#e4e1d8] bg-[#fbfaf6] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#24252a]">Submitted files</h2>
              <button type="button" onClick={() => void queue.refetch()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#deddd4] bg-white px-3 py-2 text-xs font-semibold text-[#555750]">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>
            {queue.isLoading ? <p className="mt-4 text-sm text-[#777973]">Loading review queue…</p> :
              !queue.data?.submissions.length ? (
                <div className="mt-4 rounded-xl border border-dashed border-[#deddd4] p-6 text-center">
                  <FileText className="mx-auto h-6 w-6 text-[#96988f]" />
                  <p className="mt-2 text-sm font-medium text-[#555750]">No submitted documents</p>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-[#e8e6de]">
                  {queue.data.submissions.map((item) => (
                    <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <button type="button" onClick={() => setSelectedId(item.id)} aria-current={selectedId === item.id ? "true" : undefined} className={`w-full rounded-lg p-2 text-left ${selectedId === item.id ? "bg-[#eeedff]" : "hover:bg-white"}`}>
                        <span className="block truncate text-sm font-semibold text-[#24252a]">{item.label}</span>
                        <span className="mt-1 block text-xs text-[#6f706f]">{item.displayName} · {item.email}</span>
                        <span className="mt-1 block text-xs text-[#777973]">{title(item.period)} · {title(item.reviewStatus)} · {date(item.submittedAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </section>

          <section className="rounded-2xl border border-[#e4e1d8] bg-[#fbfaf6] p-4 sm:p-5">
            {!selectedId ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <ShieldCheck className="h-7 w-7 text-[#57539c]" />
                <p className="mt-3 text-sm font-semibold text-[#24252a]">Select a submission</p>
                <p className="mt-1 text-xs text-[#777973]">Review its extracted draft, the original file, and its history.</p>
              </div>
            ) : detail.isLoading ? <p className="text-sm text-[#777973]">Loading submission…</p> :
              detail.isError ? (
                <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{detail.error instanceof Error ? detail.error.message : "Submission could not be loaded."}</p>
              ) : detail.data && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-[#24252a]">{detail.data.submission.label}</h2>
                      <p className="mt-1 text-xs text-[#6f706f]">{detail.data.submission.displayName} · {detail.data.submission.email}</p>
                      <p className="mt-1 text-xs text-[#777973]">{title(detail.data.submission.period)} · {detail.data.submission.fileName} · {detail.data.submission.countryCode} / {detail.data.submission.currencyCode} · {(detail.data.submission.fileSize / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={() => void downloadFile(selectedId, detail.data!.submission.fileName)} className="inline-flex items-center gap-2 rounded-lg border border-[#deddd4] bg-white px-3 py-2 text-xs font-semibold text-[#555750]">
                      <Download className="h-4 w-4" /> Original file
                    </button>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-[#555750]">User-reviewed extracted draft</p>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[#e4e1d8] bg-white p-3 text-xs leading-5 text-[#42443e]">{(detail.data.correctedDraft ?? detail.data.extractedDraft) || "No text was extracted."}</pre>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-5 text-indigo-950">
                    <p className="font-semibold">Currency detection: {detail.data.currencyDetection.detectedCurrencyCodes.length
                      ? detail.data.currencyDetection.detectedCurrencyCodes.join(", ")
                      : "no explicit code detected"}</p>
                    {detail.data.currencyDetection.ambiguousSymbols.map(({ symbol, candidates }) => (
                      <p key={symbol} className="mt-1">Ambiguous “{symbol}” symbol; possible codes: {candidates.join(", ")}. Check the source document before recording a currency.</p>
                    ))}
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    Text extraction is not verification. Record the basis for any independent or institution-confirmed classification.
                  </div>
                  {canReview && (
                    <form className="space-y-3 border-t border-[#e8e6de] pt-4" onSubmit={(event) => { event.preventDefault(); saveReview.mutate(); }}>
                      <h3 className="text-sm font-semibold text-[#24252a]">Review decision</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-xs font-medium text-[#555750]">Status
                          <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)} className="w-full rounded-lg border border-[#deddd4] bg-white px-3 py-2.5 text-sm">
                            <option value="under_review">Under review</option><option value="additional_information_required">Additional information required</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                          </select>
                        </label>
                        <label className="space-y-1 text-xs font-medium text-[#555750]">Evidence classification
                          <select value={classification} onChange={(event) => setClassification(event.target.value)} className="w-full rounded-lg border border-[#deddd4] bg-white px-3 py-2.5 text-sm">
                            <option value="self_declared">Self-declared</option><option value="document_supported">Document-supported</option><option value="independently_verified">Independently verified</option><option value="institution_confirmed">Institution-confirmed</option>
                          </select>
                        </label>
                      </div>
                      <label className="block space-y-1 text-xs font-medium text-[#555750]">Review notes
                        <textarea maxLength={1200} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-lg border border-[#deddd4] bg-white px-3 py-2.5 text-sm" />
                      </label>
                      {(classification === "independently_verified" || classification === "institution_confirmed") && (
                        <label className="block space-y-1 text-xs font-medium text-[#555750]">Confirmation basis (at least 20 characters)
                          <textarea minLength={20} maxLength={1200} rows={3} value={reviewBasis} onChange={(event) => setReviewBasis(event.target.value)} required className="w-full rounded-lg border border-[#deddd4] bg-white px-3 py-2.5 text-sm" />
                        </label>
                      )}
                      <button type="submit" disabled={saveReview.isPending} className="rounded-lg bg-[#29266f] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                        {saveReview.isPending ? "Saving…" : "Save review"}
                      </button>
                    </form>
                  )}
                  <div className="border-t border-[#e8e6de] pt-3">
                    <h3 className="text-xs font-semibold text-[#555750]">Review activity</h3>
                    <ul className="mt-2 space-y-1.5">
                      {detail.data.events.slice(0, 12).map((event, index) => (
                        <li key={`${event.eventType}-${event.createdAt}-${index}`} className="text-xs text-[#777973]">{title(event.eventType)} · {event.actorType} · {date(event.createdAt)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
          </section>
        </div>
      )}
    </section>
  );
}
