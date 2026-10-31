const MONO_API_ROOT = "https://api.withmono.com";

export class MonoNotConfiguredError extends Error {
  constructor() {
    super("Mono is not configured on the server.");
    this.name = "MonoNotConfiguredError";
  }
}

export class MonoRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("Mono could not complete the request.");
    this.name = "MonoRequestError";
    this.status = status;
  }
}

export class MonoClient {
  constructor(
    private readonly secretKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!secretKey.trim()) throw new MonoNotConfiguredError();
  }

  async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
      sessionId?: string;
      query?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const url = new URL(`${MONO_API_ROOT}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "mono-sec-key": this.secretKey,
          ...(options.sessionId ? { "x-session-id": options.sessionId } : {}),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new MonoRequestError(503);
    }

    if (!response.ok) {
      // Deliberately discard Mono's response body: it can contain identity or
      // financial details and must not reach application logs or clients.
      throw new MonoRequestError(response.status);
    }

    try {
      return await response.json() as T;
    } catch {
      throw new MonoRequestError(502);
    }
  }
}

export function getMonoClient(): MonoClient {
  const secretKey = process.env.MONO_SECRET_KEY;
  if (!secretKey) throw new MonoNotConfiguredError();
  return new MonoClient(secretKey);
}

export interface SafeBvnAccount {
  accountName: string | null;
  accountType: string | null;
  institutionName: string | null;
  bankCode: string | null;
  accountLast4: string | null;
}

export function normalizeBvnAccounts(value: unknown): SafeBvnAccount[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => {
    const accountNumber = typeof item?.account_number === "string" ? item.account_number : "";
    const institution = item?.institution;
    return {
      accountName: typeof item?.account_name === "string" ? item.account_name : null,
      accountType: typeof item?.account_type === "string" ? item.account_type : null,
      institutionName: typeof institution?.name === "string" ? institution.name : null,
      bankCode: typeof institution?.bank_code === "string" ? institution.bank_code : null,
      accountLast4: accountNumber.length >= 4 ? accountNumber.slice(-4) : null,
    };
  });
}

export function getMonoCallbackUrl(): string | null {
  const configuredUrl = process.env.MONO_REDIRECT_URL;
  if (!configuredUrl) return null;
  try {
    const url = new URL(configuredUrl);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    if (url.username || url.password || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}
