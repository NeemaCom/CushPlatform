// @vitest-environment node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "vitest";
import { assessPush, pushDatabaseSchema, resolveDrizzleCli } from "./push-db-schema.mjs";

const uri = "postgresql://synthetic_user:synthetic_password@invalid.example/db";

test("resolves the real installed CLI without a database connection", () => {
  const output = execFileSync(process.execPath, [resolveDrizzleCli(), "--version"], { encoding: "utf8" });
  assert.match(output, /drizzle-kit: /);
});

async function run(source, options = {}) {
  const lines = [];
  const code = await pushDatabaseSchema({
    connectionString: uri,
    command: process.execPath,
    args: ["-e", source],
    logger: { log: (line) => lines.push(line), error: (line) => lines.push(line) },
    ...options,
  });
  return { code, output: lines.join("\n") };
}

test("accepts only explicit successful completion (including ANSI and no changes)", async () => {
  for (const message of ["[✓] Changes applied", "\x1b[32m[i]\x1b[0m No changes detected"]) {
    assert.equal((await run(`console.log(${JSON.stringify(message)})`)).code, 0);
  }
});

test("a zero exit after an interactive prompt is a failure", async () => {
  const result = await run('console.error("Error: Interactive prompts require a TTY terminal"); process.exitCode = 0');
  assert.equal(result.code, 1);
  assert.match(result.output, /No choices were accepted/);
});

test("fails on silent exits, aborts, and errors even with completion text", async () => {
  for (const source of [
    "",
    'console.log("[x] All changes were aborted")',
    'console.log("[✓] Changes applied"); console.error("Error: synthetic failure")',
    'console.log("[✓] Changes applied"); process.exitCode = 2',
  ]) assert.equal((await run(source)).code, 1);
});

test("handles stderr completion and missing final newline", async () => {
  assert.equal((await run('process.stderr.write("[i] No changes detected")')).code, 0);
});

test("redacts credentials split across chunks on either stream", async () => {
  const result = await run(`
    process.stdout.write("synthetic_");
    setTimeout(() => {
      process.stdout.write("password\\n");
      process.stderr.write(process.env.DATABASE_URL + "\\n");
    }, 10);
  `);
  assert.equal(result.code, 1);
  assert.ok(!result.output.includes("synthetic_password"));
  assert.ok(!result.output.includes("synthetic_user"));
  assert.ok(!result.output.includes(uri));
});

test("never allocates a terminal or supplies prompt input", async () => {
  const result = await run(`
    if (process.stdin.isTTY || process.stdout.isTTY) process.exit(2);
    process.stdin.on("data", () => process.exit(3));
    process.stdin.on("end", () => console.log("[i] No changes detected"));
    process.stdin.resume();
  `);
  assert.equal(result.code, 0);
});

test("spawn failures, timeouts, and excessive output fail closed", async () => {
  assert.equal((await run("", { command: "/nonexistent-cush-test-command" })).code, 1);
  assert.equal((await run("setInterval(() => {}, 1000)", { timeout: 100 })).code, 1);
  assert.equal((await run('process.stdout.write("x".repeat(70_000))')).code, 1);
});

test("validates configuration before attempting a child process", async () => {
  const result = await run('console.log("SHOULD_NOT_RUN")', { connectionString: "" });
  assert.equal(result.code, 1);
  assert.ok(!result.output.includes("SHOULD_NOT_RUN"));
});

test("signals always override a completion marker", () => {
  assert.match(assessPush({ code: 0, signal: "SIGTERM", completed: true }), /partial/);
});
