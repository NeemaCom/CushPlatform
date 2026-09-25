import express from "express";
import bcrypt from "bcrypt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  getByUid: vi.fn(),
  getByEmail: vi.fn(),
  getByEmailForLogin: vi.fn(),
  getByUsername: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("../server/firebase-auth", () => ({
  ensureFirebaseConfigured: vi.fn(),
  verifyFirebaseIdentity: mocks.verify,
}));
vi.mock("../server/storage", () => ({
  storage: {
    getUserByFirebaseUid: mocks.getByUid,
    getUserByEmailCaseInsensitive: mocks.getByEmail,
    getUserByEmail: mocks.getByEmailForLogin,
    getUserByUsername: mocks.getByUsername,
    createUser: mocks.createUser,
    updateUser: mocks.updateUser,
  },
}));
vi.mock("../server/passport-routes", () => ({ registerPassportRoutes: vi.fn() }));
vi.mock("../server/security", () => ({
  generalRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  sanitizeRequest: (_req: unknown, _res: unknown, next: () => void) => next(),
  SecurityLogger: { logAuthEvent: vi.fn() },
  EncryptionService: { verifyPassword: vi.fn().mockResolvedValue(true) },
}));

import { registerRoutes } from "../server/routes";

const user = {
  id: 12, email: "owner@example.com", username: "owner@example.com",
  firebaseUid: "trusted-uid", role: "customer", firstName: "Owner", lastName: "Test",
  passwordHash: "hash", acceptTerms: false, acceptPrivacy: false,
};
const identity = {
  uid: "trusted-uid", email: "owner@example.com", emailVerified: true,
  displayName: "Owner Test", photoURL: null,
};

describe("Firebase session sync", () => {
  let server: ReturnType<typeof express.application.listen>;
  let baseUrl: string;
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "test-only-unique-secret-with-32-plus-characters";
    mocks.verify.mockResolvedValue(identity);
    mocks.getByUid.mockResolvedValue(user);
    mocks.getByEmail.mockResolvedValue(undefined);
    mocks.getByEmailForLogin.mockResolvedValue(undefined);
    mocks.getByUsername.mockResolvedValue(undefined);
    mocks.updateUser.mockResolvedValue(user);
    mocks.createUser.mockResolvedValue(user);
    const app = express();
    app.use(express.json());
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
  });

  function sync(body: Record<string, unknown>, cookie?: string) {
    return fetch(`${baseUrl}/api/auth/firebase-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
  }

  it("requires a valid token and never trusts forged identity fields", async () => {
    expect((await sync({ uid: "trusted-uid", email: identity.email })).status).toBe(401);
    mocks.verify.mockRejectedValueOnce(new Error("expired or invalid"));
    expect((await sync({ idToken: "expired" })).status).toBe(401);
    expect(mocks.getByUid).not.toHaveBeenCalled();

    const res = await sync({ idToken: "valid", uid: "attacker", email: "attacker@example.com" });
    expect(res.status).toBe(200);
    expect(mocks.getByUid).toHaveBeenCalledWith("trusted-uid");
    expect(mocks.getByEmail).not.toHaveBeenCalled();
    expect((await res.json()).user.email).toBe("owner@example.com");
  });

  it("refuses to link an existing account by matching email alone", async () => {
    mocks.getByUid.mockResolvedValue(undefined);
    mocks.getByEmail.mockResolvedValue(user);
    const res = await sync({ idToken: "valid" });
    expect(res.status).toBe(409);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("creates a UID-bound account and rotates session IDs on sign-in", async () => {
    mocks.getByUid.mockResolvedValueOnce(undefined);
    const first = await sync({ idToken: "valid" });
    expect(first.status).toBe(200);
    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "trusted-uid", email: "owner@example.com", isEmailVerified: true,
    }));
    const firstCookie = first.headers.get("set-cookie")?.split(";")[0];
    expect(firstCookie).toContain("connect.sid=");

    const second = await sync({ idToken: "valid" }, firstCookie);
    expect(second.status).toBe(200);
    expect(second.headers.get("set-cookie")?.split(";")[0]).not.toBe(firstCookie);
  });

  it("does not create a fallback account or session when storage fails", async () => {
    mocks.getByUid.mockRejectedValue(new Error("database unavailable"));
    const res = await sync({ idToken: "valid" });
    expect(res.status).toBe(500);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses to start without a real session secret", async () => {
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    await expect(registerRoutes(express())).rejects.toThrow("SESSION_SECRET");
    process.env.SESSION_SECRET = saved;
  });

  it("rejects the known placeholder password on older Firebase accounts", async () => {
    mocks.getByEmailForLogin.mockResolvedValue({
      ...user,
      firebaseUid: null,
      passwordHash: await bcrypt.hash("oauth-user-no-password", 4),
    });
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "oauth-user-no-password" }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("recovers a Firebase signup when the initial database sync did not complete", async () => {
    mocks.getByUid.mockResolvedValue(undefined);
    const res = await sync({ idToken: "valid" });
    expect(res.status).toBe(200);
    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "trusted-uid",
      email: "owner@example.com",
    }));
    expect(res.headers.get("set-cookie")).toContain("connect.sid=");
  });
});