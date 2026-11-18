import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { createUserWithEmailAndPassword, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ArrowLeft, Building2, CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getCushVerifyAuth, isCushVerifyFirebaseConfigured } from "@/lib/cush-verify-firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getQueryToken() {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

function getActivationToken() {
  const fragment = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(fragment).get("token") ?? getQueryToken();
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
          Institutional accounts are separate from Cush Passport profiles. New Cush Verify accounts are activated by confirming the official email address.
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
  const [invitation, setInvitation] = useState<{
    email: string;
    fullName: string;
    jobTitle: string;
    role: string;
    institutionName: string;
    institutionStatus: string;
    applicationStatus: string;
  } | null>(null);
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
      .then((value: {
        email: string;
        fullName: string;
        jobTitle: string;
        role: string;
        institutionName: string;
        institutionStatus: string;
        applicationStatus: string;
      }) => {
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

  const approvedTeamInvitation = invitation?.institutionStatus === "approved"
    && invitation.applicationStatus === "approved";
  const invitationRole = invitation?.role === "organisation_admin"
    ? "Organisation Administrator"
    : invitation?.role === "analyst"
      ? "Analyst"
      : "Viewer";

  return (
    <AuthLayout>
      {sent ? (
        <div role="status" aria-live="polite" className="py-5">
          <MailCheck className="h-8 w-8 text-[#16816f]" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Verify your official email</h1>
          <p className="mt-3 text-sm leading-6 text-[#52627b]">
            We sent an activation link to <strong>{invitation?.email}</strong>. Open it to verify the address and finish registering.
            {approvedTeamInvitation
              ? " Your team membership will become active as soon as the email is verified."
              : " Your organisation stays under review until Cush Admin approves its application."}
          </p>
          <Link href="/verify/login" className="mt-6 inline-flex font-semibold text-[#275fb7]">Go to institutional sign in</Link>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Secure invitation</p>
          <h1 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Create your institutional account</h1>
          {invitation ? (
            <>
              <p className="mt-3 text-sm leading-6 text-[#52627b]">
                {approvedTeamInvitation
                  ? <>You have been invited to join <strong>{invitation.institutionName}</strong> as a <strong>{invitationRole}</strong>.</>
                  : <>You have been invited to join <strong>{invitation.institutionName}</strong> as its initial Organisation Administrator.</>}
              </p>
              <p className="mt-3 rounded-xl bg-[#f8fbff] p-3 text-sm text-[#40516d]">Official email: <strong>{invitation.email}</strong></p>
              {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block text-sm font-medium">Create password
                  <input required type="password" minLength={12} maxLength={4096} autoComplete="new-password" className="mt-2 min-h-12 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-4 text-sm outline-none focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/15" value={password} onChange={(event) => setPassword(event.target.value)} />
                </label>
                <p className="text-xs text-[#61728a]">Use at least 12 characters. You can reset it by email later.</p>
                <p className="flex gap-2 text-xs leading-5 text-[#61728a]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16816f]" />
                  {approvedTeamInvitation
                    ? "Firebase verifies ownership of this email. No further Cush Admin approval is required for a team membership at this approved institution."
                    : "Firebase verifies ownership of this email. Workspace access remains unavailable until Cush Admin approves the organisation."}
                </p>
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

export function CushVerifyActivation() {
  const [, setLocation] = useLocation();
  const token = getActivationToken();
  const [activation, setActivation] = useState<{
    email: string;
    contactName: string;
    institutionName: string;
    alreadyActivated?: boolean;
    activationInProgress?: boolean;
  } | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [activationError, setActivationError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const activationRequestRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setLookupError("This activation link is missing or invalid.");
      return;
    }
    apiRequest("POST", "/api/verify/activations/lookup", { token })
      .then((response) => response.json())
      .then(async (value: {
        email: string;
        contactName: string;
        institutionName: string;
        alreadyActivated?: boolean;
        activationInProgress?: boolean;
      }) => {
        if (cancelled) return;
        setActivation(value);
        setResendEmail(value.email);
        if (value.alreadyActivated) {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
          setActivated(true);
          return;
        }
        if (value.activationInProgress) {
          setActivationError("Activation is already being completed. Refresh this page in a moment to continue.");
          return;
        }
        await completeActivation();
      })
      .catch((lookupFailure) => {
        if (!cancelled) setLookupError(errorMessage(lookupFailure));
      });
    return () => { cancelled = true; };
  }, [token]);

  async function completeActivation() {
    setActivationError("");
    setBusy(true);
    try {
      if (!activationRequestRef.current) {
        activationRequestRef.current = apiRequest("POST", "/api/verify/activations/complete", { token })
          .then(() => undefined);
      }
      await activationRequestRef.current;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setActivated(true);
    } catch (activationFailure) {
      activationRequestRef.current = null;
      setActivationError(errorMessage(activationFailure));
    } finally {
      setBusy(false);
    }
  }

  async function requestFreshLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendMessage("");
    setResendBusy(true);
    try {
      const response = await apiRequest("POST", "/api/verify/applications/resend-activation", {
        businessEmail: resendEmail.trim(),
      });
      const result = await response.json() as { message?: string };
      setResendMessage(result.message ?? "If an application is waiting for activation, a fresh link has been sent.");
    } catch (resendFailure) {
      setResendMessage(errorMessage(resendFailure));
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <AuthLayout>
      {activated ? (
        <>
          <div className="py-2">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e3f4ef] text-[#16816f]">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Your account is active.</h1>
            <p className="mt-3 text-sm leading-6 text-[#52627b]">Your official email is confirmed, your institutional account is active, and five promotional report credits have been added. Sign in to open the Cush Verify workspace.</p>
            <Link href="/verify/login" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#275fb7]">
              Sign in to Cush Verify
            </Link>
          </div>
          <Dialog open={activated} onOpenChange={setActivated}>
            <DialogContent className="border-[#d8e3f1] bg-white text-[#14213a] sm:max-w-md">
              <DialogHeader>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e3f4ef] text-[#16816f] sm:mx-0">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <DialogTitle className="pt-2 font-serif text-2xl tracking-[-0.03em] text-[#12213d]">Welcome to Cush Verify</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-[#52627b]">
                  Your official email is verified, your institutional account is active, and five promotional report credits have been added. Sign in with your business email and password to open the full workspace.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <button type="button" onClick={() => setLocation("/verify/login")} className="min-h-11 w-full rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#275fb7]">
                  Continue to sign in
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3973c8]">Email activation</p>
          <h1 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#12213d]">Activate your institutional account</h1>
          {activation ? (
            <>
              <p className="mt-3 text-sm leading-6 text-[#52627b]">
                We’re activating the official email for <strong>{activation.institutionName}</strong>. Your account will be ready as soon as this finishes.
              </p>
              <p className="mt-4 rounded-xl bg-[#f8fbff] p-3 text-sm text-[#40516d]">
                Official email: <strong>{activation.email}</strong>
              </p>
              {activationError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{activationError}</p>}
              {busy && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-[#52627b]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#3977e6] border-t-transparent" />Confirming your email and activating your account…</p>}
              {activationError && !activation.activationInProgress && (
                <>
                  <button type="button" disabled={busy} onClick={() => void completeActivation()} className="mt-5 min-h-12 w-full rounded-full bg-[#3475e7] px-5 text-sm font-semibold text-white hover:bg-[#275fb7] disabled:opacity-60">
                    {busy ? "Activating account…" : "Try activation again"}
                  </button>
                  <form onSubmit={(event) => void requestFreshLink(event)} className="mt-3">
                    <p className="text-xs leading-5 text-[#61728a]">
                      If retrying does not work, request a fresh one-time link at {resendEmail}.
                    </p>
                    <button type="submit" disabled={resendBusy} className="mt-2 min-h-11 w-full rounded-full border border-[#cad7e8] px-5 text-sm font-semibold text-[#275fb7] hover:bg-[#f8fbff] disabled:opacity-60">
                      {resendBusy ? "Requesting a fresh link…" : "Request a fresh activation link"}
                    </button>
                    {resendMessage && <p role="status" className="mt-2 text-xs leading-5 text-[#61728a]">{resendMessage}</p>}
                  </form>
                </>
              )}
              {activation.activationInProgress && (
                <form onSubmit={(event) => void requestFreshLink(event)} className="mt-4">
                  <button type="submit" disabled={resendBusy} className="min-h-11 w-full rounded-full border border-[#cad7e8] px-5 text-sm font-semibold text-[#275fb7] hover:bg-[#f8fbff] disabled:opacity-60">
                    {resendBusy ? "Requesting a fresh link…" : "Request a fresh activation link"}
                  </button>
                  {resendMessage && <p role="status" className="mt-2 text-xs leading-5 text-[#61728a]">{resendMessage}</p>}
                </form>
              )}
              <p className="mt-4 text-xs leading-5 text-[#61728a]">
                This one-time link is valid for 24 hours. When activation finishes, a welcome message will prompt you to sign in.
              </p>
            </>
          ) : (
            <>
              <p role={lookupError ? "alert" : "status"} className="mt-4 text-sm leading-6 text-[#52627b]">
                {lookupError || "Checking your secure activation link…"}
              </p>
              {lookupError && (
                <form onSubmit={(event) => void requestFreshLink(event)} className="mt-5 space-y-3">
                  <label className="block text-sm font-medium">Institutional email
                    <input required type="email" maxLength={254} autoComplete="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#cad7e8] bg-[#f8fbff] px-4 text-sm outline-none focus:border-[#3977e6] focus:ring-4 focus:ring-[#3977e6]/15" />
                  </label>
                  <button disabled={resendBusy} className="min-h-11 w-full rounded-full border border-[#cad7e8] px-5 text-sm font-semibold text-[#275fb7] hover:bg-[#f8fbff] disabled:opacity-60">
                    {resendBusy ? "Requesting a fresh link…" : "Resend activation link"}
                  </button>
                  {resendMessage && <p role="status" className="text-xs leading-5 text-[#61728a]">{resendMessage}</p>}
                </form>
              )}
            </>
          )}
          <p className="mt-5 text-sm text-[#61728a]">
            Already activated? <Link href="/verify/login" className="font-semibold text-[#275fb7] hover:underline">Sign in</Link>
          </p>
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
