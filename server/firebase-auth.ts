import { cert, initializeApp, getApps, type AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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