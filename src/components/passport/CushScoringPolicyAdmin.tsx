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

type ConfidenceForm = {
  historyMonthsForMaximum: string;
  evidenceQualityWeights: Record<"verified" | "documented" | "self_reported", string>;
  creditAvailabilityWeights: Record<"verified" | "documented" | "self_reported", string>;
  incomeReliabilityByCategory: Record<
    "salary" | "self_employment" | "freelance" | "business" | "scholarship" | "family_support" | "other",
    string
  >;
  freshnessBands: string;
};

type PolicyFormState = {
  baselines: BaselineForm[];
  creditMappings: Record<"strong" | "average" | "poor" | "no_history", string>;
  confidence: ConfidenceForm;
};

const EMPTY_CONFIDENCE: ConfidenceForm = {
  historyMonthsForMaximum: "",
  evidenceQualityWeights: { verified: "", documented: "", self_reported: "" },
  creditAvailabilityWeights: { verified: "", documented: "", self_reported: "" },
  incomeReliabilityByCategory: {
    salary: "", self_employment: "", freelance: "", business: "",
    scholarship: "", family_support: "", other: "",
  },
  freshnessBands: "",
};

function emptyForm(): PolicyFormState {
  return {
    baselines: BASELINE_PRESETS.map((preset) => ({
      ...preset,
      effectiveDate: "",
      provenance: "Cush Score master prompt",
    })),
    creditMappings: { strong: "", average: "", poor: "", no_history: "" },
    confidence: structuredClone(EMPTY_CONFIDENCE),
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
  const confidence = configuration.confidence;
  return {
    baselines,
    creditMappings: {
      strong: configuration.creditMappings.strong?.toString() ?? "",
      average: configuration.creditMappings.average?.toString() ?? "",
      poor: configuration.creditMappings.poor?.toString() ?? "",
      no_history: configuration.creditMappings.no_history?.toString() ?? "",
    },
    confidence: confidence ? {
      historyMonthsForMaximum: String(confidence.historyMonthsForMaximum),
      evidenceQualityWeights: {
        verified: String(confidence.evidenceQualityWeights.verified),
        documented: String(confidence.evidenceQualityWeights.documented),
        self_reported: String(confidence.evidenceQualityWeights.self_reported),
      },
      creditAvailabilityWeights: {
        verified: String(confidence.creditAvailabilityWeights.verified),
        documented: String(confidence.creditAvailabilityWeights.documented),
        self_reported: String(confidence.creditAvailabilityWeights.self_reported),
      },
      incomeReliabilityByCategory: {
        salary: String(confidence.incomeReliabilityByCategory.salary),
        self_employment: String(confidence.incomeReliabilityByCategory.self_employment),
        freelance: String(confidence.incomeReliabilityByCategory.freelance),
        business: String(confidence.incomeReliabilityByCategory.business),
        scholarship: String(confidence.incomeReliabilityByCategory.scholarship),
        family_support: String(confidence.incomeReliabilityByCategory.family_support),
        other: String(confidence.incomeReliabilityByCategory.other),
      },
      freshnessBands: confidence.freshnessBands.map((band) => `${band.maxAgeDays},${band.points}`).join("\n"),
    } : structuredClone(EMPTY_CONFIDENCE),
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

  const allConfidenceValues = [
    form.confidence.historyMonthsForMaximum,
    ...Object.values(form.confidence.evidenceQualityWeights),
    ...Object.values(form.confidence.creditAvailabilityWeights),
    ...Object.values(form.confidence.incomeReliabilityByCategory),
    form.confidence.freshnessBands,
  ];
  const hasAnyConfidenceValue = allConfidenceValues.some((value) => value.trim() !== "");
  let confidence: CushScorePolicyConfig["confidence"];
  if (hasAnyConfidenceValue) {
    if (allConfidenceValues.some((value) => value.trim() === "")) {
      throw new Error("Complete every confidence field, or leave all confidence fields blank.");
    }
    const freshnessBands = form.confidence.freshnessBands.split("\n").map((line) => {
      const [ageText, pointsText, extra] = line.split(",").map((part) => part.trim());
      const maxAgeDays = Number(ageText);
      const points = Number(pointsText);
      if (extra !== undefined || !Number.isInteger(maxAgeDays) || maxAgeDays < 0 ||
          !Number.isFinite(points) || points < 0 || points > 10) {
        throw new Error("Use one freshness pair per line: max age in days, points from 0 to 10.");
      }
      return { maxAgeDays, points };
    });
    confidence = {
      historyMonthsForMaximum: Number(form.confidence.historyMonthsForMaximum),
      evidenceQualityWeights: Object.fromEntries(
        Object.entries(form.confidence.evidenceQualityWeights).map(([key, value]) => [key, Number(value)]),
      ) as NonNullable<CushScorePolicyConfig["confidence"]>["evidenceQualityWeights"],
      creditAvailabilityWeights: Object.fromEntries(
        Object.entries(form.confidence.creditAvailabilityWeights).map(([key, value]) => [key, Number(value)]),
      ) as NonNullable<CushScorePolicyConfig["confidence"]>["creditAvailabilityWeights"],
      incomeReliabilityByCategory: Object.fromEntries(
        Object.entries(form.confidence.incomeReliabilityByCategory).map(([key, value]) => [key, Number(value)]),
      ) as NonNullable<CushScorePolicyConfig["confidence"]>["incomeReliabilityByCategory"],
      freshnessBands,
    };
  }

  return {
    destinationBaselines,
    creditMappings,
    ...(confidence ? { confidence } : {}),
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
          <p className="mt-1 text-xs text-slate-500">All values below must come from an approved confidence policy. Leave every field blank to keep confidence scoring disabled.</p>
        </div>
        <NumberField label="History months for maximum" min={1} step="1" value={form.confidence.historyMonthsForMaximum} onChange={(value) => setForm((current) => ({ ...current, confidence: { ...current.confidence, historyMonthsForMaximum: value } }))} />
        <div className="grid gap-4 lg:grid-cols-3">
          {(["verified", "documented", "self_reported"] as const).map((quality) => (
            <div key={quality} className="space-y-2 rounded-xl border border-slate-100 p-3">
              <h4 className="text-sm font-semibold capitalize text-slate-800">{quality}</h4>
              <NumberField label="Evidence quality weight (0–1)" min={0} max={1} value={form.confidence.evidenceQualityWeights[quality]} onChange={(value) => setForm((current) => ({ ...current, confidence: { ...current.confidence, evidenceQualityWeights: { ...current.confidence.evidenceQualityWeights, [quality]: value } } }))} />
              <NumberField label="Credit availability weight (0–1)" min={0} max={1} value={form.confidence.creditAvailabilityWeights[quality]} onChange={(value) => setForm((current) => ({ ...current, confidence: { ...current.confidence, creditAvailabilityWeights: { ...current.confidence.creditAvailabilityWeights, [quality]: value } } }))} />
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["salary", "self_employment", "freelance", "business", "scholarship", "family_support", "other"] as const).map((category) => (
            <NumberField key={category} label={`${category.replace("_", " ")} reliability (0–1)`} min={0} max={1} value={form.confidence.incomeReliabilityByCategory[category]} onChange={(value) => setForm((current) => ({ ...current, confidence: { ...current.confidence, incomeReliabilityByCategory: { ...current.confidence.incomeReliabilityByCategory, [category]: value } } }))} />
          ))}
        </div>
        <label className="block text-xs font-medium text-slate-600">
          Freshness bands: one “max age days, points 0–10” pair per line
          <textarea value={form.confidence.freshnessBands} onChange={(event) => setForm((current) => ({ ...current, confidence: { ...current.confidence, freshnessBands: event.target.value } }))} rows={4} placeholder="Enter approved bands, one per line" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm" />
        </label>
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
