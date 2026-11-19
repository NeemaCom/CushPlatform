import { describe, expect, it } from "vitest";
import { consumeNewApiAccessApproval } from "./cush-verify-api-access-notification";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    clear: () => values.clear(),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

describe("API access approval notifications", () => {
  it("notifies once for a new approval and does not repeat it", () => {
    const storage = memoryStorage();
    const events = [{ id: 82, requestId: 41, eventType: "approved" as const }];

    expect(consumeNewApiAccessApproval(11, events, storage)).toEqual(events[0]);
    expect(consumeNewApiAccessApproval(11, events, storage)).toBeNull();
  });

  it("does not treat submitted or rejected requests as approvals", () => {
    const storage = memoryStorage();
    expect(consumeNewApiAccessApproval(11, [
      { id: 83, requestId: 42, eventType: "rejected" },
      { id: 82, requestId: 41, eventType: "submitted" },
    ], storage)).toBeNull();
  });

  it("keeps notification state separate between institutions", () => {
    const storage = memoryStorage();
    const events = [{ id: 82, requestId: 41, eventType: "approved" as const }];
    consumeNewApiAccessApproval(11, events, storage);
    expect(consumeNewApiAccessApproval(12, events, storage)).toEqual(events[0]);
  });
});
