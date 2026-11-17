import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleCheck,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  cushVerifyApplicantInstitutionTypes,
  cushVerifyInstitutionalRegistrationSchema,
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
  password: string;
  passwordConfirmation: string;
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
  password: "",
  passwordConfirmation: "",
};

const institutionLabels: Record<InstitutionType, string> = {
  university: "University",
  housing_organisation: "Housing organisation",
  bank: "Bank",
  landlord: "Landlord",
};

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-4 py-3 text-sm text-[#12213d] outline-none focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/15";
const labelClass = "block text-sm font-medium text-[#243552]";

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
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    email: string;
    message: string;
    emailDeliveryStatus: "sent" | "failed" | "not_configured";
  } | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  function update<K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function continueToAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = cushVerifyInstitutionalRegistrationSchema.safeParse({
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
      const response = await apiRequest("POST", "/api/verify/applications", parsed.data);
      const result = await response.json() as {
        message?: string;
        emailDeliveryStatus?: "sent" | "failed" | "not_configured";
      };
      setConfirmation({
        email: parsed.data.businessEmail,
        message: result.message ?? "Check your official email for a secure activation link.",
        emailDeliveryStatus: result.emailDeliveryStatus ?? "sent",
      });
      setForm((current) => ({ ...current, password: "", passwordConfirmation: "" }));
    } catch (submissionError) {
      setError(fieldError(submissionError));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendActivation() {
    if (!confirmation) return;
    setResending(true);
    setResendMessage("");
    try {
      const response = await apiRequest("POST", "/api/verify/applications/resend-activation", {
        businessEmail: confirmation.email,
      });
      const result = await response.json() as { message?: string };
      setResendMessage(result.message ?? "If an application is waiting for activation, a fresh link has been sent.");
    } catch (resendError) {
      setResendMessage(fieldError(resendError));
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f3f7fc] px-4 py-5 text-[#14213a] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-[1120px]">
        <nav className="flex items-center justify-between" aria-label="Cush Verify navigation">
          <Link href="/verify" className="inline-flex items-center gap-2 text-sm font-semibold text-[#275fb7] hover:text-[#16458f]">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#e7effa] text-[#3471d2]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            Cush Verify
          </Link>
          <Link href="/verify/login" className="text-sm font-semibold text-[#275fb7] hover:text-[#16458f]">Institutional sign in</Link>
        </nav>

        <div className="mt-7 grid items-start gap-7 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-12">
          <section className="min-w-0">
            <header className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3973c8]">Cush Verify · Institutional workspace</p>
              <h1 className="mt-3 font-serif text-[2.45rem] leading-[1.04] tracking-[-0.055em] text-[#12213d] sm:text-5xl">
                {confirmation ? "One last step." : "Set up your organisation."}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#52627b] sm:text-[15px]">
                {confirmation
                  ? "We’ve sent a secure activation link to your official email. Confirm your address, then sign in to your workspace."
                  : "Create your institutional account in two short steps. Verify your official email, then sign in to your workspace."}
              </p>
            </header>

            {!confirmation && (
              <div className="mt-7 rounded-2xl border border-[#d8e3f1] bg-[#eaf1fb] p-4 sm:mt-8 sm:flex sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#3471d2] shadow-sm">
                    <Building2 className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#1a3154]">Institutional signup</p>
                    <p className="mt-0.5 text-xs text-[#61728a]">Your answers stay here as you move between steps.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 sm:mt-0" aria-label={`Step ${step} of 2`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${step === 1 ? "bg-[#3475e7] text-white" : "bg-[#dce8f8] text-[#275fb7]"}`}>{step > 1 ? <Check className="h-4 w-4" aria-hidden="true" /> : "1"}</span>
                  <span className={`h-px w-8 ${step > 1 ? "bg-[#3475e7]" : "bg-[#c8d6e9]"}`} />
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${step === 2 ? "bg-[#3475e7] text-white" : "bg-white text-[#71819b]"}`}>2</span>
                  <span className="ml-1 text-xs font-medium text-[#61728a]">Step {step} of 2</span>
                </div>
              </div>
            )}

            <section className="mt-4 rounded-[24px] border border-[#d8e3f1] bg-white p-5 shadow-[0_16px_50px_rgba(18,39,76,.07)] sm:mt-5 sm:p-8">
              {confirmation ? (
                <div role="status" aria-live="polite" className="mx-auto flex min-h-[330px] max-w-xl flex-col justify-center">
                  <span className={`grid h-12 w-12 place-items-center rounded-full ${confirmation.emailDeliveryStatus === "sent" ? "bg-[#eaf1fb] text-[#3471d2]" : "bg-amber-50 text-amber-700"}`}>
                    {confirmation.emailDeliveryStatus === "sent" ? <Mail className="h-5 w-5" aria-hidden="true" /> : <CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
                  </span>
                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">
                    {confirmation.emailDeliveryStatus === "sent" ? "Check your official email" : "Application received"}
                  </p>
                  <h2 className="mt-2 font-serif text-3xl leading-tight tracking-[-0.04em] text-[#12213d] sm:text-4xl">
                    {confirmation.emailDeliveryStatus === "sent" ? "Activate your Cush Verify account." : "Your application is saved."}
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-[#52627b]">
                    {confirmation.message}
                  </p>
                  <p className="mt-4 rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4 text-sm text-[#40516d]">
                    Official email: <strong>{confirmation.email}</strong>
                  </p>
                  <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <button type="button" disabled={resending} onClick={() => void resendActivation()} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#cad7e8] px-5 text-sm font-semibold text-[#275fb7] hover:bg-[#f8fbff] disabled:opacity-60">
                      {resending ? "Requesting a fresh link…" : "Resend activation link"}
                    </button>
                    <Link href="/verify/login" className="text-sm font-semibold text-[#275fb7] hover:underline">Already activated? Sign in</Link>
                  </div>
                  {resendMessage && <p role="status" className="mt-3 text-xs leading-5 text-[#61728a]">{resendMessage}</p>}
                  <p className="mt-5 text-xs leading-5 text-[#71819b]">The secure link is for your official business email and expires after 24 hours. Your account activates after the email is confirmed.</p>
                </div>
              ) : step === 1 ? (
                <form onSubmit={continueToAccount}>
                  <div className="flex items-center gap-3 border-b border-[#e1e8f1] pb-5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
                    <div>
                      <h2 className="font-semibold text-[#12213d]">About your organisation</h2>
                      <p className="mt-0.5 text-xs text-[#61728a]">A few details to set up your institutional profile.</p>
                    </div>
                  </div>
                  {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
                  <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <label className={labelClass}>Institution legal name
                      <input required maxLength={200} autoComplete="organization" className={inputClass} value={form.legalName} onChange={(event) => update("legalName", event.target.value)} />
                    </label>
                    <label className={labelClass}>Trading name <span className="font-normal text-[#71819b]">(if applicable)</span>
                      <input maxLength={200} className={inputClass} value={form.tradingName} onChange={(event) => update("tradingName", event.target.value)} />
                    </label>
                    <label className={labelClass}>Institution type
                      <select required className={inputClass} value={form.institutionType} onChange={(event) => update("institutionType", event.target.value as InstitutionType | "")}>
                        <option value="" disabled>Select a type</option>
                        {cushVerifyApplicantInstitutionTypes.map((type) => <option key={type} value={type}>{institutionLabels[type]}</option>)}
                      </select>
                    </label>
                    <label className={labelClass}>Country of registration
                      <input required maxLength={100} autoComplete="country-name" className={inputClass} value={form.countryOfRegistration} onChange={(event) => update("countryOfRegistration", event.target.value)} placeholder="e.g. United Kingdom" />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>Official website
                      <input required type="url" maxLength={300} autoComplete="url" placeholder="https://institution.org" className={inputClass} value={form.website} onChange={(event) => update("website", event.target.value)} />
                    </label>
                  </div>
                  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e1e8f1] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="inline-flex items-center gap-2 text-xs leading-5 text-[#61728a]"><LockKeyhole className="h-4 w-4 shrink-0 text-[#16816f]" aria-hidden="true" />Your details create a separate institutional profile.</p>
                    <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-6 text-sm font-semibold text-white transition hover:bg-[#275fb7]">Continue <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                </form>
              ) : (
                <form onSubmit={(event) => void submit(event)}>
                  <div className="flex items-center gap-3 border-b border-[#e1e8f1] pb-5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]"><KeyRound className="h-5 w-5" aria-hidden="true" /></span>
                    <div>
                      <h2 className="font-semibold text-[#12213d]">Your contact and sign-in</h2>
                      <p className="mt-0.5 text-xs text-[#61728a]">Use the official business email for this account.</p>
                    </div>
                  </div>
                  {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
                  <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <label className={labelClass}>Business email
                      <input required type="email" maxLength={254} autoComplete="email" placeholder="name@institution.org" className={inputClass} value={form.businessEmail} onChange={(event) => update("businessEmail", event.target.value)} />
                    </label>
                    <label className={labelClass}>Business telephone
                      <input required type="tel" maxLength={40} autoComplete="tel" className={inputClass} value={form.businessTelephone} onChange={(event) => update("businessTelephone", event.target.value)} />
                    </label>
                    <label className={labelClass}>Contact person’s full name
                      <input required maxLength={160} autoComplete="name" className={inputClass} value={form.contactFullName} onChange={(event) => update("contactFullName", event.target.value)} />
                    </label>
                    <label className={labelClass}>Contact person’s job title
                      <input required maxLength={120} autoComplete="organization-title" className={inputClass} value={form.contactJobTitle} onChange={(event) => update("contactJobTitle", event.target.value)} />
                    </label>
                    <label className={labelClass}>Create password
                      <input required type="password" minLength={12} maxLength={4096} autoComplete="new-password" className={inputClass} value={form.password} onChange={(event) => update("password", event.target.value)} />
                      <span className="mt-1.5 block text-xs font-normal text-[#71819b]">Use at least 12 characters.</span>
                    </label>
                    <label className={labelClass}>Confirm password
                      <input required type="password" minLength={12} maxLength={4096} autoComplete="new-password" className={inputClass} value={form.passwordConfirmation} onChange={(event) => update("passwordConfirmation", event.target.value)} />
                      {form.passwordConfirmation && form.password !== form.passwordConfirmation && <span className="mt-1.5 block text-xs font-medium text-[#a34b4b]">Passwords must match.</span>}
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>Intended use of Cush Verify
                      <textarea required minLength={10} maxLength={2000} rows={3} className={`${inputClass} resize-y`} value={form.intendedUse} onChange={(event) => update("intendedUse", event.target.value)} placeholder="Briefly describe your organisation’s verification needs." />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>Estimated monthly verification requirements <span className="font-normal text-[#71819b]">(optional)</span>
                      <input type="number" min="0" max="10000000" step="1" className={inputClass} value={form.estimatedMonthlyVerifications} onChange={(event) => update("estimatedMonthlyVerifications", event.target.value)} placeholder="An estimate is helpful, but not required" />
                    </label>
                  </div>
                  <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4 text-sm leading-6 text-[#40516d]">
                    <input required type="checkbox" checked={form.contactConsent} onChange={(event) => update("contactConsent", event.target.checked)} className="mt-1 h-4 w-4 accent-[#3475e7]" />
                    <span>I confirm I am authorised to submit these details and agree that Cush may use them to create my institutional account and contact me about Cush Verify. Please do not include customer records or sensitive personal financial information.</span>
                  </label>
                  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e1e8f1] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={() => { setError(""); setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-[#275fb7] hover:text-[#16458f]">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to organisation
                    </button>
                    <button type="submit" disabled={submitting || form.password.length < 12 || form.password !== form.passwordConfirmation} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3475e7] px-6 text-sm font-semibold text-white transition hover:bg-[#275fb7] disabled:cursor-not-allowed disabled:opacity-50">
                      {submitting ? "Creating account…" : "Create account"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}
            </section>
            {!confirmation && <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 text-[#71819b]"><ShieldCheck className="h-4 w-4 text-[#16816f]" aria-hidden="true" />No admin review or invitation. Verify your email to activate your account.</p>}
          </section>

          {!confirmation && (
            <aside className="hidden lg:block">
              <div className="sticky top-8 rounded-[22px] border border-[#d8e3f1] bg-[#eaf1fb] p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3973c8]">Your path to Cush Verify</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#3471d2]"><CircleCheck className="h-4 w-4" aria-hidden="true" /></span>
                </div>
                <ol className="mt-7 space-y-0">
                  <li className="relative flex gap-3 pb-7">
                    <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${step === 1 ? "bg-[#3475e7] text-white" : "bg-[#d7e6fb] text-[#275fb7]"}`}>{step > 1 ? <Check className="h-4 w-4" aria-hidden="true" /> : "1"}</span>
                    <div><p className="text-sm font-semibold text-[#1a3154]">Tell us who you are</p><p className="mt-1 text-xs leading-5 text-[#61728a]">Organisation details, contact and account.</p></div>
                    <span className="absolute left-[13px] top-7 h-[calc(100%-18px)] w-px bg-[#c7d8ee]" />
                  </li>
                  <li className="relative flex gap-3 pb-7">
                    <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${step === 2 ? "bg-[#3475e7] text-white" : "bg-white text-[#71819b]"}`}>2</span>
                    <div><p className="text-sm font-semibold text-[#1a3154]">Verify your official email</p><p className="mt-1 text-xs leading-5 text-[#61728a]">Open the secure link we send you.</p></div>
                    <span className="absolute left-[13px] top-7 h-[calc(100%-18px)] w-px bg-[#c7d8ee]" />
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#71819b]">3</span>
                    <div><p className="text-sm font-semibold text-[#1a3154]">Sign in and get started</p><p className="mt-1 text-xs leading-5 text-[#61728a]">Your workspace is ready after activation.</p></div>
                  </li>
                </ol>
                <div className="mt-7 rounded-xl border border-[#d4e1f1] bg-white/75 p-4">
                  <p className="text-xs font-semibold text-[#1a3154]">A direct route to your workspace</p>
                  <p className="mt-1.5 text-xs leading-5 text-[#61728a]">Create an account with your official email and password, then confirm the secure link sent to your inbox.</p>
                </div>
              </div>
            </aside>
          )}
        </div>

        <footer className="mx-auto mt-8 flex max-w-4xl items-center justify-center gap-2 border-t border-[#dce5f1] py-5 text-xs text-[#71819b] lg:mt-10">
          <LockKeyhole className="h-3.5 w-3.5 text-[#16816f]" aria-hidden="true" />
          Cush Verify is a separate institutional workspace.
        </footer>
      </div>
    </main>
  );
}
