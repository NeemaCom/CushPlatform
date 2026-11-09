import { auth, signOut } from "@/firebase";
import { API_BASE_URL } from "@/lib/api-base";

export const AUTH_ACTIVITY_STORAGE_KEY = "cush.auth.last-activity";
export const AUTH_LOGOUT_STORAGE_KEY = "cush.auth.logout";

export function broadcastAuthLogout(): void {
  try {
    localStorage.removeItem(AUTH_ACTIVITY_STORAGE_KEY);
    localStorage.setItem(AUTH_LOGOUT_STORAGE_KEY, `${Date.now()}-${Math.random()}`);
  } catch {
    // Storage can be unavailable in private browsing; Firebase still syncs sign-out.
  }
}

export async function logoutFromCush(): Promise<void> {
  broadcastAuthLogout();
  const serverLogout = fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);

  await signOut(auth).catch(() => undefined);
  await serverLogout;
}
