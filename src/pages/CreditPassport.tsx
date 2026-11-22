import { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-base";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import AccountDropdown from "@/components/AccountDropdown";
import { logoutFromCush } from "@/lib/logout";
import { motion, AnimatePresence, animate as fmAnimate } from "framer-motion";
import PassportJourneyDashboard from "@/components/passport/PassportJourneyDashboard";
import { ADMIN_PERMISSION, hasAdminPermission } from "@shared/admin-permissions";
import {
  ChevronRight, Link2,
  BadgeCheck, AlertCircle,
  Copy, Eye, EyeOff, Users,
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
  progression?: {
    maturityStatus: "getting_started" | "provisional" | "evidence_supported" | "institution_supported";
    sourceTypes: string[];
    preArrival: { completed: number; total: number; percent: number };
    postArrival: { completed: number; total: number; percent: number; activated: boolean };
    documents: { submitted: number; approved: number };
    nextActions: string[];
    historyReady: boolean;
    history: Array<{
      id: number;
      previousScore: number | null;
      score: number | null;
      previousConfidence: number | null;
      confidence: number | null;
      scoreCoveragePercent: number;
      assessmentStatus: string;
      maturityStatus: string;
      sourceTypes: string[];
      changedInformation: string[];
      changeSummary: string;
      createdAt: string;
    }>;
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
  confidence,
  assessmentStatus,
}: {
  score: number | null;
  provisionalScore: number | null;
  confidence: number | null;
  assessmentStatus: "not_started" | "incomplete" | "provisional" | "complete";
}) {
  const availableScore = score ?? provisionalScore;
  const displayScore = useCountUp(availableScore ?? 0);
  const scoreProgress = availableScore === null ? 0 : Math.max(0, Math.min(1000, availableScore)) / 1000;
  const scoreHue = availableScore === null ? null : Math.round(scoreProgress * 120);
  const scoreColor = scoreHue === null ? "#94a3b8" : `hsl(${scoreHue} 72% 42%)`;
  const statusLabel = {
    not_started: "Not started",
    incomplete: "Assessment incomplete",
    provisional: "Provisional",
    complete: "Complete",
  }[assessmentStatus];
  const statusStyle = {
    not_started: "border-slate-200 bg-slate-50 text-slate-600",
    incomplete: "border-amber-200 bg-amber-50 text-amber-800",
    provisional: "border-indigo-200 bg-indigo-50 text-indigo-700",
    complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[assessmentStatus];
  const confidenceLabel = confidence === null
    ? "Pending"
    : confidence >= 70
      ? "High"
      : confidence >= 40
        ? "Medium"
        : "Low";
  const confidenceStyle = confidence === null
    ? "border-slate-200 bg-white text-slate-500"
    : confidence >= 70
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : confidence >= 40
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className="grid w-full grid-cols-[88px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[104px_minmax(0,1fr)]">
      <div className="relative h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]">
        <svg
          width="104"
          height="104"
          viewBox="0 0 104 104"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={availableScore === null
            ? `Cush score ${statusLabel.toLowerCase()}`
            : `Cush score ${displayScore} out of 1000, ${statusLabel.toLowerCase()}`}
        >
          <circle cx="52" cy="52" r="43" fill="none" stroke="#e9edf5" strokeWidth="8" />
          <motion.circle
            cx="52" cy="52" r="43" fill="none" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 43}
            animate={{
              strokeDashoffset: 2 * Math.PI * 43 * (1 - scoreProgress),
              stroke: scoreColor,
            }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold leading-none tracking-tight text-slate-900 sm:text-[1.7rem]">
            {availableScore === null ? "—" : displayScore}
          </span>
          <span className="mt-1 text-[9px] font-semibold tracking-wide text-slate-500">/ 1,000</span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Cush Score</p>
            <p className="mt-1 text-xs text-slate-500">Your assessment</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <BadgeCheck className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-800">Confidence</span>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${confidenceStyle}`}>
              {confidence === null ? "Pending" : `${confidence}/100`}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100"
            role="progressbar"
            aria-label="Confidence in the evidence"
            aria-valuemin={0}
            aria-valuemax={100}
            {...(confidence === null ? {} : { "aria-valuenow": confidence })}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              initial={false}
              animate={{ width: `${confidence ?? 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
            {confidence === null ? "Calculated as evidence is reviewed" : `${confidenceLabel} evidence quality · separate from Score`}
          </p>
        </div>
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
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
            <Link2 className="h-4 w-4 text-indigo-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Share your Passport</p>
            <p className="text-xs text-slate-500">Create a private link for a reviewer</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
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
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
            <BadgeCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Passport link active</p>
            <p className="text-xs text-slate-500">Reviewers can view the information you share</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5">
          <motion.div
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-xs font-semibold text-emerald-800">Live</span>
        </div>
      </div>

      {/* Live view indicator */}
      <AnimatePresence>
        {viewedRecently && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2"
          >
            <motion.div
              className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <div>
              <p className="text-xs font-semibold text-blue-900">Recently viewed</p>
              <p className="text-xs text-blue-700">
                {minutesAgo === 1 ? "Just now" : minutesAgo && minutesAgo < 60
                  ? `${minutesAgo} min ago`
                  : `${Math.round((minutesAgo ?? 0) / 60)}h ago`}
              </p>
            </div>
            <Users className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link preview */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="flex-1 truncate font-mono text-xs text-slate-600">
          {showLink ? publicUrl : `${window.location.origin}/passport/••••••••`}
        </span>
        <button onClick={() => setShowLink(!showLink)} className="flex-shrink-0 text-slate-500 hover:text-slate-900" aria-label={showLink ? "Hide Passport link" : "Show Passport link"}>
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
          className="flex items-center justify-center gap-1.5 overflow-hidden rounded-xl py-2.5 text-xs font-semibold text-white"
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
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
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
  const toggleModeMutation = useMutation<
    { passport: PassportData["passport"] },
    Error,
    "pre_arrival" | "post_arrival",
    { previous: PassportData | undefined }
  >({
    mutationFn: async (mode) => {
      const result = await apiRequest("PUT", "/api/passport/mode", { mode });
      if (result?.passport?.mode !== mode) {
        throw new Error("We could not save the selected stage. Please try again.");
      }
      return result as { passport: PassportData["passport"] };
    },
    onMutate: async (mode: string) => {
      const key = ["/api/passport/me"];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PassportData>(key);
      if (previous) {
        qc.setQueryData<PassportData>(key, {
          ...previous,
          passport: { ...previous.passport, mode },
        });
      }
      return { previous };
    },
    onSuccess: (result: { passport: PassportData["passport"] }, mode) => {
      qc.setQueryData<PassportData>(["/api/passport/me"], (current) =>
        current
          ? { ...current, passport: { ...current.passport, ...result.passport } }
          : current,
      );
      const isPostArrival = mode === "post_arrival";
      toast({
        title: isPostArrival ? "Post-Arrival selected" : "Pre-Arrival selected",
        description: isPostArrival
          ? "Your UK profile and financial-history tools are ready."
          : "Your Pre-Arrival assessment steps are ready.",
        className: isPostArrival
          ? "border-emerald-300 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl"
          : "border-indigo-300 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-700 text-white shadow-xl",
      });
    },
    onError: (e: Error, _mode, context) => {
      if (context?.previous) qc.setQueryData(["/api/passport/me"], context.previous);
      toast({ title: "Cannot switch mode", description: e.message, variant: "destructive" });
    },
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

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        <PassportJourneyDashboard
          passport={passport}
          progression={data?.progression}
          scoreSummary={(
            <ScoreRing
              score={passport.score}
              provisionalScore={passport.provisionalScore}
              confidence={passport.confidenceScore}
              assessmentStatus={passport.assessmentStatus}
            />
          )}
          sharePanel={(
            <SharePanel
              shareToken={passport.shareToken}
              onGenerate={() => generateTokenMutation.mutate()}
              onRevoke={() => revokeTokenMutation.mutate()}
              isGenerating={generateTokenMutation.isPending || revokeTokenMutation.isPending}
            />
          )}
          modePending={toggleModeMutation.isPending}
          monoCodePending={monoCodePending}
          onModeChange={(mode) => toggleModeMutation.mutateAsync(mode)}
        />
      </main>
    </div>
  );
}
