import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const appName = "cush-verify-institutional";

const config = {
  apiKey: import.meta.env.VITE_CUSH_VERIFY_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_CUSH_VERIFY_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_CUSH_VERIFY_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_CUSH_VERIFY_FIREBASE_APP_ID as string | undefined,
};

export function isCushVerifyFirebaseConfigured(): boolean {
  return Object.values(config).every((value) => typeof value === "string" && value.trim().length > 0);
}

export function getCushVerifyAuth(): Auth {
  if (!isCushVerifyFirebaseConfigured()) {
    throw new Error("Cush Verify institutional sign-in has not been configured yet.");
  }
  const app = getApps().find((candidate) => candidate.name === appName) ??
    initializeApp(config, appName);
  return getAuth(app);
}
