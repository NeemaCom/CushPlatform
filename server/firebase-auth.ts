import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function ensureFirebaseConfigured(): void {
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) {
    throw new Error("FIREBASE_PROJECT_ID is required for Firebase ID token verification");
  }
}

export async function verifyFirebaseIdentity(idToken: string) {
  ensureFirebaseConfigured();
  const app = getApps().find((item) => item.name === "passport-auth") ??
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID }, "passport-auth");
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