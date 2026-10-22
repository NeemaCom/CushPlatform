import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createRedactor, describeErrors, parseDatabaseUrl } from "./check-db-connection.mjs";
import {
  apiConfigSql, auditSql, clientRoles, serverRoles, sensitiveTables,
  summarizeApiConfig, summarizeAccess,
} from "./audit-db-access.mjs";

const normalize = (value) => value.replace(/\s+/g, " ").trim().replace(/;$/, "");

export function expectedRevokes() {
  return sensitiveTables.map((table) =>
    `REVOKE ALL PRIVILEGES ON TABLE "public"."${table}" FROM PUBLIC, "anon", "authenticated"`);
}

export function validateRevokes(sql) {
  const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);
  assert.deepEqual(statements.map(normalize), expectedRevokes(),
    "Privilege changes differ from the approved three-table client-access restriction.");
  return statements;
}

const serverPrivilegeSql = `
  SELECT c.relname AS name,
    pg_catalog.has_table_privilege(current_user, c.oid, 'SELECT') AS can_select,
    pg_catalog.has_table_privilege(current_user, c.oid, 'INSERT') AS can_insert,
    pg_catalog.has_table_privilege(current_user, c.oid, 'UPDATE') AS can_update,
    pg_catalog.has_table_privilege(current_user, c.oid, 'DELETE') AS can_delete
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
`;

export async function restrictPassportApiAccess({
  connectionString = process.env.DATABASE_URL,
  caFile = process.env.DATABASE_CA_CERT_FILE,
  sqlLoader = () => readFile(new URL("../migrations/manual/revoke-passport-api-role-grants.sql", import.meta.url), "utf8"),
  clientFactory,
  logger = console,
} = {}) {
  let url;
  try {
    url = parseDatabaseUrl(connectionString);
    assert.ok(caFile, "Verified CA file is required.");
  } catch {
    logger.error("Access restriction configuration invalid: PostgreSQL DATABASE_URL and verified CA certificate are required.");
    return 1;
  }
  const redact = createRedactor(connectionString, url);
  let client;
  let transaction = false;
  let code = 0;
  try {
    const statements = validateRevokes(await sqlLoader());
    url.searchParams.set("sslrootcert", caFile);
    url.searchParams.set("sslmode", "verify-full");
    url.searchParams.delete("uselibpqcompat");
    if (!clientFactory) {
      const { default: pg } = await import("pg");
      clientFactory = (config) => new pg.Client(config);
    }
    client = clientFactory({
      connectionString: url.toString(),
      connectionTimeoutMillis: 10_000,
      query_timeout: 30_000,
      statement_timeout: 15_000,
      application_name: "cush-restrict-passport-api-grants",
    });
    await client.connect();
    await client.query("BEGIN");
    transaction = true;
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SELECT pg_advisory_xact_lock(723812, 1)");

    const beforeResult = await client.query(auditSql, [sensitiveTables, [...clientRoles, ...serverRoles]]);
    const before = summarizeAccess(beforeResult.rows);
    assert.equal(before.tables.length, sensitiveTables.length, "All three target tables must exist.");
    for (const table of before.tables) {
      assert.equal(table.rlsEnabled, true, `RLS must remain enabled on ${table.table}.`);
      assert.equal(table.rowLevelPolicies.length, 0, `Unexpected client policies on ${table.table}; refusing to alter access.`);
      assert.deepEqual(table.rolesNotPresent, [], `Expected Supabase roles are missing for ${table.table}.`);
    }
    const apiBefore = await client.query(apiConfigSql);
    const schemaSetting = summarizeApiConfig(apiBefore.rows);

    const ownerCheck = await client.query(serverPrivilegeSql, [sensitiveTables]);
    assert.equal(ownerCheck.rows.length, sensitiveTables.length, "Application database role must retain access to every target table.");
    for (const row of ownerCheck.rows) {
      assert.ok(row.can_select && row.can_insert && row.can_update && row.can_delete,
        "The server database role must retain read/write access.");
    }

    for (const statement of statements) await client.query(statement);

    const ownerAfter = await client.query(serverPrivilegeSql, [sensitiveTables]);
    assert.equal(ownerAfter.rows.length, sensitiveTables.length, "Server role must retain access to all target tables.");
    for (const row of ownerAfter.rows) {
      assert.ok(row.can_select && row.can_insert && row.can_update && row.can_delete,
        "Server database role lost privileges; refusing to commit.");
    }
    const afterResult = await client.query(auditSql, [sensitiveTables, [...clientRoles, ...serverRoles]]);
    const after = summarizeAccess(afterResult.rows);
    for (const table of after.tables) {
      assert.equal(table.rlsEnabled, true, `RLS changed on ${table.table}.`);
      assert.deepEqual(table.rowLevelPolicies, [], `Unexpected policy change on ${table.table}.`);
      assert.deepEqual(table.explicitPublicAcl, [], `PUBLIC retains a table grant on ${table.table}.`);
      for (const role of table.effectiveRolePrivileges.filter((entry) => clientRoles.includes(entry.role))) {
        assert.deepEqual(
          [role.select, role.insert, role.update, role.delete],
          [false, false, false, false],
          `Client role ${role.role} still has table access to ${table.table}: ${JSON.stringify(role)}`,
        );
      }
      const server = table.effectiveRolePrivileges.find((entry) => serverRoles.includes(entry.role));
      const oldServer = before.tables.find((old) => old.table === table.table)
        .effectiveRolePrivileges.find((entry) => serverRoles.includes(entry.role));
      assert.deepEqual(server, oldServer, "Server-role access must not change.");
    }
    await client.query("COMMIT");
    transaction = false;
    logger.log("PASSPORT_API_ACCESS_RESTRICTED: Revoked PUBLIC, anon, and authenticated table privileges from all three passport tables. RLS remains enabled with no policies; server-role access is unchanged.");
    logger.log("PostgREST schema-setting audit: " + JSON.stringify(schemaSetting));
  } catch (error) {
    code = 1;
    logger.error("Passport API access restriction failed: " + JSON.stringify(describeErrors(error, redact)));
    if (transaction) {
      try {
        await client.query("ROLLBACK");
        logger.error("Rollback completed. No permission changes were committed.");
      } catch {
        logger.error("Rollback could not be confirmed. Inspect table privileges before retrying.");
      }
    }
  } finally {
    if (client) {
      try { await client.end(); } catch {
        code = 1;
        logger.error("Access restriction connection cleanup failed.");
      }
    }
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await restrictPassportApiAccess();
}
