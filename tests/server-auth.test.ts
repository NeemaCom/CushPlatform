import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  logAuthEvent: vi.fn(),
}));

vi.mock("../server/storage", () => ({
  storage: { getUser: mocks.getUser },
}));

vi.mock("../server/security", () => ({
  SecurityLogger: { logAuthEvent: mocks.logAuthEvent },
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
};

describe("server authentication middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue(storedUser);
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