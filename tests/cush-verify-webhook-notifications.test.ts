import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cushVerifyWebhookFailureNotifications,
} from "@shared/schema";

const { database } = vi.hoisted(() => ({ database: {} }));
vi.mock("../server/db", () => ({ cushVerifyDb: database }));

import { queueCushVerifyWebhookFailureNotifications } from "../server/cush-verify-webhook-notifications";

function makeTransaction(recipients: Array<{ institutionalUserId: number }>) {
  const query = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    where: vi.fn(async () => recipients),
  };
  const insertQuery = {
    onConflictDoNothing: vi.fn(async () => undefined),
  };
  const insertValues = vi.fn(() => insertQuery);
  const tx = {
    select: vi.fn(() => query),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  return { tx, query, insertValues, insertQuery };
}

describe("Cush Verify webhook failure notification queue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queues one persistent alert per active organisation administrator recipient", async () => {
    const { tx, query, insertValues, insertQuery } = makeTransaction([
      { institutionalUserId: 51 },
      { institutionalUserId: 52 },
    ]);
    await queueCushVerifyWebhookFailureNotifications(tx as never, {
      deliveryId: 91,
      institutionId: 12,
    });

    expect(query.where).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledWith(cushVerifyWebhookFailureNotifications);
    expect(insertValues).toHaveBeenCalledWith([
      { deliveryId: 91, institutionId: 12, institutionalUserId: 51 },
      { deliveryId: 91, institutionId: 12, institutionalUserId: 52 },
    ]);
    expect(insertQuery.onConflictDoNothing).toHaveBeenCalledOnce();
  });

  it("does not create an alert when the institution has no eligible admins", async () => {
    const { tx } = makeTransaction([]);
    await queueCushVerifyWebhookFailureNotifications(tx as never, {
      deliveryId: 91,
      institutionId: 12,
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
