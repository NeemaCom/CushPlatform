import { describe, expect, it } from "vitest";
import {
  buildCushVerifyUrl,
  CUSH_VERIFY_HOST,
  isCushVerifyHost,
  isCushVerifyPath,
} from "./cush-verify-domain";

describe("Cush Verify domain routing", () => {
  it("recognizes only the dedicated host, without case sensitivity", () => {
    expect(CUSH_VERIFY_HOST).toBe("verify.we-cush.com");
    expect(isCushVerifyHost("verify.we-cush.com")).toBe(true);
    expect(isCushVerifyHost("VERIFY.WE-CUSH.COM")).toBe(true);
    expect(isCushVerifyHost("app.we-cush.com")).toBe(false);
  });

  it("identifies Verify routes without matching similarly named paths", () => {
    expect(isCushVerifyPath("/verify")).toBe(true);
    expect(isCushVerifyPath("/verify/pricing")).toBe(true);
    expect(isCushVerifyPath("/verify/login?next=workspace")).toBe(true);
    expect(isCushVerifyPath("/verification")).toBe(false);
    expect(isCushVerifyPath("/pricing")).toBe(false);
  });

  it("moves legacy Verify links to the dedicated host and preserves query and hash", () => {
    expect(buildCushVerifyUrl("/verify/register", "?token=invite", "#form"))
      .toBe("https://verify.we-cush.com/verify/register?token=invite#form");
  });
});
