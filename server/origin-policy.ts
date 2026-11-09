const PRODUCTION_FRONTEND_ORIGINS = ["https://app.we-cush.com"];
const DEVELOPMENT_FRONTEND_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
];

export function getAllowedFrontendOrigins(
  nodeEnvironment = process.env.NODE_ENV,
  configuredOrigins = process.env.FRONTEND_ORIGIN || "",
): Set<string> {
  return new Set([
    ...PRODUCTION_FRONTEND_ORIGINS,
    ...(nodeEnvironment === "production" ? [] : DEVELOPMENT_FRONTEND_ORIGINS),
    ...configuredOrigins.split(",").map((origin) => origin.trim()).filter(Boolean),
  ]);
}
