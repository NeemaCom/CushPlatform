import { afterEach, describe, expect, it, vi } from "vitest";
import { FirebaseAuthError, sendFirebaseVerificationEmail } from "./firebase-auth";

describe("Firebase verification email delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests a Firebase verification email with the trusted app continuation URL", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetcher);
    const continueUrl = "https://app.we-cush.com/login?emailVerified=1";

    await sendFirebaseVerificationEmail("firebase-id-token", continueUrl);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/identitytoolkit\.googleapis\.com\/v1\/accounts:sendOobCode\?key=/);
    expect(request).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(JSON.parse(String(request.body))).toEqual({
      requestType: "VERIFY_EMAIL",
      idToken: "firebase-id-token",
      continueUrl,
    });
  });

  it("returns a safe error if Firebase rejects the verification email request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    await expect(sendFirebaseVerificationEmail(
      "firebase-id-token",
      "https://app.we-cush.com/login?emailVerified=1",
    )).rejects.toMatchObject({
      code: "VERIFICATION_EMAIL_FAILED",
    } satisfies Partial<FirebaseAuthError>);
  });
});
