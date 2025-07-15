import { randomBytes } from 'crypto';

/**
 * Generate a unique referral code
 */
export function generateReferralCode(): string {
  const prefix = 'CUSH';
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}_${randomPart}`;
}

/**
 * Generate a tracking link for a referral code
 */
export function generateTrackingLink(referralCode: string): string {
  const baseUrl = process.env.REPLIT_DOMAIN || 'https://cushglobal.replit.app';
  return `${baseUrl}/referral/${referralCode}`;
}

/**
 * Extract referral code from tracking link
 */
export function extractReferralCode(trackingLink: string): string | null {
  const match = trackingLink.match(/\/referral\/([A-Z0-9_]+)$/);
  return match ? match[1] : null;
}

/**
 * Validate referral code format
 */
export function validateReferralCode(code: string): boolean {
  return /^CUSH_[A-Z0-9]{8}$/.test(code);
}

/**
 * Generate partner application URL with tracking
 */
export function generatePartnerApplicationUrl(partnerBaseUrl: string, referralCode: string, userId: number): string {
  const url = new URL(partnerBaseUrl);
  url.searchParams.set('ref', referralCode);
  url.searchParams.set('source', 'cushglobal');
  url.searchParams.set('uid', userId.toString());
  return url.toString();
}

/**
 * Create commission tracking identifier
 */
export function generateCommissionTrackingId(referralId: number): string {
  const timestamp = Date.now().toString(36);
  const referralPart = referralId.toString(36).padStart(4, '0');
  return `COMM_${referralPart}_${timestamp}`.toUpperCase();
}

/**
 * Calculate commission percentage from decimal
 */
export function formatCommissionRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Generate webhook verification token
 */
export function generateWebhookToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Verify webhook signature (basic implementation)
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}