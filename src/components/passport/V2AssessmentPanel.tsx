import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus, Save, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import type { V2AssessmentInput } from "@shared/schema";
import MonoBankDataPanel from "@/components/passport/MonoBankDataPanel";

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

function dollarsToPence(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const pence = Math.round(amount * 100);
  return Number.isSafeInteger(pence) && pence > 0 ? pence : null;
}

function monthNow() {
  return new Date().toISOString().slice(0, 7);
}

function sourceKey(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function AmountInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label} (GBP)
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        placeholder="0.00"
      />
    </label>
  );
}

export default function V2AssessmentPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creditNudgeDismissed, setCreditNudgeDismissed] = useState(() =>
    typeof window !== "undefined" &&
    window.sessionStorage.getItem("cush-v2-credit-nudge-dismissed") === "true",
  );
  const [inputs, setInputs] = useState<V2AssessmentInput>(EMPTY_INPUTS);
  const [fundLabel, setFundLabel] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [fundAccessible, setFundAccessible] = useState(true);
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeMonth, setIncomeMonth] = useState(monthNow());
  const [incomeCategory, setIncomeCategory] = useState<V2AssessmentInput["incomeHistory"][number]["category"]>("salary");
  const [incomeRecurring, setIncomeRecurring] = useState(true);
  const [incomeVariable, setIncomeVariable] = useState(false);
  const [cashFlowMonth, setCashFlowMonth] = useState(monthNow());
  const [cashFlowIncome, setCashFlowIncome] = useState("");
  const [cashFlowExpenses, setCashFlowExpenses] = useState("");
  const [cashFlowComplete, setCashFlowComplete] = useState(true);

  const assessmentQuery = useQuery<V2AssessmentResponse>({
    queryKey: ["/api/passport/v2"],
    queryFn: () => request("GET", "/api/passport/v2"),
    retry: false,
  });

  useEffect(() => {
    if (assessmentQuery.data?.inputs) setInputs(assessmentQuery.data.inputs);
  }, [assessmentQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (data: V2AssessmentInput) => request<V2AssessmentResponse>("PUT", "/api/passport/v2", data),
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/passport/v2"], data);
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({ title: "Assessment saved", description: "Submitted values remain self-reported until reviewed." });
    },
    onError: (error: Error) => toast({ title: "Could not save assessment", description: error.message, variant: "destructive" }),
  });

  function addFund() {
    const amountPence = dollarsToPence(fundAmount);
    const label = fundLabel.trim();
    const deduplicationKey = sourceKey(label);
    if (!label || !deduplicationKey || amountPence === null) return;
    if (inputs.availableFunds.some((fund) => fund.deduplicationKey.toLowerCase() === deduplicationKey)) {
      toast({ title: "Funds source already listed", description: "Use one entry per source to avoid double counting.", variant: "destructive" });
      return;
    }
    setInputs((current) => ({
      ...current,
      availableFunds: [...current.availableFunds, {
        id: crypto.randomUUID(),
        label,
        deduplicationKey,
        amountPence,
        currencyCode: "GBP",
        accessible: fundAccessible,
      }],
    }));
    setFundLabel("");
    setFundAmount("");
  }

  function addIncome() {
    const amountPence = dollarsToPence(incomeAmount);
    const label = incomeSource.trim();
    const sourceId = sourceKey(label);
    if (!label || !sourceId || amountPence === null) return;
    if (inputs.incomeHistory.some((item) => item.sourceId === sourceId && item.month === incomeMonth)) {
      toast({ title: "Income record already exists", description: "Use one record per income source and month.", variant: "destructive" });
      return;
    }
    const existingSource = inputs.incomeHistory.find((item) => item.sourceId === sourceId);
    if (existingSource && existingSource.variable !== incomeVariable) {
      toast({ title: "Income type must stay consistent", description: "Keep the variable setting the same for this source across months.", variant: "destructive" });
      return;
    }
    setInputs((current) => ({
      ...current,
      incomeHistory: [...current.incomeHistory, {
        id: crypto.randomUUID(),
        month: incomeMonth,
        sourceId,
        category: incomeCategory,
        amountPence,
        recurring: incomeRecurring,
        variable: incomeVariable,
      }].sort((a, b) => a.month.localeCompare(b.month)),
    }));
    setIncomeAmount("");
  }

  function addCashFlow() {
    const incomePence = cashFlowIncome === "" ? 0 : Math.round(Number(cashFlowIncome) * 100);
    const expensesPence = cashFlowExpenses === "" ? 0 : Math.round(Number(cashFlowExpenses) * 100);
    if (!Number.isSafeInteger(incomePence) || incomePence < 0 ||
        !Number.isSafeInteger(expensesPence) || expensesPence < 0) return;
    if (inputs.cashFlowHistory.some((item) => item.month === cashFlowMonth)) {
      toast({ title: "Cash-flow month already exists", description: "Use one monthly total per month.", variant: "destructive" });
      return;
    }
    setInputs((current) => ({
      ...current,
      cashFlowHistory: [...current.cashFlowHistory, {
        id: crypto.randomUUID(),
        month: cashFlowMonth,
        eligibleRecurringIncomePence: incomePence,
        eligibleExpensesPence: expensesPence,
        complete: cashFlowComplete,
      }].sort((a, b) => a.month.localeCompare(b.month)),
    }));
    setCashFlowIncome("");
    setCashFlowExpenses("");
  }

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
  const creditRequirement = "Completed, supported credit assessment";
  const needsCreditCheck = view.calculation.missingRequirements.includes(creditRequirement);
  const otherRequirements = view.calculation.missingRequirements.filter((requirement) =>
    requirement !== creditRequirement && requirement !== "All four score components",
  );
  const canShowCreditNudge =
    needsCreditCheck &&
    otherRequirements.length === 0 &&
    view.calculation.componentScores.availableFunds !== null &&
    view.calculation.componentScores.incomeStrength !== null &&
    view.calculation.componentScores.cashFlow !== null;

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
          <span className="text-slate-600">Total score: </span>
          {view.calculation.cushScore === null
            ? <span className="font-semibold text-slate-500">Not available yet</span>
            : <span className="font-bold text-slate-900">{view.calculation.cushScore}/1000</span>}
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

      {canShowCreditNudge && !creditNudgeDismissed && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800" role="status">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">Your total score needs a completed credit check</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                No check is run from this form. Before any check is offered, we’ll explain what data it reads and ask for your consent. You may decline; your available components remain visible, but the total will stay unavailable.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.sessionStorage.setItem("cush-v2-credit-nudge-dismissed", "true");
                setCreditNudgeDismissed(true);
              }}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Not now
            </button>
          </div>
        </div>
      )}

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

      <Card title="Available funds">
        <p className="text-xs text-slate-500">Only accessible funds with verified evidence contribute to this component. Use the same source label to avoid double-counting.</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="block text-xs font-medium text-slate-600">
            Source label
            <input value={fundLabel} onChange={(event) => setFundLabel(event.target.value)} maxLength={100} placeholder="e.g. savings account" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <AmountInput label="Available balance" value={fundAmount} onChange={setFundAmount} />
          <button type="button" onClick={addFund} className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={fundAccessible} onChange={(event) => setFundAccessible(event.target.checked)} />
          Accessible to me now
        </label>
        <div className="space-y-2">
          {inputs.availableFunds.map((fund) => (
            <div key={fund.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span>{fund.label} · £{(fund.amountPence / 100).toLocaleString("en-GB")} · {fund.accessible ? "Accessible" : "Not accessible"}</span>
              <button type="button" aria-label={`Remove ${fund.label}`} onClick={() => setInputs((current) => ({ ...current, availableFunds: current.availableFunds.filter((item) => item.id !== fund.id) }))} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Income history">
        <p className="text-xs text-slate-500">Add one amount per recurring income source and month. One-off income should be marked non-recurring.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            Source label
            <input value={incomeSource} onChange={(event) => setIncomeSource(event.target.value)} maxLength={100} placeholder="e.g. employer salary" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <AmountInput label="Amount" value={incomeAmount} onChange={setIncomeAmount} />
          <label className="block text-xs font-medium text-slate-600">
            Month
            <input type="month" max={monthNow()} value={incomeMonth} onChange={(event) => setIncomeMonth(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Category
            <select value={incomeCategory} onChange={(event) => setIncomeCategory(event.target.value as typeof incomeCategory)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="salary">Salary</option>
              <option value="self_employment">Self-employment</option>
              <option value="freelance">Freelance</option>
              <option value="business">Business</option>
              <option value="scholarship">Scholarship</option>
              <option value="family_support">Family support</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <label className="flex items-center gap-2"><input type="checkbox" checked={incomeRecurring} onChange={(event) => setIncomeRecurring(event.target.checked)} /> Recurring</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={incomeVariable} onChange={(event) => setIncomeVariable(event.target.checked)} /> Variable amount</label>
          <button type="button" onClick={addIncome} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-700"><Plus className="h-4 w-4" /> Add month</button>
        </div>
        <div className="space-y-2">
          {inputs.incomeHistory.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span>{item.month} · {item.sourceId} · £{(item.amountPence / 100).toLocaleString("en-GB")} · {item.category} · {item.recurring ? "Recurring" : "One-off"}</span>
              <button type="button" aria-label={`Remove ${item.sourceId} ${item.month}`} onClick={() => setInputs((current) => ({ ...current, incomeHistory: current.incomeHistory.filter((row) => row.id !== item.id) }))} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Monthly cash flow">
        <p className="text-xs text-slate-500">Enter one monthly total. Expenses and recurring income are self-reported until reviewed.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            Month
            <input type="month" max={monthNow()} value={cashFlowMonth} onChange={(event) => setCashFlowMonth(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <AmountInput label="Recurring income" value={cashFlowIncome} onChange={setCashFlowIncome} />
          <AmountInput label="Eligible expenses" value={cashFlowExpenses} onChange={setCashFlowExpenses} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <label className="flex items-center gap-2"><input type="checkbox" checked={cashFlowComplete} onChange={(event) => setCashFlowComplete(event.target.checked)} /> Month is complete</label>
          <button type="button" onClick={addCashFlow} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-700"><Plus className="h-4 w-4" /> Add month</button>
        </div>
        <div className="space-y-2">
          {inputs.cashFlowHistory.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span>{item.month} · Income £{(item.eligibleRecurringIncomePence / 100).toLocaleString("en-GB")} · Expenses £{(item.eligibleExpensesPence / 100).toLocaleString("en-GB")} · {item.complete ? "Complete" : "Incomplete"}</span>
              <button type="button" aria-label={`Remove cash flow ${item.month}`} onClick={() => setInputs((current) => ({ ...current, cashFlowHistory: current.cashFlowHistory.filter((row) => row.id !== item.id) }))} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Credit assessment">
        <label className="block text-xs font-medium text-slate-600">
          Your current classification
          <select value={inputs.creditClassification} onChange={(event) => setInputs((current) => ({ ...current, creditClassification: event.target.value as V2AssessmentInput["creditClassification"] }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="unavailable">Not entered / unavailable</option>
            <option value="thin_file">Thin file</option>
            <option value="no_history">No history</option>
            <option value="strong">Strong</option>
            <option value="average">Average</option>
            <option value="poor">Poor</option>
            <option value="incomplete">Assessment incomplete</option>
          </select>
        </label>
        <p className="text-xs text-slate-500">This entry is self-reported. Thin-file is the only fixed mapping; other classifications need an active approved mapping and supported evidence.</p>
      </Card>

      <button
        type="button"
        onClick={() => saveMutation.mutate(inputs)}
        disabled={saveMutation.isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? "Saving…" : "Save V2 assessment"}
      </button>
    </div>
  );
}
