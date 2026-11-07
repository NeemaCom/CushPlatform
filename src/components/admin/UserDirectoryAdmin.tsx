import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Search, UsersRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type AdminUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  isEmailVerified: boolean | null;
  createdAt: string | null;
  lastLoginAt: string | null;
};

type UserDirectoryResponse = {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
};

const pageSize = 25;

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

function dateLabel(value: string | null, emptyLabel: string) {
  if (!value) return emptyLabel;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? emptyLabel
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function UserDirectoryAdmin() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setOffset(0);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const usersQuery = useQuery<UserDirectoryResponse>({
    queryKey: ["/api/admin/users", appliedSearch, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: appliedSearch,
        limit: String(pageSize),
        offset: String(offset),
      });
      const response = await apiRequest("GET", `/api/admin/users?${params.toString()}`);
      return response.json() as Promise<UserDirectoryResponse>;
    },
    retry: false,
    staleTime: 30_000,
  });

  const users = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;
  const firstResult = total === 0 ? 0 : offset + 1;
  const lastResult = Math.min(offset + pageSize, total);

  return (
    <section aria-labelledby="admin-users-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#82847d]">Operations · Accounts</p>
          <h1 id="admin-users-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[#24252a]">User management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f706f]">
            Search account basics and verification status. This first version is read-only; role and account changes are not available here.
          </p>
        </div>
        <span className="rounded-full border border-[#e5e3db] bg-[#f5f4ef] px-2.5 py-1 text-[11px] font-medium text-[#656760]">
          {total.toLocaleString("en-GB")} accounts
        </span>
      </div>

      <div className="mb-4 rounded-2xl border border-[#e4e2d9] bg-[#fbfaf6] p-4 sm:p-5">
        <label htmlFor="admin-user-search" className="mb-2 block text-xs font-semibold text-[#555750]">Search by name or email</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#85867f]" />
            <input
              id="admin-user-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={100}
              autoComplete="off"
              placeholder="Name or email address"
              className="min-h-11 w-full rounded-lg border border-[#d5d3c9] bg-white pl-10 pr-3 text-sm text-[#34353a] outline-none transition placeholder:text-[#999a93] focus:border-[#57539c] focus:ring-2 focus:ring-[#57539c]/15"
            />
          </div>
          <button
            type="button"
            onClick={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d5d3c9] bg-white px-4 py-2 text-sm font-semibold text-[#555750] transition hover:bg-[#f6f5f0] disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${usersQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[#777973]">Search activity is audited; search terms are not stored in the audit record.</p>
      </div>

      {usersQuery.isLoading ? (
        <div className="space-y-3" aria-label="Loading users">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-[#e4e2d9] bg-[#eeede7]" />)}
        </div>
      ) : usersQuery.isError ? (
        <section className="rounded-xl border border-[#e5c9b9] bg-[#fbf2ec] p-5" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9b543a]" />
            <div>
              <h2 className="font-semibold text-[#5b3226]">User directory unavailable</h2>
              <p className="mt-1 break-words text-sm leading-6 text-[#79594c]">{readableError(usersQuery.error)}</p>
              <button type="button" onClick={() => usersQuery.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d9b6a5] bg-[#fffaf7] px-3 py-2 text-sm font-semibold text-[#70402f]">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        </section>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d7cd] bg-[#fbfaf6] px-5 py-12 text-center">
          <UsersRound className="mx-auto h-6 w-6 text-[#777973]" />
          <h2 className="mt-3 text-sm font-semibold text-[#393a39]">{appliedSearch ? "No matching accounts" : "No accounts found"}</h2>
          <p className="mt-1 text-xs text-[#7b7c76]">{appliedSearch ? "Try a different name or email address." : "Registered accounts will appear here."}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3" aria-label="User accounts">
            {users.map((user) => {
              const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Name unavailable";
              return (
                <article key={user.id} className="rounded-xl border border-[#e4e2d9] bg-[#fbfaf6] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-sm font-semibold text-[#24252a]">{displayName}</h2>
                        <span className="rounded-full border border-[#deddd4] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#656760]">
                          {user.role || "user"}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-sm text-[#39358b]">{user.email}</p>
                      <p className="mt-1 text-[11px] text-[#777973]">Account ID {user.id}</p>
                    </div>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      user.isEmailVerified
                        ? "bg-[#e4f4f0] text-[#28685c]"
                        : "bg-[#fbf0dc] text-[#8b6324]"
                    }`}>
                      {user.isEmailVerified ? "Email verified" : "Email not verified"}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-[#eeece4] pt-3 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-[#85867f]">Registered</dt>
                      <dd className="mt-1 text-[#555750]">{dateLabel(user.createdAt, "Date unavailable")}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#85867f]">Last sign-in</dt>
                      <dd className="mt-1 text-[#555750]">{dateLabel(user.lastLoginAt, "No sign-in recorded")}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#e4e2d9] bg-[#fbfaf6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#777973]">Showing {firstResult}–{lastResult} of {total.toLocaleString("en-GB")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || usersQuery.isFetching}
                onClick={() => setOffset((current) => Math.max(0, current - pageSize))}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#d5d3c9] bg-white px-3 text-xs font-semibold text-[#555750] hover:bg-[#f6f5f0] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                disabled={offset + pageSize >= total || usersQuery.isFetching}
                onClick={() => setOffset((current) => current + pageSize)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#d5d3c9] bg-white px-3 text-xs font-semibold text-[#555750] hover:bg-[#f6f5f0] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
