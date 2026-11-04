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
  MoveUpRight,
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
  "mt-2 block min-h-12 w-full rounded-xl border border-[#d9d7cf] bg-[#fffefa] px-4 py-3 text-[15px] text-[#202820] outline-none transition placeholder:text-[#a4a49a] focus:border-[#567568] focus:ring-4 focus:ring-[#567568]/10";

function BetaBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9ddd2] bg-[#f4f5ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#596e5e]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#6e8e73]" aria-hidden="true" />
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
    <label className="block text-sm font-medium text-[#38433c]">
      {label}
      {required && <span className="ml-1 text-[#a64c36]" aria-hidden="true">*</span>}
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
    <main className="min-h-[100dvh] overflow-hidden bg-[#f5f4ed] text-[#202820] antialiased">
      <header className="relative z-10 border-b border-[#e4e2d9] bg-[#f8f7f1]">
        <div className="mx-auto flex min-h-[72px] max-w-[1320px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-center gap-3" aria-label="Cush Passport home">
            <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#263c32] font-serif text-[22px] leading-none text-[#f3f0e4] transition-transform group-hover:-rotate-6">c</span>
            <span className="text-[15px] font-semibold tracking-[-0.03em]">Cush Passport</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
            <a href="#approach" className="text-[13px] font-medium text-[#667068] transition hover:text-[#263c32]">The approach</a>
            <a href="#use-cases" className="text-[13px] font-medium text-[#667068] transition hover:text-[#263c32]">For institutions</a>
            <a href="#how-it-works" className="text-[13px] font-medium text-[#667068] transition hover:text-[#263c32]">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <BetaBadge />
            <Link href="/login" className="hidden rounded-full border border-[#d9d7cf] px-4 py-2 text-xs font-semibold text-[#354239] transition hover:border-[#263c32] sm:inline-flex">Sign in</Link>
          </div>
        </div>
      </header>

      <section className="relative border-b border-[#e4e2d9]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.32]" aria-hidden="true" style={{ backgroundImage: "radial-gradient(#aeb6a7 0.7px, transparent 0.7px)", backgroundSize: "19px 19px", maskImage: "linear-gradient(90deg, transparent, black 78%)" }} />
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[1.04fr_.96fr] lg:gap-8 lg:px-12 lg:pb-24 lg:pt-24">
          <div className="max-w-[690px]">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.19em] text-[#718276]">Cush Verify</span>
              <span className="h-px w-8 bg-[#c9cec3]" aria-hidden="true" />
              <BetaBadge />
            </div>
            <h1 className="mt-7 max-w-[680px] font-serif text-[clamp(3.1rem,7vw,6.45rem)] leading-[0.96] tracking-[-0.065em] text-[#263c32]">
              Financial identity. Built to move across borders.
            </h1>
            <p className="mt-7 max-w-[560px] text-[16px] leading-7 text-[#59645c] sm:text-[18px] sm:leading-8">
              A new way to think about financial identity: portable, permission-led, and shaped around the realities of life across countries.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <a href="#register" className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full bg-[#263c32] px-6 text-sm font-semibold text-[#f8f7f1] shadow-[0_10px_24px_rgba(38,60,50,0.14)] transition hover:-translate-y-0.5 hover:bg-[#354d41] focus:outline-none focus:ring-2 focus:ring-[#667f69] focus:ring-offset-2">
                Register Your Institution <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
              <a href="#approach" className="inline-flex min-h-[50px] items-center gap-2 px-4 text-sm font-semibold text-[#425449] transition hover:text-[#8c4b36]">
                Explore Cush Verify <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-[#748078]">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              Institutional interest is reviewed by the Cush team.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[590px] lg:ml-auto">
            <div className="relative aspect-[1.05/1] overflow-hidden rounded-[42%_58%_49%_51%/48%_43%_57%_52%] bg-[#dfe5d8]">
              <div className="absolute inset-[6%] rounded-[44%_56%_52%_48%/50%_43%_57%_50%] border border-[#b9c6b6]" />
              <div className="absolute inset-[15%] rounded-[48%_52%_46%_54%/43%_56%_44%_57%] border border-[#c5d0c0]" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 560" fill="none" aria-hidden="true">
                <path d="M93 349C160 348 165 198 238 195C315 192 318 364 397 363C473 362 477 247 530 246" stroke="#829986" strokeWidth="1.3" strokeDasharray="4 8" />
                <path d="M125 420C214 420 220 299 292 298C367 297 380 435 458 433" stroke="#829986" strokeWidth="1.3" strokeDasharray="4 8" />
                <circle cx="239" cy="195" r="7" fill="#f6f4e9" stroke="#718a75" strokeWidth="2" />
                <circle cx="397" cy="363" r="7" fill="#f6f4e9" stroke="#718a75" strokeWidth="2" />
                <circle cx="530" cy="246" r="7" fill="#f6f4e9" stroke="#718a75" strokeWidth="2" />
                <circle cx="292" cy="298" r="7" fill="#f6f4e9" stroke="#718a75" strokeWidth="2" />
                <circle cx="93" cy="349" r="4" fill="#718a75" />
                <circle cx="458" cy="433" r="4" fill="#718a75" />
              </svg>
              <div className="absolute left-[10%] top-[19%] rotate-[-8deg] rounded-full border border-[#d1d6ca] bg-[#f7f6ee] px-4 py-2 text-[11px] font-semibold tracking-wide text-[#45594b] shadow-[0_8px_22px_rgba(50,65,50,0.06)]">IDENTITY</div>
              <div className="absolute right-[6%] top-[37%] rotate-[7deg] rounded-full border border-[#d1d6ca] bg-[#f7f6ee] px-4 py-2 text-[11px] font-semibold tracking-wide text-[#45594b] shadow-[0_8px_22px_rgba(50,65,50,0.06)]">CONSENT</div>
              <div className="absolute bottom-[13%] left-[25%] rotate-[5deg] rounded-full border border-[#d1d6ca] bg-[#f7f6ee] px-4 py-2 text-[11px] font-semibold tracking-wide text-[#45594b] shadow-[0_8px_22px_rgba(50,65,50,0.06)]">CONTEXT</div>
              <div className="absolute left-[38%] top-[35%] grid h-[118px] w-[118px] place-items-center rounded-full bg-[#263c32] text-center text-[#f4f1e5] shadow-[0_20px_45px_rgba(38,60,50,0.2)]">
                <div>
                  <Globe2 className="mx-auto mb-2 h-6 w-6 stroke-[1.4]" aria-hidden="true" />
                  <span className="font-serif text-[17px]">Across borders</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 left-2 flex items-center gap-3 rounded-2xl border border-[#e0dfd5] bg-[#f8f7f1] px-4 py-3 shadow-[0_14px_40px_rgba(48,57,46,0.08)] sm:left-0">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eee9dc] text-[#80654c]"><Network className="h-4 w-4" aria-hidden="true" /></span>
              <span className="text-xs font-medium leading-5 text-[#58645a]">Designed around people<br />and their financial journeys</span>
            </div>
            <span className="absolute -right-2 top-5 hidden font-mono text-[10px] tracking-[0.15em] text-[#849084] sm:block">01 / IDENTITY IN MOTION</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1320px] items-center justify-between border-t border-[#e4e2d9] px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a9389] sm:px-8 lg:px-12">
          <span>Identity should travel with people</span>
          <span className="hidden sm:inline">A perspective for a connected world</span>
          <span>01 — 06</span>
        </div>
      </section>

      <section id="approach" className="scroll-mt-8 bg-[#263c32] text-[#f4f1e8]">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.7fr_1.3fr] lg:gap-24 lg:px-12 lg:py-28">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9c8b7]">The challenge</p>
            <h2 className="mt-5 max-w-sm font-serif text-4xl leading-[1.04] tracking-[-0.045em] sm:text-5xl">A move should not erase a financial story.</h2>
          </div>
          <div className="max-w-[680px]">
            <p className="text-xl leading-8 text-[#e5e7db] sm:text-[25px] sm:leading-9">
              People cross borders for work, study, family, and a fresh start. But the financial context they have built often stays behind.
            </p>
            <div className="mt-8 grid gap-6 border-t border-[#53685a] pt-6 sm:grid-cols-2">
              <p className="text-sm leading-6 text-[#c1cbbd]">Institutions must make important decisions with fragmented information, different local systems, and unfamiliar histories.</p>
              <p className="text-sm leading-6 text-[#c1cbbd]">Cush Verify starts from a simple question: how might a person’s financial identity be understood more fairly, wherever life takes them?</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f5f4ed]">
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8a7c]">What this makes possible</p>
              <h2 className="mt-4 max-w-[720px] font-serif text-4xl leading-[1.03] tracking-[-0.05em] text-[#263c32] sm:text-6xl">A more connected view of financial identity.</h2>
            </div>
            <p className="max-w-[320px] pb-1 text-sm leading-6 text-[#687268]">A vision to shape with institutions—grounded in people, permission, and the realities of cross-border life.</p>
          </div>
          <div className="mt-12 grid overflow-hidden rounded-[26px] border border-[#deded3] bg-[#ebece3] md:grid-cols-3">
            <article className="p-7 sm:p-9">
              <span className="font-mono text-[11px] tracking-[0.14em] text-[#849084]">01 / PORTABLE</span>
              <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#dce4d7] text-[#405844]"><Globe2 className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="mt-5 font-serif text-2xl tracking-[-0.03em] text-[#263c32]">Identity beyond one market</h3>
              <p className="mt-3 text-sm leading-6 text-[#687268]">Imagine financial identity that can make more sense across the places people live, work, and build a future.</p>
            </article>
            <article className="border-y border-[#d8dbd0] p-7 sm:p-9 md:border-x md:border-y-0">
              <span className="font-mono text-[11px] tracking-[0.14em] text-[#849084]">02 / PERMISSION-LED</span>
              <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#e9ded1] text-[#855a43]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="mt-5 font-serif text-2xl tracking-[-0.03em] text-[#263c32]">Built around choice</h3>
              <p className="mt-3 text-sm leading-6 text-[#687268]">A thoughtful model puts people’s understanding and consent at the centre of how identity is shared.</p>
            </article>
            <article className="p-7 sm:p-9">
              <span className="font-mono text-[11px] tracking-[0.14em] text-[#849084]">03 / HUMAN</span>
              <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#e1e4d7] text-[#526744]"><UsersRound className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="mt-5 font-serif text-2xl tracking-[-0.03em] text-[#263c32]">Context, not just credentials</h3>
              <p className="mt-3 text-sm leading-6 text-[#687268]">The goal is to help institutions consider a person’s wider financial journey—not reduce it to a single moment.</p>
            </article>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#879087]">Principles for a more portable, permission-led financial identity.</p>
        </div>
      </section>

      <section id="use-cases" className="scroll-mt-8 border-y border-[#e5e2d9] bg-[#fbfaf5]">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.72fr_1.28fr] lg:gap-24 lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8a7c]">For institutions</p>
            <h2 className="mt-4 max-w-md font-serif text-4xl leading-[1.04] tracking-[-0.05em] text-[#263c32] sm:text-5xl">Different decisions. A shared question.</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#69746b]">We’re listening to organizations that meet people at pivotal moments in their lives.</p>
          </div>
          <div className="divide-y divide-[#e5e2d9]">
            {[
              { icon: Landmark, label: "Banks & lenders", text: "How might a fuller financial story support fairer conversations about access and opportunity?" },
              { icon: Building2, label: "Housing providers", text: "What would help people demonstrate financial readiness when they arrive from elsewhere?" },
              { icon: UsersRound, label: "Employers", text: "How can institutions better understand the needs of people building a new life and livelihood?" },
              { icon: Globe2, label: "Universities & others", text: "Where could a more portable financial identity make a meaningful difference for your community?" },
            ].map(({ icon: Icon, label, text }, index) => (
              <article key={label} className="group flex gap-5 py-6 sm:gap-7">
                <span className="pt-1 font-mono text-[11px] text-[#a0a79c]">0{index + 1}</span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eff0e9] text-[#506853] transition group-hover:bg-[#e4e9df]"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#34433a]">{label}</h3>
                  <p className="mt-1.5 max-w-[570px] text-sm leading-6 text-[#707a70]">{text}</p>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#a0a79c] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#536c57]" aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 bg-[#e7e9df]">
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8a7c]">How it works today</p>
              <h2 className="mt-4 max-w-md font-serif text-4xl leading-[1.04] tracking-[-0.05em] text-[#263c32] sm:text-5xl">A conversation, starting with your institution.</h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-[#687268]">The available step is simple: tell us what your institution wants to explore. The Cush team reviews each submission and follows up directly.</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                { n: "01", title: "Share your perspective", text: "Tell us about your organization, your role, and the questions you’re considering." },
                { n: "02", title: "Cush reviews", text: "Your institutional interest is received for review by the Cush team." },
                { n: "03", title: "Connect with Cush", text: "The team will be in touch using the contact details you provide." },
              ].map((step) => (
                <li key={step.n} className="flex min-h-[200px] flex-col rounded-[20px] border border-[#d4d9ce] bg-[#f3f3ec] p-6 sm:min-h-[224px]">
                  <span className="font-mono text-[11px] tracking-[0.14em] text-[#879387]">{step.n}</span>
                  <h3 className="mt-8 font-serif text-[22px] leading-tight tracking-[-0.025em] text-[#2d4234]">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-5 text-[#748074]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f5f4ed]">
        <div className="absolute -right-24 top-[-170px] h-[420px] w-[420px] rounded-full border border-[#e0e1d6]" aria-hidden="true" />
        <div className="absolute -right-8 top-[-115px] h-[300px] w-[300px] rounded-full border border-[#e0e1d6]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1320px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-24 lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8a7c]">The vision</p>
            <h2 className="mt-4 max-w-[540px] font-serif text-4xl leading-[1.02] tracking-[-0.05em] text-[#263c32] sm:text-6xl">A financial identity that can keep up with life.</h2>
          </div>
          <div className="max-w-[550px] lg:ml-auto">
            <p className="text-lg leading-8 text-[#5f6b61]">Cush Verify is a vision for financial identity that moves with people, across institutions and borders. We believe the best way to shape that future is to listen closely to the organizations and communities it should serve.</p>
            <p className="mt-5 text-sm leading-6 text-[#788178]">Registration is an invitation to share your institution’s perspective with Cush and start a conversation about what comes next.</p>
            <a href="#register" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#445a49] transition hover:text-[#9a5138]">Bring your perspective <MoveUpRight className="h-4 w-4" aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section id="register" className="scroll-mt-4 bg-[#263c32] px-4 py-14 text-[#f4f1e8] sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
          <div className="pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9c8b7]">Institutional registration</p>
            <h2 className="mt-5 max-w-md font-serif text-4xl leading-[1.02] tracking-[-0.05em] sm:text-5xl">Let’s start with what matters to you.</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#c1cbbd]">Share a little about your institution and the questions you’re exploring. The Cush team reviews institutional interest and will be in touch.</p>
            <div className="mt-9 flex max-w-sm gap-3 border-t border-[#53685a] pt-5 text-xs leading-5 text-[#b9c8b7]">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>Please do not include customer records, account credentials, or sensitive personal or financial information in this form.</p>
            </div>
            <div className="mt-10 hidden items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a394] lg:flex">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Reviewed by the Cush team
            </div>
          </div>

          <div className="rounded-[26px] bg-[#f6f5ef] p-5 text-[#263c32] shadow-[0_24px_70px_rgba(13,29,19,0.2)] sm:p-8 lg:p-10">
            {confirmation ? (
              <div role="status" aria-live="polite" className="flex min-h-[450px] flex-col justify-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e2eadf] text-[#42634a]"><Check className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-7 max-w-lg font-serif text-3xl leading-tight tracking-[-0.04em] text-[#263c32]">Thank you for your interest in Cush Verify.</h3>
                <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#657067]">Your institutional interest has been received. The Cush team will be in touch.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-[#e4e3d9] pb-5">
                  <div>
                    <h3 className="font-serif text-2xl tracking-[-0.03em] text-[#263c32]">Tell us about your institution</h3>
                    <p className="mt-1.5 text-xs text-[#798178]"><span className="text-[#a64c36]">*</span> Required fields</p>
                  </div>
                  <span className="hidden h-10 w-10 place-items-center rounded-xl bg-[#e9ede5] text-[#59705c] sm:grid"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
                </div>

                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <Field label="Institution name" value={form.institutionName} onChange={(value) => update("institutionName", value)} required autoComplete="organization" placeholder="Organization name" />
                  <label className="block text-sm font-medium text-[#38433c]">
                    Institution type <span className="ml-1 text-[#a64c36]" aria-hidden="true">*</span>
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

                <label className="block text-sm font-medium text-[#38433c]">
                  What would you like to explore? <span className="font-normal text-[#8b938a]">(optional)</span>
                  <textarea value={form.intendedUse} onChange={(event) => update("intendedUse", event.target.value)} maxLength={1200} rows={3} className={`${inputClass} resize-y`} placeholder="Tell us what prompted your interest." />
                </label>

                <label className="block text-sm font-medium text-[#38433c]">
                  What verification requirements or challenges are you considering? <span className="font-normal text-[#8b938a]">(optional)</span>
                  <textarea value={form.verificationRequirements} onChange={(event) => update("verificationRequirements", event.target.value)} maxLength={1200} rows={3} className={`${inputClass} resize-y`} placeholder="Share the requirements or questions you would like to discuss." />
                </label>

                <label className="block text-sm font-medium text-[#38433c]">
                  Preferred engagement model <span className="ml-1 text-[#a64c36]" aria-hidden="true">*</span>
                  <select value={form.preferredEngagementModel} onChange={(event) => update("preferredEngagementModel", event.target.value as EngagementModel | "")} className={inputClass} required>
                    <option value="" disabled>Select an engagement model</option>
                    {engagementModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                  </select>
                  <span className="mt-1.5 block text-xs font-normal leading-5 text-[#879087]">Choose the topic that would be most useful for a conversation with our team.</span>
                </label>

                <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="verify-website">Website</label>
                  <input id="verify-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-[#dedfd5] bg-[#eeefe8] p-4 text-xs leading-5 text-[#5e695f]">
                  <input type="checkbox" checked={form.contactConsent} onChange={(event) => update("contactConsent", event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#b9c2b7] accent-[#47614c] focus:ring-[#567568]" required />
                  <span>I agree that Cush may use these details to review this institutional interest and contact me about Cush Verify. <span className="text-[#a64c36]" aria-hidden="true">*</span> See the <Link href="/privacy-policy" className="font-semibold text-[#405d48] underline underline-offset-2 hover:text-[#9a5138]">Privacy Policy</Link>.</span>
                </label>

                {error && <p role="alert" className="rounded-xl border border-[#d9a99b] bg-[#f9ece7] px-4 py-3 text-sm leading-5 text-[#873e2d]">{error}</p>}
                <button type="submit" disabled={submitting} className="group inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full bg-[#263c32] px-6 text-sm font-semibold text-[#f8f7f1] transition hover:bg-[#354d41] focus:outline-none focus:ring-2 focus:ring-[#789477] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                  {submitting ? "Submitting…" : "Register Your Institution"}
                  {submitting ? <span className="h-4 w-4 animate-pulse rounded-full bg-[#a9bba7]" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-[#1f3329] text-[#c3cdc1]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#385143] font-serif text-xl leading-none text-[#f3f0e4]">c</span>
            <span className="text-xs font-medium">Cush Verify <span className="mx-1 text-[#718276]">·</span> Beta</span>
          </div>
          <p className="text-xs text-[#98a79a]">A conversation about financial identity across borders.</p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold transition hover:text-white">Cush Passport <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
      </footer>
    </main>
  );
}
