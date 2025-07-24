import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import session from "express-session";
import passport from "passport";
import { storage } from "./storage";

import { aiAnalyticsService } from "./ai-analytics-service";
import { analyzeFinancialMood, type FinancialMoodData } from './mood-analyzer';
import { analyzeFinancialHealth, type FinancialHealthData } from './financial-health-analyzer';
import { loanService } from "./loan-service";
import { seedLoanProviders } from "./seed-loan-data";
import { 
  loanPrequalificationSchema, 
  loanApplicationSchema,
  type InsertLoanPrequalification,
  type InsertLoanApplication 
} from "../shared/schema";
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema,
  passwordRecoverySchema,
  resetPasswordSchema,
  createInsightSchema,
  createMentorSchema,
  createEventSchema,
  bookMentorSessionSchema,
  registerEventSchema,
  type RegisterForm,
  type LoginForm,
  type UpdateProfileForm,
  type CreateInsight,
  type CreateMentor,
  type CreateEvent,
  type BookMentorSession,
  type RegisterEvent,
  searchJobsSchema,
  insertJobListingSchema,
  type SearchJobsQuery,
  type InsertJobListing,
  createSupportTicketSchema,
  updateSupportTicketSchema,
  createSupportTicketMessageSchema,
  createUserFeedbackSchema,
  createFaqArticleSchema,
  updateFaqArticleSchema,
  type CreateSupportTicket,
  type UpdateSupportTicket,
  type CreateSupportTicketMessage,
  type CreateUserFeedback,
  type CreateFaqArticle,
  type UpdateFaqArticle
} from "@shared/schema";
import { 
  EncryptionService, 
  SecurityLogger, 
  authRateLimit, 
  generalRateLimit,
  sanitizeRequest,
  validatePasswordStrength,
  isValidEmail 
} from "./security";
import { 
  isAuthenticated, 
  requireAdmin, 
  requireCustomer,
  createSafeUser,
  type AuthenticatedRequest 
} from "./auth";
import { z } from "zod";
import { geminiService, type UserContext } from "./gemini-service";
import rateLimit from "express-rate-limit";
import { notificationService } from "./notification-service";
import { AvatarService } from "./avatarService";
import { adminService } from "./admin-service";
import { supportService } from "./support-service";
import { walletService } from "./wallet-service";
import { remittanceService } from "./remittance-service";
import { cymonzService } from "./cymonz-service";
import { railsrService } from "./railsr-service";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize avatar service
  const avatarService = new AvatarService(storage);
  // Enhanced health check endpoint for deployment platforms
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy',
      service: 'Cush Platform API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  });

  // Additional health check for load balancers (Cloud Run, etc.)
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
  });

  // Readiness probe endpoint
  app.get('/ready', (req, res) => {
    res.status(200).json({ 
      ready: true,
      timestamp: new Date().toISOString() 
    });
  });

  // Liveness probe endpoint for Cloud Run
  app.get('/live', (req, res) => {
    res.status(200).json({ 
      alive: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString() 
    });
  });

  // Startup probe endpoint
  app.get('/startup', (req, res) => {
    res.status(200).json({ 
      started: true,
      port: process.env.PORT || 5000,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString() 
    });
  });

  // Apply global rate limiting
  app.use(generalRateLimit);
  
  // Apply input sanitization
  app.use(sanitizeRequest);

  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "cush-platform-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        sameSite: 'strict',
      },
    })
  );



  // Firebase sync endpoint
  app.post("/api/auth/firebase-sync", async (req, res) => {
    try {
      console.log('Firebase sync request received:', req.body);
      const { uid, email, displayName, photoURL, emailVerified, firstName, lastName, address, country, phone, acceptTerms, acceptPrivacy, isNewUser } = req.body;
      
      if (!uid || !email) {
        console.error('Missing required fields:', { uid: !!uid, email: !!email });
        return res.status(400).json({ error: "UID and email are required" });
      }
      
      // Check if user exists by Firebase UID or email
      let user = await storage.getUserByFirebaseUid(uid);
      if (!user) {
        user = await storage.getUserByEmail(email);
      }
      
      if (!user) {
        // Check if this is a new user registration (includes both Google and email sign-ups)
        if (isNewUser) {
          // Create new user with Firebase data
          const bcrypt = await import('bcrypt');
          const placeholderPasswordHash = await bcrypt.hash('oauth-user-no-password', 10);
          
          // Debug logging
          console.log('Creating new user with Firebase sync data:', {
            firstName: firstName,
            lastName: lastName,
            displayName: displayName,
            email: email,
            isNewUser: isNewUser
          });

          user = await storage.createUser({
            email,
            username: email,
            passwordHash: placeholderPasswordHash,
            firstName: firstName || (displayName?.split(' ')[0]) || 'User',
            lastName: lastName || (displayName?.split(' ').slice(1).join(' ')) || '',
            phoneNumber: phone || null,
            nationality: country || null,
            profilePicture: photoURL || null,
            isEmailVerified: emailVerified || false,
            acceptTerms: acceptTerms || false,
            acceptPrivacy: acceptPrivacy || false,
            role: 'customer'
          });
          
          // Update user with Firebase UID after creation
          if (uid) {
            user = await storage.updateUser(user.id, { firebaseUid: uid });
          }

          // Skip avatar generation for now to avoid dependencies issues
          console.log('User created successfully without avatar generation');
        } else {
          // User doesn't exist, return error for sign-in attempt
          return res.status(404).json({ 
            error: "No account found", 
            message: "No account found with this email address. Would you like to create a new account?",
            requiresSignup: true
          });
        }
      } else {
        // Update existing user with Firebase UID if not set
        if (!user.firebaseUid && uid) {
          user = await storage.updateUser(user.id, {
            firebaseUid: uid,
            email,
            firstName: firstName || displayName?.split(' ')[0] || user.firstName,
            lastName: lastName || displayName?.split(' ').slice(1).join(' ') || user.lastName,
            profilePicture: photoURL || user.profilePicture,
            isEmailVerified: emailVerified || user.isEmailVerified
          });
        }
      }
      
      // For new user registrations, don't set session (they need to sign in after account creation)
      if (isNewUser) {
        // Don't set session for new users - they should sign in after account creation
        const safeUser = createSafeUser(user);
        SecurityLogger.logAuthEvent('firebase_signup_success', user.id, true, req.ip, req.get('User-Agent'));
        res.json({ success: true, user: safeUser, isNewUser: true, redirectTo: 'signin' });
      } else {
        // Set session for existing users signing in
        console.log('Setting session for user:', { userId: user.id, email: user.email });
        req.session.userId = user.id;
        req.session.role = user.role || 'customer';
        req.session.lastActivity = Date.now();
        
        // Update last login time
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
        
        const safeUser = createSafeUser(user);
        console.log('Firebase sync successful for existing user:', safeUser.email);
        SecurityLogger.logAuthEvent('firebase_sync_success', user.id, true, req.ip, req.get('User-Agent'));
        
        // Create welcome back notification for returning users
        const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
        const daysSinceLastLogin = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        if (daysSinceLastLogin > 0) {
          createActivityNotification(user.id, 'login', { lastLoginDays: daysSinceLastLogin });
        }
        
        res.json({ success: true, user: safeUser });
      }
    } catch (error) {
      console.error('Firebase sync error:', error);
      SecurityLogger.logAuthEvent('firebase_sync_error', null, false, req.ip, req.get('User-Agent'), { error: error.message });
      res.status(500).json({ error: "Failed to sync Firebase user" });
    }
  });

  // Legacy register endpoint redirect (for backwards compatibility)
  app.post("/api/auth/register", authRateLimit, async (req: AuthenticatedRequest, res) => {
    console.log('Legacy register endpoint called, redirecting to signup');
    // Redirect to the correct signup endpoint
    return res.status(400).json({ 
      error: "This endpoint is deprecated. Please use Firebase authentication through the signup form.",
      redirectTo: "/api/auth/signup",
      instructions: "Use the signup form on the website which uses Firebase authentication.",
      currentMethod: "Go to the website and use the Sign Up button to create an account with Firebase authentication."
    });
  });

  // Handle GET requests to signup endpoint (some users might try to access it directly)
  app.get("/api/auth/signup", (req: AuthenticatedRequest, res) => {
    return res.status(405).json({ 
      error: "Method not allowed. This endpoint only accepts POST requests.",
      instructions: "Use the signup form on the website to create an account."
    });
  });

  // Enhanced registration endpoint
  app.post("/api/auth/signup", authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check password strength
      const passwordCheck = validatePasswordStrength(userData.password);
      if (!passwordCheck.isValid) {
        await SecurityLogger.logAuthEvent(
          'weak_password_attempt',
          null,
          false,
          req.ip,
          req.get('User-Agent'),
          { errors: passwordCheck.errors }
        );
        return res.status(400).json({ 
          error: "Password does not meet security requirements",
          details: passwordCheck.errors 
        });
      }

      // Check if user exists by username or email
      const [existingUsername, existingEmail] = await Promise.all([
        storage.getUserByUsername(userData.username),
        storage.getUserByEmail(userData.email)
      ]);

      if (existingUsername) {
        await SecurityLogger.logAuthEvent(
          'duplicate_username_attempt',
          null,
          false,
          req.ip,
          req.get('User-Agent'),
          { username: userData.username }
        );
        return res.status(400).json({ error: "Username already exists" });
      }

      if (existingEmail) {
        await SecurityLogger.logAuthEvent(
          'duplicate_email_attempt',
          null,
          false,
          req.ip,
          req.get('User-Agent'),
          { email: userData.email }
        );
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await EncryptionService.hashPassword(userData.password);
      
      // Create user
      let user = await storage.createUser({
        username: userData.username,
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber || null,
        nationality: userData.nationality || null,
        acceptTerms: userData.acceptTerms,
        acceptPrivacy: userData.acceptPrivacy,
        marketingConsent: userData.marketingConsent || false,
      });

      // Generate default avatar based on user's name
      try {
        await avatarService.ensureUserHasAvatar(user.id);
        // Get updated user with avatar to include the generated avatar
        const refreshedUser = await storage.getUser(user.id);
        if (refreshedUser && refreshedUser.profilePicture) {
          user.profilePicture = refreshedUser.profilePicture;
        }
      } catch (avatarError) {
        console.error('Avatar generation failed:', avatarError);
        // Don't fail registration if avatar generation fails
      }

      // Create default accounts
      await Promise.all([
        storage.createAccount({
          userId: user.id,
          name: "Current Account",
          type: "current",
          balance: "0.00",
        }),
        storage.createAccount({
          userId: user.id,
          name: "Savings Account", 
          type: "savings",
          balance: "0.00",
        })
      ]);

      // Log successful registration
      await SecurityLogger.logAuthEvent(
        'user_registration',
        user.id,
        true,
        req.ip,
        req.get('User-Agent'),
        { username: user.username, email: user.email }
      );

      // Set session
      req.session.userId = user.id;
      req.session.role = user.role || 'customer';
      req.session.lastActivity = Date.now();

      const safeUser = createSafeUser(user);
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Registration error:", error);
      await SecurityLogger.logAuthEvent(
        'registration_error',
        null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid input data",
          details: error.errors.map(e => e.message)
        });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Enhanced login endpoint (both signin and login for compatibility)
  const loginHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, username, password } = loginSchema.parse(req.body);
      
      // Support login with either username or email
      const loginIdentifier = email || username;
      let user = await storage.getUserByEmail(loginIdentifier!);
      if (!user) {
        // Try to find user by username if email lookup failed
        user = await storage.getUserByUsername(loginIdentifier!);
      }
      
      if (!user) {
        await SecurityLogger.logAuthEvent(
          'login_attempt',
          null,
          false,
          req.ip || '',
          req.get('User-Agent') || '',
          { username, reason: 'user_not_found' }
        );
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await EncryptionService.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        await SecurityLogger.logAuthEvent(
          'login_attempt',
          user.id,
          false,
          req.ip || '',
          req.get('User-Agent') || '',
          { username, reason: 'invalid_password' }
        );
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update last login time
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Set session
      req.session.userId = user.id;
      req.session.role = user.role || 'customer';
      req.session.lastActivity = Date.now();

      // Log successful login
      await SecurityLogger.logAuthEvent(
        'login_success',
        user.id,
        true,
        req.ip || '',
        req.get('User-Agent') || '',
        { username }
      );

      const safeUser = createSafeUser(user);
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      await SecurityLogger.logAuthEvent(
        'login_error',
        null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data" });
      }
      res.status(500).json({ error: "Login failed" });
    }
  };

  // Register both signin and login endpoints for compatibility
  app.post("/api/auth/signin", authRateLimit, loginHandler);
  app.post("/api/auth/login", authRateLimit, loginHandler);

  // Enhanced logout endpoint
  app.post("/api/auth/logout", async (req: AuthenticatedRequest, res) => {
    const userId = req.session.userId;
    
    try {
      // Clear session data manually first
      req.session.userId = undefined;
      req.session.role = undefined;
      req.session.lastActivity = undefined;
      
      // Clear session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          SecurityLogger.logAuthEvent(
            'logout_error',
            userId || null,
            false,
            req.ip,
            req.get('User-Agent'),
            { error: err.message }
          );
          // Still return success to avoid blocking logout
          return res.json({ message: "Logged out successfully" });
        }
        
        SecurityLogger.logAuthEvent(
          'logout_success',
          userId || null,
          true,
          req.ip,
          req.get('User-Agent')
        );
        
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error('Logout error:', error);
      SecurityLogger.logAuthEvent(
        'logout_error',
        userId || null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      // Always return success to avoid blocking logout
      res.json({ message: "Logged out successfully" });
    }
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Please provide a valid email address" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether user exists or not for security
        return res.json({ message: "If an account with this email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to database
      await storage.savePasswordResetToken(user.id, resetToken, resetTokenExpiry);

      // Send email with reset link
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      
      // Log the reset request
      await SecurityLogger.logAuthEvent(
        'password_reset_requested',
        user.id,
        true,
        req.ip || '',
        req.get('User-Agent') || '',
        { email }
      );

      // TODO: Send actual email using SendGrid or similar service
      // For now, just log it to console (you can implement actual email sending later)
      console.log(`Password reset link for ${email}: ${resetLink}`);

      res.json({ message: "If an account with this email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      await SecurityLogger.logAuthEvent(
        'password_reset_error',
        null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      // Validate password strength
      const passwordCheck = validatePasswordStrength(newPassword);
      if (!passwordCheck.isValid) {
        return res.status(400).json({ 
          error: "Password does not meet requirements",
          details: passwordCheck.errors 
        });
      }

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash the new password
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await storage.updateUser(user.id, { passwordHash: hashedPassword });
      await storage.clearPasswordResetToken(user.id);

      // Log successful password reset
      await SecurityLogger.logAuthEvent(
        'password_reset_success',
        user.id,
        true,
        req.ip || '',
        req.get('User-Agent') || '',
        { email: user.email }
      );

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      await SecurityLogger.logAuthEvent(
        'password_reset_error',
        null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Check if user exists (for Firebase sync flow)
  app.post("/api/auth/check-user", authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const { firebaseUid, email } = req.body;
      
      if (!firebaseUid && !email) {
        return res.status(400).json({ error: "Firebase UID or email is required" });
      }
      
      let user = null;
      
      // First try to find by Firebase UID
      if (firebaseUid) {
        user = await storage.getUserByFirebaseUid(firebaseUid);
      }
      
      // If not found by UID, try email
      if (!user && email) {
        user = await storage.getUserByEmail(email);
      }
      
      if (user) {
        return res.json({ 
          exists: true, 
          user: createSafeUser(user) 
        });
      } else {
        return res.json({ exists: false });
      }
    } catch (error) {
      console.error("Check user error:", error);
      res.status(500).json({ error: "Failed to check user" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  // Update user profile endpoint
  app.put("/api/auth/profile", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const updateData = updateProfileSchema.parse(req.body);
      
      // Check if email is being changed and if it already exists
      if (updateData.email) {
        const existingUser = await storage.getUserByEmail(updateData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, updateData);
      
      await SecurityLogger.logAuthEvent(
        'profile_updated',
        userId,
        true,
        req.ip,
        req.get('User-Agent'),
        { fields: Object.keys(updateData) }
      );
      
      // Create notification for profile update
      createActivityNotification(userId, 'profile_updated');
      
      const safeUser = createSafeUser(updatedUser);
      res.json(safeUser);
    } catch (error) {
      console.error("Profile update error:", error);
      await SecurityLogger.logAuthEvent(
        'profile_update_error',
        req.userId || null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Profile update failed" });
    }
  });

  // Change password endpoint
  app.put("/api/auth/change-password", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      
      // Get user with password hash
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Verify current password
      const isValidPassword = await EncryptionService.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        await SecurityLogger.logAuthEvent(
          'password_change_failed',
          userId,
          false,
          req.ip,
          req.get('User-Agent'),
          { reason: 'invalid_current_password' }
        );
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Validate new password strength
      const passwordCheck = validatePasswordStrength(newPassword);
      if (!passwordCheck.isValid) {
        return res.status(400).json({ 
          error: "New password does not meet security requirements",
          details: passwordCheck.errors 
        });
      }
      
      // Hash new password
      const hashedPassword = await EncryptionService.hashPassword(newPassword);
      
      // Update password
      await storage.updateUser(userId, { passwordHash: hashedPassword });
      
      await SecurityLogger.logAuthEvent(
        'password_changed',
        userId,
        true,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      await SecurityLogger.logAuthEvent(
        'password_change_error',
        req.userId || null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      res.status(500).json({ error: "Password change failed" });
    }
  });

  // Password recovery endpoint
  app.post("/api/auth/recover-password", authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const { email } = passwordRecoverySchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        await SecurityLogger.logAuthEvent(
          'password_recovery_attempt',
          null,
          false,
          req.ip,
          req.get('User-Agent'),
          { email, reason: 'user_not_found' }
        );
        return res.json({ message: "If the email exists, a recovery link has been sent" });
      }

      // Generate secure reset token
      const resetToken = EncryptionService.generateSecureToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      await SecurityLogger.logAuthEvent(
        'password_recovery_initiated',
        user.id,
        true,
        req.ip,
        req.get('User-Agent'),
        { email }
      );

      // Send email with reset link
      try {
        const { sendEmail, generatePasswordResetEmail } = await import('./email-service');
        const emailParams = generatePasswordResetEmail(email, resetToken);
        const emailSent = await sendEmail(emailParams);
        
        if (!emailSent) {
          console.error(`Failed to send password reset email to ${email}`);
          // Still return success to prevent email enumeration
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        // Continue without failing the request to prevent email enumeration
      }
      
      res.json({ message: "If the email exists, a recovery link has been sent" });
    } catch (error) {
      console.error("Password recovery error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      res.status(500).json({ error: "Password recovery failed" });
    }
  });

  // Avatar Management Endpoints
  
  // Update user gender and regenerate avatar
  app.put("/api/auth/gender", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { gender } = req.body;
      
      if (!gender || !['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ error: "Valid gender (male, female, other) is required" });
      }
      
      // Update user gender and regenerate avatar
      await avatarService.updateUserGender(userId, gender);
      
      // Get updated user to return the new avatar
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      await SecurityLogger.logAuthEvent(
        'gender_updated',
        userId,
        true,
        req.ip,
        req.get('User-Agent'),
        { gender }
      );
      
      res.json({ 
        message: "Gender updated successfully",
        profilePicture: updatedUser.profilePicture 
      });
    } catch (error) {
      console.error("Gender update error:", error);
      await SecurityLogger.logAuthEvent(
        'gender_update_error',
        req.userId || null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      res.status(500).json({ error: "Failed to update gender" });
    }
  });

  // Regenerate default avatar
  app.post("/api/auth/regenerate-avatar", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      // Regenerate default avatar
      const newAvatar = await avatarService.regenerateDefaultAvatar(userId);
      
      await SecurityLogger.logAuthEvent(
        'avatar_regenerated',
        userId,
        true,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({ 
        message: "Avatar regenerated successfully",
        profilePicture: newAvatar 
      });
    } catch (error) {
      console.error("Avatar regeneration error:", error);
      await SecurityLogger.logAuthEvent(
        'avatar_regeneration_error',
        req.userId || null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      res.status(500).json({ error: "Failed to regenerate avatar" });
    }
  });

  // Ensure user has avatar (for existing users)
  app.post("/api/auth/ensure-avatar", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      // Ensure user has an avatar
      await avatarService.ensureUserHasAvatar(userId);
      
      // Get updated user to return the avatar
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      await SecurityLogger.logAuthEvent(
        'avatar_ensured',
        userId,
        true,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({ 
        message: "Avatar ensured successfully",
        profilePicture: updatedUser.profilePicture 
      });
    } catch (error) {
      console.error("Avatar ensure error:", error);
      await SecurityLogger.logAuthEvent(
        'avatar_ensure_error',
        req.userId || null,
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      res.status(500).json({ error: "Failed to ensure avatar" });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        await SecurityLogger.logAuthEvent(
          'invalid_reset_token',
          null,
          false,
          req.ip,
          req.get('User-Agent'),
          { token }
        );
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check password strength
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.isValid) {
        return res.status(400).json({ 
          error: "Password does not meet security requirements",
          details: passwordCheck.errors 
        });
      }

      const hashedPassword = await EncryptionService.hashPassword(password);
      
      await storage.updateUser(user.id, {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      await SecurityLogger.logAuthEvent(
        'password_reset_success',
        user.id,
        true,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data" });
      }
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // User profile endpoints
  app.get("/api/profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  // Profile picture upload endpoint
  app.post("/api/profile/picture", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { image } = req.body;
      const userId = req.userId!;
      
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }
      
      // For now, we'll store the base64 image directly. In production, you'd upload to a cloud storage service
      const profilePictureUrl = image; // This would be replaced with actual cloud storage URL
      
      await storage.updateUser(userId, { profilePicture: profilePictureUrl });
      
      await SecurityLogger.logAuthEvent(
        'profile_picture_updated',
        userId,
        true,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({ 
        message: "Profile picture updated successfully",
        profilePicture: profilePictureUrl
      });
    } catch (error) {
      console.error("Profile picture upload error:", error);
      res.status(500).json({ error: "Failed to update profile picture" });
    }
  });

  app.put("/api/profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const updates = updateProfileSchema.parse(req.body);
      const userId = req.userId!;
      
      const updatedUser = await storage.updateUser(userId, updates);
      
      await SecurityLogger.logAuthEvent(
        'profile_update',
        userId,
        true,
        req.ip,
        req.get('User-Agent'),
        { updatedFields: Object.keys(updates) }
      );

      const safeUser = createSafeUser(updatedUser);
      res.json(safeUser);
    } catch (error) {
      console.error("Profile update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid input data",
          details: error.errors.map(e => e.message)
        });
      }
      res.status(500).json({ error: "Profile update failed" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.userId!;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      
      // Get user to verify current password
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await EncryptionService.verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        await SecurityLogger.logAuthEvent(
          'password_change_failed',
          userId,
          false,
          req.ip,
          req.get('User-Agent'),
          { reason: 'invalid_current_password' }
        );
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Check new password strength
      const passwordCheck = validatePasswordStrength(newPassword);
      if (!passwordCheck.isValid) {
        return res.status(400).json({ 
          error: "New password does not meet security requirements",
          details: passwordCheck.errors 
        });
      }
      
      // Hash new password and update
      const hashedNewPassword = await EncryptionService.hashPassword(newPassword);
      await storage.updateUser(userId, {
        passwordHash: hashedNewPassword,
      });
      
      await SecurityLogger.logAuthEvent(
        'password_change_success',
        userId,
        true,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // MFA endpoints
  app.post("/api/mfa/enable", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      // Generate backup codes
      const backupCodes = EncryptionService.generateMFABackupCodes();
      
      await storage.updateUser(userId, {
        mfaEnabled: true,
        mfaBackupCodes: backupCodes,
      });

      await SecurityLogger.logAuthEvent(
        'mfa_enabled',
        userId,
        true,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ 
        message: "MFA enabled successfully",
        backupCodes: backupCodes
      });
    } catch (error) {
      console.error("MFA enable error:", error);
      res.status(500).json({ error: "Failed to enable MFA" });
    }
  });

  app.post("/api/mfa/disable", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      await storage.updateUser(userId, {
        mfaEnabled: false,
        mfaBackupCodes: null,
      });

      await SecurityLogger.logAuthEvent(
        'mfa_disabled',
        userId,
        true,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ message: "MFA disabled successfully" });
    } catch (error) {
      console.error("MFA disable error:", error);
      res.status(500).json({ error: "Failed to disable MFA" });
    }
  });

  // Dashboard data
  app.get("/api/dashboard", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const user = req.user!;
      const accounts = await storage.getAccountsByUserId(userId);
      const recentTransactions = await storage.getRecentTransactions(userId, 10);

      // Calculate totals
      const totalBalance = accounts.reduce((sum: number, account: any) => sum + parseFloat(account.balance), 0);
      const currentAccount = accounts.find((a: any) => a.type === "current");
      const savingsAccount = accounts.find((a: any) => a.type === "savings");
      const investmentAccount = accounts.find((a: any) => a.type === "investment");

      // Calculate monthly stats from transactions
      const monthlyIncome = recentTransactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
      const monthlyExpenses = recentTransactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
      const monthlySavings = monthlyIncome - monthlyExpenses;

      // Debug logging for user name display issue
      console.log('Dashboard user data:', {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        firebaseUid: user.firebaseUid
      });

      const dashboardData = {
        user: {
          name: `${user.firstName || 'First'} ${user.lastName || 'Last'}`,
          email: user.email,
          initials: `${(user.firstName && user.firstName[0]) || 'F'}${(user.lastName && user.lastName[0]) || 'L'}`.toUpperCase(),
        },
        accounts: {
          current: parseFloat(currentAccount?.balance || "0"),
          savings: parseFloat(savingsAccount?.balance || "0"),
          investment: parseFloat(investmentAccount?.balance || "0"),
          total: totalBalance,
        },
        monthlyStats: {
          income: monthlyIncome,
          expenses: monthlyExpenses,
          savings: monthlySavings,
          incomeChange: 8.2,
          expensesChange: 3.1,
          savingsChange: 12.5,
        },
        spendingCategories: [
          { name: "Rent", amount: 1200, color: "#2563eb" },
          { name: "Food", amount: 450, color: "#16a34a" },
          { name: "Transportation", amount: 320, color: "#ca8a04" },
          { name: "Entertainment", amount: 180, color: "#dc2626" },
        ],
        recentTransactions: recentTransactions || [],
        financialGoals: [], // Empty for now - will be populated from database when user creates goals
      };

      // Create welcome notification for first-time dashboard visitors
      const isFirstDashboardVisit = !user.lastLoginAt || 
        (user.lastLoginAt && Math.abs(new Date().getTime() - new Date(user.lastLoginAt).getTime()) > 24 * 60 * 60 * 1000);
      
      if (isFirstDashboardVisit) {
        createActivityNotification(userId, 'dashboard_view', { firstTime: true });
      }

      res.json(dashboardData);
    } catch (error) {
      console.error("Dashboard data error:", error);
      res.status(500).json({ message: "Failed to load dashboard data" });
    }
  });

  // Balance history
  app.get("/api/balance-history", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const history = await storage.getBalanceHistory(userId);
      
      // If no history, return empty array (let frontend handle empty state)
      res.json(history);
    } catch (error) {
      console.error("Balance history error:", error);
      res.status(500).json({ error: "Failed to load balance history" });
    }
  });

  // Recent transactions
  app.get("/api/transactions/recent", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const transactions = await storage.getRecentTransactions(userId, 5);
      res.json(transactions);
    } catch (error) {
      console.error("Recent transactions error:", error);
      res.status(500).json({ error: "Failed to load transactions" });
    }
  });

  // Create transaction
  app.post("/api/transactions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const transactionData = {
        ...req.body,
        userId,
      };
      
      const transaction = await storage.createTransaction(transactionData);
      
      await SecurityLogger.logAuthEvent(
        'transaction_created',
        userId,
        true,
        req.ip,
        req.get('User-Agent'),
        { transactionId: transaction.id, amount: transaction.amount, type: transaction.type }
      );
      
      res.json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // Imisi 2.0 AI Assistant API endpoints
  const chatMessageSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
    sessionId: z.string().optional(),
  });

  // AI assistant rate limit - more restrictive for AI calls
  const aiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 AI requests per window
    message: { error: "Too many AI assistant requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Chat with Imisi 2.0
  app.post("/api/imisi/chat", isAuthenticated, aiRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { message, sessionId } = chatMessageSchema.parse(req.body);

      // Build comprehensive user context for personalized AI responses
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const [accounts, recentTransactions, balanceHistory] = await Promise.all([
        storage.getAccountsByUserId(userId),
        storage.getRecentTransactions(userId, 10),
        storage.getBalanceHistory(userId)
      ]);

      const currentBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0);
      const monthlyIncome = recentTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const monthlyExpenses = recentTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const hasActiveSubscription = user.stripeSubscriptionId === 'premium_active';

      const context: UserContext = {
        user: createSafeUser(user),
        accounts,
        recentTransactions,
        balanceHistory,
        currentBalance,
        monthlyIncome,
        monthlyExpenses,
        hasActiveSubscription
      };

      // Enhanced migration-focused response using Imisi Enhanced Service
      const { imisiEnhancedService } = await import('./imisi-enhanced-service');
      
      // Check if this is a migration assessment request
      if (message.toLowerCase().includes('assess') || message.toLowerCase().includes('eligibility')) {
        const migrationProfile = {
          userId,
          targetCountry: 'Canada', // Default, could be extracted from message
          currentCountry: user.nationality || 'Unknown',
          profession: 'Software Engineer', // Could be from user profile
          education: 'Bachelor\'s Degree',
          languageSkills: ['English'],
          workExperience: 5,
          age: 30,
          familySize: 1,
          budget: currentBalance,
        };

        const assessment = await imisiEnhancedService.generateMigrationAssessment(migrationProfile);
        
        const finalSessionId = sessionId || Math.random().toString(36).substring(2, 15);
        const chatMessage = await storage.createChatMessage({
          userId,
          message,
          response: `Based on your profile, I've identified ${assessment.eligiblePathways.length} potential migration pathways. Your recommended pathway is: ${assessment.recommendedPathway.name}`,
          context: null,
          sessionId: finalSessionId || undefined
        });

        return res.json({
          id: chatMessage.id,
          message: `Based on your profile, I've identified ${assessment.eligiblePathways.length} potential migration pathways. Your recommended pathway is: ${assessment.recommendedPathway.name}`,
          assessment: assessment,
          suggestions: assessment.nextSteps,
          actions: [
            {
              type: 'view_pathway',
              label: 'View Detailed Pathway',
              data: assessment.recommendedPathway
            },
            {
              type: 'financial_plan',
              label: 'View Financial Plan',
              data: assessment.financialPlan
            }
          ],
          sessionId: chatMessage.sessionId,
          timestamp: chatMessage.createdAt
        });
      }

      // Regular chat response using existing Gemini service
      const aiResponse = await geminiService.generateResponse(message, context);

      const finalSessionId = sessionId || Math.random().toString(36).substring(2, 15);
      const chatMessage = await storage.createChatMessage({
        userId,
        message,
        response: aiResponse.message,
        context: null,
        sessionId: finalSessionId || undefined
      });

      res.json({
        id: chatMessage.id,
        message: aiResponse.message,
        suggestions: aiResponse.suggestions,
        actions: aiResponse.actions,
        sessionId: chatMessage.sessionId,
        timestamp: chatMessage.createdAt
      });

    } catch (error) {
      console.error("AI chat error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid message format",
          details: error.errors.map(e => e.message)
        });
      }
      res.status(500).json({ error: "AI assistant temporarily unavailable" });
    }
  });

  // Enhanced Imisi endpoints
  app.get("/api/imisi/migration-profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Mock migration profile - in real app this would be stored
      const migrationProfile = {
        userId,
        targetCountry: 'Canada',
        currentCountry: user.nationality || 'Unknown',
        profession: 'Software Engineer',
        education: 'Bachelor\'s Degree',
        languageSkills: ['English'],
        workExperience: 5,
        age: 30,
        familySize: 1,
        budget: 25000,
        currentStep: 'Document preparation',
        completedSteps: ['Language test', 'Educational assessment']
      };

      res.json(migrationProfile);
    } catch (error) {
      console.error("Migration profile error:", error);
      res.status(500).json({ error: "Failed to fetch migration profile" });
    }
  });

  app.post("/api/imisi/financial-plan", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { imisiEnhancedService } = await import('./imisi-enhanced-service');
      
      // Get user's migration profile
      const user = await storage.getUser(userId);
      const accounts = await storage.getAccountsByUserId(userId);
      const currentBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0);

      const migrationProfile = {
        userId,
        targetCountry: req.body.targetCountry || 'Canada',
        currentCountry: user?.nationality || 'Unknown',
        profession: req.body.profession || 'Software Engineer',
        education: req.body.education || 'Bachelor\'s Degree',
        languageSkills: req.body.languageSkills || ['English'],
        workExperience: req.body.workExperience || 5,
        age: req.body.age || 30,
        familySize: req.body.familySize || 1,
        budget: currentBalance,
      };

      const financialPlan = await imisiEnhancedService.generateFinancialBreakdown(migrationProfile);
      res.json(financialPlan);
    } catch (error) {
      console.error("Financial plan error:", error);
      res.status(500).json({ error: "Failed to generate financial plan" });
    }
  });

  app.post("/api/imisi/checklist", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { imisiEnhancedService } = await import('./imisi-enhanced-service');
      
      const user = await storage.getUser(userId);
      const migrationProfile = {
        userId,
        targetCountry: req.body.targetCountry || 'Canada',
        currentCountry: user?.nationality || 'Unknown',
        profession: req.body.profession || 'Software Engineer',
        education: req.body.education || 'Bachelor\'s Degree',
        languageSkills: req.body.languageSkills || ['English'],
        workExperience: req.body.workExperience || 5,
        age: req.body.age || 30,
        familySize: req.body.familySize || 1,
        budget: 25000,
      };

      const checklist = await imisiEnhancedService.generatePreDepartureChecklist(migrationProfile);
      res.json(checklist);
    } catch (error) {
      console.error("Checklist error:", error);
      res.status(500).json({ error: "Failed to generate checklist" });
    }
  });

  // Get chat history
  app.get("/api/imisi/history", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const chatHistory = await storage.getChatMessages(userId, limit);
      
      res.json({
        messages: chatHistory.map(msg => ({
          id: msg.id,
          message: msg.message,
          response: msg.response,
          sessionId: msg.sessionId,
          timestamp: msg.createdAt
        }))
      });

    } catch (error) {
      console.error("Chat history error:", error);
      res.status(500).json({ error: "Failed to retrieve chat history" });
    }
  });

  // Get proactive AI suggestions
  app.get("/api/imisi/suggestions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;

      // Build user context for proactive suggestions
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const [accounts, recentTransactions, balanceHistory] = await Promise.all([
        storage.getAccountsByUserId(userId),
        storage.getRecentTransactions(userId, 5),
        storage.getBalanceHistory(userId)
      ]);

      const currentBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0);
      const monthlyIncome = recentTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const monthlyExpenses = recentTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const hasActiveSubscription = user.stripeSubscriptionId === 'premium_active';

      const context: UserContext = {
        user: createSafeUser(user),
        accounts,
        recentTransactions,
        balanceHistory,
        currentBalance,
        monthlyIncome,
        monthlyExpenses,
        hasActiveSubscription
      };

      const proactivePrompt = await geminiService.generateProactivePrompt(context);

      res.json({
        suggestion: proactivePrompt,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Proactive suggestions error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Save AI assistant context/preferences
  app.post("/api/imisi/context", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { contextType, contextData, priority = 0 } = req.body;

      if (!contextType || !contextData) {
        return res.status(400).json({ error: "Context type and data are required" });
      }

      const context = await storage.createAIAssistantContext({
        userId,
        contextType,
        contextData,
        priority,
        isActive: true
      });

      res.json({
        id: context.id,
        contextType: context.contextType,
        priority: context.priority,
        timestamp: context.createdAt
      });

    } catch (error) {
      console.error("Save AI context error:", error);
      res.status(500).json({ error: "Failed to save AI context" });
    }
  });

  // Loan API Routes
  
  // Get loan providers
  app.get("/api/loans/providers", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const country = req.query.country as string;
      const type = req.query.type as string;
      
      const providers = await loanService.getLoanProviders(country, type);
      
      // Create notification for viewing loan options
      const userId = req.userId!;
      if (providers.length > 0) {
        createActivityNotification(userId, 'loan_application_viewed', { 
          provider: providers.length > 1 ? 'multiple providers' : providers[0].name 
        });
      }
      
      res.json(providers);
    } catch (error) {
      console.error("Get loan providers error:", error);
      res.status(500).json({ error: "Failed to fetch loan providers" });
    }
  });

  // Get loan provider by ID
  app.get("/api/loans/providers/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const providerId = parseInt(req.params.id);
      const provider = await loanService.getLoanProviderById(providerId);
      
      if (!provider) {
        return res.status(404).json({ error: "Loan provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Get loan provider error:", error);
      res.status(500).json({ error: "Failed to fetch loan provider" });
    }
  });

  // Submit loan prequalification
  app.post("/api/loans/prequalify", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const prequalData = loanPrequalificationSchema.parse({
        ...req.body,
        userId
      });
      
      const result = await loanService.savePrequalification(prequalData);
      
      // Get matched providers
      const matchedProviders = await loanService.matchLoanProviders(prequalData);
      
      res.json({
        prequalification: result,
        matchedProviders,
        score: result.prequalificationScore
      });
    } catch (error) {
      console.error("Loan prequalification error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid prequalification data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to process prequalification" });
    }
  });

  // Get user's prequalifications
  app.get("/api/loans/prequalifications", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const prequalifications = await loanService.getUserPrequalifications(userId);
      res.json(prequalifications);
    } catch (error) {
      console.error("Get prequalifications error:", error);
      res.status(500).json({ error: "Failed to fetch prequalifications" });
    }
  });

  // Submit loan application
  app.post("/api/loans/apply", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const applicationData = loanApplicationSchema.parse({
        ...req.body,
        userId
      });
      
      const application = await loanService.submitLoanApplication(applicationData);
      
      await SecurityLogger.logAuthEvent(
        'loan_application_submitted',
        userId,
        true,
        req.ip,
        req.get('User-Agent'),
        { applicationId: application.id, amount: application.amount, providerId: application.loanProviderId }
      );

      // Create notification for loan application
      try {
        const provider = await loanService.getLoanProviderById(application.loanProviderId);
        if (provider) {
          notificationService.createLoanNotification(
            userId,
            'application',
            provider.name
          );
        }
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }
      
      res.json(application);
    } catch (error) {
      console.error("Loan application error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid application data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit loan application" });
    }
  });

  // Get user's loan applications
  app.get("/api/loans/applications", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const applications = await loanService.getUserLoanApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Get loan applications error:", error);
      res.status(500).json({ error: "Failed to fetch loan applications" });
    }
  });

  // Get loan provider reviews
  app.get("/api/loans/providers/:id/reviews", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const providerId = parseInt(req.params.id);
      const reviews = await loanService.getProviderReviews(providerId);
      res.json(reviews);
    } catch (error) {
      console.error("Get provider reviews error:", error);
      res.status(500).json({ error: "Failed to fetch provider reviews" });
    }
  });

  // === Enhanced Loan UX Features ===

  // Loan Favorites Management
  app.post('/api/loans/favorites', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { loanProviderId } = req.body;
      const userId = req.userId!;
      const favorite = await loanService.addToFavorites(userId, loanProviderId);
      
      // Create notification for favorite
      try {
        const provider = await loanService.getLoanProviderById(loanProviderId);
        if (provider) {
          notificationService.createNotification(
            userId,
            'loan',
            'Favorite Added',
            `${provider.name} has been added to your favorites`
          );
        }
      } catch (notificationError) {
        console.error('Failed to create favorite notification:', notificationError);
      }
      
      res.json(favorite);
    } catch (error) {
      console.error('Add to favorites error:', error);
      res.status(500).json({ error: 'Failed to add to favorites' });
    }
  });

  app.delete('/api/loans/favorites/:providerId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const userId = req.userId!;
      await loanService.removeFromFavorites(userId, providerId);
      res.json({ success: true });
    } catch (error) {
      console.error('Remove from favorites error:', error);
      res.status(500).json({ error: 'Failed to remove from favorites' });
    }
  });

  app.get('/api/loans/favorites', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const favorites = await loanService.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  app.get('/api/loans/favorites/check/:providerId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const userId = req.userId!;
      const isFavorite = await loanService.checkIsFavorite(userId, providerId);
      res.json({ isFavorite });
    } catch (error) {
      console.error('Check favorite error:', error);
      res.status(500).json({ error: 'Failed to check favorite status' });
    }
  });

  // Draft Management for Save/Resume
  app.post('/api/loans/drafts', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { loanProviderId, draftData, stepCompleted } = req.body;
      const userId = req.userId!;
      const draft = await loanService.saveDraft(userId, loanProviderId, draftData, stepCompleted);
      res.json(draft);
    } catch (error) {
      console.error('Save draft error:', error);
      res.status(500).json({ error: 'Failed to save draft' });
    }
  });

  app.get('/api/loans/drafts/:providerId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const userId = req.userId!;
      const draft = await loanService.getDraft(userId, providerId);
      res.json(draft);
    } catch (error) {
      console.error('Get draft error:', error);
      res.status(500).json({ error: 'Failed to fetch draft' });
    }
  });

  app.get('/api/loans/drafts', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const drafts = await loanService.getUserDrafts(userId);
      res.json(drafts);
    } catch (error) {
      console.error('Get drafts error:', error);
      res.status(500).json({ error: 'Failed to fetch drafts' });
    }
  });

  app.delete('/api/loans/drafts/:providerId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const userId = req.userId!;
      await loanService.deleteDraft(userId, providerId);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete draft error:', error);
      res.status(500).json({ error: 'Failed to delete draft' });
    }
  });

  // Enhanced Provider Reviews
  app.post('/api/loans/reviews', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const reviewData = req.body;
      const userId = req.userId!;
      const review = await loanService.addProviderReview(userId, reviewData);
      res.json(review);
    } catch (error) {
      console.error('Add review error:', error);
      res.status(500).json({ error: 'Failed to add review' });
    }
  });

  app.get('/api/loans/providers/:id/reviews-enhanced', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const providerId = parseInt(req.params.id);
      const reviews = await loanService.getProviderReviewsEnhanced(providerId);
      res.json(reviews);
    } catch (error) {
      console.error('Get enhanced reviews error:', error);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  app.get('/api/loans/my-reviews', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const reviews = await loanService.getUserReviews(userId);
      res.json(reviews);
    } catch (error) {
      console.error('Get user reviews error:', error);
      res.status(500).json({ error: 'Failed to fetch user reviews' });
    }
  });

  // Enhanced Providers with Favorites
  app.get('/api/loans/providers-enhanced', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const country = req.query.country as string;
      const userId = req.userId!;
      const providers = await loanService.getProvidersWithFavoriteStatus(userId, country);
      res.json(providers);
    } catch (error) {
      console.error('Get enhanced providers error:', error);
      res.status(500).json({ error: 'Failed to fetch providers' });
    }
  });

  // Seed loan providers (development only)
  if (process.env.NODE_ENV === 'development') {
    app.post("/api/loans/seed", requireAdmin, async (req: AuthenticatedRequest, res) => {
      try {
        await seedLoanProviders();
        res.json({ message: "Loan providers seeded successfully" });
      } catch (error) {
        console.error("Seed loan providers error:", error);
        res.status(500).json({ error: "Failed to seed loan providers" });
      }
    });
  }

  // Stripe subscription endpoints for Imisi Premium
  app.post('/api/create-subscription', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.email) {
        return res.status(400).json({ error: "User email is required for subscription" });
      }

      // Check if user already has a subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        if (subscription.status === 'active') {
          return res.json({
            subscriptionId: subscription.id,
            status: subscription.status,
            message: 'Already subscribed to Imisi Premium'
          });
        }
      }

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: userId.toString()
          }
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      // Create a payment intent for subscription
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 999, // $9.99 in cents
        currency: 'usd',
        customer: customerId,
        setup_future_usage: 'off_session',
        metadata: {
          userId: userId.toString(),
          type: 'imisi_premium_subscription'
        }
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        customerId: customerId,
        amount: 999
      });

    } catch (error: any) {
      console.error("Create subscription error:", error);
      res.status(500).json({ error: "Failed to create subscription: " + error.message });
    }
  });

  // Confirm subscription payment
  app.post('/api/confirm-subscription', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID is required" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Mark user as having premium subscription
        await storage.updateUser(userId, { stripeSubscriptionId: 'premium_active' });
        
        res.json({
          success: true,
          status: 'active',
          message: 'Imisi Premium activated successfully!'
        });
      } else {
        res.status(400).json({ 
          error: "Payment not completed",
          status: paymentIntent.status 
        });
      }

    } catch (error: any) {
      console.error("Confirm subscription error:", error);
      res.status(500).json({ error: "Failed to confirm subscription" });
    }
  });

  // Get subscription status
  app.get('/api/subscription-status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      
      const hasActiveSubscription = user?.stripeSubscriptionId === 'premium_active';
      
      res.json({
        hasActiveSubscription,
        status: hasActiveSubscription ? 'active' : 'inactive'
      });

    } catch (error: any) {
      console.error("Get subscription status error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // ===== COMMUNITY FEATURES API ROUTES =====

  // Community Insights routes
  app.get('/api/community/insights', async (req, res) => {
    try {
      const { limit = 20, category } = req.query;
      const insights = await storage.getInsights(Number(limit), category as string);
      res.json(insights);
    } catch (error: any) {
      console.error("Get insights error:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  app.get('/api/community/insights/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const insight = await storage.getInsightById(Number(id));
      
      if (!insight) {
        return res.status(404).json({ error: "Insight not found" });
      }
      
      res.json(insight);
    } catch (error: any) {
      console.error("Get insight error:", error);
      res.status(500).json({ error: "Failed to fetch insight" });
    }
  });

  app.post('/api/community/insights', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = createInsightSchema.parse(req.body);
      
      const insight = await storage.createInsight({
        ...validatedData,
        authorId: userId,
        status: 'published'
      });
      
      res.status(201).json(insight);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid insight data", details: error.errors });
      }
      console.error("Create insight error:", error);
      res.status(500).json({ error: "Failed to create insight" });
    }
  });

  // Simple mentors endpoint for homepage carousel
  app.get('/api/mentors', async (req, res) => {
    try {
      const mentors = await storage.getMentors(undefined, true);
      res.json(mentors);
    } catch (error: any) {
      console.error("Get mentors error:", error);
      res.status(500).json({ error: "Failed to fetch mentors" });
    }
  });

  // Mentors routes
  app.get('/api/community/mentors', async (req, res) => {
    try {
      const { specialty, isActive = 'true' } = req.query;
      const mentors = await storage.getMentors(specialty as string, isActive === 'true');
      res.json(mentors);
    } catch (error: any) {
      console.error("Get mentors error:", error);
      res.status(500).json({ error: "Failed to fetch mentors" });
    }
  });

  app.get('/api/community/mentors/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const mentor = await storage.getMentorById(Number(id));
      
      if (!mentor) {
        return res.status(404).json({ error: "Mentor not found" });
      }
      
      res.json(mentor);
    } catch (error: any) {
      console.error("Get mentor error:", error);
      res.status(500).json({ error: "Failed to fetch mentor" });
    }
  });

  app.post('/api/community/mentors', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = createMentorSchema.parse(req.body);
      
      // Check if user already has a mentor profile
      const existingMentor = await storage.getMentorByUserId(userId);
      if (existingMentor) {
        return res.status(400).json({ error: "User already has a mentor profile" });
      }
      
      const mentor = await storage.createMentor({
        ...validatedData,
        userId,
        isActive: true
      });
      
      res.status(201).json(mentor);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid mentor data", details: error.errors });
      }
      console.error("Create mentor error:", error);
      res.status(500).json({ error: "Failed to create mentor profile" });
    }
  });

  // Community Events routes
  app.get('/api/community/events', async (req, res) => {
    try {
      const { limit = 20, category } = req.query;
      const events = await storage.getEvents(Number(limit), category as string);
      res.json(events);
    } catch (error: any) {
      console.error("Get events error:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get('/api/community/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getEventById(Number(id));
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json(event);
    } catch (error: any) {
      console.error("Get event error:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post('/api/community/events', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = createEventSchema.parse(req.body);
      
      const event = await storage.createEvent({
        ...validatedData,
        organizerId: userId,
        date: new Date(validatedData.date),
        registrationDeadline: validatedData.registrationDeadline ? new Date(validatedData.registrationDeadline) : undefined
      });
      
      res.status(201).json(event);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid event data", details: error.errors });
      }
      console.error("Create event error:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Event registrations routes
  app.get('/api/community/events/:eventId/registrations', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { eventId } = req.params;
      const registrations = await storage.getEventRegistrations(Number(eventId));
      res.json(registrations);
    } catch (error: any) {
      console.error("Get event registrations error:", error);
      res.status(500).json({ error: "Failed to fetch event registrations" });
    }
  });

  app.post('/api/community/events/:eventId/register', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { eventId } = req.params;
      const { notes } = req.body;
      
      // Check if event exists
      const event = await storage.getEventById(Number(eventId));
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const registration = await storage.createEventRegistration({
        eventId: Number(eventId),
        userId,
        status: 'registered',
        notes: notes || null
      });
      
      res.status(201).json(registration);
    } catch (error: any) {
      console.error("Register for event error:", error);
      res.status(500).json({ error: "Failed to register for event" });
    }
  });

  app.get('/api/community/my-registrations', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const registrations = await storage.getUserEventRegistrations(userId);
      res.json(registrations);
    } catch (error: any) {
      console.error("Get user registrations error:", error);
      res.status(500).json({ error: "Failed to fetch user registrations" });
    }
  });

  // Mentor Sessions routes
  app.post('/api/community/mentor-sessions', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = bookMentorSessionSchema.parse(req.body);
      
      // Check if mentor exists
      const mentor = await storage.getMentorById(validatedData.mentorId);
      if (!mentor) {
        return res.status(404).json({ error: "Mentor not found" });
      }
      
      const session = await storage.createMentorSession({
        mentorId: validatedData.mentorId,
        menteeId: userId,
        scheduledAt: new Date(validatedData.scheduledAt),
        duration: validatedData.duration,
        sessionType: validatedData.sessionType,
        notes: validatedData.notes || null,
        status: 'scheduled'
      });
      
      res.status(201).json(session);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      console.error("Book mentor session error:", error);
      res.status(500).json({ error: "Failed to book mentor session" });
    }
  });

  app.get('/api/community/my-sessions', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { as } = req.query; // 'mentor' or 'mentee'
      
      let sessions;
      if (as === 'mentor') {
        // Get mentor profile first
        const mentorProfile = await storage.getMentorByUserId(userId);
        if (!mentorProfile) {
          return res.status(404).json({ error: "Mentor profile not found" });
        }
        sessions = await storage.getMentorSessions(mentorProfile.id);
      } else {
        sessions = await storage.getMentorSessions(undefined, userId);
      }
      
      res.json(sessions);
    } catch (error: any) {
      console.error("Get user sessions error:", error);
      res.status(500).json({ error: "Failed to fetch user sessions" });
    }
  });

  // Enhanced Analytics endpoint with AI insights
  app.get('/api/analytics', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { timeRange = '6months', category } = req.query;
      
      // Get user data for AI analysis
      const [user, accounts, transactions] = await Promise.all([
        storage.getUser(userId),
        storage.getAccountsByUserId(userId),
        storage.getRecentTransactions(userId, 1000) // Get more transactions for analytics
      ]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate AI-powered analytics
      const safeUser = createSafeUser(user);
      const aiAnalytics = await aiAnalyticsService.analyzeUserFinances(
        safeUser,
        transactions,
        accounts
      );
      
      // Calculate traditional analytics data
      const totalBalance = accounts.reduce((sum, account) => 
        sum + parseFloat(account.balance), 0
      );
      
      // Generate analytics data based on time range
      const now = new Date();
      const monthsBack = timeRange === '1month' ? 1 : 
                        timeRange === '3months' ? 3 : 
                        timeRange === '6months' ? 6 : 12;
      
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      
      // Filter transactions by date range
      const filteredTransactions = transactions.filter(t => 
        new Date(t.createdAt) >= startDate
      );
      
      // Calculate spending by category
      const expenseTransactions = filteredTransactions.filter(t => 
        parseFloat(t.amount) < 0
      );
      
      const categorySpending = expenseTransactions.reduce((acc, t) => {
        const category = t.category || 'Other';
        acc[category] = (acc[category] || 0) + Math.abs(parseFloat(t.amount));
        return acc;
      }, {} as Record<string, number>);
      
      const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);
      
      const spendingCategories = Object.entries(categorySpending).map(([name, amount], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        amount,
        percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6]
      }));
      
      // Calculate income
      const incomeTransactions = filteredTransactions.filter(t => 
        parseFloat(t.amount) > 0
      );
      
      const totalIncome = incomeTransactions.reduce((sum, t) => 
        sum + parseFloat(t.amount), 0
      );
      
      // Generate monthly data
      const monthlyData = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        const monthTransactions = filteredTransactions.filter(t => {
          const tDate = new Date(t.createdAt);
          return tDate.getMonth() === monthDate.getMonth() && 
                 tDate.getFullYear() === monthDate.getFullYear();
        });
        
        const monthIncome = monthTransactions
          .filter(t => parseFloat(t.amount) > 0)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
          
        const monthExpenses = Math.abs(monthTransactions
          .filter(t => parseFloat(t.amount) < 0)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0));
        
        monthlyData.push({
          month: monthName,
          amount: monthIncome,
          income: monthIncome,
          expenses: monthExpenses,
          net: monthIncome - monthExpenses
        });
      }
      
      // Calculate savings
      const monthlyIncome = totalIncome / monthsBack;
      const monthlyExpenses = totalSpending / monthsBack;
      const monthlySavings = monthlyIncome - monthlyExpenses;
      const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
      const savingsGoal = monthlyIncome * 0.2; // 20% savings goal
      
      // Generate budget data (mock for now since we don't have budgets table)
      const budgetCategories = ['housing', 'food', 'transportation', 'entertainment'];
      const budgets = budgetCategories.map(category => {
        const spent = categorySpending[category] || 0;
        const budget = spent * 1.2; // Set budget 20% higher than spent for demo
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;
        
        let status: 'on-track' | 'warning' | 'over-budget' = 'on-track';
        if (percentage > 100) status = 'over-budget';
        else if (percentage > 80) status = 'warning';
        
        return {
          category,
          spent,
          budget,
          percentage: Math.round(percentage),
          status
        };
      });
      
      const analyticsData = {
        spending: {
          total: totalSpending,
          categories: spendingCategories,
          trend: Math.random() * 20 - 10 // Mock trend for now
        },
        income: {
          total: monthlyIncome,
          monthly: monthlyData,
          trend: Math.random() * 20 - 10 // Mock trend for now
        },
        savings: {
          total: totalBalance,
          goal: savingsGoal,
          rate: Math.max(0, savingsRate),
          trend: Math.random() * 20 - 10 // Mock trend for now
        },
        budgets,
        transactions: {
          monthly: monthlyData
        },
        // Add AI-powered insights
        aiInsights: aiAnalytics.insights,
        patterns: aiAnalytics.patterns,
        recommendations: aiAnalytics.recommendations,
        predictions: aiAnalytics.predictions
      };
      
      res.json(analyticsData);
    } catch (error: any) {
      console.error("Get analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });

  // ===== ENHANCED LOAN REFERRAL SYSTEM ENDPOINTS =====

  // Submit loan pre-qualification with enhanced partner matching
  app.post('/api/loans/pre-qualify', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = loanPreQualificationSchema.parse(req.body);
      
      // Create pre-qualification record
      const preQualification = await storage.createLoanPreQualification({
        ...validatedData,
        userId
      });

      // Process matching in background and create referrals
      const result = await loanService.processPreQualification(preQualification.id);

      res.status(201).json({
        preQualification,
        matches: result.matches.length,
        referralsCreated: result.referralsCreated,
        message: result.referralsCreated > 0 
          ? `Found ${result.referralsCreated} matching partners` 
          : "No matching partners found at this time"
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid pre-qualification data", details: error.errors });
      }
      console.error('Pre-qualification error:', error);
      res.status(500).json({ error: "Failed to process pre-qualification" });
    }
  });

  // Enhanced prequalification with comprehensive partner matching
  app.post('/api/loans/enhanced-prequalify', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = loanPreQualificationSchema.parse(req.body);
      
      const { enhancedLoanService } = await import('./enhanced-loan-service');
      const workflow = await enhancedLoanService.processEnhancedPrequalification(userId, validatedData);

      res.status(201).json({
        success: true,
        workflow,
        message: workflow.workflowStatus === 'matched' 
          ? `Found ${workflow.matchingPartners.length} matching partners with ${workflow.totalPotentialCommission.toFixed(2)} potential commission`
          : "No matching partners found at this time"
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid pre-qualification data", details: error.errors });
      }
      console.error('Enhanced pre-qualification error:', error);
      res.status(500).json({ error: "Failed to process enhanced pre-qualification" });
    }
  });

  // Create loan application with referral tracking
  app.post('/api/loans/apply-with-referral', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { referralCode, ...applicationData } = req.body;
      
      const applicationSchema = loanApplicationSchema.parse(applicationData);
      const { enhancedLoanService } = await import('./enhanced-loan-service');
      
      const enhancedApplication = await enhancedLoanService.createLoanApplicationWithReferral(
        userId,
        applicationSchema,
        referralCode
      );

      res.status(201).json({
        success: true,
        application: enhancedApplication,
        message: referralCode ? "Application submitted with referral tracking" : "Application submitted"
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid application data", details: error.errors });
      }
      console.error('Enhanced loan application error:', error);
      res.status(500).json({ error: "Failed to submit loan application" });
    }
  });

  // Get loan application status with referral tracking
  app.get('/api/loans/applications/:id/status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { enhancedLoanService } = await import('./enhanced-loan-service');
      
      const statusInfo = await enhancedLoanService.getLoanApplicationStatus(applicationId);
      
      res.json({
        success: true,
        statusInfo
      });
    } catch (error: any) {
      console.error('Get loan application status error:', error);
      res.status(500).json({ error: "Failed to get application status" });
    }
  });

  // Get user's comprehensive loan journey
  app.get('/api/loans/user-journey', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { enhancedLoanService } = await import('./enhanced-loan-service');
      
      const journey = await enhancedLoanService.getUserLoanJourney(userId);
      
      res.json({
        success: true,
        journey
      });
    } catch (error: any) {
      console.error('Get user loan journey error:', error);
      res.status(500).json({ error: "Failed to get loan journey" });
    }
  });

  // Partner webhook endpoint for loan application updates
  app.post('/api/loans/partner-webhook', async (req, res) => {
    try {
      const { referralCode, status, applicationId, approvedAmount, approvedRate, rejectionReason, signature } = req.body;
      
      // Verify webhook signature (basic implementation)
      // In production, implement proper signature verification
      
      const { enhancedLoanService } = await import('./enhanced-loan-service');
      await enhancedLoanService.processPartnerWebhook(referralCode, {
        status,
        applicationId,
        approvedAmount,
        approvedRate,
        rejectionReason,
        additionalData: req.body
      });

      res.json({ success: true, message: "Webhook processed successfully" });
    } catch (error: any) {
      console.error('Partner webhook error:', error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // ===== ADMIN COMMISSION TRACKING ENDPOINTS =====

  // Get commission analytics for admin dashboard
  app.get('/api/admin/loans/commission-analytics', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const { enhancedLoanService } = await import('./enhanced-loan-service');
      const analytics = await enhancedLoanService.getCommissionAnalytics(start, end);
      
      res.json({
        success: true,
        analytics
      });
    } catch (error: any) {
      console.error('Commission analytics error:', error);
      res.status(500).json({ error: "Failed to fetch commission analytics" });
    }
  });

  // Process bulk commission payments
  app.post('/api/admin/loans/process-commissions', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId } = req.body;
      
      const { enhancedLoanService } = await import('./enhanced-loan-service');
      const result = await enhancedLoanService.processBulkCommissionPayments(partnerId);
      
      await SecurityLogger.logAuthEvent(
        'bulk_commission_payment_processed',
        req.userId!,
        true,
        req.ip,
        req.get('User-Agent'),
        {
          partnerId,
          processed: result.processed,
          totalAmount: result.totalAmount
        }
      );
      
      res.json({
        success: true,
        result,
        message: `Processed ${result.processed} commission payments totaling $${result.totalAmount.toFixed(2)}`
      });
    } catch (error: any) {
      console.error('Process commissions error:', error);
      res.status(500).json({ error: "Failed to process commission payments" });
    }
  });

  // Get detailed referral tracking data
  app.get('/api/admin/loans/referral-tracking', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, limit = 20, status, partnerId } = req.query;
      
      const { partnerApiService } = await import('./partner-api-service');
      const trackingData = await partnerApiService.getReferralAnalytics();
      
      res.json({
        success: true,
        trackingData
      });
    } catch (error: any) {
      console.error('Referral tracking error:', error);
      res.status(500).json({ error: "Failed to fetch referral tracking data" });
    }
  });

  // Get partner performance metrics
  app.get('/api/admin/loans/partner-performance', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const { partnerApiService } = await import('./partner-api-service');
      const performanceData = await partnerApiService.getReferralAnalytics(start, end);
      
      res.json({
        success: true,
        performance: performanceData
      });
    } catch (error: any) {
      console.error('Partner performance error:', error);
      res.status(500).json({ error: "Failed to fetch partner performance data" });
    }
  });

  // Get user's pre-qualification history
  app.get('/api/loans/my-pre-qualifications', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const preQualifications = await storage.getLoanPreQualifications(userId);
      res.json(preQualifications);
    } catch (error: any) {
      console.error('Error fetching pre-qualifications:', error);
      res.status(500).json({ error: "Failed to fetch pre-qualifications" });
    }
  });

  // Get user's loan referrals
  app.get('/api/loans/my-referrals', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const referrals = await storage.getLoanReferrals(undefined, userId);
      
      // Enhance with partner information
      const enhancedReferrals = await Promise.all(
        referrals.map(async (referral) => {
          const partner = await storage.getLoanPartner(referral.partnerId);
          const preQual = await storage.getLoanPreQualification(referral.preQualificationId);
          return {
            ...referral,
            partner: partner ? {
              name: partner.name,
              description: partner.description,
              logoUrl: partner.logoUrl,
              website: partner.website,
              processingTimeRange: partner.processingTimeRange
            } : null,
            preQualification: preQual ? {
              loanPurpose: preQual.loanPurpose,
              amountRequested: preQual.amountRequested,
              currency: preQual.currency
            } : null
          };
        })
      );

      res.json(enhancedReferrals);
    } catch (error: any) {
      console.error('Error fetching referrals:', error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  // Track referral clicks and redirect
  app.get('/api/loans/referral/:trackingId', async (req, res) => {
    try {
      const { trackingId } = req.params;
      const { pq, p } = req.query;

      if (!pq || !p) {
        return res.status(400).json({ error: "Invalid referral link" });
      }

      const preQualId = parseInt(pq as string);
      const partnerId = parseInt(p as string);

      const redirectUrl = await loanService.trackReferralClick(trackingId, preQualId, partnerId);

      if (!redirectUrl) {
        return res.status(404).json({ error: "Referral not found or partner unavailable" });
      }

      // Redirect to partner website
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('Error tracking referral:', error);
      res.status(500).json({ error: "Failed to process referral" });
    }
  });

  // Partner webhook endpoint for status updates
  app.post('/api/loans/webhook/:referralCode', async (req, res) => {
    try {
      const { referralCode } = req.params;
      const { status, applicationId, approvedAmount, approvedRate, rejectionReason } = req.body;

      const success = await loanService.updateReferralStatus(referralCode, status, {
        applicationId,
        approvedAmount,
        approvedRate,
        rejectionReason,
        webhookData: req.body
      });

      if (!success) {
        return res.status(404).json({ error: "Referral not found" });
      }

      res.json({ success: true, message: "Status updated successfully" });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // ===== ADMIN LOAN MANAGEMENT ENDPOINTS =====

  // Get all loan partners (admin only)
  app.get('/api/admin/loans/partners', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const partners = await storage.getLoanPartners();
      res.json(partners);
    } catch (error: any) {
      console.error('Error fetching partners:', error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // Create new loan partner (admin only)
  app.post('/api/admin/loans/partners', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const partner = await storage.createLoanPartner(req.body);
      res.status(201).json(partner);
    } catch (error: any) {
      console.error('Error creating partner:', error);
      res.status(500).json({ error: "Failed to create partner" });
    }
  });

  // Update loan partner (admin only)
  app.put('/api/admin/loans/partners/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const partnerId = parseInt(req.params.id);
      const partner = await storage.updateLoanPartner(partnerId, req.body);
      res.json(partner);
    } catch (error: any) {
      console.error('Error updating partner:', error);
      res.status(500).json({ error: "Failed to update partner" });
    }
  });

  // Get all pre-qualifications for admin review
  app.get('/api/admin/loans/pre-qualifications', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const preQualifications = await storage.getLoanPreQualifications();
      res.json(preQualifications);
    } catch (error: any) {
      console.error('Error fetching pre-qualifications:', error);
      res.status(500).json({ error: "Failed to fetch pre-qualifications" });
    }
  });

  // Get loan referral revenue metrics (admin only)
  app.get('/api/admin/financial/loan-referral-revenue', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const revenue = await loanService.getLoanReferralRevenue(start, end);
      res.json(revenue);
    } catch (error: any) {
      console.error('Error fetching loan revenue:', error);
      res.status(500).json({ error: "Failed to fetch loan revenue data" });
    }
  });

  // ===== FINANCIAL GOALS ENDPOINTS =====

  // Get user's financial goals
  app.get('/api/financial-goals', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const goals = await storage.getFinancialGoals(userId);
      res.json(goals);
    } catch (error: any) {
      console.error('Error fetching financial goals:', error);
      res.status(500).json({ error: "Failed to fetch financial goals" });
    }
  });

  // Create a new financial goal
  app.post('/api/financial-goals', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = createFinancialGoalSchema.parse(req.body);
      
      const goal = await storage.createFinancialGoal({
        ...validatedData,
        userId,
        targetAmount: validatedData.targetAmount,
        currentAmount: "0.00",
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
        monthlyContribution: validatedData.monthlyContribution || null,
      });

      res.status(201).json(goal);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid goal data", details: error.errors });
      }
      console.error('Error creating financial goal:', error);
      res.status(500).json({ error: "Failed to create financial goal" });
    }
  });

  // Update a financial goal
  app.put('/api/financial-goals/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const goalId = parseInt(req.params.id);
      const validatedData = updateFinancialGoalSchema.parse(req.body);
      
      // Verify ownership
      const existingGoal = await storage.getFinancialGoal(goalId);
      if (!existingGoal || existingGoal.userId !== userId) {
        return res.status(404).json({ error: "Goal not found" });
      }

      const updatedGoal = await storage.updateFinancialGoal(goalId, {
        ...validatedData,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : existingGoal.targetDate,
        updatedAt: new Date(),
      });

      res.json(updatedGoal);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid goal data", details: error.errors });
      }
      console.error('Error updating financial goal:', error);
      res.status(500).json({ error: "Failed to update financial goal" });
    }
  });

  // Add progress to a financial goal
  app.post('/api/financial-goals/:id/progress', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const goalId = parseInt(req.params.id);
      const validatedData = addGoalProgressSchema.parse(req.body);
      
      // Verify ownership
      const goal = await storage.getFinancialGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ error: "Goal not found" });
      }

      const amount = parseFloat(validatedData.amount);
      const newCurrentAmount = parseFloat(goal.currentAmount || '0') + amount;
      const progressPercentage = (newCurrentAmount / parseFloat(goal.targetAmount)) * 100;

      // Add progress record
      const progress = await storage.addGoalProgress({
        goalId,
        amount: validatedData.amount,
        progressPercentage: progressPercentage.toFixed(2),
        entryType: validatedData.entryType,
        notes: validatedData.notes,
      });

      // Update goal current amount
      const updatedGoal = await storage.updateFinancialGoal(goalId, {
        currentAmount: newCurrentAmount.toFixed(2),
        isCompleted: progressPercentage >= 100,
        completedAt: progressPercentage >= 100 ? new Date() : null,
        updatedAt: new Date(),
      });

      res.status(201).json({ progress, updatedGoal });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid progress data", details: error.errors });
      }
      console.error('Error adding goal progress:', error);
      res.status(500).json({ error: "Failed to add goal progress" });
    }
  });

  // Delete a financial goal
  app.delete('/api/financial-goals/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const goalId = parseInt(req.params.id);
      
      // Verify ownership
      const goal = await storage.getFinancialGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ error: "Goal not found" });
      }

      await storage.deleteFinancialGoal(goalId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting financial goal:', error);
      res.status(500).json({ error: "Failed to delete financial goal" });
    }
  });

  // ===== JOB & HOUSING DISCOVERY ROUTES =====

  // Job search endpoint
  app.get('/api/jobs/search', async (req, res) => {
    try {
      const validatedQuery = searchJobsSchema.parse(req.query);
      const jobs = await storage.searchJobs(validatedQuery);
      res.json(jobs);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid search parameters", details: error.errors });
      }
      console.error('Job search error:', error);
      res.status(500).json({ error: "Failed to search jobs" });
    }
  });

  // Get single job listing
  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJobListing(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      res.json(job);
    } catch (error: any) {
      console.error('Get job error:', error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // Create job listing (admin only)
  app.post('/api/admin/jobs', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertJobListingSchema.parse(req.body);
      const job = await storage.createJobListing({
        ...validatedData,
        expirationDate: validatedData.expirationDate ? new Date(validatedData.expirationDate) : null
      });
      res.status(201).json(job);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid job data", details: error.errors });
      }
      console.error('Create job error:', error);
      res.status(500).json({ error: "Failed to create job listing" });
    }
  });

  // Update job listing (admin only)
  app.put('/api/admin/jobs/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const updates = req.body;
      
      if (updates.expirationDate) {
        updates.expirationDate = new Date(updates.expirationDate);
      }
      
      const job = await storage.updateJobListing(jobId, updates);
      res.json(job);
    } catch (error: any) {
      console.error('Update job error:', error);
      res.status(500).json({ error: "Failed to update job listing" });
    }
  });

  // Delete job listing (admin only)
  app.delete('/api/admin/jobs/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      await storage.deleteJobListing(jobId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete job error:', error);
      res.status(500).json({ error: "Failed to delete job listing" });
    }
  });

  // ===== ADMIN USER MANAGEMENT ENDPOINTS =====

  // Get all users (admin only)
  app.get('/api/admin/users', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;

      let users;
      if (search) {
        users = await storage.searchUsers(search);
      } else {
        users = await storage.getAllUsers(limit, offset);
      }

      // Create safe user objects (exclude sensitive data)
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        nationality: user.nationality,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        mfaEnabled: user.mfaEnabled,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      await SecurityLogger.logSecurityEvent(
        'admin_users_viewed',
        req.userId!,
        true,
        req.ip,
        req.get('User-Agent'),
        { count: safeUsers.length, search: search || null }
      );

      res.json(safeUsers);
    } catch (error: any) {
      console.error('Admin users fetch error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get user count (admin only)
  app.get('/api/admin/users/count', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const count = await storage.getUsersCount();
      res.json({ count });
    } catch (error: any) {
      console.error('Admin user count error:', error);
      res.status(500).json({ error: "Failed to get user count" });
    }
  });

  // Update user role (admin only)
  app.put('/api/admin/users/:id/role', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (!['admin', 'customer'].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const user = await storage.updateUser(userId, { role });

      await SecurityLogger.logSecurityEvent(
        'admin_user_role_updated',
        req.userId!,
        true,
        req.ip,
        req.get('User-Agent'),
        { targetUserId: userId, newRole: role }
      );

      res.json({ 
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt
      });
    } catch (error: any) {
      console.error('Admin user role update error:', error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Activate/Deactivate user account (admin only)
  app.put('/api/admin/users/:id/status', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const user = await storage.updateUser(userId, { isActive });

      await SecurityLogger.logSecurityEvent(
        'admin_user_status_updated',
        req.userId!,
        true,
        req.ip,
        req.get('User-Agent'),
        { targetUserId: userId, newStatus: isActive ? 'active' : 'inactive' }
      );

      res.json({ 
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      });
    } catch (error: any) {
      console.error('Admin user status update error:', error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // ===== ADMIN TRANSACTION OVERSIGHT ENDPOINTS =====

  // Get all transactions (admin only, read-only)
  app.get('/api/admin/transactions', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

      let transactions;
      if (userId) {
        transactions = await storage.getTransactionsByUserId(userId);
      } else {
        transactions = await storage.getAllTransactions(limit, offset);
      }

      await SecurityLogger.logSecurityEvent(
        'admin_transactions_viewed',
        req.userId!,
        true,
        req.ip,
        req.get('User-Agent'),
        { count: transactions.length, filteredByUserId: userId || null }
      );

      res.json(transactions);
    } catch (error: any) {
      console.error('Admin transactions fetch error:', error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Get transaction count (admin only)
  app.get('/api/admin/transactions/count', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const count = await storage.getTransactionsCount();
      res.json({ count });
    } catch (error: any) {
      console.error('Admin transaction count error:', error);
      res.status(500).json({ error: "Failed to get transaction count" });
    }
  });

  // ===== ADMIN AUDIT LOG ENDPOINTS =====

  // Get audit logs (admin only)
  app.get('/api/admin/audit-logs', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const auditLogs = await storage.getAuditLogs(limit, offset);

      await SecurityLogger.logSecurityEvent(
        'admin_audit_logs_viewed',
        req.userId!,
        true,
        req.ip,
        req.get('User-Agent'),
        { count: auditLogs.length }
      );

      res.json(auditLogs);
    } catch (error: any) {
      console.error('Admin audit logs fetch error:', error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // ===== JOBS DISCOVERY BOARD API ROUTES =====

  // Get all job listings with filtering
  app.get('/api/jobs', async (req: AuthenticatedRequest, res) => {
    try {
      const { 
        search, 
        location, 
        jobType, 
        experience, 
        industry, 
        remote,
        page = 1,
        limit = 20
      } = req.query;

      const jobs = await storage.getJobListings({
        search: search as string,
        location: location as string,
        jobType: jobType as string,
        experience: experience as string,
        industry: industry as string,
        remote: remote === 'true' ? true : remote === 'false' ? false : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json(jobs);
    } catch (error: any) {
      console.error('Error fetching job listings:', error);
      res.status(500).json({ error: "Failed to fetch job listings" });
    }
  });

  // Get specific job listing
  app.get('/api/jobs/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJobListingById(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job listing not found" });
      }
      
      res.json(job);
    } catch (error: any) {
      console.error('Error fetching job listing:', error);
      res.status(500).json({ error: "Failed to fetch job listing" });
    }
  });

  // ===== ACHIEVEMENT BADGES ROUTES =====
  
  // Get user's achievements
  app.get('/api/achievements', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = req.user.id;

      const { achievementService } = await import('./achievement-service.js');
      const achievements = await achievementService.getUserAchievements(userId);
      
      res.json(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  // Get user's progress on all badges
  app.get('/api/achievements/progress', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = req.user.id;

      const { achievementService } = await import('./achievement-service.js');
      const progress = await achievementService.getUserProgress(userId);
      
      res.json(progress);
    } catch (error) {
      console.error('Error fetching achievement progress:', error);
      res.status(500).json({ error: "Failed to fetch achievement progress" });
    }
  });

  // Get achievement statistics
  app.get('/api/achievements/stats', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = req.user.id;

      const { achievementService } = await import('./achievement-service.js');
      const stats = await achievementService.getAchievementStats(userId);
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching achievement stats:', error);
      res.status(500).json({ error: "Failed to fetch achievement stats" });
    }
  });

  // Check and update user achievements (triggered after financial actions)
  app.post('/api/achievements/check', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = req.user.id;

      const { achievementService } = await import('./achievement-service.js');
      const newAchievements = await achievementService.checkUserAchievements(userId);
      
      res.json({ 
        newAchievements,
        count: newAchievements.length 
      });
    } catch (error) {
      console.error('Error checking achievements:', error);
      res.status(500).json({ error: "Failed to check achievements" });
    }
  });

  // Initialize default badges (admin only)
  app.post('/api/admin/achievements/initialize', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { achievementService } = await import('./achievement-service.js');
      await achievementService.initializeDefaultBadges();
      
      res.json({ message: "Default badges initialized successfully" });
    } catch (error) {
      console.error('Error initializing badges:', error);
      res.status(500).json({ error: "Failed to initialize badges" });
    }
  });

  // Create test users endpoint
  app.post('/api/admin/create-test-users', async (req: AuthenticatedRequest, res) => {
    try {
      const { createTestUsers } = await import('./create-test-users.js');
      const users = await createTestUsers();
      
      res.json({ 
        message: "Test users created successfully",
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          username: u.username,
          role: u.role
        }))
      });
    } catch (error) {
      console.error('Error creating test users:', error);
      res.status(500).json({ error: "Failed to create test users" });
    }
  });

  // ===== NOTIFICATION SYSTEM ENDPOINTS =====

  // Get notifications by priority
  app.get('/api/notifications/priority/:priority', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const priority = req.params.priority as 'low' | 'medium' | 'high' | 'critical';
      
      if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
        return res.status(400).json({ error: "Invalid priority level" });
      }
      
      const notifications = notificationService.getNotificationsByPriority(userId, priority);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications by priority:', error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get critical notifications
  app.get('/api/notifications/critical', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const notifications = notificationService.getCriticalNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching critical notifications:', error);
      res.status(500).json({ error: "Failed to fetch critical notifications" });
    }
  });

  // Get notifications requiring action
  app.get('/api/notifications/action-required', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const notifications = notificationService.getActionRequiredNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching action-required notifications:', error);
      res.status(500).json({ error: "Failed to fetch action-required notifications" });
    }
  });

  // Live notification triggers for real user activities - automatically called by various endpoints

  // Create manual financial alert (admin only)
  app.post('/api/admin/notifications/financial-alert', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { targetUserId, type, title, message, priority = 'medium', actionUrl, actionText } = req.body;
      
      if (!targetUserId || !type || !title || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const notification = notificationService.createNotification(
        targetUserId,
        type,
        title,
        message,
        priority,
        { adminCreated: true, createdBy: req.userId },
        {
          actionRequired: !!actionUrl,
          actionUrl,
          actionText
        }
      );
      
      res.json({ 
        message: "Financial alert created successfully",
        notification: { id: notification.id, type: notification.type, priority: notification.priority }
      });
    } catch (error) {
      console.error('Error creating financial alert:', error);
      res.status(500).json({ error: "Failed to create financial alert" });
    }
  });

  // Get user notifications
  app.get('/api/notifications', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const notifications = notificationService.getUserNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const count = notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Mark notification as read
  app.put('/api/notifications/:id/read', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const notificationId = req.params.id;
      
      const success = notificationService.markAsRead(userId, notificationId);
      if (success) {
        res.json({ message: "Notification marked as read" });
      } else {
        res.status(404).json({ error: "Notification not found" });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.put('/api/notifications/mark-all-read', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      notificationService.markAllAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const notificationId = req.params.id;
      
      const success = notificationService.deleteNotification(userId, notificationId);
      if (success) {
        res.json({ message: "Notification deleted" });
      } else {
        res.status(404).json({ error: "Notification not found" });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Automatic notification triggers for real user activities
  
  // Helper function to create activity notifications
  const createActivityNotification = async (userId: number, activity: string, details: any = {}) => {
    try {
      switch (activity) {
        case 'login':
          notificationService.createSystemNotification(
            userId, 
            'Welcome Back!', 
            `Welcome back to Cush! You last signed in ${details.lastLoginDays || 0} days ago.`,
            'low'
          );
          break;
          
        case 'dashboard_view':
          if (details.firstTime) {
            notificationService.createSystemNotification(
              userId,
              'Getting Started',
              'Welcome to your financial dashboard! Explore your balance, apply for loans, and connect with our community.',
              'medium'
            );
          }
          break;
          
        case 'loan_application_viewed':
          notificationService.createLoanNotification(
            userId,
            'interest',
            `You viewed loan options from ${details.provider || 'multiple providers'}. Ready to apply?`
          );
          break;
          
        case 'profile_updated':
          notificationService.createSystemNotification(
            userId,
            'Profile Updated',
            'Your profile information has been successfully updated.',
            'low'
          );
          break;
          
        case 'community_engagement':
          notificationService.createCommunityNotification(
            userId,
            'engagement',
            details.message || 'Thank you for engaging with our community!'
          );
          break;
          
        case 'payment_success':
          notificationService.createFinancialNotification(
            userId,
            'payment',
            `Payment of ${details.amount || 'amount'} has been processed successfully.`,
            'medium'
          );
          break;
          
        case 'goal_progress':
          notificationService.createFinancialNotification(
            userId,
            'goal',
            details.message || 'You\'re making great progress on your financial goals!',
            'low'
          );
          break;
      }
    } catch (error) {
      console.error('Error creating activity notification:', error);
    }
  };

  // Get test user credentials (development only)
  app.get('/api/test-credentials', async (req: AuthenticatedRequest, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({
      testAccounts: [
        {
          email: 'demo@cush.com',
          password: 'demo123',
          role: 'customer',
          description: 'Demo customer account with sample financial data'
        },
        {
          email: 'admin@cush.com', 
          password: 'admin123',
          role: 'admin',
          description: 'Admin account with full platform access'
        },
        {
          email: 'customer@cush.com',
          password: 'customer123', 
          role: 'customer',
          description: 'Test customer account'
        }
      ],
      note: 'These are test accounts for development and demo purposes only'
    });
  });

  // ============= ROBUST ADMIN FUNCTIONALITIES =============
  
  // Admin Analytics and Reporting
  app.get('/api/admin/analytics', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await adminService.getApplicationAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Partner Performance Metrics
  app.get('/api/admin/partners/:partnerId/performance', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId } = req.params;
      const { period = '30d' } = req.query;
      const performance = await adminService.getPartnerPerformance(
        parseInt(partnerId),
        period as '30d' | '90d' | '1y'
      );
      res.json(performance);
    } catch (error) {
      console.error('Error fetching partner performance:', error);
      res.status(500).json({ error: 'Failed to fetch partner performance' });
    }
  });

  // Fraud Detection and Prevention
  app.get('/api/admin/fraud-alerts', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const alerts = await adminService.getFraudAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching fraud alerts:', error);
      res.status(500).json({ error: 'Failed to fetch fraud alerts' });
    }
  });

  app.post('/api/admin/fraud-alerts/detect', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, userId } = req.body;
      const alerts = await adminService.detectFraudulentActivity(applicationId, userId);
      res.json(alerts);
    } catch (error) {
      console.error('Error detecting fraud:', error);
      res.status(500).json({ error: 'Failed to detect fraud' });
    }
  });

  app.put('/api/admin/fraud-alerts/:alertId/resolve', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body;
      await adminService.resolveFraudAlert(alertId, req.userId!, resolution);
      res.json({ success: true });
    } catch (error) {
      console.error('Error resolving fraud alert:', error);
      res.status(500).json({ error: 'Failed to resolve fraud alert' });
    }
  });

  // Document Verification
  app.get('/api/admin/document-verifications', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const verifications = await adminService.getDocumentVerifications();
      res.json(verifications);
    } catch (error) {
      console.error('Error fetching document verifications:', error);
      res.status(500).json({ error: 'Failed to fetch document verifications' });
    }
  });

  app.post('/api/admin/document-verifications/verify', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, documentType } = req.body;
      const verification = await adminService.verifyDocument(applicationId, documentType);
      res.json(verification);
    } catch (error) {
      console.error('Error verifying document:', error);
      res.status(500).json({ error: 'Failed to verify document' });
    }
  });

  app.put('/api/admin/document-verifications/:verificationId/review', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { verificationId } = req.params;
      const { decision } = req.body;
      await adminService.reviewDocument(verificationId, req.userId!, decision);
      res.json({ success: true });
    } catch (error) {
      console.error('Error reviewing document:', error);
      res.status(500).json({ error: 'Failed to review document' });
    }
  });

  // Commission Tracking and Payouts
  app.get('/api/admin/commissions', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const commissions = await adminService.getCommissionRecords();
      res.json(commissions);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      res.status(500).json({ error: 'Failed to fetch commissions' });
    }
  });

  app.post('/api/admin/commissions/calculate', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId } = req.body;
      const commission = await adminService.calculateCommission(applicationId);
      res.json(commission);
    } catch (error) {
      console.error('Error calculating commission:', error);
      res.status(500).json({ error: 'Failed to calculate commission' });
    }
  });

  app.put('/api/admin/commissions/:commissionId/approve', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { commissionId } = req.params;
      await adminService.approveCommission(commissionId, req.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error('Error approving commission:', error);
      res.status(500).json({ error: 'Failed to approve commission' });
    }
  });

  app.put('/api/admin/commissions/:commissionId/payout', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { commissionId } = req.params;
      const { paymentReference } = req.body;
      await adminService.processCommissionPayout(commissionId, paymentReference);
      res.json({ success: true });
    } catch (error) {
      console.error('Error processing payout:', error);
      res.status(500).json({ error: 'Failed to process payout' });
    }
  });

  // Enhanced Partner Management
  app.post('/api/admin/partners/create', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const partner = await adminService.createPartner(req.body);
      res.json(partner);
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({ error: 'Failed to create partner' });
    }
  });

  app.put('/api/admin/partners/:partnerId/update', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId } = req.params;
      const partner = await adminService.updatePartner(parseInt(partnerId), req.body);
      res.json(partner);
    } catch (error) {
      console.error('Error updating partner:', error);
      res.status(500).json({ error: 'Failed to update partner' });
    }
  });

  app.put('/api/admin/partners/:partnerId/deactivate', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId } = req.params;
      const { reason } = req.body;
      const partner = await adminService.deactivatePartner(parseInt(partnerId), reason);
      res.json(partner);
    } catch (error) {
      console.error('Error deactivating partner:', error);
      res.status(500).json({ error: 'Failed to deactivate partner' });
    }
  });

  // Enhanced Dashboard Analytics
  app.get("/api/dashboard/analytics", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;

      // Seed data if user has no financial data
      const existingAccounts = await storage.getAccountsByUserId(userId);
      if (existingAccounts.length === 0) {
        const { seedUserFinancialData } = await import('./seed-data.js');
        await seedUserFinancialData(userId);
      }
      const timeRange = req.query.timeRange as string || '30d';
      
      // Get time range dates
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default: // 30d
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get user accounts and transactions
      const accounts = await storage.getAccountsByUserId(userId);
      const transactions = await storage.getRecentTransactions(userId, 1000);
      const balanceHistory = await storage.getBalanceHistory(userId);
      
      // Calculate total balance
      const totalBalance = accounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);
      
      // Filter transactions by time range
      const filteredTransactions = transactions.filter(t => 
        new Date(t.date || t.createdAt!) >= startDate && new Date(t.date || t.createdAt!) <= endDate
      );
      
      // Calculate monthly income and expenses
      const monthlyIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const monthlyExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
      
      // Generate balance history data
      const balanceHistoryData = balanceHistory.slice(0, 30).reverse().map(h => ({
        date: new Date(h.date!).toLocaleDateString(),
        balance: parseFloat(h.totalBalance)
      }));
      
      // Calculate spending by category
      const categorySpending = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const category = t.category || 'Other';
          acc[category] = (acc[category] || 0) + Math.abs(parseFloat(t.amount));
          return acc;
        }, {} as Record<string, number>);
      
      const spendingByCategory = Object.entries(categorySpending).map(([category, amount], index) => ({
        category,
        amount,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'][index % 7]
      }));
      
      // Generate monthly trends (last 6 months)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i, 1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
        
        const monthTransactions = transactions.filter(t => {
          const tDate = new Date(t.date || t.createdAt!);
          return tDate >= monthStart && tDate <= monthEnd;
        });
        
        const income = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const expenses = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
        
        monthlyTrends.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          income,
          expenses,
          savings: income - expenses
        });
      }
      
      // Get recent transactions (last 10)
      const recentTransactions = filteredTransactions.slice(0, 10).map(t => ({
        id: t.id,
        description: t.description,
        amount: parseFloat(t.amount),
        type: t.type,
        category: t.category || 'Other',
        date: t.date || t.createdAt!
      }));
      
      // Generate AI insights
      const insights = [
        {
          id: 'spending-trend',
          type: 'info' as const,
          title: 'Spending Pattern Analysis',
          description: `Your spending has ${monthlyExpenses > (monthlyIncome * 0.7) ? 'increased' : 'remained stable'} this month. Consider setting up automatic savings to improve your financial health.`,
          impact: 'medium' as const
        },
        {
          id: 'savings-opportunity',
          type: 'success' as const,
          title: 'Savings Opportunity',
          description: `With your current income, you could potentially save an additional $${Math.round(monthlyIncome * 0.1)} per month by optimizing your largest expense categories.`,
          impact: 'high' as const
        }
      ];
      
      // Financial goals
      const financialGoals = [
        {
          id: 1,
          title: 'Emergency Fund',
          currentAmount: totalBalance * 0.3,
          targetAmount: monthlyExpenses * 6,
          progress: Math.min((totalBalance * 0.3) / (monthlyExpenses * 6) * 100, 100),
          targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          title: 'Vacation Fund',
          currentAmount: totalBalance * 0.1,
          targetAmount: 5000,
          progress: Math.min((totalBalance * 0.1) / 5000 * 100, 100),
          targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      const dashboardData = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate,
        balanceHistory: balanceHistoryData,
        spendingByCategory,
        monthlyTrends,
        recentTransactions,
        financialGoals,
        insights
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
    }
  });

  // AI Predictive Analytics endpoints
  app.get('/api/ai/predictive-insights', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { aiPredictiveService } = await import('./ai-predictive-service');
      const insights = await aiPredictiveService.generatePredictiveInsights(req.userId!);
      res.json(insights);
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      res.status(500).json({ error: 'Failed to generate predictive insights' });
    }
  });

  app.get('/api/ai/smart-alerts', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { aiPredictiveService } = await import('./ai-predictive-service');
      const alerts = await aiPredictiveService.generateSmartAlerts(req.userId!);
      res.json(alerts);
    } catch (error) {
      console.error('Error generating smart alerts:', error);
      res.status(500).json({ error: 'Failed to generate smart alerts' });
    }
  });

  app.get('/api/ai/financial-forecast', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { aiPredictiveService } = await import('./ai-predictive-service');
      const forecast = await aiPredictiveService.generateFinancialForecast(req.userId!);
      res.json(forecast);
    } catch (error) {
      console.error('Error generating financial forecast:', error);
      res.status(500).json({ error: 'Failed to generate financial forecast' });
    }
  });

  // Financial Insights API
  app.get("/api/financial-insights", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;

      // Seed data if user has no financial data
      const existingAccounts = await storage.getAccountsByUserId(userId);
      if (existingAccounts.length === 0) {
        const { seedUserFinancialData } = await import('./seed-data.js');
        await seedUserFinancialData(userId);
      }
      
      // Get user's financial data
      const accounts = await storage.getAccountsByUserId(userId);
      const transactions = await storage.getRecentTransactions(userId, 500);
      
      const totalBalance = accounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);
      
      // Calculate financial health score
      const monthlyIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const monthlyExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
      const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;
      
      // Calculate financial health score (0-100)
      let healthScore = 50; // base score
      
      // Savings rate impact (0-30 points)
      if (savingsRate >= 20) healthScore += 30;
      else if (savingsRate >= 10) healthScore += 20;
      else if (savingsRate >= 5) healthScore += 10;
      
      // Emergency fund impact (0-25 points)
      const emergencyFundMonths = totalBalance / (monthlyExpenses || 1);
      if (emergencyFundMonths >= 6) healthScore += 25;
      else if (emergencyFundMonths >= 3) healthScore += 15;
      else if (emergencyFundMonths >= 1) healthScore += 5;
      
      // Debt-to-income impact (0-20 points)
      if (debtToIncomeRatio < 30) healthScore += 20;
      else if (debtToIncomeRatio < 50) healthScore += 10;
      else if (debtToIncomeRatio > 80) healthScore -= 10;
      
      healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
      
      const financialHealthScore = {
        score: healthScore,
        factors: [
          `Savings rate: ${savingsRate.toFixed(1)}%`,
          `Emergency fund: ${emergencyFundMonths.toFixed(1)} months`,
          `Debt-to-income ratio: ${debtToIncomeRatio.toFixed(1)}%`,
          `Account balance: $${totalBalance.toLocaleString()}`
        ],
        recommendations: [
          savingsRate < 10 ? 'Increase your savings rate to at least 10% of income' : '',
          emergencyFundMonths < 3 ? 'Build an emergency fund covering 3-6 months of expenses' : '',
          debtToIncomeRatio > 50 ? 'Work on reducing your debt-to-income ratio below 50%' : '',
          'Consider setting up automatic transfers to savings accounts'
        ].filter(Boolean)
      };
      
      // Generate AI insights based on spending patterns
      const insights = [];
      
      // Analyze spending spikes
      const recentSpending = transactions
        .filter(t => t.type === 'expense')
        .slice(0, 30)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      const previousSpending = transactions
        .filter(t => t.type === 'expense')
        .slice(30, 60)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      if (recentSpending > previousSpending * 1.2) {
        insights.push({
          id: 'spending-spike',
          type: 'spending_spike' as const,
          category: 'General',
          title: 'Spending Increase Detected',
          description: `Your spending has increased by ${Math.round(((recentSpending - previousSpending) / previousSpending) * 100)}% compared to the previous period.`,
          impact: 'medium' as const,
          amount: recentSpending - previousSpending,
          frequency: 'Recent',
          suggestions: [
            'Review your recent transactions to identify unnecessary expenses',
            'Set up spending alerts to monitor future purchases',
            'Consider creating a monthly budget to track expenses'
          ],
          detectedAt: new Date().toISOString()
        });
      }
      
      // Category spending analysis
      const categorySpending = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const category = t.category || 'Other';
          acc[category] = (acc[category] || 0) + Math.abs(parseFloat(t.amount));
          return acc;
        }, {} as Record<string, number>);
      
      const topCategory = Object.entries(categorySpending)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (topCategory && topCategory[1] > monthlyIncome * 0.3) {
        insights.push({
          id: 'category-analysis',
          type: 'budget_overrun' as const,
          category: topCategory[0],
          title: `High ${topCategory[0]} Spending`,
          description: `Your ${topCategory[0]} expenses account for ${Math.round((topCategory[1] / monthlyIncome) * 100)}% of your income.`,
          impact: 'high' as const,
          amount: topCategory[1],
          frequency: 'Monthly',
          suggestions: [
            'Look for ways to reduce expenses in this category',
            'Compare alternatives or negotiate better rates',
            'Set a specific budget limit for this category'
          ],
          detectedAt: new Date().toISOString()
        });
      }
      
      // Savings opportunity insight
      if (savingsRate < 15 && monthlyIncome > monthlyExpenses) {
        insights.push({
          id: 'savings-opportunity',
          type: 'savings_opportunity' as const,
          category: 'Savings',
          title: 'Savings Opportunity',
          description: `You have the potential to save an additional $${Math.round(monthlyIncome * 0.1)} per month.`,
          impact: 'medium' as const,
          amount: monthlyIncome * 0.1,
          frequency: 'Monthly',
          suggestions: [
            'Set up automatic transfers to a high-yield savings account',
            'Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings',
            'Track your spending to identify areas for cost reduction'
          ],
          detectedAt: new Date().toISOString()
        });
      }
      
      // Generate spending patterns
      const spendingPatterns = Object.entries(categorySpending).map(([category, amount]) => {
        const monthlyAverage = amount;
        const trend = Math.random() > 0.5 ? 'increasing' : Math.random() > 0.5 ? 'decreasing' : 'stable';
        const changePercent = trend === 'stable' ? 0 : Math.round((Math.random() - 0.5) * 40);
        
        return {
          category,
          trend: trend as 'increasing' | 'decreasing' | 'stable',
          changePercent,
          monthlyAverage,
          prediction: trend === 'increasing' ? 
            `Projected to increase by ${Math.abs(changePercent)}% next month` :
            trend === 'decreasing' ?
            `Projected to decrease by ${Math.abs(changePercent)}% next month` :
            'Expected to remain stable'
        };
      }).slice(0, 5);
      
      const insightsData = {
        insights,
        spendingPatterns,
        financialHealthScore
      };
      
      res.json(insightsData);
    } catch (error) {
      console.error('Financial insights error:', error);
      res.status(500).json({ error: 'Failed to fetch financial insights' });
    }
  });

  // ===== COMPREHENSIVE ADMIN FUNCTIONS =====

  // Get admin dashboard statistics
  app.get('/api/admin/dashboard/stats', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      
      await SecurityLogger.logSecurityEvent(
        'Admin dashboard accessed',
        'info',
        { userId: req.userId, ip: req.ip, userAgent: req.get('User-Agent') }
      );

      res.json(stats);
    } catch (error: any) {
      console.error('Admin dashboard stats error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Enhanced user management - Get all users with advanced filtering
  app.get('/api/admin/users/advanced', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const searchQuery = req.query.search as string;
      const role = req.query.role as string;
      const verified = req.query.verified as string;

      let users = await storage.getAllUsers(limit, offset, searchQuery);
      
      // Additional filtering
      if (role && ['admin', 'customer'].includes(role)) {
        users = users.filter(user => user.role === role);
      }
      
      if (verified === 'true') {
        users = users.filter(user => user.isEmailVerified);
      } else if (verified === 'false') {
        users = users.filter(user => !user.isEmailVerified);
      }

      const totalCount = await storage.getUsersCount(searchQuery);

      const safeUsers = users.map(user => createSafeUser(user));
      
      res.json({
        users: safeUsers,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      });
    } catch (error: any) {
      console.error('Admin advanced users list error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.userId!;

      if (userId === adminId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      await storage.adminDeleteUser(userId, adminId);

      await SecurityLogger.logSecurityEvent(
        'admin_user_deleted',
        adminId,
        true,
        req.ip,
        req.get('User-Agent'),
        { deletedUserId: userId }
      );

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error('Admin user deletion error:', error);
      res.status(500).json({ error: error.message || "Failed to delete user" });
    }
  });

  // Update user details (admin only)
  app.put('/api/admin/users/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.userId!;
      const updates = req.body;

      // Validate updates
      const allowedFields = ['role', 'isEmailVerified', 'isPhoneVerified', 'firstName', 'lastName', 'email', 'phoneNumber', 'nationality'];
      const validUpdates: any = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          validUpdates[field] = updates[field];
        }
      }

      if (Object.keys(validUpdates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updatedUser = await storage.adminUpdateUser(userId, validUpdates, adminId);
      const safeUser = createSafeUser(updatedUser);

      res.json(safeUser);
    } catch (error: any) {
      console.error('Admin user update error:', error);
      res.status(500).json({ error: error.message || "Failed to update user" });
    }
  });

  // Restrict user account
  app.post('/api/admin/users/:id/restrict', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.userId!;
      const { restrictionType, reason, expiresAt } = req.body;

      if (!restrictionType || !reason) {
        return res.status(400).json({ error: "Restriction type and reason are required" });
      }

      const restriction = await storage.restrictUser(userId, {
        restrictionType,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }, adminId);

      await SecurityLogger.logSecurityEvent(
        'admin_user_restricted',
        adminId,
        true,
        req.ip,
        req.get('User-Agent'),
        { targetUserId: userId, restrictionType, reason }
      );

      res.json({ success: true, restriction });
    } catch (error: any) {
      console.error('Admin user restriction error:', error);
      res.status(500).json({ error: error.message || "Failed to restrict user" });
    }
  });

  // Remove user restriction
  app.delete('/api/admin/users/:id/restrict', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.userId!;

      await storage.removeUserRestriction(userId, adminId);

      await SecurityLogger.logSecurityEvent(
        'admin_user_unrestricted',
        adminId,
        true,
        req.ip,
        req.get('User-Agent'),
        { targetUserId: userId }
      );

      res.json({ success: true, message: "User restrictions removed" });
    } catch (error: any) {
      console.error('Admin user unrestriction error:', error);
      res.status(500).json({ error: error.message || "Failed to remove restrictions" });
    }
  });

  // Get user details with admin info
  app.get('/api/admin/users/:id/details', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      const [user, transactions, accounts, restrictions] = await Promise.all([
        storage.getUser(userId),
        storage.getTransactionsByUserId(userId),
        storage.getAccountsByUserId(userId),
        storage.getUserRestrictions(userId)
      ]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const safeUser = createSafeUser(user);
      
      res.json({
        user: safeUser,
        accounts: accounts.length,
        totalTransactions: transactions.length,
        recentTransactions: transactions.slice(0, 10),
        restrictions,
        lastLogin: user.lastLoginAt,
        createdAt: user.createdAt
      });
    } catch (error: any) {
      console.error('Admin user details error:', error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  // Get admin activity logs
  app.get('/api/admin/activity-logs', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await storage.getAdminActionLogs(limit, offset);
      
      res.json({
        logs,
        pagination: {
          limit,
          offset,
          hasMore: logs.length === limit
        }
      });
    } catch (error: any) {
      console.error('Admin activity logs error:', error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Bulk user operations
  app.post('/api/admin/users/bulk-action', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { action, userIds, data } = req.body;
      const adminId = req.userId!;

      if (!action || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "Invalid bulk action request" });
      }

      const results = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          let result;
          switch (action) {
            case 'delete':
              if (userId === adminId) {
                errors.push({ userId, error: "Cannot delete your own account" });
                continue;
              }
              await storage.adminDeleteUser(userId, adminId);
              result = { userId, action: 'deleted' };
              break;
            
            case 'verify_email':
              await storage.adminUpdateUser(userId, { isEmailVerified: true }, adminId);
              result = { userId, action: 'email_verified' };
              break;
            
            case 'change_role':
              if (!data?.role || !['admin', 'customer'].includes(data.role)) {
                errors.push({ userId, error: "Invalid role specified" });
                continue;
              }
              await storage.adminUpdateUser(userId, { role: data.role }, adminId);
              result = { userId, action: 'role_changed', newRole: data.role };
              break;
            
            default:
              errors.push({ userId, error: "Unknown action" });
              continue;
          }
          results.push(result);
        } catch (error: any) {
          errors.push({ userId, error: error.message });
        }
      }

      await SecurityLogger.logSecurityEvent(
        'admin_bulk_action',
        adminId,
        true,
        req.ip,
        req.get('User-Agent'),
        { action, affectedUsers: userIds.length, successCount: results.length, errorCount: errors.length }
      );

      res.json({
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: userIds.length,
          successful: results.length,
          failed: errors.length
        }
      });
    } catch (error: any) {
      console.error('Admin bulk action error:', error);
      res.status(500).json({ error: "Failed to perform bulk action" });
    }
  });

  // Export user data (admin only)
  app.get('/api/admin/export/users', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const format = req.query.format as string || 'json';
      const users = await storage.getAllUsers(10000); // Large limit for export
      
      const exportData = users.map(user => createSafeUser(user));

      await SecurityLogger.logSecurityEvent(
        'admin_data_export',
        req.userId!,
        true,
        req.ip,
        req.get('User-Agent'),
        { type: 'users', format, count: exportData.length }
      );

      if (format === 'csv') {
        // Simple CSV export
        const csvHeader = 'ID,Username,Email,First Name,Last Name,Role,Created At,Last Login\n';
        const csvData = exportData.map(user => 
          `${user.id},${user.username},${user.email},${user.firstName},${user.lastName},${user.role},${user.createdAt},${user.lastLoginAt || ''}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
        res.send(csvHeader + csvData);
      } else {
        res.json({
          exportedAt: new Date().toISOString(),
          totalUsers: exportData.length,
          users: exportData
        });
      }
    } catch (error: any) {
      console.error('Admin export error:', error);
      res.status(500).json({ error: "Failed to export user data" });
    }
  });

  // Admin Mentor Management Routes
  app.get('/api/admin/mentors', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const mentors = await storage.getAllMentors();
      res.json({ mentors });
    } catch (error: any) {
      console.error('Admin get mentors error:', error);
      res.status(500).json({ error: "Failed to fetch mentors" });
    }
  });

  app.post('/api/admin/mentors', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('Admin user:', req.user);
      console.log('Admin user ID:', req.userId);
      console.log('Session data:', req.session);
      
      const { name, email, specialty, experience, bio, hourlyRate, languages, certifications, profilePicture } = req.body;
      
      console.log('Creating mentor with data:', { name, email, specialty, experience, bio });
      
      if (!name || !email || !specialty || !experience || !bio) {
        const missing = [];
        if (!name) missing.push('name');
        if (!email) missing.push('email');
        if (!specialty) missing.push('specialty');
        if (!experience) missing.push('experience');
        if (!bio) missing.push('bio');
        return res.status(400).json({ 
          error: "Missing required fields",
          missing: missing
        });
      }

      // Check if user with email already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ 
          error: "A user with this email already exists",
          details: `User with email ${email} already exists`
        });
      }

      // Create user account for mentor with temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      
      console.log('Creating mentor user account...');
      const mentorUser = await storage.createUser({
        username: email.toLowerCase().replace('@', '_').replace('.', '_'),
        email: email.toLowerCase(),
        passwordHash,
        role: 'mentor',
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
        phoneNumber: '',
        nationality: '',
        isEmailVerified: true,
        isPhoneVerified: false,
        acceptTerms: true,
        acceptPrivacy: true,
        marketingConsent: false,
        mfaEnabled: false
      });

      console.log('Created mentor user:', mentorUser.id);

      // Create mentor profile
      console.log('Creating mentor profile...');
      const mentor = await storage.createMentor({
        userId: mentorUser.id,
        specialty,
        experience,
        bio,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        languages: languages || [],
        certifications: certifications || [],
        profilePicture: profilePicture || null,
        isActive: true,
        isVerified: true,
        availability: {
          timezone: 'EST',
          weekdays: [],
          isActive: true
        }
      });

      console.log('Created mentor profile:', mentor.id);

      // Admin action logged via console
      console.log(`Admin ${req.userId} created mentor profile for ${name} (${email})`);

      res.json({ mentor, success: true, tempPassword });
    } catch (error: any) {
      console.error('Admin create mentor error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // More specific error messages
      if (error.code === '23505') {
        return res.status(400).json({ 
          error: "Email already exists",
          details: "A user with this email address already exists"
        });
      }
      
      res.status(500).json({ 
        error: "Failed to create mentor",
        details: error.message || "Unknown error"
      });
    }
  });

  app.put('/api/admin/mentors/:mentorId', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mentorId } = req.params;
      const { isActive, ...updateData } = req.body;

      const mentor = await storage.updateMentor(parseInt(mentorId), {
        ...updateData,
        isActive: isActive !== undefined ? isActive : undefined
      });

      // Log admin action
      await storage.logAdminActivity({
        userId: req.userId!,
        action: 'MENTOR_UPDATED',
        details: `Updated mentor profile ID: ${mentorId}`,
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null,
        success: true
      });

      res.json({ mentor, success: true });
    } catch (error: any) {
      console.error('Admin update mentor error:', error);
      res.status(500).json({ error: "Failed to update mentor" });
    }
  });

  app.delete('/api/admin/mentors/:mentorId', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mentorId } = req.params;

      // Get mentor details for logging
      const mentor = await storage.getMentorById(parseInt(mentorId));
      if (!mentor) {
        return res.status(404).json({ error: "Mentor not found" });
      }

      await storage.deleteMentor(parseInt(mentorId));

      // Admin action logged via console
      console.log(`Admin ${req.user!.email} deleted mentor profile ID: ${mentorId}`);

      res.json({ success: true, message: "Mentor deleted successfully" });
    } catch (error: any) {
      console.error('Admin delete mentor error:', error);
      res.status(500).json({ error: "Failed to delete mentor" });
    }
  });

  // Make user a mentor endpoint
  app.post('/api/admin/users/:id/make-mentor', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { specialty, bio, experience } = req.body;

      if (!specialty || !bio || !experience) {
        return res.status(400).json({ error: "Missing required fields: specialty, bio, experience" });
      }

      // First update user role to mentor
      await storage.adminUpdateUser(parseInt(id), { role: 'mentor' }, req.user!.id);

      // Then create mentor profile
      const mentor = await storage.createMentor({
        userId: parseInt(id),
        specialty,
        bio,
        experience,
        isActive: true,
        isVerified: false,
        rating: '0.00',
        totalSessions: 0
      });

      // Log admin action
      await storage.logAdminActivity({
        userId: req.user!.id,
        action: 'USER_CONVERTED_TO_MENTOR',
        details: `Converted user ID ${id} to mentor with specialty: ${specialty}`,
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null,
        success: true
      });

      res.json({ success: true, mentor });
    } catch (error: any) {
      console.error('Make user mentor error:', error);
      res.status(500).json({ error: "Failed to convert user to mentor" });
    }
  });

  // Financial Mood Analysis API
  app.get('/api/financial-mood', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Gather user's financial data
      const accounts = await storage.getAccountsByUserId(userId);
      const transactions = await storage.getTransactionsByUserId(userId);
      const financialGoals = await storage.getFinancialGoals(userId);
      
      // Calculate financial metrics
      const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const monthlyTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const transDate = new Date(t.date);
        return transDate >= monthAgo;
      });
      
      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100) : 0;
      
      const moodData: FinancialMoodData = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate: Math.max(0, savingsRate),
        recentTransactions: monthlyTransactions.map(t => ({
          amount: parseFloat(t.amount),
          type: t.type,
          category: t.category || 'Other',
          date: t.date ? new Date(t.date).toISOString() : new Date().toISOString()
        })),
        financialGoals: financialGoals.map((g: any) => ({
          title: g.name || g.title || 'Goal',
          progress: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0,
          targetAmount: g.targetAmount || 0,
          currentAmount: g.currentAmount || 0
        }))
      };
      
      const moodAnalysis = await analyzeFinancialMood(moodData);
      res.json(moodAnalysis);
      
    } catch (error: any) {
      console.error('Financial mood analysis error:', error);
      res.status(500).json({ error: "Failed to analyze financial mood" });
    }
  });

  // =============================================================================
  // MENTOR BOOKING & AVAILABILITY API ROUTES
  // =============================================================================

  // Get mentor availability
  app.get('/api/mentors/:mentorId/availability', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mentorId } = req.params;
      const { date } = req.query;

      const mentor = await storage.getMentorById(parseInt(mentorId));
      if (!mentor) {
        return res.status(404).json({ error: "Mentor not found" });
      }

      // Get mentor's general availability and specific time slots
      const availability = await storage.getMentorAvailability(parseInt(mentorId), date as string);
      const bookedSlots = await storage.getMentorBookings(parseInt(mentorId), date as string);

      res.json({
        mentor: {
          id: mentor.id,
          name: `${mentor.firstName} ${mentor.lastName}`,
          specialty: mentor.specialty,
          timezone: mentor.availability?.timezone || 'GMT'
        },
        availability,
        bookedSlots
      });
    } catch (error: any) {
      console.error('Get mentor availability error:', error);
      res.status(500).json({ error: "Failed to fetch mentor availability" });
    }
  });

  // Set mentor availability (mentor only)
  app.post('/api/mentors/availability', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { weekdays, startTime, endTime, timezone, isActive } = req.body;

      // Check if user is a mentor
      const mentor = await storage.getMentorByUserId(userId);
      if (!mentor) {
        return res.status(403).json({ error: "Only mentors can set availability" });
      }

      const availability = await storage.setMentorAvailability(mentor.id, {
        weekdays: weekdays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: startTime || '09:00',
        endTime: endTime || '17:00',
        timezone: timezone || 'GMT',
        isActive: isActive !== undefined ? isActive : true
      });

      res.json({ success: true, availability });
    } catch (error: any) {
      console.error('Set mentor availability error:', error);
      res.status(500).json({ error: "Failed to set mentor availability" });
    }
  });

  // Book a session with mentor
  app.post('/api/mentors/:mentorId/book', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mentorId } = req.params;
      const userId = req.user!.id;
      const { date, startTime, endTime, topic, sessionType, notes } = req.body;

      if (!date || !startTime || !endTime || !topic) {
        return res.status(400).json({ error: "Missing required fields: date, startTime, endTime, topic" });
      }

      const mentor = await storage.getMentorById(parseInt(mentorId));
      if (!mentor) {
        return res.status(404).json({ error: "Mentor not found" });
      }

      // Check if time slot is available
      const isAvailable = await storage.checkTimeSlotAvailability(parseInt(mentorId), date, startTime, endTime);
      if (!isAvailable) {
        return res.status(400).json({ error: "Time slot is not available" });
      }

      // Create booking
      const booking = await storage.createMentorBooking({
        mentorId: parseInt(mentorId),
        userId,
        date,
        startTime,
        endTime,
        topic,
        sessionType: sessionType || 'video_call',
        notes: notes || null,
        status: 'confirmed'
      });

      // Send notification emails
      try {
        const { sendEmail } = await import('./email-service');
        const user = await storage.getUserById(userId);
        
        // Email to user
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: 'Booking Confirmation - Cush Mentorship',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Booking Confirmed!</h2>
                <p>Your session with ${mentor.firstName} ${mentor.lastName} has been confirmed.</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #374151;">Session Details:</h3>
                  <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
                  <p><strong>Topic:</strong> ${topic}</p>
                  <p><strong>Type:</strong> ${sessionType?.replace('_', ' ') || 'Video Call'}</p>
                </div>
                <p>A calendar invite will be sent separately with meeting details.</p>
              </div>
            `
          });
        }

        // Email to mentor (if they have user account)
        const mentorUser = await storage.getUserById(mentor.userId);
        if (mentorUser?.email) {
          await sendEmail({
            to: mentorUser.email,
            subject: 'New Booking - Cush Mentorship',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New Session Booked!</h2>
                <p>You have a new mentorship session booked with ${user?.firstName} ${user?.lastName}.</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #374151;">Session Details:</h3>
                  <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
                  <p><strong>Topic:</strong> ${topic}</p>
                  <p><strong>Type:</strong> ${sessionType?.replace('_', ' ') || 'Video Call'}</p>
                  ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                </div>
              </div>
            `
          });
        }
      } catch (emailError) {
        console.error('Failed to send booking emails:', emailError);
        // Don't fail the booking if email fails
      }

      res.json({ success: true, booking });
    } catch (error: any) {
      console.error('Book mentor session error:', error);
      res.status(500).json({ error: "Failed to book session" });
    }
  });

  // Get user's bookings
  app.get('/api/bookings', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { status, upcoming } = req.query;

      const bookings = await storage.getUserBookings(userId, {
        status: status as string,
        upcoming: upcoming === 'true'
      });

      res.json({ bookings });
    } catch (error: any) {
      console.error('Get user bookings error:', error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Get mentor's bookings
  app.get('/api/mentors/bookings', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { status, date } = req.query;

      const mentor = await storage.getMentorByUserId(userId);
      if (!mentor) {
        return res.status(403).json({ error: "Only mentors can view mentor bookings" });
      }

      const bookings = await storage.getMentorBookingsList(mentor.id, {
        status: status as string,
        date: date as string
      });

      res.json({ bookings });
    } catch (error: any) {
      console.error('Get mentor bookings error:', error);
      res.status(500).json({ error: "Failed to fetch mentor bookings" });
    }
  });

  // Cancel booking
  app.delete('/api/bookings/:bookingId', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.id;

      const booking = await storage.getBookingById(parseInt(bookingId));
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Check if user owns the booking or is the mentor
      const mentor = await storage.getMentorByUserId(userId);
      const canCancel = booking.userId === userId || (mentor && booking.mentorId === mentor.id);
      
      if (!canCancel) {
        return res.status(403).json({ error: "Not authorized to cancel this booking" });
      }

      await storage.cancelBooking(parseInt(bookingId));

      res.json({ success: true, message: "Booking cancelled successfully" });
    } catch (error: any) {
      console.error('Cancel booking error:', error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  // =============================================================================
  // CREDIT PASSPORT API ROUTES
  // =============================================================================

  // Initiate Nova Credit process
  app.post('/api/credit-passport/nova-credit/initiate', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { novaCreditService } = await import('./nova-credit-service');
      
      const response = await novaCreditService.initiateNovaCreditProcess(
        userId,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json(response);
    } catch (error: any) {
      console.error('Nova Credit initiation error:', error);
      res.status(500).json({ error: "Failed to initiate Nova Credit process" });
    }
  });

  // Nova Credit webhook handler
  app.post('/api/credit-passport/nova-credit/webhook', async (req: Request, res: Response) => {
    try {
      const { novaCreditService } = await import('./nova-credit-service');
      
      await novaCreditService.handleNovaCreditWebhook(req.body);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Nova Credit webhook error:', error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Get Nova Credit report (admin/internal)
  app.get('/api/credit-passport/nova-credit/report/:userId', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { novaCreditService } = await import('./nova-credit-service');
      
      const report = await novaCreditService.getCreditProfile(parseInt(userId));
      
      res.json(report);
    } catch (error: any) {
      console.error('Nova Credit report error:', error);
      res.status(500).json({ error: "Failed to fetch credit report" });
    }
  });

  // Get user's credit profile status
  app.get('/api/credit-passport/status', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { novaCreditService } = await import('./nova-credit-service');
      const { lenddoEFLService } = await import('./lenddo-efl-service');
      
      const novaCreditStatus = await novaCreditService.getCreditProfileStatus(userId);
      const alternativeData = await lenddoEFLService.getAlternativeDataScore(userId);
      
      res.json({
        ...novaCreditStatus,
        hasAlternativeData: !!alternativeData,
        alternativeDataScore: alternativeData?.score || null,
      });
    } catch (error: any) {
      console.error('Credit profile status error:', error);
      res.status(500).json({ error: "Failed to fetch credit profile status" });
    }
  });

  // Get comprehensive credit profile
  app.get('/api/credit-passport/profile', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { novaCreditService } = await import('./nova-credit-service');
      const { lenddoEFLService } = await import('./lenddo-efl-service');
      const { creditScoreCalculator } = await import('./credit-score-calculator');
      
      const creditProfile = await novaCreditService.getCreditProfile(userId);
      const alternativeData = await lenddoEFLService.getAlternativeDataScore(userId);
      
      // Get user's financial data for comprehensive scoring
      const accounts = await storage.getAccountsByUserId(userId);
      const transactions = await storage.getRecentTransactions(userId, 50);
      const financialGoals = await storage.getFinancialGoals(userId);
      
      // Calculate total balance and financial metrics
      const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);
      const monthlyIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const monthlyExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      // Calculate comprehensive Cush Credit Score
      const scoreResult = creditScoreCalculator.calculateCushCreditScore({
        novaCreditScore: creditProfile?.novaCreditScore || undefined,
        lenddoEFLScore: alternativeData?.score || undefined,
        employmentHistory: {
          currentEmployment: true, // Assume employed for now
          monthlyIncome: monthlyIncome || 0,
          employmentLengthMonths: 12, // Default value
          jobStability: 7, // Default value
        },
        financialData: {
          totalBalance,
          savingsRate: monthlyIncome > 0 ? Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome) : 0,
          monthlySpending: monthlyExpenses,
          debtToIncomeRatio: 0.2, // Default value
        },
        migrationProfile: {
          timeInCountry: 24, // Default 2 years
          visaStatus: 'work_visa',
          educationLevel: 'bachelors',
          languageProficiency: 8,
        },
        behavioralData: {
          appEngagement: 8,
          financialGoalsCompleted: financialGoals.filter((g: any) => g.isCompleted).length,
          communityParticipation: 6,
        },
      });
      
      res.json({
        creditProfile,
        alternativeData,
        cushCreditScore: scoreResult,
        lastUpdated: creditProfile?.lastUpdated || new Date(),
      });
    } catch (error: any) {
      console.error('Credit profile error:', error);
      res.status(500).json({ error: "Failed to fetch credit profile" });
    }
  });

  // Calculate alternative data score
  app.post('/api/credit-passport/lenddo-efl/score', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { lenddoEFLService } = await import('./lenddo-efl-service');
      
      // Get user's data for scoring
      const accounts = await storage.getAccountsByUserId(userId);
      const transactions = await storage.getRecentTransactions(userId, 50);
      const financialGoals = await storage.getFinancialGoals(userId);
      
      const monthlyIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const scoreRequest = {
        userId,
        employmentData: {
          currentEmployment: true,
          monthlyIncome: monthlyIncome || 0,
          employmentHistory: [],
          jobTitle: 'Professional',
          companyName: 'Various',
        },
        behavioralData: {
          appUsagePatterns: {},
          financialGoals: financialGoals,
          communityEngagement: 6,
        },
      };
      
      const score = await lenddoEFLService.calculateAlternativeDataScore(scoreRequest);
      
      res.json(score);
    } catch (error: any) {
      console.error('Alternative data scoring error:', error);
      res.status(500).json({ error: "Failed to calculate alternative data score" });
    }
  });

  // Financial Health Radar API
  app.get('/api/financial-health-radar', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Gather user's financial data
      const accounts = await storage.getAccountsByUserId(userId);
      const transactions = await storage.getTransactionsByUserId(userId);
      const financialGoals = await storage.getFinancialGoals(userId);
      
      // Calculate financial metrics
      const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const monthlyTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const transDate = new Date(t.date);
        return transDate >= monthAgo;
      });
      
      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100) : 0;
      
      // Calculate additional metrics for health radar
      const monthlyDebtPayments = monthlyTransactions
        .filter(t => t.category?.toLowerCase().includes('debt') || t.category?.toLowerCase().includes('loan'))
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      const accountTypes = [...new Set(accounts.map(acc => acc.type || 'checking'))];
      
      const goalCompletionRate = financialGoals.length > 0 
        ? financialGoals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount * 100), 0) / financialGoals.length
        : 0;
      
      const healthData: FinancialHealthData = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate: Math.max(0, savingsRate),
        recentTransactions: monthlyTransactions.map(t => ({
          amount: parseFloat(t.amount),
          type: t.type,
          category: t.category || 'Other',
          date: t.date ? new Date(t.date).toISOString() : new Date().toISOString()
        })),
        financialGoals: financialGoals.map((g: any) => ({
          title: g.name || g.title || 'Goal',
          progress: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0,
          targetAmount: g.targetAmount || 0,
          currentAmount: g.currentAmount || 0
        })),
        monthlyDebtPayments,
        accountTypes,
        goalCompletionRate: Math.min(100, Math.max(0, goalCompletionRate))
      };
      
      const healthRadar = await analyzeFinancialHealth(healthData);
      res.json(healthRadar);
      
    } catch (error: any) {
      console.error('Financial health radar error:', error);
      res.status(500).json({ error: "Failed to generate financial health radar" });
    }
  });

  // Admin Insight Articles Management
  app.get('/api/admin/articles', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const articles = await storage.getInsightArticles();
      res.json({ articles });
    } catch (error: any) {
      console.error('Failed to fetch articles:', error);
      res.status(500).json({ error: 'Failed to fetch articles' });
    }
  });

  app.post('/api/admin/articles', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, excerpt, content, category, tags, featuredImage, readTime } = req.body;
      
      const articleData = {
        title,
        excerpt,
        content,
        category,
        tags: JSON.stringify(tags || []),
        featuredImage: featuredImage || null,
        readTime: readTime || 5,
        author: req.user!.firstName + ' ' + req.user!.lastName,
        authorRole: 'Immigration Expert',
        publishedAt: new Date()
      };

      const article = await storage.createInsightArticle(articleData);
      res.json({ success: true, article });
    } catch (error: any) {
      console.error('Failed to create article:', error);
      res.status(500).json({ error: 'Failed to create article' });
    }
  });

  app.put('/api/admin/articles/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, excerpt, content, category, tags, featuredImage, readTime } = req.body;
      
      const updateData = {
        title,
        excerpt,
        content,
        category,
        tags: JSON.stringify(tags || []),
        featuredImage: featuredImage || null,
        readTime: readTime || 5
      };

      const article = await storage.updateInsightArticle(parseInt(id), updateData);
      res.json({ success: true, article });
    } catch (error: any) {
      console.error('Failed to update article:', error);
      res.status(500).json({ error: 'Failed to update article' });
    }
  });

  app.delete('/api/admin/articles/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteInsightArticle(parseInt(id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete article:', error);
      res.status(500).json({ error: 'Failed to delete article' });
    }
  });

  // Admin Community Events Management
  app.get('/api/admin/events', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await storage.getCommunityEvents();
      res.json({ events });
    } catch (error: any) {
      console.error('Failed to fetch events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.post('/api/admin/events', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, type, date, duration, maxParticipants, location, imageUrl, registrationRequired } = req.body;
      
      const eventData = {
        title,
        description,
        type: type || 'webinar',
        date: new Date(date),
        duration: duration || 60,
        maxParticipants: maxParticipants || 100,
        location: location || 'Online',
        imageUrl: imageUrl || null,
        registrationRequired: registrationRequired !== false,
        createdBy: req.user!.id
      };

      const event = await storage.createCommunityEvent(eventData);
      res.json({ success: true, event });
    } catch (error: any) {
      console.error('Failed to create event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  app.put('/api/admin/events/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, type, date, duration, maxParticipants, location, imageUrl, registrationRequired } = req.body;
      
      const updateData = {
        title,
        description,
        type,
        date: new Date(date),
        duration,
        maxParticipants,
        location,
        imageUrl: imageUrl || null,
        registrationRequired: registrationRequired !== false
      };

      const event = await storage.updateCommunityEvent(parseInt(id), updateData);
      res.json({ success: true, event });
    } catch (error: any) {
      console.error('Failed to update event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  app.delete('/api/admin/events/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCommunityEvent(parseInt(id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  // ===== SUPPORT SYSTEM ENDPOINTS =====

  // Support Tickets
  app.post('/api/support/tickets', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = createSupportTicketSchema.parse(req.body);
      
      const ticket = await supportService.createSupportTicket(userId, validatedData);
      res.status(201).json(ticket);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid ticket data", details: error.errors });
      }
      console.error('Error creating support ticket:', error);
      res.status(500).json({ error: "Failed to create support ticket" });
    }
  });

  app.get('/api/support/tickets', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const tickets = await supportService.getSupportTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ error: "Failed to fetch support tickets" });
    }
  });

  app.get('/api/support/tickets/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await supportService.getSupportTicket(userId, ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      res.status(500).json({ error: "Failed to fetch support ticket" });
    }
  });

  app.put('/api/support/tickets/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const validatedData = updateSupportTicketSchema.parse(req.body);
      
      const ticket = await supportService.updateSupportTicket(ticketId, validatedData);
      res.json(ticket);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error('Error updating support ticket:', error);
      res.status(500).json({ error: "Failed to update support ticket" });
    }
  });

  // Support Ticket Messages
  app.post('/api/support/tickets/:id/messages', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const ticketId = parseInt(req.params.id);
      const validatedData = createSupportTicketMessageSchema.parse({
        ...req.body,
        ticketId
      });
      
      const message = await supportService.createSupportTicketMessage(userId, validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid message data", details: error.errors });
      }
      console.error('Error creating support ticket message:', error);
      res.status(500).json({ error: "Failed to create support ticket message" });
    }
  });

  app.get('/api/support/tickets/:id/messages', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const messages = await supportService.getSupportTicketMessages(ticketId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching support ticket messages:', error);
      res.status(500).json({ error: "Failed to fetch support ticket messages" });
    }
  });

  // ===== RAILSR EMBEDDED FINANCE ENDPOINTS =====

  // Create Railsr Enduser (User Onboarding)
  app.post('/api/railsr/endusers', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { dateOfBirth, phone, address, nationality, identityDocument } = req.body;
      
      const enduserData = {
        id: '', // Will be set by Railsr
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth,
        phone,
        address,
        nationality,
        identityDocument,
      };

      const result = await railsrService.createEnduser(userId.toString(), enduserData);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          railsrEnduserId: result.railsrEnduserId,
          message: "Railsr enduser created successfully"
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error creating Railsr enduser:', error);
      res.status(500).json({ error: "Failed to create Railsr enduser" });
    }
  });

  // Get User's Railsr Wallets
  app.get('/api/railsr/wallets', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const wallets = await railsrService.getUserWallets(userId.toString());
      res.json({ wallets });
    } catch (error) {
      console.error('Error fetching user wallets:', error);
      res.status(500).json({ error: "Failed to fetch wallets" });
    }
  });

  // Create Railsr Wallet
  app.post('/api/railsr/wallets', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { currency = 'GBP', type = 'ledger' } = req.body;
      
      // Get user's Railsr enduser ID
      const wallets = await railsrService.getUserWallets(userId.toString());
      if (wallets.length === 0) {
        return res.status(400).json({ error: "No Railsr enduser found. Please complete onboarding first." });
      }

      const result = await railsrService.createWallet(wallets[0].railsrEnduserId, currency, type);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          walletId: result.walletId,
          message: "Wallet created successfully"
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({ error: "Failed to create wallet" });
    }
  });

  // Get Wallet Details
  app.get('/api/railsr/wallets/:walletId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { walletId } = req.params;
      const wallet = await railsrService.getWallet(walletId);
      res.json({ wallet });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  // Get Wallet Transactions
  app.get('/api/railsr/wallets/:walletId/transactions', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { walletId } = req.params;
      const { limit = 50 } = req.query;
      
      const transactions = await railsrService.getWalletTransactions(walletId, parseInt(limit as string));
      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      res.status(500).json({ error: "Failed to fetch wallet transactions" });
    }
  });

  // Get User's Railsr Cards
  app.get('/api/railsr/cards', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const cards = await railsrService.getUserCards(userId.toString());
      res.json({ cards });
    } catch (error) {
      console.error('Error fetching user cards:', error);
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });

  // Create Railsr Card
  app.post('/api/railsr/cards', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { walletId, type = 'virtual' } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const cardholderName = `${user.firstName} ${user.lastName}`;
      const result = await railsrService.createCard(walletId, type, cardholderName);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          cardId: result.cardId,
          message: "Card created successfully"
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error creating card:', error);
      res.status(500).json({ error: "Failed to create card" });
    }
  });

  // Get Card Details
  app.get('/api/railsr/cards/:cardId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { cardId } = req.params;
      const card = await railsrService.getCard(cardId);
      res.json({ card });
    } catch (error) {
      console.error('Error fetching card:', error);
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });

  // Activate Card
  app.put('/api/railsr/cards/:cardId/activate', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { cardId } = req.params;
      const result = await railsrService.activateCard(cardId);
      
      if (result.success) {
        res.json({
          success: true,
          message: "Card activated successfully"
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error activating card:', error);
      res.status(500).json({ error: "Failed to activate card" });
    }
  });

  // Set Card Limits
  app.put('/api/railsr/cards/:cardId/limits', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { cardId } = req.params;
      const { limits } = req.body;
      
      const result = await railsrService.setCardLimits(cardId, limits);
      
      if (result.success) {
        res.json({
          success: true,
          message: "Card limits updated successfully"
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error setting card limits:', error);
      res.status(500).json({ error: "Failed to set card limits" });
    }
  });

  // Create Transaction (Transfer/Payment)
  app.post('/api/railsr/transactions', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { fromWalletId, toWalletId, amount, currency, description, reference, metadata } = req.body;
      
      if (!fromWalletId || !amount || !currency || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const transferRequest = {
        fromWalletId,
        toWalletId,
        amount,
        currency,
        description,
        reference,
        metadata,
      };

      const result = await railsrService.createTransaction(transferRequest);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          transactionId: result.transactionId,
          message: "Transaction created successfully"
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // Get Transaction Details
  app.get('/api/railsr/transactions/:transactionId', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { transactionId } = req.params;
      const transaction = await railsrService.getTransaction(transactionId);
      res.json({ transaction });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  // Railsr Webhook Handler
  app.post('/api/railsr/webhooks', async (req, res) => {
    try {
      const webhookData = req.body;
      console.log('Received Railsr webhook:', webhookData);
      
      const result = await railsrService.processWebhook(webhookData);
      
      if (result.success) {
        res.status(200).json({ success: true, message: "Webhook processed successfully" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error processing Railsr webhook:', error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Get Railsr Dashboard Data
  app.get('/api/railsr/dashboard', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      const [wallets, cards] = await Promise.all([
        railsrService.getUserWallets(userId.toString()),
        railsrService.getUserCards(userId.toString())
      ]);

      // Calculate total balance across all wallets
      const totalBalance = wallets.reduce((sum, wallet) => {
        return sum + parseFloat(wallet.balance || '0');
      }, 0);

      // Get recent transactions from all wallets
      const recentTransactions = [];
      for (const wallet of wallets.slice(0, 3)) { // Limit to first 3 wallets
        try {
          const transactions = await railsrService.getWalletTransactions(wallet.railsrWalletId, 10);
          recentTransactions.push(...transactions);
        } catch (error) {
          console.error(`Error fetching transactions for wallet ${wallet.railsrWalletId}:`, error);
        }
      }

      // Sort transactions by date
      recentTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        summary: {
          totalWallets: wallets.length,
          totalCards: cards.length,
          totalBalance,
          activeWallets: wallets.filter(w => w.status === 'active').length,
          activeCards: cards.filter(c => c.status === 'active').length,
        },
        wallets: wallets.slice(0, 5), // Return first 5 wallets
        cards: cards.slice(0, 5), // Return first 5 cards
        recentTransactions: recentTransactions.slice(0, 10), // Return 10 most recent transactions
      });
    } catch (error) {
      console.error('Error fetching Railsr dashboard data:', error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // User Feedback
  app.post('/api/support/feedback', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const validatedData = createUserFeedbackSchema.parse({
        ...req.body,
        userAgent: req.get('User-Agent')
      });
      
      const feedback = await supportService.createUserFeedback(userId, validatedData);
      res.status(201).json(feedback);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid feedback data", details: error.errors });
      }
      console.error('Error creating user feedback:', error);
      res.status(500).json({ error: "Failed to create user feedback" });
    }
  });

  app.get('/api/support/feedback', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const feedback = await supportService.getUserFeedback(userId);
      res.json(feedback);
    } catch (error) {
      console.error('Error fetching user feedback:', error);
      res.status(500).json({ error: "Failed to fetch user feedback" });
    }
  });

  // FAQ Articles
  app.get('/api/support/faq', async (req, res) => {
    try {
      const category = req.query.category as string;
      const search = req.query.search as string;
      
      let articles;
      if (search) {
        articles = await supportService.searchFaqArticles(search);
      } else {
        articles = await supportService.getFaqArticles(category);
      }
      
      res.json(articles);
    } catch (error) {
      console.error('Error fetching FAQ articles:', error);
      res.status(500).json({ error: "Failed to fetch FAQ articles" });
    }
  });

  app.put('/api/support/faq/:id/view', async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      await supportService.incrementFaqView(articleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error incrementing FAQ view:', error);
      res.status(500).json({ error: "Failed to increment FAQ view" });
    }
  });

  app.post('/api/support/faq/:id/rate', async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const { isHelpful } = req.body;
      
      await supportService.rateFaqArticle(articleId, isHelpful);
      res.json({ success: true });
    } catch (error) {
      console.error('Error rating FAQ article:', error);
      res.status(500).json({ error: "Failed to rate FAQ article" });
    }
  });

  // Admin Support Management
  app.get('/api/admin/support/tickets', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tickets = await supportService.getAllSupportTickets();
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching all support tickets:', error);
      res.status(500).json({ error: "Failed to fetch all support tickets" });
    }
  });

  app.get('/api/admin/support/feedback', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const feedback = await supportService.getAllUserFeedback();
      res.json(feedback);
    } catch (error) {
      console.error('Error fetching all user feedback:', error);
      res.status(500).json({ error: "Failed to fetch all user feedback" });
    }
  });

  app.put('/api/admin/support/feedback/:id/status', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const { status, adminNotes } = req.body;
      
      const feedback = await supportService.updateFeedbackStatus(feedbackId, status, adminNotes);
      
      // Send real-time notification to feedback submitter
      const statusMessages = {
        'submitted': 'Your feedback has been submitted',
        'reviewed': 'Your feedback has been reviewed by our team',
        'implemented': 'Your feedback has been implemented! Thank you for your suggestion.'
      };
      
      const statusMessage = statusMessages[status as keyof typeof statusMessages];
      if (statusMessage) {
        notificationService.createSupportNotification(
          feedback.userId,
          'feedback_response',
          'Feedback Update',
          statusMessage,
          { feedbackId, feedbackTitle: feedback.title, status, adminNotes }
        );
        
        // Send real-time updates
        notificationService.sendUnreadCountUpdate(feedback.userId);
        notificationService.sendNotificationListUpdate(feedback.userId);
      }
      
      res.json(feedback);
    } catch (error) {
      console.error('Error updating feedback status:', error);
      res.status(500).json({ error: "Failed to update feedback status" });
    }
  });

  app.post('/api/admin/support/faq', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = createFaqArticleSchema.parse(req.body);
      const article = await supportService.createFaqArticle(validatedData);
      res.status(201).json(article);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid FAQ data", details: error.errors });
      }
      console.error('Error creating FAQ article:', error);
      res.status(500).json({ error: "Failed to create FAQ article" });
    }
  });

  app.put('/api/admin/support/faq/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const validatedData = updateFaqArticleSchema.parse(req.body);
      
      const article = await supportService.updateFaqArticle(articleId, validatedData);
      res.json(article);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid FAQ update data", details: error.errors });
      }
      console.error('Error updating FAQ article:', error);
      res.status(500).json({ error: "Failed to update FAQ article" });
    }
  });

  app.delete('/api/admin/support/faq/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const articleId = parseInt(req.params.id);
      await supportService.deleteFaqArticle(articleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting FAQ article:', error);
      res.status(500).json({ error: "Failed to delete FAQ article" });
    }
  });

  // Admin Support Ticket Management
  app.put('/api/admin/support/tickets/:id', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const updates = req.body;
      
      const ticket = await supportService.updateSupportTicket(ticketId, updates);
      
      // Send real-time notification to ticket creator about status change
      if (updates.status) {
        const statusMessages = {
          'open': 'Your support ticket is now open and being reviewed',
          'in_progress': 'Your support ticket is being worked on by our team',
          'resolved': 'Your support ticket has been resolved',
          'closed': 'Your support ticket has been closed'
        };
        
        const statusMessage = statusMessages[updates.status as keyof typeof statusMessages];
        if (statusMessage) {
          notificationService.createSupportNotification(
            ticket.userId,
            'ticket_status',
            'Support Ticket Status Update',
            statusMessage,
            { ticketId, ticketNumber: ticket.ticketNumber, status: updates.status }
          );
          
          // Send real-time updates
          notificationService.sendUnreadCountUpdate(ticket.userId);
          notificationService.sendNotificationListUpdate(ticket.userId);
        }
      }
      
      res.json(ticket);
    } catch (error) {
      console.error('Error updating support ticket:', error);
      res.status(500).json({ error: "Failed to update support ticket" });
    }
  });

  app.post('/api/admin/support/tickets/:id/reply', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const userId = req.userId!;
      const { message } = req.body;
      
      const reply = await supportService.createSupportTicketMessage(userId, {
        ticketId,
        message,
        isStaff: true
      });
      
      // Get the ticket details to find the user
      const ticket = await supportService.getSupportTicket(ticketId, ticketId);
      if (ticket) {
        // Send real-time notification to ticket creator
        notificationService.createSupportNotification(
          ticket.userId,
          'ticket_reply',
          'Support Ticket Reply',
          `You have a new reply on your support ticket: "${ticket.subject}"`,
          { ticketId, ticketNumber: ticket.ticketNumber }
        );
        
        // Send real-time updates
        notificationService.sendUnreadCountUpdate(ticket.userId);
        notificationService.sendNotificationListUpdate(ticket.userId);
      }
      
      res.status(201).json(reply);
    } catch (error) {
      console.error('Error creating ticket reply:', error);
      res.status(500).json({ error: "Failed to create ticket reply" });
    }
  });

  app.get('/api/admin/support/tickets/:id/messages', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const messages = await supportService.getSupportTicketMessages(ticketId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      res.status(500).json({ error: "Failed to fetch ticket messages" });
    }
  });

  app.get('/api/admin/support/statistics', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const statistics = await supportService.getSupportStatistics();
      res.json(statistics);
    } catch (error) {
      console.error('Error fetching support statistics:', error);
      res.status(500).json({ error: "Failed to fetch support statistics" });
    }
  });

  app.get('/api/admin/support/statistics', isAuthenticated, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const statistics = await supportService.getSupportStatistics();
      res.json(statistics);
    } catch (error) {
      console.error('Error fetching support statistics:', error);
      res.status(500).json({ error: "Failed to fetch support statistics" });
    }
  });

  // ===== WALLET MANAGEMENT API ROUTES =====

  // Get user's wallets
  app.get('/api/wallet/wallets', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const wallets = await storage.getUserWallets(userId);
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      res.status(500).json({ error: 'Failed to fetch wallets' });
    }
  });

  // Create a new wallet
  app.post('/api/wallet/create', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { currency = 'USD' } = req.body;

      const result = await walletService.createWallet(userId, currency);
      res.json(result);
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({ error: 'Failed to create wallet' });
    }
  });

  // Get wallet balance
  app.get('/api/wallet/:walletId/balance', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const balance = await walletService.getWalletBalance(walletId);
      
      if (!balance) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      res.json(balance);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      res.status(500).json({ error: 'Failed to fetch wallet balance' });
    }
  });

  // Process wallet transaction
  app.post('/api/wallet/transaction', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { walletId, type, amount, currency, description, reference, metadata } = req.body;

      const transactionRequest = {
        walletId,
        userId,
        type,
        amount,
        currency,
        description,
        reference,
        metadata
      };

      const result = await walletService.processTransaction(transactionRequest);
      res.json(result);
    } catch (error) {
      console.error('Error processing wallet transaction:', error);
      res.status(500).json({ error: 'Failed to process wallet transaction' });
    }
  });

  // Get wallet transaction history
  app.get('/api/wallet/:walletId/transactions', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await walletService.getTransactionHistory(walletId, limit, offset);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      res.status(500).json({ error: 'Failed to fetch wallet transactions' });
    }
  });

  // Get wallet statistics
  app.get('/api/wallet/stats', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const stats = await walletService.getWalletStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      res.status(500).json({ error: 'Failed to fetch wallet statistics' });
    }
  });

  // ===== REMITTANCE API ROUTES =====

  // Get exchange rates quote
  app.post('/api/remittance/quote', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { sendAmount, sendCurrency, receiveCurrency, deliveryMethod } = req.body;
      
      const quote = await remittanceService.getQuote(
        sendAmount,
        sendCurrency,
        receiveCurrency,
        deliveryMethod
      );
      
      res.json(quote);
    } catch (error) {
      console.error('Error getting remittance quote:', error);
      res.status(500).json({ error: 'Failed to get remittance quote' });
    }
  });

  // Initiate remittance transaction
  app.post('/api/remittance/initiate', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const remittanceData = { ...req.body, userId };
      
      const result = await remittanceService.initiateRemittance(remittanceData);
      res.json(result);
    } catch (error) {
      console.error('Error initiating remittance:', error);
      res.status(500).json({ error: 'Failed to initiate remittance' });
    }
  });

  // Get remittance status
  app.get('/api/remittance/:transactionId/status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const status = await remittanceService.getRemittanceStatus(transactionId);
      
      if (!status) {
        return res.status(404).json({ error: 'Remittance transaction not found' });
      }
      
      res.json(status);
    } catch (error) {
      console.error('Error fetching remittance status:', error);
      res.status(500).json({ error: 'Failed to fetch remittance status' });
    }
  });

  // Get remittance history
  app.get('/api/remittance/history', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await remittanceService.getRemittanceHistory(userId, limit, offset);
      res.json(history);
    } catch (error) {
      console.error('Error fetching remittance history:', error);
      res.status(500).json({ error: 'Failed to fetch remittance history' });
    }
  });

  // Save remittance recipient
  app.post('/api/remittance/recipients', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const recipientData = { ...req.body, userId };
      
      const result = await remittanceService.saveRecipient(recipientData);
      res.json(result);
    } catch (error) {
      console.error('Error saving remittance recipient:', error);
      res.status(500).json({ error: 'Failed to save remittance recipient' });
    }
  });

  // Get saved recipients
  app.get('/api/remittance/recipients', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const recipients = await remittanceService.getSavedRecipients(userId);
      res.json(recipients);
    } catch (error) {
      console.error('Error fetching saved recipients:', error);
      res.status(500).json({ error: 'Failed to fetch saved recipients' });
    }
  });

  // Cancel remittance
  app.post('/api/remittance/:transactionId/cancel', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const { reason } = req.body;
      
      const result = await remittanceService.cancelRemittance(transactionId, reason);
      res.json(result);
    } catch (error) {
      console.error('Error cancelling remittance:', error);
      res.status(500).json({ error: 'Failed to cancel remittance' });
    }
  });

  // Get supported countries
  app.get('/api/remittance/countries', async (req, res) => {
    try {
      const countries = await cymonzService.getSupportedCountries();
      res.json(countries);
    } catch (error) {
      console.error('Error fetching supported countries:', error);
      res.status(500).json({ error: 'Failed to fetch supported countries' });
    }
  });

  // Get supported currencies
  app.get('/api/remittance/currencies', async (req, res) => {
    try {
      const currencies = await cymonzService.getSupportedCurrencies();
      res.json(currencies);
    } catch (error) {
      console.error('Error fetching supported currencies:', error);
      res.status(500).json({ error: 'Failed to fetch supported currencies' });
    }
  });

  // Webhook endpoint for Cymonz notifications
  app.post('/api/remittance/webhook', async (req, res) => {
    try {
      const webhookData = req.body;
      
      // Process webhook data
      const result = await remittanceService.processWebhook(webhookData);
      
      if (result.success) {
        res.status(200).json({ message: 'Webhook processed successfully' });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error processing remittance webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    // Extract user ID from session or token
    let userId: number | null = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate' && data.userId) {
          userId = data.userId;
          notificationService.addWebSocketConnection(userId, ws);
          
          // Send initial notification count and list
          notificationService.sendUnreadCountUpdate(userId);
          notificationService.sendNotificationListUpdate(userId);
          
          ws.send(JSON.stringify({
            type: 'authenticated',
            success: true
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        notificationService.removeWebSocketConnection(userId, ws);
      }
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
