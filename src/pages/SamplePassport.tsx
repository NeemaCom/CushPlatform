import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";

const SAMPLE_DATA = {
  score: 785,
  confidenceScore: 72,
  confidenceLabel: "High Confidence",
  mode: "pre_arrival",
  scoreBreakdown: { incomeScore: 82, surplusScore: 74, stabilityScore: 79 },
  reasonCodes: [
    "Income is 2.1× the PPP-adjusted local median",
    "Consistent monthly surplus over 12 months",
    "Employment contract with 24+ months tenure",
    "Verified international transfer capacity",
  ],
  lastUpdated: new Date().toISOString(),
  evidence: [
    { documentType: "payslip", label: "Monthly Payslip Declaration", status: "VERIFIED", tier: 1 },
    { documentType: "employment_contract", label: "Employment Status", status: "VERIFIED", tier: 1 },
    { documentType: "bank_statement", label: "Upload Bank Statement", status: "PENDING_REVIEW", tier: 2 },
    { documentType: "payslip", label: "Upload Payslip (PDF/Image)", status: "SELF_REPORTED", tier: 2 },
  ],
  signals: [
    { signalType: "income", label: "Primary employer salary", country: "NG", currencyCode: "NGN", normalizedValue: "3.4", verificationStatus: "VERIFIED" },
    { signalType: "surplus", label: "Monthly net surplus", country: "NG", currencyCode: "NGN", normalizedValue: "1.9", verificationStatus: "SELF_REPORTED" },
    { signalType: "stability", label: "12-month track record", country: "NG", currencyCode: "NGN", normalizedValue: "2.6", verificationStatus: "VERIFIED" },
  ],
};

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  SELF_REPORTED: { label: "Self-Reported", classes: "bg-slate-100 text-slate-600" },
  PENDING_REVIEW: { label: "Under Review", classes: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", classes: "bg-emerald-50 text-emerald-700 font-semibold" },
};

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.round((score / 1000) * 100);
  const r = 92;
  const circ = 2 * Math.PI * r;
  const color = score >= 750 ? "#10b981" : score >= 550 ? "#2563eb" : score >= 350 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="relative inline-block">
      <svg width="220" height="220" viewBox="0 0 220 220" className="rotate-[-90deg]">
        <circle cx="110" cy="110" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        <circle cx="110" cy="110" r={r} fill="none" stroke={color} strokeWidth="16"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-black" style={{ color }}>{score}</span>
        <span className="text-slate-400 text-sm font-medium mt-1">out of 1,000</span>
      </div>
    </div>
  );
}

export default function SamplePassport() {
  const data = SAMPLE_DATA;
  const breakdown = data.scoreBreakdown;
  const verifiedCount = data.evidence.filter((e) => e.status === "VERIFIED").length;
  const pendingCount = data.evidence.filter((e) => e.status === "PENDING_REVIEW").length;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-black">C</span>
              </div>
              <span className="font-bold text-slate-900 text-sm">Cush Passport</span>
            </div>
          </div>
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Sample Passport</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Demo Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">i</div>
          <div>
            <p className="text-sm font-semibold text-blue-900">This is a sample passport for demonstration purposes.</p>
            <p className="text-xs text-blue-700 mt-0.5">Real scores are computed from verified financial signals using our PPP-normalized model.</p>
          </div>
        </div>

        {/* Hero Score Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-8 pb-10 text-white text-center">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-6">Cush Global Credit Score</p>
            <div className="relative inline-block">
              <ScoreGauge score={data.score} />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-2xl font-bold">Excellent</p>
              <div className="inline-block bg-emerald-500/20 border border-emerald-400/30 rounded-full px-4 py-1 mt-1">
                <span className="text-emerald-300 text-sm font-semibold">{data.confidenceLabel} — {data.confidenceScore}% Verified</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span>Mode: Pre-Arrival</span>
              <span>·</span>
              <span>Last updated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>

          <div className="bg-blue-50 border-t border-blue-100 px-6 py-4 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-0.5">How to read this score</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                We measure financial discipline relative to local cost-of-living to prove global reliability.
                A score of 600+ indicates the applicant is a significantly above-average earner in their home economy.
              </p>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-5">Score Breakdown</h2>
          <div className="space-y-4">
            {[
              { label: "Income Strength", sublabel: "Relative to local purchasing power", value: breakdown.incomeScore, weight: 40, color: "#2563eb" },
              { label: "Monthly Surplus", sublabel: "Consistency of surplus over expenses", value: breakdown.surplusScore, weight: 30, color: "#10b981" },
              { label: "Financial Stability", sublabel: "Track record length and consistency", value: breakdown.stabilityScore, weight: 30, color: "#7c3aed" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.sublabel} · {item.weight}% of score</p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{item.value}<span className="text-sm text-slate-400">/100</span></span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason Codes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-4">Key Financial Indicators</h2>
          <div className="space-y-2">
            {data.reasonCodes.map((code, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-xs font-bold">✓</span>
                </div>
                <p className="text-sm text-slate-700">{code}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Evidence Summary</h2>
            <div className="flex gap-2 text-xs">
              <span className="bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">{verifiedCount} Verified</span>
              {pendingCount > 0 && <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">{pendingCount} Pending</span>}
            </div>
          </div>
          <div className="space-y-2">
            {data.evidence.map((e, i) => {
              const badge = STATUS_BADGE[e.status] ?? STATUS_BADGE.SELF_REPORTED;
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                  <span className="text-sm text-slate-700">{e.label}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${badge.classes}`}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#0f172a] rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-white">Build your own Cush Passport</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">Add your financial signals, upload evidence, and get a verified score that travels with you globally.</p>
          <Link href="/login">
            <button className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm shadow-lg shadow-blue-900/30">
              Get Your Passport Score
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        <div className="text-center pb-4 space-y-1">
          <p className="text-xs text-slate-400">This report is generated by Cush and reflects verified financial data.</p>
          <p className="text-xs text-slate-400">For verification queries, contact <span className="text-blue-600">verify@we-cush.com</span></p>
        </div>
      </div>
    </div>
  );
}
