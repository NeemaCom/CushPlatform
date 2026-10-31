const TOKEN_PATH = "/passport/oauth/token";
const CREDIT_REPORT_PATH = "/lending-service/api/v1/credit-report";
const MAX_PROVIDER_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

interface InterSwitchEnvironment {
  [key: string]: string | undefined;
  INTERSWITCH_CLIENT_ID?: string;
  INTERSWITCH_SECRET_KEY?: string;
  INTERSWITCH_CLIENT_CODE?: string;
  INTERSWITCH_OAUTH_TOKEN_URL?: string;
  INTERSWITCH_CREDIT_REPORT_URL?: string;
  INTERSWITCH_CREDIT_REPORT_LIVE_ENABLED?: string;
}

interface InterSwitchCreditConfig {
  clientId: string;
  secretKey: string;
  clientCode: string;
  tokenUrl: URL;
  reportUrl: URL;
}

export class InterswitchCreditProviderError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "InterswitchCreditProviderError";
  }
}

function validateProviderUrl(raw: string | undefined, expectedPath: string): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const isInterswitchHost =
      url.hostname === "interswitchng.com" || url.hostname.endsWith(".interswitchng.com");
    if (
      url.protocol !== "https:" ||
      !isInterswitchHost ||
      url.pathname !== expectedPath ||
      (url.port !== "" && url.port !== "443") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function readConfig(env: InterSwitchEnvironment): InterSwitchCreditConfig | null {
  const clientId = env.INTERSWITCH_CLIENT_ID?.trim();
  const secretKey = env.INTERSWITCH_SECRET_KEY?.trim();
  const clientCode = env.INTERSWITCH_CLIENT_CODE?.trim();
  const tokenUrl = validateProviderUrl(env.INTERSWITCH_OAUTH_TOKEN_URL, TOKEN_PATH);
  const reportUrl = validateProviderUrl(env.INTERSWITCH_CREDIT_REPORT_URL, CREDIT_REPORT_PATH);
  if (!clientId || !secretKey || !clientCode || !tokenUrl || !reportUrl) return null;
  const sandboxReport = reportUrl.hostname === "sandbox.interswitchng.com";
  const sandboxToken = tokenUrl.hostname === "passport-sandbox.interswitchng.com";
  if (sandboxReport !== sandboxToken) return null;
  if (!sandboxReport && env.INTERSWITCH_CREDIT_REPORT_LIVE_ENABLED !== "true") return null;
  return { clientId, secretKey, clientCode, tokenUrl, reportUrl };
}

export function normalizeVerifiedNigerianPhone(phoneNumber: string): string | null {
  const digits = phoneNumber.replace(/\D/g, "");
  let normalized: string;
  if (/^234\d{10}$/.test(digits)) {
    normalized = digits;
  } else if (/^0\d{10}$/.test(digits)) {
    normalized = `234${digits.slice(1)}`;
  } else if (/^\d{10}$/.test(digits)) {
    normalized = `234${digits}`;
  } else {
    return null;
  }
  return normalized;
}

export function maskPhoneNumber(phoneNumber: string): string {
  return `••••••${phoneNumber.slice(-4)}`;
}

export function createInterswitchCreditReportClient(options: {
  getEnvironment?: () => InterSwitchEnvironment;
  fetchImpl?: typeof fetch;
} = {}) {
  const getEnvironment = options.getEnvironment ?? (() => process.env);
  const fetchImpl = options.fetchImpl ?? fetch;
  let cachedToken: string | null = null;
  let cachedTokenExpiresAt = 0;
  let tokenRequest: Promise<string> | null = null;

  function getConfig(): InterSwitchCreditConfig | null {
    return readConfig(getEnvironment());
  }

  async function readJsonResponse(response: Response): Promise<unknown> {
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_PROVIDER_RESPONSE_BYTES) {
      throw new InterswitchCreditProviderError("Provider response exceeded the allowed size.", response.status);
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_PROVIDER_RESPONSE_BYTES) {
      throw new InterswitchCreditProviderError("Provider response exceeded the allowed size.", response.status);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new InterswitchCreditProviderError("Provider returned an unreadable response.", response.status);
    }
  }

  async function requestAccessToken(config: InterSwitchCreditConfig): Promise<string> {
    const now = Date.now();
    if (cachedToken && cachedTokenExpiresAt > now + 30_000) return cachedToken;
    if (tokenRequest) return tokenRequest;

    tokenRequest = (async () => {
      const tokenUrl = new URL(config.tokenUrl);
      tokenUrl.searchParams.set("grant_type", "client_credentials");
      let response: Response;
      try {
        response = await fetchImpl(tokenUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.secretKey}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: "grant_type=client_credentials",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new InterswitchCreditProviderError("Could not connect to Interswitch authentication.");
      }
      if (!response.ok) {
        throw new InterswitchCreditProviderError("Interswitch authentication failed.", response.status);
      }

      const body = await readJsonResponse(response);
      if (!body || typeof body !== "object") {
        throw new InterswitchCreditProviderError("Interswitch returned an invalid access token.");
      }
      const token = (body as { access_token?: unknown }).access_token;
      const expiresIn = Number((body as { expires_in?: unknown }).expires_in);
      if (typeof token !== "string" || token.length === 0 || !Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new InterswitchCreditProviderError("Interswitch returned an invalid access token.");
      }
      cachedToken = token;
      cachedTokenExpiresAt = Date.now() + expiresIn * 1000;
      return token;
    })();

    try {
      return await tokenRequest;
    } finally {
      tokenRequest = null;
    }
  }

  return {
    isConfigured(): boolean {
      return getConfig() !== null;
    },

    async lookup(phoneNo: string): Promise<unknown> {
      const config = getConfig();
      if (!config) throw new InterswitchCreditProviderError("Interswitch credit lookup is not configured.");
      const token = await requestAccessToken(config);
      let response: Response;
      try {
        response = await fetchImpl(config.reportUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ phoneNo, clientCode: config.clientCode }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new InterswitchCreditProviderError("Could not connect to the Interswitch credit-report service.");
      }
      if (!response.ok) {
        throw new InterswitchCreditProviderError("Interswitch credit-report lookup failed.", response.status);
      }
      const report = await readJsonResponse(response);
      if (report === null) {
        throw new InterswitchCreditProviderError("Interswitch returned an invalid credit report.");
      }
      return report;
    },
  };
}

export const interswitchCreditReportClient = createInterswitchCreditReportClient();
