import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CreditCard } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import MonoBankDataPanel from "@/components/passport/MonoBankDataPanel";
import AssessmentStep from "@/components/passport/AssessmentStep";

interface V2AssessmentResponse {
  monoImports: Array<{
    linkedAccountId: number;
    fetchedAt: string;
    statementPeriodMonths: number;
    balancePence: number | null;
    incomeMonths: number;
    cashFlowMonths: number;
  }>;
  schemaReady: true;
  monoDataReady: boolean;
}

interface InterswitchCreditHistoryResult {
  fetchedAt: string;
  scoreApplied: boolean;
  scoreReason?: string;
}

interface InterswitchCreditHistoryStatus {
  configured: boolean;
  providerReadiness?: {
    mode: "sandbox" | "production" | "unconfigured";
    configured: boolean;
  };
  consentSchemaReady: boolean;
  evidenceSchemaReady: boolean;
  latest: InterswitchCreditHistoryResult | null;
}

type InterswitchCreditHistoryResponse = InterswitchCreditHistoryResult;

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
        title: result.scoreApplied ? "Credit check added" : "Credit check received",
        description: result.scoreApplied
          ? "Your assessment score and progress have been refreshed."
          : result.scoreReason === "sandbox_not_scored"
            ? "Test credit checks are saved for review and do not affect the Cush Score."
            : "This credit check was received but could not be added to the score.",
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

  return (
    <div className="space-y-4">
      <MonoBankDataPanel />

      <AssessmentStep
        id="assessment-credit-check"
        step={2}
        tone="teal"
        icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
        title="Credit Check"
        description="Required for a complete Cush Score and requires separate BVN consent."
      >
        <p className="text-xs leading-relaxed text-slate-600">
          A credit-history check is required to complete your Cush Score. Your BVN is sent to the credit-check provider only after
          you authorize this request. Cush does not store your BVN or the raw report.
        </p>
        {interswitchStatusQuery.isLoading ? (
          <p className="text-xs text-slate-500" role="status">Checking availability…</p>
        ) : interswitchStatusQuery.isError ? (
          <p className="text-xs text-amber-800" role="status">Credit check availability could not be confirmed. No request has been made.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {!interswitchStatusQuery.data?.configured &&
              interswitchStatusQuery.data?.providerReadiness?.mode === "production" && (
                <p className="text-amber-800">
                  Live credit checks are not available yet. Please check back later.
                </p>
              )}
              {!interswitchStatusQuery.data?.configured &&
              interswitchStatusQuery.data?.providerReadiness?.mode !== "production" && (
                <p className="text-amber-800">Credit checks are not available in this environment yet.</p>
              )}
            {interswitchStatusQuery.data?.providerReadiness?.mode === "sandbox" && (
              <p className="text-blue-800">
                This is a test environment. Only use test BVNs supplied for testing; do not enter a real BVN.
              </p>
            )}
            {interswitchStatusQuery.data?.configured &&
              interswitchStatusQuery.data?.providerReadiness?.mode === "production" && (
                <p className="text-amber-800">
                  Live credit checks are available.
                </p>
              )}
            {!interswitchStatusQuery.data?.consentSchemaReady && (
              <p className="text-amber-800">Credit checks are temporarily unavailable. Please try again later.</p>
            )}
            {!interswitchStatusQuery.data?.evidenceSchemaReady && (
              <p className="text-amber-800">Credit checks are temporarily unavailable. Please try again later.</p>
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
            I authorize Cush to send my BVN to the credit-check provider for this request. This is separate from accepting the
            Terms or Privacy Policy.
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
            {creditLookupMutation.isPending ? "Running credit check…" : "Run credit check"}
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
                Credit check received · {new Date((creditHistoryResult ?? interswitchStatusQuery.data?.latest)!.fetchedAt).toLocaleString()}
              </p>
            </div>
            {(() => {
              const result = creditHistoryResult ?? interswitchStatusQuery.data?.latest;
              if (!result) return null;
              return (
                <>
                  <p className="text-xs text-slate-600">
                    {result.scoreApplied
                      ? "Your credit check has been added to your assessment."
                      : result.scoreReason === "sandbox_not_scored"
                        ? "Test credit checks are not used in your score."
                        : "This credit check could not be added to your score. Your overall score may remain provisional."}
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </AssessmentStep>

      {view.monoImports.length > 0 && (
        <Card title="Bank statements included">
          <div className="space-y-2">
            {view.monoImports.map((item) => (
              <div key={item.linkedAccountId} className="rounded-lg border border-slate-100 p-3 text-xs">
                <p className="font-semibold text-slate-800">Connected account</p>
                <p className="mt-1 text-slate-600">
                  Imported {new Date(item.fetchedAt).toLocaleString("en-GB")} · {item.statementPeriodMonths}-month statement
                </p>
                <p className="mt-1 text-slate-500">
                  {item.balancePence === null ? "No balance included" : `Accessible balance £${(item.balancePence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  {" · "}{item.incomeMonths} income month{item.incomeMonths === 1 ? "" : "s"}
                  {" · "}{item.cashFlowMonths} cash-flow month{item.cashFlowMonths === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Reviewed bank records replace self-reported records for the same months so activity is not counted twice.
          </p>
        </Card>
      )}
      {!view.monoDataReady && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Bank statement data is not available to your assessment yet. Connect a bank and review a statement above.
        </div>
      )}
    </div>
  );
}
