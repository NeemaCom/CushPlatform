export type CushVerifyWebhookFailureEmailResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed" };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function workspaceUrl() {
  const configuredOrigin = process.env.CUSH_VERIFY_APP_URL?.trim()
    || process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim()
    || "https://verify.we-cush.com";
  try {
    const url = new URL("/verify/workspace", configuredOrigin);
    if (url.protocol === "https:" || url.hostname === "localhost") return url.toString();
  } catch {
    // Use the stable public Verify origin if configuration is malformed.
  }
  return "https://verify.we-cush.com/verify/workspace";
}

export async function sendCushVerifyWebhookFailureEmail(
  input: {
    notificationId: number;
    email: string;
    contactName: string;
    institutionName: string;
    destinationName: string;
    eventType: string;
    lastErrorCode: string | null;
    attemptCount: number;
  },
  options: {
    apiKey?: string;
    from?: string;
    fetcher?: typeof fetch;
  } = {},
): Promise<CushVerifyWebhookFailureEmailResult> {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { status: "not_configured" };

  const contactName = input.contactName.trim() || "there";
  const institutionName = input.institutionName.trim();
  const destinationName = input.destinationName.trim();
  const link = workspaceUrl();
  const errorCode = input.lastErrorCode ?? "delivery_failed";
  const subjectDestinationName = destinationName.replace(/[\r\n\x00-\x1f\x7f]+/g, " ").trim() || "webhook";
  const text = [
    `Hello ${contactName},`,
    "",
    `A Cush Verify webhook delivery for ${destinationName} has failed after ${input.attemptCount} attempts.`,
    `Event: ${input.eventType}`,
    `Last outcome: ${errorCode}`,
    "",
    "Open API & Integrations in your institutional workspace to review delivery history and update the destination.",
    link,
    "",
    "This notification does not include report or financial information.",
  ].join("\n");
  const html = `
    <div style="margin:0;background:#f3f7fc;padding:32px 16px;font-family:Arial,sans-serif;color:#14213a">
      <div style="max-width:560px;margin:0 auto;border:1px solid #d8e3f1;border-radius:18px;background:#ffffff;overflow:hidden">
        <div style="padding:28px 32px;background:#0c1830;color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#b8cff5">Cush Verify</p>
          <h1 style="margin:0;font-size:24px;line-height:1.3">Webhook delivery needs attention</h1>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7">Hello ${escapeHtml(contactName)},</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.7">A webhook delivery for <strong>${escapeHtml(destinationName)}</strong> at <strong>${escapeHtml(institutionName)}</strong> has failed after ${input.attemptCount} attempts.</p>
          <dl style="margin:0 0 20px;border:1px solid #d8e3f1;border-radius:12px;padding:14px">
            <dt style="font-size:11px;color:#64748b">Event</dt><dd style="margin:2px 0 10px;font-size:13px">${escapeHtml(input.eventType)}</dd>
            <dt style="font-size:11px;color:#64748b">Last outcome</dt><dd style="margin:2px 0 0;font-size:13px">${escapeHtml(errorCode)}</dd>
          </dl>
          <a href="${escapeHtml(link)}" style="display:inline-block;border-radius:10px;background:#3475e7;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Review API &amp; Integrations</a>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#64748b">This email contains no report or financial information.</p>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await (options.fetcher ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `cush-verify-webhook-failure-${input.notificationId}`,
        "User-Agent": "CushPlatform/1.0",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        reply_to: "support@we-cush.com",
        subject: `Cush Verify webhook delivery failed for ${subjectDestinationName}`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? { status: "sent" } : { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}
