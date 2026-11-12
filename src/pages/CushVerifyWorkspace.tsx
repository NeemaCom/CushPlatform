import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Building2, FileCheck2, FileClock, LogOut, Plus, Settings2, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getCushVerifyAuth, isCushVerifyFirebaseConfigured } from "@/lib/cush-verify-firebase";
import { signOut } from "firebase/auth";
import { broadcastCushVerifyLogout } from "@/lib/cush-verify-session";
import { useQueryClient } from "@tanstack/react-query";

type WorkspaceIdentity = {
  user: { id: number; email: string; fullName: string; jobTitle: string };
  institution: { id: number; legalName: string; tradingName: string | null; status: string };
  membership: { role: string; status: string };
  applicationStatus: string;
  accessGranted: boolean;
};

const applicationLabels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  additional_information_required: "Additional information required",
  approved: "Approved",
  rejected: "Rejected",
};

const sections = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "new", label: "New verification request", icon: Plus },
  { id: "history", label: "Request history and status", icon: FileClock },
  { id: "consent", label: "Consent and evidence status", icon: ShieldCheck },
  { id: "reports", label: "Reports and results", icon: FileCheck2 },
  { id: "settings", label: "Organisation settings", icon: Settings2 },
] as const;

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const body = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (body) {
    try {
      return (JSON.parse(body) as { error?: string }).error ?? message;
    } catch {
      return message;
    }
  }
  return message || "Institutional account status is unavailable.";
}

export default function CushVerifyWorkspace() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<(typeof sections)[number]["id"]>("overview");
  const identityQuery = useQuery<WorkspaceIdentity>({
    queryKey: ["/api/verify/auth/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/verify/auth/me");
      return response.json() as Promise<WorkspaceIdentity>;
    },
    retry: false,
  });

  useEffect(() => {
    if (identityQuery.error && String(identityQuery.error).includes("401")) setLocation("/verify/login");
  }, [identityQuery.error, setLocation]);

  async function logout() {
    broadcastCushVerifyLogout();
    await apiRequest("POST", "/api/verify/auth/logout", {}).catch(() => undefined);
    queryClient.removeQueries({ queryKey: ["/api/verify/auth/me"], exact: true });
    if (isCushVerifyFirebaseConfigured()) {
      await signOut(getCushVerifyAuth()).catch(() => undefined);
    }
    setLocation("/verify/login");
  }

  if (identityQuery.isLoading) {
    return <main className="grid min-h-screen place-items-center bg-[#f3f7fc] text-sm text-[#61728a]">Loading institutional account…</main>;
  }
  if (identityQuery.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f7fc] px-4">
        <section role="alert" className="max-w-lg rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm">
          <h1 className="font-semibold text-[#12213d]">Institutional account unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#52627b]">{apiError(identityQuery.error)}</p>
          <button onClick={() => setLocation("/verify/login")} className="mt-5 rounded-full bg-[#3475e7] px-5 py-2.5 text-sm font-semibold text-white">Return to sign in</button>
        </section>
      </main>
    );
  }

  const data = identityQuery.data!;
  if (!data.accessGranted) {
    const rejected = data.applicationStatus === "rejected";
    return (
      <main className="min-h-screen bg-[#f3f7fc] px-4 py-8 text-[#14213a] sm:px-8">
        <div className="mx-auto max-w-3xl">
          <header className="flex items-center justify-between border-b border-[#d8e3f1] pb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Cush Verify · Institutional account</p>
              <h1 className="mt-1 text-xl font-semibold text-[#12213d]">{data.institution.legalName}</h1>
            </div>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-[#d5d3c9] bg-white px-3 py-2 text-sm font-semibold text-[#52627b]"><LogOut className="h-4 w-4" /> Sign out</button>
          </header>
          <section className={`mt-8 rounded-2xl border p-6 sm:p-8 ${rejected ? "border-rose-200 bg-rose-50" : "border-[#d8e3f1] bg-white"}`}>
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]"><ShieldCheck className="h-5 w-5" /></span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Application status</p>
                <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">{applicationLabels[data.applicationStatus] ?? "Under review"}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#52627b]">
                  {rejected
                    ? "Cush Admin has not approved this organisation. Contact support if you need more information."
                    : "Your institutional account is separate from Cush Passport. Verification workspace access will remain disabled until Cush Admin completes the organisation review."}
                </p>
                {!rejected && data.applicationStatus === "additional_information_required" && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Cush needs additional information. The team will contact the official email on the application.</p>
                )}
                <p className="mt-5 text-xs text-[#71819b]">Signed in as {data.user.email} · {data.membership.role.replace(/_/g, " ")}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const currentSection = sections.find((item) => item.id === section)!;
  return (
    <main className="min-h-screen bg-[#f3f7fc] text-[#14213a]">
      <header className="border-b border-[#d8e3f1] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0c1830] text-white"><Building2 className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Cush Verify</p>
              <h1 className="text-sm font-semibold text-[#12213d]">{data.institution.legalName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#61728a] sm:block">{data.user.fullName}</span>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-[#d5d3c9] px-3 py-2 text-sm font-semibold text-[#52627b]"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[250px_1fr] lg:py-9">
        <nav aria-label="Institutional workspace" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)} aria-current={section === id ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-4 text-left text-sm font-medium ${section === id ? "bg-[#0c1830] text-white" : "bg-white text-[#52627b] hover:bg-[#eaf1fb]"}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <section className="min-h-[430px] rounded-2xl border border-[#d8e3f1] bg-white p-5 shadow-sm sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Institutional workspace</p>
          <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">{currentSection.label}</h2>
          {section === "overview" ? (
            <>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52627b]">Your organisation is approved. This workspace will keep verification requests, consent, evidence status, and results together.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Open requests", value: "0" },
                  { label: "Awaiting consent", value: "0" },
                  { label: "Reports available", value: "0" },
                ].map((metric) => <div key={metric.label} className="rounded-xl border border-[#dce5f1] bg-[#f8fbff] p-4"><p className="text-xs text-[#61728a]">{metric.label}</p><p className="mt-2 text-2xl font-semibold text-[#12213d]">{metric.value}</p></div>)}
              </div>
            </>
          ) : section === "settings" ? (
            <div className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-[#71819b]">Legal name</p><p className="mt-1 text-sm font-semibold">{data.institution.legalName}</p></div>
              <div><p className="text-xs text-[#71819b]">Trading name</p><p className="mt-1 text-sm font-semibold">{data.institution.tradingName || "Not provided"}</p></div>
              <div><p className="text-xs text-[#71819b]">Your account</p><p className="mt-1 text-sm font-semibold">{data.user.fullName} · Organisation Administrator</p></div>
              <p className="text-xs leading-5 text-[#71819b] sm:col-span-2">Organisation settings are read-only in this initial account release. Contact Cush support for changes.</p>
            </div>
          ) : (
            <div className="mt-6 max-w-2xl rounded-xl border border-dashed border-[#d4dfed] bg-[#f8fbff] p-5">
              <p className="text-sm font-semibold text-[#12213d]">
                {section === "new" ? "Verification request creation is not enabled yet." :
                  section === "history" ? "No verification requests are available yet." :
                    section === "consent" ? "Consent and evidence status will appear here when a verification request is available." :
                      "Reports and results will appear here after a verification request is completed."}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#61728a]">Your organisation account is active. Cush will enable request processing after the verification workflow and consent requirements are finalized.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
