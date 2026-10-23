export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

const SESSION_AUTH_ERRORS = new Set([
  "Authentication required",
  "Session expired",
  "Invalid session",
]);

export function isSessionAuthFailure(error: unknown): boolean {
  if (!(error instanceof Error) || !error.message.startsWith("401:")) return false;

  try {
    const body = JSON.parse(error.message.slice("401:".length).trim());
    return SESSION_AUTH_ERRORS.has(body?.error);
  } catch {
    return false;
  }
}