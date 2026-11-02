import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: { insert: vi.fn() },
}));

vi.mock("./db", () => ({ db: mockDb }));

import { adminAuditLogs } from "@shared/schema";
import { recordAdminAuditEvent } from "./admin-audit";

describe("recordAdminAuditEvent", () => {
  beforeEach(() => {
    mockDb.insert.mockReset();
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
});
