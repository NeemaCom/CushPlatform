import { describe, expect, it } from "vitest";
import {
  createVisitorAnalyticsCsv,
  createVisitorReference,
  type VisitorAnalyticsExportRow,
} from "../server/visitor-analytics-export";

const sampleRow: VisitorAnalyticsExportRow = {
  visitor_id: "d943c21e-f715-47a4-b087-8cc56350fa4f",
  visitor_type: "anonymous",
  session_count: 2,
  first_seen: new Date("2026-11-09T09:00:00.000Z"),
  last_seen: "2026-11-09T10:00:00.000Z",
  current_route: "/dashboard",
  device_type: "mobile",
  browser: "Chrome",
  operating_system: "Android",
  page_views: 4,
  signup_completions: 0,
  logins: 0,
};

describe("visitor analytics CSV exports", () => {
  it("uses a per-export pseudonymous reference instead of visitor IDs", () => {
    const salt = Buffer.alloc(32, 1);
    const reference = createVisitorReference(sampleRow.visitor_id, salt);
    const csv = createVisitorAnalyticsCsv([sampleRow], salt);

    expect(reference).toHaveLength(16);
    expect(createVisitorReference(sampleRow.visitor_id, Buffer.alloc(32, 2))).not.toBe(reference);
    expect(csv).toContain(reference);
    expect(csv).not.toContain(sampleRow.visitor_id);
    expect(csv).not.toContain("email");
    expect(csv).not.toContain("user_id");
  });

  it("exports only approved summary fields and quotes CSV values", () => {
    const csv = createVisitorAnalyticsCsv([sampleRow], Buffer.alloc(32, 3));
    const lines = csv.trimEnd().split("\r\n");

    expect(lines[0]).toBe(
      '"visitor_reference","visitor_type","sessions","first_seen","last_seen","current_route","device_type","browser","operating_system","page_views","signup_completions","logins"',
    );
    expect(lines[1]).toContain('"2026-11-09T09:00:00.000Z"');
    expect(lines[1]).toContain('"/dashboard"');
    expect(lines[1]).not.toContain("raw_ip");
  });

  it("neutralizes spreadsheet formulas and escapes quotes", () => {
    const csv = createVisitorAnalyticsCsv([{
      ...sampleRow,
      current_route: '=HYPERLINK("https://example.test","open")',
    }], Buffer.alloc(32, 4));

    expect(csv).toContain(`"'=HYPERLINK(""https://example.test"",""open"")"`);
  });
});
