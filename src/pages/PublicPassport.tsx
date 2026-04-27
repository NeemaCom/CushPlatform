import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";

interface PublicPassportData {
  score: number;
  confidenceScore: number;
  confidenceLabel: string;
  mode: string;
  scoreBreakdown: { incomeScore: number; surplusScore: number; stabilityScore: number } | null;
  reasonCodes: string[];
  lastUpdated: string | null;
  evidence: {
    documentType: string;
    label: string;
    status: string;
    tier: number;
  }[];
  signals: {
    signalType: string;
    label: string;
    country: string;
    currencyCode: string;
    normalizedValue: string | null;
    verificationStatus: string;
  }[];
}

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  SELF_REPORTED: { label: "Self-Reported", classes: "bg-slate-100 text-slate-600" },
  PENDING_REVIEW: { label: "Under Review", classes: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", classes: "bg-emerald-50 text-emerald-700 font-semibold" },
};

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.round((score / 1000) * 100);
  const color =
    score >= 750 ? "#10b981" :
    score >= 550 ? "#2563eb" :
    score >= 350 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="220" viewBox="0 0 220 220" className="rotate-[-90deg]">
        <circle cx="110" cy="110" r="92" fill="none" stroke="#e2e8f0" strokeWidth="16" />
        <circle
          cx="110" cy="110" r="92" fill="none"
          stroke={color}
          strokeWidth="16"
          strokeDasharray={`${2 * Math.PI * 92}`}
          strokeDashoffset={`${2 * Math.PI * 92 * (1 - pct / 100)}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: "0px" }}>
        <span className="text-6xl font-black" style={{ color }}>{score}</span>
        <span className="text-slate-500 text-sm font-medium mt-1">out of 1,000</span>
      </div>
    </div>
  );
}

export default function PublicPassport() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery<PublicPassportData>({
    queryKey: ["/api/passport/public", token],
    queryFn: () =>
      fetch(`/api/passport/public/${token}`, { credentials: "omit" }).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Passport Not Found</h1>
        <p className="text-slate-500 text-sm max-w-sm">This passport link may have expired or been revoked by the owner.</p>
      </div>
    );
  }

  const breakdown = data.scoreBreakdown ?? { incomeScore: 0, surplusScore: 0, stabilityScore: 0 };
  const verifiedCount = data.evidence.filter((e) => e.status === "VERIFIED").length;
  const pendingCount = data.evidence.filter((e) => e.status === "PENDING_REVIEW").length;
  const formattedDate = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "Unknown";

  const confidenceColor =
    data.confidenceScore >= 80 ? "text-emerald-600" :
    data.confidenceScore >= 55 ? "text-blue-600" :
    data.confidenceScore >= 30 ? "text-amber-600" : "text-slate-500";

  const scoreLabel =
    data.score >= 800 ? "Excellent" :
    data.score >= 650 ? "Good" :
    data.score >= 500 ? "Fair" : "Building";

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">C</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">Cush Passport</span>
          </div>
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Verified Financial Identity</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Hero Score Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-8 pb-10 text-white text-center">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-6">Cush Global Credit Score</p>

            <div className="relative inline-block">
              <ScoreGauge score={data.score} />
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-2xl font-bold">{scoreLabel}</p>
              <p className={`text-sm font-semibold ${confidenceColor.replace("text-", "text-")} bg-white/10 inline-block px-3 py-1 rounded-full`}>
                {data.confidenceLabel} — {data.confidenceScore}% Verified
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span>Mode: {data.mode === "pre_arrival" ? "Pre-Arrival" : "Post-Arrival"}</span>
              <span>·</span>
              <span>Last updated {formattedDate}</span>
            </div>
          </div>

          {/* Landlord Info Banner */}
          <div className="bg-blue-50 border-t border-blue-100 px-6 py-4 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-0.5">How to read this score</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                We measure financial discipline relative to local cost-of-living to prove global reliability.
                A score of 600+ indicates the applicant is a significantly above-average earner in their home economy —
                not just in raw currency terms.
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
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason Codes */}
        {data.reasonCodes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4">Key Financial Indicators</h2>
            <div className="space-y-2">
              {data.reasonCodes.map((code, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-600 text-xs">✓</span>
                  </div>
                  <p className="text-sm text-slate-700">{code}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Evidence Summary</h2>
            <div className="flex gap-2 text-xs">
              <span className="bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">{verifiedCount} Verified</span>
              {pendingCount > 0 && (
                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">{pendingCount} Pending</span>
              )}
            </div>
          </div>
          {data.evidence.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No documents submitted.</p>
          ) : (
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
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-4 space-y-1">
          <p className="text-xs text-slate-400">
            This report was generated by Cush and reflects self-reported and verified financial data.
          </p>
          <p className="text-xs text-slate-400">
            For verification queries, contact <span className="text-blue-600">verify@we-cush.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
