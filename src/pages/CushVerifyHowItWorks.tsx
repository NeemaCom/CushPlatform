import { ArrowRight, Check, CircleAlert, FileCheck2, Fingerprint, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import CushVerifyPublicFooter from "@/components/verify/CushVerifyPublicFooter";
import CushVerifyPublicNav from "@/components/verify/CushVerifyPublicNav";
import { CUSH_VERIFY_BILLING_EVENTS, CUSH_VERIFY_REPORT_CREDIT_RULE } from "@shared/cush-verify-billing";

const onboardingSteps = [
  {
    number: "01",
    title: "Submit your institution",
    description: "Share your organisation’s official details and intended use through the existing application form.",
    icon: FileCheck2,
  },
  {
    number: "02",
    title: "Cush reviews the application",
    description: "Enquiry approval does not grant access. Cush explicitly creates the organisation and invites a named contact.",
    icon: ShieldCheck,
  },
  {
    number: "03",
    title: "Verify your official email",
    description: "The invited person creates an email-and-password account and confirms ownership of their official email address.",
    icon: Fingerprint,
  },
  {
    number: "04",
    title: "Receive final approval",
    description: "The institution remains pending until Cush Admin approves it. Only approved institutional accounts can access the workspace.",
    icon: LockKeyhole,
  },
];

export default function CushVerifyHowItWorks() {
  return (
    <main className="min-h-[100dvh] bg-[#f3f7fc] text-[#14213a]">
      <CushVerifyPublicNav currentPage="how-it-works" />

      <section className="relative overflow-hidden bg-[#0c1830] text-white">
        <div className="pointer-events-none absolute -right-36 -top-44 h-[520px] w-[520px] rounded-full border border-blue-200/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-6 -top-20 h-[340px] w-[340px] rounded-full border border-emerald-200/10" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1320px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-end lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Cush Verify · How it works</p>
            <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.7rem,6vw,5.5rem)] leading-[0.98] tracking-[-0.06em]">
              Consent first. <span className="text-[#79aaff]">A credit only after a report is returned.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-blue-100/75 sm:text-lg">
              Cush Verify is designed for authorised, consent-led financial identity requests. Institution applications and report access follow separate review steps.
            </p>
          </div>
          <aside className="rounded-[24px] border border-white/15 bg-[#142746]/85 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#153d48] text-emerald-200">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-emerald-300">The billing rule</p>
                <h2 className="mt-2 font-serif text-2xl leading-tight tracking-[-0.03em]">A successful return is the billable event.</h2>
                <p className="mt-3 text-sm leading-6 text-blue-100/70">Searching, requesting consent, receiving consent, failed requests, and technical retries do not use a report credit.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <aside className="mx-auto mt-6 flex max-w-[1240px] items-start gap-3 rounded-2xl border border-[#d8d2b9] bg-[#fbf7e9] p-4 text-sm text-[#655426] sm:mt-8 sm:p-5" role="status">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9a7936]" aria-hidden="true" />
        <div>
          <p className="font-semibold">The reporting and billing flow is not active yet</p>
          <p className="mt-1 leading-6">
            The steps below explain Cush’s intended rules. Report retrieval, subscriptions, payments, and report-credit balances are not currently available.
          </p>
        </div>
      </aside>

      <section className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Institution onboarding</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.04em] text-[#12213d] sm:text-4xl">A request for access is not access.</h2>
          <p className="mt-4 text-sm leading-6 text-[#52627b]">
            Institutional accounts use a separate sign-in from Cush Passport. Every organisation and named member is reviewed before institutional access is granted.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {onboardingSteps.map(({ number, title, description, icon: Icon }) => (
            <li key={number} className="rounded-[20px] border border-[#dce5f1] bg-white p-5 shadow-[0_12px_35px_rgba(18,39,76,.05)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs tracking-[0.15em] text-[#3973c8]">{number}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <h3 className="mt-6 font-serif text-xl leading-tight tracking-[-0.03em] text-[#12213d]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#52627b]">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-[#dce5f1] bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[.72fr_1.28fr] lg:gap-16 lg:px-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Consent and evidence</p>
            <h2 className="mt-3 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">The customer stays in control.</h2>
            <p className="mt-4 text-sm leading-6 text-[#52627b]">
              An institution must have approval before making a request. The customer’s consent is required before a report can be retrieved. A customer can decline without a charge.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Search is free", text: "A profile search, including a search that finds no profile, is not billable." },
              { title: "Consent is separate", text: "Successfully obtaining consent is not a report and does not use a credit by itself." },
              { title: "Evidence status is explicit", text: "The intended workspace will distinguish consent and evidence status. A request must not imply evidence exists when it does not." },
              { title: "No consent, no report", text: "If the customer declines, the process stops and the event remains free." },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#e1e8f1] bg-[#f8fbff] p-5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e3f4ef] text-[#16816f]"><Check className="h-4 w-4" aria-hidden="true" /></span>
                <h3 className="mt-4 text-sm font-semibold text-[#20304c]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#52627b]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Report-credit treatment</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.04em] text-[#12213d] sm:text-4xl">What counts—and what does not.</h2>
          <p className="mt-4 text-sm leading-6 text-[#52627b]">
            {CUSH_VERIFY_REPORT_CREDIT_RULE} The published pricing preview contains the plan allocations and overage rates; it does not currently deduct credits.
          </p>
        </div>

        <div className="mt-7 overflow-hidden rounded-[22px] border border-[#dce5f1] bg-white shadow-[0_15px_45px_rgba(18,39,76,.05)]">
          <div className="hidden grid-cols-[1.1fr_.9fr] gap-6 border-b border-[#e4eaf2] bg-[#f8fbff] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#71819b] sm:grid sm:px-7">
            <span>Event</span><span>Billing treatment</span>
          </div>
          <ul className="divide-y divide-[#e8edf4]">
            {CUSH_VERIFY_BILLING_EVENTS.map((rule, index) => (
              <li key={rule.event} className={`grid gap-1 px-5 py-4 sm:grid-cols-[1.1fr_.9fr] sm:gap-6 sm:px-7 ${
                index === 4 ? "bg-[#f0f8f5]" : ""
              }`}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9ab0] sm:hidden">Event</span>
                <span className={`text-sm leading-6 ${index === 4 ? "font-semibold text-[#183f35]" : "text-[#40516d]"}`}>{rule.event}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9ab0] sm:hidden">Billing treatment</span>
                <span className={`text-sm leading-6 ${index === 4 ? "font-semibold text-[#16816f]" : "font-medium text-[#52627b]"}`}>{rule.treatment}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#eaf1fb] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex max-w-[1100px] flex-col justify-between gap-5 rounded-[24px] border border-[#d4dfed] bg-white p-6 shadow-[0_12px_35px_rgba(28,59,107,.05)] sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3973c8]">Cush Verify</p>
            <h2 className="mt-2 font-serif text-2xl tracking-[-0.035em] text-[#12213d]">Ready to start an institutional conversation?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52627b]">Cush reviews every application. A request does not create immediate access.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/verify/apply" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#275fb7]">
              Apply <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/verify/login" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#cad7e8] px-5 text-sm font-semibold text-[#275fb7] hover:bg-[#f8fbff]">
              Institutional sign in
            </Link>
          </div>
        </div>
      </section>
      <CushVerifyPublicFooter />
    </main>
  );
}
