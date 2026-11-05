import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../server/db", () => ({ pgPool: { query: mocks.query } }));

import {
  getFailedLoginResponse,
  getLoginAttemptState,
  getLockoutResponse,
  normalizeLoginEmail,
  recordFailedLogin,
  revokeUserSessions,
} from "../server/login-attempts";

describe("progressive password lockout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes email identifiers", () => {
    expect(normalizeLoginEmail("  Person@Example.COM ")).toBe("person@example.com");
  });

  it("warns with two remaining attempts after the first failure", () => {
    const response = getFailedLoginResponse({
      failedAttempts: 1,
      lockedUntil: null,
      permanentlyLocked: false,
    });

    expect(response).toMatchObject({
      status: 401,
      body: {
        code: "INVALID_CREDENTIALS",
        attemptsRemaining: 2,
        message: expect.stringContaining("2 more attempts"),
      },
    });
  });

  it("warns with one remaining attempt after the second failure", () => {
    const response = getFailedLoginResponse({
      failedAttempts: 2,
      lockedUntil: null,
      permanentlyLocked: false,
    });

    expect(response).toMatchObject({
      status: 401,
      body: {
        attemptsRemaining: 1,
        message: expect.stringContaining("1 more attempt"),
      },
    });
  });

  it("locks for five minutes after the third failure", () => {
    const response = getLockoutResponse({
      failedAttempts: 3,
      lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      permanentlyLocked: false,
    });

    expect(response?.status).toBe(423);
    expect(response?.body).toMatchObject({
      code: "TEMPORARY_ACCOUNT_LOCK",
      retryAfterSeconds: expect.any(Number),
    });
    expect(response?.body.message).toContain("2 incorrect attempts remain");
  });

  it("warns that one more failure after the fourth-attempt cooldown permanently locks the account", () => {
    const response = getLockoutResponse({
      failedAttempts: 4,
      lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      permanentlyLocked: false,
    });

    expect(response?.body.message).toContain("One more incorrect password");
    expect(response?.body.message).toContain("permanently lock");
  });

  it("permanently locks after the fifth failure and directs users to support", () => {
    const response = getFailedLoginResponse({
      failedAttempts: 5,
      lockedUntil: null,
      permanentlyLocked: true,
    });

    expect(response).toMatchObject({
      status: 423,
      body: {
        code: "PERMANENT_ACCOUNT_LOCK",
        message: expect.stringContaining("support@we-cush.com"),
      },
    });
  });

  it("uses an atomic upsert to record a failed attempt", async () => {
    const nextState = {
      failedAttempts: 3,
      lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      permanentlyLocked: false,
    };
    mocks.query.mockResolvedValue({ rows: [nextState] });

    const result = await recordFailedLogin("Person@Example.com");

    expect(result).toEqual(nextState);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (email) DO UPDATE SET"),
      ["person@example.com", expect.any(Date)],
    );
  });

  it("returns an unlocked default when no attempts have been recorded", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await expect(getLoginAttemptState("new@example.com")).resolves.toEqual({
      failedAttempts: 0,
      lockedUntil: null,
      permanentlyLocked: false,
    });
  });

  it("revokes sessions using the stored session user ID", async () => {
    mocks.query.mockResolvedValue({ rows: [], rowCount: 2 });

    await revokeUserSessions(12);

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM public.cush_sessions WHERE sess->>'userId' = $1"),
      ["12"],
    );
  });
});
