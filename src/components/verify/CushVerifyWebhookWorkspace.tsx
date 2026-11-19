import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bell, Check, Copy, KeyRound, LoaderCircle, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import { getProductSessionHeaders } from "@/lib/product-session";

type Destination = {
  id: number;
  name: string;
  url: string;
  environment: "production";
  eventTypes: string[];
  usageThresholdPercentages: number[];
  status: "active" | "disabled" | "deleted";
  createdAt: string;
  updatedAt: string;
};

type Delivery = {
  id: number;
  eventId: string;
  eventType: string;
  status: string;
  attemptCount: number;
  lastStatusCode: number | null;
  lastErrorCode: string | null;
  createdAt: string;
  deliveredAt: string | null;
  attempts: Array<{
    attemptNumber: number;
    outcome: string;
    responseStatus: number | null;
    errorCode: string | null;
    durationMs: number | null;
    startedAt: string;
    completedAt: string | null;
  }>;
};

type Notification = {
  id: number;
  destinationName: string;
  eventType: string;
  deliveryStatus: string;
  attemptCount: number;
  lastErrorCode: string | null;
  emailStatus: string;
  createdAt: string;
  readAt: string | null;
};

type WorkspaceResponse = {
  destinations: Destination[];
  auditEvents: Array<{
    id: number;
    destinationId: number | null;
    actorInstitutionalUserId: number | null;
    eventType: string;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
};

const eventOptions = [
  ["report.requested", "Report request created"],
  ["request.linked", "Request linked to a Passport"],
  ["consent.approved", "Consent approved"],
  ["consent.declined", "Consent declined"],
  ["consent.revoked", "Consent revoked"],
  ["report.delivered", "Authorised report delivered"],
  ["report.accessed", "Authorised report accessed"],
  ["usage.threshold_reached", "Usage threshold reached"],
] as const;
const thresholdOptions = [5, 10, 20, 25, 50, 75, 80, 90, 95, 100];

async function requestJson<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { ...getProductSessionHeaders(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { error?: string }).error || "The request could not be completed.");
  return payload as T;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString();
}

export default function CushVerifyWebhookWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>(["report.requested", "consent.approved", "report.delivered"]);
  const [thresholds, setThresholds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [oneTimeSecret, setOneTimeSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const settingsQuery = useQuery<WorkspaceResponse>({
    queryKey: ["/api/verify/webhooks"],
    queryFn: () => requestJson("/api/verify/webhooks"),
    enabled: isAdmin,
    retry: false,
    refetchInterval: 30_000,
  });
  const notificationsQuery = useQuery<{ notifications: Notification[] }>({
    queryKey: ["/api/verify/webhook-notifications"],
    queryFn: () => requestJson("/api/verify/webhook-notifications?limit=20"),
    enabled: isAdmin,
    retry: false,
    refetchInterval: 30_000,
  });
  const deliveriesQuery = useQuery<{ deliveries: Delivery[] }>({
    queryKey: ["/api/verify/webhooks", selectedId, "deliveries"],
    queryFn: () => requestJson(`/api/verify/webhooks/${selectedId}/deliveries`),
    enabled: isAdmin && selectedId !== null,
    retry: false,
  });
  const destinations = settingsQuery.data?.destinations ?? [];
  const activeDestinations = useMemo(
    () => destinations.filter((destination) => destination.status !== "deleted"),
    [destinations],
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setUrl("");
    setEventTypes(["report.requested", "consent.approved", "report.delivered"]);
    setThresholds([]);
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/verify/webhooks"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/verify/webhook-notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/verify/webhooks", selectedId, "deliveries"] }),
    ]);
  }

  async function saveDestination() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        url: url.trim(),
        eventTypes,
        usageThresholdPercentages: eventTypes.includes("usage.threshold_reached") ? thresholds : [],
      };
      if (editingId) {
        await requestJson(`/api/verify/webhooks/${editingId}`, "PATCH", payload);
        setSuccess("Webhook destination updated.");
      } else {
        const result = await requestJson<{ signingSecret: string }>("/api/verify/webhooks", "POST", payload);
        setOneTimeSecret(result.signingSecret);
        setCopied(false);
        setSuccess("Webhook destination created. Copy its signing secret now; it is shown only once.");
      }
      resetForm();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The webhook destination could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function updateDestination(destination: Destination, status: "active" | "disabled") {
    setError("");
    setSuccess("");
    try {
      await requestJson(`/api/verify/webhooks/${destination.id}`, "PATCH", { status });
      setSuccess(status === "disabled" ? "Destination disabled." : "Destination enabled.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The destination could not be updated.");
    }
  }

  async function deleteDestination(destination: Destination) {
    if (!window.confirm(`Delete the "${destination.name}" webhook destination? Pending deliveries will be cancelled and its signing secret removed.`)) return;
    setError("");
    try {
      await requestJson(`/api/verify/webhooks/${destination.id}`, "DELETE");
      setSuccess("Destination deleted and its signing secret removed.");
      if (selectedId === destination.id) setSelectedId(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The destination could not be deleted.");
    }
  }

  async function rotateSecret(destination: Destination) {
    setError("");
    try {
      const result = await requestJson<{ signingSecret: string }>(`/api/verify/webhooks/${destination.id}/rotate-secret`, "POST", {});
      setOneTimeSecret(result.signingSecret);
      setCopied(false);
      setSuccess(`Signing secret rotated for ${destination.name}. Save the new secret now.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The signing secret could not be rotated.");
    }
  }

  async function markNotificationRead(notificationId: number) {
    try {
      await requestJson(`/api/verify/webhook-notifications/${notificationId}/read`, "PATCH", {});
      await queryClient.invalidateQueries({ queryKey: ["/api/verify/webhook-notifications"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The alert could not be updated.");
    }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(oneTimeSecret);
      setCopied(true);
    } catch {
      setError("Clipboard access was blocked. Select and copy the secret manually.");
    }
  }

  if (!isAdmin) {
    return (
      <section className="rounded-2xl border border-[#dce5f1] bg-[#f8fbff] p-5" aria-labelledby="webhook-workspace-heading">
        <h3 id="webhook-workspace-heading" className="font-semibold text-[#12213d]">Signed webhooks</h3>
        <p className="mt-2 text-sm leading-6 text-[#61728a]">Only organisation administrators can configure webhook destinations and view delivery alerts.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="webhook-workspace-heading">
      <div className="rounded-2xl border border-[#dce5f1] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6eefb] text-[#3471d2]"><KeyRound className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6c7c94]">API & integrations</p>
              <h3 id="webhook-workspace-heading" className="mt-1 text-lg font-semibold text-[#12213d]">Signed webhook destinations</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#61728a]">Configure HTTPS endpoints for request, consent, report, and usage events. Destinations are checked against public DNS addresses and redirects are not followed. Report contents are never sent in event payloads.</p>
            </div>
          </div>
          <button type="button" onClick={() => void refresh()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#dce5f1] px-3 text-xs font-semibold text-[#52627b]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {success && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
        {oneTimeSecret && (
          <div className="mt-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-950">Save this signing secret now</p>
            <p className="mt-1 text-xs leading-5 text-emerald-900">It is shown only once. Store it in your server-side secret manager. Never put it in browser code or a repository.</p>
            <code className="mt-3 block break-all rounded-lg border border-emerald-200 bg-white p-3 text-xs text-[#12213d]">{oneTimeSecret}</code>
            <button type="button" onClick={() => void copySecret()} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-800 px-3 text-xs font-semibold text-white">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy secret"}
            </button>
            <button type="button" onClick={() => setOneTimeSecret("")} className="ml-2 min-h-9 rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-900">Hide secret</button>
          </div>
        )}

        <form className="mt-5 grid gap-3 rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void saveDestination(); }}>
          <div className="sm:col-span-2">
            <h4 className="text-sm font-semibold text-[#243650]">{editingId ? "Edit destination" : "Add a destination"}</h4>
            <p className="mt-1 text-xs leading-5 text-[#71819b]">Production webhooks use an HTTPS URL on port 443. Sandbox simulation does not send webhooks.</p>
          </div>
          <label className="text-xs font-semibold text-[#52627b]">Destination name
            <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d5deea] bg-white px-3 text-sm font-normal text-[#12213d]" placeholder="Application event receiver" />
          </label>
          <label className="text-xs font-semibold text-[#52627b]">HTTPS endpoint
            <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d5deea] bg-white px-3 text-sm font-normal text-[#12213d]" placeholder="https://api.example.com/webhooks/cush" />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-xs font-semibold text-[#52627b]">Events to receive</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {eventOptions.map(([value, label]) => (
                <label key={value} className="flex min-h-9 items-center gap-2 rounded-lg border border-[#e0e8f2] bg-white px-3 text-xs text-[#40516d]">
                  <input type="checkbox" checked={eventTypes.includes(value)} onChange={() => {
                    setEventTypes((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
                    if (value === "usage.threshold_reached" && eventTypes.includes(value)) setThresholds([]);
                    if (value === "usage.threshold_reached" && !eventTypes.includes(value) && thresholds.length === 0) setThresholds([50, 80, 100]);
                  }} className="h-4 w-4 accent-[#3475e7]" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {eventTypes.includes("usage.threshold_reached") && (
            <fieldset className="sm:col-span-2">
              <legend className="text-xs font-semibold text-[#52627b]">Notify at usage levels</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {thresholdOptions.map((value) => (
                  <label key={value} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#dce5f1] bg-white px-3 text-xs text-[#40516d]">
                    <input type="checkbox" checked={thresholds.includes(value)} onChange={() => setThresholds((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} className="h-3.5 w-3.5 accent-[#3475e7]" />
                    {value}%
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" disabled={busy || !name.trim() || !url.trim() || eventTypes.length === 0 || (eventTypes.includes("usage.threshold_reached") && thresholds.length === 0)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0c1830] px-4 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{editingId ? "Save changes" : "Create destination"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="min-h-10 rounded-lg border border-[#dce5f1] px-4 text-sm font-semibold text-[#52627b]">Cancel edit</button>}
          </div>
        </form>

        <div className="mt-5">
          <h4 className="text-sm font-semibold text-[#243650]">Configured destinations</h4>
          {settingsQuery.isLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-[#61728a]"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading destinations…</p>
          ) : settingsQuery.isError ? (
            <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{settingsQuery.error instanceof Error ? settingsQuery.error.message : "Webhook settings are unavailable."}</p>
          ) : activeDestinations.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#cdd9e8] p-5 text-sm text-[#61728a]">No webhook destinations yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {activeDestinations.map((destination) => (
                <article key={destination.id} className="rounded-xl border border-[#dce5f1] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-semibold text-[#243650]">{destination.name}</h5>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${destination.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{destination.status}</span>
                      </div>
                      <p className="mt-1 break-all text-xs text-[#71819b]">{destination.url}</p>
                      <p className="mt-2 text-xs leading-5 text-[#61728a]">{destination.eventTypes.join(" · ")}{destination.usageThresholdPercentages.length ? ` · ${destination.usageThresholdPercentages.join("%, ")}% usage` : ""}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => {
                        setEditingId(destination.id);
                        setName(destination.name);
                        setUrl(destination.url);
                        setEventTypes(destination.eventTypes);
                        setThresholds(destination.usageThresholdPercentages);
                      }} disabled={destination.status === "deleted"} className="min-h-8 rounded-lg border border-[#dce5f1] px-2.5 text-xs font-semibold text-[#52627b]">Edit</button>
                      <button type="button" onClick={() => void updateDestination(destination, destination.status === "active" ? "disabled" : "active")} disabled={destination.status === "deleted"} className="min-h-8 rounded-lg border border-[#dce5f1] px-2.5 text-xs font-semibold text-[#52627b]">{destination.status === "active" ? "Disable" : "Enable"}</button>
                      <button type="button" onClick={() => void rotateSecret(destination)} disabled={destination.status === "deleted"} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#dce5f1] px-2.5 text-xs font-semibold text-[#52627b]"><KeyRound className="h-3.5 w-3.5" /> Rotate secret</button>
                      <button type="button" onClick={() => void deleteDestination(destination)} disabled={destination.status === "deleted"} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 text-xs font-semibold text-rose-700"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                      <button type="button" onClick={() => setSelectedId((current) => current === destination.id ? null : destination.id)} className="min-h-8 rounded-lg bg-[#eaf1fb] px-2.5 text-xs font-semibold text-[#275fb7]">{selectedId === destination.id ? "Hide history" : "Delivery history"}</button>
                    </div>
                  </div>
                  {selectedId === destination.id && (
                    <div className="mt-4 border-t border-[#e8edf4] pt-4">
                      <div className="mb-2 flex items-center gap-2"><Activity className="h-4 w-4 text-[#3471d2]" /><h6 className="text-xs font-semibold text-[#243650]">Recent deliveries</h6></div>
                      {deliveriesQuery.isLoading ? <p className="text-xs text-[#71819b]">Loading delivery history…</p>
                        : deliveriesQuery.data?.deliveries.length ? (
                          <ul className="space-y-2">
                            {deliveriesQuery.data.deliveries.slice(0, 20).map((delivery) => (
                              <li key={delivery.id} className="rounded-lg bg-[#f8fbff] px-3 py-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-[#243650]">{delivery.eventType} · {delivery.status}</span>
                                  <time className="text-[#71819b]">{dateLabel(delivery.createdAt)}</time>
                                </div>
                                <p className="mt-1 text-[#61728a]">{delivery.attemptCount} attempt(s){delivery.lastStatusCode ? ` · HTTP ${delivery.lastStatusCode}` : ""}{delivery.lastErrorCode ? ` · ${delivery.lastErrorCode}` : ""}</p>
                                {delivery.attempts.length > 0 && <p className="mt-1 text-[11px] text-[#71819b]">{delivery.attempts.map((attempt) => `#${attempt.attemptNumber} ${attempt.outcome}${attempt.responseStatus ? ` (${attempt.responseStatus})` : ""}`).join(" · ")}</p>}
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-xs text-[#71819b]">No events have been delivered to this destination.</p>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-amber-800" /><h4 className="text-sm font-semibold text-amber-950">Webhook failure alerts</h4></div>
            <p className="mt-1 text-xs leading-5 text-amber-900">Alerts appear after a delivery exhausts its retries. Emails never include report data, signing secrets, or full event payloads.</p>
            <ul className="mt-3 space-y-2">
              {notificationsQuery.data?.notifications.length ? notificationsQuery.data.notifications.slice(0, 8).map((notification) => (
                <li key={notification.id} className={`rounded-lg border p-3 ${notification.readAt ? "border-amber-100 bg-white/70" : "border-amber-300 bg-white"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                      <div>
                        <p className="text-xs font-semibold text-[#243650]">{notification.destinationName}: {notification.eventType}</p>
                        <p className="mt-1 text-[11px] leading-4 text-[#61728a]">Delivery {notification.deliveryStatus} after {notification.attemptCount} attempts{notification.lastErrorCode ? ` · ${notification.lastErrorCode}` : ""} · Email: {notification.emailStatus}</p>
                        <time className="mt-1 block text-[10px] text-[#71819b]">{dateLabel(notification.createdAt)}</time>
                      </div>
                    </div>
                    {!notification.readAt && <button type="button" onClick={() => void markNotificationRead(notification.id)} aria-label="Mark alert as read" className="shrink-0 rounded-md border border-amber-200 p-1.5 text-amber-900"><Check className="h-3.5 w-3.5" /></button>}
                  </div>
                </li>
              )) : <li className="rounded-lg bg-white/70 p-3 text-xs text-amber-900">No webhook failure alerts.</li>}
            </ul>
          </section>

          <section className="rounded-xl border border-[#dce5f1] p-4">
            <h4 className="text-sm font-semibold text-[#243650]">Configuration audit history</h4>
            <ul className="mt-3 space-y-2">
              {settingsQuery.data?.auditEvents.length ? settingsQuery.data.auditEvents.slice(0, 12).map((event) => (
                <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8fbff] px-3 py-2 text-xs">
                  <span className="font-medium text-[#40516d]">{event.eventType.replace(/_/g, " ")} · {event.destinationId ? `destination ${event.destinationId}` : "destination removed"}</span>
                  <time className="text-[#71819b]">{dateLabel(event.createdAt)}</time>
                </li>
              )) : <li className="rounded-lg border border-dashed border-[#cdd9e8] p-3 text-xs text-[#71819b]">No configuration changes recorded.</li>}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
