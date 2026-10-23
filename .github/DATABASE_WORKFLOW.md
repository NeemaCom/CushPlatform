# Database workflow: verified TLS

The **Push Database Schema** workflow validates connectivity before running
Drizzle. **diagnostics_only** defaults to checked, so a manual run is read-only
unless explicitly switched off. A real push also requires entering
`APPLY_SCHEMA_CHANGES` in **confirm_schema_push**. Passport migrations and schema
pushes share one concurrency lock so they cannot modify the database at once.

## GitHub Actions secrets

Under the repository's **Settings → Secrets and variables → Actions**, configure:

- `DATABASE_URL`: the complete URI for the intended Supabase database. The current
  GitHub runner needs the IPv4-compatible **Session pooler** endpoint (port 5432).
  Copy the full URI from Supabase's Connect dialog, including its pooler username.
  Replace and URL-encode the password placeholder. Do not add `DATABASE_URL=`.
- `SUPABASE_CA_CERT`: the complete PEM text of the CA certificate downloaded from
  the intended Supabase project's **Database Settings → SSL Configuration**.
  Include the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines.
  Supply the CA certificate, never a private key or a downloaded server leaf
  certificate.

The workflow validates the CA's format, CA flag, and validity dates. It writes
the certificate to a private temporary file, exports only the file path, and
removes the file at the end of the job. Missing or invalid CA material stops the
job before any database connection or schema push.

The connection checks and Drizzle explicitly use the supplied CA with
`sslmode=verify-full`. This checks the certificate chain **and** the hostname.
Do not resolve TLS failures using `no-verify` or
`NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Safe verification

1. Run **Push Database Schema** on `main` with **diagnostics_only checked**.
2. Confirm the CA setup and read-only query succeed. The schema-push step must be
   skipped. The read-only comparison checks code-declared tables, column types,
   nullability, defaults, primary keys, constraints, indexes, RLS settings, and
   policy roles and expressions using PostgreSQL system catalogs only. It reads
   no customer records. Undeclared live tables are reported, not treated as
   deletion recommendations. A mismatch is diagnostic only; it never changes the database.
3. The separate users-data preflight runs in a read-only transaction and writes
   aggregate counts only: null/empty required account fields, false consent
   flags, and exact or case/whitespace-normalized duplicate username/email
   groups and extra rows. It never outputs identifiers, hashes, names, or other
   individual account values.
4. Before a real push, verify the target, review the schema changes, and take an
   appropriate backup. Only then uncheck **diagnostics_only** and enter
   `APPLY_SCHEMA_CHANGES`. `drizzle-kit push --force` can alter or remove data.
   The local `npm run db:push` command uses the same guard and requires
   `CONFIRM_DB_SCHEMA_PUSH=APPLY_SCHEMA_CHANGES`.

Diagnostic messages redact connection URIs and credentials. Never copy secret
values into issues or chat.

## Schema decisions and accurate failure reporting

The push runs through a non-interactive guard using the installed Drizzle CLI.
It supplies no answers and does not allocate a terminal. A zero exit code alone
is insufficient: the guard also requires Drizzle's explicit **Changes applied**
or **No changes detected** message and rejects errors, aborted operations,
signals, timeouts, and interactive prompts. Output is credential-redacted.

Drizzle's `--force` skips data-loss approval, **not** create-versus-rename
decisions. When live tables are absent from the code schema and code tables are
absent from the live database, Drizzle may ask whether to create or rename them.
CI must fail rather than guess, since a wrong choice can destroy data.

For that failure, compare the intended schema with the intended Supabase
database, including any existing tables owned by other services. Decide which
tables are new and which represent genuine renames. Resolve these choices in
a reviewed migration or an attended terminal session with a current backup.
Do not pipe `yes`, auto-select the first option, or emulate a terminal in CI.
If a push fails after execution has begun, inspect for partial changes before
retrying; the guard cannot roll them back.

The `cush_sessions` table is managed by the server's session-store migration,
not Drizzle. Other undeclared tables such as `cush` and `session` must remain
untouched until their ownership and purpose are verified.

## Additive passport tables migration

**Apply Passport Tables Migration** is a separate manual workflow for the
approved addition of `passports`, `financial_signals`, and `evidence_vault`.
Its reviewed SQL is `migrations/manual/create-passport-tables.sql`.
Enter `CREATE_PASSPORT_TABLES` in the confirmation input.

This workflow does not run a forced schema push. It requires the previously
identified `users`, `cush`, and `session` tables to exist and all three target
tables to be absent. It refuses partial or repeated application rather than
silently skipping existing objects.

The runner checks the SQL against the current code schema before connecting,
uses verified TLS, takes a transaction-scoped advisory lock, and executes all
DDL in one transaction with bounded statement and lock timeouts. Before
committing, it verifies new column types, defaults, nullability, primary keys,
unique constraints, foreign keys, and RLS flags. It also compares the existing tables'
identities, column definitions, own constraints, indexes, ACLs, and RLS flags.
New inbound foreign keys add PostgreSQL internal reference triggers on `users`;
that is expected, not a rename or change to its columns or rows.

All three new tables have row-level security enabled, matching
`shared/schema.ts`. There are currently no client policies, so `anon` and
`authenticated` requests are denied by default even where table grants exist.
The server database owner can bypass RLS. Do not add policies or expose a
service-role credential to clients until ownership rules are explicitly designed.

Failures before commit trigger rollback. A lost connection during commit has
an uncertain outcome and must be inspected before retrying. A separate read-only
catalog comparison runs after commit. No customer records are read, changed, or
deleted by this migration, and no existing tables are dropped or renamed.
