import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Save } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import type { CushScorePolicyConfig } from "@shared/schema";

const BASELINE_PRESETS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    destination: "London",
    amount: "1518",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    destination: "Outside London",
    amount: "1203",
  },
];

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

type BaselineForm = {
  id: string;
  destination: string;
  amount: string;
  effectiveDate: string;
  provenance: string;
};

type PolicyFormState = {
  baselines: BaselineForm[];
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
    baselines: BASELINE_PRESETS.map((preset) => ({
      ...preset,
      effectiveDate: "",
      provenance: "Cush Score master prompt",
    })),
    creditMappings: { strong: "", average: "", poor: "", no_history: "" },
  };
}

function toForm(configuration?: CushScorePolicyConfig): PolicyFormState {
  if (!configuration) return emptyForm();
  const baselineMap = new Map(configuration.destinationBaselines.map((item) => [item.id, item]));
  const baselines = BASELINE_PRESETS.map((preset) => {
    const configured = baselineMap.get(preset.id);
    return {
      ...preset,
      amount: configured ? String(configured.monthlyBaselinePence / 100) : preset.amount,
      effectiveDate: configured?.effectiveDate ?? "",
      provenance: configured?.provenance ?? "Cush Score master prompt",
    };
  });
  return {
    baselines,
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
  const destinationBaselines = form.baselines.map((baseline) => {
    const monthlyPence = Math.round(Number(baseline.amount) * 100);
    if (!Number.isSafeInteger(monthlyPence) || monthlyPence <= 0) {
      throw new Error(`Enter a positive monthly baseline for ${baseline.destination}.`);
    }
    if (!baseline.effectiveDate) throw new Error(`Set an effective date for ${baseline.destination}.`);
    if (!baseline.provenance.trim()) throw new Error(`Add a source or provenance for ${baseline.destination}.`);
    return {
      id: baseline.id,
      destination: baseline.destination,
      monthlyBaselinePence: monthlyPence,
      effectiveDate: baseline.effectiveDate,
      countryCode: "GB" as const,
      currencyCode: "GBP" as const,
      provenance: baseline.provenance.trim(),
    };
  });

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
    destinationBaselines,
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
          Baseline amounts are prefilled from the supplied Cush policy. Add their effective dates and provenance. Credit mappings and confidence values are blank until an administrator enters approved values. Saving creates a draft; activation changes scoring for all users.
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Destination baselines</h3>
          <p className="mt-1 text-xs text-slate-500">GBP per month. These values have no effect until their effective date is set and the policy is activated.</p>
        </div>
        {form.baselines.map((baseline, index) => (
          <div key={baseline.id} className="grid gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-2">
            <div className="sm:col-span-2 font-semibold text-sm text-slate-800">{baseline.destination}</div>
            <NumberField label="Monthly baseline (£)" min={1} step="0.01" value={baseline.amount} onChange={(value) => setForm((current) => ({ ...current, baselines: current.baselines.map((item, itemIndex) => itemIndex === index ? { ...item, amount: value } : item) }))} />
            <label className="block text-xs font-medium text-slate-600">
              Effective date
              <input type="date" value={baseline.effectiveDate} onChange={(event) => setForm((current) => ({ ...current, baselines: current.baselines.map((item, itemIndex) => itemIndex === index ? { ...item, effectiveDate: event.target.value } : item) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
              Provenance / source
              <input value={baseline.provenance} onChange={(event) => setForm((current) => ({ ...current, baselines: current.baselines.map((item, itemIndex) => itemIndex === index ? { ...item, provenance: event.target.value } : item) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
        ))}
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
