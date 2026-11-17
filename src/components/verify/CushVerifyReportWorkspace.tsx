import { useEffect, useMemo, useState } from "react";
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

type WorkspaceSection = "discovery" | "new" | "history" | "consent" | "reports";
type DeliveredReport = {
  report: CushVerifyReportPayload;
  delivery: {
    id: number;
    deliveredAt: string;
    consentReference: string;
    consentApprovedAt: string | null;
    authorizationExpiresAt: string | null;
    newDeliveryEvent: boolean;
  };
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

function evidenceLabel(value: string) {
  return ({
    self_declared: "Self-declared",
    document_supported: "Document-supported",
    independently_verified: "Independently verified",
    pending_review: "Pending review",
    disputed_or_rejected: "Disputed or rejected",
  } as Record<string, string>)[value] ?? "Self-declared";
}

function recordTypeLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
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
          <p className="mt-1 text-xs text-emerald-800">
            Coverage: {value.report.reportingPeriod.start ? dateLabel(value.report.reportingPeriod.start) : "No dated records"} – {value.report.reportingPeriod.end ? dateLabel(value.report.reportingPeriod.end) : "No dated records"}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            Consent reference {value.delivery.consentReference} · Approved {dateLabel(value.delivery.consentApprovedAt)} · Access expires {dateLabel(value.delivery.authorizationExpiresAt)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {value.report.categories.financialEvidence && Object.entries(value.report.categories.financialEvidence).map(([category, summary]) => (
          <div key={category} className="rounded-xl border border-emerald-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{categoryLabel(category as CushVerifyReportCategory)}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{summary?.recordCount ?? 0} recorded entries</p>
            <p className="mt-1 text-xs text-slate-600">
              Latest: {summary?.latestRecordDate ? dateLabel(summary.latestRecordDate) : "No dated entries"}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Evidence: {summary?.evidenceClassifications.selfDeclared ?? 0} self-declared · {summary?.evidenceClassifications.documentSupported ?? 0} document-supported · {summary?.evidenceClassifications.independentlyVerified ?? 0} independently verified · {summary?.evidenceClassifications.pendingReview ?? 0} pending review
            </p>
            {summary?.records.length ? (
              <ul className="mt-3 space-y-2 border-t border-emerald-100 pt-3">
                {summary.records.map((record, index) => (
                  <li key={`${record.recordType}-${record.activityDate}-${index}`} className="text-xs leading-5 text-slate-700">
                    <span className="font-semibold">{recordTypeLabel(record.recordType)}</span>
                    {record.activityDate ? ` · ${dateLabel(record.activityDate)}` : ""}
                    <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{evidenceLabel(record.evidenceClassification)}</span>
                    <span className="block text-slate-500">
                      {Object.entries(record.details).map(([key, fieldValue]) => `${recordTypeLabel(key)}: ${String(fieldValue)}`).join(" · ")}
                      {(record.countryCode !== "—" || record.currencyCode !== "—")
                        ? ` · ${record.countryCode} · ${record.currencyCode}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-emerald-100 pt-3 text-xs text-slate-500">No matching records are currently available in this category.</p>
            )}
          </div>
        ))}
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
  onCreateRequest,
  onStartRequest,
  initialRecipientEmail,
}: {
  section: WorkspaceSection;
  requests: CushVerifyReportRequestView[];
  isLoading: boolean;
  errorMessage?: string;
  canManageRequests: boolean;
  onRefresh: () => void;
  onCreateRequest: (email: string) => void;
  onStartRequest?: () => void;
  initialRecipientEmail?: string;
}) {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [categories, setCategories] = useState<CushVerifyReportCategory[]>(["score_summary", "assessment_status"]);
  const [authorizationDays, setAuthorizationDays] = useState(30);
  const [deliveredReport, setDeliveredReport] = useState<DeliveredReport | null>(null);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [reportScope, setReportScope] = useState<"full" | "specific">("specific");
  const [discoveryType, setDiscoveryType] = useState<"email" | "reference_code">("email");
  const [discoveryIdentifier, setDiscoveryIdentifier] = useState("");

  useEffect(() => {
    if (initialRecipientEmail) setRecipientEmail(initialRecipientEmail);
  }, [initialRecipientEmail]);

  const createMutation = useMutation({
    mutationFn: () => requestJson<{ success: boolean; message: string; invitationUrl: string }>(
      "/api/verify/report-requests",
      "POST",
      { recipientEmail, purpose, categories, authorizationDays },
    ),
    onSuccess: (result) => {
      setRecipientEmail("");
      setPurpose("");
      setInvitationUrl(result.invitationUrl);
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
  const discoveryMutation = useMutation({
    mutationFn: () => requestJson<{
      matchFound: boolean;
      recipientLabel: string | null;
      message: string;
    }>("/api/verify/passport-discovery", "POST", {
      identifierType: discoveryType,
      identifier: discoveryIdentifier,
    }),
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

  if (section === "discovery") {
    return (
      <div className="mt-5 max-w-2xl">
        <p className="text-sm leading-6 text-slate-600">
          Search with a registered email address or a Cush Verify request reference. Search is free. Results disclose no financial details; a person must still approve every requested category.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            discoveryMutation.mutate();
          }}
        >
          <label className="block text-sm font-medium text-slate-800">
            Search identifier
            <span className="mt-1.5 flex gap-2">
              <select
                value={discoveryType}
                onChange={(event) => setDiscoveryType(event.target.value as "email" | "reference_code")}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="email">Registered email</option>
                <option value="reference_code">Request reference</option>
              </select>
              <input
                type={discoveryType === "email" ? "email" : "text"}
                required
                maxLength={254}
                value={discoveryIdentifier}
                onChange={(event) => setDiscoveryIdentifier(event.target.value)}
                placeholder={discoveryType === "email" ? "name@example.com" : "Request UUID"}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </span>
          </label>
          <button
            type="submit"
            disabled={discoveryMutation.isPending}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0c1830] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {discoveryMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Search Passport
          </button>
        </form>
        {discoveryMutation.data && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-950">{discoveryMutation.data.message}</p>
            {discoveryMutation.data.recipientLabel && (
              <p className="mt-2 text-sm text-blue-900">Minimal match: {discoveryMutation.data.recipientLabel}</p>
            )}
            {discoveryType === "email" && (
              <button
                type="button"
                onClick={() => onCreateRequest(discoveryIdentifier.trim())}
                className="mt-4 min-h-10 rounded-lg bg-[#245fce] px-4 py-2 text-sm font-semibold text-white"
              >
                Request consent or invite to Cush Passport
              </button>
            )}
          </div>
        )}
        {discoveryMutation.isError && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {discoveryMutation.error instanceof Error ? discoveryMutation.error.message : "Search could not be completed."}
          </div>
        )}
      </div>
    );
  }

  if (section === "new") {
    if (!canManageRequests) {
      return <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">Only organisation administrators and analysts can submit report requests. You can review request status and any reports already authorized for this organisation.</p>;
    }
    return (
      <div className="mt-5 max-w-2xl">
        <button type="button" onClick={onStartRequest} className="mb-4 text-sm font-semibold text-blue-700 hover:underline">Back to request history</button>
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
            <legend className="text-sm font-medium text-slate-800">Report scope</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  type="radio"
                  name="report-scope"
                  checked={reportScope === "full"}
                  onChange={() => {
                    setReportScope("full");
                    setCategories(CUSH_VERIFY_REPORT_CATEGORIES.map((item) => item.value));
                  }}
                />
                <span><strong className="block">Full Passport report</strong><span className="text-xs text-slate-500">The individual can still approve only selected categories.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  type="radio"
                  name="report-scope"
                  checked={reportScope === "specific"}
                  onChange={() => {
                    if (reportScope === "full") setCategories(["score_summary", "assessment_status"]);
                    setReportScope("specific");
                  }}
                />
                <span><strong className="block">Specific categories</strong><span className="text-xs text-slate-500">Request only the information needed.</span></span>
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">{reportScope === "full" ? "Full report includes" : "Report categories to request"}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {CUSH_VERIFY_REPORT_CATEGORIES.map((category) => (
                <label key={category.value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={categories.includes(category.value)}
                    onChange={() => toggleCategory(category.value)}
                    disabled={reportScope === "full"}
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
        {invitationUrl && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-950">Secure Passport invitation link</p>
            <p className="mt-1 text-xs leading-5 text-blue-900">This link expires with the request and only works for the invited, verified email address. The person must sign in and explicitly approve the report categories.</p>
            <input
              readOnly
              aria-label="Secure invitation link"
              value={invitationUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-3 min-h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-xs text-slate-700"
            />
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(invitationUrl)}
              className="mt-2 min-h-9 rounded-lg border border-blue-300 bg-white px-3 text-xs font-semibold text-blue-900"
            >
              Copy invitation link
            </button>
          </div>
        )}
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
      {section === "history" && canManageRequests && (
        <button
          type="button"
          onClick={() => onStartRequest?.()}
          className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#245fce] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> New report request
        </button>
      )}
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
                    <p className="mt-1 break-all font-mono text-[10px] text-slate-400">Reference {request.id}</p>
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
