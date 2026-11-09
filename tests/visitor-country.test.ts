import { describe, expect, it } from "vitest";
import {
  extractVisitorCountryCode,
  normalizeVisitorIpAddress,
} from "../server/visitor-country";

describe("privacy-safe visitor country helpers", () => {
  it("normalizes IPv4-mapped addresses and leaves IPv6 intact", () => {
    expect(normalizeVisitorIpAddress("  ::ffff:41.203.65.1  ")).toBe("41.203.65.1");
    expect(normalizeVisitorIpAddress("2001:4860:4860::8888")).toBe("2001:4860:4860::8888");
    expect(normalizeVisitorIpAddress(undefined)).toBeNull();
    expect(normalizeVisitorIpAddress("  ")).toBeNull();
  });

  it("returns only a normalized two-letter country code", () => {
    expect(extractVisitorCountryCode({ country: { iso_code: "ng" } })).toBe("NG");
    expect(extractVisitorCountryCode({ country_code: "gb" })).toBe("GB");
    expect(extractVisitorCountryCode({ country_code: "unknown" })).toBeNull();
    expect(extractVisitorCountryCode({ country_code: 44 })).toBeNull();
    expect(extractVisitorCountryCode(null)).toBeNull();
  });
});
