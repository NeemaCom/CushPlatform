# Database workflow: verified TLS

The **Push Database Schema** workflow validates connectivity before running
Drizzle. Choose **diagnostics_only** in the manual dispatch form to perform only
the read-only check. Leave it selected when investigating connection problems.

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

Both the preflight and Drizzle explicitly use the supplied CA with
`sslmode=verify-full`. This checks the certificate chain **and** the hostname.
Do not resolve TLS failures using `no-verify` or
`NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Safe verification

1. Run **Push Database Schema** on `main` with **diagnostics_only checked**.
2. Confirm the CA setup and read-only query succeed. The schema-push step must be
   skipped.
3. Before a real push, verify the target, review the schema changes, and take an
   appropriate backup. Only then run with **diagnostics_only unchecked**.
   `drizzle-kit push --force` can alter or remove data.

Diagnostic messages redact connection URIs and credentials. Never copy secret
values into issues or chat.
