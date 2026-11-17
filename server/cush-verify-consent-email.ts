export type CushVerifyConsentEmailResult =
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

export async function sendCushVerifyConsentRequestEmail(
  input: {
    email: string;
    institutionName: string;
    consentUrl: string;
    requestId: string;
  },
  options: {
    apiKey?: string;
    from?: string;
    fetcher?: typeof fetch;
  } = {},
): Promise<CushVerifyConsentEmailResult> {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { status: "not_configured" };

  const institutionName = input.institutionName.trim();
  const text = [
    `A Cush Verify report request is ready for your review from ${institutionName}.`,
    "",
    "Sign in to Cush Passport to review the purpose and requested categories. Nothing is shared unless you explicitly approve it.",
    input.consentUrl,
    "",
    "If you do not have a Cush Passport account, you can create one using the invited email address and return to this link after verifying it.",
    "If you were not expecting this request, you can ignore it.",
  ].join("\n");
  const html = `
    <div style="margin:0;background:#f3f7fc;padding:32px 16px;font-family:Arial,sans-serif;color:#14213a">
      <div style="max-width:560px;margin:0 auto;border:1px solid #d8e3f1;border-radius:18px;background:#ffffff;overflow:hidden">
        <div style="padding:28px 32px;background:#0c1830;color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#b8cff5">Cush Verify</p>
          <h1 style="margin:0;font-size:24px;line-height:1.3">Review a report request</h1>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7"><strong>${escapeHtml(institutionName)}</strong> has requested your permission to access a Cush Passport report.</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#526174">Review the stated purpose, requested categories, and access period before deciding. Nothing is shared unless you approve it.</p>
          <a href="${escapeHtml(input.consentUrl)}" style="display:inline-block;border-radius:10px;background:#3475e7;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Review request</a>
          <p style="margin:20px 0 0;font-size:12px;color:#64748b">Request reference: ${escapeHtml(input.requestId)}</p>
          <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#64748b">If you do not have a Cush Passport account, create one with this email address, verify it, and then open this link again. If you were not expecting this request, ignore this email.</p>
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
        "Idempotency-Key": `cush-verify-consent-request-${input.requestId}`,
        "User-Agent": "CushPlatform/1.0",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        reply_to: "support@we-cush.com",
        subject: `A Cush Verify request from ${institutionName} needs your review`,
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
