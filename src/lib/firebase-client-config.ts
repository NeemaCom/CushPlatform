export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

export type FirebaseClientConfigOverrides = Partial<FirebaseClientConfig>;

const requiredFields = ["apiKey", "authDomain", "projectId", "appId"] as const;

export function resolveFirebaseClientConfig(
  productionConfig: FirebaseClientConfig,
  overrides: FirebaseClientConfigOverrides,
): FirebaseClientConfig {
  const values = Object.fromEntries(
    requiredFields.map((field) => [field, overrides[field]?.trim() || ""]),
  ) as Record<(typeof requiredFields)[number], string>;
  const configuredCount = requiredFields.filter((field) => values[field]).length;

  if (configuredCount === 0) return productionConfig;

  if (configuredCount !== requiredFields.length) {
    throw new Error(
      "Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID together.",
    );
  }

  return {
    apiKey: values.apiKey,
    authDomain: values.authDomain,
    projectId: values.projectId,
    appId: values.appId,
    ...(overrides.storageBucket?.trim()
      ? { storageBucket: overrides.storageBucket.trim() }
      : {}),
    ...(overrides.messagingSenderId?.trim()
      ? { messagingSenderId: overrides.messagingSenderId.trim() }
      : {}),
  };
}
