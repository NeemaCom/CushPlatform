import { pathToFileURL } from "node:url";

const hints = {
  ENETUNREACH: "The runner cannot reach this network. For a Supabase direct endpoint, check IPv6 support or use the Supabase session pooler.",
  EHOSTUNREACH: "The runner cannot reach the database host. Check network restrictions.",
  ENOTFOUND: "The database hostname could not be resolved. Check the connection string's hostname.",
  EAI_AGAIN: "DNS resolution failed temporarily.",
  ECONNREFUSED: "The host refused the connection. Check the hostname, port, and database availability.",
  ETIMEDOUT: "The connection timed out. Check network restrictions and database availability.",
  "28P01": "Password authentication failed. Use the database password, not a Supabase API key.",
  "28000": "Database authentication was rejected. Check the database username and connection settings.",
  "3D000": "The requested database does not exist.",
  "57P03": "The database is not currently accepting connections.",
  DEPTH_ZERO_SELF_SIGNED_CERT: "TLS certificate verification failed. Check the database's certificate requirements.",
  SELF_SIGNED_CERT_IN_CHAIN: "TLS certificate verification failed. Check the database's certificate requirements.",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "TLS certificate verification failed. Check the database's certificate requirements.",
  CERT_HAS_EXPIRED: "The database TLS certificate has expired.",
};

export function parseDatabaseUrl(value) {
  if (!value) {
    throw new Error("DATABASE_URL is missing.");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL. Supply only the PostgreSQL connection string.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || value !== value.trim()) {
    throw new Error("DATABASE_URL must be a PostgreSQL URL with no surrounding whitespace.");
  }
  return url;
}

export function createRedactor(connectionString, url) {
  const secrets = new Set([connectionString]);
  for (const credential of [url.username, url.password]) {
    if (!credential) continue;
    secrets.add(credential);
    try {
      const decoded = decodeURIComponent(credential);
      secrets.add(decoded);
      secrets.add(encodeURIComponent(decoded));
    } catch {
      // Keep the original encoded credential masked even if decoding fails.
    }
  }
  // Query parameters can also contain credentials or other sensitive values.
  for (const value of url.searchParams.values()) {
    if (value) secrets.add(value);
  }
  const ordered = [...secrets].filter(Boolean).sort((a, b) => b.length - a.length);
  return (value) => {
    let text = String(value).replace(
      /(?:postgres(?:ql)?|https?):\/\/[^\s"'<>]+/gi,
      "[REDACTED URL]",
    );
    for (const secret of ordered) {
      text = text.split(secret).join("[REDACTED]");
    }
    return text;
  };
}

export function describeErrors(error, redact, depth = 0) {
  if (depth > 3) return [];
  const code = typeof error?.code === "string" && /^[a-z0-9_]{1,64}$/i.test(error.code)
    ? error.code
    : "UNKNOWN";
  const message = redact(error?.message || "No error message was supplied by the driver.");
  const details = [{ code, message, ...(hints[code] ? { hint: hints[code] } : {}) }];
  const children = [
    ...(Array.isArray(error?.errors) ? error.errors : []),
    ...(error?.cause ? [error.cause] : []),
  ].slice(0, 8);
  for (const child of children) {
    details.push(...describeErrors(child, redact, depth + 1));
  }
  return details;
}

export async function checkDatabaseConnection({
  connectionString = process.env.DATABASE_URL,
  clientFactory,
  logger = console,
} = {}) {
  let url;
  try {
    url = parseDatabaseUrl(connectionString);
  } catch (error) {
    // Never print the parser's original exception or an invalid secret.
    logger.error(error.message);
    return 1;
  }
  const redact = createRedactor(connectionString, url);
  logger.log("Database connection target: " + JSON.stringify({
    host: url.hostname,
    port: url.port || "5432",
  }));
  let client;
  let exitCode = 0;
  try {
    if (!clientFactory) {
      const { default: pg } = await import("pg");
      clientFactory = (config) => new pg.Client(config);
    }
    client = clientFactory({
      connectionString,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
      statement_timeout: 10_000,
      application_name: "cush-read-only-connection-check",
    });
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const result = await client.query("SELECT 1 AS connection_ok");
    if (result.rows?.[0]?.connection_ok !== 1) {
      throw new Error("The read-only connection query returned an unexpected result.");
    }
    await client.query("ROLLBACK");
  } catch (error) {
    exitCode = 1;
    logger.error("Database connection check failed: " + JSON.stringify(describeErrors(error, redact)));
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (error) {
        exitCode = 1;
        logger.error("Database connection cleanup failed: " + JSON.stringify(describeErrors(error, redact)));
      }
    }
  }
  if (exitCode === 0) {
    logger.log("Database connection check passed: authenticated and completed a read-only query. No schema changes were made.");
  }
  return exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await checkDatabaseConnection();
}
