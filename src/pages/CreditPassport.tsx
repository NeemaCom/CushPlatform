import { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-base";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import AccountDropdown from "@/components/AccountDropdown";
import { logoutFromCush } from "@/lib/logout";
import { motion, AnimatePresence, animate as fmAnimate } from "framer-motion";
import V2AssessmentPanel from "@/components/passport/V2AssessmentPanel";
import { ADMIN_PERMISSION, hasAdminPermission } from "@shared/admin-permissions";
import {
  ChevronRight, Link2,
  BadgeCheck, AlertCircle,
  Plane, MapPin, Copy, Eye, EyeOff, Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PassportData {
  passport: {
    id: number; score: number | null; provisionalScore: number | null;
    scoreCoveragePercent: number;
    confidenceScore: number | null; mode: string;
    assessmentStatus: "not_started" | "incomplete" | "provisional" | "complete";
    algorithmVersion: string; missingRequirements: string[];
    shareToken: string | null;
    reasonCodes: string[] | null; lastUpdated: string | null; generatedAt: string | null;
  };
}
// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────


function apiRequest(method: string, url: string, body?: unknown) {
  return fetch(`${API_BASE_URL}${url}`, {
    method, headers: { "Content-Type": "application/json" }, credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}
// ─── Custom Hooks ─────────────────────────────────────────────────────────────

function useCountUp(target: number) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    if (from === target) return;
    const ctrl = fmAnimate(from, target, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prevRef.current = target;
    return () => ctrl.stop();
  }, [target]);
  return display;
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  provisionalScore,
  scoreCoveragePercent,
  confidence,
  assessmentStatus,
}: {
  score: number | null;
  provisionalScore: number | null;
  scoreCoveragePercent: number;
  confidence: number | null;
  assessmentStatus: "not_started" | "incomplete" | "provisional" | "complete";
}) {
  const availableScore = score ?? provisionalScore;
  const displayScore = useCountUp(availableScore ?? 0);
  const r = 70, circ = 2 * Math.PI * r;
  const scoreHue = availableScore === null ? null : Math.round(Math.max(0, Math.min(1000, availableScore)) / 1000 * 120);
  const scoreColor = scoreHue === null ? "#94a3b8" : `hsl(${scoreHue} 72% 42%)`;
  const statusLabel = {
    not_started: "Not started",
    incomplete: "Assessment incomplete",
    provisional: "Provisional",
    complete: "Complete",
  }[assessmentStatus];
  const confidenceLabel = confidence === null
    ? "Confidence pending"
    : confidence >= 70
      ? "High confidence"
      : confidence >= 40
        ? "Medium confidence"
        : "Low confidence";
  const confidenceColor = confidence === null
    ? "text-slate-400"
    : confidence >= 70
      ? "text-emerald-600"
      : confidence >= 40
        ? "text-amber-600"
        : "text-slate-500";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="168" height="168" viewBox="0 0 168 168" className="rotate-[-90deg]">
          <circle cx="84" cy="84" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          <motion.circle
            cx="84" cy="84" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circ}
            animate={{
              strokeDashoffset: availableScore === null ? circ : circ * (1 - availableScore / 1000),
              stroke: scoreColor,
            }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
          <span className="text-[2.5rem] font-black leading-none text-slate-700">
            {availableScore === null ? "—" : displayScore}
          </span>
          <span className="text-xs text-slate-400 font-medium">/ 1000</span>
          <span className="text-xs font-bold mt-1 text-slate-600">{statusLabel}</span>
        </div>
      </div>

      <div className={`text-xs font-semibold ${confidenceColor} flex items-center gap-1.5`}>
        {confidence !== null && <BadgeCheck className="w-3.5 h-3.5" />}
        {confidence === null ? confidenceLabel : `${confidenceLabel} · ${confidence}/100`}
      </div>
      <div className="text-center text-xs text-slate-500" aria-live="polite">
        {scoreCoveragePercent}% assessment progress
      </div>
    </div>
  );
}

// ─── Share Panel ──────────────────────────────────────────────────────────────

function SharePanel({
  shareToken, onGenerate, onRevoke, isGenerating,
}: {
  shareToken: string | null; onGenerate: () => void; onRevoke: () => void; isGenerating: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const publicUrl = shareToken ? `${window.location.origin}/passport/${shareToken}` : null;

  // Live view: check localStorage for recent views (set by PublicPassport page)
  const lastViewedRaw = shareToken ? localStorage.getItem(`passport_viewed_${shareToken}`) : null;
  const lastViewedMs = lastViewedRaw ? parseInt(lastViewedRaw) : null;
  const viewedRecently = lastViewedMs ? (Date.now() - lastViewedMs) < 24 * 3600 * 1000 : false;
  const minutesAgo = lastViewedMs ? Math.max(1, Math.round((Date.now() - lastViewedMs) / 60000)) : null;

  function copy() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (!shareToken) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/30 rounded-xl flex items-center justify-center">
            <Link2 className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <p className="font-bold text-sm">Share Your Passport</p>
            <p className="text-slate-400 text-xs">Generate a secure link for landlords & lenders</p>
          </div>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          Your public link lets viewers review your assessment status and listed evidence without seeing raw document contents. Revoke it any time.
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }} onClick={onGenerate} disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
        >
          <Link2 className="w-4 h-4" />
          {isGenerating ? "Generating…" : "Generate Passport Link"}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <BadgeCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Passport Link Active</p>
            <p className="text-slate-400 text-xs">Anyone with this link can view your score</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-2 py-0.5">
          <motion.div
            className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-emerald-300 text-xs font-semibold">Live</span>
        </div>
      </div>

      {/* Live view indicator */}
      <AnimatePresence>
        {viewedRecently && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 bg-blue-500/15 border border-blue-400/25 rounded-xl px-3 py-2"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <div>
              <p className="text-blue-200 text-xs font-semibold">Recently viewed</p>
              <p className="text-blue-300/70 text-xs">
                {minutesAgo === 1 ? "Just now" : minutesAgo && minutesAgo < 60
                  ? `${minutesAgo} min ago`
                  : `${Math.round((minutesAgo ?? 0) / 60)}h ago`}
              </p>
            </div>
            <Users className="w-3.5 h-3.5 text-blue-400 ml-auto flex-shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link preview */}
      <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-slate-300 text-xs font-mono truncate flex-1">
          {showLink ? publicUrl : `${window.location.origin}/passport/••••••••`}
        </span>
        <button onClick={() => setShowLink(!showLink)} className="text-slate-400 hover:text-slate-200 flex-shrink-0">
          {showLink ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Animated copy button */}
        <motion.button
          onClick={copy}
          animate={{ backgroundColor: copied ? "#10b981" : "#2563eb" }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-2.5 rounded-xl overflow-hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span key="copied" className="flex items-center gap-1"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}>
                ✓ Copied!
              </motion.span>
            ) : (
              <motion.span key="copy" className="flex items-center gap-1.5"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}>
                <Copy className="w-3.5 h-3.5" />Copy Link
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          onClick={onRevoke} whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-red-500/20 hover:border-red-500/30 border border-white/10 text-slate-300 hover:text-red-300 text-xs font-semibold py-2.5 rounded-xl transition-all"
        >
          <AlertCircle className="w-3.5 h-3.5" />Revoke Access
        </motion.button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function CreditPassport() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [monoCodePending, setMonoCodePending] = useState(false);
  const monoCodeProcessed = useRef(false);

  useEffect(() => {
    const callbackUrl = new URL(window.location.href);
    const monoCode = callbackUrl.searchParams.get("code");
    if (!monoCode || monoCodeProcessed.current) return;
    monoCodeProcessed.current = true;
    setMonoCodePending(true);
    callbackUrl.searchParams.delete("code");
    window.history.replaceState({}, "", `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);
    apiRequest("POST", "/api/mono/connect/exchange", { code: monoCode })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["/api/mono/accounts"] });
        toast({ title: "Bank connected", description: "Mono linked the account to your Cush profile." });
      })
      .catch((error: Error) => {
        toast({ title: "Could not finish bank connection", description: error.message, variant: "destructive" });
      })
      .finally(() => setMonoCodePending(false));
  }, [qc, toast]);

  const { data, isLoading } = useQuery<PassportData>({
    queryKey: ["/api/passport/me"],
    queryFn: () => apiRequest("GET", "/api/passport/me"),
  });
  const toggleModeMutation = useMutation({
    mutationFn: (mode: string) => apiRequest("PUT", "/api/passport/mode", { mode }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/passport/me"] }); toast({ title: "Mode updated" }); },
    onError: (e: any) => toast({ title: "Cannot switch mode", description: e.message?.includes("Proof of Residency") ? "Upload Proof of Residency first." : e.message, variant: "destructive" }),
  });
  const generateTokenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/passport/generate-token"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/passport/me"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const revokeTokenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/passport/generate-token"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/passport/me"] }); toast({ title: "Access revoked", description: "Old link is now invalid." }); },
  });

  async function handleLogout() {
    await logoutFromCush();
    await qc.cancelQueries();
    await qc.clear();
    setLocation("/login");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  const { passport } = data ?? {
    passport: {
      id: 0,
      score: null,
      provisionalScore: null,
      scoreCoveragePercent: 0,
      confidenceScore: null,
      assessmentStatus: "not_started" as const,
      algorithmVersion: "2.2.0",
      missingRequirements: [],
      mode: "pre_arrival",
      shareToken: null,
      reasonCodes: null,
      lastUpdated: null,
      generatedAt: null,
    },
  };
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" aria-label="Cush Passport home">
            <img
              src="/cush-wordmark.png"
              alt="Cush Passport"
              className="h-8 w-36 cursor-pointer object-cover object-center sm:w-40"
              width={160}
              height={32}
            />
          </Link>
          {user && hasAdminPermission(user.role, ADMIN_PERMISSION.dashboardRead) && (
            <Link
              href="/admin"
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100"
            >
              Admin
            </Link>
          )}
          {user && <AccountDropdown user={user} onSignOut={handleLogout} />}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">

          {/* ── Left Column ──────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Score Center Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <ScoreRing
                    score={passport.score}
                    provisionalScore={passport.provisionalScore}
                    scoreCoveragePercent={passport.scoreCoveragePercent}
                    confidence={passport.confidenceScore}
                    assessmentStatus={passport.assessmentStatus}
                  />

                  <div className="flex-1 space-y-5 w-full">
                    {/* Mode toggle */}
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Migration Mode</p>
                      <div className="flex p-1 bg-slate-100 rounded-xl gap-1 w-fit">
                        {[
                          { val: "pre_arrival",  label: "Pre-Arrival",  icon: Plane },
                          { val: "post_arrival", label: "Post-Arrival", icon: MapPin },
                        ].map(({ val, label, icon: Icon }) => (
                          <motion.button key={val} whileTap={{ scale: 0.95 }}
                            onClick={() => toggleModeMutation.mutate(val)}
                            disabled={toggleModeMutation.isPending || passport.mode === val}
                            className={`relative flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-colors duration-200 ${
                              passport.mode === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900">
                        {passport.assessmentStatus === "not_started" ? "Assessment not started" :
                          passport.assessmentStatus === "provisional" ? "Provisional assessment" :
                            passport.assessmentStatus === "complete" ? "Assessment complete" : "Assessment incomplete"}
                      </p>
                      {passport.missingRequirements.length > 0 && (
                        <ul className="mt-2 space-y-1 list-disc pl-4 text-xs text-amber-800">
                          {passport.missingRequirements.map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strength bar */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-600">Assessment progress</span>
                    <span className="text-slate-400">{passport.scoreCoveragePercent}%</span>
                  </div>
                  <div
                    className="h-2 bg-slate-100 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-label="Scoring criteria coverage"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={passport.scoreCoveragePercent}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${passport.scoreCoveragePercent}%` }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      style={{ background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 52%, #10b981 100%)" }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Your score updates as supported information is reviewed. Missing information is not treated as a zero.
                  </p>
                </div>
              </div>
            </motion.div>

            <section id="assessment-tasks" className="space-y-4">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Your assessment</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Complete the two steps below. Your score updates as eligible information is reviewed.
                </p>
              </div>
              {monoCodePending && <p className="text-xs text-blue-700" role="status">Finishing Mono bank connection…</p>}
              <V2AssessmentPanel />
            </section>
          </div>

          {/* ── Right Sidebar ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
            className="space-y-5"
          >
            <SharePanel
              shareToken={passport.shareToken}
              onGenerate={() => generateTokenMutation.mutate()}
              onRevoke={() => revokeTokenMutation.mutate()}
              isGenerating={generateTokenMutation.isPending || revokeTokenMutation.isPending}
            />

            {/* Score Stats */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Assessment overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Cush Score", value: passport.score !== null ? String(passport.score) : passport.provisionalScore !== null ? String(passport.provisionalScore) : "—", sub: passport.score !== null ? "/ 1000" : passport.provisionalScore !== null ? "Provisional" : "Incomplete", color: "text-[#2563eb]" },
                  { label: "Confidence", value: passport.confidenceScore === null ? "—" : `${passport.confidenceScore}/100`, sub: passport.confidenceScore === null ? "Pending" : "Evidence quality", color: "text-emerald-600" },
                  { label: "Mode",          value: passport.mode === "pre_arrival" ? "Pre" : "Post", sub: "Arrival", color: "text-violet-600" },
                    { label: "Progress", value: `${passport.scoreCoveragePercent}%`, sub: "Assessment", color: "text-[#342ca8]" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-slate-400 font-medium">{sub}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#2926a5] to-[#5148df] p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">Your next steps</p>
              <h3 className="mt-2 text-lg font-bold">Build your Cush Score</h3>
              <p className="mt-2 text-sm leading-relaxed text-indigo-50">
                Connect a bank for statements and complete the required Credit Check. Your score updates as supported information is reviewed.
              </p>
              <button
                type="button"
                onClick={() => document.getElementById("assessment-tasks")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2926a5] transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2926a5]"
              >
                Open assessment <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="mt-3 text-xs text-indigo-100">
                Missing inputs are excluded from your provisional score, not counted as zero.
              </p>
            </div>

            {passport.lastUpdated && (
              <p className="text-xs text-slate-400 text-center">
                Last updated {new Date(passport.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
