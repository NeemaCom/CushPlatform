import { auth, signOut } from "@/firebase";
import { API_BASE_URL } from "@/lib/api-base";

export async function logoutFromCush(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);

  await signOut(auth).catch(() => undefined);
}
