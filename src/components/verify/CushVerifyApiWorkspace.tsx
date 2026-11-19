import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Check, Copy, KeyRound, LoaderCircle, RotateCw, ShieldCheck, XCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { getProductSessionHeaders } from "@/lib/product-session";
import {
  CUSH_VERIFY_API_ENDPOINTS,
  CUSH_VERIFY_API_SCOPES,
  type CushVerifyApiKeyEnvironment,
  type CushVerifyApiScope,
} from "@shared/cush-verify-api";

type ApiKeyItem = {
  id: number;
  name: string;
  environment: CushVerifyApiKeyEnvironment;
  prefix: string;
  scopes: string[];
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type ApiKeysResponse = {
  keys: ApiKeyItem[];
  events: Array<{
    id: number;
    eventType: "created" | "rotated" | "revoked";
    environment: CushVerifyApiKeyEnvironment;
    details: Record<string, unknown>;
    createdAt: string;
    keyName: string | null;
  }>;
  productionAccess: {
    enabled: boolean;
    reason: string | null;
    requestStatus?: "submitted" | "approved" | "rejected" | null;
    requestSubmittedAt?: string | null;
    requestReviewedAt?: string | null;
    decisionNote?: string | null;
    limits: {
      requestsPerMinute: number | null;
      requestsPerHour: number | null;
      maxConcurrentRequests: number | null;
      monthlyReportLimit: number | null;
    } | null;
  };
  sandboxLimits: ApiKeysResponse["productionAccess"]["limits"];
  scopes: CushVerifyApiScope[];
};

type ApiAccessRequestsResponse = {
  requests: Array<{
    id: number;
    intendedUse: string;
    estimatedMonthlyRequests: number | null;
    status: "submitted" | "approved" | "rejected";
    decisionNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;
  events: Array<{
    id: number;
    requestId: number;
    eventType: "submitted" | "approved" | "rejected";
    actorType: "organisation_admin" | "cush_admin";
    createdAt: string;
  }>;
};

type ApiUsageResponse = {
  range: { from: string; to: string };
  summary: { total: number; successful: number; failed: number; rateLimited: number; reportsBilled: number };
  credits: { available: number; usedThisPeriod: number; periodStartAt: string | null; periodEndAt: string | null };
  productionAccess: ApiKeysResponse["productionAccess"];
  sandboxLimits: ApiKeysResponse["productionAccess"]["limits"];
  usageWindows: {
    production: { requestsLastMinute: number; requestsLastHour: number; concurrentRequests: number; reportsThisPeriod: number };
    sandbox: { requestsLastMinute: number; requestsLastHour: number; concurrentRequests: number; reportsThisPeriod: number };
  };
  history: Array<{
    id: number;
    requestId: string;
    environment: CushVerifyApiKeyEnvironment;
    endpoint: string;
    method: string;
    responseStatus: number | null;
    durationMs: number | null;
    billableReport: boolean;
    createdAt: string;
    keyName: string | null;
  }>;
};

const apiScopeLabels: Record<CushVerifyApiScope, string> = {
  "passport:discover": "Find Passport profiles",
  "reports:request": "Request reports",
  "reports:read": "Retrieve reports",
  "usage:read": "View usage",
  "webhooks:manage": "Manage signed webhooks",
  "sandbox:simulate": "Run sandbox simulations",
};

async function requestJson<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { ...getProductSessionHeaders(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || "The API request could not be completed.");
  }
  return payload as T;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function limitLabel(value: number | null | undefined) {
  return value == null ? "Not set" : value.toLocaleString();
}

export default function CushVerifyApiWorkspace({ role }: { role: string }) {
  const queryClient = useQueryClient();
  const isAdmin = role === "organisation_admin";
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<CushVerifyApiKeyEnvironment>("sandbox");
  const [selectedScopes, setSelectedScopes] = useState<CushVerifyApiScope[]>(["sandbox:simulate", "passport:discover", "reports:request", "reports:read"]);
  const [oneTimeSecret, setOneTimeSecret] = useState("");
  const [oneTimeEnvironment, setOneTimeEnvironment] = useState<CushVerifyApiKeyEnvironment | null>(null);
  const [accessIntendedUse, setAccessIntendedUse] = useState("");
  const [accessMonthlyEstimate, setAccessMonthlyEstimate] = useState("");
  const [accessRequestError, setAccessRequestError] = useState("");
  const [accessRequestSuccess, setAccessRequestSuccess] = useState("");
  const [accessRequestBusy, setAccessRequestBusy] = useState(false);
  const [sandboxTestBusy, setSandboxTestBusy] = useState(false);
  const [sandboxTestMessage, setSandboxTestMessage] = useState("");
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [environmentFilter, setEnvironmentFilter] = useState<"all" | CushVerifyApiKeyEnvironment>("all");
  const [apiKeyFilter, setApiKeyFilter] = useState("all");
  const [endpointFilter, setEndpointFilter] = useState("all");
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

  const keysQuery = useQuery<ApiKeysResponse>({
    queryKey: ["/api/verify/api-keys"],
    queryFn: () => requestJson("/api/verify/api-keys"),
    enabled: isAdmin,
    retry: false,
    staleTime: 30_000,
  });
  const accessRequestsQuery = useQuery<ApiAccessRequestsResponse>({
    queryKey: ["/api/verify/api-access-requests"],
    queryFn: () => requestJson("/api/verify/api-access-requests"),
    enabled: isAdmin,
    retry: false,
    staleTime: 30_000,
  });
  const usageQuery = useQuery<ApiUsageResponse>({
    queryKey: ["/api/verify/api-usage", environmentFilter, apiKeyFilter, endpointFilter, fromDate, toDate],
    queryFn: () => {
      const query = new URLSearchParams();
      if (environmentFilter !== "all") query.set("environment", environmentFilter);
      if (apiKeyFilter !== "all") query.set("apiKeyId", apiKeyFilter);
      if (endpointFilter !== "all") query.set("endpoint", endpointFilter);
      query.set("from", new Date(`${fromDate}T00:00:00.000Z`).toISOString());
      query.set("to", new Date(`${toDate}T23:59:59.999Z`).toISOString());
      return requestJson(`/api/verify/api-usage${query.size ? `?${query.toString()}` : ""}`);
    },
    retry: false,
    staleTime: 30_000,
  });

  const apiOrigin = useMemo(() => `${window.location.origin}/api/v1`, []);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/verify/api-keys"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/verify/api-usage"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/verify/api-access-requests"] }),
    ]);
  }

  async function submitApiAccessRequest() {
    setAccessRequestError("");
    setAccessRequestSuccess("");
    setAccessRequestBusy(true);
    try {
      await requestJson("/api/verify/api-access-requests", "POST", {
        intendedUse: accessIntendedUse,
        estimatedMonthlyRequests: accessMonthlyEstimate.trim() ? Number(accessMonthlyEstimate) : null,
      });
      setAccessIntendedUse("");
      setAccessMonthlyEstimate("");
      setAccessRequestSuccess("Request submitted. Production keys remain locked until Cush approves the request and your subscription includes API access.");
      await refresh();
    } catch (caught) {
      setAccessRequestError(caught instanceof Error ? caught.message : "The API access request could not be submitted.");
    } finally {
      setAccessRequestBusy(false);
    }
  }

  async function createKey() {
    setError("");
    setOneTimeSecret("");
    setOneTimeEnvironment(null);
    setSandboxTestMessage("");
    try {
      const result = await requestJson<{ key: string }>("/api/verify/api-keys", "POST", {
        name,
        environment,
        scopes: selectedScopes.filter((scope) => environment === "sandbox" ? scope === "sandbox:simulate" : scope !== "sandbox:simulate"),
      });
      setOneTimeSecret(result.key);
      setOneTimeEnvironment(environment);
      setName("");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The API key could not be created.");
    }
  }

  async function revokeKey(key: ApiKeyItem) {
    if (!window.confirm(`Revoke the ${key.environment} key “${key.name}”? Applications using it will stop working immediately.`)) return;
    setBusyKey(key.id);
    setError("");
    try {
      await requestJson(`/api/verify/api-keys/${key.id}/revoke`, "POST", {});
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The API key could not be revoked.");
    } finally {
      setBusyKey(null);
    }
  }

  async function rotateKey(key: ApiKeyItem) {
    if (!window.confirm(`Replace the ${key.environment} key “${key.name}”? The current key will stop working immediately.`)) return;
    setBusyKey(key.id);
    setError("");
    setOneTimeSecret("");
    setOneTimeEnvironment(null);
    setSandboxTestMessage("");
    try {
      const result = await requestJson<{ key: string }>(`/api/verify/api-keys/${key.id}/rotate`, "POST", {});
      setOneTimeSecret(result.key);
      setOneTimeEnvironment(key.environment);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The API key could not be rotated.");
    } finally {
      setBusyKey(null);
    }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(oneTimeSecret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard access was blocked. Select and copy the key manually.");
    }
  }

  async function runSandboxKeyTest() {
    if (!oneTimeSecret || oneTimeEnvironment !== "sandbox") return;
    setSandboxTestBusy(true);
    setSandboxTestMessage("");
    const headers = { Authorization: `Bearer ${oneTimeSecret}` };

    try {
      const statusResponse = await fetch(`${apiOrigin}/sandbox/status`, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        headers,
      });
      const status = await statusResponse.json().catch(() => ({})) as {
        environment?: string;
        liveData?: boolean;
        reportCreditsUsed?: number;
      };
      if (!statusResponse.ok) {
        throw new Error(`Sandbox status check failed (${statusResponse.status}).`);
      }

      const workflowResponse = await fetch(`${apiOrigin}/sandbox/report-workflow`, {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "authorized" }),
      });
      const workflow = await workflowResponse.json().catch(() => ({})) as {
        environment?: string;
        simulated?: boolean;
        status?: string;
        creditsUsed?: number;
      };
      if (!workflowResponse.ok) {
        throw new Error(`Simulated report check failed (${workflowResponse.status}).`);
      }

      const statusIsSafe = status.environment === "sandbox" && status.liveData === false && status.reportCreditsUsed === 0;
      const workflowIsSafe = workflow.environment === "sandbox"
        && workflow.simulated === true
        && workflow.status === "authorized"
        && workflow.creditsUsed === 0;
      if (!statusIsSafe || !workflowIsSafe) {
        throw new Error("The sandbox returned an unexpected result; no report credit should be used.");
      }

      setSandboxTestMessage("Sandbox key works. The simulated authorized flow used 0 report credits.");
    } catch (caught) {
      setSandboxTestMessage(caught instanceof Error ? caught.message : "The sandbox key test could not be completed.");
    } finally {
      setSandboxTestBusy(false);
    }
  }

  function toggleScope(scope: CushVerifyApiScope) {
    setSelectedScopes((current) => current.includes(scope)
      ? current.filter((value) => value !== scope)
      : [...current, scope]);
  }

  const errorMessage = error || (
    keysQuery.isError ? (keysQuery.error instanceof Error ? keysQuery.error.message : "API keys are unavailable.") : ""
  ) || (
    accessRequestsQuery.isError ? (accessRequestsQuery.error instanceof Error ? accessRequestsQuery.error.message : "API access request history is unavailable.") : ""
  ) || (
    usageQuery.isError ? (usageQuery.error instanceof Error ? usageQuery.error.message : "API usage is unavailable.") : ""
  );
  const displayedLimits = usageQuery.data
    ? environmentFilter === "sandbox"
      ? usageQuery.data.sandboxLimits
      : usageQuery.data.productionAccess.limits
    : null;
  const displayedLimitEnvironment = environmentFilter === "sandbox" ? "Sandbox" : "Production";
  const limitWarnings: Array<{ id: string; message: string; critical: boolean }> = [];
  const checkLimit = (environment: "sandbox" | "production", metric: string, used: number, limit: number | null | undefined) => {
    if (limit == null || limit < 1 || (environmentFilter !== "all" && environmentFilter !== environment)) return;
    if (used >= limit * 0.8) {
      limitWarnings.push({
        id: `${environment}-${metric}`,
        message: `${environment === "sandbox" ? "Sandbox" : "Production"} ${metric}: ${used.toLocaleString()} of ${limit.toLocaleString()} used`,
        critical: used >= limit,
      });
    }
  };
  if (usageQuery.data) {
    const envs = environmentFilter === "all" ? ["production", "sandbox"] as const : [environmentFilter] as const;
    for (const env of envs) {
      const limits = env === "production" ? usageQuery.data.productionAccess.limits : usageQuery.data.sandboxLimits;
      const windows = usageQuery.data.usageWindows[env];
      checkLimit(env, "requests per minute", windows.requestsLastMinute, limits?.requestsPerMinute);
      checkLimit(env, "requests per hour", windows.requestsLastHour, limits?.requestsPerHour);
      checkLimit(env, "concurrent requests", windows.concurrentRequests, limits?.maxConcurrentRequests);
      if (env === "production") {
        checkLimit(env, "monthly reports", windows.reportsThisPeriod, limits?.monthlyReportLimit);
      }
    }
    if (usageQuery.data.credits.available <= 1) {
      limitWarnings.push({
        id: "report-credits",
        message: usageQuery.data.credits.available === 0 ? "No report credits remain." : "One report credit remains.",
        critical: usageQuery.data.credits.available === 0,
      });
    }
  }

  return (
    <div className="mt-5 space-y-7">
      <section className="rounded-2xl border border-[#dce5f1] bg-[#f8fbff] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6eefb] text-[#3471d2]"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h3 className="font-semibold text-[#12213d]">Consent and billing remain enforced</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#52627b]">
              Production API requests use the same approved-organisation, consent, report-delivery, and credit checks as the workspace. Discovery, consent, sandbox calls, and failed requests do not use report credits.
            </p>
          </div>
        </div>
      </section>

      {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</p>}

      {isAdmin ? (
        <section className="space-y-4">
          {keysQuery.data && (
            <section className="rounded-2xl border border-[#dce5f1] bg-white p-4 sm:p-5" aria-labelledby="production-api-access-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6c7c94]">Production API</p>
                  <h3 id="production-api-access-heading" className="mt-1 text-base font-semibold text-[#12213d]">Access request</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#61728a]">
                    Cush reviews production access separately. Approval does not replace the requirement for an active subscription whose plan includes API access.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  keysQuery.data.productionAccess.enabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                }`}>
                  {keysQuery.data.productionAccess.enabled ? "Enabled" : "Not enabled"}
                </span>
              </div>

              {!keysQuery.data.productionAccess.enabled && keysQuery.data.productionAccess.reason && (
                <p className="mt-3 rounded-lg bg-[#f5f7fb] px-3 py-2 text-sm text-[#52627b]">
                  {keysQuery.data.productionAccess.reason}
                </p>
              )}

              {accessRequestError && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{accessRequestError}</p>}
              {accessRequestSuccess && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{accessRequestSuccess}</p>}

              {accessRequestsQuery.isLoading ? (
                <p className="mt-4 text-sm text-[#71819b]">Loading access request history…</p>
              ) : (
                <>
                  {accessRequestsQuery.data?.requests.length ? (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#71819b]">Request history</h4>
                      {accessRequestsQuery.data.requests.map((request) => {
                        const statusLabel = request.status === "submitted" ? "Awaiting review" : request.status === "approved" ? "Approved" : "Not approved";
                        const relatedEvents = accessRequestsQuery.data?.events.filter((event) => event.requestId === request.id) ?? [];
                        return (
                          <article key={request.id} className="rounded-xl border border-[#e4eaf2] bg-[#f8fbff] p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#24354f]">{statusLabel}</span>
                              <span className="text-xs text-[#71819b]">Submitted {formatDate(request.createdAt)}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#52627b]">{request.intendedUse}</p>
                            {request.estimatedMonthlyRequests !== null && (
                              <p className="mt-1 text-xs text-[#71819b]">Estimated monthly requests: {request.estimatedMonthlyRequests.toLocaleString()}</p>
                            )}
                            {request.decisionNote && (
                              <p className="mt-2 rounded-lg border border-[#e3e8ef] bg-white p-2 text-xs leading-5 text-[#52627b]">
                                Cush review note: {request.decisionNote}
                              </p>
                            )}
                            {relatedEvents.length > 0 && (
                              <p className="mt-2 text-[11px] text-[#8794a7]">
                                Activity: {relatedEvents.map((event) =>
                                  `${event.eventType === "submitted" ? "Submitted" : event.eventType === "approved" ? "Approved" : "Rejected"} · ${formatDate(event.createdAt)}`
                                ).join(" · ")}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}

                  {!keysQuery.data.productionAccess.enabled
                    && keysQuery.data.productionAccess.requestStatus !== "submitted"
                    && keysQuery.data.productionAccess.requestStatus !== "approved" && (
                      <div className="mt-4 border-t border-[#e7edf4] pt-4">
                        <h4 className="text-sm font-semibold text-[#24354f]">
                          {keysQuery.data.productionAccess.requestStatus === "rejected" ? "Submit a new request" : "Request production API access"}
                        </h4>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                          <label className="text-xs font-semibold text-[#52627b]">
                            Intended API use
                            <textarea
                              value={accessIntendedUse}
                              onChange={(event) => setAccessIntendedUse(event.target.value)}
                              minLength={10}
                              maxLength={1200}
                              rows={3}
                              placeholder="Describe the product or workflow that will use the Cush Verify API."
                              className="mt-1.5 w-full rounded-lg border border-[#d5deea] bg-white px-3 py-2 text-sm font-normal text-[#12213d]"
                            />
                            <span className="mt-1 block font-normal text-[#8794a7]">{accessIntendedUse.trim().length}/1200 characters</span>
                          </label>
                          <label className="text-xs font-semibold text-[#52627b]">
                            Estimated monthly requests
                            <input
                              type="number"
                              min={0}
                              max={10_000_000}
                              value={accessMonthlyEstimate}
                              onChange={(event) => setAccessMonthlyEstimate(event.target.value)}
                              placeholder="Optional"
                              className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d5deea] bg-white px-3 text-sm font-normal text-[#12213d]"
                            />
                            <span className="mt-1 block font-normal text-[#8794a7]">Optional estimate to help review.</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => void submitApiAccessRequest()}
                          disabled={accessRequestBusy || accessIntendedUse.trim().length < 10 || accessIntendedUse.trim().length > 1200}
                          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0c1830] px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {accessRequestBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          {accessRequestBusy ? "Submitting…" : "Submit access request"}
                        </button>
                      </div>
                    )}
                </>
              )}
            </section>
          )}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#12213d]">API credentials</h3>
              <p className="mt-1 text-sm text-[#61728a]">Create separate credentials for simulated testing and production.</p>
            </div>
            <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-[#dce5f1] px-3 py-2 text-xs font-semibold text-[#52627b] hover:bg-[#f8fbff]">
              <RotateCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          <div className="grid gap-4 rounded-xl border border-[#dce5f1] p-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#52627b]">
              Key name
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="e.g. Finance integration" className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d5deea] bg-white px-3 text-sm font-normal text-[#12213d]" />
            </label>
            <label className="text-xs font-semibold text-[#52627b]">
              Environment
              <select value={environment} onChange={(event) => setEnvironment(event.target.value as CushVerifyApiKeyEnvironment)} className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d5deea] bg-white px-3 text-sm font-normal text-[#12213d]">
                <option value="sandbox">Sandbox · simulated data only</option>
                <option value="production" disabled={!keysQuery.data?.productionAccess.enabled}>Production · live consented reports</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-[#52627b]">Permissions</p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {CUSH_VERIFY_API_SCOPES
                  .filter((scope) => environment === "sandbox" ? scope === "sandbox:simulate" : scope !== "sandbox:simulate")
                  .map((scope) => (
                    <label key={scope} className="inline-flex items-center gap-2 text-xs text-[#40516d]">
                      <input type="checkbox" checked={selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} className="h-4 w-4 accent-[#3475e7]" />
                      {apiScopeLabels[scope]}
                    </label>
                  ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#71819b]">
                {environment === "production"
                  ? keysQuery.data?.productionAccess.reason ?? "Production access follows your approved institution and active subscription."
                  : "Sandbox uses synthetic responses only. It never reads Passport records or consumes credits."}
              </p>
              <button
                type="button"
                onClick={() => void createKey()}
                disabled={!name.trim() || selectedScopes.filter((scope) => environment === "sandbox" || scope !== "sandbox:simulate").length === 0 || (environment === "production" && !keysQuery.data?.productionAccess.enabled)}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0c1830] px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" /> Create {environment} key
              </button>
            </div>
          </div>

          {oneTimeSecret && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-emerald-950">Copy this key now</h4>
                  <p className="mt-1 text-xs leading-5 text-emerald-900">The complete secret is shown only once. Store it in your server-side secret manager; never place it in browser code or commit it to Git.</p>
                  <code className="mt-3 block break-all rounded-lg border border-emerald-200 bg-white p-3 text-xs text-[#12213d]">{oneTimeSecret}</code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copySecret()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white">
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy key"}
                    </button>
                    {oneTimeEnvironment === "sandbox" && (
                      <button
                        type="button"
                        onClick={() => void runSandboxKeyTest()}
                        disabled={sandboxTestBusy}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-950 disabled:opacity-60"
                      >
                        {sandboxTestBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        {sandboxTestBusy ? "Testing sandbox…" : "Test sandbox key"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setOneTimeSecret("");
                        setOneTimeEnvironment(null);
                        setSandboxTestMessage("");
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-900"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Hide secret
                    </button>
                  </div>
                  {sandboxTestMessage && (
                    <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-950">
                      {sandboxTestMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {keysQuery.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-[#61728a]"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading API keys…</p>
          ) : keysQuery.data?.keys.length ? (
            <div className="overflow-x-auto rounded-xl border border-[#dce5f1]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-wide text-[#71819b]">
                  <tr><th className="px-4 py-3">Key</th><th className="px-4 py-3">Environment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last used</th><th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-[#e8edf4]">
                  {keysQuery.data.keys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#243650]">{key.name}</p>
                        <code className="mt-1 block text-[11px] text-[#71819b]">{key.prefix}…</code>
                        <p className="mt-1 text-[10px] text-[#71819b]">{key.scopes.map((scope) => apiScopeLabels[scope as CushVerifyApiScope] ?? scope).join(" · ")}</p>
                      </td>
                      <td className="px-4 py-3 capitalize">{key.environment}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${key.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{key.status}</span></td>
                      <td className="px-4 py-3 text-xs text-[#61728a]">{formatDate(key.lastUsedAt)}</td>
                      <td className="px-4 py-3">
                        {key.status === "active" ? (
                          <div className="flex gap-2">
                            <button type="button" disabled={busyKey === key.id || (key.environment === "production" && !keysQuery.data.productionAccess.enabled)} onClick={() => void rotateKey(key)} className="rounded-lg border border-[#dce5f1] px-2.5 py-1.5 text-xs font-semibold text-[#52627b] disabled:opacity-50">{busyKey === key.id ? "Working…" : "Rotate"}</button>
                            <button type="button" disabled={busyKey === key.id} onClick={() => void revokeKey(key)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50">Revoke</button>
                          </div>
                        ) : <span className="text-xs text-[#71819b]">Revoked {formatDate(key.revokedAt)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#cdd9e8] p-6 text-center text-sm text-[#61728a]">No API keys yet. Create a sandbox key to try the simulated flow.</div>
          )}

          {Boolean(keysQuery.data?.events.length) && (
            <div className="rounded-xl border border-[#dce5f1]">
              <div className="border-b border-[#e8edf4] bg-[#f8fbff] px-4 py-3">
                <h4 className="text-sm font-semibold text-[#243650]">Credential activity</h4>
                <p className="mt-0.5 text-xs text-[#71819b]">Recent key creation, rotation, and revocation; secret values are never included.</p>
              </div>
              <ul className="divide-y divide-[#e8edf4]">
                {keysQuery.data?.events.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
                    <span className="font-medium capitalize text-[#243650]">{event.eventType} · {event.keyName ?? "Removed key"} · {event.environment}</span>
                    <time className="text-[#71819b]">{formatDate(event.createdAt)}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Only organisation administrators can create, rotate, or revoke API keys. You can still review the usage and API guide below.
        </section>
      )}

      {usageQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-[#61728a]"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading API usage…</p>
      ) : usageQuery.data && (
        <>
          <section>
            <div className="mb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[#12213d]">Usage and limits</h3>
                <p className="mt-1 text-xs text-[#71819b]">Recent request history is limited to 100 entries; totals use the selected period.</p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <label className="text-xs font-semibold text-[#52627b]">From
                  <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 min-h-9 w-full rounded-lg border border-[#d5deea] bg-white px-2 text-xs font-normal" />
                </label>
                <label className="text-xs font-semibold text-[#52627b]">To
                  <input type="date" value={toDate} min={fromDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setToDate(event.target.value)} className="mt-1 min-h-9 w-full rounded-lg border border-[#d5deea] bg-white px-2 text-xs font-normal" />
                </label>
                <label className="text-xs font-semibold text-[#52627b]">Environment
                  <select value={environmentFilter} onChange={(event) => setEnvironmentFilter(event.target.value as typeof environmentFilter)} className="mt-1 min-h-9 w-full rounded-lg border border-[#d5deea] bg-white px-2 text-xs font-normal">
                    <option value="all">All</option><option value="sandbox">Sandbox</option><option value="production">Production</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-[#52627b]">Endpoint
                  <select value={endpointFilter} onChange={(event) => setEndpointFilter(event.target.value)} className="mt-1 min-h-9 w-full rounded-lg border border-[#d5deea] bg-white px-2 text-xs font-normal">
                    <option value="all">All endpoints</option>
                    {CUSH_VERIFY_API_ENDPOINTS.map((endpoint) => <option key={endpoint} value={endpoint}>{endpoint.replace("/api/v1/", "")}</option>)}
                  </select>
                </label>
                {isAdmin && (
                  <label className="text-xs font-semibold text-[#52627b]">API key
                    <select value={apiKeyFilter} onChange={(event) => setApiKeyFilter(event.target.value)} className="mt-1 min-h-9 w-full rounded-lg border border-[#d5deea] bg-white px-2 text-xs font-normal">
                      <option value="all">All keys</option>
                      {keysQuery.data?.keys.map((key) => <option key={key.id} value={key.id}>{key.name} · {key.environment}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Requests", usageQuery.data.summary.total],
                ["Successful", usageQuery.data.summary.successful],
                ["Failed", usageQuery.data.summary.failed],
                ["Rate limited", usageQuery.data.summary.rateLimited],
                ["Reports billed", usageQuery.data.summary.reportsBilled],
              ].map(([label, value]) => <article key={label} className="rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4"><p className="text-xs text-[#61728a]">{label}</p><p className="mt-2 text-2xl font-semibold text-[#12213d]">{value}</p></article>)}
            </div>
            {limitWarnings.length > 0 && (
              <div className="mt-3 space-y-2" aria-live="polite">
                {limitWarnings.map((warning) => (
                  <p key={warning.id} className={`rounded-lg border px-3 py-2 text-xs font-medium ${warning.critical ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    {warning.critical ? "Limit reached: " : "Approaching limit: "}{warning.message}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-3 grid gap-3 rounded-xl border border-[#dce5f1] p-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [`${displayedLimitEnvironment} requests per minute`, displayedLimits?.requestsPerMinute, usageQuery.data.usageWindows[environmentFilter === "sandbox" ? "sandbox" : "production"].requestsLastMinute],
                [`${displayedLimitEnvironment} requests per hour`, displayedLimits?.requestsPerHour, usageQuery.data.usageWindows[environmentFilter === "sandbox" ? "sandbox" : "production"].requestsLastHour],
                [`${displayedLimitEnvironment} concurrent requests`, displayedLimits?.maxConcurrentRequests, usageQuery.data.usageWindows[environmentFilter === "sandbox" ? "sandbox" : "production"].concurrentRequests],
                [`${displayedLimitEnvironment} monthly API report limit`, environmentFilter === "sandbox" ? null : displayedLimits?.monthlyReportLimit, usageQuery.data.usageWindows[environmentFilter === "sandbox" ? "sandbox" : "production"].reportsThisPeriod],
              ].map(([metricLabel, value, used]) => <p key={metricLabel} className="text-xs text-[#61728a]">{metricLabel}<span className="mt-1 block text-sm font-semibold text-[#243650]">{environmentFilter === "sandbox" && String(metricLabel).includes("monthly") ? "Not applicable" : `${used} used · ${limitLabel(value as number | null | undefined)} limit`}</span></p>)}
            </div>
            <p className="mt-3 text-xs text-[#61728a]">Available report credits: <strong className="text-[#243650]">{usageQuery.data.credits.available}</strong> · Used this billing period: <strong className="text-[#243650]">{usageQuery.data.credits.usedThisPeriod}</strong></p>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-[#3471d2]" /><h3 className="font-semibold text-[#12213d]">Recent request history</h3></div>
            {usageQuery.data.history.length ? (
              <div className="overflow-x-auto rounded-xl border border-[#dce5f1]">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-wide text-[#71819b]">
                    <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Key / environment</th><th className="px-4 py-3">Endpoint / request ID</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Billing</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8edf4]">
                    {usageQuery.data.history.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[#61728a]">{formatDate(row.createdAt)}</td>
                        <td className="px-4 py-3 text-xs">{row.keyName ?? "Unknown key"} · {row.environment}</td>
                        <td className="px-4 py-3"><code className="text-xs">{row.method} {row.endpoint}</code><code className="mt-1 block text-[10px] text-[#71819b]">{row.requestId}</code></td>
                        <td className="px-4 py-3 text-xs">{row.responseStatus ?? "In progress"}</td>
                        <td className="px-4 py-3 text-xs">{row.durationMs == null ? "—" : `${row.durationMs} ms`}</td>
                        <td className="px-4 py-3 text-xs">{row.billableReport ? "1 report credit" : "No charge"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="rounded-xl border border-dashed border-[#cdd9e8] p-5 text-sm text-[#61728a]">No API requests have been recorded for this range.</p>}
          </section>
        </>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[#dce5f1] p-5">
          <h3 className="font-semibold text-[#12213d]">Versioned endpoints</h3>
          <p className="mt-1 text-xs leading-5 text-[#61728a]">Requests require a server-side bearer key. API keys are environment-bound; sandbox keys cannot access production routes.</p>
          <code className="mt-3 block break-all rounded-lg bg-[#f5f8fc] p-3 text-xs text-[#243650]">{apiOrigin}/verify/report-requests</code>
          <code className="mt-2 block break-all rounded-lg bg-[#f5f8fc] p-3 text-xs text-[#243650]">{apiOrigin}/verify/report-requests/:requestId/deliver</code>
          <code className="mt-2 block break-all rounded-lg bg-[#f5f8fc] p-3 text-xs text-[#243650]">{apiOrigin}/sandbox/report-workflow</code>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0c1830] p-3 text-[11px] leading-5 text-blue-100">{`curl -X POST "${apiOrigin}/verify/report-requests" \\
  -H "Authorization: Bearer $CUSH_VERIFY_PRODUCTION_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"recipientEmail":"person@example.com","purpose":"Assess an application with the individual’s consent","categories":["score_summary"],"authorizationDays":30}'`}</pre>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0c1830] p-3 text-[11px] leading-5 text-blue-100">{`curl -X POST "${apiOrigin}/verify/report-requests/$REQUEST_ID/deliver" \\
  -H "Authorization: Bearer $CUSH_VERIFY_PRODUCTION_KEY"`}</pre>
          <p className="mt-3 text-xs leading-5 text-[#61728a]">A report request only emails a consent link. Protected report data is returned only after the individual explicitly approves it.</p>
        </article>
        <article className="rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-5">
          <h3 className="font-semibold text-[#12213d]">Sandbox is simulated</h3>
          <p className="mt-1 text-xs leading-5 text-[#61728a]">Sandbox responses use synthetic examples only. They create no real requests, send no email, read no Passport profile, and consume no report credits.</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0c1830] p-3 text-[11px] leading-5 text-blue-100">{`curl -X POST "${apiOrigin}/sandbox/report-workflow" \\
  -H "Authorization: Bearer $CUSH_VERIFY_SANDBOX_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"scenario":"authorized"}'`}</pre>
          <p className="mt-3 text-xs leading-5 text-[#61728a]">For production calls, use the versioned <code>/verify</code> endpoints and a production key stored only in your server-side secret manager.</p>
        </article>
      </section>
    </div>
  );
}
