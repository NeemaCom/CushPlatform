#!/usr/bin/env node

import { Client } from "pg";

const TRANSFER_TABLES = [
  "cush_verify_applications",
  "cush_verify_institutions",
  "cush_verify_institutional_users",
  "cush_verify_invitations",
  "cush_verify_institutional_memberships",
  "cush_verify_application_events",
  "cush_verify_email_activations",
  "cush_verify_institution_interests",
  "cush_verify_report_requests",
  "cush_verify_report_consents",
  "cush_verify_report_events",
  "cush_verify_report_deliveries",
  "cush_verify_discovery_searches",
];

const OPTIONAL_SOURCE_TABLES = new Set(["cush_verify_discovery_searches"]);

const BILLING_TABLES = [
  "cush_verify_billing_accounts",
  "cush_verify_stripe_price_mappings",
  "cush_verify_subscriptions",
  "cush_verify_credit_ledger",
  "cush_verify_stripe_webhook_events",
  "cush_verify_billing_outbox",
];

const PRICING_VERSION_FIELDS = [
  "version",
  "status",
  "default_currency",
  "annual_discount_bps",
  "faq_items",
];

const PRICING_PLAN_FIELDS = [
  "plan_key",
  "name",
  "description",
  "currency",
  "monthly_price_minor",
  "included_reports",
  "allocation_mode",
  "additional_report_price_minor",
  "sales_mode",
  "is_active",
  "is_archived",
  "feature_flags",
  "api_limits",
  "support_level",
];

const MAX_ROWS_PER_TABLE = 25_000;
const INSERT_BATCH_SIZE = 250;

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function qualifiedTable(table) {
  return `${quoteIdentifier("public")}.${quoteIdentifier(table)}`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function parseProjectConnection(raw, label) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} database URL is missing or malformed.`);
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${label} database URL must use PostgreSQL.`);
  }

  const hostRef = url.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/)?.[1];
  const userRef = decodeURIComponent(url.username).match(/^postgres\.([a-z0-9]{20})$/)?.[1];
  const projectRef = hostRef ?? userRef;

  if (
    !url.hostname.endsWith(".supabase.co") &&
    !url.hostname.endsWith(".pooler.supabase.com")
  ) {
    throw new Error(`${label} must use a Supabase database endpoint.`);
  }
  if (!projectRef || (hostRef && userRef && hostRef !== userRef)) {
    throw new Error(
      `${label} project could not be verified. Use the Supabase direct endpoint or a pooler URL with its project-specific postgres username.`,
    );
  }

  return { url, projectRef };
}

async function tableExists(client, table) {
  const result = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS present`,
    [table],
  );
  return result.rows[0].present;
}

async function readColumns(client, table) {
  const result = await client.query(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default,
            is_identity, is_generated
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return result.rows;
}

async function countRows(client, table) {
  const result = await client.query(
    `SELECT count(*)::bigint AS count FROM ${qualifiedTable(table)}`,
  );
  return Number(result.rows[0].count);
}

function validateTableShape(sourceColumns, targetColumns, table) {
  const targetByName = new Map(targetColumns.map((column) => [column.column_name, column]));
  const sourceNames = new Set(sourceColumns.map((column) => column.column_name));

  for (const sourceColumn of sourceColumns) {
    const targetColumn = targetByName.get(sourceColumn.column_name);
    if (!targetColumn) {
      throw new Error(
        `${table} has source-only column ${sourceColumn.column_name}; transfer stopped to avoid dropping data.`,
      );
    }
    if (sourceColumn.udt_name !== targetColumn.udt_name) {
      throw new Error(
        `${table}.${sourceColumn.column_name} has different source and target types; transfer stopped.`,
      );
    }
  }

  for (const targetColumn of targetColumns) {
    if (sourceNames.has(targetColumn.column_name)) continue;
    const canBeOmitted =
      targetColumn.is_nullable === "YES" ||
      targetColumn.column_default !== null ||
      targetColumn.is_identity === "YES" ||
      targetColumn.is_generated !== "NEVER";
    if (!canBeOmitted) {
      throw new Error(
        `${table} has new required target column ${targetColumn.column_name} without a default.`,
      );
    }
  }
}

async function readCatalog(client) {
  const versions = await client.query(
    `SELECT ${PRICING_VERSION_FIELDS.map(quoteIdentifier).join(", ")}
     FROM public.cush_verify_pricing_versions
     ORDER BY version`,
  );
  const plans = await client.query(
    `SELECT ${PRICING_PLAN_FIELDS.map((field) => `p.${quoteIdentifier(field)}`).join(", ")}
     FROM public.cush_verify_pricing_plans p
     JOIN public.cush_verify_pricing_versions v ON v.id = p.version_id
     ORDER BY v.version, p.plan_key`,
  );
  return { versions: versions.rows, plans: plans.rows };
}

function assertSeedCatalogMatches(sourceCatalog, targetCatalog) {
  const sourceVersion = sourceCatalog.versions;
  const targetVersion = targetCatalog.versions;
  if (
    sourceVersion.length !== 1 ||
    targetVersion.length !== 1 ||
    sourceVersion[0].version !== 1 ||
    targetVersion[0].version !== 1 ||
    sourceVersion[0].status !== "published" ||
    targetVersion[0].status !== "published" ||
    !sameJson(sourceVersion[0], targetVersion[0])
  ) {
    throw new Error(
      "The source and target must contain the same single published version 1 catalog. No data was copied; review catalog differences before continuing.",
    );
  }

  if (
    sourceCatalog.plans.length !== targetCatalog.plans.length ||
    !sameJson(sourceCatalog.plans, targetCatalog.plans)
  ) {
    throw new Error(
      "The seeded pricing plans do not exactly match production. No data was copied; review catalog differences before continuing.",
    );
  }
}

async function insertRows(client, table, columns, rows) {
  const columnSql = columns.map((column) => quoteIdentifier(column.column_name)).join(", ");

  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + INSERT_BATCH_SIZE);
    const values = [];
    const tuples = batch.map((row, rowIndex) => {
      const placeholders = columns.map((column, columnIndex) => {
        values.push(row[column.column_name]);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await client.query(
      `INSERT INTO ${qualifiedTable(table)} (${columnSql}) VALUES ${tuples.join(", ")}`,
      values,
    );
  }
}

async function resetSerialSequence(client, table, columns) {
  if (!columns.some((column) => column.column_name === "id")) return;
  const sequenceResult = await client.query(
    "SELECT pg_get_serial_sequence($1, 'id') AS sequence",
    [`public.${table}`],
  );
  const sequence = sequenceResult.rows[0].sequence;
  if (!sequence) return;

  const maxResult = await client.query(
    `SELECT max(${quoteIdentifier("id")})::bigint AS max_id FROM ${qualifiedTable(table)}`,
  );
  const maxId = maxResult.rows[0].max_id;
  await client.query("SELECT setval($1::regclass, $2, $3)", [
    sequence,
    maxId === null ? 1 : String(maxId),
    maxId !== null,
  ]);
}

async function run() {
  const args = new Set(process.argv.slice(2));
  for (const arg of args) {
    if (arg !== "--apply") throw new Error(`Unknown option: ${arg}`);
  }
  const apply = args.has("--apply");
  const sourceUrl = process.env.CUSH_VERIFY_SOURCE_DATABASE_URL;
  const targetUrl = process.env.CUSH_VERIFY_DATABASE_URL;
  if (!sourceUrl || !targetUrl) {
    throw new Error(
      "Set CUSH_VERIFY_SOURCE_DATABASE_URL and CUSH_VERIFY_DATABASE_URL in the local process environment or a secret manager. Do not paste connection strings into chat or command history.",
    );
  }

  const sourceConnection = parseProjectConnection(sourceUrl, "Source");
  const targetConnection = parseProjectConnection(targetUrl, "Target");
  if (sourceConnection.projectRef === targetConnection.projectRef) {
    throw new Error("Source and target point to the same Supabase project; no changes were made.");
  }

  const source = new Client({ connectionString: sourceUrl });
  const target = new Client({ connectionString: targetUrl });
  let sourceTransaction = false;
  let targetTransaction = false;
  const counts = {};

  try {
    await Promise.all([source.connect(), target.connect()]);
    await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    sourceTransaction = true;

    if (apply) {
      await target.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      targetTransaction = true;
      await target.query(
        "SELECT pg_advisory_xact_lock(hashtext('cush_verify_data_transfer_v1')::bigint)",
      );
    } else {
      await target.query("BEGIN READ ONLY");
      targetTransaction = true;
    }

    const sourceCatalog = await readCatalog(source);
    const targetCatalog = await readCatalog(target);
    assertSeedCatalogMatches(sourceCatalog, targetCatalog);

    for (const table of [...TRANSFER_TABLES, ...BILLING_TABLES]) {
      const sourcePresent = await tableExists(source, table);
      const targetPresent = await tableExists(target, table);
      if (!targetPresent) throw new Error(`Target table ${table} is missing. Apply the schema migrations first.`);
      if (!sourcePresent && OPTIONAL_SOURCE_TABLES.has(table)) {
        counts[table] = 0;
        continue;
      }
      if (!sourcePresent) throw new Error(`Source table ${table} is missing; no changes were made.`);
      counts[table] = await countRows(source, table);
    }

    if (!await tableExists(target, "cush_verify_sessions")) {
      throw new Error("Target table cush_verify_sessions is missing. Apply the session migration first.");
    }
    const targetSessionCount = await countRows(target, "cush_verify_sessions");

    const unsafeBillingRows = BILLING_TABLES.filter((table) => counts[table] > 0);
    if (unsafeBillingRows.length) {
      throw new Error(
        `Billing/Stripe data exists in the source (${unsafeBillingRows.join(", ")}). This script will not copy live billing state; review it separately before migration.`,
      );
    }
    if (targetSessionCount > 0) {
      throw new Error("The target Verify session table is not empty; review it before migrating.");
    }

    const targetDataTables = [...TRANSFER_TABLES, ...BILLING_TABLES];
    const targetCounts = {};
    for (const table of targetDataTables) {
      targetCounts[table] = await countRows(target, table);
    }
    const occupiedTargetTables = targetDataTables.filter((table) => targetCounts[table] > 0);
    if (occupiedTargetTables.length) {
      throw new Error(
        `Target data tables must be empty before transfer (${occupiedTargetTables.join(", ")}). No data was copied.`,
      );
    }

    const columnsByTable = new Map();
    for (const table of TRANSFER_TABLES) {
      if (table === "cush_verify_discovery_searches" && !await tableExists(source, table)) {
        continue;
      }
      const sourceColumns = await readColumns(source, table);
      const targetColumns = await readColumns(target, table);
      validateTableShape(sourceColumns, targetColumns, table);
      columnsByTable.set(table, sourceColumns);
    }

    for (const table of TRANSFER_TABLES) {
      const rowCount = counts[table];
      if (rowCount > MAX_ROWS_PER_TABLE) {
        throw new Error(
          `${table} contains more than ${MAX_ROWS_PER_TABLE} rows; use a reviewed bulk-transfer process instead.`,
        );
      }
    }

    console.log(`Source and target Supabase project refs are distinct.`);
    console.log(`Published version 1 pricing catalog matches the target seed.`);
    console.log("Verify-owned data table counts:");
    for (const table of TRANSFER_TABLES) {
      console.log(`  ${table}: ${counts[table]}`);
    }
    console.log("Billing/Stripe tables: empty in source; no billing data will be copied.");
    console.log("Session rows: never copied; users will sign in again after cutover.");

    if (!apply) {
      await target.query("ROLLBACK");
      targetTransaction = false;
      await source.query("COMMIT");
      sourceTransaction = false;
      console.log("Dry run only. No data was written.");
      return;
    }

    for (const table of TRANSFER_TABLES) {
      const columns = columnsByTable.get(table);
      if (!columns) continue;
      const columnSql = columns.map((column) => quoteIdentifier(column.column_name)).join(", ");
      const result = await source.query(
        `SELECT ${columnSql} FROM ${qualifiedTable(table)}`,
      );
      await insertRows(target, table, columns, result.rows);
      await resetSerialSequence(target, table, columns);
    }

    await source.query("COMMIT");
    sourceTransaction = false;
    await target.query("COMMIT");
    targetTransaction = false;
    console.log("Verify account and report data copied successfully. The source database was not modified.");
  } catch (error) {
    if (targetTransaction) await target.query("ROLLBACK").catch(() => {});
    if (sourceTransaction) await source.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await Promise.all([
      source.end().catch(() => {}),
      target.end().catch(() => {}),
    ]);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "The transfer failed.");
  process.exitCode = 1;
});
