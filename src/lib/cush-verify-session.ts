export const CUSH_VERIFY_ACTIVITY_STORAGE_KEY = "cush-verify-auth-activity";
export const CUSH_VERIFY_LOGOUT_STORAGE_KEY = "cush-verify-auth-logout";

export function broadcastCushVerifyLogout() {
  try {
    localStorage.setItem(CUSH_VERIFY_LOGOUT_STORAGE_KEY, String(Date.now()));
  } catch {
    // Session revocation on the server remains authoritative.
  }
}
