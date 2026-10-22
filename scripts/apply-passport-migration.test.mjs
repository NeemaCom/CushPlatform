// @vitest-environment node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "vitest";
import { applyPassportMigration } from "./apply-passport-migration.mjs";
import {
  createdTables, preservedTables, loadMigrationContract,
  validateMigrationSql, verifyNewTables,
} from "./passport-migration-contract.mjs";

const contractPromise = loadMigrationContract();
const sqlPromise = readFile(new URL("../migrations/manual/create-passport-tables.sql", import.meta.url), "utf8");

function syntheticNewRows(contract) {
  return createdTables.map((name) => {
    const expected = contract.tables[`public.${name}`];
    return {
      name, oid: "test-" + name, rls: false, force_rls: false, acl: null, indexes: [],
      columns: Object.values(expected.columns).map((column) => ({
        name: column.name,
        type: column.type === "serial" ? "integer" : column.type === "timestamp" ? "timestamp without time zone" : column.type,
        notNull: column.notNull,
        default: column.type === "serial" ? "nextval('synthetic_sequence'::regclass)" : column.default ?? null,
      })),
      constraints: [
        { name: name + "_pkey", type: "p", valid: true, definition: "PRIMARY KEY (id)" },
        ...Object.values(expected.foreignKeys).map((fk) => ({
          name: fk.name, type: "f", valid: true,
          definition: `FOREIGN KEY (${fk.columnsFrom.join(", ")}) REFERENCES ${fk.tableTo}(${fk.columnsTo.join(", ")}) ON DELETE CASCADE`,
        })),
        ...Object.values(expected.uniqueConstraints).map((unique) => ({
          name: unique.name, type: "u", valid: true, definition: `UNIQUE (${unique.columns.join(", ")})`,
        })),
      ],
    };
  });
}

async function fixture(options = {}) {
  const contract = await contractPromise;
  const sql = await sqlPromise;
  const before = preservedTables.map((name) => ({
    name, oid: "old-" + name, columns: [], constraints: [], indexes: [], rls: false, force_rls: false, acl: null,
  }));
  const after = [...structuredClone(before), ...syntheticNewRows(contract)].sort((a, b) => a.name.localeCompare(b.name));
  if (options.mutateAfter) options.mutateAfter(after);
  const queries = [];
  const logs = [];
  let inspections = 0;
  let closed = false;
  let config;
  const client = {
    connect: async () => {},
    query: async (statement, params) => {
      queries.push({ statement, params });
      if (options.failOn && statement.includes(options.failOn)) throw new Error("synthetic failure secret_test_password");
      if (statement.includes("FROM pg_catalog.pg_class c")) {
        return { rows: inspections++ === 0 ? (options.before ?? before) : after };
      }
      return { rows: [] };
    },
    end: async () => { closed = true; },
  };
  return {
    config: () => config, closed: () => closed, queries, logs,
    options: {
      connectionString: "postgresql://synthetic_user:secret_test_password@invalid.example/db?sslmode=no-verify",
      caFile: "/tmp/public-test-ca.pem",
      sqlLoader: async () => sql,
      contractLoader: async () => contract,
      clientFactory: (value) => { config = value; return client; },
      logger: { log: (line) => logs.push(line), error: (line) => logs.push(line) },
    },
  };
}

test("reviewed SQL matches generated code schema and only creates approved tables", async () => {
  const statements = validateMigrationSql(await sqlPromise, await contractPromise);
  assert.equal(statements.length, 8);
  assert.equal(statements.filter((sql) => sql.startsWith("CREATE TABLE")).length, 3);
  assert.ok(!statements.some((sql) => /^(DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b/.test(sql)));
  assert.ok(!statements.some((sql) => /^ALTER TABLE "public"\."(users|cush|session)"/.test(sql)));
});

test("schema drift or appended destructive SQL fails before connecting", async () => {
  const contract = await contractPromise;
  const sql = await sqlPromise;
  assert.throws(() => validateMigrationSql(sql + "\nDROP TABLE users;", contract));
  const f = await fixture();
  assert.equal(await applyPassportMigration({ ...f.options, sqlLoader: async () => "DROP TABLE users;" }), 1);
  assert.equal(f.queries.length, 0);
});

test("commits only after verifying new definitions and preserving existing tables", async () => {
  const f = await fixture();
  assert.equal(await applyPassportMigration(f.options), 0);
  assert.equal(f.queries[0].statement, "BEGIN");
  assert.equal(f.queries.at(-1).statement, "COMMIT");
  assert.ok(!f.queries.some((q) => q.statement === "ROLLBACK"));
  assert.ok(f.queries.some((q) => q.statement.includes("pg_advisory_xact_lock")));
  assert.equal(f.closed(), true);
  const url = new URL(f.config().connectionString);
  assert.equal(url.searchParams.get("sslmode"), "verify-full");
  assert.equal(url.searchParams.get("sslrootcert"), "/tmp/public-test-ca.pem");
  assert.ok(f.logs.some((line) => line.startsWith("PASSPORT_MIGRATION_COMMITTED:")));
});

test("repeated/partial migration or missing protected tables refuses before DDL", async () => {
  for (const before of [
    [],
    [...preservedTables.map((name) => ({ name })), { name: "passports" }],
  ]) {
    const f = await fixture({ before });
    assert.equal(await applyPassportMigration(f.options), 1);
    assert.ok(!f.queries.some((q) => q.statement.startsWith("CREATE TABLE")));
    assert.equal(f.queries.at(-1).statement, "ROLLBACK");
  }
});

test("DDL failure rolls back, redacts errors, and never claims commit", async () => {
  const f = await fixture({ failOn: 'CREATE TABLE "public"."financial_signals"' });
  assert.equal(await applyPassportMigration(f.options), 1);
  assert.equal(f.queries.at(-1).statement, "ROLLBACK");
  assert.ok(!f.queries.some((q) => q.statement === "COMMIT"));
  assert.ok(!f.logs.join("\n").includes("secret_test_password"));
  assert.ok(!f.logs.some((line) => line.startsWith("PASSPORT_MIGRATION_COMMITTED:")));
});

test("changed protected definitions roll back rather than commit", async () => {
  const f = await fixture({ mutateAfter: (rows) => { rows.find((r) => r.name === "users").oid = "changed"; } });
  assert.equal(await applyPassportMigration(f.options), 1);
  assert.equal(f.queries.at(-1).statement, "ROLLBACK");
});

test("incorrect new column types/defaults/nullability and constraints are rejected", async () => {
  const contract = await contractPromise;
  for (const mutate of [
    (rows) => { rows[0].columns[0].type = "text"; },
    (rows) => { rows[0].columns[1].notNull = false; },
    (rows) => { rows[0].columns.find((c) => c.name === "status").default = "'OTHER'"; },
    (rows) => { rows[0].constraints.pop(); },
    (rows) => { rows[0].constraints.find((c) => c.type === "f").definition += " BROKEN"; },
  ]) {
    const rows = syntheticNewRows(contract);
    mutate(rows);
    assert.throws(() => verifyNewTables(rows, contract));
  }
});

test("failed verification rolls back all newly created tables", async () => {
  const f = await fixture({ mutateAfter: (rows) => {
    rows.find((r) => r.name === "passports").columns.find((c) => c.name === "score").type = "text";
  } });
  assert.equal(await applyPassportMigration(f.options), 1);
  assert.equal(f.queries.at(-1).statement, "ROLLBACK");
});

test("missing CA or malformed connection configuration never starts migration", async () => {
  for (const overrides of [{ caFile: "" }, { connectionString: "not-a-connection" }]) {
    const f = await fixture();
    assert.equal(await applyPassportMigration({ ...f.options, ...overrides }), 1);
    assert.equal(f.queries.length, 0);
  }
});
