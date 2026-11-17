import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Check, CircleAlert, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import CushVerifyPublicFooter from "@/components/verify/CushVerifyPublicFooter";
import CushVerifyPublicNav from "@/components/verify/CushVerifyPublicNav";
import { CUSH_VERIFY_PRICING_FEATURES, type PublicCushVerifyPricingPlan, type CushVerifyPricingFaq } from "@shared/cush-verify-pricing";
import { CUSH_VERIFY_BILLING_EVENTS, CUSH_VERIFY_REPORT_CREDIT_RULE } from "@shared/cush-verify-billing";

type PricingCatalogResponse = {
  version: number;
  defaultCurrency: string;
  annualDiscountBps: number;
  publishedAt: string;
  availability: "pricing_preview" | "available";
  checkoutEnabled: boolean;
  faqs: CushVerifyPricingFaq[];
  plans: PublicCushVerifyPricingPlan[];
};

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const response = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (!response) return "We could not load the latest published pricing. Please retry shortly.";
  try {
    const body = JSON.parse(response) as { code?: string };
    if (body.code === "CUSH_VERIFY_PRICING_SCHEMA_MISSING") {
        return "Published pricing details are being prepared. You can still create an account and activate it by verifying your business email.";
    }
    return "We could not load the latest published pricing. Please retry shortly.";
  } catch {
    return "We could not load the latest published pricing. Please retry shortly.";
  }
}

function money(minor: number | null, currency: string) {
  if (minor === null) return "Custom";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function reportAllocation(plan: PublicCushVerifyPricingPlan) {
  if (plan.allocationMode === "sandbox") return "Sandbox-only plan configuration";
  const count = new Intl.NumberFormat("en-US").format(plan.includedReports);
  return plan.allocationMode === "minimum"
    ? `${count}+ reports / month`
    : `${count} reports / month`;
}

function planAction(plan: PublicCushVerifyPricingPlan) {
  if (plan.salesMode === "contact_sales") return "Discuss enterprise terms";
  if (plan.salesMode === "sandbox_only") return "Ask about sandbox access";
  return "Create institutional account";
}

function PricingCard({
  plan,
  annual,
  checkoutEnabled,
  annualDiscountBps,
}: {
  plan: PublicCushVerifyPricingPlan;
  annual: boolean;
  checkoutEnabled: boolean;
  annualDiscountBps: number;
}) {
  const amount = annual ? plan.annualTotalMinor : plan.monthlyPriceMinor;
  const hasAnnualPrice = annual && plan.annualTotalMinor !== null;
  const configuredFeatures = CUSH_VERIFY_PRICING_FEATURES.filter(({ key }) => plan.featureFlags[key]);
  const unavailableFeatures = CUSH_VERIFY_PRICING_FEATURES.filter(({ key }) => !plan.featureFlags[key]);
  const configuredApiLimits = Object.entries(plan.apiLimits).filter(([, value]) => value !== null);

  return (
    <article className={`flex h-full flex-col rounded-[24px] border p-5 shadow-[0_20px_50px_rgba(17,39,78,.06)] sm:p-6 ${
      plan.planKey === "growth"
        ? "border-[#3975df] bg-[#f8fbff] ring-1 ring-[#3975df]/15"
        : "border-[#dce5f1] bg-white"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3973c8]">
            {plan.salesMode === "contact_sales" ? "Tailored" : plan.salesMode === "sandbox_only" ? "Development" : "Institutional"}
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-[-0.035em] text-[#12213d]">{plan.name}</h2>
        </div>
        <span className="rounded-full border border-[#dce5f1] bg-[#f3f7fc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#52627b]">
          Preview
        </span>
      </div>

      <p className="mt-3 min-h-10 text-sm leading-5 text-[#52627b]">{plan.description}</p>

      <div className="mt-5 rounded-2xl bg-[#0c1830] p-4 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-100/65">
          {plan.salesMode === "contact_sales" ? "Pricing" : annual ? "Annual price" : "Monthly price"}
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
          {plan.salesMode === "contact_sales" ? "Custom" : money(amount, plan.currency)}
          {plan.salesMode !== "contact_sales" && (
            <span className="ml-1 text-xs font-medium tracking-normal text-blue-100/65">
              / {annual ? "year" : "month"}
            </span>
          )}
        </p>
        {hasAnnualPrice && plan.annualEffectiveMonthlyMinor !== null && (
          <p className="mt-1 text-xs text-blue-100/70">
            {money(plan.annualEffectiveMonthlyMinor, plan.currency)} equivalent per month
          </p>
        )}
        {annual && plan.annualSavingsMinor !== null && plan.annualSavingsMinor > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Save {money(plan.annualSavingsMinor, plan.currency)} ({annualDiscountBps / 100}%)
          </p>
        )}
        {plan.salesMode === "contact_sales" && (
          <p className="mt-2 text-xs text-blue-100/70">Negotiated contract prices are not shown.</p>
        )}
      </div>

      <dl className="mt-5 space-y-3 border-b border-[#e8edf4] pb-5 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#61728a]">{plan.allocationMode === "sandbox" ? "Access" : "Configured allocation"}</dt>
          <dd className="text-right font-semibold text-[#20304c]">{reportAllocation(plan)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#61728a]">Additional report rate</dt>
          <dd className="text-right font-semibold text-[#20304c]">
            {plan.additionalReportPriceMinor === null
              ? plan.salesMode === "contact_sales" ? "Negotiated" : "Not configured"
              : `${money(plan.additionalReportPriceMinor, plan.currency)} / report`}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#61728a]">Support</dt>
          <dd className="text-right font-semibold capitalize text-[#20304c]">
            {plan.supportLevel === "not_configured" ? "Not configured" : plan.supportLevel}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52627b]">Plan features</h3>
        {configuredFeatures.length ? (
          <ul className="mt-3 space-y-2">
            {configuredFeatures.map(({ key, label }) => (
              <li key={key} className="flex items-start gap-2 text-sm leading-5 text-[#40516d]">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16816f]" aria-hidden="true" />
                <span>{label}<span className="ml-1 text-xs text-[#75859d]">configured</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-[#d7dfeb] bg-[#f8fbff] p-3 text-xs leading-5 text-[#61728a]">
            No features are enabled for this plan in the published preview catalog.
          </p>
        )}
        {unavailableFeatures.length > 0 && (
          <details className="mt-3 rounded-xl border border-[#e6eaf0] px-3 py-2.5">
            <summary className="cursor-pointer text-xs font-semibold text-[#64748b]">
              Unavailable in this plan ({unavailableFeatures.length})
            </summary>
            <ul className="mt-2 space-y-1.5 pl-4 text-xs leading-5 text-[#75859d]">
              {unavailableFeatures.map(({ key, label }) => (
                <li key={key} className="list-disc">{label} — unavailable</li>
              ))}
            </ul>
          </details>
        )}
        {plan.featureFlags.apiAccess && (
          <div className="mt-3 rounded-xl bg-[#f3f7fc] p-3 text-xs leading-5 text-[#52627b]">
            <p className="font-semibold text-[#40516d]">Configured API limits</p>
            {configuredApiLimits.length ? (
              <ul className="mt-1 space-y-1">
                {configuredApiLimits.map(([key, value]) => (
                  <li key={key}>{key.replace(/([A-Z])/g, " $1").toLowerCase()}: {new Intl.NumberFormat("en-US").format(value!)}</li>
                ))}
              </ul>
            ) : <p className="mt-1">No API limits are configured yet.</p>}
          </div>
        )}
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-xl bg-[#fbf7e9] p-3 text-xs leading-5 text-[#655426]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#9a7936]" aria-hidden="true" />
        {plan.salesMode === "sandbox_only" && !checkoutEnabled
          ? "Sandbox access is not enabled yet."
          : !checkoutEnabled
            ? "This plan is not available to purchase yet."
            : "Plan availability depends on Cush approval."}
      </p>

      <Link
        href="/verify/apply"
        className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-4 text-sm font-semibold text-white transition hover:bg-[#275fb7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
      >
        {planAction(plan)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export default function CushVerifyPricing() {
  const [annual, setAnnual] = useState(false);
  const pricingQuery = useQuery<PricingCatalogResponse>({
    queryKey: ["/api/verify/pricing"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/verify/pricing");
      return response.json() as Promise<PricingCatalogResponse>;
    },
    retry: false,
  });

  const catalog = pricingQuery.data;
  const isPreview = catalog?.availability === "pricing_preview" || !catalog?.checkoutEnabled;

  return (
    <main className="min-h-[100dvh] bg-[#f3f7fc] text-[#14213a]">
      <CushVerifyPublicNav currentPage="pricing" />
      <section className="relative overflow-hidden bg-[#0c1830] text-white">
        <div className="pointer-events-none absolute -right-40 -top-44 h-[540px] w-[540px] rounded-full border border-blue-200/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-10 -top-20 h-[360px] w-[360px] rounded-full border border-emerald-200/10" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1320px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Cush Verify · Pricing</p>
          <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.7rem,6vw,5.5rem)] leading-[0.98] tracking-[-0.06em]">
            Clear pricing. <span className="text-[#79aaff]">A report is counted only when it is returned.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-blue-100/75 sm:text-lg">
            Plan allocations and prices are stored in Cush’s published pricing catalog. Searching for a profile or receiving consent does not use a report credit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/verify/apply" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white transition hover:bg-[#4b89f3]">
              Create an institutional account <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/verify/how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-blue-50 transition hover:bg-white/5">
              See how it works
            </Link>
            <Link href="/verify/api" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-blue-50 transition hover:bg-white/5">
              API access details
            </Link>
          </div>
        </div>
      </section>

      {isPreview && (
        <aside className="mx-auto mt-6 flex max-w-[1240px] items-start gap-3 rounded-2xl border border-[#d8d2b9] bg-[#fbf7e9] p-4 text-sm text-[#655426] sm:mt-8 sm:p-5" role="status">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9a7936]" aria-hidden="true" />
          <div>
            <p className="font-semibold">Pricing preview — not available to purchase</p>
            <p className="mt-1 leading-6">
              The configured prices and report allocations are not live. Checkout, subscriptions, report retrieval, and credit balances are not enabled yet. Account activation is separate from purchasing a plan.
            </p>
          </div>
        </aside>
      )}

      <section className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        {pricingQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading pricing catalog">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-[520px] animate-pulse rounded-[24px] border border-[#dce5f1] bg-white" />)}
          </div>
        ) : pricingQuery.isError || !catalog ? (
          <section className="rounded-2xl border border-[#e5c9b9] bg-[#fffaf7] p-6" role="alert">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" />
              <div>
                <h2 className="font-semibold text-[#5b3226]">Pricing is temporarily unavailable</h2>
                <p className="mt-1 text-sm leading-6 text-[#79594c]">{getErrorMessage(pricingQuery.error)}</p>
                <button type="button" onClick={() => pricingQuery.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#d9b6a5] bg-white px-3 py-2 text-sm font-semibold text-[#70402f]">
                  <RefreshCw className="h-4 w-4" /> Retry
                </button>
                <Link href="/verify/apply" className="ml-3 inline-flex min-h-10 items-center gap-1.5 px-2 text-sm font-semibold text-[#275fb7] hover:underline">
                  Create an account <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Published catalog · Version {catalog.version}</p>
                <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#12213d] sm:text-4xl">Choose a plan to discuss</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52627b]">
                  Annual totals and savings below are calculated from the published catalog’s {catalog.annualDiscountBps / 100}% discount.
                </p>
              </div>
              <div className="inline-flex w-fit rounded-full border border-[#dce5f1] bg-white p-1 shadow-sm" role="group" aria-label="Choose billing period">
                <button
                  type="button"
                  onClick={() => setAnnual(false)}
                  aria-pressed={!annual}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!annual ? "bg-[#0c1830] text-white" : "text-[#52627b] hover:bg-[#f3f7fc]"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setAnnual(true)}
                  aria-pressed={annual}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${annual ? "bg-[#0c1830] text-white" : "text-[#52627b] hover:bg-[#f3f7fc]"}`}
                >
                  Annual
                </button>
              </div>
            </div>

            {annual && catalog.annualDiscountBps > 0 && (
              <p className="mt-4 text-xs font-medium text-[#28685c]">
                Annual savings are calculated from the published discount. Enterprise contract prices remain confidential and are not displayed.
              </p>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {catalog.plans.map((plan) => (
                <PricingCard
                  key={plan.planKey}
                  plan={plan}
                  annual={annual}
                  checkoutEnabled={catalog.checkoutEnabled}
                  annualDiscountBps={catalog.annualDiscountBps}
                />
              ))}
            </div>

            <section className="mt-10 grid gap-5 rounded-[24px] border border-[#dce5f1] bg-white p-5 sm:p-7 lg:grid-cols-[.65fr_1.35fr] lg:gap-10">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3973c8]">Report-credit rules</p>
                <h2 className="mt-2 font-serif text-2xl tracking-[-0.035em] text-[#12213d]">Only a returned report counts.</h2>
                <p className="mt-3 text-sm leading-6 text-[#52627b]">
                  {CUSH_VERIFY_REPORT_CREDIT_RULE} These billing rules describe the planned model; credit balances are not active.
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {CUSH_VERIFY_BILLING_EVENTS.filter((rule) => rule.category !== "report_credit").map((rule) => (
                  <li key={rule.event} className="flex items-start gap-2 rounded-xl bg-[#f3f7fc] p-3 text-xs leading-5 text-[#40516d]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16816f]" aria-hidden="true" />
                    <span>{rule.event}: <strong>{rule.treatment}</strong></span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </section>

      {catalog && (
        <section className="border-y border-[#dce5f1] bg-white">
          <div className="mx-auto max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Questions</p>
              <h2 className="mt-3 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Pricing and report credits</h2>
            </div>
            {catalog.faqs.length ? (
              <div className="mt-7 divide-y divide-[#e6ecf3] border-y border-[#e6ecf3]">
                {catalog.faqs.map((faq, index) => (
                  <details key={`${index}-${faq.question}`} className="group py-4">
                    <summary className="cursor-pointer list-none pr-8 text-sm font-semibold text-[#20304c] marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3973c8]">
                      <span className="flex items-start justify-between gap-4">
                        {faq.question}
                        <span className="text-lg leading-none text-[#3973c8] transition group-open:rotate-45" aria-hidden="true">+</span>
                      </span>
                    </summary>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#52627b]">{faq.answer}</p>
                  </details>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[#61728a]">Pricing FAQs have not been published yet.</p>
            )}
          </div>
        </section>
      )}

      <section className="bg-[#eaf1fb] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex max-w-[1100px] flex-col justify-between gap-5 rounded-[24px] border border-[#d4dfed] bg-white p-6 shadow-[0_12px_35px_rgba(28,59,107,.05)] sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-serif text-2xl tracking-[-0.035em] text-[#12213d]">Open your institutional account</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52627b]">Verify your business email to activate your account. No staff approval or invitation is required.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/verify/apply" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#275fb7]">Create account</Link>
            <Link href="/verify/login" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#cad7e8] px-5 text-sm font-semibold text-[#275fb7] hover:bg-[#f8fbff]">Institutional sign in</Link>
          </div>
        </div>
      </section>
      <CushVerifyPublicFooter />
    </main>
  );
}
