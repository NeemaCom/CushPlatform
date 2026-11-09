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
            Cush Passport and Cush Verify
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500">Version 4 · Effective 9 November 2026</p>
        </div>

        <div className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
          <p className="font-semibold">Optional analytics require your choice.</p>
          <p className="mt-1">
            After you opt in, Cush records limited visitor events and an approximate country code
            derived locally from your request IP. Raw IP addresses are not stored in analytics. You
            can decline or withdraw that choice; the core service continues to work.
          </p>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">1. Who operates Cush</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Cush is jointly operated by Bluebird Integrated Ltd (United Kingdom) and Target Lab HQ
              (Nigeria). For privacy questions, access or correction requests, or to request account
              closure and deletion, contact{" "}
              <a className="font-semibold text-[#3530a8] underline underline-offset-2" href="mailto:support@we-cush.com">
                support@we-cush.com
              </a>.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The service is intended for people aged 18 or older. This notice applies to Cush
              Passport, Cush Verify, and related account features.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">2. Information we handle</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              <strong>Account and profile information:</strong> name, email address, username, phone
              number, nationality, profile image, gender if supplied, account identifiers, verification
              status, and your recorded acceptance of policy versions and optional marketing consent.
              Firebase Authentication supports sign-in; Cush also keeps an associated account record.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              <strong>Financial and assessment information:</strong> details needed to connect
              accounts, information returned by a financial provider, derived account-history
              evidence, credit-history evidence, assessment scores and confidence, and information
              you enter or import into Post-Arrival records.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              <strong>Provider, security, and optional analytics information:</strong> provider
              connection identifiers, consent records, sign-in and lockout events, support or
              institution-interest submissions, and security audit information such as request IP
              addresses. If you opt in, analytics records a pseudonymous visitor and browser-session
               identifier, approved page routes, event and active-session times, broad device/browser
               categories, referrer hostname, and an approximate country code. The server briefly
               checks the request IP against a local country-only database and does not retain that
               raw IP in analytics. On the same browser, the identifier may span anonymous and
               signed-in use; activity can be associated with your Cush account when you sign in. It
               does not create a cross-device identity. Cush Verify submissions may include an
               institution, contact person, work email, role, and message.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              <strong>Uploaded evidence:</strong> some evidence-upload flows currently hold files in
              application memory rather than durable file storage. Such files may be lost when the
              service restarts; do not treat this feature as a permanent document archive.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">3. How financial-provider data is used</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Mono, Plaid, and Interswitch are used only for the financial features you choose and
              authorize. Mono may provide connected-account and statement information; Cush stores
              derived assessment evidence rather than raw statements in the V2 evidence tables.
              Interswitch receives a BVN for a requested credit-history lookup; the reviewed Cush flow
              does not store the BVN, OTP, or raw provider response in the Cush database.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Plaid is used for the Post-Arrival account connection. Cush stores connection
              information and encrypts the Plaid access token; provider data fetched for review is
              not kept as a separate raw transaction dataset in the current Cush implementation.
              Derived evidence or information you choose to save may remain in your assessment.
              Disconnecting Plaid removes the local connection and requests disconnection from Plaid.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Provider services may process information under their own privacy terms. Withdrawing
              consent or disconnecting a provider stops future access where supported; it does not
              necessarily erase information already held by that provider or records Cush must retain.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">4. Why we use information</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>To create and secure accounts, authenticate users, and provide requested features.</li>
              <li>To retrieve authorized financial or credit-history information and calculate assessments.</li>
              <li>To record required consent, support requests, institution enquiries, and administrative actions.</li>
              <li>To detect abuse, protect the service, troubleshoot failures, and meet legal obligations.</li>
              <li>To understand high-level product use, only if you opt in to optional analytics.</li>
              <li>To send marketing only where you separately opt in; marketing consent is optional.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">5. Legal grounds for use</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              We use information when needed to provide features you request, to perform our
              agreement with you, or to take steps you request before using Cush. We rely on your
              consent for financial-provider connections and credit-history checks, and for
              optional marketing and optional analytics. We may also use limited information for
              legitimate interests such as account security, abuse prevention, service reliability,
              and administration, while respecting your rights. We use or disclose information when
              required by law.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">6. Service providers and sharing</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              We use Firebase Authentication, Supabase/PostgreSQL, Render, and Vercel to authenticate,
              store, operate, and deliver Cush. Mono, Plaid, and Interswitch process data for
              separately authorized financial features. These providers may process information in
              the United Kingdom, Nigeria, or other locations where their services operate.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              We do not sell personal information. We share it with service providers as needed to
              deliver the service, when you direct us to share it, or where law, safety, or the
              protection of rights requires it. If you create or use a Cush Passport share link,
              anyone who has that link may be able to view the information displayed by that link.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              When information crosses borders, we use safeguards required by applicable privacy
              laws. Provider infrastructure and request logs may have separate settings and retention
              periods that Cush does not control.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">7. Retention</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              We keep account, profile, consent, and account-linked financial or assessment
              information while your account is active. After we verify an account-closure request,
              we will delete or anonymize this information within one year, unless it must be kept
              longer for legal obligations, security, dispute resolution, or the establishment or
              defense of legal claims. Provider-held copies are governed by the provider’s own
              retention rules.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Optional analytics sessions and events are retained for up to 90 days. Withdrawing
              analytics consent deletes the visitor’s stored sessions and events. The record of an
              accepted or withdrawn analytics choice may be retained for up to one year after
              withdrawal or account closure to document that choice. After you opt in, Cush briefly
              processes your IP address on its own server against a local, country-only database and
              stores only the approximate two-letter country code with that analytics session. Cush
              does not store raw IP addresses in visitor analytics. Country estimates may be wrong,
              are not used to identify a person or household, and do not affect financial decisions.
              Security and admin-audit IP records follow the separate rules below.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              For admin audit records created after this policy takes effect on 9 November 2026, raw
              IP addresses are kept for up to one year from the audit event and then removed while
              the admin action record remains. Existing audit rows are not changed by this update;
              older raw IP addresses may remain longer. HMAC-based rate-limit identifiers are
              removed by the application after their short security window, currently 24 hours.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">8. Your choices and rights</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Depending on the law that applies to you, you may request access, correction,
              deletion, restriction, or a copy of your information, and may object to or withdraw
              consent for processing that relies on consent. To close your account or make a request,
              email{" "}
              <a className="font-semibold text-[#3530a8] underline underline-offset-2" href="mailto:support@we-cush.com">
                support@we-cush.com
              </a>
              . We may ask you to verify your identity before acting. You can delete some saved
              records or disconnect supported providers using the available account controls.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              You can decline optional analytics or withdraw at any time using the Privacy choices
              control. Withdrawal stops future collection and deletes stored visitor sessions and
              events associated with your visitor identifier; if you are signed in, it also removes
              analytics sessions and events associated with your account.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">9. Cookies and analytics</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Cush uses necessary browser storage and session cookies for sign-in, security, and
              core service functions. Optional first-party analytics storage is used only after you
              actively opt in. It records page views, limited sign-up/sign-in completion events, and
              periodic active-session signals against approved routes; active status reflects
              activity within the last five minutes. It does not collect passwords, financial amounts,
              uploaded documents, or form contents. After you opt in, the server uses the request IP
              briefly for a local, approximate country lookup, saves only the country code with the
              session, and does not retain the raw IP in analytics. We do not use advertising
              trackers. You can change this choice at any time.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">10. Security</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              We use access controls, secure authentication, and technical safeguards such as
              encryption for stored Plaid connection credentials. No online service can guarantee
              absolute security. Please protect your sign-in details and contact us promptly if you
              believe your account has been accessed without permission.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">11. Changes and contact</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              We may update this policy as Cush changes or legal requirements evolve. We will update
              the version and effective date above and provide notice where required. For questions,
              requests, or complaints, contact{" "}
              <a className="font-semibold text-[#3530a8] underline underline-offset-2" href="mailto:support@we-cush.com">
                support@we-cush.com
              </a>
              . You may also contact the data-protection authority responsible for your location.
            </p>
          </section>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <span>Minimum age for Cush accounts: 18.</span>
          <span>This policy is general information, not legal advice. Have qualified privacy counsel review it.</span>
          <Link href="/terms-of-service" className="font-semibold text-[#3530a8] hover:text-[#242080]">
            Terms of Service
          </Link>
        </footer>
      </main>
    </div>
  )
}