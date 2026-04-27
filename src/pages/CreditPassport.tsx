import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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
  evidence: EvidenceItemData[];
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

interface EvidenceItemData {
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
  // Tier 1 — Manual entry (fastest to ship)
  { documentType: "payslip", label: "Monthly Payslip Declaration", tier: 1, scoreBoost: 40, description: "Declare your most recent payslip amount" },
  { documentType: "bank_statement", label: "Bank Balance Confirmation", tier: 1, scoreBoost: 30, description: "Confirm your average monthly bank balance" },
  { documentType: "employment_contract", label: "Employment Status", tier: 1, scoreBoost: 35, description: "Confirm employment type and duration" },
  // Tier 2 — Document uploads (triggers verification)
  { documentType: "payslip", label: "Upload Payslip (PDF/Image)", tier: 2, scoreBoost: 40, description: "Upload an actual payslip for verification" },
  { documentType: "bank_statement", label: "Upload Bank Statement", tier: 2, scoreBoost: 30, description: "Upload 3-month bank statement PDF" },
  { documentType: "tax_return", label: "Upload Tax Return", tier: 2, scoreBoost: 50, description: "Upload most recent tax assessment" },
  { documentType: "proof_of_residency", label: "Proof of Residency", tier: 2, scoreBoost: 20, description: "Required for Post-Arrival mode" },
  { documentType: "transfer_receipt", label: "International Transfer Receipt", tier: 2, scoreBoost: 25, description: "Proves global asset movement capacity" },
];

const SIGNAL_TYPES = [
  { value: "income", label: "Monthly Income", color: "blue" },
  { value: "surplus", label: "Monthly Surplus", color: "emerald" },
  { value: "transfer", label: "Max Single Transfer", color: "violet" },
  { value: "stability", label: "Stability Indicator", color: "amber" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  SELF_REPORTED: { label: "Self-Reported", color: "text-slate-500", dot: "bg-slate-400" },
  PENDING_REVIEW: { label: "Under Review", color: "text-amber-600", dot: "bg-amber-400" },
  VERIFIED: { label: "Verified", color: "text-emerald-600", dot: "bg-emerald-500" },
};

function apiRequest(method: string, url: string, body?: unknown) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());
}

// ─── Score Ring Display ───────────────────────────────────────────────────────

function ScoreRing({ score, confidence }: { score: number; confidence: number }) {
  const percent = Math.round((score / 1000) * 100);
  const confidenceLabel =
    confidence >= 80 ? "High Confidence" :
    confidence >= 55 ? "Moderate Confidence" :
    confidence >= 30 ? "Building Confidence" : "Low Confidence";

  const confidenceColor =
    confidence >= 80 ? "text-emerald-600" :
    confidence >= 55 ? "text-blue-600" :
    confidence >= 30 ? "text-amber-600" : "text-slate-500";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180" className="rotate-[-90deg]">
          <circle cx="90" cy="90" r="76" fill="none" stroke="#e2e8f0" strokeWidth="14" />
          <circle
            cx="90" cy="90" r="76" fill="none"
            stroke={confidence >= 80 ? "#2563eb" : confidence >= 55 ? "#3b82f6" : "#94a3b8"}
            strokeWidth="14"
            strokeDasharray={`${2 * Math.PI * 76}`}
            strokeDashoffset={`${2 * Math.PI * 76 * (1 - percent / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-slate-900 dark:text-white">{score}</span>
          <span className="text-xs text-slate-500 font-medium">/ 1000</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${confidenceColor}`}>
        {confidenceLabel} — {confidence}% Verified
      </span>
    </div>
  );
}

// ─── Add Signal Form ──────────────────────────────────────────────────────────

function AddSignalForm({
  benchmarks,
  onAdd,
  isPending,
}: {
  benchmarks: Benchmark[];
  onAdd: (data: unknown) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    signalType: "income",
    label: "",
    rawAmount: "",
    country: "GB",
    period: "monthly",
  });

  const selectedBenchmark = benchmarks.find((b) => b.countryCode === form.country);
  const currencyCode = selectedBenchmark?.currencyCode ?? "GBP";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountFloat = parseFloat(form.rawAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) return;
    onAdd({
      signalType: form.signalType,
      label: form.label || SIGNAL_TYPES.find((s) => s.value === form.signalType)?.label,
      rawAmountCents: Math.round(amountFloat * 100),
      currencyCode,
      country: form.country,
      period: form.period,
    });
    setForm({ ...form, rawAmount: "", label: "" });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Signal Type</label>
          <select
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700"
            value={form.signalType}
            onChange={(e) => setForm({ ...form, signalType: e.target.value })}
          >
            {SIGNAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
          <select
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          >
            {benchmarks.map((b) => (
              <option key={b.countryCode} value={b.countryCode}>
                {b.countryName} ({b.currencyCode})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Label (optional)</label>
        <input
          type="text"
          placeholder={`e.g. "Primary employer salary"`}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Amount ({currencyCode})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700"
            value={form.rawAmount}
            onChange={(e) => setForm({ ...form, rawAmount: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
          <select
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700"
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending || !form.rawAmount}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
      >
        {isPending ? "Adding…" : "Add Signal"}
      </button>
    </form>
  );
}

// ─── Checklist Item ───────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  existingEvidence,
  onAdd,
  isPending,
}: {
  item: typeof CHECKLIST_ITEMS[0];
  existingEvidence: EvidenceItemData[];
  onAdd: (data: unknown) => void;
  isPending: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const submitted = existingEvidence.find(
    (e) => e.documentType === item.documentType && e.tier === item.tier
  );
  const status = submitted ? STATUS_CONFIG[submitted.status] : null;

  function handleTier1Click() {
    onAdd({ documentType: item.documentType, label: item.label, tier: 1 });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onAdd({
        documentType: item.documentType,
        label: item.label,
        tier: 2,
        fileData: reader.result as string,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
      submitted ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800" :
      "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          submitted ? "bg-emerald-500" : "border-2 border-slate-300"
        }`}>
          {submitted && <span className="text-white text-xs">✓</span>}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${submitted ? "text-emerald-800 dark:text-emerald-300" : "text-slate-800 dark:text-slate-200"}`}>
            {item.label}
          </p>
          <p className="text-xs text-slate-500 truncate">{item.description}</p>
          {submitted && status && (
            <span className={`inline-flex items-center gap-1 text-xs mt-0.5 ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
          +{item.scoreBoost} pts
        </span>
        {!submitted && (
          item.tier === 1 ? (
            <button
              onClick={handleTier1Click}
              disabled={isPending}
              className="text-xs bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
            >
              Confirm
            </button>
          ) : (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isPending}
                className="text-xs bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                Upload
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
            </>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreditPassport() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"checklist" | "signals">("checklist");

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
      toast({ title: "Signal added", description: "Your score has been recalculated." });
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

  const deleteEvidenceMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/passport/evidence/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/passport/me"] }),
  });

  const toggleModeMutation = useMutation({
    mutationFn: (mode: string) => apiRequest("PUT", "/api/passport/mode", { mode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({ title: "Mode updated" });
    },
    onError: (e: any) => {
      const msg = e.message?.includes("Proof of Residency")
        ? "Upload Proof of Residency before switching to Post-Arrival mode."
        : e.message;
      toast({ title: "Cannot switch mode", description: msg, variant: "destructive" });
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/passport/generate-token"),
    onSuccess: (d: any) => {
      const url = `${window.location.origin}/passport/${d.shareToken}`;
      navigator.clipboard.writeText(url).catch(() => {});
      qc.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({ title: "Passport link copied!", description: "Share this with your landlord." });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { passport, signals = [], evidence = [] } = data ?? { passport: { id: 0, score: 0, confidenceScore: 0, mode: "pre_arrival", shareToken: null, scoreBreakdown: null, reasonCodes: null, lastUpdated: null, generatedAt: null }, signals: [], evidence: [] };
  const breakdown = passport.scoreBreakdown ?? { incomeScore: 0, surplusScore: 0, stabilityScore: 0 };
  const checklistProgress = evidence.length;
  const maxChecklist = CHECKLIST_ITEMS.length;

  const formattedDate = passport.lastUpdated
    ? new Date(passport.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Not yet generated";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <span className="font-bold text-slate-900 dark:text-white text-sm">Cush Passport</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Last updated: {formattedDate}</span>
            {passport.shareToken ? (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/passport/${passport.shareToken}`;
                  navigator.clipboard.writeText(url).catch(() => {});
                  toast({ title: "Link copied!" });
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Copy Link
              </button>
            ) : (
              <button
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Generate Link
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Score Hero Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ScoreRing score={passport.score} confidence={passport.confidenceScore} />
            <div className="flex-1 space-y-4 w-full">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                {["pre_arrival", "post_arrival"].map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleModeMutation.mutate(m)}
                    disabled={toggleModeMutation.isPending || passport.mode === m}
                    className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                      passport.mode === m
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {m === "pre_arrival" ? "Pre-Arrival" : "Post-Arrival"}
                  </button>
                ))}
              </div>

              {/* Score breakdown bars */}
              <div className="space-y-3">
                {[
                  { label: "Income", value: breakdown.incomeScore, weight: "40%", color: "bg-blue-500" },
                  { label: "Surplus", value: breakdown.surplusScore, weight: "30%", color: "bg-emerald-500" },
                  { label: "Stability", value: breakdown.stabilityScore, weight: "30%", color: "bg-violet-500" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600 dark:text-slate-400">{bar.label} <span className="text-slate-400">({bar.weight})</span></span>
                      <span className="font-semibold text-slate-900 dark:text-white">{bar.value}/100</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                        style={{ width: `${bar.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Reason codes */}
              {passport.reasonCodes && passport.reasonCodes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {passport.reasonCodes.map((code, i) => (
                    <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Passport strength progress bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span className="font-medium">Passport Strength</span>
              <span>{checklistProgress}/{maxChecklist} items complete</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${(checklistProgress / maxChecklist) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-fit">
          {[
            { key: "checklist", label: "Evidence Checklist" },
            { key: "signals", label: "Financial Signals" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                activeTab === t.key
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Evidence Checklist Tab */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Tier 1 — Quick Declarations</h3>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.filter((i) => i.tier === 1).map((item, idx) => (
                  <ChecklistRow
                    key={idx}
                    item={item}
                    existingEvidence={evidence}
                    onAdd={(d) => addEvidenceMutation.mutate(d)}
                    isPending={addEvidenceMutation.isPending}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Tier 2 — Document Uploads</h3>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.filter((i) => i.tier === 2).map((item, idx) => (
                  <ChecklistRow
                    key={idx}
                    item={item}
                    existingEvidence={evidence}
                    onAdd={(d) => addEvidenceMutation.mutate(d)}
                    isPending={addEvidenceMutation.isPending}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Financial Signals Tab */}
        {activeTab === "signals" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">Financial Signals</h2>
                <button
                  onClick={() => setShowSignalForm(!showSignalForm)}
                  className="text-xs bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 py-1.5 rounded-lg font-medium"
                >
                  {showSignalForm ? "Cancel" : "+ Add Signal"}
                </button>
              </div>

              {showSignalForm && (
                <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <AddSignalForm
                    benchmarks={benchmarks}
                    onAdd={(d) => addSignalMutation.mutate(d)}
                    isPending={addSignalMutation.isPending}
                  />
                </div>
              )}

              {signals.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm">No signals yet. Add your first financial signal above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {signals.map((s) => {
                    const typeConf = SIGNAL_TYPES.find((t) => t.value === s.signalType);
                    const status = STATUS_CONFIG[s.verificationStatus];
                    const amount = (s.rawAmountCents / 100).toLocaleString("en-GB", { style: "currency", currency: s.currencyCode });
                    const normalized = s.normalizedValue ? parseFloat(s.normalizedValue).toFixed(1) : "—";
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded-full bg-${typeConf?.color ?? "slate"}-500`} />
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.label}</p>
                            <p className="text-xs text-slate-500">{amount} / {s.period} · Score: {normalized}/100</p>
                            <span className={`text-xs ${status?.color}`}>{status?.label}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSignalMutation.mutate(s.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Remove signal"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
