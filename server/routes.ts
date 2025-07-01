import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import session from "express-session";
import passport from "passport";
import { storage } from "./storage";
import { setupGoogleAuth } from "./google-auth";
import { aiAnalyticsService } from "./ai-analytics-service";
import { loanService } from "./loan-service";
import { loanPreQualificationSchema, type LoanPreQualificationForm } from "../shared/schema";
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
  type InsertJobListing
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

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Setup Google OAuth routes
  setupGoogleAuth(app);

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
      const user = await storage.createUser({
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
    
    req.session.destroy((err) => {
      if (err) {
        SecurityLogger.logAuthEvent(
          'logout_error',
          userId || null,
          false,
          req.ip,
          req.get('User-Agent'),
          { error: err.message }
        );
        return res.status(500).json({ error: "Logout failed" });
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

      const dashboardData = {
        user: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          initials: `${user.firstName[0]}${user.lastName[0]}`.toUpperCase(),
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
      };

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

  // ===== LOAN REFERRAL SYSTEM ENDPOINTS =====

  // Submit loan pre-qualification
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

  const httpServer = createServer(app);
  return httpServer;
}
