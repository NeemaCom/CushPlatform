import Decimal from "decimal.js";

const CBN_RATES_URL = "https://www.cbn.gov.ng/api/GetAllExchangeRates?format=json";
const RATE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_RATE_RESPONSE_BYTES = 20_000_000;
const MAX_PREVIOUS_RATE_DAYS = 7;

export type SupportedCurrency = "GBP" | "USD" | "NGN";

interface RawCbnRate {
  currency?: unknown;
  ratedate?: unknown;
  centralrate?: unknown;
}

export interface CbnDailyRates {
  requestedDate: string;
  effectiveDate: string;
  usdNgnCentralRate: string;
  gbpNgnCentralRate: string;
}

interface CachedRate {
  date: string;
  usd: string;
  gbp: string;
}

interface CachedRates {
  expiresAt: number;
  rows: CachedRate[];
}

let ratesCache: CachedRates | null = null;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateRate(value: string): Decimal {
  if (!/^\d+(?:\.\d{1,4})?$/.test(value)) {
    throw new Error("CBN returned an invalid exchange rate.");
  }
  const rate = new Decimal(value);
  if (!rate.isFinite() || rate.lte(0)) throw new Error("CBN returned an invalid exchange rate.");
  return rate;
}

async function loadRates(fetcher: typeof fetch): Promise<CachedRate[]> {
  if (ratesCache && ratesCache.expiresAt > Date.now()) return ratesCache.rows;

  let response: Response;
  try {
    response = await fetcher(CBN_RATES_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error("The CBN exchange-rate service is unavailable.");
  }
  if (!response.ok) throw new Error("The CBN exchange-rate service is unavailable.");

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RATE_RESPONSE_BYTES) {
    throw new Error("The CBN exchange-rate response is too large.");
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new Error("The CBN exchange-rate response could not be read.");
  }
  if (text.length > MAX_RATE_RESPONSE_BYTES) {
    throw new Error("The CBN exchange-rate response is too large.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The CBN exchange-rate response was invalid.");
  }
  if (!Array.isArray(parsed)) throw new Error("The CBN exchange-rate response was invalid.");

  const byDate = new Map<string, { usd?: string; gbp?: string }>();
  for (const value of parsed as RawCbnRate[]) {
    if (typeof value.ratedate !== "string" || !isValidDate(value.ratedate) ||
        typeof value.currency !== "string" || typeof value.centralrate !== "string") continue;
    const currency = value.currency.trim().toUpperCase();
    if (currency !== "US DOLLAR" && currency !== "POUNDS STERLING") continue;
    try {
      validateRate(value.centralrate);
    } catch {
      continue;
    }
    const row = byDate.get(value.ratedate) ?? {};
    if (currency === "US DOLLAR") row.usd = value.centralrate;
    if (currency === "POUNDS STERLING") row.gbp = value.centralrate;
    byDate.set(value.ratedate, row);
  }

  const rows = [...byDate.entries()]
    .filter(([, value]) => value.usd && value.gbp)
    .map(([date, value]) => ({ date, usd: value.usd!, gbp: value.gbp! }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length === 0) throw new Error("No usable CBN central exchange rates were returned.");

  ratesCache = { rows, expiresAt: Date.now() + RATE_CACHE_TTL_MS };
  return rows;
}

function daysBetween(from: string, to: string): number {
  return Math.floor(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

export async function getCbnDailyRates(
  requestedDate: string,
  fetcher: typeof fetch = fetch,
): Promise<CbnDailyRates> {
  if (!isValidDate(requestedDate)) throw new Error("A valid exchange-rate date is required.");
  const rows = await loadRates(fetcher);
  let matched: CachedRate | undefined;
  for (const row of rows) {
    if (row.date > requestedDate) break;
    matched = row;
  }
  if (!matched || daysBetween(matched.date, requestedDate) > MAX_PREVIOUS_RATE_DAYS) {
    throw new Error(`No recent CBN central exchange rate is available for ${requestedDate}.`);
  }
  return {
    requestedDate,
    effectiveDate: matched.date,
    usdNgnCentralRate: matched.usd,
    gbpNgnCentralRate: matched.gbp,
  };
}

export function convertMinorToGbpPence(
  amountMinor: number,
  currencyCode: SupportedCurrency,
  rates: Pick<CbnDailyRates, "usdNgnCentralRate" | "gbpNgnCentralRate">,
): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error("The transaction amount must be a non-negative safe integer.");
  }
  if (currencyCode === "GBP") return amountMinor;

  const gbpRate = validateRate(rates.gbpNgnCentralRate);
  const converted = currencyCode === "NGN"
    ? new Decimal(amountMinor).div(gbpRate)
    : new Decimal(amountMinor).mul(validateRate(rates.usdNgnCentralRate)).div(gbpRate);
  const result = converted.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  if (!Number.isSafeInteger(result)) throw new Error("The converted amount exceeds supported precision.");
  return result;
}

export function clearCbnRateCacheForTests() {
  ratesCache = null;
}
