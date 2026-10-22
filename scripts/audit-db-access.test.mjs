// @vitest-environment node
import assert from "node:assert/strict";
import { test } from "vitest";
import {
  apiConfigSql, auditDatabaseAccess, auditSql, summarizeAccess, summarizeApiConfig,
} from "./audit-db-access.mjs";
import { sensitiveTables } from "./audit-db-access.mjs";

const baseRow = (table_name, overrides = {}) => ({
  table_name,
  rls_enabled: false,
  force_rls: false,
  acl: [],
  effective_roles: [
    { role: "anon", schemaUsage: true, select: true, insert: true, update: true, delete: true, bypassRls: false },
    { role: "authenticated", schemaUsage: true, select: true, insert: true, update: true, delete: true, bypassRls: false },
    { role: "service_role", schemaUsage: true, select: true, insert: true, update: true, delete: true, bypassRls: true },
  ],
  policies: [],
  ...overrides,
});

test("reports effective client roles with unprotected privileges when RLS is disabled", () => {
  const report = summarizeAccess([baseRow("evidence_vault")]);
  assert.deepEqual(report.tables[0].unprotectedClientAccess, ["anon", "authenticated"]);
  assert.equal(report.summary.length, 2);
  assert.equal(report.tables[0].effectiveRolePrivileges.find((r) => r.role === "service_role").bypassRls, true);
});

test("does not label RLS-protected roles as unprotected or infer policy access", () => {
  const row = baseRow("passports", {
    rls_enabled: true,
    policies: [{ name: "passport_owner_select", command: "r", permissive: true, roles: ["authenticated"] }],
  });
  const report = summarizeAccess([row]);
  assert.deepEqual(report.tables[0].unprotectedClientAccess, []);
  assert.deepEqual(report.tables[0].rowLevelPolicies, row.policies);
  assert.match(report.scope, /policy expressions and Supabase API configuration are not evaluated/);
});

test("distinguishes table grants from schema USAGE and PUBLIC grants", () => {
  const row = baseRow("financial_signals", {
    acl: [{ grantee: "PUBLIC", privilege: "SELECT", grantable: false }],
    effective_roles: [{ role: "anon", schemaUsage: false, select: false, insert: false, update: false, delete: false, bypassRls: false }],
  });
  const report = summarizeAccess([row], ["anon", "authenticated"]);
  assert.equal(report.summary.length, 0);
  assert.deepEqual(report.tables[0].explicitPublicAcl, row.acl);
  assert.deepEqual(report.tables[0].rolesNotPresent, ["authenticated"]);
});

test("audits all intended tables and does not include customer-data queries", () => {
  assert.deepEqual(sensitiveTables, ["evidence_vault", "financial_signals", "passports"]);
  assert.match(auditSql, /\(\$1::text\[\] IS NULL OR c\.relname = ANY\(\$1::text\[\]\)\)/);
  assert.match(auditSql, /pg_catalog\.pg_roles/);
  assert.match(auditSql, /has_table_privilege/);
  assert.match(auditSql, /pg_catalog\.pg_policy/);
  assert.doesNotMatch(auditSql, /\b(SELECT|FROM)\s+(public\.)?(users|passports|financial_signals|evidence_vault)\b/i);
  assert.doesNotMatch(auditSql, /^\s*(INSERT|UPDATE|DELETE|ALTER|GRANT|REVOKE|DROP|CREATE)\b/im);
  assert.match(apiConfigSql, /pgrst\.db_schemas/);
  assert.doesNotMatch(apiConfigSql, /password|secret|service_role.*setconfig/i);
});

test("reports exposed schemas only when the PostgREST role setting is visible", () => {
  assert.deepEqual(summarizeApiConfig([
    { role: "authenticator", database_specific: true, exposed_schemas: "public, graphql_public" },
  ]), {
    settings: [{ role: "authenticator", databaseSpecific: true, exposedSchemas: ["graphql_public", "public"] }],
    publicSchemaExposureConfigured: true,
    status: "Read from PostgreSQL role/database settings. Verify this matches the Supabase Dashboard Data API settings.",
  });
  const unknown = summarizeApiConfig([]);
  assert.equal(unknown.publicSchemaExposureConfigured, false);
  assert.match(unknown.status, /could not be confirmed/);
});

function fixture(options = {}) {
  const queries = [];
  const logs = [];
  let closed = false;
  let config;
  const rows = options.rows ?? sensitiveTables.map((name) => baseRow(name));
  const client = {
    connect: async () => {},
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (options.error) throw new Error(options.error);
      if (sql.includes("pg_catalog.pg_class")) return { rows };
      if (sql.includes("pg_db_role_setting")) return { rows: options.settings ?? [] };
      return { rows: [] };
    },
    end: async () => { closed = true; },
  };
  return {
    queries, logs, closed: () => closed, config: () => config,
    options: {
      connectionString: "postgresql://synthetic_user:synthetic_password@invalid.example/db?sslmode=no-verify",
      caFile: "/tmp/test-public-ca.pem",
      clientFactory: (value) => { config = value; return client; },
      logger: { log: (line) => logs.push(line), error: (line) => logs.push(line) },
    },
  };
}

test("runs only a read-only catalog query with full TLS verification and closes", async () => {
  const f = fixture();
  assert.equal(await auditDatabaseAccess(f.options), 0);
  assert.equal(f.queries[0].sql, "BEGIN READ ONLY");
  assert.match(f.queries[1].sql, /pg_catalog\.pg_policy/);
  assert.deepEqual(f.queries[1].params[0], sensitiveTables);
  assert.equal(f.queries.at(-1).sql, "ROLLBACK");
  const url = new URL(f.config().connectionString);
  assert.equal(url.searchParams.get("sslmode"), "verify-full");
  assert.equal(url.searchParams.get("sslrootcert"), "/tmp/test-public-ca.pem");
  assert.equal(f.closed(), true);
  assert.ok(f.logs.some((line) => line.startsWith("ACCESS_AUDIT ")));
  assert.ok(f.logs.some((line) => line.includes("could not be confirmed")));
  const withSetting = fixture({ settings: [
    { role: "authenticator", database_specific: true, exposed_schemas: "public" },
  ] });
  assert.equal(await auditDatabaseAccess(withSetting.options), 0);
  assert.ok(withSetting.logs.some((line) => line.includes("\"publicSchemaExposureConfigured\":true")));
});

test("all-public mode requests every public table without reading rows", async () => {
  const rows = [
    ...sensitiveTables.map((name) => baseRow(name)),
    baseRow("users"),
    baseRow("cush"),
    baseRow("session"),
  ].sort((a, b) => a.table_name.localeCompare(b.table_name));
  const f = fixture({ rows });
  assert.equal(await auditDatabaseAccess({ ...f.options, allPublicTables: true }), 0);
  assert.equal(f.queries[1].params[0], null);
  const reportLine = f.logs.find((line) => line.startsWith("ACCESS_AUDIT "));
  const report = JSON.parse(reportLine.slice("ACCESS_AUDIT ".length));
  assert.equal(report.auditScope, "All public tables");
  assert.deepEqual(report.tables.map((table) => table.table), [
    "public.cush",
    "public.evidence_vault",
    "public.financial_signals",
    "public.passports",
    "public.session",
    "public.users",
  ]);
  assert.equal(f.queries.at(-1).sql, "ROLLBACK");
});

test("missing tables or catalog errors fail without a misleading report and redact credentials", async () => {
  const absent = fixture({ rows: [baseRow("passports")] });
  assert.equal(await auditDatabaseAccess(absent.options), 1);
  assert.ok(!absent.logs.some((line) => line.startsWith("ACCESS_AUDIT ")));
  const failed = fixture({ error: "synthetic failure synthetic_password" });
  assert.equal(await auditDatabaseAccess(failed.options), 1);
  assert.ok(!failed.logs.join("\n").includes("synthetic_password"));
  assert.ok(!failed.logs.some((line) => line.startsWith("ACCESS_AUDIT ")));
});
