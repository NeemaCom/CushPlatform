import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_IDLE_TIMEOUT_MS } from "@shared/auth-constants";
import {
  AUTH_ACTIVITY_STORAGE_KEY,
  AUTH_LOGOUT_STORAGE_KEY,
} from "@/lib/logout";
import { useSessionInactivity } from "@/hooks/useSessionInactivity";

describe("session inactivity guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("ends an authenticated session after exactly 20 idle minutes", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionInactivity({
      enabled: true,
      sessionKey: 7,
      onTimeout,
    }));

    act(() => vi.advanceTimersByTime(SESSION_IDLE_TIMEOUT_MS - 1));
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onTimeout).toHaveBeenCalledWith("idle");
    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("resets the idle clock on user activity", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionInactivity({
      enabled: true,
      sessionKey: 7,
      onTimeout,
    }));

    act(() => vi.advanceTimersByTime(SESSION_IDLE_TIMEOUT_MS - 1_000));
    act(() => window.dispatchEvent(new KeyboardEvent("keydown")));
    act(() => vi.advanceTimersByTime(SESSION_IDLE_TIMEOUT_MS - 1));
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onTimeout).toHaveBeenCalledWith("idle");
  });

  it("shares activity between tabs and responds to logout from another tab", () => {
    const onTimeout = vi.fn();
    renderHook(() => useSessionInactivity({
      enabled: true,
      sessionKey: 7,
      onTimeout,
    }));

    act(() => vi.advanceTimersByTime(10 * 60 * 1000));
    const remoteActivity = String(Date.now());
    localStorage.setItem(AUTH_ACTIVITY_STORAGE_KEY, remoteActivity);
    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: AUTH_ACTIVITY_STORAGE_KEY,
      newValue: remoteActivity,
    })));

    act(() => vi.advanceTimersByTime(SESSION_IDLE_TIMEOUT_MS - 1));
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: AUTH_LOGOUT_STORAGE_KEY,
      newValue: String(Date.now()),
    })));
    expect(onTimeout).toHaveBeenCalledWith("remote-logout");
  });
});
