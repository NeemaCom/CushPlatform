import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";

const SAMPLE_DATA = {
  score: 800,
  confidenceScore: 72,
  confidenceLabel: "High",
  mode: "pre_arrival",
  evidence: [
    { documentType: "payslip", label: "Monthly Payslip Declaration", status: "VERIFIED", tier: 1 },
    { documentType: "employment_contract", label: "Employment Status", status: "VERIFIED", tier: 1 },
    { documentType: "bank_statement", label: "Upload Bank Statement", status: "PENDING_REVIEW", tier: 2 },
    { documentType: "payslip", label: "Upload Payslip (PDF/Image)", status: "SELF_REPORTED", tier: 2 },
  ],
  signals: [
    { signalType: "funds", label: "Accessible savings", country: "GB", currencyCode: "GBP", normalizedValue: null, verificationStatus: "VERIFIED" },
    { signalType: "income", label: "Recurring income history", country: "GB", currencyCode: "GBP", normalizedValue: null, verificationStatus: "VERIFIED" },
    { signalType: "cash_flow", label: "Monthly cash-flow history", country: "GB", currencyCode: "GBP", normalizedValue: null, verificationStatus: "VERIFIED" },
    { signalType: "credit", label: "Credit assessment", country: "GB", currencyCode: "GBP", normalizedValue: null, verificationStatus: "VERIFIED" },
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
  const color = "#2563eb";

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
            <p className="text-xs text-blue-700 mt-0.5">All values on this page are illustrative and do not represent a real applicant or production assessment.</p>
          </div>
        </div>

        {/* Hero Score Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-8 pb-10 text-white text-center">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-6">Illustrative Cush Score</p>
            <div className="relative inline-block">
              <ScoreGauge score={data.score} />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-2xl font-bold">Example only</p>
              <div className="inline-block bg-emerald-500/20 border border-emerald-400/30 rounded-full px-4 py-1 mt-1">
                <span className="text-emerald-300 text-sm font-semibold">Illustrative confidence · {data.confidenceScore}/100</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span>Mode: Pre-Arrival</span>
              <span>·</span>
              <span>Illustrative values</span>
            </div>
          </div>

          <div className="bg-blue-50 border-t border-blue-100 px-6 py-4 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-0.5">About this assessment</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Your score updates as supported information is reviewed. Missing information is not treated as poor financial behaviour.
              </p>
            </div>
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
          <p className="text-slate-400 text-sm max-w-sm mx-auto">Build an individual assessment from supported financial history and evidence.</p>
          <Link href="/login">
            <button className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm shadow-lg shadow-blue-900/30">
              Build Your Passport
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        <div className="text-center pb-4 space-y-1">
          <p className="text-xs text-slate-400">This demonstration contains illustrative values only and is not a real assessment.</p>
        </div>
      </div>
    </div>
  );
}
