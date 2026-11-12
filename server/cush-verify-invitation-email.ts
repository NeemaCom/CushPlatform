export type CushVerifyInvitationEmailResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; reason: "provider_rejected" | "request_failed" };

interface InvitationEmailOptions {
  apiKey?: string;
  from?: string;
  fetcher?: typeof fetch;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendCushVerifyInvitationEmail(
  input: { email: string; contactName: string; institutionName: string; inviteUrl: string; invitationId: number },
  options: InvitationEmailOptions = {},
): Promise<CushVerifyInvitationEmailResult> {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { status: "not_configured" };

  const safeName = input.contactName.trim() || "there";
  const safeInstitution = input.institutionName.trim();
  const text = [
    `Hello ${safeName},`,
    "",
    `Cush has invited you to create an institutional account for ${safeInstitution}.`,
    "Use the secure invitation link to register with your official email address and verify ownership.",
    input.inviteUrl,
    "",
    "The organisation remains under review. Creating an account does not grant access to the Cush Verify workspace.",
    "If you were not expecting this invitation, contact support@we-cush.com.",
  ].join("\n");
  const html = `
    <div style="margin:0;background:#f3f7fc;padding:32px 16px;font-family:Arial,sans-serif;color:#14213a">
      <div style="max-width:560px;margin:0 auto;border:1px solid #d8e3f1;border-radius:18px;background:#ffffff;overflow:hidden">
        <div style="padding:28px 32px;background:#0c1830;color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#b8cff5">Cush Verify</p>
          <h1 style="margin:0;font-size:24px;line-height:1.3">Institutional account invitation</h1>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6">Hello ${escapeHtml(safeName)},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7">Cush has invited you to create an institutional account for <strong>${escapeHtml(safeInstitution)}</strong>. Register using your official email address.</p>
          <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;border-radius:10px;background:#3475e7;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Accept invitation</a>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#526174">This link expires in 7 days. Your organisation remains under review; creating an account does not grant access to the verification workspace.</p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b">If you were not expecting this invitation, contact <a href="mailto:support@we-cush.com" style="color:#275fb7">support@we-cush.com</a>.</p>
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
        "Idempotency-Key": `cush-verify-invitation-${input.invitationId}`,
        "User-Agent": "CushPlatform/1.0",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        reply_to: "support@we-cush.com",
        subject: `Cush Verify invitation for ${safeInstitution}`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok
      ? { status: "sent" }
      : { status: "failed", reason: "provider_rejected" };
  } catch {
    return { status: "failed", reason: "request_failed" };
  }
}
