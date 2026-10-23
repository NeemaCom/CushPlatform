import assert from "node:assert/strict";
import { tsImport } from "tsx/esm/api";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";

export const createdTables = ["evidence_vault", "financial_signals", "passports"];
export const preservedTables = ["cush", "session", "users"];

export async function loadMigrationContract() {
  const schema = await tsImport("../shared/schema.ts", import.meta.url);
  const before = generateDrizzleJson({ users: schema.users });
  // Keep this reviewed migration scoped to its approved passport tables.
  // Unrelated server-only tables have their own migration and review contract.
  const passportSchema = {
    users: schema.users,
    passports: schema.passports,
    financialSignals: schema.financialSignals,
    evidenceVault: schema.evidenceVault,
  };
  const after = generateDrizzleJson(passportSchema);
  const generated = await generateMigration(before, after);
  const qualify = (sql) => sql.replace(/^(CREATE TABLE|ALTER TABLE) "/, '$1 "public"."');
  return { statements: generated.map(qualify), tables: after.tables, snapshot: after };
}

const normalize = (sql) => sql.replace(/\s+/g, " ").trim().replace(/;$/, "");

export function validateMigrationSql(sql, contract) {
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  assert.deepEqual(statements.map(normalize).sort(), contract.statements.map(normalize).sort(),
    "Migration SQL no longer matches the code schema; review before applying.");
  const created = [];
  for (const statement of statements) {
    const match = /^(CREATE TABLE|ALTER TABLE) "public"\."([^"]+)"/.exec(statement);
    assert.ok(match && createdTables.includes(match[2]), "Migration may only change the three approved new tables.");
    if (match[1] === "CREATE TABLE") created.push(match[2]);
    else if (/^ALTER TABLE "public"\."[^"]+" ADD CONSTRAINT "[^"]+" FOREIGN KEY /.test(statement)) {
      continue;
    } else {
      assert.match(statement, /^ALTER TABLE "public"\."[^"]+" ENABLE ROW LEVEL SECURITY$/);
    }
  }
  assert.deepEqual(created.sort(), createdTables);
  return statements;
}

// Catalogs only: no customer records or row counts. Inbound foreign keys add
// internal triggers on users; those are expected and not part of its own definition.
export const metadataSql = `
  SELECT c.relname AS name, c.oid::text AS oid,
    c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls,
    c.relacl::text AS acl,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'notNull', a.attnotnull, 'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid))
      ORDER BY a.attnum)
      FROM pg_catalog.pg_attribute a
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped), '[]'::jsonb) AS columns,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'name', con.conname, 'type', con.contype, 'valid', con.convalidated,
      'definition', pg_catalog.pg_get_constraintdef(con.oid))
      ORDER BY con.conname)
      FROM pg_catalog.pg_constraint con WHERE con.conrelid = c.oid), '[]'::jsonb) AS constraints,
    COALESCE((SELECT jsonb_agg(pg_catalog.pg_get_indexdef(i.indexrelid) ORDER BY i.indexrelid)
      FROM pg_catalog.pg_index i WHERE i.indrelid = c.oid), '[]'::jsonb) AS indexes
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
    AND c.relkind IN ('r', 'p')
  ORDER BY c.relname
`;

const normalizeType = (value) => value.replace(/^serial$/, "integer")
  .replace(/^timestamp$/, "timestamp without time zone").replace(/\s/g, "");
const normalizeDefault = (value) => value == null ? null : String(value).replace(/::text\b/g, "");

export function verifyNewTables(rows, contract) {
  for (const name of createdTables) {
    const actual = rows.find((row) => row.name === name);
    const expected = contract.tables[`public.${name}`];
    assert.ok(actual && expected, `Missing migration table: ${name}`);
    assert.equal(actual.rls_enabled, expected.isRLSEnabled, `RLS mismatch for ${name}`);
    assert.equal(actual.force_rls, false, `Unexpected forced RLS setting for ${name}`);
    assert.deepEqual(actual.columns.map((c) => c.name).sort(), Object.keys(expected.columns).sort(),
      `Column names differ for ${name}`);
    for (const column of Object.values(expected.columns)) {
      const found = actual.columns.find((c) => c.name === column.name);
      assert.equal(normalizeType(found.type), normalizeType(column.type), `Column type mismatch: ${name}.${column.name}`);
      assert.equal(found.notNull, column.notNull, `Nullability mismatch: ${name}.${column.name}`);
      if (column.type === "serial") assert.match(found.default ?? "", /^nextval\(/);
      else assert.equal(normalizeDefault(found.default), normalizeDefault(column.default), `Default mismatch: ${name}.${column.name}`);
    }
    const constraints = actual.constraints;
    const foreignKeys = Object.values(expected.foreignKeys);
    const uniques = Object.values(expected.uniqueConstraints);
    assert.equal(constraints.length, 1 + foreignKeys.length + uniques.length);
    assert.ok(constraints.some((c) => c.type === "p" && c.valid && c.definition === "PRIMARY KEY (id)"));
    for (const fk of foreignKeys) {
      const actualFk = constraints.find((c) => c.name === fk.name && c.type === "f" && c.valid);
      assert.ok(actualFk, `Missing valid foreign key ${fk.name}`);
      assert.equal(actualFk.definition,
        `FOREIGN KEY (${fk.columnsFrom.join(", ")}) REFERENCES ${fk.tableTo}(${fk.columnsTo.join(", ")}) ON DELETE CASCADE`);
    }
    for (const unique of uniques) {
      assert.ok(constraints.some((c) => c.name === unique.name && c.type === "u" && c.valid
        && c.definition === `UNIQUE (${unique.columns.join(", ")})`), `Missing unique constraint ${unique.name}`);
    }
  }
}
