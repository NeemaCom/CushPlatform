import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import maxmind, { type CountryResponse, type Reader } from "maxmind";

const COUNTRY_DATABASE_URL =
  "https://github.com/sapics/ip-location-db/releases/download/latest/user-country.mmdb";
const MAX_DATABASE_BYTES = 16 * 1024 * 1024;
const DATABASE_REFRESH_MS = 24 * 60 * 60 * 1000;
const FAILED_REFRESH_RETRY_MS = 15 * 60 * 1000;
const configuredDatabasePath = process.env.CUSH_COUNTRY_DATABASE_PATH?.trim();
const databasePath = configuredDatabasePath
  || join(tmpdir(), "cush-visitor-intelligence", "user-country.mmdb");

type CountryDatabaseRecord = CountryResponse & { country_code?: unknown };

let countryReader: Reader<CountryDatabaseRecord> | null = null;
let databaseBuildDate: string | null = null;
let lastCheckedAt: string | null = null;
let nextRefreshAt = 0;
let refreshInFlight: Promise<void> | null = null;
let lastRefreshFailed = false;

export type VisitorCountryDatabaseStatus = {
  ready: boolean;
  source: "local-country-database";
  dataAsOf: string | null;
  lastCheckedAt: string | null;
  unavailable: boolean;
};

export function normalizeVisitorIpAddress(ip: string | null | undefined): string | null {
  if (typeof ip !== "string") return null;
  const normalized = ip.trim().replace(/^::ffff:/i, "");
  return normalized || null;
}

export function extractVisitorCountryCode(record: unknown): string | null {
  if (!record || typeof record !== "object") return null;
  const value = record as {
    country_code?: unknown;
    country?: { iso_code?: unknown } | null;
  };
  const candidate = value.country?.iso_code ?? value.country_code;
  return typeof candidate === "string" && /^[A-Za-z]{2}$/.test(candidate)
    ? candidate.toUpperCase()
    : null;
}

async function openCountryDatabase(path: string) {
  const file = await stat(path);
  if (file.size <= 0 || file.size > MAX_DATABASE_BYTES) {
    throw new Error("Country database has an invalid size.");
  }
  const reader = await maxmind.open<CountryDatabaseRecord>(path);
  if (!reader.metadata.databaseType.toLowerCase().includes("country")) {
    throw new Error("Configured GeoIP database is not a country database.");
  }
  return reader;
}

async function loadCachedDatabase() {
  if (countryReader) return true;
  try {
    const reader = await openCountryDatabase(databasePath);
    countryReader = reader;
    databaseBuildDate = reader.metadata.buildEpoch
      ? String(reader.metadata.buildEpoch)
      : null;
    lastRefreshFailed = false;
    return true;
  } catch {
    return false;
  }
}

async function refreshCountryDatabase() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    lastCheckedAt = new Date().toISOString();
    if (await loadCachedDatabase()) {
      if (configuredDatabasePath) {
        nextRefreshAt = Number.POSITIVE_INFINITY;
        return;
      }
    } else if (configuredDatabasePath) {
      lastRefreshFailed = true;
      nextRefreshAt = Date.now() + FAILED_REFRESH_RETRY_MS;
      return;
    }

    const temporaryPath = `${databasePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await mkdir(dirname(databasePath), { recursive: true });
      const response = await fetch(COUNTRY_DATABASE_URL, {
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/octet-stream" },
      });
      if (!response.ok) {
        throw new Error(`Country database download returned HTTP ${response.status}.`);
      }

      const declaredSize = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredSize) && declaredSize > MAX_DATABASE_BYTES) {
        throw new Error("Country database download exceeded the size limit.");
      }
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length <= 0 || data.length > MAX_DATABASE_BYTES) {
        throw new Error("Country database download has an invalid size.");
      }

      await writeFile(temporaryPath, data, { flag: "wx" });
      const reader = await openCountryDatabase(temporaryPath);
      await rename(temporaryPath, databasePath);
      countryReader = reader;
      databaseBuildDate = reader.metadata.buildEpoch
        ? String(reader.metadata.buildEpoch)
        : null;
      lastRefreshFailed = false;
      nextRefreshAt = Date.now() + DATABASE_REFRESH_MS;
    } catch (error) {
      lastRefreshFailed = true;
      nextRefreshAt = Date.now() + FAILED_REFRESH_RETRY_MS;
      if (!countryReader) {
        console.warn("[visitor-intelligence] Local country database is unavailable.");
      } else {
        console.warn("[visitor-intelligence] Could not refresh the local country database; keeping the existing copy.");
      }
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  })();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function prepareVisitorCountryLookup() {
  if (countryReader && Date.now() < nextRefreshAt) return;
  if (countryReader && !configuredDatabasePath) {
    void refreshCountryDatabase();
    return;
  }
  if (Date.now() < nextRefreshAt) return;
  await refreshCountryDatabase();
}

export function lookupVisitorCountryCode(ip: string | null | undefined): string | null {
  const address = normalizeVisitorIpAddress(ip);
  if (!address || !countryReader || !maxmind.validate(address)) return null;
  return extractVisitorCountryCode(countryReader.get(address));
}

export function getVisitorCountryDatabaseStatus(): VisitorCountryDatabaseStatus {
  return {
    ready: Boolean(countryReader),
    source: "local-country-database",
    dataAsOf: databaseBuildDate,
    lastCheckedAt,
    unavailable: lastRefreshFailed,
  };
}
