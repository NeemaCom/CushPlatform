import assert from "node:assert/strict";
import { test } from "vitest";
import {
  checkDatabaseConnection,
  createRedactor,
  describeErrors,
  parseDatabaseUrl,
} from "./check-db-connection.mjs";

// Synthetic credentials only; these tests never read a real secret or connect.
const password = "synthetic/p@ss:word";
const encoded = encodeURIComponent(password);
const connectionString = `postgresql://diagnostic_user:${encoded}@example.invalid:5432/postgres`;

function fixture({ connectError, queryError, endError, badResult = false } = {}) {
  const lines = [];
  const queries = [];
  let ended = false;
  let config;
  return {
    lines,
    queries,
    get ended() { return ended; },
    get config() { return config; },
    options: {
      connectionString,
      logger: { log: (line) => lines.push(line), error: (line) => lines.push(line) },
      clientFactory: (options) => {
        config = options;
        return {
          async connect() { if (connectError) throw connectError; },
          async query(sql) {
            queries.push(sql);
            if (queryError) throw queryError;
            return { rows: badResult ? [] : [{ connection_ok: 1 }] };
          },
          async end() {
            ended = true;
            if (endError) throw endError;
          },
        };
      },
    },
  };
}

test("success executes only a read-only transaction and closes the client", async () => {
  const f = fixture();
  assert.equal(await checkDatabaseConnection(f.options), 0);
  assert.deepEqual(f.queries, ["BEGIN READ ONLY", "SELECT 1 AS connection_ok", "ROLLBACK"]);
  assert.equal(f.ended, true);
  assert.equal(f.config.connectionTimeoutMillis, 10_000);
  assert.equal(f.config.query_timeout, 10_000);
  assert.ok(f.lines.some((line) => line.includes("check passed")));
  assert.ok(!f.lines.join("\n").includes(connectionString));
});

test("missing, malformed, and non-PostgreSQL secrets fail before creating a client", async () => {
  for (const value of ["", "DATABASE_URL=not-a-url", "https://example.invalid", ` ${connectionString}`]) {
    const f = fixture();
    assert.equal(await checkDatabaseConnection({ ...f.options, connectionString: value }), 1);
    assert.equal(f.config, undefined);
    assert.ok(!f.lines.join("\n").includes(password));
    assert.ok(!f.lines.join("\n").includes(connectionString));
  }
});

test("authentication failures retain error codes but redact raw and encoded credentials", async () => {
  const error = Object.assign(
    new Error(`Failed ${connectionString}; password=${password}; encoded=${encoded}; user=diagnostic_user`),
    { code: "28P01" },
  );
  const f = fixture({ connectError: error });
  assert.equal(await checkDatabaseConnection(f.options), 1);
  assert.equal(f.ended, true);
  assert.deepEqual(f.queries, []);
  const output = f.lines.join("\n");
  for (const secret of [connectionString, password, encoded, "diagnostic_user"]) {
    assert.ok(!output.includes(secret));
  }
  assert.ok(output.includes("28P01"));
  assert.ok(output.includes("Password authentication failed"));
});

test("aggregate network errors expose underlying codes and actionable hints", async () => {
  const error = new AggregateError([
    Object.assign(new Error("IPv6 unreachable"), { code: "ENETUNREACH" }),
    Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT" }),
  ]);
  const f = fixture({ connectError: error });
  assert.equal(await checkDatabaseConnection(f.options), 1);
  const output = f.lines.join("\n");
  assert.ok(output.includes("ENETUNREACH"));
  assert.ok(output.includes("Supabase session pooler"));
  assert.ok(output.includes("ETIMEDOUT"));
});

test("TLS failures are reported without weakening certificate verification", async () => {
  const error = Object.assign(new Error("self signed certificate in certificate chain"), {
    code: "SELF_SIGNED_CERT_IN_CHAIN",
  });
  const f = fixture({ connectError: error });
  assert.equal(await checkDatabaseConnection(f.options), 1);
  assert.equal(f.config.ssl, undefined);
  assert.ok(f.lines.join("\n").includes("TLS certificate verification failed"));
});

test("query and cleanup failures return nonzero and redact credentials", async () => {
  for (const failures of [
    { queryError: new Error(`query failed: ${password}`) },
    { endError: new Error(`cleanup failed: ${encoded}`) },
    { badResult: true },
  ]) {
    const f = fixture(failures);
    assert.equal(await checkDatabaseConnection(f.options), 1);
    assert.equal(f.ended, true);
    assert.ok(!f.lines.join("\n").includes(password));
    assert.ok(!f.lines.join("\n").includes(encoded));
    assert.ok(!f.lines.some((line) => line.includes("check passed")));
  }
});

test("URL query values and nested causes are also redacted", () => {
  const value = `${connectionString}?sslpassword=synthetic-query-secret`;
  const redact = createRedactor(value, parseDatabaseUrl(value));
  const error = new Error("outer", {
    cause: new Error(`password=${password}, sslpassword=synthetic-query-secret`),
  });
  const output = JSON.stringify(describeErrors(error, redact));
  assert.ok(!output.includes(password));
  assert.ok(!output.includes("synthetic-query-secret"));
  assert.ok(output.includes("[REDACTED]"));
});
