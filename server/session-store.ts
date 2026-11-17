import session, { type Store } from "express-session";

async function createPostgresSessionStoreFor(
  pool: import("pg").Pool,
  tableName: "cush_sessions" | "cush_verify_sessions",
): Promise<Store> {
  const connectPgSimpleModule = await import("connect-pg-simple");
  const connectPgSimple = connectPgSimpleModule.default;

  try {
    await pool.query(`SELECT 1 FROM public.${tableName} LIMIT 0`);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    throw new Error(
      `PostgreSQL session storage is unavailable. Apply the migration that creates public.${tableName} before starting the server.${detail}`,
    );
  }

  const PgSessionStore = connectPgSimple(session);
  return new PgSessionStore({
    // connect-pg-simple and the root app currently resolve different @types/pg
    // versions; both use the same runtime pg Pool implementation.
    pool: pool as never,
    schemaName: "public",
    tableName,
    createTableIfMissing: false,
    pruneSessionInterval: 15 * 60,
  });
}

export async function createPostgresSessionStore(): Promise<Store> {
  const [{ pgPool }] = await Promise.all([
    import("./db"),
  ]);
  return createPostgresSessionStoreFor(pgPool, "cush_sessions");
}

export async function createCushVerifyPostgresSessionStore(): Promise<Store> {
  const { getCushVerifyPgPool } = await import("./db");
  return createPostgresSessionStoreFor(
    getCushVerifyPgPool(),
    "cush_verify_sessions",
  );
}
