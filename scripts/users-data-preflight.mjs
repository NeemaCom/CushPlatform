import { pathToFileURL } from "node:url";
import { createRedactor, describeErrors, parseDatabaseUrl } from "./check-db-connection.mjs";

export const usersDataPreflightSql = `
  WITH user_rows AS MATERIALIZED (
    SELECT
      username,
      email,
      username IS NULL AS null_username,
      email IS NULL AS null_email,
      password_hash IS NULL AS null_password_hash,
      first_name IS NULL AS null_first_name,
      last_name IS NULL AS null_last_name,
      accept_terms IS NULL AS null_accept_terms,
      accept_privacy IS NULL AS null_accept_privacy,
      username IS NOT NULL AND btrim(username) = '' AS empty_username,
      email IS NOT NULL AND btrim(email) = '' AS empty_email,
      accept_terms IS FALSE AS false_accept_terms,
      accept_privacy IS FALSE AS false_accept_privacy
    FROM public.users
  ),
  row_counts AS (
    SELECT
      count(*) AS total_users,
      count(*) FILTER (WHERE null_username) AS null_username,
      count(*) FILTER (WHERE null_email) AS null_email,
      count(*) FILTER (WHERE null_password_hash) AS null_password_hash,
      count(*) FILTER (WHERE null_first_name) AS null_first_name,
      count(*) FILTER (WHERE null_last_name) AS null_last_name,
      count(*) FILTER (WHERE null_accept_terms) AS null_accept_terms,
      count(*) FILTER (WHERE null_accept_privacy) AS null_accept_privacy,
      count(*) FILTER (WHERE empty_username) AS empty_username,
      count(*) FILTER (WHERE empty_email) AS empty_email,
      count(*) FILTER (WHERE false_accept_terms) AS false_accept_terms,
      count(*) FILTER (WHERE false_accept_privacy) AS false_accept_privacy
    FROM user_rows
  ),
  identifier_values AS (
    SELECT 'username_exact' AS metric, username AS identifier
    FROM user_rows WHERE username IS NOT NULL
    UNION ALL
    SELECT 'username_normalized', lower(btrim(username))
    FROM user_rows WHERE username IS NOT NULL AND btrim(username) <> ''
    UNION ALL
    SELECT 'email_exact', email
    FROM user_rows WHERE email IS NOT NULL
    UNION ALL
    SELECT 'email_normalized', lower(btrim(email))
    FROM user_rows WHERE email IS NOT NULL AND btrim(email) <> ''
  ),
  duplicate_groups AS (
    SELECT metric, identifier, count(*) AS duplicate_count
    FROM identifier_values
    GROUP BY metric, identifier
    HAVING count(*) > 1
  ),
  duplicate_counts AS (
    SELECT metric, count(*) AS duplicate_group_count, sum(duplicate_count - 1) AS extra_rows
    FROM duplicate_groups
    GROUP BY metric
  )
  SELECT
    row_counts.*,
    coalesce((SELECT duplicate_group_count FROM duplicate_counts WHERE metric = 'username_exact'), 0) AS username_exact_duplicate_groups,
    coalesce((SELECT extra_rows FROM duplicate_counts WHERE metric = 'username_exact'), 0) AS username_exact_extra_rows,
    coalesce((SELECT duplicate_group_count FROM duplicate_counts WHERE metric = 'username_normalized'), 0) AS username_normalized_duplicate_groups,
    coalesce((SELECT extra_rows FROM duplicate_counts WHERE metric = 'username_normalized'), 0) AS username_normalized_extra_rows,
    coalesce((SELECT duplicate_group_count FROM duplicate_counts WHERE metric = 'email_exact'), 0) AS email_exact_duplicate_groups,
    coalesce((SELECT extra_rows FROM duplicate_counts WHERE metric = 'email_exact'), 0) AS email_exact_extra_rows,
    coalesce((SELECT duplicate_group_count FROM duplicate_counts WHERE metric = 'email_normalized'), 0) AS email_normalized_duplicate_groups,
    coalesce((SELECT extra_rows FROM duplicate_counts WHERE metric = 'email_normalized'), 0) AS email_normalized_extra_rows
  FROM row_counts
`;

const countFields = [
  "total_users",
  "null_username",
  "null_email",
  "null_password_hash",
  "null_first_name",
  "null_last_name",
  "null_accept_terms",
  "null_accept_privacy",
  "empty_username",
  "empty_email",
  "false_accept_terms",
  "false_accept_privacy",
  "username_exact_duplicate_groups",
  "username_exact_extra_rows",
  "username_normalized_duplicate_groups",
  "username_normalized_extra_rows",
  "email_exact_duplicate_groups",
  "email_exact_extra_rows",
  "email_normalized_duplicate_groups",
  "email_normalized_extra_rows",
];

function countValue(value, field) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`The aggregate preflight returned an invalid count for ${field}.`);
  }
  return count;
}

export function summarizeUsersDataPreflight(row) {
  if (!row) throw new Error("The aggregate preflight returned no result row.");
  return Object.fromEntries(countFields.map((field) => [field, countValue(row[field], field)]));
}

export async function runUsersDataPreflight({
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
  let exitCode = 0;
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
      query_timeout: 20_000,
      statement_timeout: 15_000,
      application_name: "cush-read-only-users-data-preflight",
    });
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const result = await client.query(usersDataPreflightSql);
    if (result.rows?.length !== 1) {
      throw new Error("The aggregate preflight did not return exactly one summary row.");
    }
    report = summarizeUsersDataPreflight(result.rows[0]);
    await client.query("ROLLBACK");
  } catch (error) {
    exitCode = 1;
    logger.error("User data preflight failed: " + JSON.stringify(describeErrors(error, redact)));
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        exitCode = 1;
        logger.error("User data preflight connection cleanup failed.");
      }
    }
  }
  if (exitCode === 0) {
    logger.log("USER_DATA_PREFLIGHT " + JSON.stringify(report));
    logger.log("User data preflight completed read-only; only aggregate counts were output.");
  }
  return exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runUsersDataPreflight();
}
