import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, Link2, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";

interface MonoStatus {
  configured: boolean;
  callbackConfigured: boolean;
  schemaReady: boolean;
}

interface MonoLinkedAccount {
  id: number;
  linkedAt: string;
}

interface LookupMethod {
  method: string;
  hint: string;
}

interface LookupAccount {
  accountName: string | null;
  accountType: string | null;
  institutionName: string | null;
  bankCode: string | null;
  accountLast4: string | null;
}

interface MonoResponse {
  accounts: MonoLinkedAccount[];
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
  const [bvn, setBvn] = useState("");
  const [lookupConsent, setLookupConsent] = useState(false);
  const [methods, setMethods] = useState<LookupMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [otp, setOtp] = useState("");
  const [lookupAccounts, setLookupAccounts] = useState<LookupAccount[] | null>(null);
  const [statementResult, setStatementResult] = useState<{
    accountId: number;
    periodMonths: number;
    statement: unknown;
  } | null>(null);
  const [statementPeriod, setStatementPeriod] = useState(3);

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

  const lookupMutation = useMutation({
    mutationFn: () => request<{ methods: LookupMethod[] }>("POST", "/api/mono/bvn/initiate", {
      bvn,
      consent: lookupConsent,
    }),
    onSuccess: (result) => {
      setMethods(result.methods);
      setSelectedMethod(result.methods[0]?.method ?? "");
      setBvn("");
      setOtp("");
      setLookupAccounts(null);
    },
  });

  const otpMutation = useMutation({
    mutationFn: () => request<{ success: boolean }>("POST", "/api/mono/bvn/request-otp", {
      method: selectedMethod,
      ...(selectedMethod === "alternate_phone" ? { phoneNumber: alternatePhone } : {}),
    }),
  });

  const fetchAccountsMutation = useMutation({
    mutationFn: () => request<{ accounts: LookupAccount[] }>("POST", "/api/mono/bvn/fetch-accounts", { otp }),
    onSuccess: (result) => {
      setLookupAccounts(result.accounts);
      setOtp("");
      setMethods([]);
      setSelectedMethod("");
      setAlternatePhone("");
      setLookupConsent(false);
    },
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

  const transactions = useMemo(
    () => statementResult ? findTransactions(statementResult.statement) : [],
    [statementResult],
  );
  const status = statusQuery.data;
  const setupReady = Boolean(status?.configured && status?.callbackConfigured && status?.schemaReady);
  const linkedAccounts = accountsQuery.data?.accounts ?? [];

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-700"><Building2 className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-900">Find bank accounts with BVN</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Mono sends an OTP to a contact method already registered with the BVN. Account numbers are masked here and lookup results are not saved by Cush.
            </p>
          </div>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          BVN
          <input
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            value={bvn}
            onChange={(event) => setBvn(event.target.value.replace(/\D/g, ""))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Enter 11 digits"
          />
        </label>

        <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={lookupConsent}
            onChange={(event) => setLookupConsent(event.target.checked)}
          />
          <span>
            I authorize Cush to send my BVN to Mono to retrieve the bank accounts linked to it. I understand Mono charges for each lookup step, including OTP requests.
          </span>
        </label>

        <button
          type="button"
          disabled={!setupReady || bvn.length !== 11 || !lookupConsent || lookupMutation.isPending}
          onClick={() => lookupMutation.mutate()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {lookupMutation.isPending ? "Starting lookup…" : "Start BVN account lookup"}
        </button>

        {lookupMutation.isError && <p className="text-xs text-red-700" role="alert">{lookupMutation.error.message}</p>}

        {methods.length > 0 && (
          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <label className="block text-xs font-medium text-slate-700">
              OTP delivery method
              <select
                value={selectedMethod}
                onChange={(event) => setSelectedMethod(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {methods.map((method) => (
                  <option value={method.method} key={method.method}>
                    {method.hint || method.method.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            {selectedMethod === "alternate_phone" && (
              <label className="block text-xs font-medium text-slate-700">
                Alternate phone number
                <input
                  value={alternatePhone}
                  onChange={(event) => setAlternatePhone(event.target.value)}
                  autoComplete="tel"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            )}
            <button
              type="button"
              disabled={otpMutation.isPending || !selectedMethod}
              onClick={() => otpMutation.mutate()}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50"
            >
              {otpMutation.isPending ? "Requesting OTP…" : "Send OTP"}
            </button>
            {otpMutation.isError && <p className="text-xs text-red-700" role="alert">{otpMutation.error.message}</p>}
            {otpMutation.isSuccess && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  OTP
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Enter the code"
                  />
                </label>
                <button
                  type="button"
                  disabled={fetchAccountsMutation.isPending || otp.length < 4}
                  onClick={() => fetchAccountsMutation.mutate()}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {fetchAccountsMutation.isPending ? "Verifying…" : "Verify and show accounts"}
                </button>
                {fetchAccountsMutation.isError && <p className="text-xs text-red-700" role="alert">{fetchAccountsMutation.error.message}</p>}
              </div>
            )}
          </div>
        )}

        {lookupAccounts && (
          <div className="space-y-2" role="status">
            <p className="text-xs font-semibold text-slate-700">Accounts found: {lookupAccounts.length}</p>
            {lookupAccounts.length === 0 ? (
              <p className="text-xs text-slate-500">Mono returned no bank accounts for this lookup.</p>
            ) : lookupAccounts.map((account, index) => (
              <div key={`${account.bankCode ?? "bank"}-${account.accountLast4 ?? index}`} className="rounded-lg border border-slate-100 p-3 text-xs">
                <p className="font-semibold text-slate-800">{account.institutionName ?? "Bank"} ···· {account.accountLast4 ?? "—"}</p>
                <p className="mt-1 text-slate-500">{account.accountName ?? "Account holder"}{account.accountType ? ` · ${account.accountType}` : ""}</p>
              </div>
            ))}
            <p className="text-xs text-slate-500">This temporary result clears when you leave or refresh this page. It does not connect the bank for statements.</p>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Link2 className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-900">Connect a bank for statements</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              BVN lookup only identifies accounts. Use Mono Connect to authorize access to account data and request statements. Statement responses are not saved by Cush.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Connected data does not yet populate the V2 score. V2 accepts GBP only; NGN statement amounts are not converted.
            </p>
          </div>
        </div>

        {statusQuery.isError && <p className="text-xs text-red-700" role="alert">Could not check Mono setup. Refresh this section and try again.</p>}
        {!setupReady && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {!status?.schemaReady
                ? "Mono database tables are not ready. Apply migrations/manual/create-mono-account-data-tables.sql in the intended Supabase SQL Editor."
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
                </div>
              </div>
            ))}
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
      </section>
    </div>
  );
}
