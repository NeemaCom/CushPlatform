import { Link } from "wouter";
import {
  Globe2, ShieldCheck, Zap, ArrowRight, CheckCircle2,
  TrendingUp, Lock, BadgeCheck, ChevronRight,
  Plane, MapPin
} from "lucide-react";

// ─── Mock Passport Card ───────────────────────────────────────────────────────

function PassportCard({ score = 800, demo = false }: { score?: number; demo?: boolean }) {
  const pct = Math.round((score / 1000) * 100);
  const circumference = 2 * Math.PI * 38;

  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-3xl scale-110" />

      {/* Card */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)" }}
      >
        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        {/* Top-right accent circle */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-blue-500/10 border border-blue-400/20" />
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-400/10 border border-blue-400/20" />

        <div className="relative p-7 space-y-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">C</span>
              </div>
              <span className="text-white font-bold text-sm tracking-wide">CUSH PASSPORT</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-xs font-semibold">SAMPLE</span>
            </div>
          </div>

          {/* Score circle */}
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#2563eb"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - pct / 100)}
                  strokeLinecap="round"
                />
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#10b981"
                  strokeWidth="7"
                  strokeDasharray={circumference * 0.25}
                  strokeDashoffset={circumference * (1 - pct / 100) - circumference * 0.07}
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white leading-none">{score}</span>
                <span className="text-slate-400 text-xs font-medium">/ 1000</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-widest">Assessment</span>
                <p className="text-white font-bold text-lg leading-tight">Illustrative example</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "Funds", w: 82, color: "#2563eb" },
                  { label: "Income", w: 82, color: "#10b981" },
                  { label: "Cash flow", w: 74, color: "#7c3aed" },
                  { label: "Credit", w: 79, color: "#f59e0b" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs w-14">{b.label}</span>
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${b.w}%`, backgroundColor: b.color }} />
                    </div>
                    <span className="text-slate-400 text-xs w-6 text-right">{b.w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest">Mode</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Plane className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white text-sm font-semibold">Pre-Arrival</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs uppercase tracking-widest">Confidence</p>
              <p className="text-emerald-400 text-sm font-bold mt-0.5">Illustrative — 72/100</p>
            </div>
          </div>
        </div>
      </div>

      {demo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur text-slate-300 text-xs font-medium px-3 py-1 rounded-full border border-slate-600">
          Sample Passport
        </div>
      )}
    </div>
  );
}

// ─── Trust Signal Card ────────────────────────────────────────────────────────

function TrustCard({
  icon: Icon,
  title,
  body,
  accent,
}: {
  icon: any;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

// ─── Mode Card ────────────────────────────────────────────────────────────────

function ModeCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  bullets,
  cta,
  accent,
  href,
}: {
  icon: any;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  accent: string;
  href: string;
}) {
  return (
    <div className={`rounded-2xl p-8 space-y-5 border ${accent} flex flex-col`}>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{eyebrow}</span>
        </div>
        <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
      <ul className="space-y-2.5 flex-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-slate-700">{b}</span>
          </li>
        ))}
      </ul>
      <Link href={href}>
        <button className="w-full flex items-center justify-center gap-2 bg-[#0f172a] text-white text-sm font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors">
          {cta}
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="min-h-16 flex items-center justify-between gap-2">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 bg-[#2563eb] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <span className="font-bold text-[#0f172a] text-sm sm:text-base tracking-tight">Cush Passport</span>
          </div>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          <Link href="/verify" className="hidden items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#342ca8] md:inline-flex">
            Cush Verify
            <span className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-slate-600">Beta</span>
          </Link>
          <Link href="/login">
            <button className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-2 sm:px-3 md:px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              Sign In
            </button>
          </Link>
          <Link href="/login">
            <button className="text-xs sm:text-sm font-semibold bg-[#2563eb] text-white px-2.5 sm:px-4 md:px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              Get Your Passport
            </button>
          </Link>
        </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 py-1.5 md:hidden">
          <Link href="/verify" className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#342ca8]">
            Cush Verify
            <span className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-slate-600">Beta</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Main Homepage ────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Nav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-60 translate-x-1/2 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-50 rounded-full blur-3xl opacity-40 -translate-x-1/3 translate-y-1/4" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5">
                <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-blue-700 text-xs font-semibold tracking-wide uppercase">Individual Financial Assessment</span>
              </div>

              <h1 className="text-5xl sm:text-6xl font-black text-[#0f172a] leading-[1.08] tracking-tight">
                Your Financial<br />
                Reputation,<br />
                <span className="text-[#2563eb]">Now Borderless.</span>
              </h1>

              <p className="text-lg text-slate-500 leading-relaxed max-w-xl">
                Cush Passport is building an individual financial assessment from supported funds, income history, cash flow, and credit information. Missing inputs are marked rather than presented as a finished score.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login">
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors shadow-md shadow-blue-200 text-sm">
                    Start Your Assessment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/sample">
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm hover:bg-slate-50">
                    View a Sample Passport
                  </button>
                </Link>
              </div>

              {/* Social proof row */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">Individual-only</span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">Four scoring components</span>
              </div>
            </div>

            {/* Right: passport card */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-[360px]">
                <PassportCard score={800} demo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Institutional Enquiry ─────────────────────────────────────────── */}
      <section aria-labelledby="institution-callout-title" className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-blue-900/20 bg-[#101c35] px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-10 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-32 h-72 w-72 rounded-full border border-blue-300/15" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-20 h-52 w-52 rounded-full border border-emerald-300/20" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-[11px] font-bold tracking-[0.08em] text-emerald-300">For institutions</p>
              <h2 id="institution-callout-title" className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
                Access authorised cross-border financial identity information through Cush Verify.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Institutional enquiries are reviewed by Cush before access.
              </p>
            </div>
            <Link
              href="/verify"
              className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
            >
              Explore Cush Verify <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Dual-Mode Section ─────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Choose Your Journey</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight">Built for every stage of migration</h2>
            <p className="text-slate-500 mt-3 text-base max-w-xl mx-auto">Whether you're planning your move or already settling in — your Cush Passport grows with you.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <ModeCard
              icon={Plane}
              eyebrow="Pre-Arrival"
              title="Preparing to Move?"
              description="Build a supported financial assessment over time. See a provisional score and progress as score criteria become available."
              bullets={[
                "Provide dated income and available-funds history",
                "Self-declare employment contracts and payslips",
                "Review the requirements for a complete assessment",
                "Supports NGN, GHS, KES, INR, and more",
              ]}
              cta="Start Your Assessment"
              accent="border-blue-200 bg-blue-50/40"
              href="/login"
            />
            <ModeCard
              icon={MapPin}
              eyebrow="Post-Arrival"
              title="Recently Arrived?"
              description="Keep your individual financial assessment clear as you settle in a new destination."
              bullets={[
                "Confirm your arrival date to activate UK profile details",
                "Record employment, income, accommodation and expenses over time",
                "Keep UK and home-country records on one timeline",
                "Add supporting evidence later when available",
              ]}
              cta="Explore Post-Arrival"
              accent="border-emerald-200 bg-emerald-50/40"
              href="/login"
            />
          </div>
        </div>
      </section>

      {/* ── Trust Signal Grid ─────────────────────────────────────────────── */}
      <section className="bg-white py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Why Cush Passport</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight">A score built for the world</h2>
            <p className="text-slate-500 mt-3 text-base max-w-xl mx-auto">A clear, individual view of financial readiness across borders.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <TrustCard
              icon={TrendingUp}
              title="More Than a Credit Score"
              body="Your individual assessment combines available funds, income strength, cash-flow behaviour, and credit history against a configurable destination baseline."
              accent="bg-blue-50 text-blue-600"
            />
            <TrustCard
              icon={Lock}
              title="Controlled sharing"
              body="Share an assessment summary through a controlled link. The current public view does not claim bank or bureau verification, and you can revoke the link."
              accent="bg-slate-100 text-slate-700"
            />
            <TrustCard
              icon={Zap}
              title="Clear assessment status"
              body="Share your assessment status and supported financial history with prospective landlords before signing. Missing information is clearly marked."
              accent="bg-emerald-50 text-emerald-600"
            />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-[#0f172a] py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-12">Three steps to financial trust</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Provide Your History", body: "Add dated financial records and supporting evidence for an individual assessment.", icon: TrendingUp },
              { step: "02", title: "Complete the Assessment", body: "The four-part Cush Score is shown only when the required history and evidence checks pass.", icon: BadgeCheck },
              { step: "03", title: "Share Anywhere", body: "Generate a secure public link and send to landlords, agents, or lenders. Revoke access any time.", icon: Globe2 },
            ].map(({ step, title, body, icon: Icon }) => (
              <div key={step} className="text-center space-y-3">
                <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center mx-auto">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-blue-600 text-4xl font-black opacity-30">{step}</div>
                <h3 className="text-white font-bold text-lg">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link href="/login">
              <button className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-900/30 text-sm">
                Start Building Your Passport
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-slate-50 border-t border-slate-100 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#2563eb] rounded-md flex items-center justify-center">
              <span className="text-white font-black text-xs">C</span>
            </div>
            <span className="font-bold text-slate-700 text-sm">Cush Passport</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <Link href="/privacy-policy"><span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy Policy</span></Link>
            <Link href="/terms-of-service"><span className="hover:text-slate-600 cursor-pointer transition-colors">Terms of Use</span></Link>
            <a href="mailto:verify@we-cush.com" className="hover:text-slate-600 transition-colors">verify@we-cush.com</a>
          </div>
          <p className="text-xs text-slate-400">© 2026 Cush Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
