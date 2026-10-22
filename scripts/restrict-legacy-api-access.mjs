import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  legacyClientTables, restrictApiTableAccess,
} from "./restrict-passport-api-access.mjs";

export async function restrictLegacyApiAccess(options = {}) {
  return restrictApiTableAccess({
    ...options,
    tableNames: legacyClientTables,
    sqlLoader: options.sqlLoader
      ?? (() => readFile(new URL("../migrations/manual/revoke-preserved-api-role-grants.sql", import.meta.url), "utf8")),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await restrictLegacyApiAccess();
}
