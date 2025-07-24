import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { SecurityLogger } from "./security";
import { firebaseAdminService } from "./firebase-admin-service";
import type { User, SafeUser } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: string;
    lastActivity?: number;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
  userId?: number;
}

// Authentication middleware
export async function isAuthenticated(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let userId = req.session.userId;
    let user: User | null = null;
    
    // First, try Firebase ID token authentication
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7);
      
      try {
        const decodedToken = await firebaseAdminService.verifyIdToken(idToken);
        if (decodedToken && decodedToken.uid) {
          console.log('🔑 Valid Firebase token received for:', decodedToken.email);
          
          // Find user by Firebase UID
          user = await storage.getUserByFirebaseUid(decodedToken.uid) || null;
          if (user) {
            userId = user.id;
            
            // Update session for future requests
            req.session.userId = user.id;
            req.session.role = user.role || 'customer';
            req.session.lastActivity = Date.now();
            
            console.log('✅ Firebase authentication successful for user:', user.email);
          } else {
            console.log('❌ No user found for Firebase UID:', decodedToken.uid);
          }
        }
      } catch (firebaseError) {
        console.error('❌ Firebase token verification failed:', firebaseError);
        // Continue to session-based authentication
      }
    }
    
    // Fallback to session-based authentication
    if (!userId) {
      userId = req.session.userId;
    }
    
    if (!userId) {
      SecurityLogger.logAuthEvent(
        'unauthorized_access_attempt',
        null,
        false,
        req.ip,
        req.get('User-Agent'),
        { endpoint: req.originalUrl }
      );
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Check session timeout (24 hours)
    const lastActivity = req.session.lastActivity || 0;
    const now = Date.now();
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

    if (now - lastActivity > SESSION_TIMEOUT) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
      
      SecurityLogger.logAuthEvent(
        'session_timeout',
        userId,
        false,
        req.ip,
        req.get('User-Agent')
      );
      
      res.status(401).json({ error: "Session expired" });
      return;
    }

    // Update last activity
    req.session.lastActivity = now;

    // Get user data (if not already retrieved from Firebase)
    if (!user) {
      user = await storage.getUser(userId) || null;
    }
    if (!user) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
      
      SecurityLogger.logAuthEvent(
        'invalid_user_session',
        userId,
        false,
        req.ip,
        req.get('User-Agent')
      );
      
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    // Create safe user object (without sensitive data)
    const safeUser: SafeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      nationality: user.nationality,
      profilePicture: user.profilePicture,
      gender: user.gender,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      acceptTerms: user.acceptTerms,
      acceptPrivacy: user.acceptPrivacy,
      marketingConsent: user.marketingConsent,
      firebaseUid: user.firebaseUid,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      firebaseUid: user.firebaseUid,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    req.user = safeUser;
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    SecurityLogger.logAuthEvent(
      'auth_middleware_error',
      req.session.userId || null,
      false,
      req.ip,
      req.get('User-Agent'),
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    
    res.status(500).json({ error: "Authentication error" });
  }
}

// Admin role middleware
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    SecurityLogger.logAuthEvent(
      'unauthorized_admin_access',
      req.userId || null,
      false,
      req.ip,
      req.get('User-Agent'),
      { endpoint: req.originalUrl }
    );
    
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// Customer role middleware
export function requireCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'customer') {
    SecurityLogger.logAuthEvent(
      'unauthorized_customer_access',
      req.userId || null,
      false,
      req.ip,
      req.get('User-Agent'),
      { endpoint: req.originalUrl }
    );
    
    res.status(403).json({ error: "Customer access required" });
    return;
  }
  next();
}

// Helper function to get current user ID
export function getUserId(req: AuthenticatedRequest): number | null {
  return req.userId || null;
}

// Helper function to get current user
export function getCurrentUser(req: AuthenticatedRequest): SafeUser | null {
  return req.user || null;
}

// Helper function to create safe user object
export function createSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    nationality: user.nationality,
    profilePicture: user.profilePicture,
    gender: user.gender,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    acceptTerms: user.acceptTerms,
    acceptPrivacy: user.acceptPrivacy,
    marketingConsent: user.marketingConsent,
    mfaEnabled: user.mfaEnabled,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}