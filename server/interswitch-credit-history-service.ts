import type { NormalizedCreditHistory } from "./interswitch-credit-history-scoring";

const AUTH_PATH = "/marketplace-routing/api/v1/authentication/client";
const HISTORY_PATH = "/marketplace-routing/api/v1/verify/identity/credit-history-lookup";
const MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

interface Environment {
  [key: string]: string | undefined;
  INTERSWITCH_CLIENT_ID?: string;
  INTERSWITCH_SECRET_KEY?: string;
  INTERSWITCH_CREDIT_HISTORY_AUTH_URL?: string;
  INTERSWITCH_CREDIT_HISTORY_URL?: string;
  INTERSWITCH_CREDIT_HISTORY_LIVE_ENABLED?: string;
  INTERSWITCH_CREDIT_HISTORY_MAPPING_CONFIRMED?: string;
  INTERSWITCH_CREDIT_HISTORY_IDENTITY_MATCH_CONFIRMED?: string;
  INTERSWITCH_CREDIT_HISTORY_INQUIRY_EFFECTS_CONFIRMED?: string;
}

export class InterswitchCreditHistoryError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = "InterswitchCreditHistoryError";
  }
}

function providerUrl(value: string | undefined, expectedPath: string): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const allowedHost = url.hostname === "sandbox.interswitchng.com" ||
      url.hostname === "api-marketplace-routing.interswitchng.com";
    if (
      url.protocol !== "https:" ||
      !allowedHost ||
      url.pathname !== expectedPath ||
      (url.port !== "" && url.port !== "443") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) return null;
    return url;
  } catch {
    return null;
  }
}

type ProviderMode = "sandbox" | "production" | "unconfigured";

function providerMode(authUrl: URL | null, historyUrl: URL | null): ProviderMode {
  if (!authUrl || !historyUrl) return "unconfigured";
  if (authUrl.hostname === "sandbox.interswitchng.com" &&
      historyUrl.hostname === "sandbox.interswitchng.com") {
    return "sandbox";
  }
  if (authUrl.hostname === "api-marketplace-routing.interswitchng.com" &&
      historyUrl.hostname === "api-marketplace-routing.interswitchng.com") {
    return "production";
  }
  return "unconfigured";
}

function readConfig(env: Environment) {
  const clientId = env.INTERSWITCH_CLIENT_ID?.trim();
  const secretKey = env.INTERSWITCH_SECRET_KEY?.trim();
  const authUrl = providerUrl(env.INTERSWITCH_CREDIT_HISTORY_AUTH_URL, AUTH_PATH);
  const historyUrl = providerUrl(env.INTERSWITCH_CREDIT_HISTORY_URL, HISTORY_PATH);
  if (!clientId || !secretKey || !authUrl || !historyUrl) return null;
  const mode = providerMode(authUrl, historyUrl);
  if (mode === "unconfigured") return null;
  if (mode === "production" && (
    env.INTERSWITCH_CREDIT_HISTORY_LIVE_ENABLED !== "true" ||
    env.INTERSWITCH_CREDIT_HISTORY_MAPPING_CONFIRMED !== "true" ||
    env.INTERSWITCH_CREDIT_HISTORY_IDENTITY_MATCH_CONFIRMED !== "true" ||
    env.INTERSWITCH_CREDIT_HISTORY_INQUIRY_EFFECTS_CONFIRMED !== "true"
  )) return null;
  return { clientId, secretKey, authUrl, historyUrl };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedStatus(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[\s-]+/g, "_")
    : "";
}

function mapLoanStatus(value: unknown): keyof NormalizedCreditHistory["loanStatusCounts"] {
  const status = normalizedStatus(value);
  if (["open", "active"].includes(status)) return "open";
  if (["closed", "settled", "repaid"].includes(status)) return "closed";
  return "other";
}

function mapPerformanceStatus(value: unknown): keyof NormalizedCreditHistory["performanceStatusCounts"] {
  const status = normalizedStatus(value);
  if (status === "performing") return "performing";
  if (["non_performing", "delinquent", "default", "defaulted"].includes(status)) return "nonPerforming";
  return "other";
}

function mapRepaymentStatus(value: unknown): keyof NormalizedCreditHistory["repaymentStatusCounts"] {
  const status = normalizedStatus(value);
  if (["paid", "on_time", "settled", "completed", "repaid"].includes(status)) return "settled";
  if (["overdue", "late", "past_due"].includes(status)) return "overdue";
  if (["missed", "default", "defaulted", "written_off", "non_performing"].includes(status)) return "adverse";
  if (["pending", "due", "processing"].includes(status)) return "pending";
  return "other";
}

export function normalizeInterswitchCreditHistory(payload: unknown): NormalizedCreditHistory {
  if (!isRecord(payload) || payload.success !== true || String(payload.code) !== "200" ||
      !isRecord(payload.data) || !Array.isArray(payload.data.credit_history)) {
    throw new InterswitchCreditHistoryError("Interswitch returned an unexpected credit-history response.");
  }

  const rows = payload.data.credit_history;
  const result: NormalizedCreditHistory = {
    accountsReported: rows.length,
    historyRecords: 0,
    loanStatusCounts: { open: 0, closed: 0, other: 0 },
    performanceStatusCounts: { performing: 0, nonPerforming: 0, other: 0 },
    repaymentStatusCounts: { settled: 0, overdue: 0, adverse: 0, pending: 0, other: 0 },
  };

  for (const account of rows) {
    if (!isRecord(account)) continue;
    const history = Array.isArray(account.history) ? account.history : [];
    for (const item of history) {
      if (!isRecord(item)) continue;
      result.historyRecords += 1;
      result.loanStatusCounts[mapLoanStatus(item.loan_status)] += 1;
      result.performanceStatusCounts[mapPerformanceStatus(item.performance_status)] += 1;
      const schedule = Array.isArray(item.repayment_schedule) ? item.repayment_schedule : [];
      for (const installment of schedule) {
        if (!isRecord(installment)) continue;
        result.repaymentStatusCounts[mapRepaymentStatus(installment.status)] += 1;
      }
    }
  }
  return result;
}

export function createInterswitchCreditHistoryClient(options: {
  getEnvironment?: () => Environment;
  fetchImpl?: typeof fetch;
} = {}) {
  const getEnvironment = options.getEnvironment ?? (() => process.env);
  const fetchImpl = options.fetchImpl ?? fetch;
  let accessToken: string | null = null;
  let tokenExpiresAt = 0;
  let pendingTokenRequest: Promise<string> | null = null;

  function getConfig() {
    return readConfig(getEnvironment());
  }

  async function readJson(response: Response): Promise<unknown> {
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new InterswitchCreditHistoryError("Interswitch response exceeded the size limit.", response.status);
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
      throw new InterswitchCreditHistoryError("Interswitch response exceeded the size limit.", response.status);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new InterswitchCreditHistoryError("Interswitch returned an unreadable response.", response.status);
    }
  }

  async function requestToken(config: NonNullable<ReturnType<typeof readConfig>>): Promise<string> {
    if (accessToken && tokenExpiresAt > Date.now() + 30_000) return accessToken;
    if (pendingTokenRequest) return pendingTokenRequest;
    pendingTokenRequest = (async () => {
      let response: Response;
      try {
        response = await fetchImpl(config.authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ clientId: config.clientId, clientSecret: config.secretKey }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new InterswitchCreditHistoryError("Could not connect to Interswitch authentication.");
      }
      if (!response.ok) throw new InterswitchCreditHistoryError("Interswitch authentication failed.", response.status);
      const body = await readJson(response);
      const data = isRecord(body) && isRecord(body.data) ? body.data : null;
      const token = data?.access_token;
      const expiresIn = Number(data?.expires_in);
      if (typeof token !== "string" || token.length === 0 ||
          !Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new InterswitchCreditHistoryError("Interswitch returned an invalid access token.");
      }
      accessToken = token;
      tokenExpiresAt = Date.now() + expiresIn * 1000;
      return token;
    })();
    try {
      return await pendingTokenRequest;
    } finally {
      pendingTokenRequest = null;
    }
  }

  return {
    isConfigured(): boolean {
      return getConfig() !== null;
    },

    getReadiness() {
      const env = getEnvironment();
      const authUrl = providerUrl(env.INTERSWITCH_CREDIT_HISTORY_AUTH_URL, AUTH_PATH);
      const historyUrl = providerUrl(env.INTERSWITCH_CREDIT_HISTORY_URL, HISTORY_PATH);
      return {
        mode: providerMode(authUrl, historyUrl),
        configured: readConfig(env) !== null,
        liveEnabled: env.INTERSWITCH_CREDIT_HISTORY_LIVE_ENABLED === "true",
        providerMappingConfirmed: env.INTERSWITCH_CREDIT_HISTORY_MAPPING_CONFIRMED === "true",
        identityMatchConfirmed: env.INTERSWITCH_CREDIT_HISTORY_IDENTITY_MATCH_CONFIRMED === "true",
        inquiryEffectsConfirmed: env.INTERSWITCH_CREDIT_HISTORY_INQUIRY_EFFECTS_CONFIRMED === "true",
      };
    },

    async lookup(bvn: string): Promise<NormalizedCreditHistory> {
      const config = getConfig();
      if (!config) throw new InterswitchCreditHistoryError("Interswitch credit-history lookup is not configured.");
      const token = await requestToken(config);
      let response: Response;
      try {
        response = await fetchImpl(config.historyUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ bvn }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new InterswitchCreditHistoryError("Could not connect to the Interswitch credit-history service.");
      }
      if (!response.ok) {
        throw new InterswitchCreditHistoryError("Interswitch credit-history lookup failed.", response.status);
      }
      return normalizeInterswitchCreditHistory(await readJson(response));
    },
  };
}

export const interswitchCreditHistoryClient = createInterswitchCreditHistoryClient();
