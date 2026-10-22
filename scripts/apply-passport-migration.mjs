import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createRedactor, describeErrors, parseDatabaseUrl } from "./check-db-connection.mjs";
import {
  createdTables, preservedTables, loadMigrationContract, metadataSql,
  validateMigrationSql, verifyNewTables,
} from "./passport-migration-contract.mjs";

export async function applyPassportMigration({
  connectionString = process.env.DATABASE_URL,
  caFile = process.env.DATABASE_CA_CERT_FILE,
  sqlLoader = () => readFile(new URL("../migrations/manual/create-passport-tables.sql", import.meta.url), "utf8"),
  contractLoader = loadMigrationContract,
  clientFactory,
  logger = console,
} = {}) {
  let url;
  try {
    url = parseDatabaseUrl(connectionString);
    assert.ok(caFile, "Verified CA file is required for this migration.");
  } catch {
    logger.error("Migration configuration invalid: a PostgreSQL DATABASE_URL and verified CA file are required.");
    return 1;
  }
  const redact = createRedactor(connectionString, url);
  let client;
  let transaction = false;
  let committed = false;
  let code = 0;
  try {
    const contract = await contractLoader();
    const statements = validateMigrationSql(await sqlLoader(), contract);
    url.searchParams.set("sslrootcert", caFile);
    url.searchParams.set("sslmode", "verify-full");
    url.searchParams.delete("uselibpqcompat");
    if (!clientFactory) {
      const { default: pg } = await import("pg");
      clientFactory = (config) => new pg.Client(config);
    }
    client = clientFactory({
      connectionString: url.toString(), connectionTimeoutMillis: 10_000,
      query_timeout: 60_000, statement_timeout: 45_000,
      application_name: "cush-additive-passport-migration",
    });
    await client.connect();
    await client.query("BEGIN");
    transaction = true;
    await client.query("SET LOCAL search_path = public, pg_catalog");
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SELECT pg_advisory_xact_lock(723812, 1)");
    const before = (await client.query(metadataSql, [[...preservedTables, ...createdTables]])).rows;
    assert.deepEqual(before.map((r) => r.name).sort(), preservedTables,
      "Expected users/cush/session and no target tables. Refusing a partial or repeated migration.");
    for (const statement of statements) await client.query(statement);
    const after = (await client.query(metadataSql, [[...preservedTables, ...createdTables]])).rows;
    assert.deepEqual(after.filter((r) => preservedTables.includes(r.name)), before,
      "Existing table definitions changed; refusing to commit.");
    verifyNewTables(after, contract);
    await client.query("COMMIT");
    transaction = false;
    committed = true;
    logger.log("PASSPORT_MIGRATION_COMMITTED: Created passports, financial_signals, evidence_vault. Verified column types, defaults, nullability, primary keys, unique constraints, and foreign keys. Preserved users, cush, session definitions.");
  } catch (error) {
    code = 1;
    logger.error("Passport migration failed: " + JSON.stringify(describeErrors(error, redact)));
    if (transaction) {
      try {
        await client.query("ROLLBACK");
        logger.error("Rollback completed. If the connection failed during COMMIT, inspect the database before retrying.");
      } catch {
        logger.error("Rollback could not be confirmed. Inspect database state before retrying.");
      }
    }
  } finally {
    if (client) {
      try { await client.end(); } catch {
        code = 1;
        logger.error(committed ? "Migration committed, but connection cleanup failed." : "Migration connection cleanup failed.");
      }
    }
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await applyPassportMigration();
}
