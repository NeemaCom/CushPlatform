import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, Building2, CheckCircle2, LockKeyhole } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  cushVerifyApplicantInstitutionTypes,
  cushVerifyApplicationSchema,
} from "@shared/cush-verify";

type InstitutionType = (typeof cushVerifyApplicantInstitutionTypes)[number];

type ApplicationForm = {
  legalName: string;
  tradingName: string;
  institutionType: InstitutionType | "";
  countryOfRegistration: string;
  website: string;
  businessEmail: string;
  contactFullName: string;
  contactJobTitle: string;
  businessTelephone: string;
  intendedUse: string;
  estimatedMonthlyVerifications: string;
  contactConsent: boolean;
};

const initialForm: ApplicationForm = {
  legalName: "",
  tradingName: "",
  institutionType: "",
  countryOfRegistration: "",
  website: "",
  businessEmail: "",
  contactFullName: "",
  contactJobTitle: "",
  businessTelephone: "",
  intendedUse: "",
  estimatedMonthlyVerifications: "",
  contactConsent: false,
};

const institutionLabels: Record<InstitutionType, string> = {
  university: "University",
  housing_organisation: "Housing organisation",
  bank: "Bank",
  landlord: "Landlord",
};

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-4 py-3 text-sm text-[#12213d] outline-none focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/15";

function fieldError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const body = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (body) {
    try {
      return (JSON.parse(body) as { error?: string }).error ?? message;
    } catch {
      return message;
    }
  }
  return message || "We could not submit your application. Please try again.";
}

export default function CushVerifyApplication() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = cushVerifyApplicationSchema.safeParse({
      ...form,
      institutionType: form.institutionType,
      estimatedMonthlyVerifications: form.estimatedMonthlyVerifications
        ? Number(form.estimatedMonthlyVerifications)
        : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the required fields and try again.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/verify/applications", parsed.data);
      setSubmitted(true);
      setForm(initialForm);
    } catch (submissionError) {
      setError(fieldError(submissionError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f3f7fc] px-4 py-8 text-[#14213a] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link href="/verify" className="inline-flex items-center gap-2 text-sm font-semibold text-[#275fb7] hover:text-[#16458f]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Cush Verify
          </Link>
          <Link href="/verify/login" className="text-sm font-semibold text-[#275fb7] hover:text-[#16458f]">Institutional sign in</Link>
        </div>

        <header className="mt-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3973c8]">Institutional application</p>
          <h1 className="mt-3 font-serif text-4xl tracking-[-0.05em] text-[#12213d] sm:text-5xl">Tell us about your organisation.</h1>
          <p className="mt-4 text-sm leading-6 text-[#52627b]">
            Cush Admin reviews every application. If it proceeds, a named contact will receive a secure invitation to create an email-and-password account. An application or invitation does not grant verification access.
          </p>
        </header>

        <section className="mt-8 rounded-[24px] border border-[#d8e3f1] bg-white p-5 shadow-[0_16px_50px_rgba(18,39,76,.07)] sm:p-8">
          {submitted ? (
            <div role="status" aria-live="polite" className="flex min-h-72 flex-col justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e3f4ef] text-[#16816f]">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-6 max-w-2xl font-serif text-3xl leading-tight tracking-[-0.04em] text-[#12213d]">
                Thank you for your interest in Cush Verify.
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#52627b]">
                Your institutional interest has been received. The Cush team will be in touch.
              </p>
              <Link href="/verify" className="mt-6 inline-flex w-fit text-sm font-semibold text-[#275fb7] hover:text-[#16458f]">Return to Cush Verify</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-[#e1e8f1] pb-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-[#12213d]">Organisation and contact</h2>
                  <p className="mt-0.5 text-xs text-[#61728a]">Fields marked required must be completed.</p>
                </div>
              </div>

              {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium">Institution legal name
                  <input required maxLength={200} autoComplete="organization" className={inputClass} value={form.legalName} onChange={(event) => update("legalName", event.target.value)} />
                </label>
                <label className="block text-sm font-medium">Trading name <span className="font-normal text-[#71819b]">(if applicable)</span>
                  <input maxLength={200} className={inputClass} value={form.tradingName} onChange={(event) => update("tradingName", event.target.value)} />
                </label>
                <label className="block text-sm font-medium">Institution type
                  <select required className={inputClass} value={form.institutionType} onChange={(event) => update("institutionType", event.target.value as InstitutionType | "")}>
                    <option value="" disabled>Select a type</option>
                    {cushVerifyApplicantInstitutionTypes.map((type) => <option key={type} value={type}>{institutionLabels[type]}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium">Country of registration
                  <input required maxLength={100} autoComplete="country-name" className={inputClass} value={form.countryOfRegistration} onChange={(event) => update("countryOfRegistration", event.target.value)} />
                </label>
                <label className="block text-sm font-medium">Official website
                  <input required type="url" maxLength={300} autoComplete="url" placeholder="https://example.org" className={inputClass} value={form.website} onChange={(event) => update("website", event.target.value)} />
                </label>
                <label className="block text-sm font-medium">Business email
                  <input required type="email" maxLength={254} autoComplete="email" placeholder="name@institution.org" className={inputClass} value={form.businessEmail} onChange={(event) => update("businessEmail", event.target.value)} />
                </label>
                <label className="block text-sm font-medium">Contact person’s full name
                  <input required maxLength={160} autoComplete="name" className={inputClass} value={form.contactFullName} onChange={(event) => update("contactFullName", event.target.value)} />
                </label>
                <label className="block text-sm font-medium">Contact person’s job title
                  <input required maxLength={120} autoComplete="organization-title" className={inputClass} value={form.contactJobTitle} onChange={(event) => update("contactJobTitle", event.target.value)} />
                </label>
                <label className="block text-sm font-medium">Business telephone
                  <input required type="tel" maxLength={40} autoComplete="tel" className={inputClass} value={form.businessTelephone} onChange={(event) => update("businessTelephone", event.target.value)} />
                </label>
                <label className="block text-sm font-medium">Estimated monthly verification requirements <span className="font-normal text-[#71819b]">(optional)</span>
                  <input type="number" min="0" max="10000000" step="1" className={inputClass} value={form.estimatedMonthlyVerifications} onChange={(event) => update("estimatedMonthlyVerifications", event.target.value)} />
                </label>
              </div>

              <label className="block text-sm font-medium">Intended use of Cush Verify
                <textarea required minLength={10} maxLength={2000} rows={4} className={`${inputClass} resize-y`} value={form.intendedUse} onChange={(event) => update("intendedUse", event.target.value)} placeholder="Describe the verification needs your organisation wants to discuss." />
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4 text-sm leading-6 text-[#40516d]">
                <input required type="checkbox" checked={form.contactConsent} onChange={(event) => update("contactConsent", event.target.checked)} className="mt-1 h-4 w-4 accent-[#3475e7]" />
                <span>I confirm I am authorised to submit this enquiry and agree that Cush may use these details to review the application and contact me about institutional onboarding. Please do not include customer records or sensitive personal financial information.</span>
              </label>

              <div className="flex flex-col gap-3 border-t border-[#e1e8f1] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="inline-flex items-center gap-2 text-xs leading-5 text-[#61728a]">
                  <LockKeyhole className="h-4 w-4 shrink-0 text-[#16816f]" aria-hidden="true" />
                  Account invitations are sent only after Cush Admin review.
                </p>
                <button disabled={submitting} type="submit" className="min-h-12 rounded-full bg-[#3475e7] px-6 text-sm font-semibold text-white transition hover:bg-[#275fb7] disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? "Submitting…" : "Submit institution application"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
