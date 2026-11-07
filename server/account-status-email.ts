export type AccountStatus = "active" | "suspended";

export type AccountStatusEmailResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; reason: "provider_rejected" | "request_failed" };

export interface AccountStatusEmailInput {
  userId: number;
  email: string;
  status: AccountStatus;
  changedAt: Date;
}

interface AccountStatusEmailOptions {
  apiKey?: string;
  from?: string;
  fetcher?: typeof fetch;
}

const SUPPORT_EMAIL = "support@we-cush.com";
const LOGIN_URL = "https://app.we-cush.com/login";
const EMAIL_TIMEOUT_MS = 10_000;

function emailContent(status: AccountStatus) {
  if (status === "suspended") {
    return {
      subject: "Important update to your Cush account",
      text: [
        "Your Cush account access has been suspended. You cannot sign in until access is restored.",
        `If you believe this is a mistake or need assistance, contact ${SUPPORT_EMAIL}.`,
        "Your account data has not been deleted.",
      ].join("\n\n"),
      html: `
        <p>Your Cush account access has been suspended. You cannot sign in until access is restored.</p>
        <p>If you believe this is a mistake or need assistance, contact
          <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
        <p>Your account data has not been deleted.</p>
      `,
    };
  }

  return {
    subject: "Your Cush account access has been restored",
    text: [
      "Your Cush account access has been restored. You can sign in again.",
      `Sign in at ${LOGIN_URL}.`,
      `If you did not expect this change, contact ${SUPPORT_EMAIL}.`,
    ].join("\n\n"),
    html: `
      <p>Your Cush account access has been restored. You can sign in again.</p>
      <p><a href="${LOGIN_URL}">Sign in to Cush</a>.</p>
      <p>If you did not expect this change, contact
        <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    `,
  };
}

export async function sendAccountStatusEmail(
  input: AccountStatusEmailInput,
  options: AccountStatusEmailOptions = {},
): Promise<AccountStatusEmailResult> {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { status: "not_configured" };

  const fetcher = options.fetcher ?? fetch;
  const content = emailContent(input.status);
  const idempotencyKey = [
    "cush-account-status",
    input.userId,
    input.status,
    input.changedAt.getTime(),
  ].join("-");

  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        "User-Agent": "CushPlatform/1.0",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        reply_to: SUPPORT_EMAIL,
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    });

    return response.ok
      ? { status: "sent" }
      : { status: "failed", reason: "provider_rejected" };
  } catch {
    return { status: "failed", reason: "request_failed" };
  }
}
