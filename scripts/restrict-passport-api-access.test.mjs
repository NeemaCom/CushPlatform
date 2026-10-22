// @vitest-environment node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "vitest";
import {
  expectedRevokes, restrictPassportApiAccess, validateRevokes,
} from "./restrict-passport-api-access.mjs";
import { clientRoles, sensitiveTables, serverRoles } from "./audit-db-access.mjs";

const roleRows = (clientAccess) => [
  ...clientRoles.map((role) => ({
    role, schemaUsage: true, select: clientAccess, insert: clientAccess,
    update: clientAccess, delete: clientAccess, bypassRls: false,
  })),
  ...serverRoles.map((role) => ({
    role, schemaUsage: true, select: true, insert: true, update: true, delete: true, bypassRls: true,
  })),
];
const tableRows = (clientAccess) => sensitiveTables.map((name) => ({
  table_name: name, rls_enabled: true, force_rls: false, acl: [],
  effective_roles: roleRows(clientAccess), policies: [],
}));

function fixture(options = {}) {
  const queries = [];
  const logs = [];
  let closed = false;
  let config;
  let auditCount = 0;
  const client = {
    connect: async () => {},
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (options.errorOn && sql.includes(options.errorOn)) throw new Error("synthetic credential test_secret");
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK"
        || sql.startsWith("SET LOCAL") || sql.includes("pg_advisory_xact_lock")
        || sql.startsWith("REVOKE ")) return { rows: [] };
      if (sql.includes("has_table_privilege(current_user")) {
        return { rows: sensitiveTables.map((name) => ({
          name, can_select: true, can_insert: true, can_update: true, can_delete: true,
        })) };
      }
      if (sql.includes("pg_catalog.pg_class")) {
        auditCount += 1;
        return { rows: tableRows(auditCount === 1 || Boolean(options.keepClientAccess)) };
      }
      if (sql.includes("pg_db_role_setting")) return { rows: [] };
      throw new Error("Unexpected query in synthetic migration test.");
    },
    end: async () => { closed = true; },
  };
  return {
    queries, logs, closed: () => closed, config: () => config,
    options: {
      connectionString: "postgresql://synthetic_owner:synthetic_password@invalid.example/db?sslmode=no-verify",
      caFile: "/tmp/public-test-ca.pem",
      sqlLoader: () => readFile(new URL("../migrations/manual/revoke-passport-api-role-grants.sql", import.meta.url), "utf8"),
      clientFactory: (value) => { config = value; return client; },
      logger: { log: (line) => logs.push(line), error: (line) => logs.push(line) },
    },
  };
}

test("approved SQL revokes only client roles and PUBLIC from the three sensitive tables", async () => {
  const sql = await readFile(new URL("../migrations/manual/revoke-passport-api-role-grants.sql", import.meta.url), "utf8");
  assert.deepEqual(validateRevokes(sql).map((x) => x.replace(/\s+/g, " ").trim()), expectedRevokes());
  assert.equal(expectedRevokes().length, 3);
  assert.ok(expectedRevokes().every((x) => !/\b(users|cush|session)\b/.test(x)));
  assert.throws(() => validateRevokes(sql + "\nREVOKE ALL ON users FROM PUBLIC;"));
});

test("commits revocations after proving RLS and server access remain intact", async () => {
  const f = fixture();
  assert.equal(await restrictPassportApiAccess(f.options), 0,
    f.logs.join("\n") + "\n" + f.queries.map((query) => query.sql.slice(0, 90)).join("\n"));
  assert.equal(f.queries[0].sql, "BEGIN");
  assert.equal(f.queries.filter((q) => q.sql.startsWith("REVOKE ")).length, 3);
  assert.equal(f.queries.at(-1).sql, "COMMIT");
  assert.equal(f.closed(), true);
  const url = new URL(f.config().connectionString);
  assert.equal(url.searchParams.get("sslmode"), "verify-full");
  assert.equal(url.searchParams.get("sslrootcert"), "/tmp/public-test-ca.pem");
  assert.ok(f.logs.some((line) => line.startsWith("PASSPORT_API_ACCESS_RESTRICTED:")));
});

test("unexpected policies, disabled RLS, or a missing Supabase role cause rollback before revokes", async () => {
  for (const configure of [
    (rows) => { rows[0].rls_enabled = false; },
    (rows) => { rows[0].policies = [{ name: "unexpected", command: "*", roles: ["anon"] }]; },
    (rows) => { rows[0].effective_roles = rows[0].effective_roles.filter((role) => role.role !== "anon"); },
  ]) {
    const f = fixture();
    const baseClient = f.options.clientFactory;
    let count = 0;
    f.options.clientFactory = (config) => {
      const client = baseClient(config);
      const query = client.query;
      client.query = async (sql, params) => {
        const result = await query(sql, params);
        if (sql.includes("pg_catalog.pg_class") && ++count === 1) {
          const row = result.rows[0];
          configure([row]);
          if (configure.name === "missingRole") row.effective_roles = [];
        }
        return result;
      };
      return client;
    };
    assert.equal(await restrictPassportApiAccess(f.options), 1);
    assert.ok(!f.queries.some((q) => q.sql.startsWith("REVOKE ")));
    assert.equal(f.queries.at(-1).sql, "ROLLBACK");
  }
});

test("failed post-check rolls back all privilege changes and reports no commit", async () => {
  const f = fixture({ keepClientAccess: true });
  assert.equal(await restrictPassportApiAccess(f.options), 1);
  assert.equal(f.queries.filter((q) => q.sql.startsWith("REVOKE ")).length, 3);
  assert.equal(f.queries.at(-1).sql, "ROLLBACK");
  assert.ok(!f.logs.join("\n").includes("synthetic_password"));
  assert.ok(!f.logs.some((line) => line.startsWith("PASSPORT_API_ACCESS_RESTRICTED:")));
});

test("bad configuration or unexpected SQL fails before connecting", async () => {
  const f = fixture();
  assert.equal(await restrictPassportApiAccess({ ...f.options, caFile: "" }), 1);
  assert.equal(f.queries.length, 0);
  assert.equal(await restrictPassportApiAccess({ ...f.options, sqlLoader: async () => "DROP TABLE users;" }), 1);
  assert.equal(f.queries.length, 0);
});
