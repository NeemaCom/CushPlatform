// @vitest-environment node
import assert from "node:assert/strict";
import { test } from "vitest";
import {
  compareTables,
  inspectDatabaseTables,
  loadExpectedTables,
  normalizeSqlExpression,
} from "./compare-db-tables.mjs";

const expected = [
  { schema: "public", name: "users", columns: ["id", "email"] },
  { schema: "public", name: "passports", columns: ["id"] },
];

function table(name, columns, metadata = {}) {
  return { schema: "public", name, columns, ...metadata };
}

test("loads full expected metadata from the current Drizzle schema", async () => {
  const tables = await loadExpectedTables();
  const users = tables.find((entry) => entry.name === "users");
  const consent = tables.find((entry) => entry.name === "user_consent_records");
  assert.ok(users?.columns.some((column) => column.name === "firebase_uid"));
  assert.equal(users.rlsEnabled, true);
  assert.ok(users.constraints.some((constraint) => constraint.type === "u"));
  assert.ok(consent.constraints.some((constraint) => constraint.type === "c"));
  assert.ok(consent.indexes.some((index) => index.name === "user_consent_records_user_accepted_at_idx"));
  assert.deepEqual(users.policies, []);
  const liveCatalog = tables.map((entry) => ({
    ...entry,
    columns: entry.columns.map((column) => ({
      ...column,
      type: column.type === "serial"
        ? "integer"
        : column.type === "timestamp" ? "timestamp without time zone" : column.type,
      default: column.type === "serial"
        ? `nextval('${entry.name}_${column.name}_seq'::regclass)`
        : column.default,
    })),
  }));
  assert.equal(compareTables(tables, liveCatalog).declaredSchemaMatches, true);
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
    {
      table: "public.users",
      missingColumns: ["email"],
      extraColumns: ["legacy_column"],
      definitionDifferences: [],
    },
  ]);
});

test("same table names in different schemas are not treated as matches", () => {
  const result = compareTables(expected, [{ schema: "auth", name: "users", columns: [] }]);
  assert.deepEqual(result.matchingTableNames, []);
  assert.deepEqual(result.missingTables, ["public.passports", "public.users"]);
});

test("detects column type, nullability, and default differences", () => {
  const result = compareTables(
    [table("users", [{
      name: "id",
      type: "integer",
      notNull: true,
      default: null,
      primaryKey: true,
    }])],
    [table("users", [{
      name: "id",
      type: "text",
      notNull: false,
      default: "0",
      primaryKey: false,
    }])],
  );
  assert.deepEqual(result.columnDifferences[0].definitionDifferences, [{
    column: "id",
    fields: [
      { field: "type", expected: "integer", actual: "text" },
      { field: "notNull", expected: true, actual: false },
      { field: "default", expected: null, actual: "0" },
      { field: "primaryKey", expected: true, actual: false },
    ],
  }]);
});

test("reports row-level-security mismatches without treating them as table renames", () => {
  const result = compareTables(
    [table("users", [{ name: "id" }], { rlsEnabled: true, forceRls: false })],
    [table("users", [{ name: "id" }], { rlsEnabled: false, forceRls: true })],
  );
  assert.deepEqual(result.rlsDifferences, [
    { table: "public.users", expected: true, actual: false },
  ]);
  assert.deepEqual(result.forceRlsDifferences, [
    { table: "public.users", expected: false, actual: true },
  ]);
  assert.equal(result.possibleCreateRenameConflict, false);
});

test("compares constraints, index definitions, and policy expressions", () => {
  const declared = table("records", [
    { name: "id", type: "serial", notNull: true, default: null, primaryKey: true },
  ], {
    constraints: [
      { type: "p", columns: ["id"], validated: true },
      {
        type: "f",
        name: "records_owner_fk",
        columns: ["owner_id"],
        referencedSchema: "public",
        referencedTable: "users",
        referencedColumns: ["id"],
        onDelete: "cascade",
        onUpdate: "no action",
        validated: true,
      },
      {
        type: "c",
        name: "records_state_check",
        expression: `"records"."state" in ('active', 'inactive')`,
        validated: true,
      },
    ],
    indexes: [{
      name: "records_owner_idx",
      isUnique: false,
      method: "btree",
      columns: [{ expression: "owner_id", asc: true, nulls: "last" }],
      predicate: null,
      with: {},
      valid: true,
      ready: true,
    }],
    policies: [{
      name: "records_owner_read",
      command: "select",
      permissive: true,
      roles: ["authenticated"],
      usingExpression: "owner_id = auth.uid()",
      checkExpression: null,
    }, {
      name: "records_owner_insert",
      command: "insert",
      permissive: true,
      roles: ["authenticated"],
      usingExpression: null,
      checkExpression: "owner_id = auth.uid()",
    }],
    rlsEnabled: true,
    forceRls: false,
  });
  const live = table("records", [
    {
      name: "id",
      type: "integer",
      notNull: true,
      default: "nextval('records_id_seq'::regclass)",
      primaryKey: true,
    },
  ], {
    constraints: [
      { type: "p", name: "records_pkey", columns: ["id"], validated: true },
      {
        type: "f",
        name: "records_owner_fk",
        columns: ["owner_id"],
        referencedSchema: "public",
        referencedTable: "users",
        referencedColumns: ["id"],
        onDelete: "cascade",
        onUpdate: "no action",
        validated: true,
      },
      {
        type: "c",
        name: "records_state_check",
        columns: ["state"],
        expression: "((state = ANY (ARRAY['active'::text, 'inactive'::text])))",
        validated: true,
      },
    ],
    indexes: [{
      name: "records_owner_idx",
      isUnique: false,
      method: "btree",
      columns: [{ expression: "owner_id", asc: true, nulls: "last" }],
      predicate: null,
      with: [],
      valid: true,
      ready: true,
    }],
    policies: [{
      name: "records_owner_read",
      command: "r",
      permissive: true,
      roles: ["authenticated"],
      usingExpression: "(owner_id = auth.uid())",
      checkExpression: null,
    }, {
      name: "records_owner_insert",
      command: "a",
      permissive: true,
      roles: ["authenticated"],
      usingExpression: null,
      checkExpression: "((owner_id = auth.uid()))",
    }],
    rlsEnabled: true,
    forceRls: false,
  });
  const result = compareTables([declared], [live]);
  assert.equal(result.declaredSchemaMatches, true);
  assert.deepEqual(result.constraintDifferences, []);
  assert.deepEqual(result.indexDifferences, []);
  assert.deepEqual(result.policyDifferences, []);
});

test("reports extra policies and changed constraint or index definitions", () => {
  const declared = table("records", [{ name: "id" }], {
    constraints: [{ type: "u", name: "records_id_unique", columns: ["id"], nullsNotDistinct: false }],
    indexes: [{
      name: "records_id_idx",
      isUnique: false,
      method: "btree",
      columns: [{ expression: "id", asc: true, nulls: "last" }],
      with: {},
    }],
    policies: [],
  });
  const live = table("records", [{ name: "id" }], {
    constraints: [{ type: "u", name: "records_id_unique", columns: ["id"], nullsNotDistinct: true }],
    indexes: [{
      name: "records_id_idx",
      isUnique: false,
      method: "hash",
      columns: [{ expression: "id", asc: true, nulls: "last" }],
      with: {},
    }],
    policies: [{
      name: "unexpected_policy",
      command: "r",
      permissive: true,
      roles: ["PUBLIC"],
      usingExpression: "true",
    }],
  });
  const result = compareTables([declared], [live]);
  assert.deepEqual(result.constraintDifferences[0].different.map((item) => item.key), [
    "u:id",
  ]);
  assert.deepEqual(result.indexDifferences[0].different.map((item) => item.key), [
    "records_id_idx",
  ]);
  assert.deepEqual(result.policyDifferences[0].extra, ["unexpected_policy"]);
  assert.equal(result.declaredSchemaMatches, false);
});

test("distinguishes a constraint-name difference from a missing constraint", () => {
  const expectedConstraint = {
    type: "u",
    name: "users_firebase_uid_unique",
    columns: ["firebase_uid"],
    nullsNotDistinct: false,
  };
  const liveConstraint = {
    ...expectedConstraint,
    name: "users_firebase_uid_key",
  };
  const result = compareTables(
    [table("users", [], { constraints: [expectedConstraint] })],
    [table("users", [], { constraints: [liveConstraint] })],
  );
  assert.deepEqual(result.constraintDifferences[0].missing, []);
  assert.deepEqual(result.constraintDifferences[0].extra, []);
  assert.equal(result.constraintDifferences[0].different[0].expected.name, "users_firebase_uid_unique");
  assert.equal(result.constraintDifferences[0].different[0].actual.name, "users_firebase_uid_key");
});

test("normalizes PostgreSQL-rendered expressions without folding string literal case", () => {
  assert.equal(
    normalizeSqlExpression(`"records"."state" IN ('Active', 'paused')`),
    normalizeSqlExpression(`((state = ANY (ARRAY['Active'::text, 'paused'::text])))`),
  );
  assert.notEqual(normalizeSqlExpression("'Owner'"), normalizeSqlExpression("'owner'"));
});

test("detects a missing or unexpected serial sequence default", () => {
  const expectedSerialTable = table("records", [
    { name: "id", type: "serial", notNull: true, default: null, primaryKey: true },
  ]);
  const liveWithWrongSequence = table("records", [
    {
      name: "id",
      type: "integer",
      notNull: true,
      default: "nextval('wrong_records_id_seq'::regclass)",
      primaryKey: true,
    },
  ]);
  const result = compareTables([expectedSerialTable], [liveWithWrongSequence]);
  assert.deepEqual(result.columnDifferences[0].definitionDifferences[0].fields, [{
    field: "default",
    expected: null,
    actual: "nextval('wrong_records_id_seq'::regclass)",
  }]);
});

function fixture(options = {}) {
  const queries = [];
  const logs = [];
  let config;
  let closed = false;
  const rows = options.rows ?? expected.map((entry) => ({
    schema: entry.schema,
    name: entry.name,
    columns: entry.columns.map((name) => ({ name })),
    constraints: [],
    indexes: [],
    policies: [],
    rls_enabled: null,
    force_rls: null,
  }));
  const client = {
    connect: async () => {},
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (options.error) throw new Error(options.error);
      return { rows: sql.includes("pg_catalog") ? rows : [] };
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
    queries,
    logs,
    config: () => config,
    closed: () => closed,
  };
}

test("reads complete catalog metadata in a read-only transaction with verified TLS", async () => {
  const f = fixture();
  assert.equal(await inspectDatabaseTables(f.options), 0);
  assert.equal(f.queries[0].sql, "BEGIN READ ONLY");
  assert.equal(f.queries[2].sql, "ROLLBACK");
  const catalogQuery = f.queries[1].sql;
  assert.match(catalogQuery, /pg_catalog\.pg_attribute/);
  assert.match(catalogQuery, /pg_catalog\.pg_constraint/);
  assert.match(catalogQuery, /pg_catalog\.pg_index/);
  assert.match(catalogQuery, /pg_catalog\.pg_policy/);
  assert.deepEqual(f.queries[1].params, [["public"]]);
  assert.ok(!/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(catalogQuery));
  const url = new URL(f.config().connectionString);
  assert.equal(url.searchParams.get("sslmode"), "verify-full");
  assert.equal(url.searchParams.get("sslrootcert"), "/tmp/fake-public-ca.pem");
  assert.equal(f.closed(), true);
  assert.ok(f.logs.some((line) => line.startsWith("TABLE_COMPARISON ")));
  assert.ok(f.logs.some((line) => line.includes("No schema or customer data was changed.")));
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
  const big = fixture({
    rows: Array(1001).fill({
      schema: "public",
      name: "users",
      columns: [],
      constraints: [],
      indexes: [],
      policies: [],
    }),
  });
  assert.equal(await inspectDatabaseTables(big.options), 1);
  assert.ok(!big.logs.some((line) => line.startsWith("TABLE_COMPARISON ")));
});
