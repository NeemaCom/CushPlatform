import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="inline-flex items-center" aria-label="Cush home">
            <img src="/cush-wordmark.png" alt="Cush" className="h-9 w-auto max-w-[180px] object-contain" />
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#3530a8] hover:text-[#242080]">
            Back to Cush
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5148d8]">
            Supplemental privacy notice
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Visitor analytics addendum
          </h1>
          <p className="mt-3 text-sm text-slate-500">Published 7 November 2026</p>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <p className="font-semibold">This is not the full Cush Privacy Policy.</p>
          <p className="mt-1">
            This addendum covers optional visitor analytics only. It does not describe all handling of
            account, identity, bank, credit, or uploaded-document data. The general privacy policy is
            still being prepared. This notice is general information, not legal advice, and should be
            reviewed by qualified privacy counsel.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="font-semibold text-indigo-950">Current status</p>
          <p className="mt-1 text-sm leading-6 text-indigo-900">
            Optional visitor analytics are not currently enabled. Cush will not start collecting
            these analytics until an opt-in control is available and the remaining retention settings
            are settled.
          </p>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Who manages this data</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Bluebird Integrated Ltd (UK) and Target Lab HQ (Nigeria) jointly manage the personal
              data processing described in this addendum. For privacy requests, contact{" "}
              <a className="font-semibold text-[#3530a8] underline underline-offset-2" href="mailto:support@we-cush.com">
                support@we-cush.com
              </a>.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The organisations’ formal responsibilities and provider-region details are still being
              reviewed. Information may be handled in the UK, Nigeria, and locations where service
              providers operate; required transfer safeguards will be confirmed before analytics is
              enabled.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">What optional analytics may include</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              After you opt in, Cush may collect a pseudonymous visitor identifier, the page or
              product area visited, approved event names and timestamps, coarse browser or device
            information, and approximate country. Country is not verified
              location; Cush will not use it to infer nationality, residence, immigration status, or
              exact location. Browser fingerprinting is not used.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Analytics is optional and will be used to understand service use and improve Cush. We
              will not put passwords, authentication tokens, BVNs, financial amounts, bank statements,
              credit-report contents, uploaded-document contents, or private form values into
              general analytics events.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Consent and retention</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Optional analytics will start only after you opt in. You will be able to withdraw that
              choice when the consent controls are introduced. Detailed analytics records will be
              retained for no more than 90 days.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              The expiry for a browser-held identifier and the retention period for aggregated
              reports are not set yet. Analytics will remain off until those limits are decided and
              disclosed.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Security logs are separate</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Raw IP addresses will not be used as visitor analytics identifiers. Cush’s policy is
              to process raw IP addresses only for security and abuse prevention, and retain them in
              Cush-controlled security records for no more than 24 hours. Hosting providers may
              maintain their own request logs under separate retention settings; those details are
              being confirmed.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Service providers</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Cush uses Firebase Authentication and Google sign-in, Supabase/PostgreSQL, Render, and
              Vercel to provide and host the service. Mono, Plaid, and Interswitch support separate
              user-authorized financial-data features; their bank or credit data is not intended for
              visitor analytics. The specific provider regions and infrastructure-log retention
              periods are still being verified.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Your choices and requests</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Once analytics consent controls are available, you can change or withdraw your choice.
              You may also contact{" "}
              <a className="font-semibold text-[#3530a8] underline underline-offset-2" href="mailto:support@we-cush.com">
                support@we-cush.com
              </a>{" "}
              to ask about access, correction, or deletion of personal data. Applicable rights depend
              on your location and the relevant privacy laws.
            </p>
          </section>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <span>Minimum age for Cush accounts: 18.</span>
          <Link href="/terms-of-service" className="font-semibold text-[#3530a8] hover:text-[#242080]">
            Terms of Service
          </Link>
        </footer>
      </main>
    </div>
  )
}