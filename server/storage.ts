import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// ─── Storage Interface ────────────────────────────────────────────────────────

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(data: Partial<InsertUser> & { email: string; username: string; passwordHash: string; firstName: string; lastName: string; acceptTerms: boolean; acceptPrivacy: boolean }): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  savePasswordResetToken(userId: number, token: string, expires: Date): Promise<void>;
  clearPasswordResetToken(userId: number): Promise<void>;
  createAuditLog(entry: { userId: number | null; action: string; success: boolean; ipAddress: string | null; userAgent: string | null; details: string | null }): Promise<void>;
}

// ─── Database Storage ─────────────────────────────────────────────────────────

class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async createUser(data: Partial<InsertUser> & { email: string; username: string; passwordHash: string; firstName: string; lastName: string; acceptTerms: boolean; acceptPrivacy: boolean }): Promise<User> {
    const [user] = await db.insert(users).values({
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber ?? null,
      nationality: data.nationality ?? null,
      profilePicture: data.profilePicture ?? null,
      firebaseUid: data.firebaseUid ?? null,
      role: data.role ?? "customer",
      isEmailVerified: data.isEmailVerified ?? false,
      acceptTerms: data.acceptTerms,
      acceptPrivacy: data.acceptPrivacy,
      marketingConsent: data.marketingConsent ?? false,
    }).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async savePasswordResetToken(userId: number, token: string, expires: Date): Promise<void> {
    await db.update(users).set({ passwordResetToken: token, passwordResetExpires: expires }).where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: number): Promise<void> {
    await db.update(users).set({ passwordResetToken: null, passwordResetExpires: null }).where(eq(users.id, userId));
  }

  async createAuditLog(entry: { userId: number | null; action: string; success: boolean; ipAddress: string | null; userAgent: string | null; details: string | null }): Promise<void> {
    // Logged to console only — audit table removed in V1 purge
    console.log(`[AUDIT] ${entry.action} user=${entry.userId} ok=${entry.success}`);
  }
}

export const storage = new DatabaseStorage();
