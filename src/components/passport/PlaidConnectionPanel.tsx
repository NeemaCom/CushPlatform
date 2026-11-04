import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePlaidLink } from "react-plaid-link";
import {
  AlertCircle,
  ArrowDownLeft,
  Check,
  ChevronDown,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

type PlaidConnection = {
  id: number;
  institutionName: string | null;
  linkedAt: string;
};

type PlaidStatus = {
  configured: boolean;
  schemaReady: boolean;
  environment: "sandbox" | "production";
  connections: PlaidConnection[];
};

type IdentityAccount = {
  accountKey: string;
  accountName: string | null;
  owners: Array<{
    name: string;
    emails: string[];
    phones: string[];
  }>;
};

type Transaction = {
  id: string;
  date: string;
  name: string;
  amount: number;
  currencyCode: string | null;
  category: string | null;
};

type TransactionResult = {
  startDate: string;
  endDate: string;
  totalCount: number;
  returnedCount: number;
  truncated: boolean;
  items: Transaction[];
};

type RefreshResult = {
  identityAccounts: IdentityAccount[];
  transactions: TransactionResult;
  identityNotice?: string;
  transactionsNotice?: string;
};

type ProfileDetails = {
  accountHolderName?: string;
  accountHolderEmail?: string;
  accountHolderPhone?: string;
};

type Props = {
  request: <T,>(method: string, path: string, body?: unknown) => Promise<T>;
  onProfileDetails: (details: ProfileDetails) => void;
};

function formatDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function formatAmount(amount: number, currencyCode: string | null) {
  const currency = currencyCode && /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : "GBP";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function PlaidConnectionPanel({ request, onProfileDetails }: Props) {
  const queryClient = useQueryClient();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(() => {
    try {
      const stored = sessionStorage.getItem("cush-plaid-link-token");
      if (!stored) return null;
      const parsed = JSON.parse(stored) as { token?: unknown; savedAt?: unknown };
      if (
        typeof parsed.token === "string" &&
        typeof parsed.savedAt === "number" &&
        Date.now() - parsed.savedAt < 3 * 60 * 60 * 1000
      ) {
        return parsed.token;
      }
      sessionStorage.removeItem("cush-plaid-link-token");
    } catch {
      try {
        sessionStorage.removeItem("cush-plaid-link-token");
      } catch {
        // Storage may be unavailable in restricted browser contexts.
      }
    }
    return null;
  });
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const [reviewConnectionId, setReviewConnectionId] = useState<number | null>(null);
  const [reviewResult, setReviewResult] = useState<RefreshResult | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const receivedRedirectUri = typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).has("oauth_state_id") ||
        new URLSearchParams(window.location.hash.replace(/^#/, "")).has("oauth_state_id"))
    ? window.location.href
    : undefined;

  function updateLinkToken(token: string | null) {
    setLinkToken(token);
    try {
      if (token) {
        sessionStorage.setItem("cush-plaid-link-token", JSON.stringify({ token, savedAt: Date.now() }));
      } else {
        sessionStorage.removeItem("cush-plaid-link-token");
      }
    } catch {
      // Plaid can still be used in the current tab when storage is unavailable.
    }
  }

  const statusQuery = useQuery<PlaidStatus>({
    queryKey: ["/api/passport/post-arrival/plaid"],
    queryFn: () => request("GET", "/api/passport/post-arrival/plaid"),
    retry: false,
  });

  const linkTokenMutation = useMutation({
    mutationFn: () => request<{ linkToken: string }>(
      "POST",
      "/api/passport/post-arrival/plaid/link-token",
      { consentAccepted: true },
    ),
  });
  const exchangeMutation = useMutation({
    mutationFn: ({ publicToken, institutionName }: { publicToken: string; institutionName?: string | null }) =>
      request<{ connection: PlaidConnection }>(
        "POST",
        "/api/passport/post-arrival/plaid/exchange",
        { publicToken, institutionName },
      ),
    onSuccess: async () => {
      setConsentAccepted(false);
      setLinkError(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/post-arrival/plaid"] });
    },
  });
  const refreshMutation = useMutation({
    mutationFn: (connectionId: number) =>
      request<RefreshResult>("POST", `/api/passport/post-arrival/plaid/connections/${connectionId}/refresh`),
    onSuccess: (result, connectionId) => {
      setReviewConnectionId(connectionId);
      setReviewResult(result);
      setSelectedOwner("");
    },
  });
  const removeMutation = useMutation({
    mutationFn: (connectionId: number) =>
      request<{ success: true }>("DELETE", `/api/passport/post-arrival/plaid/connections/${connectionId}`),
    onSuccess: async (_, connectionId) => {
      if (reviewConnectionId === connectionId) {
        setReviewConnectionId(null);
        setReviewResult(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/post-arrival/plaid"] });
    },
  });
  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    receivedRedirectUri,
    onSuccess: (publicToken, metadata) => {
      updateLinkToken(null);
      if (!publicToken) {
        setLinkError("Plaid did not return a connection token. Please try again.");
        return;
      }
      exchangeMutation.mutate({
        publicToken,
        institutionName: metadata.institution?.name ?? null,
      }, {
        onError: (error) => setLinkError(error instanceof Error ? error.message : "Could not finish connecting your bank."),
      });
    },
    onExit: () => updateLinkToken(null),
  });

  const status = statusQuery.data;
  const setupReady = Boolean(status?.configured && status.schemaReady);
  const owners = useMemo(() => {
    if (!reviewResult) return [];
    return reviewResult.identityAccounts.flatMap((account, accountIndex) =>
      account.owners.map((owner, ownerIndex) => ({
        key: `${accountIndex}:${ownerIndex}`,
        account,
        owner,
      })),
    );
  }, [reviewResult]);
  const chosenOwner = owners.find(({ key }) => key === selectedOwner);

  async function startPlaidLink() {
    setLinkError(null);
    try {
      const { linkToken } = await linkTokenMutation.mutateAsync();
      updateLinkToken(linkToken);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Could not prepare a secure bank connection.");
    }
  }

  const isLinking = linkTokenMutation.isPending || exchangeMutation.isPending;
  const errorText = statusQuery.error instanceof Error
    ? statusQuery.error.message
    : "We could not check Plaid connection status.";

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d5e2df] bg-[#fbfdfc] shadow-sm" aria-labelledby="plaid-connection-title">
      <div className="relative overflow-hidden bg-[#163c3d] px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-44 w-44 rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b8d2c9]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b4d6b5]" aria-hidden="true" />
              A more complete UK picture
            </div>
            <h3 id="plaid-connection-title" className="mt-2 font-semibold tracking-tight text-[1.55rem]">Connect accounts via Plaid</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#d2e0dc]">
              Review the account details and recent activity you choose to share. You stay in control of what becomes part of your profile.
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-[#e6f0ed]">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            Secure connection
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        {statusQuery.isLoading ? (
          <div className="space-y-3" role="status" aria-label="Checking Plaid setup">
            <div className="h-4 w-48 animate-pulse rounded bg-[#e6eeeb]" />
            <div className="h-12 max-w-xl animate-pulse rounded-xl bg-[#e6eeeb]" />
          </div>
        ) : statusQuery.isError ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Connection status is unavailable</p>
                <p className="mt-1 text-xs leading-5">{errorText}</p>
              </div>
            </div>
            <button type="button" onClick={() => statusQuery.refetch()} className="min-h-10 rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100">
              Try again
            </button>
          </div>
        ) : null}

        {status && (
          <>
            {status.environment === "sandbox" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
                <p className="font-semibold">Sandbox mode — test data only</p>
                <p className="mt-1 text-xs leading-5">
                  Use Plaid sandbox institutions and test credentials. Real bank accounts and live financial data are not connected in this mode.
                </p>
              </div>
            )}
            {!setupReady && (
              <div className="flex items-start gap-2 rounded-xl border border-[#e8d7ad] bg-[#fff9eb] p-4 text-sm text-[#705525]" role="status">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Bank connection is not available yet</p>
                  <p className="mt-1 text-xs leading-5">
                    {!status.schemaReady
                      ? "The secure connection records are still being prepared. You can continue adding your UK information below."
                      : `Plaid is not configured for ${status.environment} mode yet. You can continue adding your UK information below.`}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.66fr)]">
              <div className="rounded-xl border border-[#dbe7e3] bg-white p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#eaf3ef] p-2.5 text-[#286453]">
                    <Landmark className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1b3534]">Your bank, your choice</h4>
                    <p className="mt-1 text-xs leading-5 text-[#687c78]">Plaid opens a secure window from your bank. Cush never sees your bank password.</p>
                  </div>
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#dbe7e3] bg-[#f7faf8] p-3.5 text-xs leading-5 text-[#445a56]">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-[#286453]"
                    checked={consentAccepted}
                    onChange={(event) => setConsentAccepted(event.target.checked)}
                  />
                  <span>
                    I consent to link this bank through Plaid. Cush will keep an encrypted connection until I disconnect it, and request account-holder details plus up to 90 days of transactions. Transactions are temporary, not saved or used for scoring. I can disconnect at any time.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!setupReady || !consentAccepted || isLinking || (Boolean(linkToken) && !ready)}
                  onClick={() => linkToken ? open() : startPlaidLink()}
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6f278] px-5 py-3 text-sm font-bold text-[#193a35] shadow-[0_3px_0_#a8c651] transition hover:bg-[#e1f995] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286453] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none sm:w-auto"
                >
                  {isLinking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                  {linkTokenMutation.isPending ? "Preparing secure link…" : exchangeMutation.isPending ? "Finishing connection…" : linkToken ? (ready ? "Continue to Plaid" : "Preparing Plaid…") : "Connect accounts via Plaid"}
                </button>
                {(linkError || linkTokenMutation.isError || exchangeMutation.isError) && (
                  <p className="mt-3 text-xs text-rose-700" role="alert">
                    {linkError ?? (linkTokenMutation.error instanceof Error
                      ? linkTokenMutation.error.message
                      : exchangeMutation.error instanceof Error ? exchangeMutation.error.message : "The connection could not be completed.")}
                  </p>
                )}
              </div>

              <aside className="rounded-xl bg-[#edf4f1] p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#628077]">A clear boundary</p>
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#367c62]" aria-hidden="true" />
                    <p className="text-xs leading-5 text-[#45605a]">Only name, email and phone can be copied into your editable profile.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#367c62]" aria-hidden="true" />
                    <p className="text-xs leading-5 text-[#45605a]">Transaction activity is shown for review only and is not score evidence.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-[#8d7064]" aria-hidden="true" />
                    <p className="text-xs leading-5 text-[#45605a]">No addresses are copied or displayed in this review.</p>
                  </div>
                </div>
              </aside>
            </div>

            {status.connections.length > 0 && (
              <div className="border-t border-[#e5eeea] pt-5">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-[#1b3534]">Connected institutions</h4>
                    <p className="mt-1 text-xs text-[#758782]">Choose a connection to fetch a fresh, temporary review.</p>
                  </div>
                  <span className="rounded-full bg-[#edf4f1] px-2.5 py-1 text-[11px] font-semibold text-[#547067]">{status.connections.length} connected</span>
                </div>
                <div className="space-y-2">
                  {status.connections.map((connection) => (
                    <article key={connection.id} className="flex flex-col gap-3 rounded-xl border border-[#dbe7e3] bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-lg bg-[#f1f6f3] p-2 text-[#286453]"><Landmark className="h-4 w-4" aria-hidden="true" /></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#263d39]">{connection.institutionName || "Connected bank"}</p>
                          <p className="mt-0.5 text-xs text-[#758782]">Linked {formatDate(connection.linkedAt)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={refreshMutation.isPending}
                          onClick={() => refreshMutation.mutate(connection.id)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1c5548] px-3.5 text-xs font-semibold text-white hover:bg-[#164539] disabled:opacity-60"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending && refreshMutation.variables === connection.id ? "animate-spin" : ""}`} aria-hidden="true" />
                          {refreshMutation.isPending && refreshMutation.variables === connection.id ? "Fetching review…" : "Review latest data"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${connection.institutionName || "bank"} connection`}
                          disabled={removeMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Remove the ${connection.institutionName || "bank"} connection from Cush?`)) {
                              removeMutation.mutate(connection.id);
                            }
                          }}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dbe7e3] px-3 text-xs font-semibold text-[#667873] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {refreshMutation.isError && <p className="mt-3 text-xs text-rose-700" role="alert">{refreshMutation.error instanceof Error ? refreshMutation.error.message : "Could not fetch the latest review."}</p>}
                {removeMutation.isError && <p className="mt-3 text-xs text-rose-700" role="alert">{removeMutation.error instanceof Error ? removeMutation.error.message : "Could not remove this connection."}</p>}
              </div>
            )}
          </>
        )}

        {reviewResult && reviewConnectionId !== null && (
          <section className="overflow-hidden rounded-2xl border border-[#bfd6cc] bg-white" aria-labelledby="plaid-review-title">
            <div className="flex flex-col gap-3 border-b border-[#e2ece7] bg-[#f1f7f3] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#668278]">Temporary review</p>
                <h4 id="plaid-review-title" className="mt-1 text-lg font-semibold text-[#1b3534]">Take a look before you save</h4>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-[#60736e]">Nothing on this screen changes your score. Transaction data is for review only and clears when you leave this page.</p>
              </div>
              <button type="button" onClick={() => { setReviewResult(null); setReviewConnectionId(null); setSelectedOwner(""); }} className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg px-2.5 text-xs font-semibold text-[#62756f] hover:bg-white">
                <X className="h-3.5 w-3.5" aria-hidden="true" />Close review
              </button>
            </div>

            <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-[#367c62]" aria-hidden="true" />
                  <h5 className="text-sm font-semibold text-[#263d39]">Account holder details</h5>
                </div>
                {reviewResult.identityNotice && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{reviewResult.identityNotice}</p>}
                {reviewResult.identityAccounts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#cbd9d3] p-4 text-xs leading-5 text-[#71817b]">No identity account details were returned for review.</p>
                ) : (
                  <div className="space-y-3">
                    {reviewResult.identityAccounts.map((account, accountIndex) => (
                        <article key={account.accountKey} className="rounded-xl border border-[#dbe7e3] p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#263d39]">{account.accountName || "Bank account"}</p>
                          </div>
                          <span className="shrink-0 rounded-md bg-[#f1f6f3] px-2 py-1 text-[10px] font-semibold text-[#668278]">Account {accountIndex + 1}</span>
                        </div>
                        {account.owners.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {account.owners.map((owner, ownerIndex) => {
                              const key = `${accountIndex}:${ownerIndex}`;
                              return (
                                <label key={key} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs ${selectedOwner === key ? "border-[#80ae97] bg-[#f2f8f4]" : "border-[#e4ece8] hover:bg-[#f8faf9]"}`}>
                                  <input
                                    type="radio"
                                    name="plaid-selected-owner"
                                    className="mt-0.5 accent-[#286453]"
                                    checked={selectedOwner === key}
                                    onChange={() => setSelectedOwner(key)}
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-semibold text-[#344a45]">{owner.name || "Account holder"}</span>
                                    {owner.emails.filter(Boolean).map((email) => <span key={email} className="mt-1 block break-all text-[#71817b]">{email}</span>)}
                                    {owner.phones.filter(Boolean).map((phone) => <span key={phone} className="mt-1 block text-[#71817b]">{phone}</span>)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : <p className="mt-3 text-xs text-[#71817b]">No account holder details were returned.</p>}
                      </article>
                    ))}
                    <button
                      type="button"
                      disabled={!chosenOwner}
                      onClick={() => {
                        if (!chosenOwner) return;
                        onProfileDetails({
                          ...(chosenOwner.owner.name ? { accountHolderName: chosenOwner.owner.name } : {}),
                          ...(chosenOwner.owner.emails.find(Boolean) ? { accountHolderEmail: chosenOwner.owner.emails.find(Boolean) } : {}),
                          ...(chosenOwner.owner.phones.find(Boolean) ? { accountHolderPhone: chosenOwner.owner.phones.find(Boolean) } : {}),
                        });
                      }}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1c5548] px-3.5 text-xs font-semibold text-white hover:bg-[#164539] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />Use selected details in profile
                    </button>
                    <p className="text-[11px] leading-5 text-[#768781]">This fills the editable name, email and phone fields only. Review and save those fields in your profile form when ready.</p>
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 text-[#367c62]" aria-hidden="true" />
                    <h5 className="text-sm font-semibold text-[#263d39]">Recent transactions</h5>
                  </div>
                  {reviewResult.transactions && (
                    <span className="text-[10px] text-[#71817b]">{reviewResult.transactions.returnedCount} of {reviewResult.transactions.totalCount}</span>
                  )}
                </div>
                {reviewResult.transactionsNotice && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{reviewResult.transactionsNotice}</p>}
                <p className="mt-1 text-[11px] text-[#71817b]">
                  {reviewResult.transactions
                    ? `${formatDate(reviewResult.transactions.startDate)} — ${formatDate(reviewResult.transactions.endDate)} · Not saved or used for scoring`
                    : "Not saved or used for scoring"}
                </p>
                {reviewResult.transactions?.items.length ? (
                  <div className="mt-3 max-h-[390px] overflow-auto rounded-xl border border-[#dbe7e3]">
                    <ul className="divide-y divide-[#edf2ef]">
                      {reviewResult.transactions.items.map((transaction) => (
                        <li key={transaction.id} className="flex items-start justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#344a45]">{transaction.name || "Bank transaction"}</p>
                            <p className="mt-1 text-[10px] text-[#7a8a84]">{formatDate(transaction.date)}{transaction.category ? ` · ${transaction.category}` : ""}</p>
                          </div>
                          <span className={`shrink-0 text-xs font-semibold ${transaction.amount < 0 ? "text-[#8b5546]" : "text-[#367c62]"}`}>
                            {formatAmount(transaction.amount, transaction.currencyCode)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {reviewResult.transactions.truncated && <p className="border-t border-[#edf2ef] p-3 text-[10px] text-[#71817b]">Showing {reviewResult.transactions.returnedCount} of {reviewResult.transactions.totalCount} returned transactions.</p>}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-[#cbd9d3] p-4 text-xs leading-5 text-[#71817b]">No transaction activity was returned in this review.</p>
                )}
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#f2f6f4] p-3 text-[11px] leading-5 text-[#637770]">
                  <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  This is temporary review information, separate from your score and financial evidence.
                </div>
              </div>
            </div>
          </section>
        )}

        {refreshMutation.isSuccess && !reviewResult && (
          <p className="text-xs text-[#367c62]" role="status">Review closed. No transaction data was saved to your profile.</p>
        )}

        <details className="group border-t border-[#e5eeea] pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-[#60736e]">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#367c62]" aria-hidden="true" />How your connection works</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-3 space-y-2 text-xs leading-5 text-[#71817b]">
            <p>Your permission is required before Plaid opens. Account holder information is always reviewed before you choose whether to copy it into your editable profile.</p>
            <p>Transactions shown in the review are temporary, are not represented as score evidence and do not change scoring. You can remove a bank connection at any time.</p>
          </div>
        </details>
      </div>
    </section>
  );
}
