import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, ArrowUpRight, CreditCard, LoaderCircle, ReceiptText, RefreshCw, WalletCards } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";

type BillingEntry = {
  id: number;
  type: string;
  creditDelta: number;
  amountMinor: number | null;
  currency: string | null;
  createdAt: string;
};

type BillingPlan = {
  planKey: string;
  name: string;
  description: string;
  currency: string;
  monthlyPriceMinor: number | null;
  annualPriceMinor: number | null;
  includedReports: number;
  additionalReportPriceMinor: number | null;
  salesMode: string;
  checkoutReady: boolean;
};

type BillingSummary = {
  institution: { id: number; name: string };
  billingConfigured: boolean;
  stripeMode: "test" | "live" | "unconfigured";
  subscription: null | {
    planKey: string;
    planName: string;
    status: string;
    interval: "monthly" | "annual";
    currency: string;
    unitAmountMinor: number;
    includedReports: number;
    additionalReportPriceMinor: number | null;
    currentPeriodStartAt: string;
    currentPeriodEndAt: string;
    cancelAtPeriodEnd: boolean;
    graceEndsAt: string | null;
  };
  credits: {
    available: number;
    usedThisPeriod: number;
    periodStartAt: string | null;
    periodEndAt: string | null;
  };
  plans: BillingPlan[];
  ledger: BillingEntry[];
};

function formatMoney(amountMinor: number | null, currency: string) {
  if (amountMinor === null) return "Contact Cush";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function friendlyEntryType(value: string) {
  const labels: Record<string, string> = {
    allocation: "Plan credit allocation",
    report_debit: "Authorized report",
    overage: "Report overage",
    rollover: "Unused credits carried forward",
    promotional_credit: "Promotional credits",
    reversal: "Reversal",
    admin_adjustment: "Admin adjustment",
    expiration: "Credit expiration",
  };
  return labels[value] ?? "Billing activity";
}

async function requestJson<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || "Billing request could not be completed.");
  }
  return payload as T;
}

function BillingAction({
  label,
  path,
  body,
  disabled,
}: {
  label: string;
  path: string;
  body?: unknown;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      const result = await requestJson<{ url: string }>(path, "POST", body);
      window.location.assign(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Billing could not be opened.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void start()}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0c1830] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
        {label}
      </button>
      {error && <p role="alert" className="mt-2 max-w-sm text-xs text-rose-700">{error}</p>}
    </div>
  );
}

export default function CushVerifyBillingWorkspace({
  role,
  onRefresh,
}: {
  role: string;
  onRefresh?: () => void;
}) {
  const billingQuery = useQuery<BillingSummary>({
    queryKey: ["/api/verify/billing"],
    queryFn: () => requestJson<BillingSummary>("/api/verify/billing"),
    retry: false,
    staleTime: 30_000,
  });

  if (billingQuery.isLoading) {
    return <div className="mt-5 flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading billing information…</div>;
  }
  if (billingQuery.isError) {
    return (
      <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{billingQuery.error instanceof Error ? billingQuery.error.message : "Billing information is unavailable."}</span>
        <button onClick={() => void billingQuery.refetch()} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold underline"><RefreshCw className="h-3 w-3" /> Retry</button>
      </div>
    );
  }

  const data = billingQuery.data!;
  const isAdmin = role === "organisation_admin";
  const status = data.subscription?.status ?? "no subscription";
  const statusStyle = status === "active" || status === "trialing"
    ? "bg-emerald-50 text-emerald-800"
    : status === "past_due"
      ? "bg-amber-50 text-amber-800"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="mt-5 space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4">
          <div className="flex items-center gap-2 text-xs text-[#61728a]"><WalletCards className="h-4 w-4" /> Available report credits</div>
          <p className="mt-3 text-3xl font-semibold text-[#12213d]">{data.credits.available}</p>
        </article>
        <article className="rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4">
          <div className="flex items-center gap-2 text-xs text-[#61728a]"><ReceiptText className="h-4 w-4" /> Reports used this period</div>
          <p className="mt-3 text-3xl font-semibold text-[#12213d]">{data.credits.usedThisPeriod}</p>
          <p className="mt-1 text-[11px] text-[#71819b]">{formatDate(data.credits.periodStartAt)} – {formatDate(data.credits.periodEndAt)}</p>
        </article>
        <article className="rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4">
          <div className="flex items-center gap-2 text-xs text-[#61728a]"><CreditCard className="h-4 w-4" /> Subscription</div>
          <p className="mt-3 text-lg font-semibold text-[#12213d]">{data.subscription?.planName ?? "No active plan"}</p>
          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>{status.replace(/_/g, " ")}</span>
        </article>
      </section>

      {!data.billingConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Online billing is not enabled in this environment. No payment will be collected until Cush configures and verifies the Stripe credentials and webhook.
          </p>
        </div>
      )}

      {data.subscription && (
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#12213d]">Current subscription</h3>
              <p className="mt-1 text-sm text-slate-600">
                {formatMoney(data.subscription.unitAmountMinor, data.subscription.currency)} per {data.subscription.interval === "annual" ? "year" : "month"} · {data.subscription.includedReports} report credits per allocation
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Period ends {formatDate(data.subscription.currentPeriodEndAt)}
                {data.subscription.cancelAtPeriodEnd ? " · Cancellation scheduled" : ""}
                {data.subscription.graceEndsAt ? ` · Payment grace ends ${formatDate(data.subscription.graceEndsAt)}` : ""}
              </p>
            </div>
            {isAdmin && data.billingConfigured && (
              <BillingAction label="Manage billing" path="/api/verify/billing/portal" />
            )}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Unused report credits carry forward. A unique authorized report uses one credit; the same report retrieved again for a technical retry is not charged twice.
          </p>
        </section>
      )}

      {data.plans.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#12213d]">{data.subscription ? "Available plans" : "Choose a plan"}</h3>
              <p className="mt-1 text-xs text-slate-500">Online checkout appears only after Cush configures the matching Stripe price.</p>
            </div>
            <button onClick={() => { void billingQuery.refetch(); onRefresh?.(); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#245fce] hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.plans.filter((plan) => plan.salesMode !== "sandbox_only").map((plan) => (
              <article key={plan.planKey} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-[#12213d]">{plan.name}</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{plan.description}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-800">{plan.includedReports} reports</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-[#12213d]">{formatMoney(plan.monthlyPriceMinor, plan.currency)} / month</p>
                {plan.annualPriceMinor !== null && <p className="mt-1 text-xs text-slate-500">{formatMoney(plan.annualPriceMinor, plan.currency)} / year</p>}
                {plan.additionalReportPriceMinor !== null && (
                  <p className="mt-2 text-xs text-slate-500">Additional report: {formatMoney(plan.additionalReportPriceMinor, plan.currency)}</p>
                )}
                {plan.salesMode === "contact_sales" ? (
                  <p className="mt-3 text-xs text-slate-500">Contact Cush to agree institutional terms.</p>
                ) : isAdmin ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <BillingAction
                      label="Subscribe monthly"
                      path="/api/verify/billing/checkout"
                      body={{ planKey: plan.planKey, interval: "monthly" }}
                      disabled={!plan.checkoutReady}
                    />
                    <BillingAction
                      label="Subscribe annually"
                      path="/api/verify/billing/checkout"
                      body={{ planKey: plan.planKey, interval: "annual" }}
                      disabled={!plan.checkoutReady}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Ask your organisation administrator to change the plan.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-[#3973c8]" />
          <h3 className="font-semibold text-[#12213d]">Billing activity</h3>
        </div>
        {data.ledger.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No billing activity has been recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            {data.ledger.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{friendlyEntryType(entry.type)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${entry.creditDelta < 0 ? "text-slate-800" : "text-emerald-800"}`}>
                    {entry.creditDelta > 0 ? "+" : ""}{entry.creditDelta} credits
                  </p>
                  {entry.amountMinor !== null && entry.amountMinor !== 0 && entry.currency && (
                    <p className="text-xs text-slate-500">{formatMoney(entry.amountMinor, entry.currency)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
