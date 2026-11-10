import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BarChart3, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/api-base";
import {
  canonicalizeVisitorRoute,
  VISITOR_ANALYTICS_POLICY_VERSION,
  VISITOR_ANALYTICS_RETENTION_DAYS,
  type VisitorEventType,
} from "@shared/visitor-analytics-policy";

const CONSENT_KEY = "cush.analytics.choice";
const VISITOR_ID_KEY = "cush.analytics.visitor-id";
const SESSION_ID_KEY = "cush.analytics.session-id";
const WITHDRAWAL_PENDING_KEY = "cush.analytics.withdrawal-pending";

type ConsentChoice = "accepted" | "declined" | "unset";

function createUuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getStoredChoiceRecord() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { version?: string; choice?: ConsentChoice };
    return value.choice === "accepted" || value.choice === "declined" ? value : null;
  } catch {
    return null;
  }
}

function getStoredChoice(): ConsentChoice {
  const value = getStoredChoiceRecord();
  if (value?.version !== VISITOR_ANALYTICS_POLICY_VERSION) return "unset";
  return value.choice ?? "unset";
}

function hasPendingWithdrawal() {
  try {
    return localStorage.getItem(WITHDRAWAL_PENDING_KEY) === "true";
  } catch {
    return false;
  }
}

function getOrCreateIds() {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = createUuid();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = createUuid();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return { visitorId, sessionId };
}

export async function trackVisitorEvent(eventType: VisitorEventType, path?: string) {
  if (typeof window === "undefined") return;
  try {
    if (getStoredChoice() !== "accepted" || hasPendingWithdrawal()) return;
    const route = canonicalizeVisitorRoute(path ?? window.location.pathname);
    if (!route) return;
    const { visitorId, sessionId } = getOrCreateIds();
    const response = await fetch(`${API_BASE_URL}/api/visitor-intelligence/events`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        sessionId,
        eventType,
        route,
        referrerHost: document.referrer || null,
      }),
      keepalive: eventType === "page_view",
    });
    if (response.status === 403) {
      const result = await response.json().catch(() => null);
      if (result?.code === "CONSENT_REQUIRED") {
        window.dispatchEvent(new Event("cush:analytics-consent-required"));
      }
    }
  } catch {
    // Analytics must never interfere with sign-in or core app behavior.
  }
}

async function saveChoice(visitorId: string | undefined, accepted: boolean) {
  const response = await fetch(`${API_BASE_URL}/api/visitor-intelligence/consent`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(visitorId ? { visitorId } : {}),
      accepted,
      policyVersion: VISITOR_ANALYTICS_POLICY_VERSION,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.error === "string" ? payload.error : "Your choice could not be saved.");
  }
}

export default function VisitorAnalytics() {
  const [location] = useLocation();
  const { user } = useAuth({ enabled: !location.startsWith("/verify") });
  const [choice, setChoice] = useState<ConsentChoice>("unset");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [withdrawalPending, setWithdrawalPending] = useState(false);
  const [error, setError] = useState("");

  const retryWithdrawal = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      await saveChoice(localStorage.getItem(VISITOR_ID_KEY) ?? undefined, false);
      localStorage.removeItem(WITHDRAWAL_PENDING_KEY);
      localStorage.removeItem(VISITOR_ID_KEY);
      sessionStorage.removeItem(SESSION_ID_KEY);
      setWithdrawalPending(false);
      setOpen(false);
    } catch {
      setWithdrawalPending(true);
      setError("Analytics is off in this browser, but server-side deletion could not be confirmed. Retry here or contact support@we-cush.com.");
      setOpen(true);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    setChoice(getStoredChoice());
    if (hasPendingWithdrawal()) {
      setChoice("declined");
      setWithdrawalPending(true);
      setOpen(true);
      void retryWithdrawal();
    }
  }, [retryWithdrawal]);

  useEffect(() => {
    const openPreferences = () => {
      setError("");
      setOpen(true);
    };
    const requireConsentAgain = () => {
      setChoice("unset");
      setError("");
      setOpen(true);
    };
    window.addEventListener("cush:open-privacy-choices", openPreferences);
    window.addEventListener("cush:analytics-consent-required", requireConsentAgain);
    return () => {
      window.removeEventListener("cush:open-privacy-choices", openPreferences);
      window.removeEventListener("cush:analytics-consent-required", requireConsentAgain);
    };
  }, []);

  useEffect(() => {
    if (choice !== "accepted") return;
    void trackVisitorEvent("page_view", location);
    const ping = () => {
      if (document.visibilityState === "visible") void trackVisitorEvent("session_ping", location);
    };
    const timer = window.setInterval(ping, 120_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [choice, location, user?.id]);

  const decline = useCallback(() => {
    setError("");
    const hadAccepted = getStoredChoiceRecord()?.choice === "accepted";
    setChoice("declined");
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: VISITOR_ANALYTICS_POLICY_VERSION, choice: "declined" }));
    } catch {
      setOpen(false);
      return;
    }
    if (!hadAccepted) {
      setOpen(false);
      return;
    }
    localStorage.setItem(WITHDRAWAL_PENDING_KEY, "true");
    setWithdrawalPending(true);
    setOpen(true);
    void retryWithdrawal();
  }, [retryWithdrawal]);

  const accept = useCallback(async () => {
    if (withdrawalPending) return;
    setSaving(true);
    setError("");
    try {
      const { visitorId } = getOrCreateIds();
      await saveChoice(visitorId, true);
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: VISITOR_ANALYTICS_POLICY_VERSION, choice: "accepted" }));
      setChoice("accepted");
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your choice could not be saved.");
    } finally {
      setSaving(false);
    }
  }, [withdrawalPending]);

  const showInitialChoice = choice === "unset";
  if (!showInitialChoice && !open) {
    return (
      <button
        type="button"
        onClick={() => { setError(""); setOpen(true); }}
        className="fixed bottom-3 left-3 z-40 rounded-full border border-slate-300 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-md backdrop-blur hover:text-slate-900"
        aria-label="Open privacy choices"
      >
        Privacy choices
      </button>
    );
  }

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-[#d7d5f1] bg-white p-4 shadow-[0_18px_50px_rgba(28,25,80,0.2)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:p-5"
      aria-label="Optional analytics preferences"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eeedff] text-[#37338d]">
          <BarChart3 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Help improve Cush</h2>
            {!showInitialChoice && (
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Close privacy choices">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            After you opt in, analytics record approved activity and basic device categories. Cush briefly checks your IP locally to estimate your country and stores only that approximate country code. We do not store raw IPs or financial form contents; sessions and events are removed after {VISITOR_ANALYTICS_RETENTION_DAYS} days.
          </p>
          <Link href="/privacy-policy" className="mt-1 inline-flex text-xs font-semibold text-[#37338d] underline underline-offset-2">
            Read the Privacy Policy
          </Link>
          {error && <p className="mt-2 text-xs font-medium text-rose-700" role="alert">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {showInitialChoice ? (
              <>
                <button
                  type="button"
                  onClick={() => void accept()}
                  disabled={saving || withdrawalPending}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#29266f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#37338d] disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Allow optional analytics"}
                </button>
                <button
                  type="button"
                  onClick={decline}
                  disabled={saving || withdrawalPending}
                  className="min-h-9 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  No thanks
                </button>
              </>
            ) : choice === "accepted" ? (
              <button
                type="button"
                onClick={decline}
                disabled={saving}
                className="min-h-9 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Withdraw and delete analytics"}
              </button>
            ) : (
              <>
                {withdrawalPending && (
                  <button type="button" onClick={() => void retryWithdrawal()} disabled={saving} className="min-h-9 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-60">
                    {saving ? "Retrying…" : "Retry data deletion"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void accept()}
                  disabled={saving || withdrawalPending}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#29266f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#37338d] disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Allow optional analytics"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
