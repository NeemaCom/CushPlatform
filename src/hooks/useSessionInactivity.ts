import { useEffect, useRef } from "react";
import { SESSION_IDLE_TIMEOUT_MS } from "@shared/auth-constants";
import {
  AUTH_ACTIVITY_STORAGE_KEY,
  AUTH_LOGOUT_STORAGE_KEY,
} from "@/lib/logout";

export type SessionEndReason = "idle" | "remote-logout";

interface UseSessionInactivityOptions {
  enabled: boolean;
  sessionKey?: string | number;
  activityStorageKey?: string;
  logoutStorageKey?: string;
  onTimeout: (reason: SessionEndReason) => void;
  onActivity?: () => void;
}

function readActivity(key: string): number {
  try {
    const timestamp = Number(localStorage.getItem(key));
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
  } catch {
    return 0;
  }
}

function writeActivity(key: string, timestamp: number): void {
  try {
    localStorage.setItem(key, String(timestamp));
  } catch {
    // Use the in-memory timer if browser storage is unavailable.
  }
}

export function useSessionInactivity({
  enabled,
  sessionKey,
  activityStorageKey = AUTH_ACTIVITY_STORAGE_KEY,
  logoutStorageKey = AUTH_LOGOUT_STORAGE_KEY,
  onTimeout,
  onActivity,
}: UseSessionInactivityOptions): void {
  const onTimeoutRef = useRef(onTimeout);
  const onActivityRef = useRef(onActivity);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
    onActivityRef.current = onActivity;
  }, [onTimeout, onActivity]);

  useEffect(() => {
    if (!enabled) return;

    let lastActivityAt = Date.now();
    let lastSharedWriteAt = lastActivityAt;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let lastPointerMoveAt = 0;

    writeActivity(activityStorageKey, lastActivityAt);

    const stopTimer = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    const expire = (reason: SessionEndReason) => {
      if (stopped) return;
      stopTimer();
      onTimeoutRef.current(reason);
    };

    const latestActivity = () => Math.max(lastActivityAt, readActivity(activityStorageKey));

    const checkIdle = () => {
      if (stopped) return;
      const remaining = SESSION_IDLE_TIMEOUT_MS - (Date.now() - latestActivity());
      if (remaining <= 0) {
        expire("idle");
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(checkIdle, remaining);
    };

    const recordActivity = () => {
      if (stopped) return;
      const now = Date.now();
      const latest = latestActivity();
      if (now - latest >= SESSION_IDLE_TIMEOUT_MS) {
        expire("idle");
        return;
      }

      lastActivityAt = now;
      if (now - lastSharedWriteAt >= 1_000) {
        writeActivity(activityStorageKey, now);
        lastSharedWriteAt = now;
      }
      onActivityRef.current?.();
      checkIdle();
    };

    const handlePointerMove = () => {
      const now = Date.now();
      if (now - lastPointerMoveAt < 1_000) return;
      lastPointerMoveAt = now;
      recordActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === logoutStorageKey && event.newValue) {
        expire("remote-logout");
        return;
      }

      if (event.key !== activityStorageKey || !event.newValue) return;
      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp) || timestamp <= lastActivityAt) return;

      if (Date.now() - timestamp >= SESSION_IDLE_TIMEOUT_MS) {
        checkIdle();
        return;
      }
      lastActivityAt = timestamp;
      checkIdle();
    };

    const handleWake = () => checkIdle();
    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    );
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("focus", handleWake);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleWake);
    checkIdle();

    return () => {
      stopTimer();
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity),
      );
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("focus", handleWake);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleWake);
    };
  }, [activityStorageKey, enabled, logoutStorageKey, sessionKey]);
}
