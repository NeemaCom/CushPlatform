import { pathToFileURL } from "node:url";
import { generateDrizzleJson } from "drizzle-kit/api";
import { tsImport } from "tsx/esm/api";
import { createRedactor, describeErrors, parseDatabaseUrl } from "./check-db-connection.mjs";

export async function loadExpectedTables() {
  const exports = await tsImport("../shared/schema.ts", import.meta.url);
  const snapshot = generateDrizzleJson(exports);
  const tables = Object.entries(snapshot.tables).map(([qualifiedName, table]) => {
    const separator = qualifiedName.indexOf(".");
    return {
      schema: separator === -1 ? "public" : qualifiedName.slice(0, separator),
      name: separator === -1 ? qualifiedName : qualifiedName.slice(separator + 1),
      columns: Object.values(table.columns).map((column) => column.name).sort(),
      rlsEnabled: table.isRLSEnabled,
    };
  });
  if (!tables.length) throw new Error("No expected tables were found in the code schema.");
  return tables;
}

export function compareTables(expected, live) {
  const key = (table) => JSON.stringify([table.schema, table.name]);
  const label = (table) => `${table.schema}.${table.name}`;
  const expectedMap = new Map(expected.map((table) => [key(table), table]));
  const liveMap = new Map(live.map((table) => [key(table), table]));
  const missingTables = expected.filter((table) => !liveMap.has(key(table))).map(label).sort();
  const notDeclaredInCode = live.filter((table) => !expectedMap.has(key(table))).map(label).sort();
  const shared = expected.filter((table) => liveMap.has(key(table)));
  const columnDifferences = shared.flatMap((table) => {
    const actual = liveMap.get(key(table));
    const missingColumns = table.columns.filter((name) => !actual.columns.includes(name)).sort();
    const extraColumns = actual.columns.filter((name) => !table.columns.includes(name)).sort();
    return missingColumns.length || extraColumns.length
      ? [{ table: label(table), missingColumns, extraColumns }] : [];
  }).sort((a, b) => a.table.localeCompare(b.table));
  const rlsDifferences = shared.flatMap((table) => {
    const actual = liveMap.get(key(table));
    return typeof table.rlsEnabled === "boolean" && typeof actual.rlsEnabled === "boolean"
      && table.rlsEnabled !== actual.rlsEnabled
      ? [{ table: label(table), expected: table.rlsEnabled, actual: actual.rlsEnabled }]
      : [];
  }).sort((a, b) => a.table.localeCompare(b.table));
  return {
    expectedTables: expected.map(label).sort(),
    liveTables: live.map(label).sort(),
    matchingTableNames: shared.map(label).sort(),
    missingTables,
    notDeclaredInCode,
    columnDifferences,
    rlsDifferences,
    possibleCreateRenameConflict: missingTables.length > 0 && notDeclaredInCode.length > 0,
    scope: "Table names, column names, and row-level-security flags only, in code-declared schemas. Not a type, default, constraint, index, policy-expression, or full schema validation. Undeclared tables are not deletion recommendations.",
  };
}

export async function inspectDatabaseTables({
  connectionString = process.env.DATABASE_URL,
  caFile = process.env.DATABASE_CA_CERT_FILE,
  expectedLoader = loadExpectedTables,
  clientFactory,
  logger = console,
} = {}) {
  let url;
  try {
    url = parseDatabaseUrl(connectionString);
  } catch (error) {
    logger.error(error.message);
    return 1;
  }
  const redact = createRedactor(connectionString, url);
  let client;
  let code = 0;
  let report;
  try {
    const expected = await expectedLoader();
    if (!expected.length) throw new Error("No expected tables were found in the code schema.");
    const schemas = [...new Set(expected.map((table) => table.schema))].sort();
    if (caFile) {
      url.searchParams.set("sslrootcert", caFile);
      url.searchParams.set("sslmode", "verify-full");
      url.searchParams.delete("uselibpqcompat");
    }
    if (!clientFactory) {
      const { default: pg } = await import("pg");
      clientFactory = (config) => new pg.Client(config);
    }
    client = clientFactory({
      connectionString: url.toString(),
      connectionTimeoutMillis: 10_000,
      query_timeout: 15_000,
      statement_timeout: 10_000,
      application_name: "cush-read-only-table-comparison",
    });
    await client.connect();
    await client.query("BEGIN READ ONLY");
    // System catalog metadata only. No application table rows, counts, or secrets.
    const result = await client.query(`
      SELECT n.nspname AS schema, c.relname AS name,
        c.relrowsecurity AS rls_enabled, a.attname AS column_name
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_catalog.pg_attribute a
        ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      WHERE n.nspname = ANY($1::text[]) AND c.relkind IN ('r', 'p')
      ORDER BY n.nspname, c.relname, a.attnum
      LIMIT 10001
    `, [schemas]);
    if (result.rows.length > 10000) throw new Error("Catalog exceeds comparison limit; no partial report will be used.");
    const tables = new Map();
    for (const row of result.rows) {
      const key = JSON.stringify([row.schema, row.name]);
       if (!tables.has(key)) {
         tables.set(key, {
           schema: row.schema,
           name: row.name,
           columns: [],
           rlsEnabled: row.rls_enabled,
         });
       }
      if (row.column_name !== null) tables.get(key).columns.push(row.column_name);
    }
    report = compareTables(expected, [...tables.values()]);
    await client.query("ROLLBACK");
  } catch (error) {
    code = 1;
    logger.error("Table comparison failed: " + JSON.stringify(describeErrors(error, redact)));
  } finally {
    if (client) {
      try { await client.end(); } catch {
        code = 1;
        logger.error("Table comparison connection cleanup failed.");
      }
    }
  }
  if (code === 0) {
    logger.log("TABLE_COMPARISON " + redact(JSON.stringify(report)));
    logger.log("Table comparison completed read-only. No schema or customer data was changed.");
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await inspectDatabaseTables();
}
