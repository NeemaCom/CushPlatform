import { pathToFileURL } from "node:url";
import { createRedactor, describeErrors, parseDatabaseUrl } from "./check-db-connection.mjs";

export const sensitiveTables = ["evidence_vault", "financial_signals", "passports"];
export const clientRoles = ["anon", "authenticated"];
export const serverRoles = ["service_role"];

export const auditSql = `
  WITH checked AS (
    SELECT c.oid, c.relname AS table_name, c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS force_rls, n.oid AS schema_oid,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END,
          'privilege', acl.privilege_type,
          'grantable', acl.is_grantable
        ) ORDER BY CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END, acl.privilege_type)
        FROM pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) acl
        LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
      ), '[]'::jsonb) AS acl
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) AND c.relkind IN ('r', 'p')
  )
  SELECT checked.table_name, checked.rls_enabled, checked.force_rls, checked.acl,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'role', r.rolname,
        'schemaUsage', pg_catalog.has_schema_privilege(r.oid, checked.schema_oid, 'USAGE'),
        'select', pg_catalog.has_table_privilege(r.oid, checked.oid, 'SELECT'),
        'insert', pg_catalog.has_table_privilege(r.oid, checked.oid, 'INSERT'),
        'update', pg_catalog.has_table_privilege(r.oid, checked.oid, 'UPDATE'),
        'delete', pg_catalog.has_table_privilege(r.oid, checked.oid, 'DELETE'),
        'bypassRls', r.rolbypassrls
      ) ORDER BY r.rolname)
      FROM pg_catalog.pg_roles r
      WHERE r.rolname = ANY($2::text[])
    ), '[]'::jsonb) AS effective_roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', p.polname, 'command', p.polcmd,
        'permissive', p.polpermissive,
        'roles', (SELECT COALESCE(jsonb_agg(CASE WHEN x.role_oid = 0 THEN 'PUBLIC' ELSE pr.rolname END
          ORDER BY CASE WHEN x.role_oid = 0 THEN 'PUBLIC' ELSE pr.rolname END), '[]'::jsonb)
          FROM unnest(p.polroles) AS x(role_oid)
          LEFT JOIN pg_catalog.pg_roles pr ON pr.oid = x.role_oid)
      ) ORDER BY p.polname)
      FROM pg_catalog.pg_policy p WHERE p.polrelid = checked.oid
    ), '[]'::jsonb) AS policies
  FROM checked
  ORDER BY checked.table_name
`;

export function summarizeAccess(rows, rolesExpected = [...clientRoles, ...serverRoles]) {
  const tables = rows.map((row) => {
    const roles = row.effective_roles ?? [];
    const exposedClientRoles = roles
      .filter((role) => clientRoles.includes(role.role) && role.schemaUsage
        && !row.rls_enabled
        && (role.select || role.insert || role.update || role.delete))
      .map((role) => role.role)
      .sort();
    return {
      table: `public.${row.table_name}`,
      rlsEnabled: row.rls_enabled,
      forceRls: row.force_rls,
      effectiveRolePrivileges: roles,
      rowLevelPolicies: row.policies ?? [],
      explicitPublicAcl: (row.acl ?? []).filter((grant) => grant.grantee === "PUBLIC"),
      rolesNotPresent: rolesExpected.filter((role) => !roles.some((entry) => entry.role === role)),
      unprotectedClientAccess: exposedClientRoles,
    };
  });
  return {
    tables,
    summary: tables.flatMap((table) =>
      table.unprotectedClientAccess.map((role) => `${role} has schema access and table privileges while RLS is disabled on ${table.table}`),
    ),
    scope: "System catalogs only; no customer records read. Checks effective Postgres privileges, schema USAGE, RLS flags, and policy names/commands. RLS policy expressions and Supabase API configuration are not evaluated.",
  };
}

export async function auditDatabaseAccess({
  connectionString = process.env.DATABASE_URL,
  caFile = process.env.DATABASE_CA_CERT_FILE,
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
      application_name: "cush-read-only-access-audit",
    });
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const result = await client.query(auditSql, [
      sensitiveTables,
      [...clientRoles, ...serverRoles],
    ]);
    if (result.rows.length !== sensitiveTables.length
      || sensitiveTables.some((name) => !result.rows.some((row) => row.table_name === name))) {
      throw new Error("One or more expected sensitive tables are missing; no complete access report can be produced.");
    }
    report = summarizeAccess(result.rows);
    await client.query("ROLLBACK");
  } catch (error) {
    code = 1;
    logger.error("Database access audit failed: " + JSON.stringify(describeErrors(error, redact)));
  } finally {
    if (client) {
      try { await client.end(); } catch {
        code = 1;
        logger.error("Database access audit connection cleanup failed.");
      }
    }
  }
  if (code === 0) {
    logger.log("ACCESS_AUDIT " + redact(JSON.stringify(report)));
    logger.log("Access audit completed read-only. No privileges or policies were changed.");
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await auditDatabaseAccess();
}
