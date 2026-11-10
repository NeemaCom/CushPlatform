import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { createUserWithEmailAndPassword, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ArrowLeft, Building2, MailCheck, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getCushVerifyAuth, isCushVerifyFirebaseConfigured } from "@/lib/cush-verify-firebase";

function getQueryToken() {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const body = message.match(/^\d+:\s*(\{[\s\S]*\})$/)?.[1];
  if (body) {
    try {
      return (JSON.parse(body) as { error?: string }).error ?? message;
    } catch {
      return message;
    }
  }
  if (message.includes("auth/email-already-in-use")) return "This email already has a Cush Verify sign-in. Use the institutional sign-in page.";
  if (message.includes("auth/weak-password")) return "Choose a password with at least 6 characters.";
  if (message.includes("auth/invalid-credential")) return "Email or password is incorrect.";
  if (message.includes("auth/too-many-requests")) return "Too many attempts. Wait a while and try again.";
  return message || "We could not complete this request. Please try again.";
}

async function postIdentityToken(path: string, idToken: string, extra?: Record<string, string>) {
  const response = await apiRequest("POST", path, { idToken, ...extra });
  return response.json();
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-[#f3f7fc] px-4 py-8 text-[#14213a] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <Link href="/verify" className="inline-flex items-center gap-2 text-sm font-semibold text-[#275fb7] hover:text-[#16458f]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Cush Verify
          </Link>
          <Link href="/" className="text-xs font-medium text-[#61728a] hover:text-[#275fb7]">Cush Passport</Link>
        </div>
        <section className="mt-10 rounded-[24px] border border-[#d8e3f1] bg-white p-6 shadow-[0_16px_50px_rgba(18,39,76,.07)] sm:p-9">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf1fb] text-[#3471d2]"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Cush Verify</p>
              <p className="mt-0.5 text-xs text-[#61728a]">Institutional account · Email sign-in only</p>
            </div>
          </div>
          {children}
        </section>
        <p className="mx-auto mt-5 max-w-md text-center text-xs leading-5 text-[#71819b]">
          Institutional accounts are separate from Cush Passport profiles. Applications and invitations do not grant verification access; Cush Admin approval is required.
        </p>
      </div>
    </main>
  );
}

export function CushVerifyLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const token = getQueryToken();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isCushVerifyFirebaseConfigured()) {
      setError("Institutional sign-in is not configured yet. Contact Cush support.");
      return;
    }
    setBusy(true);
    try {
      const auth = getCushVerifyAuth();
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken(true);
      if (token) {
        await postIdentityToken("/api/verify/invitations/accept", idToken, { token });
      } else {
        await postIdentityToken("/api/verify/auth/session", idToken);
      }
      setLocation("/verify/workspace");
    } catch (signInError) {
      setError(errorMessage(signInError));
      await signOut(getCushVerifyAuth()).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    setResetMessage("");
    if (!email.trim() || !isCushVerifyFirebaseConfigured()) {
      setResetMessage("Enter your institutional email address. If a registered account exists, Firebase will send reset instructions.");
      return;
    }
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(getCushVerifyAuth(), email.trim());
    } catch {
      // Keep the same response for registered and unknown addresses.
    } finally {
      setResetBusy(false);
      setResetMessage("If an institutional account exists for this address, password reset instructions have been sent.");
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Institutional sign in</h1>
      <p className="mt-2 text-sm leading-6 text-[#52627b]">Use the email address and password for your Cush Verify institutional account.</p>
      {token && <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Sign in with the invited official email to accept this invitation.</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">Official email
          <input required type="email" autoComplete="username" maxLength={254} className="mt-2 min-h-12 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-4 text-sm outline-none focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/15" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">Password
          <input required type="password" autoComplete="current-password" maxLength={4096} className="mt-2 min-h-12 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-4 text-sm outline-none focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/15" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <div>
          <button type="button" disabled={resetBusy} onClick={() => void requestPasswordReset()} className="text-xs font-semibold text-[#275fb7] hover:underline disabled:opacity-60">
            {resetBusy ? "Sending reset email…" : "Forgot password?"}
          </button>
          {resetMessage && <p role="status" className="mt-2 text-xs leading-5 text-[#61728a]">{resetMessage}</p>}
        </div>
        <button disabled={busy} className="min-h-12 w-full rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#275fb7] disabled:opacity-60">
          {busy ? "Signing in…" : token ? "Sign in and accept invitation" : "Sign in"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-[#61728a]">
        No institutional account? <Link href="/verify" className="font-semibold text-[#275fb7] hover:underline">Submit an institution application</Link>
      </p>
    </AuthLayout>
  );
}

export function CushVerifyInvitationRegistration() {
  const [, setLocation] = useLocation();
  const token = getQueryToken();
  const [invitation, setInvitation] = useState<{ email: string; fullName: string; institutionName: string } | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setError("This invitation link is missing or invalid.");
      return;
    }
    apiRequest("GET", `/api/verify/invitations/lookup?token=${encodeURIComponent(token)}`)
      .then((response) => response.json())
      .then((value: { email: string; fullName: string; institutionName: string }) => {
        if (!cancelled) setInvitation(value);
      })
      .catch((lookupError) => {
        if (!cancelled) setError(errorMessage(lookupError));
      });
    return () => { cancelled = true; };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!invitation || !isCushVerifyFirebaseConfigured()) {
      setError(invitation ? "Institutional sign-in is not configured yet." : "The invitation could not be verified.");
      return;
    }
    setBusy(true);
    try {
      const auth = getCushVerifyAuth();
      const credential = await createUserWithEmailAndPassword(auth, invitation.email, password);
      const continueUrl = new URL("/verify/complete", window.location.origin);
      continueUrl.searchParams.set("token", token);
      await sendEmailVerification(credential.user, { url: continueUrl.toString(), handleCodeInApp: false });
      setSent(true);
    } catch (registrationError) {
      setError(errorMessage(registrationError));
      await signOut(getCushVerifyAuth()).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      {sent ? (
        <div role="status" aria-live="polite" className="py-5">
          <MailCheck className="h-8 w-8 text-[#16816f]" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Verify your official email</h1>
          <p className="mt-3 text-sm leading-6 text-[#52627b]">We sent an activation link to <strong>{invitation?.email}</strong>. Open it to verify the address and finish registering. Your organisation stays under review until Cush Admin approves it.</p>
          <Link href="/verify/login" className="mt-6 inline-flex font-semibold text-[#275fb7]">Go to institutional sign in</Link>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Secure invitation</p>
          <h1 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Create your institutional account</h1>
          {invitation ? (
            <>
              <p className="mt-3 text-sm leading-6 text-[#52627b]">You have been invited to join <strong>{invitation.institutionName}</strong> as its initial Organisation Administrator.</p>
              <p className="mt-3 rounded-xl bg-[#f8fbff] p-3 text-sm text-[#40516d]">Official email: <strong>{invitation.email}</strong></p>
              {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block text-sm font-medium">Create password
                  <input required type="password" minLength={12} maxLength={4096} autoComplete="new-password" className="mt-2 min-h-12 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-4 text-sm outline-none focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/15" value={password} onChange={(event) => setPassword(event.target.value)} />
                </label>
                <p className="text-xs text-[#61728a]">Use at least 12 characters. You can reset it by email later.</p>
                <p className="flex gap-2 text-xs leading-5 text-[#61728a]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16816f]" />Email is verified by Firebase. Your account will remain pending until final Cush Admin approval.</p>
                <button disabled={busy} className="min-h-12 w-full rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#275fb7] disabled:opacity-60">{busy ? "Creating account…" : "Create account and send verification email"}</button>
              </form>
            </>
          ) : (
            <p role={error ? "alert" : "status"} className="mt-4 text-sm text-[#52627b]">{error || "Checking your invitation…"}</p>
          )}
          <p className="mt-5 text-sm text-[#61728a]">Already registered? <button type="button" onClick={() => setLocation(`/verify/login?token=${encodeURIComponent(token)}`)} className="font-semibold text-[#275fb7] hover:underline">Sign in to accept it</button></p>
        </>
      )}
    </AuthLayout>
  );
}

export function CushVerifyCompleteRegistration() {
  const [, setLocation] = useLocation();
  const token = getQueryToken();
  const [message, setMessage] = useState("Checking your verification status…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function complete() {
      if (!isCushVerifyFirebaseConfigured()) {
        setError("Institutional sign-in is not configured yet. Contact Cush support.");
        return;
      }
      const auth = getCushVerifyAuth();
      const user = auth.currentUser;
      if (!user) {
        setMessage("Your email may be verified. Sign in with the invited email to finish registration.");
        return;
      }
      try {
        await reload(user);
        if (!user.emailVerified) {
          setError("The email address is not verified yet. Open the latest activation link and try again.");
          return;
        }
        const idToken = await user.getIdToken(true);
        await postIdentityToken("/api/verify/invitations/accept", idToken, { token });
        if (!cancelled) setLocation("/verify/workspace");
      } catch (completionError) {
        if (!cancelled) setError(errorMessage(completionError));
      }
    }
    void complete();
    return () => { cancelled = true; };
  }, [setLocation, token]);

  return (
    <AuthLayout>
      <h1 className="font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Finish institutional registration</h1>
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          {error}
          <p className="mt-3"><Link href={`/verify/login?token=${encodeURIComponent(token)}`} className="font-semibold underline">Sign in to finish registration</Link></p>
        </div>
      ) : (
        <p role="status" className="mt-4 text-sm leading-6 text-[#52627b]">{message}</p>
      )}
    </AuthLayout>
  );
}
