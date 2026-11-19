export type ApiAccessNotificationEvent = {
  id: number;
  requestId: number;
  eventType: "submitted" | "approved" | "rejected";
};

export function consumeNewApiAccessApproval(
  institutionId: number,
  events: ApiAccessNotificationEvent[],
  storage: Pick<Storage, "getItem" | "setItem">,
): ApiAccessNotificationEvent | null {
  const event = events.find((item) => item.eventType === "approved");
  if (!event) return null;

  const key = `cush-verify-api-access-approved:${institutionId}:${event.requestId}`;
  try {
    if (storage.getItem(key) === String(event.id)) return null;
    storage.setItem(key, String(event.id));
  } catch {
    // Still notify in this browser session when persistent storage is unavailable.
  }
  return event;
}
