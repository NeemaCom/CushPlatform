import { useInfiniteQuery } from "@tanstack/react-query";
import { AlertTriangle, History, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, readableError } from "./team-management-shared";

type AccessEvent = {
  id: number;
  action: string;
  actionLabel: string;
  actor: { name: string; email: string | null };
  target: { name: string; email: string } | null;
  summary: string;
  createdAt: string;
};

type AccessHistoryPage = {
  events: AccessEvent[];
  nextBeforeId: number | null;
};

export default function CushVerifyTeamAccessHistory() {
  const historyQuery = useInfiniteQuery({
    queryKey: ["/api/verify/team/events"],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const path = pageParam
        ? `/api/verify/team/events?beforeId=${encodeURIComponent(String(pageParam))}`
        : "/api/verify/team/events";
      const response = await apiRequest("GET", path);
      return response.json() as Promise<AccessHistoryPage>;
    },
    getNextPageParam: (lastPage) => lastPage.nextBeforeId ?? undefined,
    retry: false,
  });

  if (historyQuery.isLoading) {
    return <div aria-label="Loading team access history" className="h-40 animate-pulse rounded-2xl bg-[#f1f6fc]" />;
  }
  if (historyQuery.isError) {
    return (
      <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
          <div>
            <h3 className="font-semibold text-rose-950">Access history unavailable</h3>
            <p className="mt-1 text-sm leading-6 text-rose-800">{readableError(historyQuery.error)}</p>
            <button type="button" onClick={() => void historyQuery.refetch()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-900 hover:bg-rose-50">
              <RefreshCw className="h-4 w-4" />Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const events = historyQuery.data?.pages.flatMap((page) => page.events) ?? [];
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d8e3f1] bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6edf6] bg-[#f8fbff] px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]"><History className="h-5 w-5" /></span>
          <div>
            <h3 className="font-semibold text-[#12213d]">Team access history</h3>
            <p className="mt-1 text-xs leading-5 text-[#71819b]">Recent invitations, role changes, and access updates for this organisation.</p>
          </div>
        </div>
        <span className="rounded-full border border-[#d8e3f1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#52627b]">{events.length} {events.length === 1 ? "event" : "events"}</span>
      </header>

      {events.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <History className="mx-auto h-6 w-6 text-[#91a1b6]" />
          <h4 className="mt-3 text-sm font-semibold text-[#243650]">No team access events yet</h4>
          <p className="mt-1 text-xs leading-5 text-[#71819b]">Invitations and future membership changes will appear here.</p>
        </div>
      ) : (
        <ol className="divide-y divide-[#edf1f6]">
          {events.map((event) => (
            <li key={event.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#243650]">{event.actionLabel}</p>
                  <span className="rounded-full bg-[#f1f6fc] px-2 py-0.5 text-[10px] font-medium text-[#61728a]">{event.summary}</span>
                </div>
                <p className="mt-2 text-xs text-[#52627b]">
                  {event.target ? (
                    <>Target: <span className="font-medium text-[#243650]">{event.target.name}</span> <span className="break-all">({event.target.email})</span></>
                  ) : "Target: organisation team"}
                </p>
                <p className="mt-1 text-xs text-[#71819b]">
                  By {event.actor.name}{event.actor.email ? ` · ${event.actor.email}` : ""}
                </p>
              </div>
              <time dateTime={event.createdAt} className="text-xs text-[#71819b] sm:text-right">{formatDate(event.createdAt)}</time>
            </li>
          ))}
        </ol>
      )}

      {historyQuery.hasNextPage && (
        <footer className="border-t border-[#edf1f6] px-5 py-4 text-center sm:px-6">
          <button type="button" disabled={historyQuery.isFetchingNextPage} onClick={() => void historyQuery.fetchNextPage()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cad7e8] bg-white px-4 text-sm font-semibold text-[#52627b] hover:bg-[#f8fbff] disabled:opacity-60">
            <History className="h-4 w-4" />{historyQuery.isFetchingNextPage ? "Loading…" : "Load older events"}
          </button>
        </footer>
      )}
    </section>
  );
}
