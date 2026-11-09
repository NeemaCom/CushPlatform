export type WelcomeEmailResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; reason: "provider_rejected" | "request_failed" };

export interface WelcomeEmailInput {
  userId: number;
  email: string;
  firstName: string;
}

interface WelcomeEmailOptions {
  apiKey?: string;
  from?: string;
  fetcher?: typeof fetch;
}

const SUPPORT_EMAIL = "support@we-cush.com";
const DASHBOARD_URL = "https://app.we-cush.com/dashboard";
const EMAIL_TIMEOUT_MS = 10_000;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendWelcomeEmail(
  input: WelcomeEmailInput,
  options: WelcomeEmailOptions = {},
): Promise<WelcomeEmailResult> {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { status: "not_configured" };

  const fetcher = options.fetcher ?? fetch;
  const firstName = input.firstName.trim() || "there";
  const safeFirstName = escapeHtml(firstName);
  const text = [
    `Hi ${firstName},`,
    "",
    "Welcome to Cush. Your account is ready to get started.",
    "Complete your profile and connect the financial evidence you choose to share.",
    `Open your dashboard: ${DASHBOARD_URL}`,
    "",
    `Need help? Contact ${SUPPORT_EMAIL}.`,
  ].join("\n");
  const html = `
    <div style="margin:0;background:#f5f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#1e293b">
      <div style="max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff;overflow:hidden">
        <div style="padding:28px 32px;background:linear-gradient(120deg,#27258f,#5146d8);color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#d8d7ff">Cush Passport</p>
          <h1 style="margin:0;font-size:26px;line-height:1.25">Welcome to Cush, ${safeFirstName}</h1>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6">Your account is ready. Cush helps you build a portable financial identity using information you choose to share.</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#526174">You can complete your profile and connect relevant financial evidence from your dashboard. If you signed up with email, remember to confirm your address using the separate activation email.</p>
          <a href="${DASHBOARD_URL}" style="display:inline-block;border-radius:10px;background:#3730a3;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Open your Cush dashboard</a>
          <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#64748b">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#3730a3">${SUPPORT_EMAIL}</a></p>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `cush-welcome-${input.userId}`,
        "User-Agent": "CushPlatform/1.0",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        reply_to: SUPPORT_EMAIL,
        subject: "Welcome to Cush",
        text,
        html,
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
