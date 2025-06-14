import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import session from "express-session";
import passport from "passport";
import { storage } from "./storage";
import { setupGoogleAuth } from "./google-auth";
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
  type RegisterEvent
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

  // Enhanced login endpoint
  app.post("/api/auth/signin", authRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      // Support login with either username or email
      let user = await storage.getUserByUsername(username);
      if (!user) {
        // Try to find user by email if username lookup failed
        user = await storage.getUserByEmail(username);
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
  });

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

      // In production, send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
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
          { name: "Housing", amount: 1200, color: "#2563eb" },
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
      const transactions = await storage.getRecentTransactions(userId, 10);
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

      // Generate AI response using Gemini
      const aiResponse = await geminiService.generateResponse(message, context);

      // Store chat message in database
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

  const httpServer = createServer(app);
  return httpServer;
}
