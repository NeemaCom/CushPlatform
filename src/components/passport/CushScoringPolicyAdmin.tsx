import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Save } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import type { CushScorePolicyConfig } from "@shared/schema";

const FLAT_BASELINE_ID = "00000000-0000-4000-8000-000000000003";
const FLAT_BASELINE_EFFECTIVE_DATE = "2026-11-01";
const FLAT_BASELINE_PENCE = 100_000;
const FLAT_BASELINE_PROVENANCE = "Initial UK baseline; update rationale when reviewing.";

type PolicyVersions = {
  active: null | {
    id: number;
    version: number;
    configuration: CushScorePolicyConfig;
    approvedAt: string | null;
  };
  draft: null | {
    id: number;
    version: number;
    configuration: CushScorePolicyConfig;
    updatedAt: string;
  };
};

type PolicyFormState = {
  baselineId: string;
  baselineAmountPounds: string;
  baselineEffectiveDate: string;
  baselineProvenance: string;
  creditMappings: Record<"strong" | "average" | "poor" | "no_history", string>;
};

const POLICY_CONFIDENCE_RULES: CushScorePolicyConfig["confidence"] = {
  historyMonthsForMaximum: 6,
  sourceQualityPoints: { bank_connection: 25, verified_statement: 15, self_reported: 0 },
  creditCheckPoints: { matched: 15, matched_thin: 10, no_match: 5, not_done: 0 },
  incomeSourcePoints: {
    uk_payslip_or_uk_credits: 10,
    steady_employer: 8,
    variable: 5,
    uk_offer_only: 4,
    family_support_only: 3,
    other: 0,
  },
  freshnessBands: [
    { maxAgeDays: 7, points: 10 },
    { maxAgeDays: 30, points: 6 },
    { maxAgeDays: 90, points: 3 },
  ],
};

function emptyForm(): PolicyFormState {
  return {
    baselineId: FLAT_BASELINE_ID,
    baselineAmountPounds: (FLAT_BASELINE_PENCE / 100).toFixed(2),
    baselineEffectiveDate: FLAT_BASELINE_EFFECTIVE_DATE,
    baselineProvenance: FLAT_BASELINE_PROVENANCE,
    creditMappings: { strong: "", average: "", poor: "", no_history: "" },
  };
}

function toForm(configuration?: CushScorePolicyConfig): PolicyFormState {
  if (!configuration) return emptyForm();
  const baseline = configuration.destinationBaselines[0];
  return {
    baselineId: baseline.id,
    baselineAmountPounds: (baseline.monthlyBaselinePence / 100).toFixed(2),
    baselineEffectiveDate: baseline.effectiveDate,
    baselineProvenance: baseline.provenance,
    creditMappings: {
      strong: configuration.creditMappings.strong?.toString() ?? "",
      average: configuration.creditMappings.average?.toString() ?? "",
      poor: configuration.creditMappings.poor?.toString() ?? "",
      no_history: configuration.creditMappings.no_history?.toString() ?? "",
    },
  };
}

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload as T;
}

function makeConfiguration(form: PolicyFormState): CushScorePolicyConfig {
  const amountText = form.baselineAmountPounds.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) {
    throw new Error("Enter the monthly baseline in pounds, using up to two decimal places.");
  }
  const monthlyBaselinePence = Math.round(Number(amountText) * 100);
  if (!Number.isSafeInteger(monthlyBaselinePence) || monthlyBaselinePence <= 0) {
    throw new Error("The monthly baseline must be a positive amount.");
  }
  const baselineEffectiveDate = form.baselineEffectiveDate.trim();
  const parsedEffectiveDate = new Date(`${baselineEffectiveDate}T00:00:00.000Z`);
  if (!Number.isFinite(parsedEffectiveDate.getTime()) ||
      parsedEffectiveDate.toISOString().slice(0, 10) !== baselineEffectiveDate) {
    throw new Error("Choose a valid effective date for the baseline.");
  }
  const baselineProvenance = form.baselineProvenance.trim();
  if (!baselineProvenance || baselineProvenance.length > 500) {
    throw new Error("Add a baseline rationale of up to 500 characters.");
  }

  const creditMappings: CushScorePolicyConfig["creditMappings"] = {};
  for (const key of ["strong", "average", "poor", "no_history"] as const) {
    const value = form.creditMappings[key].trim();
    if (!value) continue;
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`Credit mapping "${key}" must be between 0 and 100.`);
    }
    creditMappings[key] = score;
  }

  return {
    destinationBaselines: [{
      id: form.baselineId || FLAT_BASELINE_ID,
      destination: "United Kingdom",
      monthlyBaselinePence,
      effectiveDate: baselineEffectiveDate,
      countryCode: "GB",
      currencyCode: "GBP",
      provenance: baselineProvenance,
    }],
    creditMappings,
    confidence: POLICY_CONFIDENCE_RULES,
  };
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}

export default function CushScoringPolicyAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PolicyFormState>(emptyForm);
  const policyQuery = useQuery<PolicyVersions>({
    queryKey: ["/api/passport/v2/admin/policy"],
    queryFn: () => apiRequest("GET", "/api/passport/v2/admin/policy"),
    retry: false,
  });

  useEffect(() => {
    if (policyQuery.data) setForm(toForm(policyQuery.data.draft?.configuration ?? policyQuery.data.active?.configuration));
  }, [policyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const configuration = makeConfiguration(form);
      return apiRequest<{ id: number; version: number }>("PUT", "/api/passport/v2/admin/policy/draft", configuration);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/v2/admin/policy"] });
      toast({ title: `Draft policy v${result.version} saved`, description: "It is not active until an admin activates it." });
    },
    onError: (error: Error) => toast({ title: "Policy draft not saved", description: error.message, variant: "destructive" }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/passport/v2/admin/policy/${id}/activate`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/v2/admin/policy"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/v2"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({ title: "Scoring policy activated", description: "New V2 calculations will use this policy version." });
    },
    onError: (error: Error) => toast({ title: "Policy activation failed", description: error.message, variant: "destructive" }),
  });

  if (policyQuery.isLoading) return <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading scoring policy…</div>;
  if (policyQuery.isError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="status">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="font-semibold text-amber-950">Scoring policy unavailable</h3>
            <p className="mt-1 text-sm text-amber-900">{(policyQuery.error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  const active = policyQuery.data!.active;
  const draft = policyQuery.data!.draft;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Admin-only scoring configuration</p>
        <p className="mt-1 text-xs leading-relaxed">
          Baseline, credit mappings, and confidence rules are saved together as a policy version. Saving creates a draft; only activating that reviewed version changes calculations for users.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Policy versions</h3>
            <p className="mt-1 text-xs text-slate-500">
              Active: {active ? `v${active.version}` : "none"} · Draft: {draft ? `v${draft.version}` : "none"}
            </p>
          </div>
          {draft && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Activate policy v${draft.version} for all Cush Score V2 calculations?`)) {
                  activateMutation.mutate(draft.id);
                }
              }}
              disabled={activateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {activateMutation.isPending ? "Activating…" : `Activate v${draft.version}`}
            </button>
          )}
        </div>
        {active?.approvedAt && <p className="text-xs text-slate-500">Active since {new Date(active.approvedAt).toLocaleString()}</p>}
      </section>

      <section className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5">
        <h3 className="font-bold text-violet-950">UK monthly computation baseline</h3>
        <p className="mt-1 text-xs leading-relaxed text-violet-800">
          This versioned value is used to normalize UK funds and income. It remains a draft until separately activated.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Monthly baseline (£)"
            min={0.01}
            step="0.01"
            value={form.baselineAmountPounds}
            onChange={(value) => setForm((current) => ({ ...current, baselineAmountPounds: value }))}
          />
          <label className="block text-xs font-medium text-slate-600">
            Effective date
            <input
              type="date"
              value={form.baselineEffectiveDate}
              onChange={(event) => setForm((current) => ({ ...current, baselineEffectiveDate: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
            Source or rationale
            <input
              type="text"
              maxLength={500}
              value={form.baselineProvenance}
              onChange={(event) => setForm((current) => ({ ...current, baselineProvenance: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-2 text-xs text-violet-950 sm:grid-cols-2">
          <p className="rounded-lg bg-white/70 px-3 py-2">
            Active: {active
              ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
                  (active.configuration.destinationBaselines[0]?.monthlyBaselinePence ?? 0) / 100,
                )
              : "No active baseline"}
            {active ? ` · v${active.version}` : ""}
          </p>
          <p className="rounded-lg bg-white/70 px-3 py-2">
            Draft: {draft
              ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
                  (draft.configuration.destinationBaselines[0]?.monthlyBaselinePence ?? 0) / 100,
                )
              : "Not saved yet"}
            {draft ? ` · v${draft.version}` : ""}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Credit mappings</h3>
          <p className="mt-1 text-xs text-slate-500">Enter approved component scores from 0–100. Thin-file is fixed at 50 by the scoring prompt.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["strong", "average", "poor", "no_history"] as const).map((key) => (
            <NumberField key={key} label={`${key.replace("_", " ")} mapping (0–100)`} max={100} value={form.creditMappings[key]} onChange={(value) => setForm((current) => ({ ...current, creditMappings: { ...current.creditMappings, [key]: value } }))} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Confidence policy</h3>
          <p className="mt-1 text-xs text-slate-500">
            Confidence is separate from the Cush Score. Verified source points require supported evidence; self-reported data earns no source-quality points.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-3">
            <h4 className="text-sm font-semibold text-slate-800">Evidence and history</h4>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              <li>History: 5 points per usable month, up to 6 months (30)</li>
              <li>Bank connection: 25; verified statement: 15</li>
              <li>Freshness: 10 / 6 / 3 points at 7 / 30 / 90 days</li>
              <li>Account coverage: up to 10, reduced by unresolved-transfer share</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-100 p-3">
            <h4 className="text-sm font-semibold text-slate-800">Credit and income</h4>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              <li>Credit check: matched 15; thin 10; no match 5; not done 0</li>
              <li>Income: UK payslip/credits 10; steady employer 8; variable 5</li>
              <li>UK offer only 4; family support only 3; other 0</li>
              <li>Confirmed integrity flags: −5 each; minimum confidence 1</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Bands: 1–39 Low, 40–69 Medium, 70–100 High. No family-support-only cap is applied. Confidence never changes the score.
        </p>
      </section>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? "Saving draft…" : "Save policy draft"}
      </button>
    </div>
  );
}
