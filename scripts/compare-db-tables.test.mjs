// @vitest-environment node
import assert from "node:assert/strict";
import { test } from "vitest";
import { compareTables, inspectDatabaseTables, loadExpectedTables } from "./compare-db-tables.mjs";

const expected = [
  { schema: "public", name: "users", columns: ["id", "email"] },
  { schema: "public", name: "passports", columns: ["id"] },
];

test("loads current schema rather than a hardcoded table inventory", async () => {
  const tables = await loadExpectedTables();
  const users = tables.find((table) => table.name === "users");
  assert.ok(users && users.columns.includes("firebase_uid"));
  assert.equal(users.rlsEnabled, true);
  assert.equal(new Set(tables.map((table) => `${table.schema}.${table.name}`)).size, tables.length);
});

test("separates missing and undeclared tables without guessing rename pairs", () => {
  const result = compareTables(expected, [
    { schema: "public", name: "users", columns: ["id", "legacy_column"] },
    { schema: "public", name: "legacy_passports", columns: ["id"] },
  ]);
  assert.deepEqual(result.missingTables, ["public.passports"]);
  assert.deepEqual(result.notDeclaredInCode, ["public.legacy_passports"]);
  assert.equal(result.possibleCreateRenameConflict, true);
  assert.deepEqual(result.columnDifferences, [
    { table: "public.users", missingColumns: ["email"], extraColumns: ["legacy_column"] },
  ]);
});

test("same table names in different schemas are not treated as matches", () => {
  assert.deepEqual(compareTables(expected, [{ schema: "auth", name: "users", columns: [] }]).matchingTableNames, []);
});

test("matching names do not claim complete schema compatibility", () => {
  const result = compareTables(expected, expected);
  assert.deepEqual(result.columnDifferences, []);
  assert.equal(result.possibleCreateRenameConflict, false);
  assert.match(result.scope, /Not a type/);
});

test("reports row-level-security mismatches without treating them as table renames", () => {
  const result = compareTables(
    [{ schema: "public", name: "users", columns: ["id"], rlsEnabled: true }],
    [{ schema: "public", name: "users", columns: ["id"], rlsEnabled: false }],
  );
  assert.deepEqual(result.rlsDifferences, [
    { table: "public.users", expected: true, actual: false },
  ]);
  assert.equal(result.possibleCreateRenameConflict, false);
});

function fixture(options = {}) {
  const queries = [];
  const logs = [];
  let config;
  let closed = false;
  const client = {
    connect: async () => {},
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (options.error) throw new Error(options.error);
      return { rows: sql.includes("pg_catalog") ? (options.rows ?? [
        { schema: "public", name: "users", column_name: "id" },
      ]) : [] };
    },
    end: async () => { closed = true; },
  };
  return {
    options: {
      connectionString: "postgresql://fake_user:fake_password@invalid.example/db?sslmode=no-verify",
      caFile: "/tmp/fake-public-ca.pem",
      expectedLoader: async () => expected,
      clientFactory: (value) => { config = value; return client; },
      logger: { log: (line) => logs.push(line), error: (line) => logs.push(line) },
    },
    queries, logs,
    config: () => config,
    closed: () => closed,
  };
}

test("reads catalogs in a read-only transaction with verified TLS and cleans up", async () => {
  const f = fixture();
  assert.equal(await inspectDatabaseTables(f.options), 0);
  assert.equal(f.queries[0].sql, "BEGIN READ ONLY");
  assert.equal(f.queries[2].sql, "ROLLBACK");
  assert.match(f.queries[1].sql, /pg_catalog.pg_attribute/);
  assert.match(f.queries[1].sql, /relrowsecurity/);
  assert.deepEqual(f.queries[1].params, [["public"]]);
  assert.ok(!f.queries.some(({ sql }) => /\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/.test(sql)));
  const url = new URL(f.config().connectionString);
  assert.equal(url.searchParams.get("sslmode"), "verify-full");
  assert.equal(url.searchParams.get("sslrootcert"), "/tmp/fake-public-ca.pem");
  assert.equal(f.closed(), true);
  assert.ok(f.logs.some((line) => line.startsWith("TABLE_COMPARISON ")));
});

test("query failures redact secrets and do not emit a successful report", async () => {
  const f = fixture({ error: "synthetic error fake_password" });
  assert.equal(await inspectDatabaseTables(f.options), 1);
  assert.equal(f.closed(), true);
  assert.ok(!f.logs.join("\n").includes("fake_password"));
  assert.ok(!f.logs.some((line) => line.startsWith("TABLE_COMPARISON ")));
});

test("invalid configuration and oversized catalog reports fail explicitly", async () => {
  const f = fixture();
  assert.equal(await inspectDatabaseTables({ ...f.options, connectionString: "" }), 1);
  assert.equal(f.queries.length, 0);
  const big = fixture({ rows: Array(10001).fill({ schema: "public", name: "users", column_name: "id" }) });
  assert.equal(await inspectDatabaseTables(big.options), 1);
  assert.ok(!big.logs.some((line) => line.startsWith("TABLE_COMPARISON ")));
});
