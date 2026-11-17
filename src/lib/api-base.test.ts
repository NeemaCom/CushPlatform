import { describe, expect, it } from "vitest";
import { getApiBaseUrl } from "./api-base";

describe("API base URL", () => {
  it("uses same-origin requests for the Cush Verify domain", () => {
    expect(getApiBaseUrl("verify.we-cush.com", "https://cushplatform.onrender.com")).toBe("");
    expect(getApiBaseUrl("VERIFY.WE-CUSH.COM", "https://cushplatform.onrender.com")).toBe("");
  });

  it("keeps the configured API origin on other hosts", () => {
    expect(getApiBaseUrl("app.we-cush.com", "https://cushplatform.onrender.com/"))
      .toBe("https://cushplatform.onrender.com");
  });

  it("keeps the configured API origin when no browser hostname exists", () => {
    expect(getApiBaseUrl(undefined, "https://cushplatform.onrender.com"))
      .toBe("https://cushplatform.onrender.com");
  });
});
