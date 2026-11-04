import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { cushVerifyInstitutionInterestSchema, cushVerifyInstitutionTypes } from "@shared/cush-verify";
import { apiRequest } from "@/lib/queryClient";

type InterestForm = {
  institutionName: string;
  institutionType: (typeof cushVerifyInstitutionTypes)[number];
  contactName: string;
  jobTitle: string;
  email: string;
  country: string;
  intendedUse: string;
  contactConsent: boolean;
  website: string;
};

const initialForm: InterestForm = {
  institutionName: "",
  institutionType: "bank",
  contactName: "",
  jobTitle: "",
  email: "",
  country: "",
  intendedUse: "",
  contactConsent: false,
  website: "",
};

const institutionTypeLabels: Record<InterestForm["institutionType"], string> = {
  bank: "Bank or financial institution",
  lender: "Lender or credit provider",
  housing: "Housing or property provider",
  employer: "Employer",
  other: "Other institution",
};

function BetaBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-800">
      Beta
    </span>
  );
}

export default function CushVerify() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  function update<K extends keyof InterestForm>(key: K, value: InterestForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setConfirmation("");
    const parsed = cushVerifyInstitutionInterestSchema.safeParse(form);
    if (!parsed.success) {
      setError("Please complete the required fields and confirm the contact permission.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/verify/institution-interest", parsed.data);
      const result = await response.json() as { message?: string };
      setConfirmation(result.message ?? "Your interest request has been received.");
      setForm(initialForm);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "";
      const apiMessage = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
      try {
        const body = apiMessage ? JSON.parse(apiMessage) as { error?: string } : null;
        setError(body?.error ?? "We could not submit your request. Please try again later.");
      } catch {
        setError("We could not submit your request. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Cush Passport home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#342ca8] text-sm font-black text-white">C</span>
            <span className="text-sm font-bold tracking-tight text-slate-900">Cush Passport</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-500 sm:inline">Institutional product</span>
            <BetaBadge />
            <Link href="/login" className="rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:px-3">Sign in</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute -right-28 -top-36 h-[28rem] w-[28rem] rounded-full bg-indigo-50 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              Cush Verify <BetaBadge />
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-slate-950 sm:text-5xl">
              Financial identity verification, being built with institutions.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Cush Verify is currently in development. We are working with prospective institutional partners to shape and refine our financial identity verification services.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#register" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#342ca8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#292380] focus:outline-none focus:ring-2 focus:ring-[#342ca8] focus:ring-offset-2">
                Register Your Institution <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Interest registration only
              </span>
            </div>
          </div>
          <aside className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-7" aria-label="Beta availability">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
              <BadgeCheck className="h-4 w-4 text-amber-700" aria-hidden="true" />
              Beta status
            </div>
            <p className="mt-3 text-sm leading-6 text-amber-950/80">
              No institutional verification checks, API, or workspace are available yet. Registering interest does not create an account or provide access.
            </p>
            <p className="mt-4 border-t border-amber-200 pt-4 text-xs leading-5 text-amber-900/75">
              Every request is subject to administrative review. Any future access will require a separate approval and onboarding process.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-3" aria-label="Cush Verify development status">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Available now
          </div>
          <p className="mt-3 text-sm leading-6 text-emerald-950/75">Institutional partners can register interest for future discussions. No verification service is live.</p>
        </article>
        <article className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Under development
          </div>
          <p className="mt-3 text-sm leading-6 text-indigo-950/75">Partner discovery and the design of consent-led institutional verification journeys.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Building2 className="h-4 w-4" aria-hidden="true" /> Planned
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Institutional onboarding and verification features will be defined with partners and are not available yet.</p>
        </article>
      </section>

      <section id="register" className="scroll-mt-8 border-y border-slate-200 bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5149b5]">Early access interest</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Register your institution</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              Tell us who you are and what you would like to explore. We will review your request and may contact you about early access or a potential partnership.
            </p>
            <p className="mt-4 max-w-md text-xs leading-5 text-slate-500">
              This form is not an application for an operational verification account. Do not include BVNs, account credentials, customer records, or other sensitive financial information.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-5 shadow-[0_12px_35px_rgba(30,41,59,0.05)] sm:p-7">
            {confirmation ? (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-emerald-950">Interest registered</h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-900">{confirmation}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Institution name" value={form.institutionName} onChange={(value) => update("institutionName", value)} required autoComplete="organization" />
                  <label className="block text-sm font-medium text-slate-700">
                    Institution type
                    <select value={form.institutionType} onChange={(event) => update("institutionType", event.target.value as InterestForm["institutionType"])} className={fieldClass} required>
                      {cushVerifyInstitutionTypes.map((type) => <option key={type} value={type}>{institutionTypeLabels[type]}</option>)}
                    </select>
                  </label>
                  <Field label="Contact name" value={form.contactName} onChange={(value) => update("contactName", value)} required autoComplete="name" />
                  <Field label="Role or job title" value={form.jobTitle} onChange={(value) => update("jobTitle", value)} required autoComplete="organization-title" />
                  <Field label="Work email" value={form.email} onChange={(value) => update("email", value)} required type="email" autoComplete="email" />
                  <Field label="Country" value={form.country} onChange={(value) => update("country", value)} required autoComplete="country-name" />
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  What would you like to explore? <span className="font-normal text-slate-400">(optional)</span>
                  <textarea value={form.intendedUse} onChange={(event) => update("intendedUse", event.target.value)} maxLength={1200} rows={4} className={`${fieldClass} resize-y`} placeholder="Share a short description. Please do not include customer or financial data." />
                </label>

                <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="verify-website">Website</label>
                  <input id="verify-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-xs leading-5 text-slate-600">
                  <input type="checkbox" checked={form.contactConsent} onChange={(event) => update("contactConsent", event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#342ca8] focus:ring-[#342ca8]" required />
                  <span>I ask Cush to use these details to review this request and contact me about Cush Verify early access or partnership discussions. This does not create an account or grant verification access. See the <Link href="/privacy-policy" className="font-semibold text-[#342ca8] underline underline-offset-2">Privacy Policy</Link>.</span>
                </label>
                {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}
                <button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#342ca8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#292380] focus:outline-none focus:ring-2 focus:ring-[#342ca8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                  {submitting ? "Submitting…" : "Register Your Institution"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>Cush Verify · Beta · Interest registration only</span>
        <Link href="/" className="font-semibold text-slate-600 hover:text-slate-900">Back to Cush Passport</Link>
      </footer>
    </main>
  );
}

const fieldClass = "mt-1.5 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#5149b5] focus:ring-2 focus:ring-[#5149b5]/15";

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} maxLength={254} className={fieldClass} />
    </label>
  );
}
