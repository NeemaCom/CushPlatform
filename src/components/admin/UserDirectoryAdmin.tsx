import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, RefreshCw, Search, UsersRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ASSIGNABLE_USER_ROLES, type AssignableUserRole } from "@shared/admin-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

type AdminUserDetail = AdminUser & {
  isPhoneVerified: boolean | null;
  mfaEnabled: boolean | null;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingConsent: boolean | null;
  updatedAt: string | null;
};

type RoleChangeResponse = {
  success: true;
  changed: boolean;
  previousRole?: string;
  role: string;
};

type PendingRoleChange = {
  userId: number;
  email: string;
  previousRole: string;
  role: AssignableUserRole;
};

const roleLabels: Record<AssignableUserRole, string> = {
  user: "User",
  admin: "Full admin",
  operations_admin: "Operations admin",
  financial_identity_admin: "Financial identity admin",
  technical_admin: "Technical admin",
  read_only_admin: "Read-only admin",
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

function roleLabel(role: string | null) {
  if (!role) return "User";
  return role in roleLabels
    ? roleLabels[role as AssignableUserRole]
    : role.replace(/_/g, " ");
}

function isAssignableUserRole(role: string): role is AssignableUserRole {
  return (ASSIGNABLE_USER_ROLES as readonly string[]).includes(role);
}

export default function UserDirectoryAdmin({
  canManageRoles,
  currentAdminId,
}: {
  canManageRoles: boolean;
  currentAdminId: number | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);

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
  const detailQuery = useQuery<AdminUserDetail>({
    queryKey: ["/api/admin/users", "detail", selectedUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/users/${selectedUserId}`);
      return response.json() as Promise<AdminUserDetail>;
    },
    enabled: selectedUserId !== null,
    retry: false,
    staleTime: 30_000,
  });
  const roleChangeMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: AssignableUserRole }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/role`, { role });
      return response.json() as Promise<RoleChangeResponse>;
    },
    onSuccess: async (result, variables) => {
      setPendingRoleChange(null);
      setSelectedRoles((current) => {
        const next = { ...current };
        delete next[variables.userId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: result.changed ? "User role updated" : "No role change needed",
        description: result.changed
          ? `${roleLabel(result.previousRole ?? null)} → ${roleLabel(result.role)}. The change was recorded.`
          : "This account already has the selected role.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Role change failed",
        description: readableError(error),
        variant: "destructive",
      });
    },
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
            Search account basics and verification status. Role changes require full-admin access and are confirmed and audit-logged.
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
              const currentRole = user.role ?? "user";
              const selectedRole = selectedRoles[user.id] ?? currentRole;
              const isCurrentAdmin = user.id === currentAdminId;
              return (
                <article key={user.id} className="rounded-xl border border-[#e4e2d9] bg-[#fbfaf6] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-sm font-semibold text-[#24252a]">{displayName}</h2>
                        <span className="rounded-full border border-[#deddd4] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#656760]">
                          {roleLabel(user.role)}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-sm text-[#39358b]">{user.email}</p>
                      <p className="mt-1 text-[11px] text-[#777973]">Account ID {user.id}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        user.isEmailVerified
                          ? "bg-[#e4f4f0] text-[#28685c]"
                          : "bg-[#fbf0dc] text-[#8b6324]"
                      }`}>
                        {user.isEmailVerified ? "Email verified" : "Email not verified"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(user.id)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d5d3c9] bg-white px-3 text-xs font-semibold text-[#39358b] transition hover:bg-[#f6f5f0] focus:outline-none focus:ring-2 focus:ring-[#57539c]/30"
                        aria-label={`View details for ${displayName}`}
                      >
                        <Eye className="h-3.5 w-3.5" /> View details
                      </button>
                    </div>
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
                  {canManageRoles && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-[#eeece4] pt-4 sm:flex-row sm:items-end sm:justify-between">
                      <label className="block min-w-0 flex-1 text-xs font-semibold text-[#555750]" htmlFor={`admin-user-role-${user.id}`}>
                        Account role
                        <select
                          id={`admin-user-role-${user.id}`}
                          value={selectedRole}
                          disabled={isCurrentAdmin || roleChangeMutation.isPending}
                          onChange={(event) => setSelectedRoles((current) => ({ ...current, [user.id]: event.target.value }))}
                          className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d5d3c9] bg-white px-3 py-2 text-sm font-normal text-[#34353a] outline-none focus:border-[#57539c] focus:ring-2 focus:ring-[#57539c]/15 disabled:cursor-not-allowed disabled:bg-[#f2f1ed] disabled:text-[#85867f]"
                        >
                          {!isAssignableUserRole(currentRole) && (
                            <option value={currentRole} disabled>{roleLabel(currentRole)} (legacy role)</option>
                          )}
                          {ASSIGNABLE_USER_ROLES.map((role) => (
                            <option key={role} value={role}>{roleLabels[role]}</option>
                          ))}
                        </select>
                      </label>
                      <div className="flex flex-col gap-1.5 sm:items-end">
                        <button
                          type="button"
                          disabled={isCurrentAdmin || !isAssignableUserRole(selectedRole) || selectedRole === currentRole || roleChangeMutation.isPending}
                          onClick={() => {
                            if (!isAssignableUserRole(selectedRole)) return;
                            setPendingRoleChange({
                              userId: user.id,
                              email: user.email,
                              previousRole: currentRole,
                              role: selectedRole,
                            });
                          }}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#29266f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#39358b] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Save role
                        </button>
                        {isCurrentAdmin && <span className="text-[10px] text-[#777973]">You cannot change your own role.</span>}
                      </div>
                    </div>
                  )}
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

      <Dialog
        open={selectedUserId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto border-[#e4e2d9] bg-[#fbfaf6]">
          <DialogHeader>
            <DialogTitle className="text-[#24252a]">User account details</DialogTitle>
            <DialogDescription>
              Read-only account, security, and consent status. Credentials, provider IDs, and financial records are excluded.
            </DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="space-y-3 py-3" aria-label="Loading account details">
              <div className="h-20 animate-pulse rounded-xl bg-[#eeede7]" />
              <div className="h-32 animate-pulse rounded-xl bg-[#eeede7]" />
            </div>
          ) : detailQuery.isError ? (
            <div className="rounded-xl border border-[#e5c9b9] bg-[#fbf2ec] p-4" role="alert">
              <p className="text-sm font-semibold text-[#5b3226]">Account details unavailable</p>
              <p className="mt-1 break-words text-sm leading-6 text-[#79594c]">{readableError(detailQuery.error)}</p>
              <button type="button" onClick={() => detailQuery.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d9b6a5] bg-[#fffaf7] px-3 py-2 text-sm font-semibold text-[#70402f]">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          ) : detailQuery.data ? (
            <div className="space-y-4">
              <section className="rounded-xl border border-[#e4e2d9] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-[#24252a]">
                      {[detailQuery.data.firstName, detailQuery.data.lastName].filter(Boolean).join(" ") || "Name unavailable"}
                    </h3>
                    <p className="mt-1 break-all text-sm text-[#39358b]">{detailQuery.data.email}</p>
                  </div>
                  <span className="rounded-full border border-[#deddd4] bg-[#f6f5f0] px-2.5 py-1 text-[10px] font-semibold text-[#656760]">
                    {roleLabel(detailQuery.data.role)}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-[#777973]">Account ID {detailQuery.data.id}</p>
              </section>

              <DetailGroup title="Security and verification">
                <DetailItem label="Email verification" value={detailQuery.data.isEmailVerified ? "Verified" : "Not verified"} />
                <DetailItem label="Phone verification" value={detailQuery.data.isPhoneVerified ? "Verified" : "Not verified"} />
                <DetailItem label="Multi-factor authentication" value={detailQuery.data.mfaEnabled ? "Enabled" : "Not enabled"} />
              </DetailGroup>

              <DetailGroup title="Consent status">
                <DetailItem label="Terms acceptance" value={detailQuery.data.acceptTerms ? "Recorded" : "Not recorded"} />
                <DetailItem label="Privacy acceptance" value={detailQuery.data.acceptPrivacy ? "Recorded" : "Not recorded"} />
                <DetailItem label="Marketing updates" value={detailQuery.data.marketingConsent ? "Opted in" : "Not opted in"} />
              </DetailGroup>

              <DetailGroup title="Account dates">
                <DetailItem label="Registered" value={dateLabel(detailQuery.data.createdAt, "Unavailable")} />
                <DetailItem label="Last updated" value={dateLabel(detailQuery.data.updatedAt, "Unavailable")} />
                <DetailItem label="Last sign-in" value={dateLabel(detailQuery.data.lastLoginAt, "No sign-in recorded")} />
              </DetailGroup>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => {
          if (!open && !roleChangeMutation.isPending) setPendingRoleChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm account role change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleChange && (
                <>
                  Change {pendingRoleChange.email} from <strong>{roleLabel(pendingRoleChange.previousRole)}</strong> to{" "}
                  <strong>{roleLabel(pendingRoleChange.role)}</strong>? This changes access immediately and is recorded in the admin audit log.
                  {pendingRoleChange.role === "admin" && " Full admin access includes all administrative permissions."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={roleChangeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={roleChangeMutation.isPending || !pendingRoleChange}
              onClick={() => {
                if (pendingRoleChange) {
                  roleChangeMutation.mutate({
                    userId: pendingRoleChange.userId,
                    role: pendingRoleChange.role,
                  });
                }
              }}
            >
              {roleChangeMutation.isPending ? "Saving…" : "Confirm change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e4e2d9] bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#777973]">{title}</h3>
      <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
        {children}
      </dl>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[#85867f]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-[#393a39]">{value}</dd>
    </div>
  );
}
