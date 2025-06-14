import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { storage } from "./storage";
import type { Request } from "express";

// Password encryption service
export class EncryptionService {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateMFABackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}

// Security logger for audit events
export class SecurityLogger {
  static async logAuthEvent(
    action: string,
    userId: number | null,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    details?: any
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        action,
        success,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        details: details ? JSON.stringify(details) : null,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  static async logSecurityEvent(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
    metadata?: any
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      metadata: metadata || {},
    };
    
    console.log(`[SECURITY-${level.toUpperCase()}] ${timestamp}: ${message}`, 
      metadata ? JSON.stringify(metadata) : '');
  }
}

// Rate limiting middleware
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req, res) => {
    SecurityLogger.logSecurityEvent(
      'Rate limit exceeded for authentication endpoint',
      'warn',
      { 
        ip: req.ip,
        endpoint: req.originalUrl,
        userAgent: req.get('User-Agent')
      }
    );
    res.status(429).json({
      error: "Too many authentication attempts from this IP, please try again later.",
    });
  },
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Input sanitization function
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Basic HTML/script tag removal and trimming
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

// Request sanitization middleware
export function sanitizeRequest(req: Request, res: any, next: any): void {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
}

// Password strength validator
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Password must contain at least one special character (@$!%*?&)");
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common, please choose a stronger password");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Email format validator
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone number validator (basic international format)
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}