import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import CushVerifyConsentInbox from "@/components/passport/CushVerifyConsentInbox";
import { API_BASE_URL } from "@/lib/api-base";

type InviteState = "loading" | "ready" | "error";

export default function PassportConsentInvite() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<InviteState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError("This invitation link is invalid.");
      setState("error");
      return;
    }

    let cancelled = false;
    void fetch(`${API_BASE_URL}/api/passport/verification-invitations/claim`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error || "This invitation could not be linked.");
        await queryClient.invalidateQueries({ queryKey: ["/api/passport/verification-requests"] });
        if (!cancelled) setState("ready");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "This invitation could not be linked.");
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return (
    <main className="min-h-screen bg-[#f4f7fc] px-4 py-10 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Cush Verify · Passport consent</p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight">Review a report request</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your report stays private unless you approve specific information categories for a stated purpose.</p>
          </div>
        </div>
        {state === "loading" && <p className="mt-6 flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Linking this secure invitation…</p>}
        {state === "error" && (
          <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">{error}</p>
            <p className="mt-1">Sign in with the same verified email address that received the request. If you do not have a Cush Passport yet, create and verify an account with that address, then reopen this link.</p>
          </div>
        )}
        {state === "ready" && <div className="mt-6"><CushVerifyConsentInbox /></div>}
      </section>
    </main>
  );
}
