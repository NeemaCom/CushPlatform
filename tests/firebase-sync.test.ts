import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  passwordSignIn: vi.fn(),
  sendVerificationEmail: vi.fn(),
  getUser: vi.fn(),
  getByUid: vi.fn(),
  getByEmail: vi.fn(),
  getByEmailForLogin: vi.fn(),
  getByUsername: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getLoginAttemptState: vi.fn(),
  getLockoutResponse: vi.fn(),
  recordFailedLogin: vi.fn(),
  getFailedLoginResponse: vi.fn(),
  clearLoginAttemptState: vi.fn(),
  revokeUserSessions: vi.fn(),
  FirebaseAuthError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("../server/firebase-auth", () => ({
  ensureFirebaseConfigured: vi.fn(),
  verifyFirebaseIdentity: mocks.verify,
  signInWithFirebasePassword: mocks.passwordSignIn,
  sendFirebaseVerificationEmail: mocks.sendVerificationEmail,
  FirebaseAuthError: mocks.FirebaseAuthError,
}));
vi.mock("../server/storage", () => ({
  storage: {
    getUser: mocks.getUser,
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
  passwordSignInRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  sanitizeRequest: (_req: unknown, _res: unknown, next: () => void) => next(),
  SecurityLogger: { logAuthEvent: vi.fn() },
  EncryptionService: { verifyPassword: vi.fn().mockResolvedValue(true) },
}));
vi.mock("../server/login-attempts", () => ({
  getLoginAttemptState: mocks.getLoginAttemptState,
  getLockoutResponse: mocks.getLockoutResponse,
  recordFailedLogin: mocks.recordFailedLogin,
  getFailedLoginResponse: mocks.getFailedLoginResponse,
  clearLoginAttemptState: mocks.clearLoginAttemptState,
  revokeUserSessions: mocks.revokeUserSessions,
  normalizeLoginEmail: (email: string) => email.trim().toLowerCase(),
}));

import { registerRoutes } from "../server/routes";

const user = {
  id: 12, email: "owner@example.com", username: "owner@example.com",
  firebaseUid: "trusted-uid", role: "customer", firstName: "Owner", lastName: "Test",
  passwordHash: "hash", acceptTerms: false, acceptPrivacy: false, isEmailVerified: true,
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
    mocks.passwordSignIn.mockResolvedValue("firebase-id-token");
    mocks.sendVerificationEmail.mockResolvedValue(undefined);
    mocks.getUser.mockResolvedValue(user);
    mocks.getByUid.mockResolvedValue(user);
    mocks.getByEmail.mockResolvedValue(undefined);
    mocks.getByEmailForLogin.mockResolvedValue(undefined);
    mocks.getByUsername.mockResolvedValue(undefined);
    mocks.updateUser.mockResolvedValue(user);
    mocks.createUser.mockResolvedValue(user);
    mocks.getLoginAttemptState.mockResolvedValue({
      failedAttempts: 0,
      lockedUntil: null,
      permanentlyLocked: false,
    });
    mocks.getLockoutResponse.mockReturnValue(null);
    mocks.recordFailedLogin.mockResolvedValue({
      failedAttempts: 1,
      lockedUntil: null,
      permanentlyLocked: false,
    });
    mocks.getFailedLoginResponse.mockReturnValue({
      status: 401,
      body: { code: "INVALID_CREDENTIALS", attemptsRemaining: 2, message: "Incorrect password." },
    });
    mocks.clearLoginAttemptState.mockResolvedValue(undefined);
    mocks.revokeUserSessions.mockResolvedValue(undefined);
    const app = express();
    app.use(express.json());
    server = await registerRoutes(app, async () => new session.MemoryStore());
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

  function passwordSignIn(email: string, password: string) {
    return fetch(`${baseUrl}/api/auth/password-signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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

  it("blocks Firebase sync while the account is temporarily or permanently locked", async () => {
    mocks.getLockoutResponse.mockReturnValueOnce({
      status: 423,
      body: { code: "TEMPORARY_ACCOUNT_LOCK", message: "Try again in five minutes." },
    });

    const res = await sync({ idToken: "valid" });

    expect(res.status).toBe(423);
    expect(await res.json()).toEqual({
      code: "TEMPORARY_ACCOUNT_LOCK",
      message: "Try again in five minutes.",
    });
    expect(mocks.getByUid).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("tracks failed password attempts and returns the remaining-attempt warning", async () => {
    mocks.passwordSignIn.mockRejectedValue(
      new mocks.FirebaseAuthError("INVALID_CREDENTIALS", "Invalid email or password."),
    );
    mocks.recordFailedLogin
      .mockResolvedValueOnce({ failedAttempts: 1, lockedUntil: null, permanentlyLocked: false })
      .mockResolvedValueOnce({ failedAttempts: 2, lockedUntil: null, permanentlyLocked: false });
    mocks.getFailedLoginResponse
      .mockReturnValueOnce({
        status: 401,
        body: { code: "INVALID_CREDENTIALS", attemptsRemaining: 2, message: "2 more attempts before lockout." },
      })
      .mockReturnValueOnce({
        status: 401,
        body: { code: "INVALID_CREDENTIALS", attemptsRemaining: 1, message: "1 more attempt before lockout." },
      });

    const first = await passwordSignIn("Owner@Example.com", "wrong-one");
    const second = await passwordSignIn("owner@example.com", "wrong-two");

    expect(first.status).toBe(401);
    expect(await first.json()).toMatchObject({ attemptsRemaining: 2 });
    expect(second.status).toBe(401);
    expect(await second.json()).toMatchObject({ attemptsRemaining: 1 });
    expect(mocks.recordFailedLogin).toHaveBeenNthCalledWith(1, "owner@example.com");
    expect(mocks.recordFailedLogin).toHaveBeenNthCalledWith(2, "owner@example.com");
  });

  it("permanently locks after the fifth failed password and revokes that user's sessions", async () => {
    mocks.getByEmail.mockResolvedValueOnce(user);
    mocks.passwordSignIn.mockRejectedValue(
      new mocks.FirebaseAuthError("INVALID_CREDENTIALS", "Invalid email or password."),
    );
    mocks.recordFailedLogin.mockResolvedValue({
      failedAttempts: 5,
      lockedUntil: null,
      permanentlyLocked: true,
    });
    mocks.getFailedLoginResponse.mockReturnValue({
      status: 423,
      body: {
        code: "PERMANENT_ACCOUNT_LOCK",
        message: "Contact support@we-cush.com to restore access.",
      },
    });

    const res = await passwordSignIn("owner@example.com", "wrong-password");

    expect(res.status).toBe(423);
    expect((await res.json()).message).toContain("support@we-cush.com");
    expect(mocks.revokeUserSessions).toHaveBeenCalledWith(user.id);
  });

  it("creates a session after verified Firebase password sign-in", async () => {
    const res = await passwordSignIn("owner@example.com", "correct-password");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, user: { id: user.id } });
    expect(res.headers.get("set-cookie")).toContain("connect.sid=");
    expect(mocks.passwordSignIn).toHaveBeenCalledWith("owner@example.com", "correct-password");
    expect(mocks.clearLoginAttemptState).toHaveBeenCalledWith("owner@example.com");
  });

  it("sends activation email without creating a session for an unverified password account", async () => {
    mocks.verify.mockResolvedValueOnce({ ...identity, emailVerified: false });

    const res = await passwordSignIn("owner@example.com", "correct-password");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      requiresEmailVerification: true,
      verificationEmailSent: true,
      email: identity.email,
    });
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith("firebase-id-token");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses to link an existing account by matching email alone", async () => {
    mocks.getByUid.mockResolvedValue(undefined);
    mocks.getByEmail.mockResolvedValue(user);
    const res = await sync({ idToken: "valid", acceptTerms: true, acceptPrivacy: true });
    expect(res.status).toBe(409);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["both agreements missing", {}],
    ["Terms missing", { acceptPrivacy: true }],
    ["Privacy Policy missing", { acceptTerms: true }],
  ])("requires both agreements for a new Firebase account (%s)", async (_name, consent) => {
    mocks.getByUid.mockResolvedValue(undefined);
    const res = await sync({ idToken: "valid", ...consent });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Please accept the Terms of Service and Privacy Policy to create an account.",
    });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("creates a UID-bound account and rotates session IDs on sign-in", async () => {
    mocks.getByUid.mockResolvedValueOnce(undefined);
    const first = await sync({
      idToken: "valid",
      acceptTerms: true,
      acceptPrivacy: true,
      marketingConsent: true,
    });
    expect(first.status).toBe(200);
    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "trusted-uid", email: "owner@example.com", isEmailVerified: true,
      acceptTerms: true, acceptPrivacy: true, marketingConsent: true,
    }));
    const firstCookie = first.headers.get("set-cookie")?.split(";")[0];
    expect(firstCookie).toContain("connect.sid=");

    const authenticatedRequest = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: firstCookie! },
    });
    expect(authenticatedRequest.status).toBe(200);
    expect(await authenticatedRequest.json()).toMatchObject({
      id: user.id,
      email: user.email,
    });

    const second = await sync({ idToken: "valid" }, firstCookie);
    expect(second.status).toBe(200);
    expect(second.headers.get("set-cookie")?.split(";")[0]).not.toBe(firstCookie);
  });

  it("records consent for a new account but does not create a session before email verification", async () => {
    mocks.verify.mockResolvedValueOnce({ ...identity, emailVerified: false });
    mocks.getByUid.mockResolvedValueOnce(undefined);

    const res = await sync({
      idToken: "valid",
      acceptTerms: true,
      acceptPrivacy: true,
      marketingConsent: false,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      requiresEmailVerification: true,
      isNewUser: true,
    });
    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "trusted-uid",
      isEmailVerified: false,
      acceptTerms: true,
      acceptPrivacy: true,
    }));
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses to create a session for an existing unverified Firebase account", async () => {
    mocks.verify.mockResolvedValueOnce({ ...identity, emailVerified: false });

    const res = await sync({ idToken: "valid" });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Verify your email before signing in.",
      requiresEmailVerification: true,
    });
    expect(mocks.updateUser).toHaveBeenCalledWith(user.id, { isEmailVerified: false });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("disables legacy registration and reset routes that bypass Firebase activation", async () => {
    const signup = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const forgotPassword = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });
    const resetPassword = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "legacy-token", password: "ValidPass123!" }),
    });

    expect(signup.status).toBe(410);
    expect(forgotPassword.status).toBe(410);
    expect(resetPassword.status).toBe(410);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.getByEmailForLogin).not.toHaveBeenCalled();
  });

  it("expires an existing Firebase session if the stored email is unverified", async () => {
    const signIn = await sync({ idToken: "valid" });
    const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
    mocks.getUser.mockResolvedValueOnce({ ...user, isEmailVerified: false });

    const currentUser = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie! },
    });

    expect(currentUser.status).toBe(401);
    expect(await currentUser.json()).toEqual({ error: "Email verification required" });
  });

  it("logs out successfully, expires the cookie, and rejects the old session", async () => {
    mocks.getByUid.mockResolvedValueOnce(undefined);
    const signIn = await sync({
      idToken: "valid",
      acceptTerms: true,
      acceptPrivacy: true,
    });
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toContain("connect.sid=");

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie! },
    });
    expect(logout.status).toBe(200);
    expect(await logout.json()).toEqual({ message: "Logged out successfully" });
    expect(logout.headers.get("set-cookie")).toMatch(/connect\.sid=;.*Expires=Thu, 01 Jan 1970/i);

    const currentUser = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie! },
    });
    expect(currentUser.status).toBe(401);
    expect(await currentUser.json()).toEqual({ error: "Authentication required" });
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

  it("does not allow legacy password login until email is verified", async () => {
    mocks.getByEmailForLogin.mockResolvedValue({ ...user, isEmailVerified: false });
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "correct-password" }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Verify your email before signing in." });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("recovers a Firebase signup when the initial database sync did not complete", async () => {
    mocks.getByUid.mockResolvedValue(undefined);
    const res = await sync({ idToken: "valid", acceptTerms: true, acceptPrivacy: true });
    expect(res.status).toBe(200);
    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: "trusted-uid",
      email: "owner@example.com",
      marketingConsent: false,
    }));
    expect(res.headers.get("set-cookie")).toContain("connect.sid=");
  });
});