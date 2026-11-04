import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type PlaidEnvironment = "sandbox" | "production";

type PlaidConfiguration = {
  environment: PlaidEnvironment;
  baseUrl: string;
  clientId: string;
  secret: string;
  tokenEncryptionKey: Buffer;
  redirectUri?: string;
};

export type PlaidRuntimeStatus = {
  environment: PlaidEnvironment;
  configured: boolean;
};

export type PlaidIdentityAccount = {
  accountKey: string;
  accountName: string | null;
  owners: Array<{ name: string; emails: string[]; phones: string[] }>;
};

export type PlaidTransaction = {
  id: string;
  date: string;
  name: string;
  amount: number;
  currencyCode: string | null;
  category: string | null;
};

export type PlaidTransactionsReview = {
  startDate: string;
  endDate: string;
  totalCount: number;
  returnedCount: number;
  truncated: boolean;
  items: PlaidTransaction[];
};

export type PlaidReview = {
  identityAccounts: PlaidIdentityAccount[];
  transactions: PlaidTransactionsReview;
  identityNotice?: string;
  transactionsNotice?: string;
};

export class PlaidNotConfiguredError extends Error {
  constructor() {
    super("Plaid is not configured.");
    this.name = "PlaidNotConfiguredError";
  }
}

export class PlaidRequestError extends Error {
  constructor(
    readonly status: number,
    readonly providerCode?: string,
  ) {
    super("Plaid request failed.");
    this.name = "PlaidRequestError";
  }
}

const PLAID_VERSION = "2020-09-14";
const DEFAULT_TRANSACTION_DAYS = 90;
const TRANSACTION_PAGE_SIZE = 500;
const MAX_REVIEW_TRANSACTIONS = 1_000;

function parseEncryptionKey(value: string | undefined): Buffer | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!/^[A-Za-z0-9+/]{43}=$/.test(normalized)) return null;
  const key = Buffer.from(normalized, "base64");
  return key.length === 32 ? key : null;
}

function readConfiguration(): { status: PlaidRuntimeStatus; config: PlaidConfiguration | null } {
  const isProductionRuntime = process.env.NODE_ENV === "production";
  const requestedEnvironment = process.env.PLAID_ENV;
  const environment: PlaidEnvironment = requestedEnvironment === "sandbox" || requestedEnvironment === "production"
    ? requestedEnvironment
    : isProductionRuntime ? "production" : "sandbox";
  const sandboxProductionOptIn = process.env.PLAID_ALLOW_SANDBOX_IN_PRODUCTION === "true";
  const environmentMatchesRuntime = isProductionRuntime
    ? requestedEnvironment === "production" ||
      (requestedEnvironment === "sandbox" && sandboxProductionOptIn)
    : environment === "sandbox";
  const clientId = process.env.PLAID_CLIENT_ID?.trim() ?? "";
  const secret = process.env.PLAID_SECRET?.trim() ?? "";
  const tokenEncryptionKey = parseEncryptionKey(process.env.PLAID_TOKEN_ENCRYPTION_KEY);
  const configured = environmentMatchesRuntime && Boolean(clientId && secret && tokenEncryptionKey);
  const status: PlaidRuntimeStatus = { environment, configured };

  if (!configured || !tokenEncryptionKey) return { status, config: null };
  return {
    status,
    config: {
      environment,
      baseUrl: environment === "production" ? "https://production.plaid.com" : "https://sandbox.plaid.com",
      clientId,
      secret,
      tokenEncryptionKey,
      ...(process.env.PLAID_REDIRECT_URI?.trim()
        ? { redirectUri: process.env.PLAID_REDIRECT_URI.trim() }
        : {}),
    },
  };
}

export function getPlaidRuntimeStatus(): PlaidRuntimeStatus {
  return readConfiguration().status;
}

function requireConfiguration(): PlaidConfiguration {
  const { config } = readConfiguration();
  if (!config) throw new PlaidNotConfiguredError();
  return config;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function plaidPost<T>(
  path: string,
  payload: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const config = requireConfiguration();
  const response = await fetcher(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Plaid-Version": PLAID_VERSION,
    },
    body: JSON.stringify({
      client_id: config.clientId,
      secret: config.secret,
      ...payload,
    }),
  });

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }
  if (!response.ok) {
    const providerCode = isRecord(responseBody) && typeof responseBody.error_code === "string"
      ? responseBody.error_code.slice(0, 80)
      : undefined;
    throw new PlaidRequestError(response.status, providerCode);
  }
  if (!isRecord(responseBody)) throw new PlaidRequestError(502);
  return responseBody as T;
}

export async function createPlaidLinkToken(userId: number, fetcher?: typeof fetch): Promise<string> {
  const config = requireConfiguration();
  const response = await plaidPost<{ link_token?: unknown }>("/link/token/create", {
    client_name: "Cush",
    country_codes: ["GB"],
    language: "en",
    user: { client_user_id: `cush-user-${userId}` },
    products: ["identity", "transactions"],
    transactions: { days_requested: DEFAULT_TRANSACTION_DAYS },
    ...(config.redirectUri ? { redirect_uri: config.redirectUri } : {}),
  }, fetcher);
  if (typeof response.link_token !== "string" || response.link_token.length < 20) {
    throw new PlaidRequestError(502);
  }
  return response.link_token;
}

export async function exchangePlaidPublicToken(
  publicToken: string,
  fetcher?: typeof fetch,
): Promise<{ accessToken: string; itemId: string }> {
  const response = await plaidPost<{ access_token?: unknown; item_id?: unknown }>(
    "/item/public_token/exchange",
    { public_token: publicToken },
    fetcher,
  );
  if (
    typeof response.access_token !== "string" || !response.access_token ||
    typeof response.item_id !== "string" || !response.item_id
  ) {
    throw new PlaidRequestError(502);
  }
  return { accessToken: response.access_token, itemId: response.item_id };
}

export function encryptPlaidAccessToken(
  accessToken: string,
  key = requireConfiguration().tokenEncryptionKey,
): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(accessToken, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptPlaidAccessToken(
  encrypted: { ciphertext: string; iv: string; authTag: string },
  key = requireConfiguration().tokenEncryptionKey,
): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export async function removePlaidItem(accessToken: string, fetcher?: typeof fetch): Promise<void> {
  await plaidPost("/item/remove", { access_token: accessToken }, fetcher);
}

function cleanString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, maximumLength);
  return cleaned || null;
}

function normalizeIdentity(response: unknown): PlaidIdentityAccount[] {
  if (!isRecord(response) || !Array.isArray(response.accounts)) return [];
  return response.accounts.flatMap((candidate, accountIndex) => {
    if (!isRecord(candidate)) return [];
    const owners = Array.isArray(candidate.owners) ? candidate.owners.flatMap((ownerCandidate) => {
      if (!isRecord(ownerCandidate)) return [];
      const names = Array.isArray(ownerCandidate.names) ? ownerCandidate.names : [];
      const emails = Array.isArray(ownerCandidate.emails) ? ownerCandidate.emails : [];
      const phones = Array.isArray(ownerCandidate.phone_numbers) ? ownerCandidate.phone_numbers : [];
      const name = names.map((item) => cleanString(item, 160)).find(Boolean) ?? "";
      const emailValues = emails.flatMap((item) =>
        isRecord(item) ? [cleanString(item.data, 254)].filter((value): value is string => Boolean(value)) : [],
      ).slice(0, 5);
      const phoneValues = phones.flatMap((item) =>
        isRecord(item) ? [cleanString(item.data, 40)].filter((value): value is string => Boolean(value)) : [],
      ).slice(0, 5);
      if (!name && !emailValues.length && !phoneValues.length) return [];
      return [{ name, emails: emailValues, phones: phoneValues }];
    }) : [];
    return [{
      accountKey: `account-${accountIndex + 1}`,
      accountName: cleanString(candidate.name, 120),
      owners,
    }];
  }).slice(0, 50);
}

function normalizeTransaction(candidate: unknown): PlaidTransaction | null {
  if (!isRecord(candidate)) return null;
  const id = cleanString(candidate.transaction_id, 120);
  const date = cleanString(candidate.date, 10);
  const name = cleanString(candidate.name, 160);
  const amount = typeof candidate.amount === "number" && Number.isFinite(candidate.amount)
    ? candidate.amount
    : null;
  if (!id || !date || !name || amount === null) return null;
  const currencyCandidate = cleanString(candidate.iso_currency_code, 3);
  const currencyCode = currencyCandidate && /^[A-Z]{3}$/.test(currencyCandidate)
    ? currencyCandidate
    : null;
  const category = isRecord(candidate.personal_finance_category)
    ? cleanString(candidate.personal_finance_category.primary, 80)
    : Array.isArray(candidate.category)
      ? cleanString(candidate.category[0], 80)
      : null;
  return { id, date, name, amount, currencyCode, category };
}

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchIdentity(accessToken: string, fetcher?: typeof fetch): Promise<PlaidIdentityAccount[]> {
  const response = await plaidPost<{ accounts?: unknown }>(
    "/identity/get",
    { access_token: accessToken },
    fetcher,
  );
  return normalizeIdentity(response);
}

async function fetchTransactions(
  accessToken: string,
  fetcher?: typeof fetch,
): Promise<PlaidTransactionsReview> {
  const end = new Date();
  const start = new Date(end.getTime());
  start.setUTCDate(start.getUTCDate() - (DEFAULT_TRANSACTION_DAYS - 1));
  const startDate = utcDateString(start);
  const endDate = utcDateString(end);
  const items: PlaidTransaction[] = [];
  let totalCount = 0;
  let offset = 0;

  while (items.length < MAX_REVIEW_TRANSACTIONS && (offset === 0 || offset < totalCount)) {
    const response = await plaidPost<{
      total_transactions?: unknown;
      transactions?: unknown;
    }>("/transactions/get", {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: Math.min(TRANSACTION_PAGE_SIZE, MAX_REVIEW_TRANSACTIONS - items.length),
        offset,
      },
    }, fetcher);
    const page = Array.isArray(response.transactions) ? response.transactions : [];
    totalCount = typeof response.total_transactions === "number" && Number.isFinite(response.total_transactions)
      ? Math.max(0, response.total_transactions)
      : items.length + page.length;
    items.push(...page.map(normalizeTransaction).filter((item): item is PlaidTransaction => item !== null));
    if (page.length === 0) break;
    offset += page.length;
    if (offset >= totalCount) break;
  }

  const limitedItems = items.slice(0, MAX_REVIEW_TRANSACTIONS);
  return {
    startDate,
    endDate,
    totalCount,
    returnedCount: limitedItems.length,
    truncated: totalCount > limitedItems.length,
    items: limitedItems,
  };
}

export async function getPlaidReview(
  accessToken: string,
  fetcher?: typeof fetch,
): Promise<PlaidReview> {
  const [identityResult, transactionsResult] = await Promise.allSettled([
    fetchIdentity(accessToken, fetcher),
    fetchTransactions(accessToken, fetcher),
  ]);
  const emptyTransactions: PlaidTransactionsReview = {
    startDate: "",
    endDate: "",
    totalCount: 0,
    returnedCount: 0,
    truncated: false,
    items: [],
  };
  return {
    identityAccounts: identityResult.status === "fulfilled" ? identityResult.value : [],
    transactions: transactionsResult.status === "fulfilled" ? transactionsResult.value : emptyTransactions,
    ...(identityResult.status === "rejected"
      ? { identityNotice: "Plaid account-holder details are not available for this connection." }
      : {}),
    ...(transactionsResult.status === "rejected"
      ? { transactionsNotice: "Transaction history is not available yet. Try again later." }
      : {}),
  };
}
