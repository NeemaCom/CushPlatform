import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import * as memStore from "./mem-store";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  passwordRecoverySchema,
  resetPasswordSchema,
} from "@shared/schema";
import {
  EncryptionService,
  SecurityLogger,
  authRateLimit,
  generalRateLimit,
  sanitizeRequest,
  validatePasswordStrength,
  isValidEmail,
} from "./security";
import {
  isAuthenticated,
  createSafeUser,
  type AuthenticatedRequest,
} from "./auth";
import { z } from "zod";
import { registerPassportRoutes } from "./passport-routes";

export async function registerRoutes(app: Express): Promise<Server> {

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
    secret: process.env.SESSION_SECRET || "cush-passport-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: "strict",
    },
  }));

  // ── Passport V1 routes ────────────────────────────────────────────────────
  registerPassportRoutes(app);

  // ── Firebase sync ─────────────────────────────────────────────────────────
  app.post("/api/auth/firebase-sync", async (req, res) => {
    try {
      const { uid, email, displayName, photoURL, emailVerified, firstName, lastName, country, phone, acceptTerms, acceptPrivacy, isNewUser } = req.body;

      if (!uid || !email) return res.status(400).json({ error: "UID and email are required" });

      let user: any = null;
      let usingMem = false;

      try {
        user = await storage.getUserByFirebaseUid(uid);
        if (!user) user = await storage.getUserByEmail(email);
      } catch {
        usingMem = true;
      }

      if (usingMem) {
        const memUser = memStore.createOrUpdateUserFromFirebase({
          firebaseUid: uid, email,
          firstName: firstName || displayName?.split(" ")[0] || "User",
          lastName: lastName || displayName?.split(" ").slice(1).join(" ") || "",
          displayName,
        });
        req.session.userId = memUser.id;
        req.session.role = memUser.role;
        req.session.lastActivity = Date.now();
        return res.json({ success: true, user: memUser });
      }

      if (!user) {
        if (!isNewUser) return res.status(404).json({ error: "No account found", requiresSignup: true });
        const bcrypt = await import("bcrypt");
        const hash = await bcrypt.hash("oauth-user-no-password", 10);
        user = await storage.createUser({
          email, username: email,
          passwordHash: hash,
          firstName: firstName || displayName?.split(" ")[0] || "User",
          lastName: lastName || displayName?.split(" ").slice(1).join(" ") || "",
          phoneNumber: phone || null,
          nationality: country || null,
          profilePicture: photoURL || null,
          isEmailVerified: emailVerified || false,
          acceptTerms: acceptTerms || false,
          acceptPrivacy: acceptPrivacy || false,
          role: "customer",
        });
        if (uid) user = await storage.updateUser(user.id, { firebaseUid: uid });
        SecurityLogger.logAuthEvent("firebase_signup_success", user.id, true, req.ip, req.get("User-Agent"));
        return res.json({ success: true, user: createSafeUser(user), isNewUser: true, redirectTo: "signin" });
      }

      if (!user.firebaseUid && uid) {
        user = await storage.updateUser(user.id, {
          firebaseUid: uid, email,
          firstName: firstName || displayName?.split(" ")[0] || user.firstName,
          lastName: lastName || displayName?.split(" ").slice(1).join(" ") || user.lastName,
          profilePicture: photoURL || user.profilePicture,
          isEmailVerified: emailVerified || user.isEmailVerified,
        });
      }

      req.session.userId = user.id;
      req.session.role = user.role || "customer";
      req.session.lastActivity = Date.now();
      try { await storage.updateUser(user.id, { lastLoginAt: new Date() }); } catch {}
      SecurityLogger.logAuthEvent("firebase_sync_success", user.id, true, req.ip, req.get("User-Agent"));
      return res.json({ success: true, user: createSafeUser(user) });
    } catch (error) {
      console.error("Firebase sync error:", error);
      res.status(500).json({ error: "Failed to sync Firebase user" });
    }
  });

  // ── Sign up ───────────────────────────────────────────────────────────────
  app.post("/api/auth/signup", authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const pwCheck = validatePasswordStrength(data.password);
      if (!pwCheck.isValid) return res.status(400).json({ error: "Password does not meet requirements", details: pwCheck.errors });

      const [byUsername, byEmail] = await Promise.all([
        storage.getUserByUsername(data.username),
        storage.getUserByEmail(data.email),
      ]);
      if (byUsername) return res.status(400).json({ error: "Username already exists" });
      if (byEmail)    return res.status(400).json({ error: "Email already exists" });

      const passwordHash = await EncryptionService.hashPassword(data.password);
      const user = await storage.createUser({
        username: data.username, email: data.email, passwordHash,
        firstName: data.firstName, lastName: data.lastName,
        phoneNumber: data.phoneNumber || null, nationality: data.nationality || null,
        acceptTerms: data.acceptTerms, acceptPrivacy: data.acceptPrivacy,
        marketingConsent: data.marketingConsent || false,
      });

      req.session.userId = user.id;
      req.session.role = user.role || "customer";
      req.session.lastActivity = Date.now();

      SecurityLogger.logAuthEvent("user_registration", user.id, true, req.ip, req.get("User-Agent"));
      return res.status(201).json(createSafeUser(user));
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: error.errors.map(e => e.message) });
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Alias
  app.post("/api/auth/register", authRateLimit, (_req, res) =>
    res.status(400).json({ error: "Deprecated. Use /api/auth/signup or Firebase authentication." })
  );

  // ── Sign in ───────────────────────────────────────────────────────────────
  const loginHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, username, password } = loginSchema.parse(req.body);
      const id = email || username;
      let user = await storage.getUserByEmail(id!).catch(() => null);
      if (!user) user = await storage.getUserByUsername(id!).catch(() => null);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const ok = await EncryptionService.verifyPassword(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      await storage.updateUser(user.id, { lastLoginAt: new Date() }).catch(() => {});
      req.session.userId = user.id;
      req.session.role = user.role || "customer";
      req.session.lastActivity = Date.now();

      SecurityLogger.logAuthEvent("login_success", user.id, true, req.ip, req.get("User-Agent"));
      return res.json(createSafeUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
      res.status(500).json({ error: "Login failed" });
    }
  };

  app.post("/api/auth/signin", authRateLimit, loginHandler);
  app.post("/api/auth/login",  authRateLimit, loginHandler);

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", async (req: AuthenticatedRequest, res) => {
    const userId = req.session.userId;
    res.clearCookie("connect.sid", { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
    req.session.destroy(() => {
      SecurityLogger.logAuthEvent("logout_success", userId || null, true, req.ip, req.get("User-Agent"));
      res.json({ message: "Logged out successfully" });
    });
  });

  // ── Check user (Firebase flow) ────────────────────────────────────────────
  app.post("/api/auth/check-user", authRateLimit, async (req, res) => {
    try {
      const { firebaseUid, email } = req.body;
      if (!firebaseUid && !email) return res.status(400).json({ error: "firebaseUid or email required" });
      let user = firebaseUid ? await storage.getUserByFirebaseUid(firebaseUid).catch(() => null) : null;
      if (!user && email) user = await storage.getUserByEmail(email).catch(() => null);
      return res.json(user ? { exists: true, user: createSafeUser(user) } : { exists: false });
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
      const { image } = req.body;
      if (!image) return res.status(400).json({ error: "Image data required" });
      await storage.updateUser(req.userId!, { profilePicture: image });
      res.json({ message: "Profile picture updated" });
    } catch {
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

  // ── Forgot / reset password ───────────────────────────────────────────────
  app.post("/api/auth/forgot-password", authRateLimit, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !isValidEmail(email)) return res.status(400).json({ error: "Valid email required" });
      const user = await storage.getUserByEmail(email).catch(() => null);
      if (user) {
        const token = EncryptionService.generateSecureToken();
        await storage.savePasswordResetToken(user.id, token, new Date(Date.now() + 3600000));
        console.log(`[PASSWORD RESET] Link for ${email}: ${req.protocol}://${req.get("host")}/reset-password?token=${token}`);
      }
      res.json({ message: "If an account exists for that email, a reset link has been sent." });
    } catch {
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", authRateLimit, async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      const user = await storage.getUserByResetToken(token).catch(() => null);
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      const pwCheck = validatePasswordStrength(password);
      if (!pwCheck.isValid) return res.status(400).json({ error: "Password does not meet requirements", details: pwCheck.errors });

      const hash = await EncryptionService.hashPassword(password);
      await storage.updateUser(user.id, { passwordHash: hash, passwordResetToken: null, passwordResetExpires: null });
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // ── HTTP Server ───────────────────────────────────────────────────────────
  const httpServer = createServer(app);
  return httpServer;
}
