import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  insert: vi.fn(),
  insertUserValues: vi.fn(),
  insertConsentValues: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("../server/db", () => ({
  db: { transaction: mocks.transaction },
}));

import { userConsentRecords, users, type User } from "../shared/schema";
import { CURRENT_CONSENT_POLICY_VERSIONS } from "../server/consent-policy";
import { storage } from "../server/storage";

describe("account consent records", () => {
  const createdUser = { id: 71 } as User;
  const tx = { insert: mocks.insert };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((run: (tx: typeof tx) => unknown) => run(tx));
    mocks.insert.mockImplementation((table: unknown) => {
      if (table === users) {
        return {
          values: mocks.insertUserValues,
        };
      }
      if (table === userConsentRecords) {
        return {
          values: mocks.insertConsentValues,
        };
      }
      throw new Error("Unexpected table insert");
    });
    mocks.insertUserValues.mockReturnValue({ returning: mocks.returning });
    mocks.returning.mockResolvedValue([createdUser]);
    mocks.insertConsentValues.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores both current policy versions and timestamps in the account transaction", async () => {
    const acceptedAt = new Date("2026-10-23T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(acceptedAt);

    const result = await storage.createUser({
      email: "new@example.com",
      username: "new@example.com",
      passwordHash: "hashed",
      firstName: "New",
      lastName: "Account",
      acceptTerms: true,
      acceptPrivacy: true,
    });

    expect(result).toBe(createdUser);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.insert).toHaveBeenNthCalledWith(1, users);
    expect(mocks.insert).toHaveBeenNthCalledWith(2, userConsentRecords);
    expect(mocks.insertConsentValues).toHaveBeenCalledWith([
      {
        userId: createdUser.id,
        policyType: "terms",
        policyVersion: CURRENT_CONSENT_POLICY_VERSIONS.terms,
        acceptedAt,
      },
      {
        userId: createdUser.id,
        policyType: "privacy",
        policyVersion: CURRENT_CONSENT_POLICY_VERSIONS.privacy,
        acceptedAt,
      },
    ]);
  });

  it("does not invent acceptance records for policies that were not accepted", async () => {
    await storage.createUser({
      email: "partial@example.com",
      username: "partial@example.com",
      passwordHash: "hashed",
      firstName: "Partial",
      lastName: "Account",
      acceptTerms: true,
      acceptPrivacy: false,
    });

    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(mocks.insertConsentValues).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: createdUser.id,
        policyType: "terms",
        policyVersion: CURRENT_CONSENT_POLICY_VERSIONS.terms,
      }),
    ]);
  });

  it("keeps the consent migration private and does not backfill old accounts", async () => {
    const migration = await readFile(
      join(process.cwd(), "migrations/manual/create-user-consent-records.sql"),
      "utf8",
    );

    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS "public"\."user_consent_records"/);
    expect(migration).toMatch(/"accepted_at" timestamptz NOT NULL DEFAULT now\(\)/);
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/REVOKE ALL ON TABLE .* FROM anon, authenticated/);
    expect(migration).toMatch(/REVOKE ALL ON SEQUENCE .* FROM anon, authenticated/);
    expect(migration).not.toMatch(/^\s*(INSERT\s+INTO|UPDATE\s+\S+|DELETE\s+FROM)\b/im);
  });
});
