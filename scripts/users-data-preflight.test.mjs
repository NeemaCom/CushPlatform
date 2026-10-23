// @vitest-environment node
import assert from "node:assert/strict";
import { test } from "vitest";
import {
  runUsersDataPreflight,
  summarizeUsersDataPreflight,
  usersDataPreflightSql,
} from "./users-data-preflight.mjs";

const zeroCounts = {
  total_users: "0",
  null_username: "0",
  null_email: "0",
  null_password_hash: "0",
  null_first_name: "0",
  null_last_name: "0",
  null_accept_terms: "0",
  null_accept_privacy: "0",
  empty_username: "0",
  empty_email: "0",
  false_accept_terms: "0",
  false_accept_privacy: "0",
  username_exact_duplicate_groups: "0",
  username_exact_extra_rows: "0",
  username_normalized_duplicate_groups: "0",
  username_normalized_extra_rows: "0",
  email_exact_duplicate_groups: "0",
  email_exact_extra_rows: "0",
  email_normalized_duplicate_groups: "0",
  email_normalized_extra_rows: "0",
};

test("preflight query returns only aggregate counts and uses one read-only snapshot", () => {
  assert.match(usersDataPreflightSql, /WITH user_rows AS MATERIALIZED/);
  assert.match(usersDataPreflightSql, /GROUP BY metric, identifier/);
  assert.match(usersDataPreflightSql, /count\(\*\) FILTER \(WHERE null_accept_terms\)/);
  assert.match(usersDataPreflightSql, /count\(\*\) FILTER \(WHERE null_accept_privacy\)/);
  assert.match(usersDataPreflightSql, /username_normalized_duplicate_groups/);
  assert.match(usersDataPreflightSql, /email_normalized_duplicate_groups/);
  assert.doesNotMatch(usersDataPreflightSql, /^\s*(INSERT|UPDATE|DELETE|ALTER|GRANT|REVOKE|DROP|CREATE)\b/im);
});

test("summarizes only known non-negative count fields", () => {
  const summary = summarizeUsersDataPreflight({
    ...zeroCounts,
    total_users: "24",
    null_accept_terms: "2",
    email_exact_duplicate_groups: "1",
    email_exact_extra_rows: "3",
  });
  assert.equal(summary.total_users, 24);
  assert.equal(summary.null_accept_terms, 2);
  assert.equal(summary.email_exact_duplicate_groups, 1);
  assert.equal(summary.email_exact_extra_rows, 3);
  assert.equal(Object.hasOwn(summary, "email"), false);
  assert.throws(() => summarizeUsersDataPreflight({ ...zeroCounts, total_users: "-1" }), /invalid count/);
  assert.throws(() => summarizeUsersDataPreflight(undefined), /no result row/);
});

function fixture({ error } = {}) {
  const queries = [];
  const logs = [];
  let closed = false;
  let config;
  const client = {
    connect: async () => {},
    query: async (sql) => {
      queries.push(sql);
      if (error) throw new Error(error);
      if (sql === usersDataPreflightSql) return { rows: [zeroCounts] };
      return { rows: [] };
    },
    end: async () => { closed = true; },
  };
  return {
    queries,
    logs,
    closed: () => closed,
    config: () => config,
    options: {
      connectionString: "postgresql://synthetic_user:synthetic_password@invalid.example/db?sslmode=no-verify",
      caFile: "/tmp/test-public-ca.pem",
      clientFactory: (value) => { config = value; return client; },
      logger: { log: (line) => logs.push(line), error: (line) => logs.push(line) },
    },
  };
}

test("runs a read-only aggregate query with TLS verification and outputs counts only", async () => {
  const f = fixture();
  assert.equal(await runUsersDataPreflight(f.options), 0);
  assert.equal(f.queries[0], "BEGIN READ ONLY");
  assert.equal(f.queries[1], usersDataPreflightSql);
  assert.equal(f.queries.at(-1), "ROLLBACK");
  const url = new URL(f.config().connectionString);
  assert.equal(url.searchParams.get("sslmode"), "verify-full");
  assert.equal(url.searchParams.get("sslrootcert"), "/tmp/test-public-ca.pem");
  assert.equal(f.config().application_name, "cush-read-only-users-data-preflight");
  assert.equal(f.closed(), true);
  const reportLine = f.logs.find((line) => line.startsWith("USER_DATA_PREFLIGHT "));
  assert.ok(reportLine);
  assert.deepEqual(JSON.parse(reportLine.slice("USER_DATA_PREFLIGHT ".length)), summarizeUsersDataPreflight(zeroCounts));
  assert.ok(f.logs.some((line) => line.includes("only aggregate counts were output")));
});

test("redacts connection credentials when the aggregate query fails", async () => {
  const f = fixture({ error: "failed at postgres://synthetic_user:synthetic_password@invalid.example/db" });
  assert.equal(await runUsersDataPreflight(f.options), 1);
  assert.equal(f.closed(), true);
  assert.equal(f.logs.some((line) => line.includes("synthetic_password")), false);
  assert.equal(f.logs.some((line) => line.includes("postgres://synthetic_user")), false);
});
