import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Globe2, TrendingUp, ShieldCheck, ChevronRight,
  Plus, Trash2, Link2, RotateCcw, LogOut,
  FileCheck, Upload, BadgeCheck, Clock, AlertCircle,
  Plane, MapPin, Copy, Eye, EyeOff
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PassportData {
  passport: {
    id: number;
    score: number;
    confidenceScore: number;
    mode: string;
    shareToken: string | null;
    scoreBreakdown: { incomeScore: number; surplusScore: number; stabilityScore: number } | null;
    reasonCodes: string[] | null;
    lastUpdated: string | null;
    generatedAt: string | null;
  };
  signals: Signal[];
  evidence: EvidenceItem[];
}

interface Signal {
  id: number;
  signalType: string;
  label: string;
  rawAmountCents: number;
  currencyCode: string;
  country: string;
  normalizedValue: string | null;
  verificationStatus: string;
  period: string;
}

interface EvidenceItem {
  id: number;
  documentType: string;
  label: string;
  status: string;
  tier: number;
  scoreBoost: number;
  fileName: string | null;
}

interface Benchmark {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  pppMultiplier: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { documentType: "payslip", label: "Monthly Payslip Declaration", tier: 1, scoreBoost: 40, description: "Declare your most recent payslip amount" },
  { documentType: "bank_statement", label: "Bank Balance Confirmation", tier: 1, scoreBoost: 30, description: "Confirm your average monthly bank balance" },
  { documentType: "employment_contract", label: "Employment Status", tier: 1, scoreBoost: 35, description: "Confirm employment type and duration" },
  { documentType: "payslip", label: "Upload Payslip (PDF/Image)", tier: 2, scoreBoost: 40, description: "Upload an actual payslip for verification" },
  { documentType: "bank_statement", label: "Upload Bank Statement", tier: 2, scoreBoost: 30, description: "Upload 3-month bank statement PDF" },
  { documentType: "tax_return", label: "Upload Tax Return", tier: 2, scoreBoost: 50, description: "Upload most recent tax assessment" },
  { documentType: "proof_of_residency", label: "Proof of Residency", tier: 2, scoreBoost: 20, description: "Required for Post-Arrival mode" },
  { documentType: "transfer_receipt", label: "International Transfer Receipt", tier: 2, scoreBoost: 25, description: "Proves global asset movement capacity" },
];

const SIGNAL_TYPES = [
  { value: "income", label: "Monthly Income", color: "text-blue-600 bg-blue-50" },
  { value: "surplus", label: "Monthly Surplus", color: "text-emerald-600 bg-emerald-50" },
  { value: "transfer", label: "Max Single Transfer", color: "text-violet-600 bg-violet-50" },
  { value: "stability", label: "Stability Indicator", color: "text-amber-600 bg-amber-50" },
];

function apiRequest(method: string, url: string, body?: unknown) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, confidence }: { score: number; confidence: number }) {
  const pct = Math.round((score / 1000) * 100);
  const r = 70;
  const circ = 2 * Math.PI * r;
  const color = score >= 750 ? "#10b981" : score >= 500 ? "#2563eb" : "#94a3b8";

  const label = score >= 800 ? "Excellent" : score >= 650 ? "Good" : score >= 450 ? "Fair" : "Building";
  const confLabel = confidence >= 80 ? "High Confidence" : confidence >= 55 ? "Moderate" : confidence >= 30 ? "Building" : "Low";
  const confColor = confidence >= 80 ? "text-emerald-600" : confidence >= 55 ? "text-blue-600" : confidence >= 30 ? "text-amber-600" : "text-slate-500";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="168" height="168" viewBox="0 0 168 168" className="rotate-[-90deg]">
          <circle cx="84" cy="84" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          <circle cx="84" cy="84" r={r} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[2.5rem] font-black text-slate-900 leading-none">{score}</span>
          <span className="text-xs text-slate-400 font-medium">/ 1000</span>
          <span className="text-xs font-bold mt-1" style={{ color }}>{label}</span>
        </div>
      </div>
      <div className={`text-xs font-semibold ${confColor} flex items-center gap-1.5`}>
        <BadgeCheck className="w-3.5 h-3.5" />
        {confLabel} — {confidence}% Verified
      </div>
    </div>
  );
}

// ─── Checklist Row ────────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  existingEvidence,
  onAdd,
  isPending,
}: {
  item: typeof CHECKLIST_ITEMS[0];
  existingEvidence: EvidenceItem[];
  onAdd: (data: unknown) => void;
  isPending: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const submitted = existingEvidence.find(
    (e) => e.documentType === item.documentType && e.tier === item.tier
  );

  const statusIcon = submitted ? (
    submitted.status === "VERIFIED"
      ? <BadgeCheck className="w-4 h-4 text-emerald-500" />
      : submitted.status === "PENDING_REVIEW"
      ? <Clock className="w-4 h-4 text-amber-500" />
      : <FileCheck className="w-4 h-4 text-slate-400" />
  ) : null;

  const statusText = submitted ? (
    submitted.status === "VERIFIED" ? "Verified" :
    submitted.status === "PENDING_REVIEW" ? "Under Review" : "Self-Reported"
  ) : null;

  return (
    <div className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
      submitted
        ? "border-emerald-200 bg-emerald-50/50"
        : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
          submitted ? "bg-emerald-500 border-emerald-500" : "border-slate-300 group-hover:border-slate-400"
        }`}>
          {submitted && <span className="text-white text-xs font-bold">✓</span>}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${submitted ? "text-emerald-800" : "text-slate-800"}`}>
            {item.label}
          </p>
          <p className="text-xs text-slate-400 truncate">{item.description}</p>
          {submitted && statusIcon && (
            <div className="flex items-center gap-1 mt-0.5">
              {statusIcon}
              <span className="text-xs text-slate-500">{statusText}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
          +{item.scoreBoost} pts
        </span>
        {!submitted && (
          item.tier === 1 ? (
            <button
              onClick={() => onAdd({ documentType: item.documentType, label: item.label, tier: 1 })}
              disabled={isPending}
              className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              Confirm
            </button>
          ) : (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isPending}
                className="flex items-center gap-1 text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Upload
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => onAdd({ documentType: item.documentType, label: item.label, tier: 2, fileData: reader.result as string, fileName: file.name });
                  reader.readAsDataURL(file);
                }}
              />
            </>
          )
        )}
      </div>
    </div>
  );
}

// ─── Add Signal Form ──────────────────────────────────────────────────────────

function AddSignalForm({ benchmarks, onAdd, onCancel, isPending }: {
  benchmarks: Benchmark[];
  onAdd: (data: unknown) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({ signalType: "income", label: "", rawAmount: "", country: "NG", period: "monthly" });
  const selectedBenchmark = benchmarks.find((b) => b.countryCode === form.country);
  const currencyCode = selectedBenchmark?.currencyCode ?? "NGN";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.rawAmount);
    if (isNaN(amt) || amt <= 0) return;
    onAdd({
      signalType: form.signalType,
      label: form.label || SIGNAL_TYPES.find((s) => s.value === form.signalType)?.label,
      rawAmountCents: Math.round(amt * 100),
      currencyCode,
      country: form.country,
      period: form.period,
    });
    setForm({ ...form, rawAmount: "", label: "" });
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
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
        <button type="submit" disabled={isPending || !form.rawAmount}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
          {isPending ? "Adding…" : "Add Signal"}
        </button>
      </form>
    </div>
  );
}

// ─── Share Panel ──────────────────────────────────────────────────────────────

function SharePanel({
  shareToken,
  onGenerate,
  onRevoke,
  isGenerating,
}: {
  shareToken: string | null;
  onGenerate: () => void;
  onRevoke: () => void;
  isGenerating: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const publicUrl = shareToken ? `${window.location.origin}/passport/${shareToken}` : null;

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
          Your public link lets landlords verify your financial capacity without seeing raw data. You can revoke it any time.
        </p>
        <button onClick={onGenerate} disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors">
          <Link2 className="w-4 h-4" />
          {isGenerating ? "Generating…" : "Generate Passport Link"}
        </button>
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
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-300 text-xs font-semibold">Live</span>
        </div>
      </div>

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
        <button onClick={copy}
          className="flex items-center justify-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
          <Copy className="w-3.5 h-3.5" />
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button onClick={onRevoke}
          className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-red-500/20 hover:border-red-500/30 border border-white/10 text-slate-300 hover:text-red-300 text-xs font-semibold py-2.5 rounded-xl transition-all">
          <AlertCircle className="w-3.5 h-3.5" />
          Revoke Access
        </button>
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/passport/me"] });
      setShowSignalForm(false);
      toast({ title: "Signal added", description: "Score recalculated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSignalMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/passport/signals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/passport/me"] }),
  });

  const addEvidenceMutation = useMutation({
    mutationFn: (body: unknown) => apiRequest("POST", "/api/passport/evidence", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({ title: "Evidence submitted", description: "Document queued for review." });
    },
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
    mutationFn: () => apiRequest("POST", "/api/passport/generate-token"), // regenerates = revokes old
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({ title: "Access revoked", description: "Old link is now invalid. A new one has been generated." });
    },
  });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    await qc.clear();
    setLocation("/");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
  const potentialBoost = CHECKLIST_ITEMS.filter(item =>
    !evidence.find(e => e.documentType === item.documentType && e.tier === item.tier)
  ).reduce((acc, item) => acc + item.scoreBoost, 0);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-7 h-7 bg-[#2563eb] rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-xs">C</span>
                </div>
                <span className="font-bold text-slate-900 text-sm hidden sm:block">Cush Passport</span>
              </div>
            </Link>
          </div>

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
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">

          {/* ── Left Column ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Score Center Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <ScoreRing score={passport.score} confidence={passport.confidenceScore} />

                  <div className="flex-1 space-y-5 w-full">
                    {/* Mode toggle */}
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Migration Mode</p>
                      <div className="flex p-1 bg-slate-100 rounded-xl gap-1 w-fit">
                        {[
                          { val: "pre_arrival", label: "Pre-Arrival", icon: Plane },
                          { val: "post_arrival", label: "Post-Arrival", icon: MapPin },
                        ].map(({ val, label, icon: Icon }) => (
                          <button key={val}
                            onClick={() => toggleModeMutation.mutate(val)}
                            disabled={toggleModeMutation.isPending || passport.mode === val}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                              passport.mode === val
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}>
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Score breakdown */}
                    <div className="space-y-3">
                      {[
                        { label: "Income", value: breakdown.incomeScore, weight: "40%", color: "#2563eb" },
                        { label: "Surplus", value: breakdown.surplusScore, weight: "30%", color: "#10b981" },
                        { label: "Stability", value: breakdown.stabilityScore, weight: "30%", color: "#7c3aed" },
                      ].map((bar) => (
                        <div key={bar.label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-500 font-medium">{bar.label} <span className="text-slate-300">({bar.weight})</span></span>
                            <span className="font-bold text-slate-800">{bar.value}/100</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bar.value}%`, backgroundColor: bar.color }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reason codes */}
                    {passport.reasonCodes && passport.reasonCodes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {passport.reasonCodes.map((code, i) => (
                          <span key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">{code}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Strength bar */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-600">Passport Strength</span>
                    <span className="text-slate-400">{completedItems}/{maxItems} tasks complete</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${(completedItems / maxItems) * 100}%` }} />
                  </div>
                  {potentialBoost > 0 && (
                    <p className="text-xs text-blue-600 mt-1.5 font-medium">+{potentialBoost} pts potential boost remaining</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
              {([
                { key: "roadmap", label: "Score Roadmap", icon: TrendingUp },
                { key: "signals", label: "Financial Signals", icon: Globe2 },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                    activeTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Roadmap / Signals Panel */}
            {activeTab === "roadmap" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Ways to Boost Your Score</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Complete tasks to unlock more score points</p>
                  </div>
                </div>
                {CHECKLIST_ITEMS.map((item, i) => (
                  <ChecklistRow
                    key={i}
                    item={item}
                    existingEvidence={evidence}
                    onAdd={(data) => addEvidenceMutation.mutate(data)}
                    isPending={addEvidenceMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Financial Signals</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{signals.length} signal{signals.length !== 1 ? "s" : ""} declared</p>
                  </div>
                  {!showSignalForm && (
                    <button onClick={() => setShowSignalForm(true)}
                      className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-semibold transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Add Signal
                    </button>
                  )}
                </div>

                {showSignalForm && (
                  <AddSignalForm
                    benchmarks={benchmarks}
                    onAdd={(data) => addSignalMutation.mutate(data)}
                    onCancel={() => setShowSignalForm(false)}
                    isPending={addSignalMutation.isPending}
                  />
                )}

                {signals.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Globe2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">No signals yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add income, surplus, or stability signals to build your score</p>
                    <button onClick={() => setShowSignalForm(true)}
                      className="mt-4 flex items-center gap-1.5 text-xs bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold mx-auto transition-colors hover:bg-slate-700">
                      <Plus className="w-3.5 h-3.5" />
                      Add First Signal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {signals.map((signal) => {
                      const st = SIGNAL_TYPES.find((t) => t.value === signal.signalType);
                      const amountDisplay = (signal.rawAmountCents / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                      return (
                        <div key={signal.id}
                          className="flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${st?.color ?? "bg-slate-100 text-slate-600"}`}>
                              <TrendingUp className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{signal.label}</p>
                              <p className="text-xs text-slate-400">{signal.currencyCode} {amountDisplay} / {signal.period} · {signal.country}</p>
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
                            <button
                              onClick={() => deleteSignalMutation.mutate(signal.id)}
                              disabled={deleteSignalMutation.isPending}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right Sidebar ────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Share Panel */}
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
                  { label: "Current Score", value: passport.score.toString(), sub: "/ 1000", color: "text-[#2563eb]" },
                  { label: "Confidence", value: `${passport.confidenceScore}%`, sub: "Verified", color: "text-emerald-600" },
                  { label: "Mode", value: passport.mode === "pre_arrival" ? "Pre" : "Post", sub: "Arrival", color: "text-violet-600" },
                  { label: "Tasks Done", value: `${completedItems}/${maxItems}`, sub: "Complete", color: "text-amber-600" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-slate-400 font-medium">{sub}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Quick Wins
              </h3>
              {[
                { tip: "Add your monthly income signal", pts: "+40 pts" },
                { tip: "Confirm your employment status", pts: "+35 pts" },
                { tip: "Upload a bank statement PDF", pts: "+30 pts" },
              ].map(({ tip, pts }) => {
                const alreadyDone = evidence.some(e =>
                  (tip.includes("income") && e.documentType === "payslip") ||
                  (tip.includes("employment") && e.documentType === "employment_contract") ||
                  (tip.includes("bank") && e.documentType === "bank_statement")
                );
                return (
                  <div key={tip} className={`flex items-center justify-between gap-2 p-3 rounded-xl text-xs ${alreadyDone ? "bg-emerald-50 opacity-60" : "bg-slate-50 hover:bg-slate-100 cursor-pointer"} transition-colors`}
                    onClick={() => !alreadyDone && setActiveTab("roadmap")}>
                    <div className="flex items-center gap-2">
                      {alreadyDone
                        ? <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      }
                      <span className={alreadyDone ? "text-emerald-700 line-through" : "text-slate-700"}>{tip}</span>
                    </div>
                    <span className="font-bold text-blue-600 whitespace-nowrap">{pts}</span>
                  </div>
                );
              })}
            </div>

            {/* Last updated */}
            {passport.lastUpdated && (
              <p className="text-xs text-slate-400 text-center">
                Last updated {new Date(passport.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
