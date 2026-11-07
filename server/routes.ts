import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import session from "express-session";
import type { Store } from "express-session";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { createPostgresSessionStore } from "./session-store";
import {
  ensureFirebaseConfigured,
  verifyFirebaseIdentity,
  signInWithFirebasePassword,
  sendFirebaseVerificationEmail,
  FirebaseAuthError,
} from "./firebase-auth";
import {
  loginSchema,
  updateProfileSchema,
} from "@shared/schema";
import {
  EncryptionService,
  SecurityLogger,
  authRateLimit,
  passwordSignInRateLimit,
  generalRateLimit,
  sanitizeRequest,
  validatePasswordStrength,
} from "./security";
import {
  isAuthenticated,
  clearAuthSessionCookie,
  createSafeUser,
  type AuthenticatedRequest,
} from "./auth";
import { z } from "zod";
import { registerPassportRoutes } from "./passport-routes";
import { registerPostArrivalRoutes } from "./post-arrival-routes";
import { registerPlaidRoutes } from "./plaid-routes";
import { registerAdminRoutes } from "./admin-routes";
import { registerMonoRoutes } from "./mono-routes";
import { registerInterswitchCreditHistoryRoutes } from "./interswitch-credit-history-routes";
import { registerCushVerifyRoutes } from "./cush-verify-routes";
import { firebaseProfileNamePatch } from "./firebase-profile-name";
import {
  clearLoginAttemptState,
  getFailedLoginResponse,
  getLoginAttemptState,
  getLockoutResponse,
  normalizeLoginEmail,
  recordFailedLogin,
  revokeUserSessions,
} from "./login-attempts";
import { LOGIN_SUPPORT_EMAIL } from "@shared/auth-constants";

const profilePictureSchema = z.object({
  image: z.string()
    .max(80_000, "Profile image must be smaller than 60 KB after optimization.")
    .regex(
      /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i,
      "Upload a valid JPEG, PNG, or WebP image.",
    ),
});

async function createLoginSession(req: Request, user: Pick<User, "id" | "role">): Promise<void> {
  await new Promise<void>((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()));
  req.session.userId = user.id;
  req.session.role = user.role || "user";
  req.session.lastActivity = Date.now();
  await new Promise<void>((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));
}

async function respondToFailedLogin(req: Request, res: Response, identifier: string) {
  const state = await recordFailedLogin(identifier);
  if (state.permanentlyLocked) {
    const user = await storage.getUserByEmailCaseInsensitive(identifier).catch(() => undefined);
    if (user) {
      await revokeUserSessions(user.id).catch((error) => {
        console.error("[Permanent Login Lock Session Revocation Error]:", error);
      });
      if (req.session.userId === user.id) {
        clearAuthSessionCookie(req, res);
        req.session.destroy((error) => {
          if (error) console.error("[Permanent Login Lock Current Session Error]:", error);
        });
      }
    }
  }
  const response = getFailedLoginResponse(state);
  if (!response) {
    return res.status(401).json({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
  }
  return res.status(response.status).json(response.body);
}

export async function registerRoutes(
  app: Express,
  sessionStoreFactory?: () => Promise<Store>,
): Promise<Server> {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32 || sessionSecret === "your-super-secret-session-key-here") {
    throw new Error("SESSION_SECRET must be set to a unique, random value of at least 32 characters");
  }
  ensureFirebaseConfigured();
  const crossSiteCookies = process.env.NODE_ENV === "production" || process.env.SESSION_COOKIE_SAME_SITE === "none";
  const isProduction = process.env.NODE_ENV === "production";
  const sessionStore = sessionStoreFactory
    ? await sessionStoreFactory()
    : isProduction
      ? await createPostgresSessionStore()
      : new session.MemoryStore();
  if (!isProduction && process.env.NODE_ENV === "development") {
    console.warn("[session] Using volatile in-memory sessions for local development only.");
  }

  // ── Health checks ─────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => res.json({ status: "healthy", uptime: process.uptime(), timestamp: new Date().toISOString() }));
  app.get("/health",    (_req, res) => res.json({ status: "OK" }));
  app.get("/ready",     (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));
  app.get("/live",      (_req, res) => res.json({ alive: true, uptime: process.uptime() }));
  app.get("/startup",   (_req, res) => res.json({ started: true, port: process.env.PORT || 5000 }));

  // ── Middleware ────────────────────────────────────────────────────────────
  app.use(generalRateLimit);
  app.use(sanitizeRequest);

  app.use(session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: crossSiteCookies,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: crossSiteCookies ? "none" : "strict",
    },
  }));

  // ── Passport V1 routes ────────────────────────────────────────────────────
  registerAdminRoutes(app);
  registerPassportRoutes(app);
  registerPostArrivalRoutes(app);
  registerPlaidRoutes(app);
  registerMonoRoutes(app);
  registerInterswitchCreditHistoryRoutes(app);
  registerCushVerifyRoutes(app);

  // ── Firebase sync ─────────────────────────────────────────────────────────
  app.post("/api/auth/firebase-sync", authRateLimit, async (req, res) => {
    if (typeof req.body?.idToken !== "string" || !req.body.idToken) {
      return res.status(401).json({ error: "Firebase ID token required" });
    }
    let identity: Awaited<ReturnType<typeof verifyFirebaseIdentity>>;
    try {
      identity = await verifyFirebaseIdentity(req.body.idToken);
    } catch (error) {
      console.error("[Firebase Sync Error]:", error);
      return res.status(401).json({
        message: "Failed to sync firebase user",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const { uid, email, displayName, photoURL, emailVerified } = identity;
      const lockout = getLockoutResponse(await getLoginAttemptState(email));
      if (lockout) return res.status(lockout.status).json(lockout.body);
      const { firstName, lastName } = req.body;
      let user = await storage.getUserByFirebaseUid(uid);
      if (!user) {
        if (req.body.acceptTerms !== true || req.body.acceptPrivacy !== true) {
          return res.status(400).json({
            error: "Please accept the Terms of Service and Privacy Policy to create an account.",
          });
        }
        // Matching email alone does not prove ownership of a legacy account.
        if (await storage.getUserByEmailCaseInsensitive(email)) {
          return res.status(409).json({ error: "An account with this email already exists. Sign in using its original method." });
        }
        const bcrypt = await import("bcrypt");
        const hash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
        const nameParts = displayName?.split(" ") ?? [];
        user = await storage.createUser({
          email, username: email,
          passwordHash: hash,
          firebaseUid: uid,
          firstName: typeof firstName === "string" && firstName.trim() ? firstName.trim().slice(0, 100) : nameParts[0] || "User",
          lastName: typeof lastName === "string" ? lastName.trim().slice(0, 100) : nameParts.slice(1).join(" ").slice(0, 100),
          profilePicture: photoURL || null,
          isEmailVerified: emailVerified,
          acceptTerms: true,
          acceptPrivacy: true,
          marketingConsent: req.body.marketingConsent === true,
          role: "user",
        });
        if (!emailVerified) {
          if (req.session.userId) {
            clearAuthSessionCookie(req, res);
            req.session.destroy((error) => {
              if (error) console.error("[Unverified Signup Session Destruction Error]:", error);
            });
          }
          return res.json({
            success: true,
            requiresEmailVerification: true,
            isNewUser: true,
          });
        }
        await createLoginSession(req, user);
        SecurityLogger.logAuthEvent("firebase_signup_success", user.id, true, req.ip, req.get("User-Agent"));
        return res.json({ success: true, user: createSafeUser(user), isNewUser: true });
      }

      if (user.isActive === false) {
        SecurityLogger.logAuthEvent("suspended_account_signin", user.id, false, req.ip, req.get("User-Agent"));
        return res.status(403).json({
          code: "ACCOUNT_SUSPENDED",
          error: `This account is suspended. Contact ${LOGIN_SUPPORT_EMAIL} for help.`,
        });
      }

      if (!emailVerified) {
        await storage.updateUser(user.id, { isEmailVerified: false });
        if (req.session.userId) {
          clearAuthSessionCookie(req, res);
          req.session.destroy((error) => {
            if (error) console.error("[Unverified Firebase Session Destruction Error]:", error);
          });
        }
        return res.status(403).json({
          error: "Verify your email before signing in.",
          requiresEmailVerification: true,
        });
      }

      try {
        const profileName = firebaseProfileNamePatch(user, displayName);
        user = await storage.updateUser(user.id, {
          ...profileName,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        });
      } catch (error) {
        // Do not create a session if the verified state could not be persisted.
        console.error("[Firebase Sync Profile Update Error]:", error);
        throw error;
      }
      await createLoginSession(req, user);
      SecurityLogger.logAuthEvent("firebase_sync_success", user.id, true, req.ip, req.get("User-Agent"));
      return res.json({ success: true, user: createSafeUser(user) });
    } catch (error) {
      console.error("[Firebase Sync Raw Error]:", error);
      if (error instanceof Error && error.stack) {
        console.error("[Firebase Sync Raw Error Stack]:", error.stack);
      }
      return res.status(500).json({
        message: "Failed to sync firebase user",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ── Firebase email/password sign-in with progressive lockout ──────────────
  app.post("/api/auth/password-signin", passwordSignInRateLimit, async (req, res) => {
    const email = typeof req.body?.email === "string" ? normalizeLoginEmail(req.body.email) : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || email.length > 254 || !password || password.length > 4096) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Enter a valid email address and password.",
      });
    }

    try {
      const currentLock = getLockoutResponse(await getLoginAttemptState(email));
      if (currentLock) return res.status(currentLock.status).json(currentLock.body);

      ensureFirebaseConfigured();
      const idToken = await signInWithFirebasePassword(email, password);
      const identity = await verifyFirebaseIdentity(idToken);
      if (identity.email !== email) {
        return await respondToFailedLogin(req, res, email);
      }
      await clearLoginAttemptState(email);

      const existingUser = await storage.getUserByFirebaseUid(identity.uid);
      if (!existingUser) {
        const matchingEmail = await storage.getUserByEmailCaseInsensitive(identity.email);
        if (matchingEmail) {
          return res.status(409).json({
            code: "ACCOUNT_METHOD_MISMATCH",
            message: "Sign in using the method originally connected to this account.",
          });
        }
        return res.status(401).json({
          code: "ACCOUNT_NOT_READY",
          message: "This Cush account is not ready for sign-in. Contact support if the issue continues.",
        });
      }

      if (existingUser.isActive === false) {
        SecurityLogger.logAuthEvent("suspended_account_signin", existingUser.id, false, req.ip, req.get("User-Agent"));
        return res.status(403).json({
          code: "ACCOUNT_SUSPENDED",
          message: `This account is suspended. Contact ${LOGIN_SUPPORT_EMAIL} for help.`,
        });
      }

      if (!identity.emailVerified) {
        await storage.updateUser(existingUser.id, { isEmailVerified: false });
        let verificationEmailSent = true;
        try {
          await sendFirebaseVerificationEmail(idToken);
        } catch (error) {
          verificationEmailSent = false;
          console.error(
            "[Firebase Verification Email Error]:",
            error instanceof FirebaseAuthError ? error.code : "unknown",
          );
        }
        return res.json({
          success: true,
          requiresEmailVerification: true,
          verificationEmailSent,
          email: identity.email,
        });
      }

      const profileName = firebaseProfileNamePatch(existingUser, identity.displayName);
      const user = await storage.updateUser(existingUser.id, {
        ...profileName,
        isEmailVerified: true,
        lastLoginAt: new Date(),
      });
      await createLoginSession(req, user);
      SecurityLogger.logAuthEvent("firebase_password_login_success", user.id, true, req.ip, req.get("User-Agent"));
      return res.json({ success: true, user: createSafeUser(user) });
    } catch (error) {
      if (error instanceof FirebaseAuthError && error.code === "INVALID_CREDENTIALS") {
        return respondToFailedLogin(req, res, email);
      }
      if (error instanceof FirebaseAuthError && error.code === "PROVIDER_RATE_LIMIT") {
        return res.status(429).json({
          code: "PROVIDER_RATE_LIMIT",
          message: "Firebase temporarily limited sign-in attempts. Please try again later.",
        });
      }
      if (error instanceof FirebaseAuthError && error.code === "USER_DISABLED") {
        return res.status(403).json({
          code: "ACCOUNT_UNAVAILABLE",
          message: `This account is unavailable. Contact ${LOGIN_SUPPORT_EMAIL} for help.`,
        });
      }
      console.error(
        "[Firebase Password Sign-In Error]:",
        error instanceof FirebaseAuthError ? error.code : "unknown",
      );
      return res.status(500).json({
        code: "SIGN_IN_UNAVAILABLE",
        message: "Sign-in could not be completed. Please try again shortly.",
      });
    }
  });

  // ── Sign up ───────────────────────────────────────────────────────────────
  app.post("/api/auth/signup", authRateLimit, (_req, res) =>
    res.status(410).json({ error: "Account registration is handled by Firebase Authentication." })
  );

  // Alias
  app.post("/api/auth/register", authRateLimit, (_req, res) =>
    res.status(410).json({ error: "Account registration is handled by Firebase Authentication." })
  );

  // ── Sign in ───────────────────────────────────────────────────────────────
  const loginHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, username, password } = loginSchema.parse(req.body);
      const id = email || username;
      let user = await storage.getUserByEmail(id!).catch(() => null);
      if (!user) user = await storage.getUserByUsername(id!).catch(() => null);
      const lockKey = normalizeLoginEmail(user?.email || id || "");
      const lockout = getLockoutResponse(await getLoginAttemptState(lockKey));
      if (lockout) return res.status(lockout.status).json(lockout.body);
      if (!user) return await respondToFailedLogin(req, res, lockKey);

      // Older Firebase signups used a publicly known placeholder password.
      // Never accept it as a password for those accounts.
      const bcrypt = await import("bcrypt");
      if (await bcrypt.compare("oauth-user-no-password", user.passwordHash)) {
        return await respondToFailedLogin(req, res, lockKey);
      }
      const ok = await EncryptionService.verifyPassword(password, user.passwordHash);
      if (!ok) return await respondToFailedLogin(req, res, lockKey);
      await clearLoginAttemptState(lockKey);
      if (user.isActive === false) {
        SecurityLogger.logAuthEvent("suspended_account_signin", user.id, false, req.ip, req.get("User-Agent"));
        return res.status(403).json({
          code: "ACCOUNT_SUSPENDED",
          error: `This account is suspended. Contact ${LOGIN_SUPPORT_EMAIL} for help.`,
        });
      }
      if (!user.isEmailVerified) {
        return res.status(403).json({ error: "Verify your email before signing in." });
      }

      await storage.updateUser(user.id, { lastLoginAt: new Date() }).catch(() => {});
      await createLoginSession(req, user);

      SecurityLogger.logAuthEvent("login_success", user.id, true, req.ip, req.get("User-Agent"));
      return res.json(createSafeUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
      res.status(500).json({ error: "Login failed" });
    }
  };

  app.post("/api/auth/signin", passwordSignInRateLimit, loginHandler);
  app.post("/api/auth/login",  passwordSignInRateLimit, loginHandler);

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", async (req: AuthenticatedRequest, res) => {
    const userId = req.session.userId;
    clearAuthSessionCookie(req, res);
    req.session.destroy((error) => {
      if (error) {
        console.error("[Logout Session Destruction Error]:", error);
        return res.status(500).json({ error: "Failed to log out" });
      }
      SecurityLogger.logAuthEvent("logout_success", userId || null, true, req.ip, req.get("User-Agent"));
      return res.json({ message: "Logged out successfully" });
    });
  });

  // ── Check user (Firebase flow) ────────────────────────────────────────────
  app.post("/api/auth/check-user", authRateLimit, async (req, res) => {
    if (typeof req.body?.idToken !== "string" || !req.body.idToken) {
      return res.status(401).json({ error: "Firebase ID token required" });
    }
    let identity: Awaited<ReturnType<typeof verifyFirebaseIdentity>>;
    try {
      identity = await verifyFirebaseIdentity(req.body.idToken);
    } catch {
      return res.status(401).json({ error: "Invalid Firebase ID token" });
    }
    try {
      const user = await storage.getUserByFirebaseUid(identity.uid);
      return res.json({ exists: !!user });
    } catch {
      res.status(500).json({ error: "Failed to check user" });
    }
  });

  // ── Current user ──────────────────────────────────────────────────────────
  app.get("/api/auth/me", isAuthenticated, (req: AuthenticatedRequest, res) => res.json(req.user));

  // ── Update profile ────────────────────────────────────────────────────────
  app.put("/api/auth/profile", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      const userId = req.userId!;
      if (data.email) {
        const existing = await storage.getUserByEmail(data.email).catch(() => null);
        if (existing && existing.id !== userId) return res.status(400).json({ error: "Email already taken" });
      }
      const updated = await storage.updateUser(userId, data);
      SecurityLogger.logAuthEvent("profile_updated", userId, true, req.ip, req.get("User-Agent"));
      return res.json(createSafeUser(updated));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors });
      res.status(500).json({ error: "Profile update failed" });
    }
  });

  // ── Profile picture ───────────────────────────────────────────────────────
  app.post("/api/profile/picture", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { image } = profilePictureSchema.parse(req.body);
      const updated = await storage.updateUser(req.userId!, { profilePicture: image });
      res.json(createSafeUser(updated));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid profile image." });
      }
      res.status(500).json({ error: "Failed to update profile picture" });
    }
  });

  // ── Change password ───────────────────────────────────────────────────────
  app.put("/api/auth/change-password", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords required" });

      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      const ok = await EncryptionService.verifyPassword(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

      const pwCheck = validatePasswordStrength(newPassword);
      if (!pwCheck.isValid) return res.status(400).json({ error: "Password does not meet requirements", details: pwCheck.errors });

      const hash = await EncryptionService.hashPassword(newPassword);
      await storage.updateUser(req.userId!, { passwordHash: hash });
      SecurityLogger.logAuthEvent("password_changed", req.userId!, true, req.ip, req.get("User-Agent"));
      res.json({ message: "Password changed successfully" });
    } catch {
      res.status(500).json({ error: "Password change failed" });
    }
  });

  // Firebase Auth sends the reset link and handles its one-time code.
  // These legacy endpoints are disabled; they previously logged reset links.
  app.post("/api/auth/forgot-password", authRateLimit, (_req, res) =>
    res.status(410).json({ error: "Use the password reset link on the sign-in page." })
  );
  app.post("/api/auth/reset-password", authRateLimit, (_req, res) =>
    res.status(410).json({ error: "Password resets are handled by Firebase Authentication." })
  );

  // ── HTTP Server ───────────────────────────────────────────────────────────
  const httpServer = createServer(app);
  return httpServer;
}
