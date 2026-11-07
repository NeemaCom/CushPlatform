import { describe, expect, it } from "vitest";
import { adminUserDirectoryQuerySchema, userDirectorySearchPattern } from "./admin-user-directory";

describe("admin user directory query", () => {
  it("applies safe defaults and trims searches", () => {
    expect(adminUserDirectoryQuerySchema.parse({ q: "  Ada  " })).toEqual({
      q: "Ada",
      limit: 25,
      offset: 0,
    });
  });

  it("rejects unbounded pages and overly long searches", () => {
    expect(adminUserDirectoryQuerySchema.safeParse({ limit: 1000 }).success).toBe(false);
    expect(adminUserDirectoryQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
    expect(adminUserDirectoryQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });

  it("escapes LIKE wildcard characters in a search term", () => {
    expect(userDirectorySearchPattern("a%_\\b")).toBe("%a\\%\\_\\\\b%");
  });
});
