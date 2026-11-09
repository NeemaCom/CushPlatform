import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { auth, signOut } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useSessionInactivity, type SessionEndReason } from "@/hooks/useSessionInactivity";
import { useToast } from "@/hooks/use-toast";
import { broadcastAuthLogout, logoutFromCush } from "@/lib/logout";

const SERVER_SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function SessionInactivityGuard() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logoutStarted = useRef(false);
  const lastServerRefresh = useRef(Date.now());

  const handleTimeout = useCallback((reason: SessionEndReason) => {
    if (logoutStarted.current) return;
    logoutStarted.current = true;
    queryClient.setQueryData(["/api/auth/me"], null);
    setLocation("/login");

    if (reason === "idle") {
      toast({
        title: "You’ve been signed out",
        description: "For your security, Cush signs you out after 20 minutes without activity.",
      });
      void logoutFromCush();
      return;
    }

    void signOut(auth).catch(() => undefined);
  }, [queryClient, setLocation, toast]);

  const refreshServerSession = useCallback(() => {
    if (isLoading || !user) return;
    const now = Date.now();
    if (now - lastServerRefresh.current < SERVER_SESSION_REFRESH_INTERVAL_MS) return;
    lastServerRefresh.current = now;
    void queryClient.refetchQueries({
      queryKey: ["/api/auth/me"],
      type: "active",
    });
  }, [isLoading, queryClient, user]);

  useSessionInactivity({
    enabled: !isLoading && Boolean(user),
    sessionKey: user?.id,
    onTimeout: handleTimeout,
    onActivity: refreshServerSession,
  });

  return null;
}
