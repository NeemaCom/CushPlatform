import { describe, expect, it } from "vitest";
import {
  canonicalizeVisitorRoute,
  VISITOR_ANALYTICS_POLICY_VERSION,
  VISITOR_ANALYTICS_RETENTION_DAYS,
  VISITOR_ROUTE_ALLOWLIST,
} from "@shared/visitor-analytics-policy";

describe("visitor analytics privacy policy", () => {
  it("uses a versioned opt-in policy and bounded event retention", () => {
    expect(VISITOR_ANALYTICS_POLICY_VERSION).toBe("visitor-analytics-v2");
    expect(VISITOR_ANALYTICS_RETENTION_DAYS).toBe(90);
  });

  it("removes query strings and share tokens from tracked routes", () => {
    expect(canonicalizeVisitorRoute("/dashboard?balance=123")).toBe("/dashboard");
    expect(canonicalizeVisitorRoute("/passport/secret-share-token")).toBe("/passport/:share");
  });

  it("rejects unknown routes instead of collecting their path or contents", () => {
    expect(canonicalizeVisitorRoute("/account/private-note")).toBeNull();
    expect(canonicalizeVisitorRoute("/unexpected/secret/path")).toBeNull();
    expect(VISITOR_ROUTE_ALLOWLIST).not.toContain("/passport/:token");
  });
});
