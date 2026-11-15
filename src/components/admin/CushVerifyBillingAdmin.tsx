import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, Loader2, RefreshCw, RotateCcw, WalletCards } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type InstitutionBilling = {
  id: number;
  name: string;
  institutionStatus: string;
  availableCredits: number;
  hasStripeCustomer: boolean;
  planKey: string | null;
  subscriptionStatus: string | null;
  subscriptionUpdatedAt: string | null;
};

type LedgerEntry = {
  id: number;
  type: string;
  creditDelta: number;
  amountMinor: number | null;
  currency: string | null;
  createdAt: string;
  details: Record<string, unknown> | null;
};

function explainError(error: unknown) {
  const raw = error instanceof Error ? error.message : "The request could not be completed.";
  const match = raw.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (match) {
    try {
      const payload = JSON.parse(match) as { error?: string };
      return payload.error || raw;
    } catch {
      return raw;
    }
  }
  return raw;
}

function entryLabel(type: string) {
  const labels: Record<string, string> = {
    allocation: "Plan credit allocation",
    report_debit: "Authorized report",
    overage: "Report overage",
    rollover: "Credit rollover",
    promotional_credit: "Promotional credit",
    reversal: "Reversal",
    admin_adjustment: "Admin adjustment",
    expiration: "Credit expiration",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export default function CushVerifyBillingAdmin({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [creditDelta, setCreditDelta] = useState("1");
  const [kind, setKind] = useState<"promotional_credit" | "admin_adjustment">("promotional_credit");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  const institutionsQuery = useQuery<{ institutions: InstitutionBilling[] }>({
    queryKey: ["/api/admin/verify/billing/institutions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/verify/billing/institutions");
      return response.json();
    },
    retry: false,
  });
  const institutions = institutionsQuery.data?.institutions ?? [];
  const selected = useMemo(
    () => institutions.find((institution) => String(institution.id) === selectedId) ?? null,
    [institutions, selectedId],
  );
  const ledgerQuery = useQuery<{ availableCredits: number; ledger: LedgerEntry[] }>({
    queryKey: ["/api/admin/verify/billing/institutions", selectedId, "ledger"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/verify/billing/institutions/${selectedId}/ledger`);
      return response.json();
    },
    enabled: Boolean(selectedId),
    retry: false,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/admin/verify/billing/institutions"] });
    if (selectedId) {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/verify/billing/institutions", selectedId, "ledger"] });
    }
  };
  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("Select an organisation first.");
      if (!crypto?.randomUUID) throw new Error("This browser cannot create a secure request identifier.");
      const response = await apiRequest(
        "POST",
        `/api/admin/verify/billing/institutions/${selectedId}/adjustments`,
        {
          requestId: crypto.randomUUID(),
          kind,
          creditDelta: Number(creditDelta),
          reason,
        },
      );
      return response.json() as Promise<{ availableCredits: number }>;
    },
    onSuccess: (result) => {
      setMessage(`Adjustment recorded. New balance: ${result.availableCredits} credits.`);
      setReason("");
      refresh();
    },
    onError: (error) => setMessage(explainError(error)),
  });
  const reversalMutation = useMutation({
    mutationFn: async ({ id, reasonText }: { id: number; reasonText: string }) => {
      const response = await apiRequest("POST", `/api/admin/verify/billing/ledger/${id}/reverse`, {
        reason: reasonText,
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("Ledger reversal recorded.");
      refresh();
    },
    onError: (error) => setMessage(explainError(error)),
  });

  if (institutionsQuery.isLoading) {
    return <div className="rounded-2xl border border-[#e4e1d8] bg-[#fbfaf6] p-6 text-sm text-[#777973]">Loading institutional billing…</div>;
  }
  if (institutionsQuery.isError) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="flex items-center gap-2 font-semibold text-amber-950"><AlertTriangle className="h-4 w-4" /> Billing data unavailable</p>
        <p className="mt-2 text-sm text-amber-900">{explainError(institutionsQuery.error)}</p>
        <button onClick={() => void institutionsQuery.refetch()} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-950 underline"><RefreshCw className="h-4 w-4" /> Retry</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="cush-verify-billing-admin-heading" className="space-y-5">
      <header className="rounded-2xl bg-[#29266f] p-6 text-white sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#c7c5ee]">Cush Verify · Admin</p>
        <h1 id="cush-verify-billing-admin-heading" className="mt-2 text-2xl font-semibold tracking-tight">Institution billing</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#e3e2f5]">
          Review organisation balances and immutable credit history. Manual changes are written to the audit log.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] p-4">
        <label className="min-w-[240px] flex-1 text-xs font-semibold text-[#565950]">
          Select organisation
          <select
            value={selectedId}
            onChange={(event) => { setSelectedId(event.target.value); setMessage(""); }}
            className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#d9d7ce] bg-white px-3 text-sm font-medium text-[#24252a]"
          >
            <option value="">Choose an institution</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>{institution.name} · #{institution.id}</option>
            ))}
          </select>
        </label>
        <button onClick={refresh} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d9d7ce] bg-white px-3 text-sm font-semibold text-[#484a47]">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {selected && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] p-4">
              <div className="flex items-center gap-2 text-xs text-[#777973]"><WalletCards className="h-4 w-4" /> Available credits</div>
              <p className="mt-2 text-2xl font-semibold text-[#24252a]">{ledgerQuery.data?.availableCredits ?? selected.availableCredits}</p>
            </article>
            <article className="rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] p-4">
              <div className="flex items-center gap-2 text-xs text-[#777973]"><CreditCard className="h-4 w-4" /> Subscription</div>
              <p className="mt-2 text-lg font-semibold text-[#24252a]">{selected.planKey ?? "No plan"}</p>
              <p className="mt-1 text-xs text-[#777973]">{selected.subscriptionStatus ?? "No subscription"}</p>
            </article>
            <article className="rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] p-4">
              <p className="text-xs text-[#777973]">Organisation status</p>
              <p className="mt-2 text-lg font-semibold text-[#24252a]">{selected.institutionStatus}</p>
              <p className="mt-1 text-xs text-[#777973]">{selected.hasStripeCustomer ? "Stripe customer linked" : "No Stripe customer yet"}</p>
            </article>
          </div>

          {canManage && (
            <form
              className="grid gap-3 rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] p-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage("");
                adjustmentMutation.mutate();
              }}
            >
              <div className="sm:col-span-2">
                <h2 className="font-semibold text-[#24252a]">Add or adjust credits</h2>
                <p className="mt-1 text-xs text-[#777973]">This does not change Stripe payment records. Use a reversal for a ledger mistake.</p>
              </div>
              <label className="text-xs font-semibold text-[#565950]">
                Entry type
                <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="mt-1.5 block min-h-10 w-full rounded-lg border border-[#d9d7ce] bg-white px-3 text-sm font-normal">
                  <option value="promotional_credit">Promotional credit</option>
                  <option value="admin_adjustment">Admin adjustment</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-[#565950]">
                Credit change
                <input type="number" min={kind === "promotional_credit" ? 1 : -1000000} max="1000000" step="1" required value={creditDelta} onChange={(event) => setCreditDelta(event.target.value)} className="mt-1.5 block min-h-10 w-full rounded-lg border border-[#d9d7ce] bg-white px-3 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-[#565950] sm:col-span-2">
                Reason for the audit record
                <input minLength={10} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 block min-h-10 w-full rounded-lg border border-[#d9d7ce] bg-white px-3 text-sm font-normal" placeholder="At least 10 characters" />
              </label>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button type="submit" disabled={adjustmentMutation.isPending || !reason.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#29266f] px-4 text-sm font-semibold text-white disabled:opacity-50">
                  {adjustmentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Record adjustment
                </button>
                {message && <p role="status" className="text-xs text-[#565950]">{message}</p>}
              </div>
            </form>
          )}

          <section className="overflow-hidden rounded-xl border border-[#e4e1d8] bg-[#fbfaf6]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e4e1d8] px-4 py-3">
              <div>
                <h2 className="font-semibold text-[#24252a]">Credit ledger</h2>
                <p className="mt-0.5 text-xs text-[#777973]">Most recent 100 entries</p>
              </div>
              {ledgerQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-[#777973]" />}
            </div>
            {ledgerQuery.isError ? (
              <p className="p-4 text-sm text-amber-900">{explainError(ledgerQuery.error)}</p>
            ) : (ledgerQuery.data?.ledger.length ?? 0) === 0 ? (
              <p className="p-4 text-sm text-[#777973]">No credit entries found.</p>
            ) : (
              <div className="divide-y divide-[#e9e7df]">
                {ledgerQuery.data!.ledger.map((entry) => {
                  const canReverse = canManage && entry.type !== "reversal" && entry.amountMinor === null;
                  return (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#30312d]">{entryLabel(entry.type)}</p>
                        <p className="mt-0.5 text-xs text-[#777973]">
                          {new Date(entry.createdAt).toLocaleString()} · {typeof entry.details?.reason === "string" ? entry.details.reason : `Ledger entry #${entry.id}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {entry.amountMinor !== null && entry.currency && entry.amountMinor !== 0 && (
                          <span className="text-xs font-medium text-[#777973]">{formatMoney(entry.amountMinor, entry.currency)}</span>
                        )}
                        <span className={`text-sm font-semibold ${entry.creditDelta < 0 ? "text-[#555750]" : "text-emerald-800"}`}>
                          {entry.creditDelta > 0 ? "+" : ""}{entry.creditDelta}
                        </span>
                        {canReverse && (
                          <button
                            type="button"
                            disabled={reversalMutation.isPending}
                            onClick={() => {
                              const reasonText = window.prompt("Enter a reason for reversing this ledger entry (at least 10 characters):");
                              if (!reasonText || reasonText.trim().length < 10) return;
                              reversalMutation.mutate({ id: entry.id, reasonText });
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-[#d9d7ce] bg-white px-2 py-1 text-xs font-semibold text-[#565950] disabled:opacity-50"
                          >
                            {reversalMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                            Reverse
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          {message && !canManage && <p role="status" className="text-sm text-[#565950]">{message}</p>}
        </>
      )}
    </section>
  );
}
