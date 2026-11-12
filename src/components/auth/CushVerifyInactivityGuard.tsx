import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { signOut } from "firebase/auth";
import { useSessionInactivity, type SessionEndReason } from "@/hooks/useSessionInactivity";
import { getCushVerifyAuth, isCushVerifyFirebaseConfigured } from "@/lib/cush-verify-firebase";
import { API_BASE_URL } from "@/lib/api-base";
import { CUSH_VERIFY_ACTIVITY_STORAGE_KEY, CUSH_VERIFY_LOGOUT_STORAGE_KEY } from "@/lib/cush-verify-session";
import { useToast } from "@/hooks/use-toast";

type CushVerifyIdentity = {
  user: { id: number };
};

const SERVER_SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function CushVerifyInactivityGuard() {
  const [location, setLocation] = useLocation();
  const activeRoute = location === "/verify/workspace";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logoutStarted = useRef(false);
  const lastServerRefresh = useRef(Date.now());
  const identityQuery = useQuery<CushVerifyIdentity>({
    queryKey: ["/api/verify/auth/me"],
    enabled: activeRoute,
    retry: false,
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/verify/auth/me`, { credentials: "include" });
      if (!response.ok) throw new Error(`${response.status}: Institutional session expired`);
      return response.json() as Promise<CushVerifyIdentity>;
    },
  });
  const userId = identityQuery.data?.user.id;

  useEffect(() => {
    logoutStarted.current = false;
  }, [userId]);

  const endInstitutionalSession = useCallback((reason: SessionEndReason) => {
    if (logoutStarted.current) return;
    logoutStarted.current = true;
    queryClient.removeQueries({ queryKey: ["/api/verify/auth/me"], exact: true });
    try {
      localStorage.setItem(CUSH_VERIFY_LOGOUT_STORAGE_KEY, String(Date.now()));
    } catch {
      // Server session revocation remains authoritative.
    }
    void fetch(`${API_BASE_URL}/api/verify/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    if (isCushVerifyFirebaseConfigured()) {
      void signOut(getCushVerifyAuth()).catch(() => undefined);
    }
    setLocation("/verify/login");
    if (reason === "idle") {
      toast({
        title: "You’ve been signed out",
        description: "For your security, Cush Verify signs you out after 20 minutes without activity.",
      });
    }
  }, [queryClient, setLocation, toast]);

  const refreshServerSession = useCallback(() => {
    const now = Date.now();
    if (now - lastServerRefresh.current < SERVER_SESSION_REFRESH_INTERVAL_MS) return;
    lastServerRefresh.current = now;
    void queryClient.refetchQueries({ queryKey: ["/api/verify/auth/me"], type: "active" });
  }, [queryClient]);

  useSessionInactivity({
    enabled: activeRoute && Boolean(userId) && !identityQuery.isError,
    sessionKey: userId ? `cush-verify-${userId}` : undefined,
    activityStorageKey: CUSH_VERIFY_ACTIVITY_STORAGE_KEY,
    logoutStorageKey: CUSH_VERIFY_LOGOUT_STORAGE_KEY,
    onTimeout: endInstitutionalSession,
    onActivity: refreshServerSession,
  });

  useEffect(() => {
    if (activeRoute && identityQuery.error && String(identityQuery.error).includes("401")) {
      setLocation("/verify/login");
    }
  }, [activeRoute, identityQuery.error, setLocation]);

  return null;
}
