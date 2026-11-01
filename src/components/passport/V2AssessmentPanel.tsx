import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Save } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import type { V2AssessmentInput } from "@shared/schema";
import MonoBankDataPanel from "@/components/passport/MonoBankDataPanel";
import AssessmentStep from "@/components/passport/AssessmentStep";

interface BaselineOption {
  id: string;
  destination: string;
  monthlyBaselinePence: number;
  effectiveDate: string;
  countryCode: string;
  currencyCode: "GBP";
  provenance: string;
}

interface V2AssessmentResponse {
  inputs: V2AssessmentInput;
  calculation: {
    assessmentStatus: string;
    cushScore: number | null;
    provisionalScore: number | null;
    scoreCoveragePercent: number;
    scoredComponentCount: number;
    componentScores: {
      availableFunds: number | null;
      incomeStrength: number | null;
      cashFlow: number | null;
      creditHistory: number | null;
    };
    confidenceScore: number | null;
    confidenceBand: "low" | "medium" | "high" | null;
    confidenceBreakdown: {
      financialHistoryDepth: number;
      sourceQualityAndVerification: number;
      creditInformationAvailability: number;
      dataFreshness: number;
      accountCoverage: number;
      incomeSourceReliability: number;
      integrityDeduction: number;
    } | null;
    missingRequirements: string[];
  };
  monoImports: Array<{
    linkedAccountId: number;
    fetchedAt: string;
    statementPeriodMonths: number;
    balancePence: number | null;
    incomeMonths: number;
    cashFlowMonths: number;
    sourceCurrencies: Array<"GBP" | "USD" | "NGN">;
    fxRateSource: string;
    fxRateDateBasis: "transaction_date";
    fxRates: Array<{
      rateDate: string;
      currencyCode: "USD" | "NGN";
      usdNgnCentralRate: string;
      gbpNgnCentralRate: string;
    }>;
  }>;
  destinationBaselines: BaselineOption[];
  policyStatus: "active" | "not_configured";
  policyVersion: number | null;
  schemaReady: true;
  monoDataReady: boolean;
}

interface NormalizedCreditHistory {
  accountsReported: number;
  historyRecords: number;
  loanStatusCounts: { open: number; closed: number; other: number };
  performanceStatusCounts: { performing: number; nonPerforming: number; other: number };
  repaymentStatusCounts: { settled: number; overdue: number; adverse: number; pending: number; other: number };
}

interface InterswitchCreditHistoryResult {
  evidence: NormalizedCreditHistory;
  mappingStatus: "draft_pending_review" | "score_applied" | "no_scoreable_history";
  mappingVersion: string;
  fetchedAt: string;
  creditComponentScore: number | null;
  scoreableInstallments: number;
  scoreApplied: boolean;
  scoreReason?: string;
}

interface InterswitchCreditHistoryStatus {
  configured: boolean;
  providerReadiness?: {
    mode: "sandbox" | "production" | "unconfigured";
    configured: boolean;
    liveEnabled: boolean;
    providerMappingConfirmed: boolean;
    identityMatchConfirmed: boolean;
    inquiryEffectsConfirmed: boolean;
  };
  consentSchemaReady: boolean;
  evidenceSchemaReady: boolean;
  latest: InterswitchCreditHistoryResult | null;
}

interface InterswitchCreditHistoryResponse extends InterswitchCreditHistoryResult {
  provider: "Interswitch";
  evidenceId: number;
}

const EMPTY_INPUTS: V2AssessmentInput = {
  selectedBaselineId: null,
  availableFunds: [],
  incomeHistory: [],
  cashFlowHistory: [],
  creditClassification: "unavailable",
};

class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error ?? "Request failed.", payload.code);
  return payload as T;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export default function V2AssessmentPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inputs, setInputs] = useState<V2AssessmentInput>(EMPTY_INPUTS);
  const [creditLookupConsent, setCreditLookupConsent] = useState(false);
  const [creditBvn, setCreditBvn] = useState("");
  const [creditHistoryResult, setCreditHistoryResult] = useState<InterswitchCreditHistoryResponse | null>(null);

  const assessmentQuery = useQuery<V2AssessmentResponse>({
    queryKey: ["/api/passport/v2"],
    queryFn: () => request("GET", "/api/passport/v2"),
    retry: false,
  });

  const interswitchStatusQuery = useQuery<InterswitchCreditHistoryStatus>({
    queryKey: ["/api/interswitch/credit-history/status"],
    queryFn: () => request("GET", "/api/interswitch/credit-history/status"),
    retry: false,
  });

  const creditLookupMutation = useMutation({
    mutationFn: () => request<InterswitchCreditHistoryResponse>(
      "POST",
      "/api/interswitch/credit-history",
      { bvn: creditBvn, consent: true },
    ),
    onSuccess: (result) => {
      setCreditHistoryResult(result);
      setCreditBvn("");
      setCreditLookupConsent(false);
      void queryClient.invalidateQueries({ queryKey: ["/api/interswitch/credit-history/status"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/passport/v2"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({
        title: result.scoreApplied ? "Credit history scored" : "Credit history received",
        description: result.scoreApplied
          ? "The mapped credit component was refreshed. Your overall score may still be incomplete."
          : result.scoreReason === "sandbox_not_scored"
            ? "Sandbox evidence is saved for review only and does not affect the Cush Score."
          : "No resolved repayment records were available to score, so no credit points were added.",
      });
    },
    onError: (error: Error) => {
      setCreditBvn("");
      setCreditLookupConsent(false);
      toast({
        title: "Credit report unavailable",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (assessmentQuery.data?.inputs) setInputs(assessmentQuery.data.inputs);
  }, [assessmentQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (data: V2AssessmentInput) => request<V2AssessmentResponse>("PUT", "/api/passport/v2", data),
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/passport/v2"], data);
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({ title: "Destination saved", description: "V2 score components require supported, reviewed records." });
    },
    onError: (error: Error) => toast({ title: "Could not save assessment", description: error.message, variant: "destructive" }),
  });

  if (assessmentQuery.isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading V2 assessment…</div>;
  }

  if (assessmentQuery.isError) {
    const error = assessmentQuery.error as ApiError;
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="font-semibold text-amber-950">
              {error.code === "V2_SCHEMA_MISSING" ? "Database setup required" : "Assessment unavailable"}
            </h3>
            <p className="mt-1 text-sm text-amber-900">{error.message}</p>
            {error.code === "V2_SCHEMA_MISSING" && (
              <p className="mt-2 text-xs text-amber-800">Run the new manual migration in the intended Supabase project, then reload this panel.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const view = assessmentQuery.data!;
  const baselineReady = view.destinationBaselines.length > 0;

  return (
    <div className="space-y-4">
      <MonoBankDataPanel />

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <p className="font-semibold">V2 scores in GBP</p>
        <p className="mt-1 text-xs leading-relaxed">
          Mono statements in GBP, USD, or NGN can be reviewed and imported. USD and NGN amounts use CBN central rates for each transaction date; exchange-rate details are retained with the derived assessment data.
        </p>
      </div>

      {view.monoImports.length > 0 && (
        <Card title="Mono data used in V2">
          <div className="space-y-2">
            {view.monoImports.map((item) => (
              <div key={item.linkedAccountId} className="rounded-lg border border-slate-100 p-3 text-xs">
                <p className="font-semibold text-slate-800">Linked account {item.linkedAccountId}</p>
                <p className="mt-1 text-slate-600">
                  Imported {new Date(item.fetchedAt).toLocaleString("en-GB")} · {item.statementPeriodMonths}-month statement · currencies: {item.sourceCurrencies.join(", ")}
                </p>
                <p className="mt-1 text-slate-500">
                  FX source: <a className="underline" href={item.fxRateSource} target="_blank" rel="noreferrer">CBN central exchange rates</a> · dates: {item.fxRateDateBasis}
                </p>
                <p className="mt-1 text-slate-500">
                  {item.balancePence === null ? "No balance included" : `Accessible balance £${(item.balancePence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  {" · "}{item.incomeMonths} income month{item.incomeMonths === 1 ? "" : "s"}
                  {" · "}{item.cashFlowMonths} cash-flow month{item.cashFlowMonths === 1 ? "" : "s"}
                </p>
                {item.fxRates.length > 0 && (
                  <p className="mt-1 text-slate-500">
                    CBN central rates (NGN per unit): {item.fxRates.slice(0, 3).map((rate) =>
                      `${rate.rateDate} USD ₦${rate.usdNgnCentralRate} / GBP ₦${rate.gbpNgnCentralRate}`,
                    ).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Imported Mono records are used instead of self-reported records for overlapping months to avoid double counting. Income and expense classifications were selected during review.
          </p>
        </Card>
      )}
      {!view.monoDataReady && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Mono data is not available to V2 until its Supabase tables are installed. The rest of the V2 assessment can still load.
        </div>
      )}

      <Card title="Score components">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <span className="text-slate-600">
            {view.calculation.cushScore === null && view.calculation.provisionalScore !== null
              ? "Provisional score: "
              : "Overall score: "}
          </span>
          {view.calculation.cushScore !== null || view.calculation.provisionalScore !== null
            ? <span className="font-bold text-slate-900">
                {view.calculation.cushScore ?? view.calculation.provisionalScore}/1000
              </span>
            : <span className="font-semibold text-slate-500">Not available yet</span>}
          <p className="mt-1 text-xs text-slate-500">
            {view.calculation.cushScore === null && view.calculation.provisionalScore !== null
              ? `Normalized from ${view.calculation.scoredComponentCount} supported components.`
              : "Final score"}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Score component coverage</span>
            <span>{view.calculation.scoreCoveragePercent}% · {view.calculation.scoredComponentCount}/4</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Score component coverage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.calculation.scoreCoveragePercent}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${view.calculation.scoreCoveragePercent}%`,
                background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 52%, #10b981 100%)",
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Missing components are excluded from a provisional score, not treated as zero. Coverage is weighted by the scoring model.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["Funds", view.calculation.componentScores.availableFunds],
            ["Income", view.calculation.componentScores.incomeStrength],
            ["Cash flow", view.calculation.componentScores.cashFlow],
            ["Credit history", view.calculation.componentScores.creditHistory],
          ].map(([label, score]) => (
            <div key={String(label)} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
              <span className="text-slate-600">{label}</span>
              <span className="font-semibold text-slate-900">{score === null ? "Not available" : `${score}/100`}</span>
            </div>
          ))}
        </div>
      </Card>

      <AssessmentStep
        id="assessment-credit-check"
        step={3}
        title="Credit check"
        description="Required for a complete Cush Score and requires separate BVN consent."
      >
        <p className="text-xs leading-relaxed text-slate-600">
          A credit-history lookup is required to complete a Cush Score. This lookup requires your BVN. It is sent to
          Interswitch only after separate consent, used for the request, and not stored by Cush. Cush stores only aggregate status
          counts from the latest result; names, addresses, BVNs, institution names, balances, dates, and the raw report are not stored.
        </p>
        <p className="text-xs leading-relaxed text-slate-600">
          The approved repayment rule scores settled installments as 1, overdue as 0.5, and confirmed missed/default as 0. Pending and
          unrecognized statuses are excluded. The component stays unavailable if no resolved installment is present or provider
          statuses conflict.
        </p>
        <p className="text-xs leading-relaxed text-amber-800">
          Before live use, get provider confirmation of the repayment labels, how identity matches are indicated, whether each
          lookup creates a bureau inquiry, and any per-request or repeat-request charges. Production lookups remain blocked until
          those confirmations are recorded in server settings.
        </p>
        {interswitchStatusQuery.isLoading ? (
          <p className="text-xs text-slate-500" role="status">Checking lookup availability…</p>
        ) : interswitchStatusQuery.isError ? (
          <p className="text-xs text-amber-800" role="status">Lookup availability could not be checked. No report request has been made.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {!interswitchStatusQuery.data?.configured &&
              interswitchStatusQuery.data?.providerReadiness?.mode === "production" && (
                <p className="text-amber-800">
                  Production lookup is blocked until live mode, provider mapping, identity-match behavior, and inquiry/cost effects
                  are explicitly confirmed.
                </p>
              )}
              {!interswitchStatusQuery.data?.configured &&
              interswitchStatusQuery.data?.providerReadiness?.mode !== "production" && (
                <p className="text-amber-800">Credit-check provider settings are incomplete or no supported environment is configured.</p>
              )}
            {interswitchStatusQuery.data?.providerReadiness?.mode === "sandbox" && (
              <p className="text-blue-800">
                Sandbox is configured. Use only provider-issued test BVNs here; do not enter a real BVN. Sandbox responses do not
                confirm production identity matching, bureau inquiry effects, or fees.
              </p>
            )}
            {interswitchStatusQuery.data?.configured &&
              interswitchStatusQuery.data?.providerReadiness?.mode === "production" && (
                <p className="text-amber-800">
                  Production readiness flags are enabled. Keep written provider confirmation for the mapping, identity-match rule,
                  and inquiry/cost effects.
                </p>
              )}
            {!interswitchStatusQuery.data?.consentSchemaReady && (
              <p className="text-amber-800">The consent table is not installed. Apply the consent migration before requesting a report.</p>
            )}
            {!interswitchStatusQuery.data?.evidenceSchemaReady && (
              <p className="text-amber-800">The credit-history scoring schema is incomplete. Apply both credit-history migrations in order.</p>
            )}
          </div>
        )}
        <label className="block text-xs font-medium text-slate-600">
          BVN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            value={creditBvn}
            onChange={(event) => setCreditBvn(event.target.value.replace(/\D/g, "").slice(0, 11))}
            disabled={creditLookupMutation.isPending}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Enter your 11-digit BVN"
          />
        </label>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
          <input
            type="checkbox"
            checked={creditLookupConsent}
            onChange={(event) => setCreditLookupConsent(event.target.checked)}
            disabled={creditLookupMutation.isPending}
            className="mt-0.5"
          />
          <span>
            I authorize Cush to send my BVN to Interswitch for this required credit-history lookup and to store only the normalized
            aggregate counts described above. This is separate from accepting the Terms or Privacy Policy.
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => creditLookupMutation.mutate()}
            disabled={
              creditBvn.length !== 11 ||
              !creditLookupConsent ||
              creditLookupMutation.isPending ||
              !interswitchStatusQuery.data?.configured ||
              !interswitchStatusQuery.data?.consentSchemaReady ||
              !interswitchStatusQuery.data?.evidenceSchemaReady
            }
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creditLookupMutation.isPending ? "Requesting credit history…" : "Request credit history"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreditLookupConsent(false);
              setCreditBvn("");
            }}
            disabled={(!creditLookupConsent && !creditBvn) || creditLookupMutation.isPending}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
        {(creditHistoryResult ?? interswitchStatusQuery.data?.latest) && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800">
                Provider supplied · {new Date((creditHistoryResult ?? interswitchStatusQuery.data?.latest)!.fetchedAt).toLocaleString()}
              </p>
            </div>
            {(() => {
              const result = creditHistoryResult ?? interswitchStatusQuery.data?.latest;
              if (!result) return null;
              return (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <p>Accounts reported: <strong>{result.evidence.accountsReported}</strong></p>
                    <p>History records: <strong>{result.evidence.historyRecords}</strong></p>
                    <p>Performing: <strong>{result.evidence.performanceStatusCounts.performing}</strong></p>
                    <p>Non-performing: <strong>{result.evidence.performanceStatusCounts.nonPerforming}</strong></p>
                    <p>Settled installments: <strong>{result.evidence.repaymentStatusCounts.settled}</strong></p>
                    <p>Overdue installments: <strong>{result.evidence.repaymentStatusCounts.overdue}</strong></p>
                    <p>Adverse installments: <strong>{result.evidence.repaymentStatusCounts.adverse}</strong></p>
                    <p>Pending / other: <strong>{result.evidence.repaymentStatusCounts.pending + result.evidence.repaymentStatusCounts.other}</strong></p>
                  </div>
                  <p className="text-xs text-amber-800">
                    {result.creditComponentScore !== null
                      ? `Mapped credit component: ${result.creditComponentScore}/100 (${result.scoreableInstallments} resolved installments). The overall score may still be incomplete.`
                      : result.scoreReason === "sandbox_not_scored"
                        ? "Sandbox evidence is for mapping review only and is not used in the Cush Score."
                      : result.scoreReason === "inconsistent_statuses"
                        ? "Provider statuses conflict, so this report was not scored."
                      : result.scoreReason === "invalid_evidence" ||
                        result.scoreReason === "mapping_version_mismatch" ||
                        result.scoreReason === "live_not_confirmed"
                          ? "This report could not be safely matched to the active scoring rule, so it was not scored."
                          : "No resolved repayment history was available to score. No credit points were added."}
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </AssessmentStep>

      {view.calculation.confidenceBreakdown && view.calculation.confidenceScore !== null && (
        <Card title={`Confidence: ${view.calculation.confidenceScore}/100 · ${view.calculation.confidenceBand ? `${view.calculation.confidenceBand[0].toUpperCase()}${view.calculation.confidenceBand.slice(1)}` : "Pending"}`}>
          <p className="text-xs text-slate-500">Confidence describes evidence quality and does not change the Cush Score.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["History depth", view.calculation.confidenceBreakdown.financialHistoryDepth, 30],
              ["Source quality", view.calculation.confidenceBreakdown.sourceQualityAndVerification, 25],
              ["Credit check", view.calculation.confidenceBreakdown.creditInformationAvailability, 15],
              ["Freshness", view.calculation.confidenceBreakdown.dataFreshness, 10],
              ["Account coverage", view.calculation.confidenceBreakdown.accountCoverage, 10],
              ["Income source", view.calculation.confidenceBreakdown.incomeSourceReliability, 10],
            ].map(([label, points, maximum]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-slate-900">{points}/{maximum}</span>
              </div>
            ))}
          </div>
          {view.calculation.confidenceBreakdown.integrityDeduction > 0 && (
            <p className="text-xs font-medium text-rose-700">
              Confirmed integrity flags: −{view.calculation.confidenceBreakdown.integrityDeduction} points
            </p>
          )}
        </Card>
      )}

      {!baselineReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No active destination baseline is configured. An administrator must activate one before component scores can be calculated.
        </div>
      )}

      <Card title="Destination baseline">
        <label className="block text-xs font-medium text-slate-600">
          Destination
          <select
            value={inputs.selectedBaselineId ?? ""}
            onChange={(event) => setInputs((current) => ({ ...current, selectedBaselineId: event.target.value || null }))}
            disabled={!baselineReady}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">Select an active destination</option>
            {view.destinationBaselines.map((baseline) => (
              <option key={baseline.id} value={baseline.id}>
                {baseline.destination} · £{(baseline.monthlyBaselinePence / 100).toLocaleString("en-GB")}/month
              </option>
            ))}
          </select>
        </label>
        {inputs.selectedBaselineId && (
          <p className="text-xs text-slate-500">
            Policy version {view.policyVersion ?? "—"} · values use the baseline effective on today’s date.
          </p>
        )}
      </Card>

      <button
        type="button"
        onClick={() => saveMutation.mutate(inputs)}
        disabled={saveMutation.isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#342ca8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#29238f] disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? "Saving…" : "Save destination"}
      </button>
    </div>
  );
}
