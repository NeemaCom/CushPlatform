export type CushVerifyApiAccessEmailResult =
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
    // Use the stable production URL if a deployment URL is malformed.
  }
  return "https://verify.we-cush.com/verify/workspace";
}

export async function sendCushVerifyApiAccessApprovedEmail(
  input: {
    email: string;
    contactName: string;
    institutionName: string;
    requestId: number;
    workspaceUrl?: string;
  },
  options: {
    apiKey?: string;
    from?: string;
    fetcher?: typeof fetch;
  } = {},
): Promise<CushVerifyApiAccessEmailResult> {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { status: "not_configured" };

  const contactName = input.contactName.trim() || "there";
  const institutionName = input.institutionName.trim();
  const destination = input.workspaceUrl ?? workspaceUrl();
  const text = [
    `Hello ${contactName},`,
    "",
    `Cush has approved ${institutionName}'s request for production API access.`,
    "This approval is separate from subscription entitlement. Production keys are available only while the institution has an active subscription that includes API access.",
    "Sign in to Cush Verify and open API & Integrations to check access and manage keys:",
    destination,
    "",
    "If you were not expecting this message, contact support@we-cush.com.",
  ].join("\n");
  const html = `
    <div style="margin:0;background:#f3f7fc;padding:32px 16px;font-family:Arial,sans-serif;color:#14213a">
      <div style="max-width:560px;margin:0 auto;border:1px solid #d8e3f1;border-radius:18px;background:#ffffff;overflow:hidden">
        <div style="padding:28px 32px;background:#0c1830;color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#b8cff5">Cush Verify</p>
          <h1 style="margin:0;font-size:24px;line-height:1.3">Production API request approved</h1>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6">Hello ${escapeHtml(contactName)},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7">Cush has approved <strong>${escapeHtml(institutionName)}</strong>'s request for production API access.</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#526174">Approval is separate from subscription entitlement. Production keys are available only while your institution has an active subscription that includes API access.</p>
          <a href="${escapeHtml(destination)}" style="display:inline-block;border-radius:10px;background:#3475e7;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Open API &amp; Integrations</a>
          <p style="margin:20px 0 0;font-size:12px;color:#64748b">Request reference: ${input.requestId}</p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b">If you were not expecting this message, contact <a href="mailto:support@we-cush.com" style="color:#275fb7">support@we-cush.com</a>.</p>
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
        "Idempotency-Key": `cush-verify-api-access-approved-${input.requestId}`,
        "User-Agent": "CushPlatform/1.0",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        reply_to: "support@we-cush.com",
        subject: "Your Cush Verify production API access request was approved",
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
