import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: { insert: vi.fn(), update: vi.fn() },
}));

vi.mock("./db", () => ({ db: mockDb }));

import { adminAuditLogs } from "@shared/schema";
import {
  getAdminAuditIpRetentionCutoff,
  recordAdminAuditEvent,
  recordAdminAuditEventAfterCommit,
} from "./admin-audit";

describe("recordAdminAuditEvent", () => {
  beforeEach(() => {
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
  });

  it("writes through the supplied transaction executor", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const executor = { insert } as never;
    const req = { userId: 17, ip: "203.0.113.10" } as never;

    await recordAdminAuditEvent(req, {
      action: "admin.evidence_freshness.source_date_confirmed",
      resourceType: "mono_evidence",
      resourceId: 42,
    }, executor);

    expect(insert).toHaveBeenCalledWith(adminAuditLogs);
    expect(values).toHaveBeenCalledWith({
      adminUserId: 17,
      action: "admin.evidence_freshness.source_date_confirmed",
      resourceType: "mono_evidence",
      resourceId: "42",
      outcome: "success",
      ipAddress: "203.0.113.10",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("refuses to write an audit event without an authenticated user", async () => {
    await expect(recordAdminAuditEvent({ ip: "203.0.113.10" } as never, {
      action: "admin.evidence_freshness.source_date_confirmed",
    })).rejects.toThrow("An authenticated admin user is required for audit records.");

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("writes a committed Verify audit mirror through the main database", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values });
    const req = { userId: 21, ip: "203.0.113.11" } as never;

    await recordAdminAuditEventAfterCommit(req, {
      action: "admin.cush_verify.billing.promotional_credit",
      resourceType: "cush_verify_billing_account",
      resourceId: 8,
    });

    expect(mockDb.insert).toHaveBeenCalledWith(adminAuditLogs);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      adminUserId: 21,
      action: "admin.cush_verify.billing.promotional_credit",
      resourceId: "8",
    }));
  });

  it("keeps an already-committed Verify action successful if the central audit mirror fails", async () => {
    const values = vi.fn().mockRejectedValue({ code: "42P01" });
    mockDb.insert.mockReturnValue({ values });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(recordAdminAuditEventAfterCommit({ userId: 21 } as never, {
      action: "admin.cush_verify.billing.promotional_credit",
    })).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "Cush Verify action committed but central admin audit mirror failed",
      expect.objectContaining({ databaseCode: "42P01" }),
    );
    errorSpy.mockRestore();
  });

  it("expires new audit IPs one calendar year after their event", () => {
    expect(getAdminAuditIpRetentionCutoff(new Date("2027-11-07T09:28:36.000Z")))
      .toEqual(new Date("2026-11-07T09:28:36.000Z"));
  });
});
