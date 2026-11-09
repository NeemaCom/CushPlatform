import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock3, Download, Eye, Fingerprint, Globe2, History, Loader2, MonitorSmartphone, RefreshCw, Search, ShieldAlert, UsersRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { API_BASE_URL } from "@/lib/api-base";

type Overview = {
  rangeDays: number | null;
  startDate: string;
  endDate: string;
  customDateRange: boolean;
  generatedAt: string;
  metrics: {
    unique_visitors: number;
    sessions: number;
    active_visitors: number;
    identified_users: number;
    anonymous_visitors: number;
    page_views: number;
    signups: number;
    logins: number;
  };
  topRoutes: { route: string; page_views: number }[];
  recent: ActivityRow[];
  privacy: { consentRequired: boolean; rawIpStored: boolean; retentionDays: number };
};

type VisitorRow = {
  visitor_id: string;
  session_count: number;
  first_seen: string;
  last_seen: string;
  current_route: string;
  device_type: string;
  browser: string;
  user_id: number | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  event_count: number;
};

type ActivityRow = {
  id?: number;
  event_type: string;
  route: string;
  occurred_at: string;
  visitor_id: string;
  user_id: number | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type VisitorDetail = {
  visitorId: string;
  sessions: {
    session_id: string;
    started_at: string;
    last_seen_at: string;
    entry_route: string;
    current_route: string;
    device_type: string;
    browser: string;
    operating_system: string;
    referrer_host: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }[];
  events: ActivityRow[];
};

type VisitorExportAudit = {
  id: number;
  adminUserId: number;
  outcome: "success" | "denied" | "failed";
  createdAt: string;
  rangeDays: number | null;
  startDate: string | null;
  endDate: string | null;
  visitorKind: "all" | "registered" | "anonymous" | null;
  rowCount: number | null;
  truncated: boolean | null;
  searchApplied: boolean | null;
};

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "The request failed.";
  const body = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (body) {
    try {
      const payload = JSON.parse(body) as { error?: unknown };
      if (typeof payload.error === "string") return payload.error;
    } catch {
      // Keep the original request error.
    }
  }
  return message;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftUtcDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateInputValue(date);
}

function customDateRangeError(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return "Select both a start date and an end date.";
  }
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const today = utcDateInputValue(new Date());
  const oldestAllowed = shiftUtcDate(today, -89);
  if (
    Number.isNaN(start.getTime())
    || Number.isNaN(end.getTime())
    || start.toISOString().slice(0, 10) !== startDate
    || end.toISOString().slice(0, 10) !== endDate
  ) {
    return "Enter valid calendar dates.";
  }
  if (endDate < startDate) return "The end date must be on or after the start date.";
  if (endDate > today) return "The end date cannot be in the future.";
  if (startDate < oldestAllowed || Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1 > 90) {
    return "Choose a date range of up to 90 days within the current retention window.";
  }
  return null;
}

function dateFilterParams(
  range: 7 | 30 | 90 | "custom",
  startDate: string,
  endDate: string,
) {
  return range === "custom"
    ? new URLSearchParams({ startDate, endDate })
    : new URLSearchParams({ range: String(range) });
}

function exportRangeLabel(entry: VisitorExportAudit) {
  if (entry.startDate && entry.endDate) return `${entry.startDate} – ${entry.endDate} UTC`;
  return entry.rangeDays ? `${entry.rangeDays} days` : "Unknown window";
}

function readableEvent(event: string) {
  return ({
    page_view: "Viewed page",
    signup_started: "Started sign-up",
    signup_completed: "Completed sign-up",
    login_completed: "Signed in",
  } as Record<string, string>)[event] ?? event;
}

function MetricCard({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: number;
  detail: string;
  icon: typeof UsersRound;
  tone: string;
}) {
  return (
    <article className="rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#777973]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#24252a]">{new Intl.NumberFormat("en-GB").format(value)}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-[11px] text-[#85867f]">{detail}</p>
    </article>
  );
}

export default function VisitorIntelligenceAdmin() {
  const [range, setRange] = useState<7 | 30 | 90 | "custom">(7);
  const [customEndDate, setCustomEndDate] = useState(() => utcDateInputValue(new Date()));
  const [customStartDate, setCustomStartDate] = useState(() => shiftUtcDate(utcDateInputValue(new Date()), -6));
  const [kind, setKind] = useState<"all" | "registered" | "anonymous">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const customRangeError = range === "custom" ? customDateRangeError(customStartDate, customEndDate) : null;
  const dateQueriesEnabled = !customRangeError;
  const overviewQuery = useQuery<Overview>({
    queryKey: ["/api/admin/visitor-intelligence/overview", range, customStartDate, customEndDate],
    queryFn: async () => {
      const params = dateFilterParams(range, customStartDate, customEndDate);
      return (await apiRequest("GET", `/api/admin/visitor-intelligence/overview?${params.toString()}`)).json();
    },
    enabled: dateQueriesEnabled,
    retry: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const visitorsQuery = useQuery<{ visitors: VisitorRow[]; page: number; pageSize: number }>({
    queryKey: ["/api/admin/visitor-intelligence/visitors", range, customStartDate, customEndDate, kind, search, page],
    queryFn: async () => {
      const params = dateFilterParams(range, customStartDate, customEndDate);
      params.set("kind", kind);
      params.set("page", String(page));
      params.set("search", search);
      return (await apiRequest("GET", `/api/admin/visitor-intelligence/visitors?${params.toString()}`)).json();
    },
    enabled: dateQueriesEnabled,
    retry: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const detailQuery = useQuery<VisitorDetail>({
    queryKey: ["/api/admin/visitor-intelligence/visitors", selectedVisitor, range, customStartDate, customEndDate],
    queryFn: async () => {
      const params = dateFilterParams(range, customStartDate, customEndDate);
      return (await apiRequest("GET", `/api/admin/visitor-intelligence/visitors/${selectedVisitor}?${params.toString()}`)).json();
    },
    enabled: Boolean(selectedVisitor) && dateQueriesEnabled,
    retry: false,
  });
  const exportHistoryQuery = useQuery<{ exports: VisitorExportAudit[] }>({
    queryKey: ["/api/admin/visitor-intelligence/exports"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/visitor-intelligence/exports")).json(),
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  async function downloadVisitorReport() {
    setExporting(true);
    setExportMessage("");
    setExportError("");
    try {
      const params = dateFilterParams(range, customStartDate, customEndDate);
      params.set("kind", kind);
      params.set("search", search);
      const response = await fetch(`${API_BASE_URL}/api/admin/visitor-intelligence/export?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(typeof payload?.error === "string" ? payload.error : "The report could not be downloaded.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const reportPeriod = range === "custom"
        ? `${customStartDate}-to-${customEndDate}`
        : new Date().toISOString().slice(0, 10);
      link.download = `cush-visitor-report-${reportPeriod}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);

      const rowCount = response.headers.get("X-Export-Row-Count") ?? "Unknown";
      const truncated = response.headers.get("X-Export-Truncated") === "true";
      setExportMessage(`${rowCount} visitor rows downloaded${truncated ? " (limited to 5,000 rows)." : "."}`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The report could not be downloaded.");
    } finally {
      setExporting(false);
    }
  }

  const overviewError = overviewQuery.error;
  const schemaMissing = apiError(overviewError).includes("migration");
  const metrics = overviewQuery.data?.metrics;

  return (
    <section aria-labelledby="visitor-intelligence-heading" className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-[#343279] bg-[#29266f] px-5 py-6 text-[#f7f6f1] shadow-sm sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#c7c5ee]">Operations · Consented analytics</p>
          <h1 id="visitor-intelligence-heading" className="mt-2 text-2xl font-semibold tracking-tight">Visitor intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d2d1eb]">
            Live and recent activity from visitors who opted in. This view contains no raw IP addresses.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c7c5ee]">
            Reporting window
            <select
              value={range}
              onChange={(event) => {
                const value = event.target.value;
                setRange(value === "custom" ? "custom" : Number(value) as 7 | 30 | 90);
                setPage(1);
                setSelectedVisitor(null);
              }}
              className="mt-1.5 block min-w-[160px] rounded-lg border border-white/20 bg-[#383581] px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:ring-2 focus:ring-[#d5d3ff]/40"
              aria-label="Visitor analytics reporting window"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value="custom">Custom dates (UTC)</option>
            </select>
          </label>
          {range === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c7c5ee]">
                From
                <input
                  type="date"
                  value={customStartDate}
                  min={shiftUtcDate(utcDateInputValue(new Date()), -89)}
                  max={customEndDate || utcDateInputValue(new Date())}
                  onChange={(event) => { setCustomStartDate(event.target.value); setPage(1); setSelectedVisitor(null); }}
                  className="mt-1.5 block min-h-10 rounded-lg border border-white/20 bg-[#383581] px-2 text-xs font-medium normal-case tracking-normal text-white outline-none focus:ring-2 focus:ring-[#d5d3ff]/40"
                  aria-label="Visitor report start date in UTC"
                />
              </label>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c7c5ee]">
                To
                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || shiftUtcDate(utcDateInputValue(new Date()), -89)}
                  max={utcDateInputValue(new Date())}
                  onChange={(event) => { setCustomEndDate(event.target.value); setPage(1); setSelectedVisitor(null); }}
                  className="mt-1.5 block min-h-10 rounded-lg border border-white/20 bg-[#383581] px-2 text-xs font-medium normal-case tracking-normal text-white outline-none focus:ring-2 focus:ring-[#d5d3ff]/40"
                  aria-label="Visitor report end date in UTC"
                />
              </label>
            </div>
          )}
          <button
            type="button"
            onClick={() => void downloadVisitorReport()}
            disabled={exporting || Boolean(customRangeError)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white px-4 py-2 text-xs font-semibold text-[#29266f] shadow-sm transition hover:bg-[#f0efff] disabled:cursor-wait disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Preparing…" : "Download CSV"}
          </button>
        </div>
      </header>

      {range === "custom" && (
        <p
          role={customRangeError ? "alert" : "note"}
          className={`rounded-lg border px-4 py-2.5 text-xs ${customRangeError ? "border-[#e5c9b9] bg-[#fbf2ec] text-[#81412e]" : "border-[#dcdaf6] bg-[#f0efff] text-[#353174]"}`}
        >
          {customRangeError ?? "Custom dates include both selected UTC calendar days and are limited to the most recent 90 days."}
        </p>
      )}
      {exportMessage && <p role="status" className="rounded-lg border border-[#c8e4db] bg-[#edf7f3] px-4 py-2.5 text-xs text-[#28685c]">{exportMessage}</p>}
      {exportError && <p role="alert" className="rounded-lg border border-[#e5c9b9] bg-[#fbf2ec] px-4 py-2.5 text-xs text-[#81412e]">{exportError}</p>}

      <div className="rounded-xl border border-[#dcdaf6] bg-[#f0efff] px-4 py-3 text-sm leading-5 text-[#353174]">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Only opted-in activity is shown. Analytics events are retained for up to 90 days; withdrawing consent removes the related visitor sessions and events. Country mapping is not active yet.
          </p>
        </div>
      </div>

      {customRangeError ? (
        <div className="rounded-xl border border-[#e5c9b9] bg-[#fbf2ec] p-5 text-sm text-[#81412e]">
          Visitor metrics and report downloads are paused until the selected date range is valid.
        </div>
      ) : overviewQuery.isLoading ? (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] text-sm text-[#777973]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading visitor data…
        </div>
      ) : overviewQuery.isError ? (
        <div className="rounded-xl border border-[#e5c9b9] bg-[#fbf2ec] p-5 text-sm leading-6 text-[#81412e]" role="alert">
          <p className="font-semibold">{schemaMissing ? "Visitor data storage is not connected yet" : "Visitor data could not be loaded"}</p>
          <p className="mt-1">{apiError(overviewError)}</p>
          {schemaMissing && <p className="mt-2">Run `migrations/manual/create-cush-visitor-intelligence.sql` in the connected Supabase SQL editor, then refresh this view.</p>}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active now" value={Number(metrics?.active_visitors ?? 0)} detail="Seen in the last five minutes" icon={Activity} tone="bg-[#e4f4f0] text-[#28685c]" />
            <MetricCard label="Unique visitors" value={Number(metrics?.unique_visitors ?? 0)} detail="Opted-in visitor IDs" icon={UsersRound} tone="bg-[#eeedff] text-[#37338d]" />
            <MetricCard label="Sessions" value={Number(metrics?.sessions ?? 0)} detail="Browser sessions in this window" icon={Fingerprint} tone="bg-[#e8eff8] text-[#426087]" />
            <MetricCard label="Identified accounts" value={Number(metrics?.identified_users ?? 0)} detail="Distinct signed-in Cush accounts" icon={Eye} tone="bg-[#fbf0dc] text-[#8b6324]" />
            <MetricCard label="Anonymous visitors" value={Number(metrics?.anonymous_visitors ?? 0)} detail="Visitors without signed-in activity" icon={Fingerprint} tone="bg-[#fbf0dc] text-[#8b6324]" />
            <MetricCard label="Page views" value={Number(metrics?.page_views ?? 0)} detail="Approved routes only" icon={MonitorSmartphone} tone="bg-[#eeedff] text-[#37338d]" />
            <MetricCard label="Sign-ups" value={Number(metrics?.signups ?? 0)} detail="Only sign-ups completed after opt-in" icon={Clock3} tone="bg-[#e4f4f0] text-[#28685c]" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="overflow-hidden rounded-xl border border-[#e4e1d8] bg-[#fbfaf6]">
              <div className="flex flex-col gap-3 border-b border-[#e7e5dc] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-[#24252a]">Visitor directory</h2>
                  <p className="mt-1 text-xs text-[#777973]">Pseudonymous identifiers; account details appear only for signed-in activity.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#81837c]" />
                    <input
                      value={search}
                      onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                      placeholder="Search visitor or account"
                      className="h-9 w-full rounded-lg border border-[#deddd4] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#817de0] sm:w-52"
                      aria-label="Search visitors"
                    />
                  </label>
                  <select
                    value={kind}
                    onChange={(event) => { setKind(event.target.value as typeof kind); setPage(1); }}
                    className="h-9 rounded-lg border border-[#deddd4] bg-white px-2.5 text-xs outline-none focus:border-[#817de0]"
                    aria-label="Filter visitors"
                  >
                    <option value="all">All visitors</option>
                    <option value="registered">Signed in</option>
                    <option value="anonymous">Anonymous</option>
                  </select>
                </div>
              </div>

              {visitorsQuery.isLoading ? (
                <div className="p-8 text-center text-sm text-[#777973]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading visitors…</div>
              ) : visitorsQuery.isError ? (
                <div className="p-5 text-sm text-[#81412e]" role="alert">{apiError(visitorsQuery.error)}</div>
              ) : visitorsQuery.data?.visitors.length ? (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[700px] text-left text-xs">
                      <thead className="bg-[#f4f3ee] text-[10px] uppercase tracking-wide text-[#777973]">
                        <tr><th className="px-4 py-3 font-semibold">Visitor</th><th className="px-4 py-3 font-semibold">Current page</th><th className="px-4 py-3 font-semibold">Device</th><th className="px-4 py-3 font-semibold">Sessions</th><th className="px-4 py-3 font-semibold">Last seen</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[#eeece5]">
                        {visitorsQuery.data.visitors.map((visitor) => (
                          <tr key={visitor.visitor_id} className="cursor-pointer hover:bg-white" onClick={() => setSelectedVisitor(visitor.visitor_id)}>
                            <td className="px-4 py-3.5">
                              <p className="flex items-center gap-2 font-semibold text-[#292a2c]">
                                <span className="truncate">{visitor.email || `Visitor ${visitor.visitor_id.slice(0, 8)}`}</span>
                                {Date.now() - new Date(visitor.last_seen).getTime() < 5 * 60 * 1000 && (
                                  <span className="shrink-0 rounded-full bg-[#e4f4f0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#28685c]">Live</span>
                                )}
                              </p>
                              <p className="mt-1 text-[10px] text-[#85867f]">{visitor.email ? `${visitor.first_name ?? ""} ${visitor.last_name ?? ""}`.trim() : "Anonymous"}</p>
                            </td>
                            <td className="px-4 py-3.5 font-medium text-[#555750]">{visitor.current_route}</td>
                            <td className="px-4 py-3.5 text-[#555750]">{visitor.device_type} · {visitor.browser}</td>
                            <td className="px-4 py-3.5 text-[#555750]">{visitor.session_count}</td>
                            <td className="px-4 py-3.5 text-[#777973]">{formatTime(visitor.last_seen)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-[#eeece5] md:hidden">
                    {visitorsQuery.data.visitors.map((visitor) => (
                      <button key={visitor.visitor_id} type="button" onClick={() => setSelectedVisitor(visitor.visitor_id)} className="block w-full p-4 text-left hover:bg-white">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[#292a2c]">{visitor.email || `Visitor ${visitor.visitor_id.slice(0, 8)}`}</span>
                          <span className="shrink-0 rounded-full bg-[#eeedff] px-2 py-1 text-[10px] font-semibold text-[#37338d]">{visitor.email ? "Signed in" : "Anonymous"}</span>
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-2 text-xs text-[#777973]">
                          <span className="truncate">{visitor.current_route} · {visitor.device_type}</span><span className="shrink-0">{formatTime(visitor.last_seen)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-[#e7e5dc] px-4 py-3 text-xs text-[#777973]">
                    <span>Page {page} · up to 50 visitors</span>
                    <div className="flex gap-2">
                      <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-md border border-[#deddd4] px-3 py-1.5 disabled:opacity-40">Previous</button>
                      <button disabled={(visitorsQuery.data.visitors.length ?? 0) < 50} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-[#deddd4] px-3 py-1.5 disabled:opacity-40">Next</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <UsersRound className="mx-auto h-7 w-7 text-[#aaa99f]" />
                  <p className="mt-3 text-sm font-semibold text-[#555750]">No opted-in visitors in this window</p>
                  <p className="mt-1 text-xs text-[#85867f]">Counts will appear here only after visitors choose to allow analytics.</p>
                </div>
              )}
            </section>

            <div className="space-y-5">
              <section className="rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] p-4">
                <h2 className="font-semibold text-[#24252a]">Most viewed routes</h2>
                <p className="mt-1 text-xs text-[#777973]">Approved page routes in the selected window</p>
                {overviewQuery.data?.topRoutes.length ? (
                  <ul className="mt-4 divide-y divide-[#eeece5]">
                    {overviewQuery.data.topRoutes.map((item) => (
                      <li key={item.route} className="flex items-center justify-between gap-4 py-2.5 text-xs">
                        <span className="truncate font-medium text-[#555750]">{item.route}</span>
                        <span className="shrink-0 rounded-full bg-[#eeedff] px-2.5 py-1 font-semibold text-[#37338d]">{item.page_views}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-5 text-sm text-[#85867f]">No page-view events yet.</p>}
              </section>
              <section className="rounded-xl border border-[#e4e1d8] bg-[#fbfaf6] p-4">
                <h2 className="font-semibold text-[#24252a]">Recent opted-in activity</h2>
                {overviewQuery.data?.recent.length ? (
                  <ol className="mt-3 divide-y divide-[#eeece5]">
                    {overviewQuery.data.recent.slice(0, 12).map((item, index) => (
                      <li key={item.id ?? `${item.visitor_id}-${item.occurred_at}-${index}`} className="py-2.5">
                        <p className="text-xs font-semibold text-[#45464a]">{readableEvent(item.event_type)} <span className="font-normal text-[#777973]">· {item.route}</span></p>
                        <p className="mt-1 text-[10px] text-[#85867f]">{item.email || `Visitor ${item.visitor_id.slice(0, 8)}`} · {formatTime(item.occurred_at)}</p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-3 text-sm text-[#85867f]">No activity yet.</p>}
              </section>
            </div>
          </div>
        </>
      )}

      <section aria-labelledby="visitor-export-history-heading" className="overflow-hidden rounded-xl border border-[#e4e1d8] bg-[#fbfaf6]">
        <header className="flex flex-col gap-3 border-b border-[#e7e5dc] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#57539c]" />
              <h2 id="visitor-export-history-heading" className="font-semibold text-[#24252a]">Visitor report downloads</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#777973]">
              Recent export activity. Search terms, visitor identifiers, and report contents are not stored here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void exportHistoryQuery.refetch()}
            disabled={exportHistoryQuery.isFetching}
            className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-[#deddd4] bg-white px-3 py-2 text-xs font-semibold text-[#555750] hover:bg-[#f5f4ef] disabled:cursor-wait disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${exportHistoryQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh history
          </button>
        </header>
        {exportHistoryQuery.isLoading ? (
          <p className="p-6 text-center text-sm text-[#777973]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading report history…</p>
        ) : exportHistoryQuery.isError ? (
          <p role="alert" className="p-5 text-sm text-[#81412e]">{apiError(exportHistoryQuery.error)}</p>
        ) : exportHistoryQuery.data?.exports.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[#f4f3ee] text-[10px] uppercase tracking-wide text-[#777973]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Admin</th>
                    <th className="px-4 py-3 font-semibold">Filters</th>
                    <th className="px-4 py-3 font-semibold">Rows</th>
                    <th className="px-4 py-3 font-semibold">Result</th>
                    <th className="px-4 py-3 font-semibold">Downloaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeece5]">
                  {exportHistoryQuery.data.exports.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3.5 font-medium text-[#34353a]">Admin account #{entry.adminUserId}</td>
                      <td className="px-4 py-3.5 text-[#555750]">
                        {exportRangeLabel(entry)}
                        {" · "}
                        {entry.visitorKind === "registered" ? "Signed in" : entry.visitorKind === "anonymous" ? "Anonymous" : entry.visitorKind === "all" ? "All visitors" : "Unknown type"}
                        {entry.searchApplied ? " · Search applied" : ""}
                      </td>
                      <td className="px-4 py-3.5 text-[#555750]">
                        {entry.rowCount === null ? "—" : entry.truncated ? `${entry.rowCount.toLocaleString("en-GB")} (limit reached)` : entry.rowCount.toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-3.5 capitalize text-[#555750]">{entry.outcome}</td>
                      <td className="px-4 py-3.5 text-[#777973]">{formatTime(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ol className="divide-y divide-[#eeece5] md:hidden">
              {exportHistoryQuery.data.exports.map((entry) => (
                <li key={entry.id} className="space-y-1.5 p-4">
                  <p className="text-xs font-semibold text-[#34353a]">Admin account #{entry.adminUserId} · {entry.outcome}</p>
                  <p className="text-xs text-[#555750]">
                    {exportRangeLabel(entry)}
                    {" · "}
                    {entry.visitorKind === "registered" ? "Signed in" : entry.visitorKind === "anonymous" ? "Anonymous" : entry.visitorKind === "all" ? "All visitors" : "Unknown type"}
                    {entry.searchApplied ? " · Search applied" : ""}
                  </p>
                  <p className="text-[11px] text-[#777973]">
                    {entry.rowCount === null ? "Rows: —" : `Rows: ${entry.rowCount.toLocaleString("en-GB")}${entry.truncated ? " (limit reached)" : ""}`}
                    {" · "}
                    {formatTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="p-7 text-center">
            <Download className="mx-auto h-6 w-6 text-[#aaa99f]" />
            <p className="mt-2 text-sm font-semibold text-[#555750]">No report downloads yet</p>
            <p className="mt-1 text-xs text-[#85867f]">Successful downloads will appear here with their safe filter summary.</p>
          </div>
        )}
      </section>

      {selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedVisitor(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="visitor-detail-heading" className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-[#fbfaf6] p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#777973]">Visitor timeline</p>
                <h2 id="visitor-detail-heading" className="mt-1 break-all text-lg font-semibold text-[#24252a]">{selectedVisitor}</h2>
              </div>
              <button type="button" onClick={() => setSelectedVisitor(null)} className="rounded-lg border border-[#deddd4] px-3 py-2 text-xs font-semibold text-[#555750] hover:bg-white">Close</button>
            </header>
            {detailQuery.isLoading ? (
              <p className="py-10 text-center text-sm text-[#777973]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading timeline…</p>
            ) : detailQuery.isError ? (
              <p className="mt-5 rounded-lg bg-[#fbf2ec] p-4 text-sm text-[#81412e]" role="alert">{apiError(detailQuery.error)}</p>
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {detailQuery.data?.sessions.map((session) => (
                    <article key={session.session_id} className="rounded-xl border border-[#e4e1d8] bg-white p-4">
                      <p className="text-xs font-semibold text-[#24252a]">{session.device_type} · {session.browser} · {session.operating_system}</p>
                      {session.email && <p className="mt-1 text-xs text-[#555750]">{session.email}</p>}
                      <p className="mt-2 text-[11px] text-[#777973]">First page: {session.entry_route}</p>
                      <p className="mt-1 text-[11px] text-[#777973]">Last page: {session.current_route}</p>
                      <p className="mt-1 text-[11px] text-[#85867f]">Started {formatTime(session.started_at)} · Last seen {formatTime(session.last_seen_at)}</p>
                      {session.referrer_host && <p className="mt-1 text-[11px] text-[#85867f]">Referrer: {session.referrer_host}</p>}
                    </article>
                  ))}
                </div>
                <h3 className="mt-6 text-sm font-semibold text-[#24252a]">Event history</h3>
                <ol className="mt-2 divide-y divide-[#eeece5] rounded-xl border border-[#e4e1d8] bg-white">
                  {detailQuery.data?.events.map((item, index) => (
                    <li key={`${item.occurred_at}-${index}`} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-semibold text-[#45464a]">{readableEvent(item.event_type)} <span className="font-normal text-[#777973]">· {item.route}</span></p>
                      <time className="text-[10px] text-[#85867f]">{formatTime(item.occurred_at)}</time>
                    </li>
                  ))}
                  {!detailQuery.data?.events.length && <li className="px-4 py-6 text-center text-sm text-[#85867f]">No events in the retention window.</li>}
                </ol>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
