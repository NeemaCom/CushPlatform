import { Link } from "wouter";
import {
  Globe2, ShieldCheck, Zap, ArrowRight, CheckCircle2,
  TrendingUp, Lock, BadgeCheck, ChevronRight, Star,
  Plane, MapPin
} from "lucide-react";

// ─── Mock Passport Card ───────────────────────────────────────────────────────

function PassportCard({ score = 785, demo = false }: { score?: number; demo?: boolean }) {
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
              <span className="text-emerald-300 text-xs font-semibold">VERIFIED</span>
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
                <span className="text-slate-400 text-xs uppercase tracking-widest">Capacity</span>
                <p className="text-white font-bold text-lg leading-tight">High Capacity</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "Income", w: 82, color: "#2563eb" },
                  { label: "Surplus", w: 74, color: "#10b981" },
                  { label: "Stability", w: 79, color: "#7c3aed" },
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
              <p className="text-emerald-400 text-sm font-bold mt-0.5">High — 72%</p>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 bg-[#2563eb] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <span className="font-bold text-[#0f172a] text-base tracking-tight">Cush Passport</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              Sign In
            </button>
          </Link>
          <Link href="/login">
            <button className="text-sm font-semibold bg-[#2563eb] text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              Get Your Passport
            </button>
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
                <span className="text-blue-700 text-xs font-semibold tracking-wide uppercase">Global Credit Identity Layer</span>
              </div>

              <h1 className="text-5xl sm:text-6xl font-black text-[#0f172a] leading-[1.08] tracking-tight">
                Your Financial<br />
                Reputation,<br />
                <span className="text-[#2563eb]">Now Borderless.</span>
              </h1>

              <p className="text-lg text-slate-500 leading-relaxed max-w-xl">
                The Cush Passport turns your global income and assets into a verified credit score that travels with you. Prove your reliability to landlords and lenders — before or after you land.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login">
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors shadow-md shadow-blue-200 text-sm">
                    Get Your Passport Score
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
              <div className="flex items-center gap-6 pt-2">
                <div className="flex -space-x-2">
                  {["2563eb", "0f172a", "10b981", "7c3aed"].map((c) => (
                    <div key={c} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: `#${c}` }}>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Used by migrants in 40+ countries</p>
                </div>
              </div>
            </div>

            {/* Right: passport card */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-[360px]">
                <PassportCard score={785} />
              </div>
            </div>
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
              description="Build a globally recognized credit score from your home country before you even land. No local credit history needed."
              bullets={[
                "Add income & savings signals from home",
                "Self-declare employment contracts and payslips",
                "Get a shareable score to send landlords in advance",
                "Supports NGN, GHS, KES, INR, and more",
              ]}
              cta="Start Building Your Score"
              accent="border-blue-200 bg-blue-50/40"
              href="/login"
            />
            <ModeCard
              icon={MapPin}
              eyebrow="Post-Arrival"
              title="Recently Arrived?"
              description="Bridge your global financial history to your new home. Prove you're more reliable than a blank credit file suggests."
              bullets={[
                "Upload proof of residency to unlock this mode",
                "Combine home-country and local financial data",
                "Bypass rent deposits with verified capacity proof",
                "Instant shareable link for landlords and agents",
              ]}
              cta="Unlock Post-Arrival Mode"
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
            <p className="text-slate-500 mt-3 text-base max-w-xl mx-auto">Traditional credit scores are local. Your financial discipline isn't.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <TrustCard
              icon={TrendingUp}
              title="More Than a Credit Score"
              body="We measure your Peak Capacity and global asset history — using PPP-adjusted benchmarks across 10+ currencies so your score reflects real financial strength, not just local purchasing power."
              accent="bg-blue-50 text-blue-600"
            />
            <TrustCard
              icon={Lock}
              title="Bank-Grade Privacy"
              body="Share your verified score without exposing raw bank transactions. Your financial data stays encrypted. You control exactly who sees what — and you can revoke access at any time."
              accent="bg-slate-100 text-slate-700"
            />
            <TrustCard
              icon={Zap}
              title="Day-Zero Ready"
              body="Send your verified Cush Passport link to landlords before signing. Bypass 6-month rent deposits and security barriers that punish migrants with no local credit file."
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
              { step: "01", title: "Add Your Signals", body: "Declare income, surplus, and stability data from your home economy. Upload evidence to boost your score.", icon: TrendingUp },
              { step: "02", title: "Get Your Score", body: "Our deterministic PPP model calculates your 0–1000 Cush Score in seconds. No black boxes, no algorithms.", icon: BadgeCheck },
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
