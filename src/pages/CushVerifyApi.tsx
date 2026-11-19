import { ArrowRight, BookOpen, CircleAlert, Code2, FileCheck2, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "wouter";
import CushVerifyPublicFooter from "@/components/verify/CushVerifyPublicFooter";
import CushVerifyPublicNav from "@/components/verify/CushVerifyPublicNav";
import { CUSH_VERIFY_BILLING_EVENTS, CUSH_VERIFY_REPORT_CREDIT_RULE } from "@shared/cush-verify-billing";

const readiness = [
  {
    number: "01",
    title: "Approved institution",
    text: "API credentials are available only to active institutional accounts with approved organisation status.",
    icon: FileCheck2,
  },
  {
    number: "02",
    title: "Consent-led requests",
    text: "Financial identity reports are intended for authorized requests with the customer’s consent. Consent is a prerequisite, not a report.",
    icon: LockKeyhole,
  },
  {
    number: "03",
    title: "Reviewed, plan-based access",
    text: "Production keys require Cush approval of an API access request and an active subscription whose published plan includes API access and limits.",
    icon: Code2,
  },
];

export default function CushVerifyApi() {
  return (
    <main className="min-h-[100dvh] bg-[#f3f7fc] text-[#14213a]">
      <CushVerifyPublicNav currentPage="api" />

      <section className="relative overflow-hidden bg-[#0c1830] text-white">
        <div className="pointer-events-none absolute -right-40 -top-44 h-[540px] w-[540px] rounded-full border border-blue-200/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-8 -top-20 h-[360px] w-[360px] rounded-full border border-emerald-200/10" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1320px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Cush Verify · API</p>
            <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.7rem,6vw,5.5rem)] leading-[0.98] tracking-[-0.06em]">
              Integrate with care. <span className="text-[#79aaff]">Consent comes first.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-blue-100/75 sm:text-lg">
              Cush Verify’s institutional API is in controlled rollout. Production requests are designed to enforce organisation approval, Cush review of API access, individual consent, category scope, expiry, and report-credit rules.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/verify/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white transition hover:bg-[#4b89f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">
                Institutional sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/verify/how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-blue-50 transition hover:bg-white/5">
                Review the consent process
              </Link>
              <Link href="/verify/api-reference" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-blue-50 transition hover:bg-white/5">
                <BookOpen className="h-4 w-4" /> API reference
              </Link>
            </div>
          </div>

          <aside className="rounded-[24px] border border-white/15 bg-[#142746]/85 p-5 shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#153d48] text-emerald-200">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-emerald-300">Integration status</p>
                <h2 className="mt-2 font-serif text-2xl leading-tight tracking-[-0.03em]">API access is being prepared for controlled activation.</h2>
              </div>
            </div>
            <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-blue-100/75">
              The institutional workspace includes separate sandbox and production key controls. Full key values are shown once and only hashes are stored. Production access requires an approved organisation, an approved API access request, and an active plan that includes API access.
            </p>
            <p className="mt-4 rounded-xl bg-[#0c1830]/70 px-4 py-3 text-xs leading-5 text-blue-100/70">
              Sandbox workflows use synthetic outcomes only. They do not query Passport, send consent emails, or change report credits. Staging verification is required before these integrations are presented as ready for live use.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Before integration</p>
            <h2 className="mt-3 font-serif text-3xl tracking-[-0.04em] text-[#12213d] sm:text-4xl">Access follows organisation and plan status.</h2>
            <p className="mt-4 text-sm leading-6 text-[#52627b]">
              API key management is available only after institutional account activation. Production access additionally checks the active subscription’s API feature and configured request limits; sandbox keys remain isolated from real customer records.
            </p>
            <Link href="/verify/apply" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#275fb7] hover:text-[#153d7e]">
              Apply for institutional access <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {readiness.map(({ number, title, text, icon: Icon }) => (
              <li key={number} className="rounded-[20px] border border-[#dce5f1] bg-white p-5 shadow-[0_12px_35px_rgba(18,39,76,.05)]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-[0.15em] text-[#3973c8]">{number}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-xl leading-tight tracking-[-0.03em] text-[#12213d]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#52627b]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-[#dce5f1] bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[.72fr_1.28fr] lg:gap-16 lg:px-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Report credits</p>
            <h2 className="mt-3 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">One successful, authorized full report.</h2>
            <p className="mt-4 text-sm leading-6 text-[#52627b]">
              {CUSH_VERIFY_REPORT_CREDIT_RULE} Dashboard and production API report retrieval share the same idempotent delivery and credit ledger.
            </p>
            <Link href="/verify/pricing" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#275fb7] hover:text-[#153d7e]">
              View the published pricing catalog <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-[#dce5f1]">
            <div className="flex items-center gap-3 bg-[#f8fbff] px-5 py-4 sm:px-6">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e3f4ef] text-[#16816f]"><WalletCards className="h-4 w-4" aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-semibold text-[#20304c]">How the planned credit rule works</p>
                <p className="text-xs text-[#71819b]">No charge unless Cush returns the authorized full report.</p>
              </div>
            </div>
            <ul className="divide-y divide-[#e8edf4] bg-white">
              {CUSH_VERIFY_BILLING_EVENTS.map((rule) => {
                const billable = rule.category === "report_credit";
                return (
                  <li key={rule.event} className={`grid gap-1 px-5 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:px-6 ${billable ? "bg-[#f0f8f5]" : ""}`}>
                    <span className={`text-sm leading-5 ${billable ? "font-semibold text-[#183f35]" : "text-[#40516d]"}`}>{rule.event}</span>
                    <span className={`text-xs font-semibold ${billable ? "text-[#16816f]" : "text-[#61728a]"}`}>{rule.treatment}</span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-[#e8edf4] bg-[#f8fbff] px-5 py-3 text-xs leading-5 text-[#61728a] sm:px-6">
              Individual endpoint retrievals included in a full report do not double-charge.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <div className="rounded-[24px] bg-[#eaf1fb] p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Plan for readiness</p>
            <h2 className="mt-3 font-serif text-2xl tracking-[-0.035em] text-[#12213d]">Start in the sandbox.</h2>
            <p className="mt-3 text-sm leading-6 text-[#52627b]">Once your organisation is active, an administrator can create a sandbox key and try simulated discovery, consent, report, failure, and rate-limit outcomes.</p>
            <Link href="/verify/apply" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white transition hover:bg-[#275fb7]">
              Apply for institutional access <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <aside className="rounded-[24px] border border-[#dce5f1] bg-white p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fbf7e9] text-[#9a7936]"><CircleAlert className="h-4 w-4" aria-hidden="true" /></span>
              <div>
                <h2 className="font-serif text-2xl tracking-[-0.035em] text-[#12213d]">A note on availability</h2>
                <p className="mt-3 text-sm leading-6 text-[#52627b]">
                  Published plan details describe available features and limits. Creating an institutional enquiry does not activate an account, create a subscription, or grant production API access. Production keys require an approved organisation, Cush approval of an API access request, and an active subscription whose plan includes API access.
                </p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                  <Link href="/verify/pricing" className="text-[#275fb7] hover:underline">Published pricing</Link>
                  <Link href="/verify/how-it-works" className="text-[#275fb7] hover:underline">Consent process</Link>
                  <Link href="/verify/login" className="text-[#275fb7] hover:underline">Institutional sign in</Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <CushVerifyPublicFooter />
    </main>
  );
}
