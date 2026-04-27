/**
 * Cush Passport V1 — Database Migration
 * Uses the app's shared drizzle db connection (neon-http).
 * Idempotent: CREATE TABLE IF NOT EXISTS.
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function runPassportMigrations() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS passports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        confidence_score INTEGER NOT NULL DEFAULT 0,
        mode TEXT NOT NULL DEFAULT 'pre_arrival',
        share_token TEXT UNIQUE,
        score_breakdown JSONB,
        reason_codes TEXT[],
        generated_at TIMESTAMP,
        last_updated TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS financial_signals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        passport_id INTEGER NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
        signal_type TEXT NOT NULL,
        label TEXT NOT NULL,
        raw_amount_cents BIGINT NOT NULL,
        currency_code TEXT NOT NULL,
        normalized_value DECIMAL(10,4),
        country TEXT NOT NULL,
        verification_status TEXT NOT NULL DEFAULT 'SELF_REPORTED',
        period TEXT DEFAULT 'monthly',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS evidence_vault (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        passport_id INTEGER NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL,
        label TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SELF_REPORTED',
        tier INTEGER NOT NULL DEFAULT 1,
        score_boost INTEGER NOT NULL DEFAULT 0,
        file_data TEXT,
        file_name TEXT,
        admin_notes TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("[passport-migrations] ✓ Passport V1 tables ready");
  } catch (err: any) {
    // Log but don't crash — tables may already exist, or DB may be warming up
    console.warn("[passport-migrations] Migration warning:", err?.message ?? err);
  }
}
