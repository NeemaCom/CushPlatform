import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, CalendarDays, CircleAlert, Clock3, Database, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import CushScoringPolicyAdmin from "@/components/passport/CushScoringPolicyAdmin";
import CushUserScoreReview from "@/components/passport/CushUserScoreReview";
import { ADMIN_PERMISSION, canManageUserRoles, hasAdminPermission } from "@shared/admin-permissions";
import EvidenceFreshnessAdmin from "@/components/passport/EvidenceFreshnessAdmin";
import CushVerifyInterestAdmin from "@/components/admin/CushVerifyInterestAdmin";
import UserDirectoryAdmin from "@/components/admin/UserDirectoryAdmin";

type OverviewMetrics = {
  totalUsers: number;
  activeUsers30d: number;
  newUsers: number;
  emailVerifiedUsers: number;
  assessmentRecords: number;
  linkedMonoAccounts: number;
  creditHistoryRecords: number;
};

type AdminActivity = {
  id: number;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  outcome: string;
  createdAt: string;
  adminUserId: number;
};

type AdminOverview = {
  rangeDays: number;
  generatedAt: string;
  metrics: OverviewMetrics;
  recentActivity: AdminActivity[];
};

const metricDefinitions: {
  key: keyof OverviewMetrics;
  label: string;
  detail: string;
  icon: typeof UsersRound;
  tone: "indigo" | "teal" | "amber" | "blue";
}[] = [
  { key: "totalUsers", label: "Total users", detail: "Registered accounts", icon: UsersRound, tone: "indigo" },
  { key: "activeUsers30d", label: "Active users", detail: "30-day window", icon: Activity, tone: "teal" },
  { key: "newUsers", label: "New users", detail: "Selected period", icon: ArrowUpRight, tone: "amber" },
  { key: "emailVerifiedUsers", label: "Email verified", detail: "Verified accounts", icon: ShieldCheck, tone: "blue" },
  { key: "assessmentRecords", label: "Assessments", detail: "Assessment records", icon: Database, tone: "indigo" },
  { key: "linkedMonoAccounts", label: "Linked accounts", detail: "Mono connections", icon: Activity, tone: "teal" },
  { key: "creditHistoryRecords", label: "Credit history", detail: "Provider records", icon: Database, tone: "amber" },
];

const toneClasses = {
  indigo: "bg-[#eeedff] text-[#37338d]",
  teal: "bg-[#e4f4f0] text-[#28685c]",
  amber: "bg-[#fbf0dc] text-[#8b6324]",
  blue: "bg-[#e8eff8] text-[#426087]",
};

function number(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function readableApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "The request failed.";
  const responseBody = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (responseBody) {
    try {
      const payload = JSON.parse(responseBody) as { error?: unknown };
      if (typeof payload.error === "string") return payload.error;
    } catch {
      // Preserve the original message if the response is not valid JSON.
    }
  }
  return message;
}

function AdminOverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-7" aria-label="Loading admin overview">
      <div className="h-24 rounded-2xl bg-[#e9e9e3]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl border border-[#e7e5dc] bg-[#f7f6f1]" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-[#e7e5dc] bg-[#f7f6f1]" />
    </div>
  );
}

export default function AdminDashboard() {
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const [activeSection, setActiveSection] = useState<"overview" | "users" | "scoring-policy" | "evidence-freshness" | "score-review" | "cush-verify">("overview");
  const { user, isLoading: authLoading } = useAuth();
  const hasOverviewAccess = hasAdminPermission(user?.role, ADMIN_PERMISSION.dashboardRead);
  const hasUsersRead = hasAdminPermission(user?.role, ADMIN_PERMISSION.usersRead);
  const canManageRoles = canManageUserRoles(user?.role);
  const hasPolicyAccess = hasAdminPermission(user?.role, ADMIN_PERMISSION.scoringPolicyRead);
  const hasScoreBreakdownAccess = hasAdminPermission(user?.role, ADMIN_PERMISSION.scoreBreakdownRead);
  const hasEvidenceFreshnessRead = hasAdminPermission(user?.role, ADMIN_PERMISSION.evidenceFreshnessRead);
  const hasEvidenceFreshnessManage = hasAdminPermission(user?.role, ADMIN_PERMISSION.evidenceFreshnessManage);
  const hasVerifyInterestRead = hasAdminPermission(user?.role, ADMIN_PERMISSION.verificationsRead);
  const hasVerifyInterestManage = hasAdminPermission(user?.role, ADMIN_PERMISSION.verificationsManage);
  const overviewQuery = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview", range],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/overview?range=${range}`);
      return response.json() as Promise<AdminOverview>;
    },
    enabled: !authLoading && hasOverviewAccess && activeSection === "overview",
    retry: false,
  });

  if (authLoading) {
    return (
      <main className="min-h-[100dvh] bg-[#f4f3ee] p-5 sm:p-8">
        <div className="mx-auto max-w-7xl"><AdminOverviewSkeleton /></div>
      </main>
    );
  }

  if (!hasOverviewAccess) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f3ee] px-5">
        <section className="w-full max-w-md rounded-2xl border border-[#e3e0d5] bg-[#fbfaf6] p-8 text-center shadow-[0_12px_32px_rgba(45,43,32,0.05)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#eeedff] text-[#37338d]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-5 font-semibold tracking-tight text-[#24252a]">Admin access required</h1>
          <p className="mt-2 text-sm leading-6 text-[#6f706f]">This operational overview is available to authorized Cush administrators.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f4f3ee] text-[#24252a]">
      <header className="border-b border-[#deddd4] bg-[#fbfaf6]">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/cush-wordmark.png" alt="Cush Passport" className="h-8 w-36 object-cover object-center" width={144} height={32} />
            <span className="hidden h-7 w-px bg-[#deddd4] sm:block" />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777973] sm:block">Operations</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-[#57539c] hover:text-[#29266f]">
              Customer dashboard
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#deddd4] bg-[#f6f5f0] px-3 py-1.5 text-xs font-medium text-[#5e625e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#438471]" />
              Staff view
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
        <nav className="mb-7 flex flex-wrap gap-2" aria-label="Admin sections">
          <button
            type="button"
            onClick={() => setActiveSection("overview")}
            aria-current={activeSection === "overview" ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeSection === "overview"
                ? "bg-[#29266f] text-white shadow-sm"
                : "border border-[#deddd4] bg-[#fbfaf6] text-[#555750] hover:bg-white"
            }`}
          >
            Overview
          </button>
          {hasUsersRead && (
            <button
              type="button"
              onClick={() => setActiveSection("users")}
              aria-current={activeSection === "users" ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeSection === "users"
                  ? "bg-[#29266f] text-white shadow-sm"
                  : "border border-[#deddd4] bg-[#fbfaf6] text-[#555750] hover:bg-white"
              }`}
            >
              Users
            </button>
          )}
          {hasPolicyAccess && (
            <button
              type="button"
              onClick={() => setActiveSection("scoring-policy")}
              aria-current={activeSection === "scoring-policy" ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeSection === "scoring-policy"
                  ? "bg-[#29266f] text-white shadow-sm"
                  : "border border-[#deddd4] bg-[#fbfaf6] text-[#555750] hover:bg-white"
              }`}
            >
              Scoring policy
            </button>
          )}
          {hasEvidenceFreshnessRead && (
            <button
              type="button"
              onClick={() => setActiveSection("evidence-freshness")}
              aria-current={activeSection === "evidence-freshness" ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeSection === "evidence-freshness"
                  ? "bg-[#29266f] text-white shadow-sm"
                  : "border border-[#deddd4] bg-[#fbfaf6] text-[#555750] hover:bg-white"
              }`}
            >
              Evidence freshness
            </button>
          )}
          {hasScoreBreakdownAccess && (
            <button
              type="button"
              onClick={() => setActiveSection("score-review")}
              aria-current={activeSection === "score-review" ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeSection === "score-review"
                  ? "bg-[#29266f] text-white shadow-sm"
                  : "border border-[#deddd4] bg-[#fbfaf6] text-[#555750] hover:bg-white"
              }`}
            >
              User score review
            </button>
          )}
          {hasVerifyInterestRead && (
            <button
              type="button"
              onClick={() => setActiveSection("cush-verify")}
              aria-current={activeSection === "cush-verify" ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeSection === "cush-verify"
                  ? "bg-[#29266f] text-white shadow-sm"
                  : "border border-[#deddd4] bg-[#fbfaf6] text-[#555750] hover:bg-white"
              }`}
            >
              Cush Verify interest
            </button>
          )}
        </nav>
        {activeSection === "users" ? (
          <UserDirectoryAdmin canManageRoles={canManageRoles} currentAdminId={user?.id ?? null} />
        ) : activeSection === "cush-verify" ? (
          <CushVerifyInterestAdmin canManage={hasVerifyInterestManage} />
        ) : activeSection === "scoring-policy" ? (
          <section aria-labelledby="scoring-policy-heading">
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Cush Passport · Admin</p>
              <h1 id="scoring-policy-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[#24252a]">Scoring policy</h1>
              <p className="mt-2 text-sm text-[#6f706f]">Manage draft rules and activate only reviewed scoring policies.</p>
            </div>
            <CushScoringPolicyAdmin />
          </section>
        ) : activeSection === "evidence-freshness" ? (
          <EvidenceFreshnessAdmin canManage={hasEvidenceFreshnessManage} />
        ) : activeSection === "score-review" ? (
          <section aria-labelledby="score-review-heading">
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Cush Passport · Admin</p>
              <h1 id="score-review-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[#24252a]">User score review</h1>
              <p className="mt-2 text-sm text-[#6f706f]">Inspect score components and confidence for one account at a time.</p>
            </div>
            <CushUserScoreReview />
          </section>
        ) : (
          <>
        <section className="relative overflow-hidden rounded-2xl border border-[#343279] bg-[#29266f] px-6 py-7 text-[#f7f6f1] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-1 -top-12 h-52 w-52 rounded-full border border-white/10" />
          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c7c5ee]">
                <span className="h-px w-5 bg-[#c7c5ee]" />
                Cush Passport · Admin
              </div>
              <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.5rem)] font-semibold leading-tight tracking-[-0.04em]">Overview</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#d2d1eb]">
                Aggregate platform activity and a record of recent administrator actions.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between lg:justify-end">
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c7c5ee]">
                New user window
                <span className="relative mt-1.5 block">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d2d1eb]" />
                  <select
                    value={range}
                    onChange={(event) => setRange(Number(event.target.value) as 7 | 30 | 90)}
                    className="min-w-[170px] appearance-none rounded-lg border border-white/20 bg-[#383581] py-2.5 pl-9 pr-9 text-sm font-medium normal-case tracking-normal text-white outline-none transition focus:border-[#d5d3ff] focus:ring-2 focus:ring-[#d5d3ff]/30"
                    aria-label="Select new user date range"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#d2d1eb]">⌄</span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Platform snapshot</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em]">Aggregate metrics</h2>
          </div>
          {overviewQuery.data && (
            <p className="flex items-center gap-1.5 text-xs text-[#777973]">
              <Clock3 className="h-3.5 w-3.5" />
              Snapshot generated <time dateTime={overviewQuery.data.generatedAt}>{overviewQuery.data.generatedAt}</time>
            </p>
          )}
        </div>

        {overviewQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading metrics">
            {Array.from({ length: 7 }, (_, index) => <div key={index} className="h-[122px] animate-pulse rounded-xl border border-[#e7e5dc] bg-[#eeede7]" />)}
          </div>
        ) : overviewQuery.isError ? (
          <section className="rounded-xl border border-[#e5c9b9] bg-[#fbf2ec] p-5" role="alert">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-[#5b3226]">Overview unavailable</h2>
                <p className="mt-1 break-words text-sm leading-6 text-[#79594c]">{readableApiError(overviewQuery.error)}</p>
                <button type="button" onClick={() => overviewQuery.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d9b6a5] bg-[#fffaf7] px-3 py-2 text-sm font-semibold text-[#70402f] transition hover:bg-white">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            </div>
          </section>
        ) : overviewQuery.data ? (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Aggregate platform metrics">
              {metricDefinitions.map(({ key, label, detail, icon: Icon, tone }, index) => (
                <article key={key} className={`group relative overflow-hidden rounded-xl border border-[#e4e2d9] bg-[#fbfaf6] p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(44,43,32,0.07)] ${index === 0 ? "sm:col-span-2 xl:col-span-1" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#777973]">{label}</p>
                      <p className="mt-3 font-mono text-[1.8rem] font-medium leading-none tracking-[-0.055em] text-[#25262a]">{number(overviewQuery.data.metrics[key])}</p>
                    </div>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}><Icon className="h-4 w-4" strokeWidth={1.8} /></span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#eeece4] pt-2.5">
                    <span className="text-[11px] text-[#85867f]">{detail}</span>
                    {key === "newUsers" && <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7f7ba8]">{overviewQuery.data.rangeDays}d</span>}
                  </div>
                </article>
              ))}
            </section>

            <section className="mt-8 overflow-hidden rounded-2xl border border-[#e2e0d7] bg-[#fbfaf6]">
              <div className="flex flex-col gap-3 border-b border-[#e9e7df] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#57539c]" />
                    <h2 className="text-base font-semibold tracking-[-0.02em]">Recent admin actions</h2>
                  </div>
                  <p className="mt-1 text-xs text-[#7b7c76]">Administrator actions only. Not general user activity.</p>
                </div>
                <span className="w-fit rounded-full border border-[#e5e3db] bg-[#f5f4ef] px-2.5 py-1 text-[11px] font-medium text-[#656760]">
                  {overviewQuery.data.recentActivity.length} {overviewQuery.data.recentActivity.length === 1 ? "record" : "records"}
                </span>
              </div>
              {overviewQuery.data.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#efeee8] text-[#777973]"><Activity className="h-5 w-5" /></div>
                  <h3 className="mt-3 text-sm font-semibold text-[#393a39]">No recent admin actions</h3>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-[#7b7c76]">There are no administrator action records to display in this overview.</p>
                </div>
              ) : (
                <>
                  <div className="hidden grid-cols-[minmax(190px,1.2fr)_minmax(120px,.8fr)_minmax(130px,.8fr)_minmax(180px,1fr)] gap-4 bg-[#f6f5f0] px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#82847d] md:grid">
                    <span>Admin action</span><span>Resource</span><span>Outcome</span><span>Timestamp</span>
                  </div>
                  <ol className="divide-y divide-[#eeece5]">
                    {overviewQuery.data.recentActivity.map((entry) => (
                      <li key={entry.id} className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#f8f7f2] sm:px-6 md:grid-cols-[minmax(190px,1.2fr)_minmax(120px,.8fr)_minmax(130px,.8fr)_minmax(180px,1fr)] md:items-center md:gap-4">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-[#34353a]">{entry.action}</p>
                          <p className="mt-1 font-mono text-[11px] text-[#777973]">Admin ID {entry.adminUserId}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8b84] md:hidden">Resource</p>
                          <p className="mt-1 break-all font-mono text-xs text-[#555750] md:mt-0">
                            {entry.resourceType ?? "Admin overview"} · {entry.resourceId ?? "—"}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8b84] md:hidden">Outcome</p>
                          <p className="mt-1 break-words text-xs text-[#555750] md:mt-0">{entry.outcome}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8b84] md:hidden">Timestamp</p>
                          <time dateTime={entry.createdAt} className="mt-1 block break-all font-mono text-[11px] leading-5 text-[#6c6d67] md:mt-0">{formatTimestamp(entry.createdAt)}</time>
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-xl border border-[#e2e0d7] bg-[#fbfaf6] p-8 text-center">
            <p className="text-sm font-medium text-[#62645e]">No overview data is available.</p>
          </section>
        )}

        <footer className="mt-8 flex items-center gap-2 border-t border-[#deddd4] pt-4 text-[11px] text-[#85867f]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#7773a9]" />
          Staff-only operational data · Aggregate metrics
        </footer>
          </>
        )}
      </div>
    </main>
  );
}
