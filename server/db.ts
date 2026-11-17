import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  throw new Error(
    "DATABASE_URL or PGHOST must be set. Did you forget to provision a database?",
  );
}

// Prefer the same DATABASE_URL that drizzle-kit push uses so the app reads the
// schema created during the build. PG* remains a fallback when no URL is set.
export const pgPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT ?? "5432"),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

// The workspace lockfile resolves multiple @types/pg versions; the runtime
// Pool instance is still the same pg implementation used by Drizzle.
export const db = drizzle(pgPool as never, { schema });

let cushVerifyPgPool: Pool | undefined;
let cushVerifyDatabase: typeof db | undefined;

/**
 * Cush Verify has its own Supabase project. It must never silently reuse the
 * Passport database in production or development. Unit tests may explicitly
 * reuse the mocked/default client when no Verify URL is provided.
 */
export function getCushVerifyPgPool(): Pool {
  if (cushVerifyPgPool) return cushVerifyPgPool;

  const connectionString = process.env.CUSH_VERIFY_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("CUSH_VERIFY_DATABASE_URL must point to the dedicated Cush Verify database.");
  }

  cushVerifyPgPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  return cushVerifyPgPool;
}

export function getCushVerifyDb(): typeof db {
  if (cushVerifyDatabase) return cushVerifyDatabase;

  if (!process.env.CUSH_VERIFY_DATABASE_URL?.trim()) {
    if (process.env.NODE_ENV === "test") return db;
    throw new Error("CUSH_VERIFY_DATABASE_URL must point to the dedicated Cush Verify database.");
  }

  cushVerifyDatabase = drizzle(getCushVerifyPgPool() as never, { schema });
  return cushVerifyDatabase;
}

/**
 * Lazy proxy keeps pure unit tests and module imports database-free while
 * ensuring every Verify query resolves to its dedicated database at runtime.
 */
export const cushVerifyDb = new Proxy({} as typeof db, {
  get(_target, property) {
    const database = getCushVerifyDb();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
