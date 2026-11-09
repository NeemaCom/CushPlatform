import { describe, expect, it } from "vitest";
import { getAllowedFrontendOrigins } from "./origin-policy";

describe("frontend origin policy", () => {
  it("allows the canonical production app origin for API and admin requests", () => {
    const allowedOrigins = getAllowedFrontendOrigins("production", "");

    expect(allowedOrigins.has("https://app.we-cush.com")).toBe(true);
    expect(allowedOrigins.has("http://localhost:5000")).toBe(false);
  });

  it("keeps configured origins exact and supports comma-separated deployments", () => {
    const allowedOrigins = getAllowedFrontendOrigins(
      "production",
      "https://preview.we-cush.com, https://staging.we-cush.com",
    );

    expect(allowedOrigins.has("https://preview.we-cush.com")).toBe(true);
    expect(allowedOrigins.has("https://staging.we-cush.com")).toBe(true);
    expect(allowedOrigins.has("https://app.we-cush.com/")).toBe(false);
    expect(allowedOrigins.has("*")).toBe(false);
  });

  it("adds localhost origins only outside production", () => {
    expect(getAllowedFrontendOrigins("development", "").has("http://localhost:5000")).toBe(true);
    expect(getAllowedFrontendOrigins("production", "").has("http://localhost:5000")).toBe(false);
  });
});
