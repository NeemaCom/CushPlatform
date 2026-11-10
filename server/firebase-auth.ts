import { cert, initializeApp, getApps, type AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { firebaseConfig } from "@shared/firebase-config";

export class FirebaseAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FirebaseAuthError";
  }
}

export async function signInWithFirebasePassword(email: string, password: string): Promise<string> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerCode = body?.error?.message;
    if (["INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD"].includes(providerCode)) {
      throw new FirebaseAuthError("INVALID_CREDENTIALS", "Invalid email or password.");
    }
    if (providerCode === "TOO_MANY_ATTEMPTS_TRY_LATER") {
      throw new FirebaseAuthError("PROVIDER_RATE_LIMIT", "Firebase temporarily limited sign-in attempts.");
    }
    if (providerCode === "USER_DISABLED") {
      throw new FirebaseAuthError("USER_DISABLED", "This account is disabled.");
    }
    throw new FirebaseAuthError("PROVIDER_ERROR", "Firebase sign-in could not be completed.");
  }
  if (typeof body?.idToken !== "string" || !body.idToken) {
    throw new FirebaseAuthError("PROVIDER_ERROR", "Firebase sign-in response did not contain an ID token.");
  }
  return body.idToken;
}

export async function sendFirebaseVerificationEmail(
  idToken: string,
  continueUrl?: string,
): Promise<void> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "VERIFY_EMAIL",
        idToken,
        ...(continueUrl ? { continueUrl } : {}),
      }),
    },
  );
  if (!response.ok) {
    throw new FirebaseAuthError("VERIFICATION_EMAIL_FAILED", "Firebase could not send a verification email.");
  }
}

export function ensureFirebaseConfigured(): void {
  if (!configuredProjectId()) {
    throw new Error("FIREBASE_PROJECT_ID is required for Firebase ID token verification");
  }
}

function configuredProjectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID?.trim() ||
    (process.env.NODE_ENV === "production" ? undefined : "cushportal");
}

function firebaseAppOptions(): AppOptions {
  const projectId = configuredProjectId();
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required for Firebase ID token verification");
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (Boolean(clientEmail) !== Boolean(privateKey)) {
    throw new Error("FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must both be set");
  }

  return {
    projectId,
    ...(clientEmail && privateKey
      ? { credential: cert({ projectId, clientEmail, privateKey }) }
      : {}),
  };
}

export async function verifyFirebaseIdentity(idToken: string) {
  ensureFirebaseConfigured();
  const app = getApps().find((item) => item.name === "passport-auth") ??
    initializeApp(firebaseAppOptions(), "passport-auth");
  const claims = await getAuth(app).verifyIdToken(idToken);
  if (!claims.uid || !claims.email) {
    throw new Error("Firebase token is missing an identity");
  }
  return {
    uid: claims.uid,
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true,
    displayName: typeof claims.name === "string" ? claims.name : null,
    photoURL: typeof claims.picture === "string" ? claims.picture : null,
  };
}

export interface CushVerifyFirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  signInProvider: string;
}

function getCushVerifyFirebaseApp() {
  const projectId = process.env.CUSH_VERIFY_FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.CUSH_VERIFY_FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.CUSH_VERIFY_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new FirebaseAuthError(
      "CUSH_VERIFY_AUTH_NOT_CONFIGURED",
      "Cush Verify institutional authentication is not configured.",
    );
  }

  const appName = "cush-verify-institutional-auth";
  const existingApp = getApps().find((app) => app.name === appName);
  if (existingApp) {
    if (existingApp.options.projectId !== projectId) {
      throw new FirebaseAuthError(
        "CUSH_VERIFY_AUTH_CONFIGURATION_MISMATCH",
        "Cush Verify institutional Firebase project configuration changed after startup.",
      );
    }
    return existingApp;
  }

  return initializeApp({
    projectId,
    credential: cert({ projectId, clientEmail, privateKey }),
  }, appName);
}

export async function verifyCushVerifyFirebaseIdentity(
  idToken: string,
): Promise<CushVerifyFirebaseIdentity> {
  if (!idToken || idToken.length > 12_000) {
    throw new FirebaseAuthError("INVALID_ID_TOKEN", "A valid institutional sign-in token is required.");
  }
  const decoded = await getAuth(getCushVerifyFirebaseApp()).verifyIdToken(idToken);
  const firebaseClaims = decoded.firebase as { sign_in_provider?: unknown } | undefined;
  if (
    typeof decoded.uid !== "string" ||
    typeof decoded.email !== "string" ||
    firebaseClaims?.sign_in_provider !== "password"
  ) {
    throw new FirebaseAuthError(
      "CUSH_VERIFY_EMAIL_SIGN_IN_ONLY",
      "Cush Verify accepts institutional email and password sign-in only.",
    );
  }

  return {
    uid: decoded.uid,
    email: decoded.email.toLowerCase(),
    emailVerified: decoded.email_verified === true,
    signInProvider: "password",
  };
}