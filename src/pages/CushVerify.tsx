import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  Globe2,
  Landmark,
  LockKeyhole,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { cushVerifyInstitutionInterestSchema } from "@shared/cush-verify";
import { apiRequest } from "@/lib/queryClient";

type InstitutionType = "bank" | "lender" | "housing" | "employer" | "university" | "other";
type EngagementModel = "institutional_portal" | "api_integration" | "partnership_discussion";

type InterestForm = {
  institutionName: string;
  institutionType: InstitutionType | "";
  contactName: string;
  jobTitle: string;
  email: string;
  country: string;
  intendedUse: string;
  verificationRequirements: string;
  preferredEngagementModel: EngagementModel | "";
  contactConsent: boolean;
  website: string;
};

const initialForm: InterestForm = {
  institutionName: "",
  institutionType: "",
  contactName: "",
  jobTitle: "",
  email: "",
  country: "",
  intendedUse: "",
  verificationRequirements: "",
  preferredEngagementModel: "",
  contactConsent: false,
  website: "",
};

const institutionTypes: { value: InstitutionType; label: string }[] = [
  { value: "bank", label: "Bank or financial institution" },
  { value: "lender", label: "Lender or credit provider" },
  { value: "housing", label: "Housing or property provider" },
  { value: "employer", label: "Employer" },
  { value: "university", label: "University" },
  { value: "other", label: "Other institution" },
];

const engagementModels: { value: EngagementModel; label: string }[] = [
  { value: "partnership_discussion", label: "Partnership discussion" },
  { value: "institutional_portal", label: "Institutional portal" },
  { value: "api_integration", label: "API integration" },
];

const inputClass =
  "mt-2 block min-h-12 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-4 py-3 text-[15px] text-[#12213d] outline-none transition placeholder:text-[#71819b] focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/15";

function BetaBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/25 bg-blue-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-blue-100">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
      Beta
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium text-[#20304c]">
      {label}
      {required && <span className="ml-1 text-[#c34e55]" aria-hidden="true">*</span>}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        maxLength={type === "email" ? 254 : 160}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

export default function CushVerify() {
  const [form, setForm] = useState<InterestForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  function update<K extends keyof InterestForm>(key: K, value: InterestForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = cushVerifyInstitutionInterestSchema.safeParse(form);
    if (!parsed.success) {
      setError("Please review the required fields and confirm that Cush may contact you.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/verify/institution-interest", parsed.data);
      setConfirmation(true);
      setForm(initialForm);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "";
      const apiMessage = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
      try {
        const body = apiMessage ? (JSON.parse(apiMessage) as { error?: string }) : null;
        setError(body?.error ?? "We could not submit your request. Please try again.");
      } catch {
        setError("We could not submit your request. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#f3f7fc] font-sans text-[#14213a] antialiased">
      <header className="relative z-10 border-b border-white/10 bg-[#0c1830] text-white">
        <div className="mx-auto flex min-h-[72px] max-w-[1320px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-center gap-3" aria-label="Cush Passport home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#3475e7] font-serif text-[22px] leading-none text-white transition-transform group-hover:-rotate-6">c</span>
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-white">Cush Passport</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
            <a href="#approach" className="text-[13px] font-medium text-blue-100/75 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">The approach</a>
            <a href="#use-cases" className="text-[13px] font-medium text-blue-100/75 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">For institutions</a>
            <a href="#how-it-works" className="text-[13px] font-medium text-blue-100/75 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <BetaBadge />
            <Link href="/verify/login" className="hidden rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-blue-50 transition hover:border-blue-200 hover:bg-white/5 sm:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Institutional sign in</Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#0c1830] text-white">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -right-48 -top-64 h-[680px] w-[680px] rounded-full border border-blue-300/10" />
          <div className="absolute -right-24 -top-40 h-[500px] w-[500px] rounded-full border border-emerald-300/10" />
          <div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "linear-gradient(rgba(148,180,230,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,180,230,.35) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "linear-gradient(90deg, transparent, black 90%)" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c1830] via-[#0c1830]/95 to-[#102b52]/75" />
        </div>
        <div className="mx-auto grid max-w-[1320px] items-center gap-14 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[1.04fr_.96fr] lg:gap-12 lg:px-12 lg:pb-24 lg:pt-24">
          <div className="max-w-[690px]">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.19em] text-blue-200">Cush Verify</span>
              <span className="h-px w-8 bg-blue-300/40" aria-hidden="true" />
              <BetaBadge />
            </div>
            <h1 className="mt-7 max-w-[690px] font-serif text-[clamp(3rem,6.8vw,6.25rem)] leading-[0.97] tracking-[-0.065em] text-white">
              Financial identity. <span className="text-[#79aaff]">Built to move across borders.</span>
            </h1>
            <p className="mt-7 max-w-[560px] text-[16px] leading-7 text-blue-100/75 sm:text-[18px] sm:leading-8">
              A new way to think about financial identity: portable, permission-led, and shaped around the realities of life across countries.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link href="/verify/apply" className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full bg-[#3475e7] px-6 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(35,102,222,.28)] transition hover:-translate-y-0.5 hover:bg-[#4b89f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">
                Register Your Institution <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <a href="#approach" className="inline-flex min-h-[50px] items-center gap-2 px-4 text-sm font-semibold text-blue-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                Explore Cush Verify <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-blue-100/65">
              <LockKeyhole className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              Institutional interest is reviewed by the Cush team.
            </p>
          </div>

          <aside aria-label="Current institutional enquiry process" className="relative mx-auto w-full max-w-[590px] rounded-[26px] border border-blue-100/15 bg-[#142746]/90 p-5 shadow-[0_30px_90px_rgba(0,0,0,.28)] backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Current process</p>
                <h2 className="mt-2 font-serif text-2xl tracking-[-0.03em] text-white sm:text-[28px]">An institutional enquiry</h2>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-200/15 bg-blue-300/10 text-blue-200"><Network className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <ol className="relative mt-6 space-y-3 before:absolute before:bottom-8 before:left-[19px] before:top-8 before:w-px before:bg-gradient-to-b before:from-blue-400/70 before:to-emerald-300/40">
              {[
                { number: "01", title: "Submit interest", description: "Tell us about your institution and what you would like to explore.", icon: Building2, tone: "bg-[#3475e7] text-white" },
                { number: "02", title: "Cush reviews", description: "The Cush team reviews each institutional submission.", icon: ShieldCheck, tone: "bg-[#293d61] text-blue-100" },
                { number: "03", title: "Cush follows up", description: "The team gets in touch using the contact details you provide.", icon: ArrowUpRight, tone: "bg-[#153d48] text-emerald-200" },
              ].map(({ number, title, description, icon: Icon, tone }) => (
                <li key={number} className="relative flex gap-4 rounded-2xl border border-white/[0.07] bg-[#0d1c35]/75 p-4 sm:gap-5 sm:p-5">
                  <span className={`relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className="font-semibold text-white">{title}</h3>
                      <span className="font-mono text-[10px] tracking-[0.14em] text-blue-200/50">{number}</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-5 text-blue-100/65">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] leading-5 text-blue-100/60">
              <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
              An enquiry starts a conversation; it does not grant immediate access.
            </div>
          </aside>
        </div>
        <div className="mx-auto flex max-w-[1320px] items-center justify-between border-t border-white/10 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45 sm:px-8 lg:px-12">
          <span>Identity should travel with people</span>
          <span className="hidden sm:inline">A perspective for a connected world</span>
          <span>01 — 06</span>
        </div>
      </section>

      <section id="approach" className="scroll-mt-8 bg-[#132341] text-[#f4f7ff]">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.7fr_1.3fr] lg:gap-24 lg:px-12 lg:py-28">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">The challenge</p>
            <h2 className="mt-5 max-w-sm font-serif text-4xl leading-[1.04] tracking-[-0.045em] sm:text-5xl">A move should not erase a financial story.</h2>
          </div>
          <div className="max-w-[680px]">
            <p className="text-xl leading-8 text-blue-50/90 sm:text-[25px] sm:leading-9">
              People cross borders for work, study, family, and a fresh start. But the financial context they have built often stays behind.
            </p>
            <div className="mt-8 grid gap-6 border-t border-blue-100/15 pt-6 sm:grid-cols-2">
              <p className="text-sm leading-6 text-blue-100/70">Institutions must make important decisions with fragmented information, different local systems, and unfamiliar histories.</p>
              <p className="text-sm leading-6 text-blue-100/70">Cush Verify starts from a simple question: how might a person’s financial identity be understood more fairly, wherever life takes them?</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f3f7fc]">
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3973c8]">What this makes possible</p>
              <h2 className="mt-4 max-w-[720px] font-serif text-4xl leading-[1.03] tracking-[-0.05em] text-[#12213d] sm:text-6xl">A more connected view of financial identity.</h2>
            </div>
            <p className="max-w-[320px] pb-1 text-sm leading-6 text-[#52627b]">A vision to shape with institutions—grounded in people, permission, and the realities of cross-border life.</p>
          </div>
          <div className="mt-12 grid overflow-hidden rounded-[26px] border border-[#d6e1ef] bg-white shadow-[0_20px_55px_rgba(18,39,76,.06)] md:grid-cols-3">
            <article className="p-7 sm:p-9">
              <span className="font-mono text-[11px] tracking-[0.14em] text-[#6f83a1]">01 / PORTABLE</span>
              <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#e6efff] text-[#2867d6]"><Globe2 className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="mt-5 font-serif text-2xl tracking-[-0.03em] text-[#12213d]">Identity beyond one market</h3>
              <p className="mt-3 text-sm leading-6 text-[#52627b]">Imagine financial identity that can make more sense across the places people live, work, and build a future.</p>
            </article>
            <article className="border-y border-[#dce5f1] bg-[#f8fbff] p-7 sm:p-9 md:border-x md:border-y-0">
              <span className="font-mono text-[11px] tracking-[0.14em] text-[#6f83a1]">02 / PERMISSION-LED</span>
              <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#e3f4ef] text-[#16816f]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="mt-5 font-serif text-2xl tracking-[-0.03em] text-[#12213d]">Built around choice</h3>
              <p className="mt-3 text-sm leading-6 text-[#52627b]">A thoughtful model puts people’s understanding and consent at the centre of how identity is shared.</p>
            </article>
            <article className="p-7 sm:p-9">
              <span className="font-mono text-[11px] tracking-[0.14em] text-[#6f83a1]">03 / HUMAN</span>
              <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#edf0fb] text-[#5b62aa]"><UsersRound className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="mt-5 font-serif text-2xl tracking-[-0.03em] text-[#12213d]">Context, not just credentials</h3>
              <p className="mt-3 text-sm leading-6 text-[#52627b]">The goal is to help institutions consider a person’s wider financial journey—not reduce it to a single moment.</p>
            </article>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#64758e]">Principles for a more portable, permission-led financial identity.</p>
        </div>
      </section>

      <section id="use-cases" className="scroll-mt-8 border-y border-[#dce5f1] bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.72fr_1.28fr] lg:gap-24 lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3973c8]">For institutions</p>
            <h2 className="mt-4 max-w-md font-serif text-4xl leading-[1.04] tracking-[-0.05em] text-[#12213d] sm:text-5xl">Different decisions. A shared question.</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#52627b]">We’re listening to organizations that meet people at pivotal moments in their lives.</p>
          </div>
          <div className="divide-y divide-[#e1e8f1]">
            {[
              { icon: Landmark, label: "Banks & lenders", text: "How might a fuller financial story support fairer conversations about access and opportunity?" },
              { icon: Building2, label: "Housing providers", text: "What would help people demonstrate financial readiness when they arrive from elsewhere?" },
              { icon: UsersRound, label: "Employers", text: "How can institutions better understand the needs of people building a new life and livelihood?" },
              { icon: Globe2, label: "Universities & others", text: "Where could a more portable financial identity make a meaningful difference for your community?" },
            ].map(({ icon: Icon, label, text }, index) => (
              <article key={label} className="group flex gap-5 py-6 sm:gap-7">
                <span className="pt-1 font-mono text-[11px] text-[#8494ad]">0{index + 1}</span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3fc] text-[#3471d2] transition group-hover:bg-[#e2edff]"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#20304c]">{label}</h3>
                  <p className="mt-1.5 max-w-[570px] text-sm leading-6 text-[#596a83]">{text}</p>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#8494ad] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#3471d2]" aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 bg-[#eaf1fb]">
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3973c8]">How it works today</p>
              <h2 className="mt-4 max-w-md font-serif text-4xl leading-[1.04] tracking-[-0.05em] text-[#12213d] sm:text-5xl">A conversation, starting with your institution.</h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-[#52627b]">The available step is simple: tell us what your institution wants to explore. The Cush team reviews each submission and follows up directly.</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                { n: "01", title: "Share your perspective", text: "Tell us about your organization, your role, and the questions you’re considering." },
                { n: "02", title: "Cush reviews", text: "Your institutional interest is received for review by the Cush team." },
                { n: "03", title: "Connect with Cush", text: "The team will be in touch using the contact details you provide." },
              ].map((step) => (
                <li key={step.n} className="flex min-h-[200px] flex-col rounded-[20px] border border-[#d4dfed] bg-white p-6 shadow-[0_12px_35px_rgba(28,59,107,.05)] sm:min-h-[224px]">
                  <span className="font-mono text-[11px] tracking-[0.14em] text-[#3973c8]">{step.n}</span>
                  <h3 className="mt-8 font-serif text-[22px] leading-tight tracking-[-0.025em] text-[#12213d]">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-5 text-[#596a83]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f3f7fc]">
        <div className="absolute -right-24 top-[-170px] h-[420px] w-[420px] rounded-full border border-[#d7e3f2]" aria-hidden="true" />
        <div className="absolute -right-8 top-[-115px] h-[300px] w-[300px] rounded-full border border-[#d7e3f2]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1320px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-24 lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3973c8]">The vision</p>
            <h2 className="mt-4 max-w-[540px] font-serif text-4xl leading-[1.02] tracking-[-0.05em] text-[#12213d] sm:text-6xl">A financial identity that can keep up with life.</h2>
          </div>
          <div className="max-w-[550px] lg:ml-auto">
            <p className="text-lg leading-8 text-[#40516d]">Cush Verify is a vision for financial identity that moves with people, across institutions and borders. We believe the best way to shape that future is to listen closely to the organizations and communities it should serve.</p>
            <p className="mt-5 text-sm leading-6 text-[#61728a]">Registration is an invitation to share your institution’s perspective with Cush and start a conversation about what comes next.</p>
            <a href="#register" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#275fb7] transition hover:text-[#16458f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">Bring your perspective <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section id="register" className="scroll-mt-4 bg-[#0c1830] px-4 py-14 text-[#f4f7ff] sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
          <div className="pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Institutional enquiry</p>
            <h2 className="mt-5 max-w-md font-serif text-4xl leading-[1.02] tracking-[-0.05em] sm:text-5xl">Let’s start with what matters to you.</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-blue-100/75">For a formal institutional application, use the registration flow. This enquiry form remains available for general partnership questions.</p>
            <Link href="/verify/apply" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#4b89f3]">Start an institutional application</Link>
            <div className="mt-9 flex max-w-sm gap-3 border-t border-white/15 pt-5 text-xs leading-5 text-blue-100/75">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <p>Please do not include customer records, account credentials, or sensitive personal or financial information in this form.</p>
            </div>
            <div className="mt-10 hidden items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/65 lg:flex">
              <BadgeCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" /> Reviewed by the Cush team
            </div>
          </div>

          <div className="rounded-[26px] border border-[#d8e3f1] bg-white p-5 text-[#14213a] shadow-[0_28px_80px_rgba(0,0,0,.25)] sm:p-8 lg:p-10">
            {confirmation ? (
              <div role="status" aria-live="polite" className="flex min-h-[450px] flex-col justify-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e3f4ef] text-[#16816f]"><Check className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-7 max-w-lg font-serif text-3xl leading-tight tracking-[-0.04em] text-[#12213d]">Thank you for your interest in Cush Verify.</h3>
                <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#52627b]">Your institutional interest has been received. The Cush team will be in touch.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-[#e1e8f1] pb-5">
                  <div>
                    <h3 className="font-serif text-2xl tracking-[-0.03em] text-[#12213d]">Tell us about your institution</h3>
                    <p className="mt-1.5 text-xs text-[#61728a]"><span className="text-[#c34e55]">*</span> Required fields</p>
                  </div>
                  <span className="hidden h-10 w-10 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2] sm:grid"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
                </div>

                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <Field label="Institution name" value={form.institutionName} onChange={(value) => update("institutionName", value)} required autoComplete="organization" placeholder="Organization name" />
                  <label className="block text-sm font-medium text-[#20304c]">
                    Institution type <span className="ml-1 text-[#c34e55]" aria-hidden="true">*</span>
                    <select value={form.institutionType} onChange={(event) => update("institutionType", event.target.value as InstitutionType | "")} className={inputClass} required>
                      <option value="" disabled>Select an institution type</option>
                      {institutionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </label>
                  <Field label="Contact name" value={form.contactName} onChange={(value) => update("contactName", value)} required autoComplete="name" placeholder="Your name" />
                  <Field label="Job title" value={form.jobTitle} onChange={(value) => update("jobTitle", value)} required autoComplete="organization-title" placeholder="Your role" />
                  <Field label="Work email" value={form.email} onChange={(value) => update("email", value)} required type="email" autoComplete="email" placeholder="name@institution.org" />
                  <Field label="Country" value={form.country} onChange={(value) => update("country", value)} required autoComplete="country-name" placeholder="Country or territory" />
                </div>

                <label className="block text-sm font-medium text-[#20304c]">
                  What would you like to explore? <span className="font-normal text-[#72819a]">(optional)</span>
                  <textarea value={form.intendedUse} onChange={(event) => update("intendedUse", event.target.value)} maxLength={1200} rows={3} className={`${inputClass} resize-y`} placeholder="Tell us what prompted your interest." />
                </label>

                <label className="block text-sm font-medium text-[#20304c]">
                  What verification requirements or challenges are you considering? <span className="font-normal text-[#72819a]">(optional)</span>
                  <textarea value={form.verificationRequirements} onChange={(event) => update("verificationRequirements", event.target.value)} maxLength={1200} rows={3} className={`${inputClass} resize-y`} placeholder="Share the requirements or questions you would like to discuss." />
                </label>

                <label className="block text-sm font-medium text-[#20304c]">
                  Preferred engagement model <span className="ml-1 text-[#c34e55]" aria-hidden="true">*</span>
                  <select value={form.preferredEngagementModel} onChange={(event) => update("preferredEngagementModel", event.target.value as EngagementModel | "")} className={inputClass} required>
                    <option value="" disabled>Select an engagement model</option>
                    {engagementModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                  </select>
                  <span className="mt-1.5 block text-xs font-normal leading-5 text-[#72819a]">Choose the topic that would be most useful for a conversation with our team.</span>
                </label>

                <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="verify-website">Website</label>
                  <input id="verify-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-[#dbe5f1] bg-[#f3f7fc] p-4 text-xs leading-5 text-[#40516d]">
                  <input type="checkbox" checked={form.contactConsent} onChange={(event) => update("contactConsent", event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#b9c8da] accent-[#3475e7] focus:ring-[#3977e6]" required />
                  <span>I agree that Cush may use these details to review this institutional interest and contact me about Cush Verify. <span className="text-[#c34e55]" aria-hidden="true">*</span> See the <Link href="/privacy-policy" className="font-semibold text-[#275fb7] underline underline-offset-2 hover:text-[#16458f]">Privacy Policy</Link>.</span>
                </label>

                {error && <p role="alert" className="rounded-xl border border-[#e8b8b9] bg-[#fff2f1] px-4 py-3 text-sm leading-5 text-[#8d343b]">{error}</p>}
                <button type="submit" disabled={submitting} className="group inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full bg-[#2868d7] px-6 text-sm font-semibold text-white transition hover:bg-[#1e56b8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                  {submitting ? "Submitting…" : "Register Your Institution"}
                  {submitting ? <span className="h-4 w-4 animate-pulse rounded-full bg-emerald-200" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-[#091326] text-[#c4d1e6]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#3475e7] font-serif text-xl leading-none text-white">c</span>
            <span className="text-xs font-medium">Cush Verify <span className="mx-1 text-blue-200/50">·</span> Beta</span>
          </div>
          <p className="text-xs text-blue-100/60">A conversation about financial identity across borders.</p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300">Cush Passport <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
      </footer>
    </main>
  );
}
