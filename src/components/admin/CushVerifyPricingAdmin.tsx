import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, Check, CircleDollarSign, Clock3, History, Loader2, Plus, RefreshCw, Save, Send, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  CUSH_VERIFY_PRICING_FEATURES,
  calculateAnnualPricing,
  cushVerifyPricingCatalogSchema,
  type CushVerifyPricingCatalogInput,
  type CushVerifyPricingPlanInput,
} from "@shared/cush-verify-pricing";

type PricingFormPlan = Omit<CushVerifyPricingPlanInput, "monthlyPriceMinor" | "additionalReportPriceMinor"> & {
  monthlyPrice: string;
  additionalReportPrice: string;
};
type PricingForm = Omit<CushVerifyPricingCatalogInput, "annualDiscountBps" | "plans"> & {
  annualDiscountBps: string;
  plans: PricingFormPlan[];
};
type AdminPricingVersion = {
  id: number;
  version: number;
  status: "draft" | "published" | "superseded" | "abandoned";
  defaultCurrency: string;
  annualDiscountBps: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  createdBy: number | null;
  publishedBy: number | null;
  plans: CushVerifyPricingPlanInput[];
  faqs: CushVerifyPricingCatalogInput["faqs"];
};
type PricingAdminResponse = {
  published: AdminPricingVersion | null;
  draft: AdminPricingVersion | null;
  history: Array<{
    id: number;
    version: number;
    status: "published" | "superseded" | "abandoned";
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    defaultCurrency: string;
    annualDiscountBps: number;
    planCount: number;
    plans: CushVerifyPricingPlanInput[];
    faqs: CushVerifyPricingCatalogInput["faqs"];
  }>;
};

function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  const body = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (body) {
    try {
      return (JSON.parse(body) as { error?: string }).error ?? message;
    } catch {
      return message;
    }
  }
  return message;
}

function toMoneyInput(value: number | null) {
  return value === null ? "" : `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

function parseMoneyInput(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d{1,8}(?:\.\d{0,2})?$/.test(normalized)) {
    throw new Error("Enter a non-negative amount with up to two decimal places.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor > 2_000_000_000) {
    throw new Error("The amount is too large.");
  }
  return minor;
}

function toForm(catalog: CushVerifyPricingCatalogInput): PricingForm {
  return {
    defaultCurrency: catalog.defaultCurrency,
    annualDiscountBps: String(catalog.annualDiscountBps),
    faqs: catalog.faqs.map((faq) => ({ ...faq })),
    plans: catalog.plans.map((plan) => ({
      ...plan,
      monthlyPrice: toMoneyInput(plan.monthlyPriceMinor),
      additionalReportPrice: toMoneyInput(plan.additionalReportPriceMinor),
    })),
  };
}

function toCatalog(form: PricingForm): CushVerifyPricingCatalogInput {
  const annualDiscountBps = form.annualDiscountBps.trim() === ""
    ? Number.NaN
    : Number(form.annualDiscountBps);
  return cushVerifyPricingCatalogSchema.parse({
    defaultCurrency: form.defaultCurrency,
    annualDiscountBps,
    faqs: form.faqs,
    plans: form.plans.map(({ monthlyPrice, additionalReportPrice, ...plan }) => ({
      ...plan,
      monthlyPriceMinor: parseMoneyInput(monthlyPrice),
      additionalReportPriceMinor: parseMoneyInput(additionalReportPrice),
    })),
  });
}

function formatMinor(value: number | null, currency: string) {
  if (value === null) return "Negotiated";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value / 100);
  } catch {
    return `${(value / 100).toFixed(2)} ${currency}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function versionToCatalog(version: AdminPricingVersion): CushVerifyPricingCatalogInput {
  return {
    defaultCurrency: version.defaultCurrency,
    annualDiscountBps: version.annualDiscountBps,
    faqs: version.faqs,
    plans: version.plans,
  };
}

function makeEmptyPlan(planKey: string): CushVerifyPricingPlanInput {
  return {
    planKey,
    name: "New plan",
    description: "",
    currency: "USD",
    monthlyPriceMinor: 0,
    includedReports: 0,
    allocationMode: "exact",
    additionalReportPriceMinor: null,
    salesMode: "self_service",
    isActive: true,
    isArchived: false,
    featureFlags: {
      fullPassportReports: false,
      incomeEmploymentHistory: false,
      rentHousingHistory: false,
      savingsHistory: false,
      financialCommitments: false,
      cushScore: false,
      confidenceInformation: false,
      evidenceClassifications: false,
      apiAccess: false,
      webhooks: false,
      usageAnalytics: false,
      auditLogs: false,
      teamAccounts: false,
    },
    apiLimits: {
      requestsPerMinute: null,
      requestsPerHour: null,
      maxConcurrentRequests: null,
      monthlyReportLimit: null,
    },
    supportLevel: "not_configured",
  };
}

function inputForFormPlan(plan: CushVerifyPricingPlanInput): PricingFormPlan {
  const { monthlyPriceMinor, additionalReportPriceMinor, ...rest } = plan;
  return {
    ...rest,
    monthlyPrice: toMoneyInput(monthlyPriceMinor),
    additionalReportPrice: toMoneyInput(additionalReportPriceMinor),
  };
}

function annualPreview(plan: PricingFormPlan, discountBps: string) {
  try {
    const monthly = parseMoneyInput(plan.monthlyPrice);
    if (discountBps.trim() === "") return null;
    const discount = Number(discountBps);
    if (monthly === null || !Number.isSafeInteger(discount) || discount < 0 || discount > 9999) return null;
    return calculateAnnualPricing(monthly, discount);
  } catch {
    return null;
  }
}

function MutationError({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="mt-3 rounded-lg border border-[#e7c9b7] bg-[#fff5ed] px-3 py-2 text-sm text-[#7c4934]" role="alert">{readableError(error)}</p>;
}

function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-xs font-semibold text-[#42433e]">
      {label}
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-[11px] font-normal leading-4 text-[#7b7c76]">{hint}</span>}
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-[#d8d7ce] bg-white px-3 py-2 text-sm font-normal text-[#292a2c] outline-none transition focus:border-[#57539c] focus:ring-2 focus:ring-[#57539c]/15";
const selectClass = `${inputClass} cursor-pointer`;

export default function CushVerifyPricingAdmin({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PricingForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const pricingQuery = useQuery<PricingAdminResponse>({
    queryKey: ["/api/admin/verify/pricing"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/verify/pricing");
      return response.json() as Promise<PricingAdminResponse>;
    },
    retry: false,
  });

  useEffect(() => {
    const draft = pricingQuery.data?.draft;
    if (draft) setForm(toForm(versionToCatalog(draft)));
    else setForm(null);
    setFormError(null);
  }, [pricingQuery.data?.draft?.id, pricingQuery.data?.draft?.updatedAt]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/verify/pricing"] });
  const createDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/verify/pricing/draft", {});
      return response.json();
    },
    onSuccess: refresh,
  });
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!form || !pricingQuery.data?.draft) throw new Error("Load a draft before saving.");
      const catalog = toCatalog(form);
      const response = await apiRequest("PUT", "/api/admin/verify/pricing/draft", {
        expectedUpdatedAt: pricingQuery.data.draft.updatedAt,
        catalog,
      });
      return response.json();
    },
    onSuccess: refresh,
  });
  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/verify/pricing/draft/publish", {});
      return response.json();
    },
    onSuccess: refresh,
  });
  const restoreMutation = useMutation({
    mutationFn: async ({ versionId, replaceExistingDraft }: { versionId: number; replaceExistingDraft: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/verify/pricing/versions/${versionId}/restore`, {
        replaceExistingDraft,
      });
      return response.json();
    },
    onSuccess: refresh,
  });

  const activePlanCount = useMemo(
    () => form?.plans.filter((plan) => plan.isActive && !plan.isArchived).length ?? 0,
    [form],
  );
  const draftHasUnsavedChanges = useMemo(() => {
    if (!form || !pricingQuery.data?.draft) return false;
    try {
      const currentDraft = cushVerifyPricingCatalogSchema.parse(versionToCatalog(pricingQuery.data.draft));
      return JSON.stringify(toCatalog(form)) !== JSON.stringify(currentDraft);
    } catch {
      return true;
    }
  }, [form, pricingQuery.data?.draft]);

  function updatePlan(index: number, update: Partial<PricingFormPlan>) {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        plans: current.plans.map((plan, planIndex) =>
          planIndex === index ? { ...plan, ...update } : plan,
        ),
      };
    });
    setFormError(null);
  }

  function handleSaveDraft() {
    try {
      if (!form) throw new Error("No pricing draft is available.");
      toCatalog(form);
      setFormError(null);
      saveDraftMutation.mutate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The draft contains invalid values.");
    }
  }

  function handlePublish() {
    if (!form || !pricingQuery.data?.draft) return;
    if (draftHasUnsavedChanges) {
      setFormError("Save the draft before publishing so the published version matches the preview.");
      return;
    }
    try {
      toCatalog(form);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Save a valid draft before publishing.");
      return;
    }
    if (form.plans.some((plan) => plan.monthlyPrice === "" && plan.salesMode !== "contact_sales")) {
      setFormError("Every fixed-price plan needs a monthly price.");
      return;
    }
    if (!window.confirm(
      `Publish pricing version ${pricingQuery.data.draft.version}? This updates the public price catalog only. It will not activate subscriptions, collect payment, or add report credits.`,
    )) return;
    publishMutation.mutate();
  }

  function handleRestore(version: PricingAdminResponse["history"][number]) {
    const draftExists = Boolean(pricingQuery.data?.draft);
    const message = draftExists
      ? `Restore version ${version.version} as a new draft and discard draft ${pricingQuery.data?.draft?.version}? The current draft will remain in history as abandoned.`
      : `Restore version ${version.version} as a new draft? The currently published prices will not change until you publish it.`;
    if (!window.confirm(message)) return;
    restoreMutation.mutate({ versionId: version.id, replaceExistingDraft: draftExists });
  }

  if (pricingQuery.isLoading) {
    return <div className="animate-pulse rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-8 text-sm text-[#777973]">Loading Cush Verify pricing…</div>;
  }
  if (pricingQuery.isError || !pricingQuery.data) {
    return (
      <section className="rounded-2xl border border-[#e5c9b9] bg-[#fbf2ec] p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" />
          <div className="min-w-0">
            <h1 className="font-semibold text-[#5b3226]">Pricing catalog unavailable</h1>
            <p className="mt-1 break-words text-sm leading-6 text-[#79594c]">{readableError(pricingQuery.error)}</p>
            <button type="button" onClick={() => pricingQuery.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d9b6a5] bg-[#fffaf7] px-3 py-2 text-sm font-semibold text-[#70402f]">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const { published, draft, history } = pricingQuery.data;

  return (
    <section aria-labelledby="verify-pricing-heading" className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-[#343279] bg-[#29266f] px-6 py-7 text-[#f7f6f1] sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#c7c5ee]">Cush Verify · Admin</p>
            <h1 id="verify-pricing-heading" className="mt-2 text-2xl font-semibold tracking-tight">Pricing catalog</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d2d1eb]">
              Draft, review, and publish versioned plan prices. Every published change is audited; existing agreements are not repriced.
            </p>
          </div>
          {canManage && !draft && (
            <button
              type="button"
              onClick={() => createDraftMutation.mutate()}
              disabled={createDraftMutation.isPending || !published}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#29266f] transition hover:bg-[#f0efff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create draft
            </button>
          )}
        </div>
      </header>

      <aside className="flex items-start gap-3 rounded-xl border border-[#d8d2b9] bg-[#fbf7e9] p-4 text-sm text-[#655426]">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#9a7936]" />
        <p className="leading-6">
          This is the server-owned pricing configuration and a public pricing preview. Checkout, subscriptions, payment collection, report retrieval, and report-credit deductions are not enabled by this catalog.
        </p>
      </aside>

      <MutationError error={createDraftMutation.error} />
      <MutationError error={saveDraftMutation.error} />
      <MutationError error={publishMutation.error} />
      <MutationError error={restoreMutation.error} />

      <section className="grid gap-4 lg:grid-cols-2">
        {[{ title: "Currently published", version: published }, { title: "Draft under review", version: draft }].map(({ title, version }) => (
          <article key={title} className="rounded-xl border border-[#e4e2d9] bg-[#fbfaf6] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#777973]">{title}</p>
                <p className="mt-2 text-lg font-semibold text-[#292a2c]">{version ? `Version ${version.version}` : "None"}</p>
              </div>
              {version && (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  version.status === "published" ? "bg-[#e4f4f0] text-[#28685c]" : "bg-[#fbf0dc] text-[#8b6324]"
                }`}>
                  {version.status === "published" ? "Published" : "Draft"}
                </span>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[#777973]">
              <Clock3 className="h-3.5 w-3.5" />
              {version?.status === "published" ? `Published ${formatDate(version.publishedAt)}` : version ? `Updated ${formatDate(version.updatedAt)}` : "Create a draft from the published version."}
            </p>
            {version && <p className="mt-3 text-xs text-[#6f706f]">{version.plans.length} configured plans · {version.faqs.length} FAQs · {version.defaultCurrency} default · {version.annualDiscountBps / 100}% annual discount</p>}
          </article>
        ))}
      </section>

      {draft && (
        <section className="overflow-hidden rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6]">
          <div className="flex flex-col gap-4 border-b border-[#e9e7df] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-[#57539c]" />
                <h2 className="font-semibold text-[#292a2c]">Edit version {draft.version}</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#777973]">Prices use integer minor units in storage. Annual totals are calculated from the discount shown below.</p>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saveDraftMutation.isPending || activePlanCount === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9d7ce] bg-white px-3.5 py-2 text-sm font-semibold text-[#44453f] transition hover:bg-[#f5f4ef] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishMutation.isPending || saveDraftMutation.isPending || activePlanCount === 0 || draftHasUnsavedChanges}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#29266f] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#37338d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish prices
                </button>
              </div>
            )}
          </div>
          {draftHasUnsavedChanges && (
            <p className="mt-3 px-1 text-xs font-medium text-[#8b6324]" role="status">
              Save the draft to publish the exact values shown in this preview.
            </p>
          )}

          <div className="space-y-6 p-5 sm:p-6">
            <MutationError error={formError ? new Error(formError) : null} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Default currency">
                <input
                  value={form?.defaultCurrency ?? draft.defaultCurrency}
                  disabled={!canManage}
                  maxLength={3}
                  onChange={(event) => setForm((current) => current ? { ...current, defaultCurrency: event.target.value.toUpperCase() } : current)}
                  className={inputClass}
                  aria-label="Pricing catalog default currency"
                />
              </FormField>
              <FormField label="Annual discount" hint="Enter a percentage from 0 to 99.99. This is saved in basis points.">
                <div className="relative">
                  <input
                    value={form
                      ? form.annualDiscountBps === "" ? "" : `${Number(form.annualDiscountBps) / 100}`
                      : `${draft.annualDiscountBps / 100}`}
                    disabled={!canManage}
                    type="number"
                    min="0"
                    max="99.99"
                    step="0.01"
                    onChange={(event) => {
                      const raw = event.target.value;
                      const bps = raw === "" ? "" : String(Math.round(Number(raw) * 100));
                      setForm((current) => current ? { ...current, annualDiscountBps: bps } : current);
                    }}
                    className={`${inputClass} pr-8`}
                    aria-label="Annual discount percent"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-[#777973]">%</span>
                </div>
              </FormField>
            </div>

            <section className="rounded-xl border border-[#e5e3db] bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-[#34353a]">Published FAQs</h3>
                  <p className="mt-1 text-xs leading-5 text-[#777973]">Questions and answers are part of this pricing version and are shown on the public pricing page.</p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setForm((current) => current && current.faqs.length < 20
                      ? { ...current, faqs: [...current.faqs, { question: "", answer: "" }] }
                      : current)}
                    disabled={(form?.faqs.length ?? 20) >= 20}
                    className="inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-[#bdbbcf] px-3 py-2 text-xs font-semibold text-[#57539c] hover:bg-[#f0efff] disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add FAQ
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {form?.faqs.map((faq, index) => (
                  <article key={index} className="grid gap-3 rounded-lg border border-[#efeee8] bg-[#faf9f5] p-3 sm:grid-cols-[.8fr_1.2fr_auto] sm:items-start">
                    <FormField label={`Question ${index + 1}`}>
                      <input
                        value={faq.question}
                        disabled={!canManage}
                        maxLength={160}
                        onChange={(event) => setForm((current) => current ? {
                          ...current,
                          faqs: current.faqs.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, question: event.target.value } : item,
                          ),
                        } : current)}
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Answer">
                      <textarea
                        value={faq.answer}
                        disabled={!canManage}
                        maxLength={1000}
                        rows={2}
                        onChange={(event) => setForm((current) => current ? {
                          ...current,
                          faqs: current.faqs.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, answer: event.target.value } : item,
                          ),
                        } : current)}
                        className={`${inputClass} resize-y`}
                      />
                    </FormField>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setForm((current) => current ? {
                          ...current,
                          faqs: current.faqs.filter((_, itemIndex) => itemIndex !== index),
                        } : current)}
                        className="mt-5 w-fit rounded-md px-2 py-1 text-xs font-semibold text-[#8b4639] hover:bg-[#fff1eb]"
                        aria-label={`Remove question ${index + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              {form?.plans.map((plan, index) => {
                const annual = annualPreview(plan, form.annualDiscountBps);
                return (
                  <article key={plan.planKey} className={`rounded-xl border p-4 sm:p-5 ${
                    plan.isArchived ? "border-[#e3e1d8] bg-[#f3f2ed] opacity-70" : "border-[#e0ded5] bg-white"
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={plan.name}
                            disabled={!canManage}
                            onChange={(event) => updatePlan(index, { name: event.target.value })}
                            className="min-w-[130px] flex-1 rounded-md border-0 bg-transparent px-0 py-0.5 text-base font-semibold text-[#292a2c] outline-none focus:ring-2 focus:ring-[#57539c]/20"
                            aria-label={`${plan.planKey} plan name`}
                          />
                          <span className="rounded-full bg-[#f0efff] px-2 py-0.5 font-mono text-[10px] text-[#57539c]">{plan.planKey}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#85867f]">Plan key cannot change after the version is created.</p>
                      </div>
                      {canManage && (
                        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-[#686962]">
                          <input
                            type="checkbox"
                            checked={plan.isArchived}
                            onChange={(event) => updatePlan(index, {
                              isArchived: event.target.checked,
                              isActive: event.target.checked ? false : plan.isActive,
                            })}
                            className="h-4 w-4 rounded border-[#b9b8b0] accent-[#57539c]"
                          />
                          <Archive className="h-3.5 w-3.5" />
                          Archived
                        </label>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <FormField label="Plan description">
                        <textarea
                          value={plan.description}
                          disabled={!canManage}
                          rows={2}
                          maxLength={500}
                          onChange={(event) => updatePlan(index, { description: event.target.value })}
                          className={`${inputClass} resize-y`}
                        />
                      </FormField>
                      <FormField label="Sales approach">
                        <select
                          value={plan.salesMode}
                          disabled={!canManage}
                          onChange={(event) => {
                            const salesMode = event.target.value as PricingFormPlan["salesMode"];
                            updatePlan(index, {
                              salesMode,
                              ...(salesMode === "contact_sales"
                                ? { monthlyPrice: "", additionalReportPrice: "" }
                                : plan.salesMode === "contact_sales"
                                  ? { monthlyPrice: "0.00" }
                                  : {}),
                              ...(salesMode === "sandbox_only"
                                ? { allocationMode: "sandbox" as const }
                                : plan.allocationMode === "sandbox"
                                  ? { allocationMode: "exact" as const }
                                  : {}),
                            });
                          }}
                          className={selectClass}
                        >
                          <option value="sandbox_only">Sandbox only</option>
                          <option value="self_service">Self-service</option>
                          <option value="contact_sales">Contact sales</option>
                        </select>
                      </FormField>
                      <FormField label="Monthly price" hint={plan.salesMode === "contact_sales" ? "Negotiated contract prices are never stored in this public catalog." : "Amount in the plan currency."}>
                        <div className="flex gap-2">
                          <input
                            value={plan.monthlyPrice}
                            disabled={!canManage || plan.salesMode === "contact_sales"}
                            onChange={(event) => updatePlan(index, { monthlyPrice: event.target.value })}
                            inputMode="decimal"
                            placeholder={plan.salesMode === "contact_sales" ? "Negotiated" : "0.00"}
                            className={inputClass}
                            aria-label={`${plan.name} monthly price`}
                          />
                          <input
                            value={plan.currency}
                            disabled={!canManage}
                            maxLength={3}
                            onChange={(event) => updatePlan(index, { currency: event.target.value.toUpperCase() })}
                            className="w-20 rounded-lg border border-[#d8d7ce] bg-white px-3 py-2 text-sm uppercase text-[#292a2c] outline-none focus:border-[#57539c]"
                            aria-label={`${plan.name} currency`}
                          />
                        </div>
                      </FormField>
                      <FormField label="Included monthly reports">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={plan.includedReports}
                          disabled={!canManage}
                          onChange={(event) => updatePlan(index, { includedReports: Number(event.target.value) })}
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Report allocation">
                        <select
                          value={plan.allocationMode}
                          disabled={!canManage}
                          onChange={(event) => {
                            const allocationMode = event.target.value as PricingFormPlan["allocationMode"];
                            updatePlan(index, {
                              allocationMode,
                              ...(allocationMode === "sandbox"
                                ? { salesMode: "sandbox_only" as const, includedReports: 0 }
                                : plan.salesMode === "sandbox_only"
                                  ? { salesMode: "self_service" as const }
                                  : {}),
                            });
                          }}
                          className={selectClass}
                        >
                          <option value="sandbox">Sandbox only</option>
                          <option value="exact">Exact monthly allocation</option>
                          <option value="minimum">Minimum allocation</option>
                        </select>
                      </FormField>
                      <FormField label="Additional report price" hint={plan.salesMode === "contact_sales" ? "Negotiated rates are kept out of this catalog." : "Per authorised report above the allocation."}>
                        <div className="flex gap-2">
                          <input
                            value={plan.additionalReportPrice}
                            disabled={!canManage || plan.salesMode === "contact_sales"}
                            onChange={(event) => updatePlan(index, { additionalReportPrice: event.target.value })}
                            inputMode="decimal"
                            placeholder={plan.salesMode === "contact_sales" ? "Negotiated" : "Not configured"}
                            className={inputClass}
                            aria-label={`${plan.name} additional report price`}
                          />
                          <span className="w-20 rounded-lg border border-[#efeee8] bg-[#f8f7f2] px-2 py-2 text-center text-xs text-[#777973]">{plan.currency}</span>
                        </div>
                      </FormField>
                      <FormField label="Support level">
                        <select
                          value={plan.supportLevel}
                          disabled={!canManage}
                          onChange={(event) => updatePlan(index, { supportLevel: event.target.value as PricingFormPlan["supportLevel"] })}
                          className={selectClass}
                        >
                          <option value="not_configured">Not configured</option>
                          <option value="community">Community</option>
                          <option value="standard">Standard</option>
                          <option value="priority">Priority</option>
                          <option value="dedicated">Dedicated</option>
                        </select>
                      </FormField>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-lg bg-[#f7f6f1] p-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#85867f]">Annual total</p>
                        <p className="mt-1 text-sm font-semibold text-[#292a2c]">{formatMinor(annual?.annualTotalMinor ?? null, plan.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#85867f]">Annual savings</p>
                        <p className="mt-1 text-sm font-semibold text-[#28685c]">{formatMinor(annual?.annualSavingsMinor ?? null, plan.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#85867f]">Equivalent monthly</p>
                        <p className="mt-1 text-sm font-semibold text-[#292a2c]">{formatMinor(annual?.annualEffectiveMonthlyMinor ?? null, plan.currency)}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-[#42433e]">Configured features</p>
                      <div className="mt-2 grid gap-x-3 gap-y-2 sm:grid-cols-2">
                        {CUSH_VERIFY_PRICING_FEATURES.map(({ key, label }) => (
                          <label key={key} className="flex items-start gap-2 text-xs leading-4 text-[#686962]">
                            <input
                              type="checkbox"
                              checked={plan.featureFlags[key]}
                              disabled={!canManage}
                              onChange={(event) => updatePlan(index, {
                                featureFlags: { ...plan.featureFlags, [key]: event.target.checked },
                              })}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#b9b8b0] accent-[#57539c]"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-[#42433e]">API limits</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {([
                          ["requestsPerMinute", "Requests / minute"],
                          ["requestsPerHour", "Requests / hour"],
                          ["maxConcurrentRequests", "Concurrent requests"],
                          ["monthlyReportLimit", "Monthly report cap"],
                        ] as const).map(([key, label]) => (
                          <FormField key={key} label={label} hint="Blank means not configured.">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={plan.apiLimits[key] ?? ""}
                              disabled={!canManage}
                              onChange={(event) => {
                                const value = event.target.value;
                                updatePlan(index, {
                                  apiLimits: {
                                    ...plan.apiLimits,
                                    [key]: value === "" ? null : Number(value),
                                  },
                                });
                              }}
                              className={inputClass}
                            />
                          </FormField>
                        ))}
                      </div>
                    </div>

                    {canManage && (
                      <label className="mt-4 flex items-center gap-2 border-t border-[#efeee8] pt-3 text-xs font-medium text-[#555750]">
                        <input
                          type="checkbox"
                          checked={plan.isActive}
                          disabled={plan.isArchived}
                          onChange={(event) => updatePlan(index, { isActive: event.target.checked })}
                          className="h-4 w-4 rounded border-[#b9b8b0] accent-[#57539c]"
                        />
                        Include in the next published catalog
                      </label>
                    )}
                  </article>
                );
              })}
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setForm((current) => {
                    if (!current) return current;
                    let suffix = current.plans.length + 1;
                    while (current.plans.some((plan) => plan.planKey === `custom-${suffix}`)) suffix += 1;
                    return {
                      ...current,
                      plans: [...current.plans, inputForFormPlan(makeEmptyPlan(`custom-${suffix}`))],
                    };
                  });
                }}
                disabled={(form?.plans.length ?? 25) >= 25}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#bdbbcf] px-3.5 py-2 text-sm font-semibold text-[#57539c] transition hover:bg-[#f0efff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add a plan
              </button>
            )}
          </div>
        </section>
      )}

      {!draft && canManage && !published && (
        <section className="rounded-xl border border-[#e5c9b9] bg-[#fbf2ec] p-4 text-sm text-[#79594c]">
          No published pricing catalog was returned. Apply the initial pricing migration before creating a draft.
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6]">
        <div className="flex items-center gap-2 border-b border-[#e9e7df] px-5 py-4">
          <History className="h-4 w-4 text-[#57539c]" />
          <div>
            <h2 className="font-semibold text-[#292a2c]">Version history</h2>
            <p className="mt-0.5 text-xs text-[#777973]">Restore creates a new draft; it never rewrites a published version.</p>
          </div>
        </div>
        {history.length ? (
          <ol className="divide-y divide-[#eeece5]">
            {history.map((version) => (
              <li key={version.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#34353a]">Version {version.version}</p>
                  <p className="mt-1 text-xs text-[#777973]">
                    {version.status} · {version.planCount} plans · {version.faqs.length} FAQs · {version.defaultCurrency} · {version.annualDiscountBps / 100}% annual discount · {formatDate(version.publishedAt)}
                  </p>
                  <details className="mt-2 text-xs text-[#57539c]">
                    <summary className="cursor-pointer font-semibold">Review version snapshot</summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {version.plans.map((plan) => {
                        const annual = calculateAnnualPricing(plan.monthlyPriceMinor, version.annualDiscountBps);
                        return (
                          <div key={plan.planKey} className="rounded-lg border border-[#e8e6de] bg-white p-3 text-[#555750]">
                            <p className="font-semibold text-[#34353a]">{plan.name} {plan.isArchived ? "· Archived" : !plan.isActive ? "· Inactive" : ""}</p>
                            <p className="mt-1">{plan.salesMode === "contact_sales" ? "Contact sales" : `${formatMinor(plan.monthlyPriceMinor, plan.currency)} / month`} · {plan.includedReports.toLocaleString("en-US")} reports</p>
                            <p className="mt-1">Annual: {formatMinor(annual.annualTotalMinor, plan.currency)} · Overage: {formatMinor(plan.additionalReportPriceMinor, plan.currency)}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 rounded-lg border border-[#e8e6de] bg-white p-3 text-[#555750]">
                      <p className="text-xs font-semibold text-[#34353a]">FAQs in this version</p>
                      <ul className="mt-2 space-y-2">
                        {version.faqs.map((faq, index) => (
                          <li key={index} className="text-xs leading-5">
                            <span className="font-semibold">{faq.question}</span>
                            <span className="block text-[#777973]">{faq.answer}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </div>
                {canManage && version.status !== "abandoned" && (
                  <button
                    type="button"
                    onClick={() => handleRestore(version)}
                    disabled={restoreMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9d7ce] bg-white px-3 py-2 text-xs font-semibold text-[#44453f] hover:bg-[#f5f4ef] disabled:opacity-50"
                  >
                    {restoreMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Restore as draft
                  </button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <div className="p-6 text-sm text-[#777973]">Published pricing versions will appear here.</div>
        )}
      </section>
    </section>
  );
}
