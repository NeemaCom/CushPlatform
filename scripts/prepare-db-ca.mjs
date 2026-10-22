import { X509Certificate } from "node:crypto";
import { appendFile, chmod, mkdtemp, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

class CaConfigurationError extends Error {}

export function validateCaBundle(pem, now = new Date()) {
  if (!pem?.trim()) {
    throw new CaConfigurationError("SUPABASE_CA_CERT is missing. Add the Supabase CA certificate PEM as a GitHub Actions secret.");
  }
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
  const remainder = blocks.reduce((text, block) => text.replace(block, ""), pem);
  if (!blocks.length || remainder.trim() || pem.length > 65_536) {
    throw new CaConfigurationError("SUPABASE_CA_CERT must contain only PEM CA certificates, including their BEGIN/END CERTIFICATE lines. Do not supply a private key.");
  }
  for (const block of blocks) {
    let certificate;
    try {
      certificate = new X509Certificate(block);
    } catch {
      throw new CaConfigurationError("SUPABASE_CA_CERT contains an invalid PEM certificate.");
    }
    if (!certificate.ca) {
      throw new CaConfigurationError("SUPABASE_CA_CERT must contain a CA certificate, not a server/leaf certificate.");
    }
    if (now < new Date(certificate.validFrom) || now > new Date(certificate.validTo)) {
      throw new CaConfigurationError("SUPABASE_CA_CERT contains an expired or not-yet-valid certificate.");
    }
  }
  return blocks.join("\n") + "\n";
}

export async function prepareDatabaseCa({ pem, runnerTemp, githubEnv, now }) {
  const validated = validateCaBundle(pem, now);
  if (![runnerTemp, githubEnv].every((value) =>
    typeof value === "string" && isAbsolute(value) && !/[\r\n]/.test(value)
  )) {
    throw new CaConfigurationError("RUNNER_TEMP and GITHUB_ENV must be valid runner file paths.");
  }
  const directory = await mkdtemp(join(runnerTemp, "cush-database-ca-"));
  await chmod(directory, 0o700);
  const certificateFile = join(directory, "supabase-ca.pem");
  await writeFile(certificateFile, validated, { mode: 0o600, flag: "wx" });
  // Only the temporary path is exported. Never print/export the certificate text.
  await appendFile(githubEnv, `DATABASE_CA_CERT_FILE=${certificateFile}\n`, "utf8");
  return certificateFile;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await prepareDatabaseCa({
      pem: process.env.SUPABASE_CA_CERT,
      runnerTemp: process.env.RUNNER_TEMP,
      githubEnv: process.env.GITHUB_ENV,
    });
    console.log("Database CA certificate validated and installed in a private temporary file. Full TLS verification is enabled for database connections.");
  } catch (error) {
    console.error(error instanceof CaConfigurationError
      ? error.message
      : "Could not prepare the database CA certificate. Check the runner's temporary-file permissions.");
    process.exitCode = 1;
  }
}
