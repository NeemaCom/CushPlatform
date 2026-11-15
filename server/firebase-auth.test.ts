import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ensureFirebaseConfigured,
  FirebaseAuthError,
  sendFirebaseVerificationEmail,
} from "./firebase-auth";

describe("Firebase verification email delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses the configured API key for the selected Passport Firebase project", async () => {
    vi.stubEnv("FIREBASE_API_KEY", "staging-api-key");
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetcher);

    await sendFirebaseVerificationEmail("firebase-id-token");

    expect(fetcher.mock.calls[0]?.[0]).toContain("?key=staging-api-key");
  });

  it("requires matching server and browser Firebase projects for staging", () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "passport-staging");
    vi.stubEnv("FIREBASE_API_KEY", "staging-api-key");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "another-project");

    expect(() => ensureFirebaseConfigured()).toThrow(
      "VITE_FIREBASE_PROJECT_ID must match FIREBASE_PROJECT_ID",
    );
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
