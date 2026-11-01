import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { API_BASE_URL } from "@/lib/api-base";

interface PublicPassportData {
  score: number | null;
  provisionalScore: number | null;
  confidenceScore: number | null;
  confidenceLabel: string;
  assessmentStatus: "not_started" | "incomplete" | "provisional" | "complete";
  missingRequirements: string[];
  mode: string;
  scoreBreakdown: {
    availableFunds: number | null;
    incomeStrength: number | null;
    cashFlow: number | null;
    creditHistory: number | null;
  } | null;
  weightedContributions: {
    availableFunds: number | null;
    incomeStrength: number | null;
    cashFlow: number | null;
    creditHistory: number | null;
  } | null;
  reasonCodes: string[];
  lastUpdated: string | null;
  evidence: {
    documentType: string;
    label: string;
    status: string;
    tier: number;
  }[];
}

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  SELF_REPORTED: { label: "Self-Reported", classes: "bg-slate-100 text-slate-600" },
  PENDING_REVIEW: { label: "Under Review", classes: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", classes: "bg-emerald-50 text-emerald-700 font-semibold" },
};

function ScoreGauge({
  score,
  provisionalScore,
  assessmentStatus,
}: {
  score: number | null;
  provisionalScore: number | null;
  assessmentStatus: PublicPassportData["assessmentStatus"];
}) {
  const displayScore = score ?? provisionalScore;
  const pct = displayScore === null ? 0 : Math.round((displayScore / 1000) * 100);
  const color = displayScore === null ? "#94a3b8" : "#2563eb";
  const statusLabel = {
    not_started: "Not started",
    incomplete: "Assessment incomplete",
    provisional: "Provisional — not a final score",
    complete: "Complete",
  }[assessmentStatus];

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
        <span className="text-6xl font-black" style={{ color }}>{displayScore ?? "—"}</span>
        <span className="text-slate-500 text-sm font-medium mt-1">out of 1,000</span>
        <span className="text-xs font-semibold text-slate-500 mt-1">{statusLabel}</span>
      </div>
    </div>
  );
}

export default function PublicPassport() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery<PublicPassportData>({
    queryKey: ["/api/passport/public", token],
    queryFn: () =>
      fetch(`${API_BASE_URL}/api/passport/public/${encodeURIComponent(token)}`, { credentials: "omit" }).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
    retry: false,
  });

  // Write view timestamp so the owner's dashboard can show "Recently viewed"
  useEffect(() => {
    if (data && token) {
      try {
        localStorage.setItem(`passport_viewed_${token}`, Date.now().toString());
      } catch {}
    }
  }, [data, token]);

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

  const breakdown = data.scoreBreakdown ?? {
    availableFunds: null,
    incomeStrength: null,
    cashFlow: null,
    creditHistory: null,
  };
  const verifiedCount = data.evidence.filter((e) => e.status === "VERIFIED").length;
  const pendingCount = data.evidence.filter((e) => e.status === "PENDING_REVIEW").length;
  const formattedDate = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "Unknown";

  const confidenceColor = data.confidenceScore === null
    ? "text-slate-400"
    : data.confidenceScore >= 70
      ? "text-emerald-600"
      : data.confidenceScore >= 40
        ? "text-amber-600"
        : "text-slate-500";

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
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Individual financial assessment</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Hero Score Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-8 pb-10 text-white text-center">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-6">Cush Score</p>

            <div className="relative inline-block">
              <ScoreGauge
                score={data.score}
                provisionalScore={data.provisionalScore}
                assessmentStatus={data.assessmentStatus}
              />
            </div>

            <div className="mt-4 space-y-1">
              {data.confidenceScore !== null && (
                <p className={`text-sm font-semibold ${confidenceColor} bg-white/10 inline-block px-3 py-1 rounded-full`}>
                  {data.confidenceLabel} confidence · {data.confidenceScore}/100
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span>Mode: {data.mode === "pre_arrival" ? "Pre-Arrival" : "Post-Arrival"}</span>
              <span>·</span>
              <span>Last updated {formattedDate}</span>
            </div>
          </div>

          {/* Score explanation */}
          <div className="bg-blue-50 border-t border-blue-100 px-6 py-4 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-0.5">About this assessment</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                The individual Cush Score combines available funds (35%), income strength (30%), cash-flow behaviour (20%), and credit history (15%).
                Missing information is shown as unavailable, not treated as poor financial behaviour.
              </p>
            </div>
          </div>
        </div>

        {data.missingRequirements.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 p-6">
            <h2 className="font-bold text-slate-900 mb-3">Requirements not yet met</h2>
            <ul className="space-y-2 list-disc pl-5 text-sm text-slate-600">
              {data.missingRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
            </ul>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-5">Score Breakdown</h2>
          <div className="space-y-4">
            {[
              { label: "Available funds", value: breakdown.availableFunds, contribution: data.weightedContributions?.availableFunds, weight: 35, color: "#2563eb" },
              { label: "Income strength", value: breakdown.incomeStrength, contribution: data.weightedContributions?.incomeStrength, weight: 30, color: "#10b981" },
              { label: "Cash-flow behaviour", value: breakdown.cashFlow, contribution: data.weightedContributions?.cashFlow, weight: 20, color: "#7c3aed" },
              { label: "Credit history", value: breakdown.creditHistory, contribution: data.weightedContributions?.creditHistory, weight: 15, color: "#f59e0b" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.weight}% of score</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {item.value === null ? "Not available" : <>{item.value}<span className="text-sm text-slate-400">/100</span></>}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.value ?? 0}%`, backgroundColor: item.color }}
                  />
                </div>
                {item.contribution !== null && item.contribution !== undefined && (
                  <p className="text-xs text-slate-400 mt-1">Weighted contribution: {item.contribution}/1000</p>
                )}
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
            This page shows the assessment status and available evidence. An incomplete or provisional assessment is not a final score.
          </p>
          <p className="text-xs text-slate-400">
            For verification queries, contact <span className="text-blue-600">verify@we-cush.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
