import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rootCertificates } from "node:tls";
import { afterEach, test, vi } from "vitest";
import { prepareDatabaseCa, validateCaBundle } from "./prepare-db-ca.mjs";

// Public built-in root certificates only: no real GitHub secrets are accessed.
const caPem = rootCertificates.find((pem) => {
  const cert = new X509Certificate(pem);
  return cert.ca && new Date(cert.validFrom) < new Date() && new Date(cert.validTo) > new Date();
});
assert.ok(caPem, "Node must provide a currently valid root CA for these tests");
const temporaryDirectories = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetModules();
  await Promise.all(temporaryDirectories.splice(0).map((path) =>
    rm(path, { recursive: true, force: true })
  ));
});

test("valid CA bundles are accepted, including CRLF line endings", () => {
  assert.ok(validateCaBundle(caPem).includes("BEGIN CERTIFICATE"));
  assert.equal(validateCaBundle(caPem.replace(/\n/g, "\r\n")).trim().replace(/\r/g, ""), caPem.trim());
  assert.ok(validateCaBundle(`${caPem}\n${caPem}`).endsWith("\n"));
});

test("missing certificates, invalid PEM, private keys, and extra text fail safely", () => {
  for (const pem of [
    undefined,
    "",
    "not-a-certificate",
    "-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----",
    "-----BEGIN PRIVATE KEY-----\nsynthetic-private-material\n-----END PRIVATE KEY-----",
    `${caPem}\nunexpected-extra-text`,
  ]) {
    assert.throws(() => validateCaBundle(pem), (error) => {
      assert.ok(!error.message.includes("synthetic-private-material"));
      assert.ok(!error.message.includes(caPem));
      return true;
    });
  }
});

test("expired and not-yet-valid CA certificates are rejected", () => {
  const cert = new X509Certificate(caPem);
  assert.throws(() => validateCaBundle(caPem, new Date(new Date(cert.validTo).getTime() + 1_000)), /expired/);
  assert.throws(() => validateCaBundle(caPem, new Date(new Date(cert.validFrom).getTime() - 1_000)), /not-yet-valid/);
});

test("CA file is private and only its path is written to GitHub's environment file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cush-ca-test-"));
  temporaryDirectories.push(directory);
  const githubEnv = join(directory, "github-env");
  const certificateFile = await prepareDatabaseCa({ pem: caPem, runnerTemp: directory, githubEnv });
  assert.equal((await stat(certificateFile)).mode & 0o777, 0o600);
  assert.equal((await stat(join(certificateFile, ".."))).mode & 0o777, 0o700);
  assert.equal(await readFile(certificateFile, "utf8"), validateCaBundle(caPem));
  const env = await readFile(githubEnv, "utf8");
  assert.equal(env, `DATABASE_CA_CERT_FILE=${certificateFile}\n`);
  assert.ok(!env.includes("BEGIN CERTIFICATE"));

  // Exercise the real pg URL parser, without opening a database connection.
  const { default: pg } = await import("pg");
  const url = new URL("postgresql://synthetic:synthetic@example.invalid/postgres");
  url.searchParams.set("sslrootcert", certificateFile);
  url.searchParams.set("sslmode", "verify-full");
  const client = new pg.Client({ connectionString: url.toString() });
  assert.equal(client.ssl.ca, validateCaBundle(caPem));
  assert.notEqual(client.ssl.rejectUnauthorized, false);
  assert.equal(client.ssl.checkServerIdentity, undefined);
});

test("invalid runner paths cannot inject extra environment variables", async () => {
  await assert.rejects(prepareDatabaseCa({
    pem: caPem,
    runnerTemp: "/tmp\nUNEXPECTED=true",
    githubEnv: "/tmp/github-env",
  }), /valid runner file paths/);
});

test("Drizzle uses the same verified CA policy in production", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@example.invalid/postgres?sslmode=no-verify&uselibpqcompat=true");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_CA_CERT_FILE", "/tmp/synthetic-root.pem");
  vi.resetModules();
  const { default: config } = await import("../drizzle.config.ts");
  const url = new URL(config.dbCredentials.url);
  assert.equal(url.searchParams.get("sslmode"), "verify-full");
  assert.equal(url.searchParams.get("sslrootcert"), "/tmp/synthetic-root.pem");
  assert.equal(url.searchParams.has("uselibpqcompat"), false);
});

test("production no longer silently disables certificate verification without a CA", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@example.invalid/postgres?sslmode=verify-full");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_CA_CERT_FILE", "");
  vi.resetModules();
  const { default: config } = await import("../drizzle.config.ts");
  assert.equal(new URL(config.dbCredentials.url).searchParams.get("sslmode"), "verify-full");
});
