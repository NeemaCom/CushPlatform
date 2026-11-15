import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, FileCheck2, LoaderCircle, Plus, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import {
  CUSH_VERIFY_REPORT_CATEGORIES,
  type CushVerifyReportCategory,
  type CushVerifyReportPayload,
  type CushVerifyReportRequestView,
} from "@shared/cush-verify-reports";

type WorkspaceSection = "new" | "history" | "consent" | "reports";
type DeliveredReport = {
  report: CushVerifyReportPayload;
  delivery: { id: number; deliveredAt: string; newDeliveryEvent: boolean };
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
    throw new Error((payload as { error?: string }).error || "Request could not be completed.");
  }
  return payload as T;
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function statusLabel(request: CushVerifyReportRequestView) {
  if (request.status === "awaiting_consent") return "Awaiting individual";
  if (request.status === "authorized" && request.authorizationExpiresAt && new Date(request.authorizationExpiresAt).getTime() <= Date.now()) return "Authorization expired";
  if (request.status === "authorized") return "Authorized";
  if (request.status === "declined") return "Declined";
  if (request.status === "revoked") return "Revoked";
  return "Expired";
}

function categoryLabel(category: CushVerifyReportCategory) {
  return CUSH_VERIFY_REPORT_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}

function ReportResult({ value }: { value: DeliveredReport }) {
  const scoreSummary = value.report.categories.scoreSummary;
  const assessment = value.report.categories.assessmentStatus;
  const evidence = value.report.categories.evidenceSummary;
  const score = scoreSummary?.score ?? scoreSummary?.provisionalScore ?? null;
  const assessmentLabels = {
    not_started: "Not started",
    incomplete: "Incomplete",
    provisional: "Provisional",
    complete: "Complete",
  } as const;

  return (
    <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5" aria-label="Authorized report result">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
          <FileCheck2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-semibold text-emerald-950">Authorized report retrieved</h3>
          <p className="mt-1 text-xs text-emerald-800">Generated {dateLabel(value.report.generatedAt)} · Delivery event {value.delivery.newDeliveryEvent ? "recorded" : "already recorded"}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {scoreSummary && (
          <div className="rounded-xl border border-emerald-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cush Score summary</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{score === null ? "Not available yet" : score}</p>
            {scoreSummary.confidenceScore !== null && (
              <p className="mt-1 text-sm text-slate-600">
                Confidence: {scoreSummary.confidenceBand ?? "Unrated"} · {scoreSummary.confidenceScore}/100
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">No component breakdown or raw financial data is included.</p>
          </div>
        )}
        {assessment && (
          <div className="rounded-xl border border-emerald-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assessment status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{assessmentLabels[assessment.status]}</p>
            <p className="mt-1 text-xs text-slate-500">Policy version {assessment.algorithmVersion}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {assessment.missingRequirements.length
                ? assessment.missingRequirements.map((item) => <li key={item}>• {item}</li>)
                : <li>No outstanding requirements recorded.</li>}
            </ul>
          </div>
        )}
        {evidence && (
          <div className="rounded-xl border border-emerald-100 bg-white p-4 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bank-statement evidence status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {evidence.bankStatements.status === "evidence_imported"
                ? "Statement evidence imported"
                : evidence.bankStatements.status === "source_unavailable"
                  ? "Statement source unavailable"
                  : "No imported statement evidence"}
            </p>
            {evidence.bankStatements.status === "evidence_imported" && (
              <p className="mt-1 text-sm text-slate-600">
                {evidence.bankStatements.importedAccounts} account{evidence.bankStatements.importedAccounts === 1 ? "" : "s"} · statement periods: {evidence.bankStatements.statementPeriodsMonths.join(", ") || "not recorded"} months
                {evidence.bankStatements.latestImportDate ? ` · latest import ${evidence.bankStatements.latestImportDate}` : ""}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">This summary does not include account numbers, balances, transactions, or credit-file details.</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-emerald-900/70">Only categories approved by the individual are included. Cush does not retain report contents in the delivery log.</p>
    </section>
  );
}

export default function CushVerifyReportWorkspace({
  section,
  requests,
  isLoading,
  errorMessage,
  canManageRequests,
  onRefresh,
}: {
  section: WorkspaceSection;
  requests: CushVerifyReportRequestView[];
  isLoading: boolean;
  errorMessage?: string;
  canManageRequests: boolean;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [categories, setCategories] = useState<CushVerifyReportCategory[]>(["score_summary", "assessment_status"]);
  const [authorizationDays, setAuthorizationDays] = useState(30);
  const [deliveredReport, setDeliveredReport] = useState<DeliveredReport | null>(null);

  const createMutation = useMutation({
    mutationFn: () => requestJson<{ success: boolean; message: string }>(
      "/api/verify/report-requests",
      "POST",
      { recipientEmail, purpose, categories, authorizationDays },
    ),
    onSuccess: (result) => {
      setRecipientEmail("");
      setPurpose("");
      toast({ title: "Request submitted", description: result.message });
      onRefresh();
    },
    onError: (error: Error) => toast({ title: "Could not submit request", description: error.message, variant: "destructive" }),
  });
  const deliverMutation = useMutation({
    mutationFn: (requestId: string) =>
      requestJson<DeliveredReport>(`/api/verify/report-requests/${encodeURIComponent(requestId)}/deliver`, "POST", {}),
    onSuccess: (result) => {
      setDeliveredReport(result);
      toast({ title: "Authorized report retrieved", description: "The successful-delivery event is recorded without report contents." });
      onRefresh();
    },
    onError: (error: Error) => toast({ title: "Report could not be retrieved", description: error.message, variant: "destructive" }),
  });

  const visibleRequests = useMemo(() => {
    if (section === "reports") {
      return requests.filter((request) =>
        request.status === "authorized" || request.deliveredReportCount > 0,
      );
    }
    if (section === "consent") {
      return requests.filter((request) =>
        request.status === "awaiting_consent" || request.status === "authorized" ||
        request.status === "declined" || request.status === "revoked" || request.status === "expired",
      );
    }
    return requests;
  }, [requests, section]);

  function toggleCategory(category: CushVerifyReportCategory) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  if (section === "new") {
    if (!canManageRequests) {
      return <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">Only organisation administrators and analysts can submit report requests. You can review request status and any reports already authorized for this organisation.</p>;
    }
    return (
      <div className="mt-5 max-w-2xl">
        <p className="text-sm leading-6 text-slate-600">Enter the individual’s email and explain why a report is needed. Cush will not reveal whether an account matches. No profile data is returned until the individual approves specific categories and a time limit.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="block text-sm font-medium text-slate-800">
            Individual’s email
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Stated purpose
            <textarea
              required
              minLength={10}
              maxLength={500}
              rows={3}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Explain the specific decision this report will support."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">Report categories to request</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {CUSH_VERIFY_REPORT_CATEGORIES.map((category) => (
                <label key={category.value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={categories.includes(category.value)}
                    onChange={() => toggleCategory(category.value)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium text-slate-800">
            Requested authorization period
            <span className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={90}
                value={authorizationDays}
                onChange={(event) => setAuthorizationDays(Math.max(1, Math.min(90, Number(event.target.value) || 1)))}
                className="min-h-11 w-24 rounded-lg border border-slate-300 px-3 text-sm"
              />
              <span className="text-sm font-normal text-slate-500">days (maximum 90)</span>
            </span>
          </label>
          <button
            type="submit"
            disabled={createMutation.isPending || categories.length === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#245fce] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4fae] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Submit report request
          </button>
        </form>
      </div>
    );
  }

  const emptyMessage = section === "reports"
    ? "Reports appear here after an individual authorizes access and an approved member retrieves the report."
    : section === "consent"
      ? "Consent decisions, authorization periods, and report retrieval status will appear here."
      : "No verification requests have been submitted yet.";

  return (
    <div className="mt-5">
      {errorMessage && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading request history…
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{emptyMessage}</div>
      ) : (
        <div className="space-y-3">
          {visibleRequests.map((request) => {
            const active = request.status === "authorized" &&
              request.authorizationExpiresAt !== null &&
              new Date(request.authorizationExpiresAt).getTime() > Date.now();
            const mayRetrieve = section === "reports" && active;
            return (
              <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{request.recipientLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">Requested {dateLabel(request.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    request.status === "authorized" && active ? "bg-emerald-50 text-emerald-800"
                      : request.status === "awaiting_consent" ? "bg-amber-50 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                  }`}>
                    {request.status === "authorized" && active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                    {statusLabel(request)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-5 text-slate-700">{request.purpose}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.requestedCategories.map((category) => (
                    <span key={category} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">{categoryLabel(category)}</span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>
                    {request.status === "authorized"
                      ? `Access until ${dateLabel(request.authorizationExpiresAt)}`
                      : `Request expires ${dateLabel(request.requestExpiresAt)}`}
                  </span>
                  <span>{request.deliveredReportCount} successful report {request.deliveredReportCount === 1 ? "delivery" : "deliveries"}</span>
                </div>
                {mayRetrieve && (
                  <button
                    type="button"
                    disabled={deliverMutation.isPending}
                    onClick={() => deliverMutation.mutate(request.id)}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0c1830] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {deliverMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                    Retrieve authorized report
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
      {deliveredReport && section === "reports" && <ReportResult value={deliveredReport} />}
      {section === "consent" && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          A report is available only while the individual’s consent is active. Audit records contain delivery status and a digest, not report contents.
        </p>
      )}
    </div>
  );
}
