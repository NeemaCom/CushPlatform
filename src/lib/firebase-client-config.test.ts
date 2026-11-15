import { describe, expect, it } from "vitest";
import {
  resolveFirebaseClientConfig,
  type FirebaseClientConfig,
} from "./firebase-client-config";

const productionConfig: FirebaseClientConfig = {
  apiKey: "production-api-key",
  authDomain: "auth.production.example",
  projectId: "passport-production",
  appId: "production-app-id",
  storageBucket: "passport-production.appspot.com",
  messagingSenderId: "production-sender",
};

describe("resolveFirebaseClientConfig", () => {
  it("keeps production settings when no overrides are supplied", () => {
    expect(resolveFirebaseClientConfig(productionConfig, {})).toBe(productionConfig);
  });

  it("uses the complete staging auth config without mixing production project fields", () => {
    expect(resolveFirebaseClientConfig(productionConfig, {
      apiKey: "staging-api-key",
      authDomain: "passport-staging.firebaseapp.com",
      projectId: "passport-staging",
      appId: "staging-app-id",
    })).toEqual({
      apiKey: "staging-api-key",
      authDomain: "passport-staging.firebaseapp.com",
      projectId: "passport-staging",
      appId: "staging-app-id",
    });
  });

  it("rejects partial overrides instead of mixing Firebase projects", () => {
    expect(() => resolveFirebaseClientConfig(productionConfig, {
      projectId: "passport-staging",
    })).toThrow("Set VITE_FIREBASE_API_KEY");
  });
});
