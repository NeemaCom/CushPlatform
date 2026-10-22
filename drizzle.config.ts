import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
if (process.env.DATABASE_CA_CERT_FILE) {
  // Keep the schema push's TLS policy identical to the read-only preflight.
  databaseUrl.searchParams.set("sslrootcert", process.env.DATABASE_CA_CERT_FILE);
  databaseUrl.searchParams.set("sslmode", "verify-full");
  databaseUrl.searchParams.delete("uselibpqcompat");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl.toString(),
  },
});
