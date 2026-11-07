import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  logAuthEvent: vi.fn(),
  getLoginAttemptState: vi.fn(),
  getLockoutResponse: vi.fn(),
}));

vi.mock("../server/storage", () => ({
  storage: { getUser: mocks.getUser },
}));

vi.mock("../server/security", () => ({
  SecurityLogger: { logAuthEvent: mocks.logAuthEvent },
}));

vi.mock("../server/login-attempts", () => ({
  getLoginAttemptState: mocks.getLoginAttemptState,
  getLockoutResponse: mocks.getLockoutResponse,
}));

import { isAuthenticated } from "../server/auth";

function requestWithSession(session: Record<string, unknown>) {
  return {
    session,
    ip: "127.0.0.1",
    originalUrl: "/api/protected",
    get: () => "vitest",
  } as any;
}

function response() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
}

const storedUser = {
  id: 7,
  firebaseUid: "firebase-user-7",
  username: "test-user",
  email: "user@example.com",
  role: "customer",
  firstName: "Test",
  lastName: "User",
  isEmailVerified: true,
};

describe("server authentication middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue(storedUser);
    mocks.getLoginAttemptState.mockResolvedValue({
      failedAttempts: 0,
      lockedUntil: null,
      permanentlyLocked: false,
    });
    mocks.getLockoutResponse.mockReturnValue(null);
  });

  it("rejects requests without a session user", async () => {
    const req = requestWithSession({});
    const res = response();
    const next = vi.fn();

    await isAuthenticated(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication required" });
    expect(res.clearCookie).toHaveBeenCalledWith(
      "connect.sid",
      expect.objectContaining({ path: "/" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("loads a valid session user and refreshes activity", async () => {
    const req = requestWithSession({
      userId: storedUser.id,
      lastActivity: Date.now(),
    });
    const res = response();
    const next = vi.fn();

    await isAuthenticated(req, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual(expect.objectContaining({
      id: storedUser.id,
      email: storedUser.email,
      role: storedUser.role,
    }));
    expect(req.userId).toBe(storedUser.id);
    expect(req.session.lastActivity).toBeGreaterThan(0);
  });

  it("destroys and rejects sessions for suspended accounts", async () => {
    mocks.getUser.mockResolvedValue({ ...storedUser, isActive: false });
    const destroy = vi.fn((callback: (error?: Error) => void) => callback());
    const req = requestWithSession({
      userId: storedUser.id,
      lastActivity: Date.now(),
      destroy,
    });
    const res = response();
    const next = vi.fn();

    await isAuthenticated(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: "ACCOUNT_SUSPENDED",
      error: expect.stringContaining("support@we-cush.com"),
    }));
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid", expect.any(Object));
    expect(destroy).toHaveBeenCalledOnce();
    expect(mocks.logAuthEvent).toHaveBeenCalledWith(
      "suspended_account_session",
      storedUser.id,
      false,
      "127.0.0.1",
      "vitest",
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("destroys an active session when the account is locked", async () => {
    mocks.getLockoutResponse.mockReturnValue({
      status: 423,
      body: { code: "PERMANENT_ACCOUNT_LOCK", message: "Contact support." },
    });
    const destroy = vi.fn((callback: (error?: Error) => void) => callback());
    const req = requestWithSession({
      userId: storedUser.id,
      lastActivity: Date.now(),
      destroy,
    });
    const res = response();
    const next = vi.fn();

    await isAuthenticated(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(423);
    expect(res.json).toHaveBeenCalledWith({
      code: "PERMANENT_ACCOUNT_LOCK",
      message: "Contact support.",
    });
    expect(destroy).toHaveBeenCalledOnce();
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid", expect.any(Object));
    expect(next).not.toHaveBeenCalled();
  });

  it("destroys and rejects sessions for accounts without verified email", async () => {
    mocks.getUser.mockResolvedValue({ ...storedUser, isEmailVerified: false });
    const destroy = vi.fn((callback: (error?: Error) => void) => callback());
    const req = requestWithSession({
      userId: storedUser.id,
      lastActivity: Date.now(),
      destroy,
    });
    const res = response();
    const next = vi.fn();

    await isAuthenticated(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Email verification required" });
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid", expect.any(Object));
    expect(destroy).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a session whose user no longer exists", async () => {
    mocks.getUser.mockResolvedValue(undefined);
    const req = requestWithSession({
      userId: storedUser.id,
      lastActivity: Date.now(),
      destroy: vi.fn(),
    });
    const res = response();
    const next = vi.fn();

    await isAuthenticated(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid session" });
    expect(res.clearCookie).toHaveBeenCalledWith(
      "connect.sid",
      expect.objectContaining({ path: "/" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("destroys expired sessions, clears their cookie, and rejects the request", async () => {
    const destroy = vi.fn((callback: (error?: Error) => void) => callback());
    const req = requestWithSession({
      userId: storedUser.id,
      lastActivity: Date.now() - 24 * 60 * 60 * 1000 - 1000,
      cookie: { path: "/", httpOnly: true, secure: true, sameSite: "none" },
      destroy,
    });
    const res = response();
    const next = vi.fn();

    await isAuthenticated(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Session expired" });
    expect(res.clearCookie).toHaveBeenCalledWith(
      "connect.sid",
      expect.objectContaining({ path: "/", secure: true, sameSite: "none" }),
    );
    expect(destroy).toHaveBeenCalledOnce();
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed when the database is unavailable", async () => {
    mocks.getUser.mockRejectedValue(new Error("database unavailable"));
    const req = requestWithSession({ userId: storedUser.id, lastActivity: Date.now() });
    const res = response();
    const next = vi.fn();

    await isAuthenticated(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });
});