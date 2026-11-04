import { describe, expect, it } from "vitest";
import { isMissingPlaidSchema } from "./plaid-errors";

describe("isMissingPlaidSchema", () => {
  it("recognizes missing-relation errors wrapped by Drizzle", () => {
    const postgresError = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    const drizzleError = Object.assign(new Error("Failed query"), { cause: postgresError });

    expect(isMissingPlaidSchema(drizzleError)).toBe(true);
  });

  it("recognizes missing-column errors through nested causes", () => {
    const postgresError = Object.assign(new Error("column does not exist"), { code: "42703" });
    const driverError = Object.assign(new Error("driver query failed"), { cause: postgresError });
    const drizzleError = Object.assign(new Error("Failed query"), { cause: driverError });

    expect(isMissingPlaidSchema(drizzleError)).toBe(true);
  });

  it("does not classify unrelated database errors as a missing schema", () => {
    const postgresError = Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
    const drizzleError = Object.assign(new Error("Failed query"), { cause: postgresError });

    expect(isMissingPlaidSchema(drizzleError)).toBe(false);
  });
});
