import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { pathToFileURL } from "node:url";
import { createRedactor, parseDatabaseUrl } from "./check-db-connection.mjs";

const require = createRequire(import.meta.url);
const stripAnsi = (text) => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");

export function resolveDrizzleCli() {
  // bin.cjs is not a package export; resolve the public entry point first.
  return join(dirname(require.resolve("drizzle-kit")), "bin.cjs");
}

export function assessPush({ code, signal, completed, failed, prompt, outputOverflow }) {
  if (prompt) {
    return "Drizzle requires an interactive schema decision (such as create versus rename). No choices were accepted. Review the existing and intended tables and resolve this with a reviewed migration or an attended terminal session; then retry. Do not pipe automatic answers into CI.";
  }
  if (outputOverflow) return "Drizzle output exceeded the safe line limit; the process was stopped. Review the schema before retrying.";
  if (signal || code !== 0) return "Drizzle did not exit successfully. Schema changes may be partial; inspect the database before retrying.";
  if (failed) return "Drizzle reported an error despite exiting with code zero. Schema application is not confirmed.";
  if (!completed) return "Drizzle exited without an explicit completion message. Schema application is not confirmed.";
  return null;
}

export async function pushDatabaseSchema({
  connectionString = process.env.DATABASE_URL,
  command = process.execPath,
  args,
  logger = console,
  timeout = 300_000,
} = {}) {
  let url;
  try {
    url = parseDatabaseUrl(connectionString);
  } catch (error) {
    logger.error(error.message);
    return 1;
  }
  const redact = createRedactor(connectionString, url);
  const state = { completed: false, failed: false, prompt: false, outputOverflow: false };
  let child;
  try {
    // Use the installed, lockfile-controlled CLI. Never allocate a TTY or supply answers.
    child = spawn(command, args ?? [resolveDrizzleCli(), "push", "--force"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, DATABASE_URL: connectionString, NO_COLOR: "1" },
      timeout,
      killSignal: "SIGKILL",
    });
  } catch {
    logger.error("Unable to start the installed Drizzle CLI.");
    return 1;
  }
  const consumeLine = (line) => {
    const plain = stripAnsi(line).trim();
    if (!plain) return;
    if (/^\[(?:✓|i)\] (?:Changes applied|No changes detected)$/.test(plain)) state.completed = true;
    if (/\berror:|\bfatal:|^error$|all changes were aborted/i.test(plain)) state.failed = true;
    if (/interactive prompts require|created or renamed from another/i.test(plain)) state.prompt = true;
    // Redact only after buffering full lines so split credentials cannot leak.
    logger.log(redact(plain));
  };
  for (const stream of [child.stdout, child.stderr]) {
    const decoder = new StringDecoder("utf8");
    let pending = "";
    stream.on("data", (chunk) => {
      pending += decoder.write(chunk);
      let index;
      while ((index = pending.search(/[\r\n]/)) !== -1) {
        const line = pending.slice(0, index);
        pending = pending.slice(index + 1);
        if (line.length > 65_536) {
          state.outputOverflow = true;
          child.kill("SIGKILL");
        } else consumeLine(line);
      }
      if (pending.length > 65_536) {
        pending = "";
        state.outputOverflow = true;
        child.kill("SIGKILL");
      }
    });
    stream.on("end", () => {
      pending += decoder.end();
      if (pending && !state.outputOverflow) consumeLine(pending);
    });
  }
  const result = await new Promise((resolve) => {
    child.on("error", () => { state.failed = true; });
    child.on("close", (code, signal) => resolve({ code, signal }));
  });
  const failure = assessPush({ ...state, ...result });
  if (failure) {
    logger.error("Schema push failed: " + failure);
    return 1;
  }
  logger.log("Schema push verified: Drizzle explicitly reported completion.");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await pushDatabaseSchema();
}
