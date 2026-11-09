import { createHmac } from "node:crypto";

export interface VisitorAnalyticsExportRow {
  visitor_id: string;
  visitor_type: "signed-in" | "anonymous";
  session_count: number;
  first_seen: Date | string;
  last_seen: Date | string;
  current_route: string;
  device_type: string;
  browser: string;
  operating_system: string;
  page_views: number;
  signup_completions: number;
  logins: number;
}

const HEADERS = [
  "visitor_reference",
  "visitor_type",
  "sessions",
  "first_seen",
  "last_seen",
  "current_route",
  "device_type",
  "browser",
  "operating_system",
  "page_views",
  "signup_completions",
  "logins",
] as const;

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""').replace(/\r\n?/g, "\n")}"`;
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function createVisitorReference(visitorId: string, salt: Uint8Array): string {
  return createHmac("sha256", salt).update(visitorId).digest("hex").slice(0, 16);
}

export function createVisitorAnalyticsCsv(
  rows: VisitorAnalyticsExportRow[],
  salt: Uint8Array,
): string {
  const csvRows = rows.map((row) => [
    createVisitorReference(row.visitor_id, salt),
    row.visitor_type,
    row.session_count,
    toIsoString(row.first_seen),
    toIsoString(row.last_seen),
    row.current_route,
    row.device_type,
    row.browser,
    row.operating_system,
    row.page_views,
    row.signup_completions,
    row.logins,
  ]);

  return [HEADERS, ...csvRows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n") + "\r\n";
}
