import session, { type Store } from "express-session";

export async function createPostgresSessionStore(): Promise<Store> {
  const [{ pgPool }, connectPgSimpleModule] = await Promise.all([
    import("./db"),
    import("connect-pg-simple"),
  ]);
  const connectPgSimple = connectPgSimpleModule.default;

  try {
    await pgPool.query("SELECT 1 FROM public.cush_sessions LIMIT 0");
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    throw new Error(
      `PostgreSQL session storage is unavailable. Apply migrations/manual/create-cush-sessions-table.sql before starting the server.${detail}`,
    );
  }

  const PgSessionStore = connectPgSimple(session);
  return new PgSessionStore({
    pool: pgPool,
    schemaName: "public",
    tableName: "cush_sessions",
    createTableIfMissing: false,
    pruneSessionInterval: 15 * 60,
  });
}
