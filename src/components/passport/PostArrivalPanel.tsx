import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  Home,
  MapPin,
  PiggyBank,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api-base";
import PostArrivalRecordForm, { type SavedRecord } from "./PostArrivalRecordForm";
import type { PostArrivalRecordInput } from "@shared/schema";
import PlaidConnectionPanel from "./PlaidConnectionPanel";
import { useToast } from "@/hooks/use-toast";

type ProfileData = {
  currentLocation?: string | null;
  accommodationArrangement?: string | null;
  employmentStatus?: string | null;
  startedWorking?: boolean | null;
  studying?: boolean | null;
  changesSinceArrival?: string | null;
  accountHolderName?: string | null;
  accountHolderEmail?: string | null;
  accountHolderPhone?: string | null;
};

type PostArrivalResponse = {
  profile: {
    arrivalStatus: "awaiting_arrival" | "arrived";
    arrivalDate: string | null;
    arrivalConfirmedAt: string | null;
    data: ProfileData;
    updatedAt: string;
  };
  records: SavedRecord[];
};

const GROUPS = [
  { type: "employment", title: "Employment", description: "Your role and employment terms. This is separate from income actually received.", icon: BriefcaseBusiness },
  { type: "income", title: "Income received", description: "Record salary, self-employment, freelance or other money received.", icon: CircleDollarSign },
  { type: "accommodation", title: "Accommodation and rent", description: "Include private rent, temporary accommodation, or staying with others.", icon: Home },
  { type: "banking_savings", title: "Banking and savings", description: "Add an institution or savings balance without entering account credentials.", icon: PiggyBank },
  { type: "expense", title: "Expenses and commitments", description: "Track regular costs such as food, transport, utilities, insurance or education.", icon: ReceiptText },
  { type: "financial_activity", title: "Financial activity", description: "Record rent payments, savings, transfers, remittances and other activity.", icon: ArrowDownLeft },
  { type: "other_change", title: "Other changes", description: "Capture a relevant change since arriving in the UK.", icon: Building2 },
] as const;

const PROFILE_DETAIL_FIELDS: (keyof ProfileData)[] = [
  "accountHolderName",
  "accountHolderEmail",
  "accountHolderPhone",
  "currentLocation",
  "accommodationArrangement",
  "employmentStatus",
  "startedWorking",
  "studying",
  "changesSinceArrival",
];

function hasProfileValue(value: unknown) {
  return typeof value === "boolean" || (typeof value === "string" && value.trim().length > 0);
}

function normalizeProfileValue(value: unknown) {
  if (typeof value === "string") return value.trim() || null;
  return value ?? null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload as T;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function recordSummary(record: SavedRecord) {
  const detail = record.details;
  const value = detail.amount ?? detail.salaryAmount ?? detail.rentAmount ?? detail.availableSavings;
  const suffix = typeof value === "string" ? ` · ${record.currencyCode} ${value}` : "";
  const date = record.activityDate ? ` · ${formatDate(record.activityDate)}` : "";
  return `${humanize(record.recordType)}${suffix}${date}`;
}

export default function PostArrivalPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showArrivalDate, setShowArrivalDate] = useState(false);
  const [showArrivalDateEditor, setShowArrivalDateEditor] = useState(false);
  const [arrivalDate, setArrivalDate] = useState("");
  const [notYetAcknowledged, setNotYetAcknowledged] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileData>({});
  const [profileFormReady, setProfileFormReady] = useState(false);
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(true);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SavedRecord | undefined>();
  const [operationError, setOperationError] = useState<string | null>(null);

  const profileQuery = useQuery<PostArrivalResponse>({
    queryKey: ["/api/passport/post-arrival"],
    queryFn: () => request("GET", "/api/passport/post-arrival"),
    retry: false,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setProfileForm(profileQuery.data.profile.data ?? {});
    setArrivalDate(profileQuery.data.profile.arrivalDate ?? "");
    setProfileFormReady(true);
  }, [profileQuery.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/passport/post-arrival"] });
  const confirmArrival = useMutation({
    mutationFn: (date: string) => request("POST", "/api/passport/post-arrival/confirm", { arrivalDate: date }),
    onSuccess: async () => {
      setOperationError(null);
      setShowArrivalDate(false);
      setShowArrivalDateEditor(false);
      setNotYetAcknowledged(false);
      await refresh();
    },
    onError: (error: Error) => setOperationError(error.message),
  });
  const saveProfile = useMutation({
    mutationFn: () => request("PUT", "/api/passport/post-arrival/profile", profileForm),
    onSuccess: async () => {
      setOperationError(null);
      await refresh();
      setProfileDetailsOpen(false);
      toast({
        title: "Your details are saved",
        description: "They are stored in your profile and do not change your score.",
        className: "border-emerald-300 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl",
      });
    },
    onError: (error: Error) => setOperationError(error.message),
  });
  const saveRecord = useMutation({
    mutationFn: ({ payload, id }: { payload: PostArrivalRecordInput; id?: number }) =>
      request(id ? "PUT" : "POST", id
        ? `/api/passport/post-arrival/records/${id}`
        : "/api/passport/post-arrival/records", payload),
    onSuccess: async (_data, { id }) => {
      setOperationError(null);
      setEditingRecord(undefined);
      setShowRecordForm(false);
      await refresh();
      toast({
        title: id ? "Record updated" : "Information saved",
        description: "Saved to your UK history. Adding a record does not change your score by itself.",
        className: "border-emerald-300 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl",
      });
    },
    onError: (error: Error) => setOperationError(error.message),
  });
  const removeRecord = useMutation({
    mutationFn: (id: number) => request("DELETE", `/api/passport/post-arrival/records/${id}`),
    onSuccess: async () => {
      setOperationError(null);
      await refresh();
    },
    onError: (error: Error) => setOperationError(error.message),
  });

  const records = profileQuery.data?.records ?? [];
  const profile = profileQuery.data?.profile;
  const displayedProfileForm = profileFormReady ? profileForm : profile?.data ?? {};
  const filledProfileDetails = PROFILE_DETAIL_FIELDS.filter((field) => hasProfileValue(displayedProfileForm[field])).length;
  const profileDetailsProgress = Math.round((filledProfileDetails / PROFILE_DETAIL_FIELDS.length) * 100);
  const profileDetailsDirty = profileFormReady && PROFILE_DETAIL_FIELDS.some(
    (field) => normalizeProfileValue(profileForm[field]) !== normalizeProfileValue(profile?.data[field]),
  );
  const completion = useMemo(() => {
    if (!profile) return { percent: 0, completed: 0, total: 8, label: "Not yet activated" };
    const checks = [
      Boolean(profile.arrivalDate),
      Boolean(profile.data.currentLocation || profile.data.accommodationArrangement ||
        profile.data.employmentStatus || profile.data.startedWorking != null ||
        profile.data.studying != null || profile.data.changesSinceArrival),
      records.some((item) => item.recordType === "employment"),
      records.some((item) => item.recordType === "income"),
      records.some((item) => item.recordType === "accommodation"),
      records.some((item) => item.recordType === "banking_savings"),
      records.some((item) => item.recordType === "expense"),
      records.some((item) => item.recordType === "financial_activity"),
    ];
    const completed = checks.filter(Boolean).length;
    const label = completed === 0 ? "Activated" :
      completed <= 2 ? "Getting started" :
        completed <= 5 ? "Information added" : "Profile updated";
    return { percent: Math.round((completed / checks.length) * 100), completed, total: checks.length, label };
  }, [profile, records]);

  if (profileQuery.isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Loading your Post-Arrival section…</div>;
  }

  if (profileQuery.isError || !profile) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="post-arrival-title">
        <h2 id="post-arrival-title" className="text-lg font-bold text-slate-900">Post-Arrival in the UK</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">{errorMessage(profileQuery.error)}</p>
        <p className="mt-2 text-xs text-amber-800">If storage is not set up, apply the supplied Post-Arrival Supabase migration and reload.</p>
        <button type="button" onClick={() => profileQuery.refetch()} className="mt-4 min-h-10 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900">Try again</button>
      </section>
    );
  }

  if (profile.arrivalStatus !== "arrived") {
    return (
      <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm" aria-labelledby="post-arrival-title">
        <div className="bg-gradient-to-r from-indigo-700 to-violet-600 px-5 py-5 text-white sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">Post-Arrival in the UK</p>
          <h2 id="post-arrival-title" className="mt-1 text-xl font-bold">Your UK financial history starts when you arrive</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-50">
            Add UK employment, income, accommodation, savings and financial activity over time. You do not need to upload residency or immigration documents to open this section.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-slate-900">Have you arrived in the UK?</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">Tell us your actual arrival date to activate Post-Arrival data entry. This confirmation does not increase your score.</p>
            </div>
          </div>
          {showArrivalDate ? (
            <form
              className="mt-4 flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                confirmArrival.mutate(arrivalDate);
              }}
            >
              <label className="block flex-1 text-sm font-medium text-slate-700">
                Your UK arrival date
                <input
                  className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  required
                  value={arrivalDate}
                  onChange={(event) => setArrivalDate(event.target.value)}
                />
              </label>
              <button type="submit" disabled={!arrivalDate || confirmArrival.isPending} className="min-h-10 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
                {confirmArrival.isPending ? "Confirming…" : "Confirm arrival"}
              </button>
            </form>
          ) : (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => { setShowArrivalDate(true); setNotYetAcknowledged(false); }} className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
                Yes, I’ve arrived
              </button>
              <button type="button" onClick={() => setNotYetAcknowledged(true)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Not yet
              </button>
            </div>
          )}
          {notYetAcknowledged && <p className="mt-3 text-sm text-slate-600" role="status">No problem. Pre-Arrival remains available, and you can confirm your arrival here when ready.</p>}
          {operationError && <p className="mt-3 text-sm text-red-700" role="alert">{operationError}</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Employment and income", "Record work details separately from income received."],
              ["Accommodation and costs", "Track rent, expenses, savings and commitments."],
              ["Financial activity", "Keep dated records with original countries and currencies."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const data = profile.data;
  const saveButtonClass = "min-h-10 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60";

  return (
    <section className="space-y-4" aria-labelledby="post-arrival-title">
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-indigo-700 to-violet-600 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">Post-Arrival in the UK</p>
            <h2 id="post-arrival-title" className="mt-1 text-xl font-bold">Your UK financial timeline</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-sm text-indigo-50">Arrived {formatDate(profile.arrivalDate) || "Date not yet recorded"}. Add information as your circumstances change.</p>
              <button type="button" onClick={() => { setArrivalDate(profile.arrivalDate ?? ""); setShowArrivalDateEditor((value) => !value); }} className="min-h-8 rounded-md border border-white/30 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10">
                {profile.arrivalDate ? "Edit date" : "Add arrival date"}
              </button>
            </div>
          </div>
          <div className="min-w-40 rounded-xl border border-white/20 bg-white/10 p-4 sm:w-48">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Profile progress</span>
              <span>{completion.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-label="Post-Arrival profile progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion.percent}>
              <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${completion.percent}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-indigo-50">{completion.label} · {completion.completed}/{completion.total} areas</p>
          </div>
        </div>

        {showArrivalDateEditor && (
          <form
            className="flex flex-col gap-3 border-b border-indigo-100 bg-indigo-50/50 p-4 sm:flex-row sm:items-end sm:px-6"
            onSubmit={(event) => {
              event.preventDefault();
              confirmArrival.mutate(arrivalDate);
            }}
          >
            <label className="block flex-1 text-sm font-medium text-slate-700">
              Actual UK arrival date
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                required
                value={arrivalDate}
                onChange={(event) => setArrivalDate(event.target.value)}
              />
            </label>
            <button type="submit" disabled={!arrivalDate || confirmArrival.isPending} className={saveButtonClass}>
              {confirmArrival.isPending ? "Saving…" : "Save arrival date"}
            </button>
            <button type="button" onClick={() => setShowArrivalDateEditor(false)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          </form>
        )}

        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:p-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700"><CalendarDays className="h-4 w-4" aria-hidden="true" /></div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Arrival and personal circumstances</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Optional details help keep your profile current. Leave anything blank if you prefer.</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-800">
                  {filledProfileDetails}/{PROFILE_DETAIL_FIELDS.length} filled
                </span>
                <button
                  type="button"
                  aria-expanded={profileDetailsOpen}
                  aria-controls="post-arrival-profile-details"
                  onClick={() => setProfileDetailsOpen((open) => !open)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {profileDetailsOpen ? "Hide details" : filledProfileDetails ? "Edit details" : "Add details"}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${profileDetailsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="mt-3">
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label="Optional Post-Arrival details filled"
                aria-valuemin={0}
                aria-valuemax={PROFILE_DETAIL_FIELDS.length}
                aria-valuenow={filledProfileDetails}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${profileDetailsProgress}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                <span className={profileDetailsDirty ? "font-semibold text-amber-700" : "text-slate-500"}>
                  {profileDetailsDirty ? "Unsaved changes" : filledProfileDetails ? "Details saved" : "No optional details added"}
                </span>
                <span className="text-slate-400">Profile only · not score points</span>
              </div>
            </div>
            {profileDetailsOpen && profileFormReady ? (
              <form
                id="post-arrival-profile-details"
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveProfile.mutate();
                }}
              >
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Account holder contact details</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Optional and editable. Details from a bank review only fill these fields after you choose them.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Name
                      <input
                        className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        maxLength={160}
                        autoComplete="name"
                        value={profileForm.accountHolderName ?? ""}
                        onChange={(event) => setProfileForm((current) => ({ ...current, accountHolderName: event.target.value || null }))}
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Email
                      <input
                        className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        value={profileForm.accountHolderEmail ?? ""}
                        onChange={(event) => setProfileForm((current) => ({ ...current, accountHolderEmail: event.target.value || null }))}
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                      Phone
                      <input
                        className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        type="tel"
                        maxLength={40}
                        autoComplete="tel"
                        value={profileForm.accountHolderPhone ?? ""}
                        onChange={(event) => setProfileForm((current) => ({ ...current, accountHolderPhone: event.target.value || null }))}
                      />
                    </label>
                  </div>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Current UK location or address (optional)
                  <input
                    className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    maxLength={160}
                    value={profileForm.currentLocation ?? ""}
                    onChange={(event) => setProfileForm((current) => ({ ...current, currentLocation: event.target.value || null }))}
                    autoComplete="street-address"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Accommodation arrangement
                  <select
                    className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={profileForm.accommodationArrangement ?? ""}
                    onChange={(event) => setProfileForm((current) => ({ ...current, accommodationArrangement: event.target.value || null }))}
                  >
                    <option value="">Choose if you wish</option>
                    <option value="private_rent">Private rent</option>
                    <option value="family_or_friends">With family or friends</option>
                    <option value="temporary">Temporary accommodation</option>
                    <option value="student">Student accommodation</option>
                    <option value="owned">Owned</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Current employment status
                  <select
                    className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={profileForm.employmentStatus ?? ""}
                    onChange={(event) => setProfileForm((current) => ({ ...current, employmentStatus: event.target.value || null }))}
                  >
                    <option value="">Choose if you wish</option>
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="freelance">Freelance</option>
                    <option value="seeking_work">Seeking work</option>
                    <option value="studying">Studying</option>
                    <option value="not_working">Not working</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={profileForm.startedWorking === true} onChange={(event) => setProfileForm((current) => ({ ...current, startedWorking: event.target.checked }))} />
                    I have started working
                  </label>
                  <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={profileForm.studying === true} onChange={(event) => setProfileForm((current) => ({ ...current, studying: event.target.checked }))} />
                    I am studying
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Other changes since arrival (optional)
                  <textarea
                    className="mt-1 block min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    maxLength={1000}
                    rows={3}
                    value={profileForm.changesSinceArrival ?? ""}
                    onChange={(event) => setProfileForm((current) => ({ ...current, changesSinceArrival: event.target.value || null }))}
                  />
                </label>
                <button type="submit" disabled={saveProfile.isPending || !profileDetailsDirty} className={saveButtonClass}>
                  {saveProfile.isPending ? "Saving…" : profileDetailsDirty ? "Save details" : "All changes saved"}
                </button>
              </form>
            ) : !profileDetailsOpen ? (
              <div
                id="post-arrival-profile-details"
                role="status"
                className={`mt-4 flex items-start gap-3 rounded-xl border p-3 ${
                  profileDetailsDirty
                    ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900"
                    : filledProfileDetails
                      ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900"
                      : "border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-900"
                }`}
              >
                {profileDetailsDirty || filledProfileDetails
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  : <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                <div>
                  <p className="text-xs font-bold">
                    {profileDetailsDirty ? "Your edits are not saved yet" : filledProfileDetails ? "Profile details saved" : "No details added yet"}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 opacity-90">
                    {profileDetailsDirty
                      ? "Your entries are still here. Open the section and save them when ready."
                      : filledProfileDetails
                        ? `${filledProfileDetails} optional details saved. They are not verified and do not affect your score.`
                        : "Add only the optional information you choose to share. You can reopen this section at any time."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Your assessment stays separate</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Profile completion and arrival confirmation do not add score points. These records are user-entered and are not treated as verified evidence.
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Information is saved with its original date, country and currency. Eligible provider-reviewed information continues through the existing assessment flow; the scoring method is unchanged.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlaidConnectionPanel
        request={request}
        onProfileDetails={(details) => setProfileForm((current) => ({
          ...current,
          ...(details.accountHolderName ? { accountHolderName: details.accountHolderName } : {}),
          ...(details.accountHolderEmail ? { accountHolderEmail: details.accountHolderEmail } : {}),
          ...(details.accountHolderPhone ? { accountHolderPhone: details.accountHolderPhone } : {}),
        }))}
      />

      {operationError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{operationError}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Your UK financial information</h3>
          <p className="mt-1 text-sm text-slate-500">Add sections over time. You can edit or remove your records.</p>
        </div>
        <button type="button" onClick={() => { setEditingRecord(undefined); setShowRecordForm((current) => !current); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
          <Plus className="h-4 w-4" aria-hidden="true" />Add information
        </button>
      </div>

      {showRecordForm && (
        <PostArrivalRecordForm
          isSaving={saveRecord.isPending}
          onSubmit={(payload, id) => saveRecord.mutate({ payload, id })}
          onCancel={() => { setShowRecordForm(false); setEditingRecord(undefined); }}
        />
      )}

      {editingRecord && (
        <PostArrivalRecordForm
          key={editingRecord.id}
          initialRecord={editingRecord}
          isSaving={saveRecord.isPending}
          onSubmit={(payload, id) => saveRecord.mutate({ payload, id })}
          onCancel={() => setEditingRecord(undefined)}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {GROUPS.map(({ type, title, description, icon: Icon }) => {
          const items = records.filter((record) => record.recordType === type);
          return (
            <article key={type} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700"><Icon className="h-4 w-4" aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-slate-900">{title}</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{items.length}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                </div>
              </div>
              {items.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {items.map((record) => (
                    <li key={record.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-800">{record.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{recordSummary(record)}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{record.countryCode} · {record.currencyCode} · {humanize(record.evidenceStatus)}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => { setShowRecordForm(false); setEditingRecord(record); }} className="min-h-9 rounded-md px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Edit</button>
                          <button
                            type="button"
                            aria-label={`Delete ${record.label}`}
                            disabled={removeRecord.isPending}
                            onClick={() => {
                              if (window.confirm(`Delete “${record.label}”?`)) removeRecord.mutate(record.id);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">Nothing added yet. This section is optional.</p>
              )}
            </article>
          );
        })}
      </div>

      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-800">
          <span className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-indigo-700" aria-hidden="true" />Evidence and verification</span>
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </summary>
        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <p>Supporting documents are optional. A document can support a specific record, but uploading one does not automatically verify it or prove immigration status.</p>
          <p>Secure document uploads are not available in this section yet. Until durable private file storage is configured, do not submit financial or immigration documents through the existing temporary uploader.</p>
          <p className="text-xs text-slate-500">Current record status: user-recorded. Evidence review states will only change after a supported review process.</p>
        </div>
      </details>

      <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
        <Wallet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        These Post-Arrival records are kept separately from pre-arrival history. Score and confidence calculations are not changed by adding profile details.
      </p>
    </section>
  );
}
