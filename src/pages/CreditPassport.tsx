import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence, animate as fmAnimate } from "framer-motion";
import {
  Globe2, TrendingUp, ShieldCheck, ChevronRight,
  Plus, Trash2, Link2, LogOut,
  FileCheck, Upload, BadgeCheck, Clock, AlertCircle,
  Plane, MapPin, Copy, Eye, EyeOff, FileText, Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PassportData {
  passport: {
    id: number; score: number; confidenceScore: number; mode: string;
    shareToken: string | null;
    scoreBreakdown: { incomeScore: number; surplusScore: number; stabilityScore: number } | null;
    reasonCodes: string[] | null; lastUpdated: string | null; generatedAt: string | null;
  };
  signals: Signal[];
  evidence: EvidenceItem[];
}
interface Signal {
  id: number; signalType: string; label: string; rawAmountCents: number;
  currencyCode: string; country: string; normalizedValue: string | null;
  verificationStatus: string; period: string;
}
interface EvidenceItem {
  id: number; documentType: string; label: string; status: string;
  tier: number; scoreBoost: number; fileName: string | null;
}
interface Benchmark {
  countryCode: string; countryName: string; currencyCode: string; pppMultiplier: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { documentType: "payslip",            label: "Monthly Payslip Declaration",      tier: 1, scoreBoost: 40, description: "Declare your most recent payslip amount" },
  { documentType: "bank_statement",     label: "Bank Balance Confirmation",        tier: 1, scoreBoost: 30, description: "Confirm your average monthly bank balance" },
  { documentType: "employment_contract",label: "Employment Status",                tier: 1, scoreBoost: 35, description: "Confirm employment type and duration" },
  { documentType: "payslip",            label: "Upload Payslip (PDF/Image)",       tier: 2, scoreBoost: 40, description: "Upload an actual payslip for verification" },
  { documentType: "bank_statement",     label: "Upload Bank Statement",            tier: 2, scoreBoost: 30, description: "Upload 3-month bank statement PDF" },
  { documentType: "tax_return",         label: "Upload Tax Return",                tier: 2, scoreBoost: 50, description: "Upload most recent tax assessment" },
  { documentType: "proof_of_residency", label: "Proof of Residency",              tier: 2, scoreBoost: 20, description: "Required for Post-Arrival mode" },
  { documentType: "transfer_receipt",   label: "International Transfer Receipt",   tier: 2, scoreBoost: 25, description: "Proves global asset movement capacity" },
];
const SIGNAL_TYPES = [
  { value: "income",    label: "Monthly Income",       color: "text-blue-600 bg-blue-50" },
  { value: "surplus",   label: "Monthly Surplus",      color: "text-emerald-600 bg-emerald-50" },
  { value: "transfer",  label: "Max Single Transfer",  color: "text-violet-600 bg-violet-50" },
  { value: "stability", label: "Stability Indicator",  color: "text-amber-600 bg-amber-50" },
];
const CONFETTI_COLORS = ["#2563eb","#10b981","#7c3aed","#f59e0b","#ef4444","#06b6d4","#ec4899"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiRequest(method: string, url: string, body?: unknown) {
  return fetch(url, {
    method, headers: { "Content-Type": "application/json" }, credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}
function getTier(score: number) {
  if (score >= 750) return "excellent";
  if (score >= 650) return "good";
  if (score >= 450) return "fair";
  return "building";
}
function scoreColor(s: number) {
  return s >= 750 ? "#10b981" : s >= 500 ? "#2563eb" : "#94a3b8";
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

function useTierChange(score: number) {
  const prevRef = useRef<string | null>(null);
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    const tier = getTier(score);
    if (prevRef.current !== null && tier !== prevRef.current) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 2200);
      return () => clearTimeout(t);
    }
    prevRef.current = tier;
  }, [score]);
  return burst;
}

// ─── Confetti Burst ───────────────────────────────────────────────────────────

function ConfettiBurst({ active }: { active: boolean }) {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    angle: (i / 18) * 360 + Math.sin(i) * 15,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    r: 55 + Math.abs(Math.sin(i * 1.7)) * 30,
    size: 4 + (i % 4),
    round: i % 3 !== 0,
  }));
  return (
    <AnimatePresence>
      {active && particles.map((p) => (
        <motion.div key={p.id}
          className="absolute pointer-events-none"
          style={{
            top: "50%", left: "50%", zIndex: 30,
            width: p.size, height: p.size,
            borderRadius: p.round ? "50%" : 2,
            backgroundColor: p.color,
            transformOrigin: "center",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.r,
            y: Math.sin((p.angle * Math.PI) / 180) * p.r - 25,
            opacity: 0, scale: 0.2, rotate: p.round ? 0 : 270,
          }}
          transition={{ duration: 0.85, ease: "easeOut" }}
        />
      ))}
    </AnimatePresence>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, confidence }: { score: number; confidence: number }) {
  const displayScore = useCountUp(score);
  const showConfetti = useTierChange(score);
  const r = 70, circ = 2 * Math.PI * r;
  const label = score >= 800 ? "Excellent" : score >= 650 ? "Good" : score >= 450 ? "Fair" : "Building";
  const confLabel = confidence >= 80 ? "High Confidence" : confidence >= 55 ? "Moderate" : confidence >= 30 ? "Building" : "Low";
  const confColor = confidence >= 80 ? "text-emerald-600" : confidence >= 55 ? "text-blue-600" : confidence >= 30 ? "text-amber-600" : "text-slate-500";
  const dColor = scoreColor(displayScore);
  const finalColor = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* confetti burst */}
        <div className="absolute inset-0 overflow-visible pointer-events-none flex items-center justify-center">
          <ConfettiBurst active={showConfetti} />
        </div>

        {/* pulse ring on score change */}
        <motion.div
          animate={showConfetti ? { scale: [1, 1.07, 0.96, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 0.55 }}
        >
          <svg width="168" height="168" viewBox="0 0 168 168" className="rotate-[-90deg]">
            <circle cx="84" cy="84" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
            <motion.circle
              cx="84" cy="84" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ, stroke: "#94a3b8" }}
              animate={{ strokeDashoffset: circ * (1 - score / 1000), stroke: finalColor }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </motion.div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
          <span className="text-[2.5rem] font-black leading-none transition-colors duration-150" style={{ color: dColor }}>
            {displayScore}
          </span>
          <span className="text-xs text-slate-400 font-medium">/ 1000</span>
          <span className="text-xs font-bold mt-1 transition-colors duration-150" style={{ color: dColor }}>{label}</span>
        </div>
      </div>

      <div className={`text-xs font-semibold ${confColor} flex items-center gap-1.5`}>
        <BadgeCheck className="w-3.5 h-3.5" />
        {confLabel} — {confidence}% Verified
      </div>
    </div>
  );
}

// ─── Floating Boost Indicator ─────────────────────────────────────────────────

function FloatingBoost({ pts, visible }: { pts: number; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute right-14 top-1/2 pointer-events-none z-20 font-black text-sm text-emerald-500 select-none"
          initial={{ opacity: 1, y: 0, scale: 0.7 }}
          animate={{ opacity: 0, y: -44, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          +{pts} pts
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Scanning Light Bar ───────────────────────────────────────────────────────

function ScanBar() {
  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-0 left-0 h-full w-1/3"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)" }}
        animate={{ x: ["0%", "300%"] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ─── Checklist Row ────────────────────────────────────────────────────────────

function ChecklistRow({
  item, existingEvidence, onAdd, isPending,
}: {
  item: typeof CHECKLIST_ITEMS[0]; existingEvidence: EvidenceItem[];
  onAdd: (data: unknown) => void; isPending: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showBoost, setShowBoost] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const wasSubmitted = useRef(false);

  const submitted = existingEvidence.find(
    (e) => e.documentType === item.documentType && e.tier === item.tier
  );

  // Detect completion transition
  useEffect(() => {
    if (submitted && !wasSubmitted.current) {
      setJustCompleted(true);
      setShowBoost(true);
      setScanning(false);
      const t1 = setTimeout(() => setJustCompleted(false), 800);
      const t2 = setTimeout(() => setShowBoost(false), 1500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    wasSubmitted.current = !!submitted;
  }, [submitted]);

  // Stop scanning when request resolves
  useEffect(() => {
    if (!isPending && scanning) setScanning(false);
  }, [isPending, scanning]);

  function handleFile(file: File) {
    setScanning(true);
    const reader = new FileReader();
    reader.onload = () => onAdd({
      documentType: item.documentType, label: item.label, tier: 2,
      fileData: reader.result as string, fileName: file.name,
    });
    reader.readAsDataURL(file);
  }

  const statusIcon = submitted ? (
    submitted.status === "VERIFIED" ? <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" /> :
    submitted.status === "PENDING_REVIEW" ? <Clock className="w-3.5 h-3.5 text-amber-500" /> :
    <FileCheck className="w-3.5 h-3.5 text-slate-400" />
  ) : null;
  const statusText = submitted ? (
    submitted.status === "VERIFIED" ? "Verified" :
    submitted.status === "PENDING_REVIEW" ? "Under Review" : "Self-Reported"
  ) : null;

  return (
    <motion.div
      layout
      className="relative"
      initial={false}
      animate={justCompleted
        ? { scale: [1, 1.02, 1], boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 0 6px rgba(16,185,129,0.2)", "0 0 0 0 rgba(16,185,129,0)"] }
        : { scale: 1, boxShadow: "0 0 0 0 rgba(16,185,129,0)" }
      }
      transition={{ duration: 0.45 }}
      style={{ borderRadius: 12 }}
    >
      <FloatingBoost pts={item.scoreBoost} visible={showBoost} />

      {/* Main row */}
      <div
        onDragOver={item.tier === 2 && !submitted ? (e) => { e.preventDefault(); setIsDragOver(true); } : undefined}
        onDragLeave={item.tier === 2 && !submitted ? () => setIsDragOver(false) : undefined}
        onDrop={item.tier === 2 && !submitted ? (e) => {
          e.preventDefault(); setIsDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        } : undefined}
        className={`relative flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-200 overflow-hidden ${
          submitted
            ? "border-emerald-200 bg-emerald-50/50"
            : isDragOver
            ? "border-blue-400 bg-blue-50/60"
            : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
        }`}
        style={isDragOver ? { boxShadow: "0 0 0 3px rgba(37,99,235,0.25), 0 0 20px rgba(37,99,235,0.15)" } : undefined}
      >
        {/* Scan bar overlay while processing */}
        {scanning && <ScanBar />}

        {/* Drag hint */}
        {isDragOver && !submitted && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 rounded-xl z-10 pointer-events-none">
            <p className="text-blue-600 text-xs font-bold flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Drop to upload
            </p>
          </div>
        )}

        {/* Scanning state overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center gap-3 px-4 bg-slate-50/95 rounded-xl z-10 pointer-events-none">
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600">Scanning document…</span>
          </div>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Animated checkbox */}
          <motion.div
            animate={justCompleted
              ? { scale: [1, 1.5, 0.85, 1.15, 1], rotate: [0, 0, -5, 5, 0] }
              : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
              submitted ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
            }`}
          >
            <AnimatePresence>
              {submitted && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="text-white text-xs font-bold"
                >
                  ✓
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${submitted ? "text-emerald-800" : "text-slate-800"}`}>
              {item.label}
            </p>
            <p className="text-xs text-slate-400 truncate">{item.description}</p>
            {submitted && statusIcon && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 mt-0.5"
              >
                {statusIcon}
                <span className="text-xs text-slate-500">{statusText}</span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
            +{item.scoreBoost} pts
          </span>
          {!submitted && (
            item.tier === 1 ? (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => onAdd({ documentType: item.documentType, label: item.label, tier: 1 })}
                disabled={isPending}
                className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Confirm
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => fileRef.current?.click()}
                  disabled={isPending}
                  className="flex items-center gap-1 text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </motion.button>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add Signal Form ──────────────────────────────────────────────────────────

function AddSignalForm({ benchmarks, onAdd, onCancel, isPending }: {
  benchmarks: Benchmark[]; onAdd: (data: unknown) => void;
  onCancel: () => void; isPending: boolean;
}) {
  const [form, setForm] = useState({ signalType: "income", label: "", rawAmount: "", country: "NG", period: "monthly" });
  const bm = benchmarks.find((b) => b.countryCode === form.country);
  const currencyCode = bm?.currencyCode ?? "NGN";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.rawAmount);
    if (isNaN(amt) || amt <= 0) return;
    onAdd({
      signalType: form.signalType,
      label: form.label || SIGNAL_TYPES.find((s) => s.value === form.signalType)?.label,
      rawAmountCents: Math.round(amt * 100), currencyCode, country: form.country, period: form.period,
    });
    setForm({ ...form, rawAmount: "", label: "" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm">Add Financial Signal</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xs">✕ Cancel</button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Signal Type</label>
            <select className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={form.signalType} onChange={(e) => setForm({ ...form, signalType: e.target.value })}>
              {SIGNAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
            <select className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              {benchmarks.map((b) => <option key={b.countryCode} value={b.countryCode}>{b.countryName} ({b.currencyCode})</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label (optional)</label>
          <input type="text" placeholder='e.g. "Primary employer salary"'
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Amount ({currencyCode})</label>
            <input type="number" step="0.01" min="0" required placeholder="0.00"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={form.rawAmount} onChange={(e) => setForm({ ...form, rawAmount: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
            <select className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={isPending || !form.rawAmount}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
          {isPending ? "Adding…" : "Add Signal"}
        </motion.button>
      </form>
    </motion.div>
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
          Your public link lets landlords verify your financial capacity without seeing raw data. Revoke it any time.
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
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"roadmap" | "signals">("roadmap");

  const { data, isLoading } = useQuery<PassportData>({
    queryKey: ["/api/passport/me"],
    queryFn: () => apiRequest("GET", "/api/passport/me"),
  });
  const { data: benchmarks = [] } = useQuery<Benchmark[]>({
    queryKey: ["/api/passport/benchmarks"],
    queryFn: () => apiRequest("GET", "/api/passport/benchmarks"),
  });

  const addSignalMutation = useMutation({
    mutationFn: (body: unknown) => apiRequest("POST", "/api/passport/signals", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/passport/me"] }); setShowSignalForm(false); toast({ title: "Signal added", description: "Score recalculated." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteSignalMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/passport/signals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/passport/me"] }),
  });
  const addEvidenceMutation = useMutation({
    mutationFn: (body: unknown) => apiRequest("POST", "/api/passport/evidence", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/passport/me"] }); toast({ title: "Evidence submitted", description: "Document queued for review." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    await qc.clear();
    setLocation("/");
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

  const { passport, signals = [], evidence = [] } = data ?? {
    passport: { id: 0, score: 0, confidenceScore: 0, mode: "pre_arrival", shareToken: null, scoreBreakdown: null, reasonCodes: null, lastUpdated: null, generatedAt: null },
    signals: [], evidence: [],
  };
  const breakdown = passport.scoreBreakdown ?? { incomeScore: 0, surplusScore: 0, stabilityScore: 0 };
  const completedItems = evidence.length;
  const maxItems = CHECKLIST_ITEMS.length;
  const potentialBoost = CHECKLIST_ITEMS
    .filter((item) => !evidence.find((e) => e.documentType === item.documentType && e.tier === item.tier))
    .reduce((acc, item) => acc + item.scoreBoost, 0);

  // Determine slide direction for mode toggle
  const modeDir = passport.mode === "post_arrival" ? 1 : -1;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 bg-[#2563eb] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">C</span>
              </div>
              <span className="font-bold text-slate-900 text-sm hidden sm:block">Cush Passport</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="text-slate-600 font-bold text-xs">
                  {(user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-slate-600 font-medium truncate max-w-32">
                {user?.firstName || user?.email?.split("@")[0] || "User"}
              </span>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </motion.button>
          </div>
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
                  <ScoreRing score={passport.score} confidence={passport.confidenceScore} />

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

                    {/* Score breakdown with slide animation on mode change */}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={passport.mode}
                        initial={{ x: modeDir * 24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -modeDir * 24, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="space-y-3"
                      >
                        {[
                          { label: "Income",    value: breakdown.incomeScore,    weight: "40%", color: "#2563eb" },
                          { label: "Surplus",   value: breakdown.surplusScore,   weight: "30%", color: "#10b981" },
                          { label: "Stability", value: breakdown.stabilityScore, weight: "30%", color: "#7c3aed" },
                        ].map((bar) => (
                          <div key={bar.label}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-slate-500 font-medium">{bar.label} <span className="text-slate-300">({bar.weight})</span></span>
                              <span className="font-bold text-slate-800">{bar.value}/100</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${bar.value}%` }}
                                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                                style={{ backgroundColor: bar.color }}
                              />
                            </div>
                          </div>
                        ))}
                        {passport.reasonCodes && passport.reasonCodes.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {passport.reasonCodes.map((code, i) => (
                              <motion.span
                                key={i}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.06 }}
                                className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full"
                              >
                                {code}
                              </motion.span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Strength bar */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-600">Passport Strength</span>
                    <span className="text-slate-400">{completedItems}/{maxItems} tasks complete</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedItems / maxItems) * 100}%` }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  {potentialBoost > 0 && (
                    <p className="text-xs text-blue-600 mt-1.5 font-medium">+{potentialBoost} pts potential boost remaining</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
              {([
                { key: "roadmap",  label: "Score Roadmap",      icon: TrendingUp },
                { key: "signals",  label: "Financial Signals",  icon: Globe2 },
              ] as const).map(({ key, label, icon: Icon }) => (
                <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                    activeTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                </motion.button>
              ))}
            </div>

            {/* Roadmap / Signals panels */}
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === "roadmap" ? (
                <motion.div key="roadmap"
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">Ways to Boost Your Score</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Complete tasks to unlock score points. Drag & drop files to upload.</p>
                    </div>
                  </div>
                  {CHECKLIST_ITEMS.map((item, i) => (
                    <ChecklistRow key={i} item={item} existingEvidence={evidence}
                      onAdd={(data) => addEvidenceMutation.mutate(data)}
                      isPending={addEvidenceMutation.isPending} />
                  ))}
                </motion.div>
              ) : (
                <motion.div key="signals"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">Financial Signals</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{signals.length} signal{signals.length !== 1 ? "s" : ""} declared</p>
                    </div>
                    {!showSignalForm && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowSignalForm(true)}
                        className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-semibold transition-colors">
                        <Plus className="w-3.5 h-3.5" />Add Signal
                      </motion.button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showSignalForm && (
                      <AddSignalForm benchmarks={benchmarks}
                        onAdd={(data) => addSignalMutation.mutate(data)}
                        onCancel={() => setShowSignalForm(false)}
                        isPending={addSignalMutation.isPending} />
                    )}
                  </AnimatePresence>

                  {signals.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                      <Globe2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-500">No signals yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add income, surplus, or stability signals to build your score</p>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowSignalForm(true)}
                        className="mt-4 flex items-center gap-1.5 text-xs bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold mx-auto hover:bg-slate-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" />Add First Signal
                      </motion.button>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {signals.map((signal) => {
                          const st = SIGNAL_TYPES.find((t) => t.value === signal.signalType);
                          const amt = (signal.rawAmountCents / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 });
                          return (
                            <motion.div key={signal.id}
                              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${st?.color ?? "bg-slate-100 text-slate-600"}`}>
                                  <TrendingUp className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{signal.label}</p>
                                  <p className="text-xs text-slate-400">{signal.currencyCode} {amt} / {signal.period} · {signal.country}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  signal.verificationStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-700" :
                                  signal.verificationStatus === "PENDING_REVIEW" ? "bg-amber-50 text-amber-700" :
                                  "bg-slate-100 text-slate-500"
                                }`}>
                                  {signal.verificationStatus === "VERIFIED" ? "Verified" :
                                   signal.verificationStatus === "PENDING_REVIEW" ? "Pending" : "Self-Reported"}
                                </span>
                                <motion.button whileTap={{ scale: 0.9 }}
                                  onClick={() => deleteSignalMutation.mutate(signal.id)}
                                  disabled={deleteSignalMutation.isPending}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
              <h3 className="font-bold text-slate-900 text-sm">Score Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Current Score", value: passport.score.toString(), sub: "/ 1000",    color: "text-[#2563eb]" },
                  { label: "Confidence",    value: `${passport.confidenceScore}%`, sub: "Verified", color: "text-emerald-600" },
                  { label: "Mode",          value: passport.mode === "pre_arrival" ? "Pre" : "Post", sub: "Arrival", color: "text-violet-600" },
                  { label: "Tasks Done",    value: `${completedItems}/${maxItems}`, sub: "Complete", color: "text-amber-600" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-slate-400 font-medium">{sub}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Wins */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />Quick Wins
              </h3>
              {[
                { tip: "Add your monthly income signal",   pts: "+40 pts", dtype: "payslip" },
                { tip: "Confirm your employment status",   pts: "+35 pts", dtype: "employment_contract" },
                { tip: "Upload a bank statement PDF",      pts: "+30 pts", dtype: "bank_statement" },
              ].map(({ tip, pts, dtype }) => {
                const done = evidence.some((e) => e.documentType === dtype);
                return (
                  <motion.div key={tip} whileHover={!done ? { x: 3 } : {}} transition={{ duration: 0.15 }}
                    onClick={() => !done && setActiveTab("roadmap")}
                    className={`flex items-center justify-between gap-2 p-3 rounded-xl text-xs ${
                      done ? "bg-emerald-50 opacity-60" : "bg-slate-50 hover:bg-slate-100 cursor-pointer"
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-2">
                      {done
                        ? <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      }
                      <span className={done ? "text-emerald-700 line-through" : "text-slate-700"}>{tip}</span>
                    </div>
                    <span className="font-bold text-blue-600 whitespace-nowrap">{pts}</span>
                  </motion.div>
                );
              })}
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
