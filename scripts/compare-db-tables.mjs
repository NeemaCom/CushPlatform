import { pathToFileURL } from "node:url";
import { generateDrizzleJson } from "drizzle-kit/api";
import { tsImport } from "tsx/esm/api";
import { createRedactor, describeErrors, parseDatabaseUrl } from "./check-db-connection.mjs";

const typeAliases = new Map([
  ["serial", "integer"],
  ["timestamp", "timestamp without time zone"],
]);

export function normalizeSqlExpression(expression) {
  if (expression == null) return null;

  const literals = [];
  let normalized = String(expression).replace(/'(?:''|[^'])*'/g, (literal) => {
    const index = literals.push(literal) - 1;
    return `\u0000${index}\u0000`;
  });
  normalized = normalized
    .replace(/"[^"]+"\."([^"]+)"/g, "$1")
    .replace(/"([^"]+)"/g, "$1")
    .replace(/::(?:character varying|timestamp(?: without time zone| with time zone)?|double precision|smallint|integer|bigint|text|boolean|numeric(?:\(\d+\s*,\s*\d+\))?|jsonb?|uuid|regclass|name)(?:\[\])?/gi, "")
    .replace(/\b([a-z_][\w.]*)\s+in\s*\(([^()]*)\)/gi, "$1 = ANY (ARRAY[$2])")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*([(),[\]])\s*/g, "$1")
    .replace(/\s*(=|<>|>=|<=|!=)\s*/g, "$1")
    .trim();

  const stripOuterParentheses = (value) => {
    while (value.startsWith("(") && value.endsWith(")")) {
      let depth = 0;
      let wrapsWholeExpression = true;
      for (let index = 0; index < value.length; index++) {
        if (value[index] === "(") depth++;
        if (value[index] === ")") depth--;
        if (depth === 0 && index < value.length - 1) {
          wrapsWholeExpression = false;
          break;
        }
      }
      if (!wrapsWholeExpression || depth !== 0) break;
      value = value.slice(1, -1);
    }
    return value;
  };

  normalized = stripOuterParentheses(normalized);
  return normalized.replace(/\u0000(\d+)\u0000/g, (_marker, index) => literals[Number(index)]);
}

function normalizeType(type) {
  const value = String(type ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return (typeAliases.get(value) ?? value).replace(/\s+/g, "");
}

function normalizeDefault(value, columnType, tableName, columnName, expected = false) {
  if (columnType === "serial") {
    if (value == null && expected) return `sequence:${tableName}_${columnName}_seq`;
    const sequenceReference = String(value ?? "").match(/nextval\(\s*'([^']+)'::regclass\s*\)/i);
    if (sequenceReference) {
      const sequenceName = sequenceReference[1].split(".").at(-1).replace(/^"|"$/g, "");
      return `sequence:${sequenceName}`;
    }
  }
  if (value == null) return null;
  return normalizeSqlExpression(String(value));
}

function normalizeOptions(options) {
  const entries = Array.isArray(options)
    ? options.map((entry) => {
      const separator = String(entry).indexOf("=");
      return separator === -1
        ? [String(entry), ""]
        : [String(entry).slice(0, separator), String(entry).slice(separator + 1)];
    })
    : Object.entries(options ?? {});
  return Object.fromEntries(entries
    .map(([key, value]) => [String(key).toLowerCase(), String(value)])
    .sort(([left], [right]) => left.localeCompare(right)));
}

function expectedConstraints(table) {
  const constraints = [];
  const primaryKeyColumns = table.columns.filter((column) => column.primaryKey).map((column) => column.name);
  if (primaryKeyColumns.length) {
    constraints.push({ type: "p", columns: primaryKeyColumns, validated: true });
  }
  for (const foreignKey of Object.values(table.foreignKeys ?? {})) {
    constraints.push({
      type: "f",
      name: foreignKey.name,
      columns: foreignKey.columnsFrom,
      referencedSchema: foreignKey.schemaTo ?? table.schema,
      referencedTable: foreignKey.tableTo,
      referencedColumns: foreignKey.columnsTo,
      onDelete: foreignKey.onDelete ?? "no action",
      onUpdate: foreignKey.onUpdate ?? "no action",
      validated: true,
    });
  }
  for (const unique of Object.values(table.uniqueConstraints ?? {})) {
    constraints.push({
      type: "u",
      name: unique.name,
      columns: unique.columns,
      nullsNotDistinct: Boolean(unique.nullsNotDistinct),
      validated: true,
    });
  }
  for (const check of Object.values(table.checkConstraints ?? {})) {
    constraints.push({
      type: "c",
      name: check.name,
      expression: check.value,
      validated: true,
    });
  }
  return constraints.map(normalizeConstraint).sort((left, right) => left.key.localeCompare(right.key));
}

function normalizeConstraint(constraint) {
  const type = constraint.type;
  const primary = type === "p";
  return {
    key: primary ? "p:primary-key" : `${type}:${constraint.name}`,
    name: primary ? null : constraint.name,
    type,
    columns: type === "c" ? [] : [...(constraint.columns ?? [])],
    referencedSchema: type === "f" ? constraint.referencedSchema ?? null : null,
    referencedTable: type === "f" ? constraint.referencedTable ?? null : null,
    referencedColumns: type === "f" ? [...(constraint.referencedColumns ?? [])] : [],
    onDelete: type === "f" ? (constraint.onDelete ?? "no action").toLowerCase() : null,
    onUpdate: type === "f" ? (constraint.onUpdate ?? "no action").toLowerCase() : null,
    expression: type === "c" ? normalizeSqlExpression(constraint.expression) : null,
    nullsNotDistinct: type === "u" ? Boolean(constraint.nullsNotDistinct) : null,
    validated: constraint.validated !== false,
  };
}

function expectedIndexes(table) {
  return Object.values(table.indexes ?? {}).map((index) => normalizeIndex({
    name: index.name,
    isUnique: index.isUnique,
    method: index.method ?? "btree",
    columns: index.columns,
    predicate: index.where ?? null,
    with: index.with ?? {},
    valid: true,
    ready: true,
  })).sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeIndex(index) {
  return {
    name: index.name,
    isUnique: Boolean(index.isUnique),
    method: String(index.method ?? "btree").toLowerCase(),
    columns: (index.columns ?? []).map((column) => ({
      expression: normalizeSqlExpression(column.expression),
      asc: column.asc !== false,
      nulls: String(column.nulls ?? "last").toLowerCase(),
    })),
    predicate: normalizeSqlExpression(index.predicate ?? index.where ?? null),
    with: normalizeOptions(index.with),
    valid: index.valid !== false,
    ready: index.ready !== false,
  };
}

function normalizeCommand(command) {
  const commands = {
    r: "select",
    a: "insert",
    w: "update",
    d: "delete",
    "*": "all",
  };
  const value = String(command ?? "all").toLowerCase();
  return commands[value] ?? value;
}

function normalizeRoles(roles) {
  return (Array.isArray(roles) ? roles : [roles ?? "public"])
    .map((role) => String(role).toLowerCase() === "public" ? "PUBLIC" : String(role))
    .sort();
}

function normalizePolicy(policy) {
  return {
    name: policy.name,
    command: normalizeCommand(policy.command ?? policy.for),
    permissive: policy.permissive ?? String(policy.as ?? "permissive").toLowerCase() !== "restrictive",
    roles: normalizeRoles(policy.roles ?? policy.to),
    usingExpression: normalizeSqlExpression(policy.usingExpression ?? policy.using ?? null),
    checkExpression: normalizeSqlExpression(policy.checkExpression ?? policy.withCheck ?? null),
  };
}

function compareDefinitions(expected, actual, keyOf) {
  const expectedMap = new Map(expected.map((value) => [keyOf(value), value]));
  const actualMap = new Map(actual.map((value) => [keyOf(value), value]));
  const allKeys = new Set([...expectedMap.keys(), ...actualMap.keys()]);
  return {
    missing: [...expectedMap.keys()].filter((key) => !actualMap.has(key)).sort(),
    extra: [...actualMap.keys()].filter((key) => !expectedMap.has(key)).sort(),
    different: [...allKeys].filter((key) => expectedMap.has(key) && actualMap.has(key)
      && JSON.stringify(expectedMap.get(key)) !== JSON.stringify(actualMap.get(key)))
      .sort()
      .map((key) => ({ key, expected: expectedMap.get(key), actual: actualMap.get(key) })),
  };
}

export async function loadExpectedTables() {
  const exports = await tsImport("../shared/schema.ts", import.meta.url);
  const snapshot = generateDrizzleJson(exports);
  const tables = Object.entries(snapshot.tables).map(([qualifiedName, table]) => {
    const separator = qualifiedName.indexOf(".");
    const schema = separator === -1 ? "public" : qualifiedName.slice(0, separator);
    const name = separator === -1 ? qualifiedName : qualifiedName.slice(separator + 1);
    const loadedTable = {
      schema,
      name,
      columns: Object.values(table.columns).map((column) => ({
        name: column.name,
        type: column.type,
        notNull: column.notNull,
        default: column.default ?? null,
        primaryKey: column.primaryKey,
      })),
      foreignKeys: table.foreignKeys,
      uniqueConstraints: table.uniqueConstraints,
      checkConstraints: table.checkConstraints,
      indexes: table.indexes,
      policies: table.policies,
      rlsEnabled: table.isRLSEnabled,
      forceRls: false,
    };
    loadedTable.constraints = expectedConstraints(loadedTable);
    loadedTable.indexes = expectedIndexes(loadedTable);
    loadedTable.policies = Object.values(table.policies ?? {}).map(normalizePolicy)
      .sort((left, right) => left.name.localeCompare(right.name));
    return loadedTable;
  });
  if (!tables.length) throw new Error("No expected tables were found in the code schema.");
  return tables;
}

export function compareTables(expected, live) {
  const key = (table) => JSON.stringify([table.schema, table.name]);
  const label = (table) => `${table.schema}.${table.name}`;
  const columnName = (column) => typeof column === "string" ? column : column.name;
  const expectedMap = new Map(expected.map((table) => [key(table), table]));
  const liveMap = new Map(live.map((table) => [key(table), table]));
  const missingTables = expected.filter((table) => !liveMap.has(key(table))).map(label).sort();
  const notDeclaredInCode = live.filter((table) => !expectedMap.has(key(table))).map(label).sort();
  const shared = expected.filter((table) => liveMap.has(key(table)));
  const columnDifferences = shared.flatMap((table) => {
    const actual = liveMap.get(key(table));
    const expectedColumns = new Map(table.columns.map((column) => [columnName(column), column]));
    const actualColumns = new Map(actual.columns.map((column) => [columnName(column), column]));
    const missingColumns = [...expectedColumns.keys()].filter((name) => !actualColumns.has(name)).sort();
    const extraColumns = [...actualColumns.keys()].filter((name) => !expectedColumns.has(name)).sort();
    const definitionDifferences = [];
    for (const [name, expectedColumn] of expectedColumns) {
      const actualColumn = actualColumns.get(name);
      if (!actualColumn || typeof expectedColumn === "string" || typeof actualColumn === "string") continue;
      const fields = [];
      if (expectedColumn.type !== undefined
        && normalizeType(expectedColumn.type) !== normalizeType(actualColumn.type)) {
        fields.push({ field: "type", expected: expectedColumn.type, actual: actualColumn.type });
      }
      if (expectedColumn.notNull !== undefined && expectedColumn.notNull !== actualColumn.notNull) {
        fields.push({ field: "notNull", expected: expectedColumn.notNull, actual: actualColumn.notNull });
      }
      if (expectedColumn.default !== undefined
        && normalizeDefault(expectedColumn.default, expectedColumn.type, table.name, name, true)
          !== normalizeDefault(actualColumn.default, expectedColumn.type, table.name, name)) {
        fields.push({ field: "default", expected: expectedColumn.default, actual: actualColumn.default });
      }
      if (expectedColumn.primaryKey !== undefined && expectedColumn.primaryKey !== actualColumn.primaryKey) {
        fields.push({ field: "primaryKey", expected: expectedColumn.primaryKey, actual: actualColumn.primaryKey });
      }
      if (fields.length) definitionDifferences.push({ column: name, fields });
    }
    return missingColumns.length || extraColumns.length || definitionDifferences.length
      ? [{ table: label(table), missingColumns, extraColumns, definitionDifferences }] : [];
  }).sort((a, b) => a.table.localeCompare(b.table));
  const rlsDifferences = shared.flatMap((table) => {
    const actual = liveMap.get(key(table));
    return typeof table.rlsEnabled === "boolean" && typeof actual.rlsEnabled === "boolean"
      && table.rlsEnabled !== actual.rlsEnabled
      ? [{ table: label(table), expected: table.rlsEnabled, actual: actual.rlsEnabled }]
      : [];
  }).sort((a, b) => a.table.localeCompare(b.table));
  const forceRlsDifferences = shared.flatMap((table) => {
    const actual = liveMap.get(key(table));
    return typeof table.forceRls === "boolean" && typeof actual.forceRls === "boolean"
      && table.forceRls !== actual.forceRls
      ? [{ table: label(table), expected: table.forceRls, actual: actual.forceRls }]
      : [];
  }).sort((a, b) => a.table.localeCompare(b.table));
  const constraintDifferences = shared.flatMap((table) => {
    const actual = liveMap.get(key(table));
    if (!Array.isArray(table.constraints) && !Array.isArray(actual.constraints)) return [];
    const result = compareDefinitions(
      (table.constraints ?? []).map(normalizeConstraint),
      (actual.constraints ?? []).map(normalizeConstraint),
      (constraint) => constraint.key,
    );
    return result.missing.length || result.extra.length || result.different.length
      ? [{ table: label(table), ...result }] : [];
  }).sort((a, b) => a.table.localeCompare(b.table));
  const indexDifferences = shared.flatMap((table) => {
    const actual = liveMap.get(key(table));
    if (!Array.isArray(table.indexes) && !Array.isArray(actual.indexes)) return [];
    const result = compareDefinitions(
      (table.indexes ?? []).map(normalizeIndex),
      (actual.indexes ?? []).map(normalizeIndex),
      (index) => index.name,
    );
    return result.missing.length || result.extra.length || result.different.length
      ? [{ table: label(table), ...result }] : [];
  }).sort((a, b) => a.table.localeCompare(b.table));
  const policyDifferences = shared.flatMap((table) => {
    const actual = liveMap.get(key(table));
    if (!Array.isArray(table.policies) && !Array.isArray(actual.policies)) return [];
    const result = compareDefinitions(
      (table.policies ?? []).map(normalizePolicy),
      (actual.policies ?? []).map(normalizePolicy),
      (policy) => policy.name,
    );
    return result.missing.length || result.extra.length || result.different.length
      ? [{ table: label(table), ...result }] : [];
  }).sort((a, b) => a.table.localeCompare(b.table));
  const declaredSchemaMatches = missingTables.length === 0
    && columnDifferences.length === 0
    && rlsDifferences.length === 0
    && forceRlsDifferences.length === 0
    && constraintDifferences.length === 0
    && indexDifferences.length === 0
    && policyDifferences.length === 0;
  return {
    expectedTables: expected.map(label).sort(),
    liveTables: live.map(label).sort(),
    matchingTableNames: shared.map(label).sort(),
    missingTables,
    notDeclaredInCode,
    columnDifferences,
    rlsDifferences,
    forceRlsDifferences,
    constraintDifferences,
    indexDifferences,
    policyDifferences,
    declaredSchemaMatches,
    possibleCreateRenameConflict: missingTables.length > 0 && notDeclaredInCode.length > 0,
    scope: "Code-declared tables: column names, types, nullability, defaults, primary keys, constraints, indexes, RLS flags, and policy expressions/roles. Catalog metadata only; no customer rows read. Undeclared tables are reported but not treated as deletion recommendations.",
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
        c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'name', a.attname,
            'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
            'notNull', a.attnotnull,
            'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid),
            'primaryKey', EXISTS (
              SELECT 1 FROM pg_catalog.pg_constraint pk
              WHERE pk.conrelid = c.oid AND pk.contype = 'p'
                AND a.attnum = ANY(pk.conkey)
            )
          ) ORDER BY a.attnum)
          FROM pg_catalog.pg_attribute a
          LEFT JOIN pg_catalog.pg_attrdef d
            ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
        ), '[]'::jsonb) AS columns,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'name', con.conname,
            'type', con.contype::text,
            'columns', COALESCE((
              SELECT jsonb_agg(att.attname ORDER BY key_column.ordinality)
              FROM unnest(con.conkey) WITH ORDINALITY AS key_column(attnum, ordinality)
              JOIN pg_catalog.pg_attribute att
                ON att.attrelid = c.oid AND att.attnum = key_column.attnum
            ), '[]'::jsonb),
            'referencedSchema', referenced_namespace.nspname,
            'referencedTable', referenced_table.relname,
            'referencedColumns', COALESCE((
              SELECT jsonb_agg(ref_att.attname ORDER BY ref_column.ordinality)
              FROM unnest(con.confkey) WITH ORDINALITY AS ref_column(attnum, ordinality)
              JOIN pg_catalog.pg_attribute ref_att
                ON ref_att.attrelid = con.confrelid AND ref_att.attnum = ref_column.attnum
            ), '[]'::jsonb),
            'onDelete', CASE con.confdeltype
              WHEN 'a' THEN 'no action' WHEN 'r' THEN 'restrict'
              WHEN 'c' THEN 'cascade' WHEN 'n' THEN 'set null'
              WHEN 'd' THEN 'set default' ELSE NULL END,
            'onUpdate', CASE con.confupdtype
              WHEN 'a' THEN 'no action' WHEN 'r' THEN 'restrict'
              WHEN 'c' THEN 'cascade' WHEN 'n' THEN 'set null'
              WHEN 'd' THEN 'set default' ELSE NULL END,
            'expression', CASE WHEN con.contype = 'c'
              THEN pg_catalog.pg_get_expr(con.conbin, con.conrelid) ELSE NULL END,
            'nullsNotDistinct', CASE WHEN con.contype = 'u'
              THEN position('NULLS NOT DISTINCT' IN upper(pg_catalog.pg_get_constraintdef(con.oid, true))) > 0
              ELSE false END,
            'validated', con.convalidated
          ) ORDER BY con.conname)
          FROM pg_catalog.pg_constraint con
          LEFT JOIN pg_catalog.pg_class referenced_table
            ON referenced_table.oid = con.confrelid
          LEFT JOIN pg_catalog.pg_namespace referenced_namespace
            ON referenced_namespace.oid = referenced_table.relnamespace
          WHERE con.conrelid = c.oid
        ), '[]'::jsonb) AS constraints,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'name', idx_relation.relname,
            'isUnique', idx_data.indisunique,
            'method', access_method.amname,
            'columns', COALESCE(key_info.columns, '[]'::jsonb),
            'predicate', pg_catalog.pg_get_expr(idx_data.indpred, idx_data.indrelid),
            'with', COALESCE(idx_relation.reloptions, ARRAY[]::text[]),
            'valid', idx_data.indisvalid,
            'ready', idx_data.indisready
          ) ORDER BY idx_relation.relname)
          FROM pg_catalog.pg_index idx_data
          JOIN pg_catalog.pg_class idx_relation ON idx_relation.oid = idx_data.indexrelid
          JOIN pg_catalog.pg_am access_method ON access_method.oid = idx_relation.relam
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(jsonb_build_object(
              'expression', pg_catalog.pg_get_indexdef(
                idx_data.indexrelid, key_column.ordinality::integer, true
              ),
              'asc', COALESCE((index_option.option_value & 1) = 0, true),
              'nulls', CASE WHEN COALESCE((index_option.option_value & 2) = 2, false)
                THEN 'first' ELSE 'last' END
            ) ORDER BY key_column.ordinality) AS columns
            FROM unnest(idx_data.indkey) WITH ORDINALITY AS key_column(attnum, ordinality)
            LEFT JOIN LATERAL unnest(idx_data.indoption)
              WITH ORDINALITY AS index_option(option_value, ordinality)
              ON index_option.ordinality = key_column.ordinality
            WHERE key_column.ordinality <= idx_data.indnkeyatts
          ) key_info ON true
          WHERE idx_data.indrelid = c.oid
            AND NOT EXISTS (
              SELECT 1 FROM pg_catalog.pg_constraint index_constraint
              WHERE index_constraint.conindid = idx_data.indexrelid
            )
        ), '[]'::jsonb) AS indexes,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'name', policy.polname,
            'command', policy.polcmd::text,
            'permissive', policy.polpermissive,
            'roles', COALESCE((
              SELECT jsonb_agg(
                CASE WHEN policy_role.role_id = 0 THEN 'PUBLIC' ELSE role.rolname END
              )
              FROM unnest(policy.polroles) AS policy_role(role_id)
              LEFT JOIN pg_catalog.pg_roles role ON role.oid = policy_role.role_id
            ), '[]'::jsonb),
            'usingExpression', pg_catalog.pg_get_expr(policy.polqual, policy.polrelid),
            'checkExpression', pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid)
          ) ORDER BY policy.polname)
          FROM pg_catalog.pg_policy policy
          WHERE policy.polrelid = c.oid
        ), '[]'::jsonb) AS policies
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ANY($1::text[]) AND c.relkind IN ('r', 'p')
      ORDER BY n.nspname, c.relname
      LIMIT 1001
    `, [schemas]);
    if (result.rows.length > 1000) throw new Error("Catalog exceeds comparison limit; no partial report will be used.");
    const tables = result.rows.map((row) => ({
      schema: row.schema,
      name: row.name,
      columns: row.columns ?? [],
      constraints: row.constraints ?? [],
      indexes: row.indexes ?? [],
      policies: row.policies ?? [],
      rlsEnabled: row.rls_enabled,
      forceRls: row.force_rls,
    }));
    report = compareTables(expected, tables);
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
    logger.log("Schema comparison completed read-only. No schema or customer data was changed.");
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await inspectDatabaseTables();
}
