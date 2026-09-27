import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
if (process.env.NODE_ENV === "production") {
  // Drizzle Kit's URL credentials ignore a separate `ssl` field. The pg driver
  // interprets this URL option as { rejectUnauthorized: false }.
  databaseUrl.searchParams.set("sslmode", "no-verify");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl.toString(),
  },
});
