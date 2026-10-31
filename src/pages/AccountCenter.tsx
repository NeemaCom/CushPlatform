import { useEffect, useState } from "react";
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, updatePassword, type User as FirebaseUser } from "firebase/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  FileCheck2,
  ImagePlus,
  Loader2,
  Mail,
  Trash2,
  UserRound,
} from "lucide-react";
import AccountShell, { type AccountSection } from "@/components/account/AccountShell";
import { useAuth, type User } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { accountRequest } from "@/lib/account-api";
import { auth } from "@/firebase";
import { logoutFromCush } from "@/lib/logout";

interface PassportSummary {
  passport: {
    score: number | null;
    provisionalScore: number | null;
    scoreCoveragePercent: number;
    confidenceScore: number | null;
    assessmentStatus: "not_started" | "incomplete" | "provisional" | "complete";
    missingRequirements: string[];
    scoreBreakdown: {
      availableFunds: number | null;
      incomeStrength: number | null;
      cashFlow: number | null;
      creditHistory: number | null;
    } | null;
  };
}

interface EvidenceRecord {
  id: number;
  documentType: string;
  label: string;
  tier: number;
  fileName: string | null;
  status: string;
  submittedAt: string;
}

interface MonoAccount {
  id: number;
  linkedAt: string;
}

interface MonoStatus {
  configured: boolean;
  callbackConfigured: boolean;
  schemaReady: boolean;
}

const sectionMeta: Record<AccountSection, { title: string; description: string }> = {
  profile: { title: "Personal Profile", description: "Review and update the personal details stored in your Cush account." },
  "financial-identity": { title: "Financial Identity", description: "Review your Cush Passport assessment and the evidence currently available." },
  documents: { title: "My Documents", description: "Review the evidence records attached to your assessment." },
  verification: { title: "Verification Status", description: "See which account and evidence checks the system has confirmed." },
  "connected-accounts": { title: "Connected Accounts", description: "Review the bank connections currently linked to your account." },
  security: { title: "Security & Privacy", description: "Manage sign-in security and review the controls currently available." },
  preferences: { title: "Notifications & Preferences", description: "Manage supported communication preferences." },
  support: { title: "Help & Support", description: "Find answers about the current Cush Passport workflows." },
  contact: { title: "Contact Cush", description: "Use the contact channel currently published by Cush." },
};

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "pending" | "neutral" }) {
  const styles = {
    good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[tone]}`}>{children}</span>;
}

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>;
}

function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {detail && <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>}
    </div>
  );
}

function MessageBox({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" }) {
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-6 ${
      tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-100 bg-blue-50 text-blue-900"
    }`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function LoadingState() {
  return <div className="flex min-h-40 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading account information…</div>;
}

function ErrorState({ message }: { message: string }) {
  return <MessageBox tone="warning">{message}</MessageBox>;
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function humanize(value: string) {
  return value.toLowerCase().split(/[_\s]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

async function optimizeProfileImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image smaller than 8 MB.");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare the selected image.");
    context.drawImage(bitmap, 0, 0, width, height);
    const quality = Math.max(0.4, 0.82 - attempt * 0.07);
    const image = canvas.toDataURL("image/jpeg", quality);
    if (image.length <= 80_000) {
      bitmap.close();
      return image;
    }
    width = Math.max(1, Math.round(width * 0.82));
    height = Math.max(1, Math.round(height * 0.82));
  }
  bitmap.close();
  throw new Error("The image could not be reduced enough. Try a smaller photo.");
}

interface AccountCenterProps {
  section: string;
}

export default function AccountCenter({ section: rawSection }: AccountCenterProps) {
  const section = (rawSection in sectionMeta ? rawSection : "profile") as AccountSection;
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  async function handleSignOut() {
    await logoutFromCush();
    await queryClient.cancelQueries();
    queryClient.clear();
    setLocation("/login");
  }

  if (isLoading) return <LoadingState />;
  if (!user) return null;

  return (
    <AccountShell user={user} section={section} description={sectionMeta[section].description} onSignOut={handleSignOut}>
      {section === "profile" && <ProfileSettings user={user} />}
      {section === "financial-identity" && <FinancialIdentity />}
      {section === "documents" && <Documents />}
      {section === "verification" && <VerificationStatus user={user} />}
      {section === "connected-accounts" && <ConnectedAccounts />}
      {section === "security" && <SecurityPrivacy user={user} />}
      {section === "preferences" && <Preferences user={user} />}
      {section === "support" && <Support />}
      {section === "contact" && <Contact />}
    </AccountShell>
  );
}

function ProfileSettings({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phoneNumber: user.phoneNumber ?? "",
    nationality: user.nationality ?? "",
  });

  useEffect(() => {
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phoneNumber: user.phoneNumber ?? "",
      nationality: user.nationality ?? "",
    });
  }, [user.firstName, user.lastName, user.nationality, user.phoneNumber]);

  const saveProfile = useMutation({
    mutationFn: () => accountRequest<User>("PUT", "/api/auth/profile", {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      nationality: form.nationality.trim(),
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/auth/me"], updated);
      toast({ title: "Profile saved", description: "Your supported profile details have been updated." });
    },
    onError: (error: Error) => toast({ title: "Could not save profile", description: error.message, variant: "destructive" }),
  });

  const savePicture = useMutation({
    mutationFn: async (file: File) => {
      const image = await optimizeProfileImage(file);
      return accountRequest<User>("POST", "/api/profile/picture", { image });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/auth/me"], updated);
      toast({ title: "Profile photo updated" });
    },
    onError: (error: Error) => toast({ title: "Could not update photo", description: error.message, variant: "destructive" }),
  });

  function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: "Name required", description: "Enter both your first and last name.", variant: "destructive" });
      return;
    }
    saveProfile.mutate();
  }

  return (
    <div className="space-y-5">
      <Surface>
        <SectionHeading title="Profile details" detail="These details belong to your Cush account. Email changes are read-only here until a Firebase re-verification flow is available." />
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt="Your profile" className="h-16 w-16 rounded-full border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700"><UserRound className="h-7 w-7" aria-hidden="true" /></div>
          )}
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500">
              {savePicture.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Change photo
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={savePicture.isPending}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) savePicture.mutate(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="mt-1.5 text-xs text-slate-500">Images are resized before saving. JPEG, PNG, or WebP.</p>
          </div>
        </div>

        <form onSubmit={submitProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              First name
              <input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} maxLength={100} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Last name
              <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} maxLength={100} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phone number
              <input type="tel" value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} maxLength={30} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Nationality
              <input value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} maxLength={100} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-slate-800">Sign-in email</p>
              <p className="mt-0.5 truncate text-slate-500">{user.email}</p>
            </div>
            <StatusPill tone={user.isEmailVerified ? "good" : "pending"}>{user.isEmailVerified ? "Verified" : "Verification pending"}</StatusPill>
          </div>
          <button type="submit" disabled={saveProfile.isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
            {saveProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save profile
          </button>
        </form>
      </Surface>

      <Surface>
        <SectionHeading title="Additional personal information" detail="These fields are not currently stored or managed in the Cush account profile." />
        <div className="grid gap-3 sm:grid-cols-3">
          {["Date of birth", "Country of residence", "Residential address"].map((label) => (
            <div key={label} className="rounded-xl border border-dashed border-slate-200 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="mt-1 text-xs text-slate-400">Not collected in this account yet</p>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function FinancialIdentity() {
  const { data, isLoading, error } = useQuery<PassportSummary>({
    queryKey: ["/api/passport/me"],
    queryFn: () => accountRequest("GET", "/api/passport/me"),
    retry: false,
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Your Cush Passport summary could not be loaded. Try again later or open the assessment dashboard." />;

  const passport = data.passport;
  const value = passport.provisionalScore ?? passport.score;
  const components = [
    ["Available funds", passport.scoreBreakdown?.availableFunds],
    ["Income strength", passport.scoreBreakdown?.incomeStrength],
    ["Cash-flow behaviour", passport.scoreBreakdown?.cashFlow],
    ["Credit history", passport.scoreBreakdown?.creditHistory],
  ] as const;

  return (
    <div className="space-y-5">
      <Surface>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cush Score</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{value === null ? "—" : value.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-500">{passport.assessmentStatus === "complete" ? "Complete assessment" : "Provisional assessment"}</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-semibold">{passport.scoreCoveragePercent}% evidence coverage</p>
            <p className="mt-1 text-xs text-blue-800">Coverage is separate from score and confidence.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {components.map(([label, componentScore]) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span className="text-sm text-slate-600">{label}</span>
              <span className="text-sm font-semibold text-slate-900">{componentScore === null || componentScore === undefined ? "Not available" : `${componentScore}/1000`}</span>
            </div>
          ))}
        </div>
        {passport.confidenceScore !== null && (
          <p className="mt-4 text-sm text-slate-500">Evidence confidence: <span className="font-semibold text-slate-700">{passport.confidenceScore}/100</span></p>
        )}
      </Surface>
      {passport.missingRequirements.length > 0 && (
        <Surface>
          <SectionHeading title="What is still needed" detail="Missing information is excluded from an in-progress score; it is not treated as a zero." />
          <ul className="space-y-2">
            {passport.missingRequirements.map((requirement) => <li key={requirement} className="flex gap-2 text-sm text-slate-600"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{humanize(requirement)}</li>)}
          </ul>
        </Surface>
      )}
      <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        Open financial assessment <ArrowRight className="h-4 w-4" />
      </Link>
      <MessageBox>Financial history and downloadable identity reports are not currently available as separate account exports.</MessageBox>
    </div>
  );
}

function Documents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<{ documents: EvidenceRecord[] }>({
    queryKey: ["/api/passport/evidence"],
    queryFn: () => accountRequest("GET", "/api/passport/evidence"),
    retry: false,
  });

  const removeDocument = useMutation({
    mutationFn: (id: number) => accountRequest("DELETE", `/api/passport/evidence/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/passport/evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/passport/me"] });
      toast({ title: "Evidence record removed" });
    },
    onError: (error: Error) => toast({ title: "Could not remove record", description: error.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Your evidence records could not be loaded." />;

  return (
    <div className="space-y-5">
      <Surface>
        <SectionHeading title="Assessment evidence" detail={`${data.documents.length} evidence record${data.documents.length === 1 ? "" : "s"} attached to your current assessment.`} />
        {data.documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center">
            <FileCheck2 className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No evidence records yet</p>
            <p className="mt-1 text-sm text-slate-500">Assessment evidence will appear here when submitted.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.documents.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-700"><FileCheck2 className="h-4 w-4" aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{document.fileName || document.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{humanize(document.documentType)} · Submitted {formatDate(document.submittedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={document.status === "VERIFIED" ? "good" : document.status === "PENDING_REVIEW" ? "pending" : "neutral"}>{humanize(document.status)}</StatusPill>
                  <button
                    type="button"
                    aria-label={`Remove evidence record ${document.fileName || document.label}`}
                    disabled={removeDocument.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove “${document.fileName || document.label}” from your evidence records?`)) {
                        removeDocument.mutate(document.id);
                      }
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>
      <MessageBox tone="warning">
        Evidence file previews and durable document archiving are not currently supported. The current dashboard uploader stores file payloads in the app’s in-memory evidence store, so do not rely on it for permanent document storage. Only submission records are shown here.
      </MessageBox>
      <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        Open assessment dashboard <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function VerificationStatus({ user }: { user: User }) {
  const { data, isLoading, error } = useQuery<{ documents: EvidenceRecord[] }>({
    queryKey: ["/api/passport/evidence"],
    queryFn: () => accountRequest("GET", "/api/passport/evidence"),
    retry: false,
  });

  const phoneStatus = !user.phoneNumber ? "Not provided" : user.isPhoneVerified ? "Verified" : "Pending";
  const emailStatus = user.isEmailVerified ? "Verified" : "Pending";
  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Verification details could not be loaded." />;

  return (
    <div className="space-y-5">
      <Surface>
        <SectionHeading title="Account contact checks" detail="Statuses below reflect the current authenticated account record." />
        <div className="grid gap-3 sm:grid-cols-2">
          <VerificationRow title="Email address" value={user.email} status={emailStatus} />
          <VerificationRow title="Phone number" value={user.phoneNumber || "No phone number added"} status={phoneStatus} />
        </div>
      </Surface>
      <Surface>
        <SectionHeading title="Submitted evidence" detail="An uploaded document is not marked verified unless the backend status confirms it." />
        {data.documents.length === 0 ? <p className="text-sm text-slate-500">No evidence records have been submitted.</p> : (
          <ul className="space-y-3">
            {data.documents.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-slate-700">{document.label}</span>
                <StatusPill tone={document.status === "VERIFIED" ? "good" : document.status === "PENDING_REVIEW" ? "pending" : "neutral"}>{humanize(document.status)}</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </Surface>
      <MessageBox>Full identity-check history and a document-review timeline are not exposed by the current backend.</MessageBox>
    </div>
  );
}

function VerificationRow({ title, value, status }: { title: string; value: string; status: string }) {
  const confirmed = status === "Verified";
  return (
    <div className="rounded-xl border border-slate-100 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <StatusPill tone={confirmed ? "good" : status === "Pending" ? "pending" : "neutral"}>{status}</StatusPill>
      </div>
      <p className="mt-1 truncate text-sm text-slate-500">{value}</p>
    </div>
  );
}

function ConnectedAccounts() {
  const accountsQuery = useQuery<{ accounts: MonoAccount[] }>({
    queryKey: ["/api/mono/accounts"],
    queryFn: () => accountRequest("GET", "/api/mono/accounts"),
    retry: false,
  });
  const statusQuery = useQuery<MonoStatus>({
    queryKey: ["/api/mono/status"],
    queryFn: () => accountRequest("GET", "/api/mono/status"),
    retry: false,
  });

  if (accountsQuery.isLoading || statusQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-5">
      <Surface>
        <SectionHeading title="Mono bank connections" detail="This page shows the connection metadata currently available to Cush." />
        {accountsQuery.error ? (
          <ErrorState message="Connected-account data is unavailable. The Mono storage schema may not be configured." />
        ) : (accountsQuery.data?.accounts.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-800">No Mono connections found</p>
            <p className="mt-1 text-sm text-slate-500">Connect an account from the Financial Identity assessment when you are ready.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {accountsQuery.data!.accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Mono-linked bank account</p>
                  <p className="mt-1 text-xs text-slate-500">Connected {formatDate(account.linkedAt)}</p>
                </div>
                <StatusPill tone="good">Connected</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </Surface>
      {statusQuery.data && (
        <Surface>
          <SectionHeading title="Provider readiness" />
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={statusQuery.data.configured ? "good" : "pending"}>{statusQuery.data.configured ? "Mono configured" : "Mono configuration unavailable"}</StatusPill>
            <StatusPill tone={statusQuery.data.schemaReady ? "good" : "pending"}>{statusQuery.data.schemaReady ? "Storage ready" : "Storage needs setup"}</StatusPill>
          </div>
        </Surface>
      )}
      <MessageBox>Bank name, account number, permission details, and a disconnect action are not exposed on this account page. Use the assessment flow for connection setup; revocation requires a backend capability that is not currently available here.</MessageBox>
      <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        Open financial assessment <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function SecurityPrivacy({ user }: { user: User }) {
  const { toast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setFirebaseUser), []);

  const canChangePassword = Boolean(firebaseUser?.providerData.some((provider) => provider.providerId === "password"));

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!firebaseUser?.email || !canChangePassword) return;
    if (form.newPassword.length < 8 || !/[a-z]/.test(form.newPassword) || !/[A-Z]/.test(form.newPassword) || !/\d/.test(form.newPassword) || !/[@$!%*?&]/.test(form.newPassword)) {
      toast({ title: "Password is too weak", description: "Use at least 8 characters with uppercase, lowercase, number, and symbol.", variant: "destructive" });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast({ title: "Passwords do not match", description: "Re-enter the same new password in both fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, form.currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, form.newPassword);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password updated", description: "Your Firebase sign-in password has been changed." });
    } catch (error) {
      const code = (error as { code?: string }).code;
      toast({
        title: "Could not change password",
        description: code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "The current password was not accepted."
          : code === "auth/requires-recent-login"
            ? "Sign out and sign back in, then try again."
            : error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Surface>
        <SectionHeading title="Change password" detail="Password changes are handled by Firebase, the current sign-in provider." />
        {!firebaseUser ? (
          <MessageBox tone="warning">The Firebase sign-in session is unavailable in this browser. Sign out and sign back in before changing your password.</MessageBox>
        ) : canChangePassword ? (
          <form onSubmit={submitPassword} className="max-w-lg space-y-3">
            {[
              ["currentPassword", "Current password", "current-password"],
              ["newPassword", "New password", "new-password"],
              ["confirmPassword", "Confirm new password", "new-password"],
            ].map(([key, label, autoComplete]) => (
              <label key={key} className="block text-sm font-medium text-slate-700">
                {label}
                <input
                  type="password"
                  autoComplete={autoComplete}
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  required
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            ))}
            <button disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Update password
            </button>
          </form>
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Your account signs in through an external provider. Password changes must be made with that provider; Cush does not store a separate sign-in password for this account.
          </p>
        )}
      </Surface>
      <Surface>
        <SectionHeading title="Account security" />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
            <div><p className="text-sm font-semibold text-slate-800">Two-factor authentication</p><p className="mt-1 text-xs text-slate-500">The current account record reports this setting.</p></div>
            <StatusPill tone={user.mfaEnabled ? "good" : "neutral"}>{user.mfaEnabled ? "Enabled" : "Not enabled"}</StatusPill>
          </div>
          <p className="text-sm leading-6 text-slate-500">Cush does not currently provide a two-factor setup flow or a screen to review and revoke active sessions and devices.</p>
        </div>
      </Surface>
      <Surface>
        <SectionHeading title="Privacy documents" />
        <div className="flex flex-wrap gap-3">
          <Link href="/terms-of-service" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900">Terms of Service <ExternalLink className="h-3.5 w-3.5" /></Link>
          <Link href="/privacy-policy" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900">Privacy Policy <ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>
      </Surface>
    </div>
  );
}

function Preferences({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const marketingMutation = useMutation({
    mutationFn: (marketingConsent: boolean) => accountRequest<User>("PUT", "/api/auth/profile", { marketingConsent }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/auth/me"], updated);
      toast({ title: "Preference saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save preference", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <Surface>
        <SectionHeading title="Product updates" detail="Marketing consent is separate from required account, security, and verification messages." />
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-4">
          <input
            type="checkbox"
            checked={user.marketingConsent === true}
            disabled={marketingMutation.isPending}
            onChange={(event) => marketingMutation.mutate(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">Receive marketing and product updates</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">Optional. You can opt in or out at any time. This setting does not control important account notices.</span>
          </span>
          {marketingMutation.isPending && <Loader2 className="ml-auto h-4 w-4 animate-spin text-blue-700" />}
        </label>
      </Surface>
      <Surface>
        <SectionHeading title="Notification channels" detail="Channel-by-channel notification settings are not configured in the current backend." />
        <div className="grid gap-3 sm:grid-cols-2">
          {["Email notifications", "SMS notifications", "WhatsApp notifications", "In-app notifications"].map((channel) => (
            <div key={channel} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-700">{channel}</span>
              <StatusPill>Not configurable</StatusPill>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function Support() {
  const faqs = [
    {
      question: "What does my Cush Score represent?",
      answer: "The dashboard reports the current assessment from supported evidence. In-progress scores use available components and show evidence coverage separately; missing data is not treated as zero.",
    },
    {
      question: "How do I connect a bank account?",
      answer: "Open the Financial Identity assessment on the dashboard and use its Mono connection flow. Bank connection and statement review require your authorization.",
    },
    {
      question: "Can I share or revoke my Passport?",
      answer: "The dashboard contains the current share-link controls. Review the information before sharing and revoke an existing link from the same dashboard when needed.",
    },
    {
      question: "Can I download or view uploaded documents here?",
      answer: "This account area shows submission records only. Secure document preview and durable document archiving are not available yet.",
    },
  ];
  return (
    <div className="space-y-5">
      <Surface>
        <SectionHeading title="Common questions" detail="Answers below describe features available in the current Cush application." />
        <div className="divide-y divide-slate-100">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-4 first:pt-0 last:pb-0">
              <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Surface>
      <MessageBox tone="warning">A full help-centre search and support-request form are not currently connected.</MessageBox>
      <Link href="/contact" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        Contact details <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Contact() {
  return (
    <div className="space-y-5">
      <Surface>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Mail className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Verification support</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">The existing published contact channel is for verification queries.</p>
            <a href="mailto:verify@we-cush.com" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">
              verify@we-cush.com <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </Surface>
      <MessageBox>A general support contact form or additional contact channel is not currently available in the app.</MessageBox>
      <p className="text-sm text-slate-500">For policy information, see the <Link href="/privacy-policy" className="font-semibold text-blue-700 hover:text-blue-900">Privacy Policy</Link> and <Link href="/terms-of-service" className="font-semibold text-blue-700 hover:text-blue-900">Terms of Service</Link>.</p>
    </div>
  );
}

