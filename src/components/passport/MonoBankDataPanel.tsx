import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import AssessmentStep from "@/components/passport/AssessmentStep";

interface MonoStatus {
  configured: boolean;
  callbackConfigured: boolean;
  schemaReady: boolean;
}

interface MonoLinkedAccount {
  id: number;
  linkedAt: string;
}

interface MonoResponse {
  accounts: MonoLinkedAccount[];
}

interface MonoV2PreviewTransaction {
  id: string;
  date: string;
  description: string;
  direction: "credit" | "debit";
  currencyCode: "GBP" | "USD" | "NGN";
  amountMinor: number;
  amountGbpPence: number;
  rateDate: string | null;
  usdNgnCentralRate: string | null;
  gbpNgnCentralRate: string | null;
}

interface MonoV2Preview {
  token: string;
  linkedAccountId: number;
  statementPeriodMonths: number;
  fetchedAt: string;
  balance: {
    asOfDate: string;
    currencyCode: "GBP" | "USD" | "NGN";
    amountMinor: number;
    amountGbpPence: number;
    rateDate: string | null;
    usdNgnCentralRate: string | null;
    gbpNgnCentralRate: string | null;
  } | null;
  transactions: MonoV2PreviewTransaction[];
  fullMonthOptions: string[];
}

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

function findTransactions(statement: unknown): Record<string, unknown>[] {
  if (!statement || typeof statement !== "object") return [];
  const root = statement as Record<string, unknown>;
  const data = root.data && typeof root.data === "object"
    ? root.data as Record<string, unknown>
    : root;
  for (const key of ["transactions", "statement", "records"]) {
    if (Array.isArray(data[key])) return data[key] as Record<string, unknown>[];
  }
  return [];
}

function formatProviderAmount(amount: unknown, currencyValue: unknown): string {
  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numericAmount)) return "—";
  const currency = typeof currencyValue === "string" && /^[A-Z]{3}$/.test(currencyValue)
    ? currencyValue
    : "NGN";
  try {
    // Mono returns NGN in kobo (and other supported currencies in minor units).
    return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(numericAmount / 100);
  } catch {
    return `${currency} ${(numericAmount / 100).toFixed(2)}`;
  }
}

function transactionDate(row: Record<string, unknown>) {
  const value = row.date ?? row.datetime ?? row.transaction_date ?? row.created_at;
  if (typeof value !== "string") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB");
}

export default function MonoBankDataPanel() {
  const queryClient = useQueryClient();
  const [statementResult, setStatementResult] = useState<{
    accountId: number;
    periodMonths: number;
    statement: unknown;
  } | null>(null);
  const [statementPeriod, setStatementPeriod] = useState(6);
  const [assessmentConsent, setAssessmentConsent] = useState(false);
  const [monoV2Preview, setMonoV2Preview] = useState<MonoV2Preview | null>(null);
  const [recurringIncome, setRecurringIncome] = useState<Record<string, {
    category: "salary" | "self_employment" | "freelance" | "business" | "scholarship" | "family_support" | "other";
    variable: boolean;
  }>>({});
  const [eligibleExpenses, setEligibleExpenses] = useState<string[]>([]);
  const [completeMonths, setCompleteMonths] = useState<string[]>([]);
  const [includeBalance, setIncludeBalance] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const statusQuery = useQuery<MonoStatus>({
    queryKey: ["/api/mono/status"],
    queryFn: () => request("GET", "/api/mono/status"),
    retry: false,
  });
  const accountsQuery = useQuery<MonoResponse>({
    queryKey: ["/api/mono/accounts"],
    queryFn: () => request("GET", "/api/mono/accounts"),
    retry: false,
  });

  const connectMutation = useMutation({
    mutationFn: () => request<{ monoUrl: string }>("POST", "/api/mono/connect/initiate"),
    onSuccess: ({ monoUrl }) => window.location.assign(monoUrl),
  });

  const statementMutation = useMutation({
    mutationFn: ({ accountId, periodMonths }: { accountId: number; periodMonths: number }) =>
      request<{ statement: unknown; periodMonths: number }>(
        "POST",
        `/api/mono/accounts/${accountId}/statement`,
        { periodMonths },
      ),
    onSuccess: (result, variables) => setStatementResult({
      accountId: variables.accountId,
      periodMonths: result.periodMonths,
      statement: result.statement,
    }),
  });

  const monoV2PreviewMutation = useMutation({
    mutationFn: ({ accountId, periodMonths }: { accountId: number; periodMonths: number }) =>
      request<MonoV2Preview>("POST", `/api/mono/accounts/${accountId}/v2-preview`, {
        periodMonths,
        consent: true,
      }),
    onSuccess: (preview) => {
      setMonoV2Preview(preview);
      setRecurringIncome({});
      setEligibleExpenses([]);
      setCompleteMonths([]);
      setIncludeBalance(false);
      setImportMessage(null);
    },
  });

  const monoV2ImportMutation = useMutation({
    mutationFn: () => {
      if (!monoV2Preview) throw new Error("Prepare a statement review first.");
      return request("POST", `/api/mono/accounts/${monoV2Preview.linkedAccountId}/v2-import`, {
        previewToken: monoV2Preview.token,
        recurringIncome: Object.entries(recurringIncome).map(([transactionId, choice]) => ({
          transactionId,
          ...choice,
        })),
        eligibleExpenseIds: eligibleExpenses,
        completeMonths,
        includeBalance,
        consent: true,
      });
    },
    onSuccess: async () => {
      setMonoV2Preview(null);
      setAssessmentConsent(false);
      setImportMessage("Reviewed Mono data was added to V2. Raw statement rows and descriptions were not saved.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/passport/v2"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/passport/me"] }),
      ]);
    },
  });

  const transactions = useMemo(
    () => statementResult ? findTransactions(statementResult.statement) : [],
    [statementResult],
  );
  const status = statusQuery.data;
  const setupReady = Boolean(status?.configured && status?.callbackConfigured && status?.schemaReady);
  const linkedAccounts = accountsQuery.data?.accounts ?? [];

  return (
    <div className="space-y-4">
      <AssessmentStep
        id="assessment-bank-statements"
        step={1}
        title="Connect a bank for statements"
        description="Authorize account access, then review statement activity for your assessment."
      >
        <p className="text-xs leading-relaxed text-slate-600">
          Connect your bank to review account statements and add selected balance, recurring income, and expenses to V2. Raw statements are not retained; imports save reviewed monthly aggregates and exchange-rate provenance. NGN and USD transactions use CBN central rates for their transaction dates; the current balance uses the rate for its snapshot date.
        </p>

        {statusQuery.isError && <p className="text-xs text-red-700" role="alert">Could not check Mono setup. Refresh this section and try again.</p>}
        {!setupReady && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {!status?.schemaReady
                ? "Mono database tables are not ready. In the intended Supabase SQL Editor, run migrations/manual/create-mono-account-data-tables.sql first if needed, then migrations/manual/create-mono-v2-assessment-evidence.sql."
                : !status?.configured || !status?.callbackConfigured
                  ? "Mono is not ready yet. Set MONO_SECRET_KEY and MONO_REDIRECT_URL on the Render service, then redeploy."
                  : "Mono setup is incomplete. Refresh this panel to check the service configuration."}
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={!setupReady || connectMutation.isPending}
          onClick={() => connectMutation.mutate()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          {connectMutation.isPending ? "Opening Mono…" : "Connect a bank with Mono"}
        </button>
        {connectMutation.isError && <p className="text-xs text-red-700" role="alert">{connectMutation.error.message}</p>}
        {accountsQuery.isError && <p className="text-xs text-red-700" role="alert">{(accountsQuery.error as Error).message}</p>}

        {linkedAccounts.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-700">Linked accounts</p>
            {linkedAccounts.map((account) => (
              <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                <div className="text-xs">
                  <p className="font-semibold text-slate-800">Mono linked account</p>
                  <p className="mt-1 text-slate-500">Linked {new Date(account.linkedAt).toLocaleDateString("en-GB")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Statement period"
                    value={statementPeriod}
                    onChange={(event) => setStatementPeriod(Number(event.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                  >
                    {[1, 3, 6, 12].map((months) => <option key={months} value={months}>{months} months</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={statementMutation.isPending}
                    onClick={() => {
                      setStatementResult(null);
                      statementMutation.mutate({ accountId: account.id, periodMonths: statementPeriod });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {statementMutation.isPending && statementMutation.variables?.accountId === account.id ? "Loading…" : "Get statement"}
                  </button>
                  <button
                    type="button"
                    disabled={monoV2PreviewMutation.isPending || monoV2ImportMutation.isPending || !assessmentConsent}
                    onClick={() => {
                      setMonoV2Preview(null);
                      monoV2PreviewMutation.mutate({ accountId: account.id, periodMonths: statementPeriod });
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {monoV2PreviewMutation.isPending && monoV2PreviewMutation.variables?.accountId === account.id
                      ? "Preparing…"
                      : "Review for V2"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={assessmentConsent}
            onChange={(event) => setAssessmentConsent(event.target.checked)}
          />
          <span>
            I authorize Cush to use the selected Mono account balance and statement transactions in my V2 assessment. I will review transaction categories and monthly completeness. Cush saves only derived monthly amounts and exchange-rate provenance, not raw statement rows or descriptions.
          </span>
        </label>
        {monoV2PreviewMutation.isError && <p className="text-xs text-red-700" role="alert">{(monoV2PreviewMutation.error as Error).message}</p>}
        {importMessage && <p className="text-xs text-emerald-700" role="status">{importMessage}</p>}
        {monoV2Preview && (
          <div className="space-y-4 rounded-xl border border-blue-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">Review before importing to V2</p>
                <p className="text-xs text-slate-500">
                  {monoV2Preview.transactions.length} transactions · {monoV2Preview.statementPeriodMonths}-month statement · fetched {new Date(monoV2Preview.fetchedAt).toLocaleString("en-GB")}
                </p>
              </div>
              <button type="button" onClick={() => setMonoV2Preview(null)} className="text-xs text-slate-500 underline">Discard review</button>
            </div>

            {monoV2Preview.balance && (
              <label className="flex items-start gap-2 rounded-lg border border-slate-100 p-3 text-xs text-slate-700">
                <input type="checkbox" className="mt-0.5" checked={includeBalance} onChange={(event) => setIncludeBalance(event.target.checked)} />
                <span>
                  I can access this current balance and want to include it as funds: {formatProviderAmount(monoV2Preview.balance.amountMinor, monoV2Preview.balance.currencyCode)} ≈ £{(monoV2Preview.balance.amountGbpPence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {monoV2Preview.balance.rateDate
                    ? ` · snapshot ${monoV2Preview.balance.asOfDate}; CBN central rates dated ${monoV2Preview.balance.rateDate}: USD ₦${monoV2Preview.balance.usdNgnCentralRate}, GBP ₦${monoV2Preview.balance.gbpNgnCentralRate}`
                    : " · GBP"}
                </span>
              </label>
            )}
            {!monoV2Preview.balance && <p className="text-xs text-amber-700">Mono did not provide a supported current balance; no funds value will be imported.</p>}

            <div className="max-h-96 overflow-auto rounded-lg border border-slate-100">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-2">Date / description</th>
                    <th className="p-2">Statement amount</th>
                    <th className="p-2">GBP amount</th>
                    <th className="p-2">Assessment treatment</th>
                  </tr>
                </thead>
                <tbody>
                  {monoV2Preview.transactions.map((transaction) => {
                    const incomeChoice = recurringIncome[transaction.id];
                    const expenseSelected = eligibleExpenses.includes(transaction.id);
                    return (
                      <tr key={transaction.id} className="border-t border-slate-100 align-top">
                        <td className="max-w-80 p-2">
                          <p className="font-medium text-slate-700">{transaction.date} · {transaction.direction}</p>
                          <p className="mt-0.5 break-words text-slate-500">{transaction.description}</p>
                          {transaction.rateDate && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              CBN central rates {transaction.rateDate}: USD ₦{transaction.usdNgnCentralRate} · GBP ₦{transaction.gbpNgnCentralRate}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap p-2 text-slate-600">{formatProviderAmount(transaction.amountMinor, transaction.currencyCode)}</td>
                        <td className="whitespace-nowrap p-2 font-medium text-slate-700">
                          £{(transaction.amountGbpPence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="min-w-64 p-2">
                          {transaction.direction === "credit" ? (
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={Boolean(incomeChoice)}
                                  onChange={(event) => setRecurringIncome((current) => {
                                    const next = { ...current };
                                    if (event.target.checked) next[transaction.id] ??= { category: "other", variable: false };
                                    else delete next[transaction.id];
                                    return next;
                                  })}
                                />
                                Include as recurring income
                              </label>
                              {incomeChoice && (
                                <div className="flex flex-wrap gap-2">
                                  <select
                                    aria-label={`Income category for ${transaction.date}`}
                                    value={incomeChoice.category}
                                    onChange={(event) => setRecurringIncome((current) => ({
                                      ...current,
                                      [transaction.id]: { ...incomeChoice, category: event.target.value as typeof incomeChoice.category },
                                    }))}
                                    className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px]"
                                  >
                                    <option value="salary">Salary</option>
                                    <option value="self_employment">Self-employment</option>
                                    <option value="freelance">Freelance</option>
                                    <option value="business">Business</option>
                                    <option value="scholarship">Scholarship</option>
                                    <option value="family_support">Family support</option>
                                    <option value="other">Other</option>
                                  </select>
                                  <label className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <input
                                      type="checkbox"
                                      checked={incomeChoice.variable}
                                      onChange={(event) => setRecurringIncome((current) => ({
                                        ...current,
                                        [transaction.id]: { ...incomeChoice, variable: event.target.checked },
                                      }))}
                                    />
                                    Variable
                                  </label>
                                </div>
                              )}
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 text-slate-600">
                              <input
                                type="checkbox"
                                checked={expenseSelected}
                                onChange={(event) => setEligibleExpenses((current) =>
                                  event.target.checked
                                    ? [...current, transaction.id]
                                    : current.filter((id) => id !== transaction.id),
                                )}
                              />
                              Include as eligible expense
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {monoV2Preview.fullMonthOptions.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-slate-700">Confirm complete statement months</legend>
                <p className="text-[11px] text-slate-500">Check a month only if you reviewed it and the statement covers the full month for this connected account.</p>
                <div className="flex flex-wrap gap-3">
                  {monoV2Preview.fullMonthOptions.map((month) => (
                    <label key={month} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={completeMonths.includes(month)}
                        onChange={(event) => setCompleteMonths((current) =>
                          event.target.checked ? [...current, month] : current.filter((item) => item !== month),
                        )}
                      />
                      {month}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">Do not select internal transfers, refunds, or one-off credits as recurring income.</p>
              <button
                type="button"
                disabled={!assessmentConsent || monoV2ImportMutation.isPending}
                onClick={() => monoV2ImportMutation.mutate()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {monoV2ImportMutation.isPending ? "Importing…" : "Import reviewed data to V2"}
              </button>
            </div>
            {monoV2ImportMutation.isError && <p className="text-xs text-red-700" role="alert">{(monoV2ImportMutation.error as Error).message}</p>}
          </div>
        )}

        {statementMutation.isError && <p className="text-xs text-red-700" role="alert">{statementMutation.error.message}</p>}
        {statementResult && (
          <div className="space-y-2 rounded-xl border border-slate-100 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Statement loaded · {statementResult.periodMonths} month period · {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
            </p>
            {transactions.length > 0 ? (
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-2 font-medium">Date</th>
                      <th className="p-2 font-medium">Description</th>
                      <th className="p-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 50).map((row, index) => {
                      const amount = row.amount ?? row.value;
                      const currency = row.currency ?? row.currency_code;
                      const description = row.narration ?? row.description ?? row.reference;
                      return (
                        <tr key={`${String(row.id ?? row.transaction_id ?? index)}`} className="border-t border-slate-100">
                          <td className="whitespace-nowrap p-2 text-slate-600">{transactionDate(row)}</td>
                          <td className="max-w-60 truncate p-2 text-slate-700">{typeof description === "string" ? description : "Bank transaction"}</td>
                          <td className="whitespace-nowrap p-2 text-right font-medium text-slate-800">{formatProviderAmount(amount, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {transactions.length > 50 && <p className="p-2 text-xs text-slate-500">Showing the first 50 transactions.</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Mono returned statement data without a transaction list that Cush can display. No statement data was retained.</p>
            )}
            <button
              type="button"
              onClick={() => setStatementResult(null)}
              className="text-xs font-medium text-slate-500 underline hover:text-slate-800"
            >
              Clear statement from this page
            </button>
          </div>
        )}
      </AssessmentStep>
    </div>
  );
}
