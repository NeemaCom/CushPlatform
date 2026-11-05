import { pgPool } from "./db";
import { LOGIN_SUPPORT_EMAIL } from "@shared/auth-constants";

export const LOGIN_FAILURES_BEFORE_TEMPORARY_LOCK = 3;
export const LOGIN_FAILURES_BEFORE_SUPPORT_LOCK = 5;
export const LOGIN_TEMPORARY_LOCK_MS = 5 * 60 * 1000;
export interface LoginAttemptState {
  failedAttempts: number;
  lockedUntil: Date | null;
  permanentlyLocked: boolean;
}

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getLoginAttemptState(email: string): Promise<LoginAttemptState> {
  const normalizedEmail = normalizeLoginEmail(email);
  const result = await pgPool.query(
    `SELECT failed_attempts AS "failedAttempts",
            locked_until AS "lockedUntil",
            permanently_locked AS "permanentlyLocked"
     FROM public.cush_login_attempts
     WHERE email = $1`,
    [normalizedEmail],
  );
  return (result.rows[0] as LoginAttemptState | undefined) ?? {
    failedAttempts: 0,
    lockedUntil: null,
    permanentlyLocked: false,
  };
}

export async function recordFailedLogin(email: string, now = new Date()): Promise<LoginAttemptState> {
  const normalizedEmail = normalizeLoginEmail(email);
  const result = await pgPool.query(
    `INSERT INTO public.cush_login_attempts
       (email, failed_attempts, locked_until, permanently_locked, updated_at)
     VALUES ($1, 1, NULL, FALSE, $2)
     ON CONFLICT (email) DO UPDATE SET
       failed_attempts = LEAST(public.cush_login_attempts.failed_attempts + 1, 5),
       permanently_locked = public.cush_login_attempts.permanently_locked
         OR public.cush_login_attempts.failed_attempts + 1 >= 5,
       locked_until = CASE
         WHEN public.cush_login_attempts.permanently_locked
           OR public.cush_login_attempts.failed_attempts + 1 >= 5 THEN NULL
         WHEN public.cush_login_attempts.failed_attempts + 1 >= 3
           THEN $2::timestamptz + interval '5 minutes'
         ELSE NULL
       END,
       updated_at = $2
     RETURNING failed_attempts AS "failedAttempts",
               locked_until AS "lockedUntil",
               permanently_locked AS "permanentlyLocked"`,
    [normalizedEmail, now],
  );
  return result.rows[0] as LoginAttemptState;
}

export async function clearLoginAttemptState(email: string): Promise<void> {
  await pgPool.query(
    "DELETE FROM public.cush_login_attempts WHERE email = $1",
    [normalizeLoginEmail(email)],
  );
}

export async function revokeUserSessions(userId: number): Promise<void> {
  await pgPool.query(
    "DELETE FROM public.cush_sessions WHERE sess->>'userId' = $1",
    [String(userId)],
  );
}

export function getLockoutResponse(state: LoginAttemptState, now = Date.now()) {
  if (state.permanentlyLocked || state.failedAttempts >= LOGIN_FAILURES_BEFORE_SUPPORT_LOCK) {
    return {
      status: 423,
      body: {
        code: "PERMANENT_ACCOUNT_LOCK",
        message: `This account is locked after five unsuccessful sign-in attempts. Contact ${LOGIN_SUPPORT_EMAIL} to restore access.`,
      },
    };
  }

  const lockedUntil = state.lockedUntil ? new Date(state.lockedUntil).getTime() : 0;
  if (lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((lockedUntil - now) / 1000);
    const failuresBeforeSupportLock = Math.max(0, LOGIN_FAILURES_BEFORE_SUPPORT_LOCK - state.failedAttempts);
    const nextLockMessage = failuresBeforeSupportLock === 1
      ? " One more incorrect password after the lock ends will permanently lock the account; contact support to restore access."
      : ` ${failuresBeforeSupportLock} incorrect attempts remain before permanent lockout.`;
    return {
      status: 423,
      body: {
        code: "TEMPORARY_ACCOUNT_LOCK",
        retryAfterSeconds,
        message: `Sign-in is temporarily locked. Try again in about ${Math.ceil(retryAfterSeconds / 60)} minute(s).${nextLockMessage}`,
      },
    };
  }

  return null;
}

export function getFailedLoginResponse(state: LoginAttemptState) {
  const attemptsRemaining = Math.max(0, LOGIN_FAILURES_BEFORE_TEMPORARY_LOCK - state.failedAttempts);
  if (state.failedAttempts >= LOGIN_FAILURES_BEFORE_SUPPORT_LOCK || state.permanentlyLocked) {
    return getLockoutResponse(state);
  }
  if (state.lockedUntil) {
    return getLockoutResponse(state);
  }
  if (state.failedAttempts >= LOGIN_FAILURES_BEFORE_TEMPORARY_LOCK) {
    return getLockoutResponse(state);
  }
  const lockWarningCount = Math.max(0, LOGIN_FAILURES_BEFORE_TEMPORARY_LOCK - state.failedAttempts);
  return {
    status: 401,
    body: {
      code: "INVALID_CREDENTIALS",
      attemptsRemaining,
      message: `Invalid email or password. ${lockWarningCount} ${lockWarningCount === 1 ? "more attempt" : "more attempts"} before a five-minute lockout.`,
    },
  };
}
