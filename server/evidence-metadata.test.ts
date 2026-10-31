import { describe, expect, it } from "vitest";
import { toEvidenceMetadata } from "./evidence-metadata";

describe("evidence metadata response", () => {
  it("excludes stored file payload and ownership internals", () => {
    const result = toEvidenceMetadata({
      id: 7,
      userId: 123,
      passportId: 4,
      documentType: "bank_statement",
      label: "Bank statement",
      tier: 2,
      fileData: "data:application/pdf;base64,private-payload",
      fileName: "statement.pdf",
      status: "PENDING_REVIEW",
      submittedAt: new Date("2026-10-31T12:00:00.000Z"),
    });

    expect(result).toEqual({
      id: 7,
      documentType: "bank_statement",
      label: "Bank statement",
      tier: 2,
      fileName: "statement.pdf",
      status: "PENDING_REVIEW",
      submittedAt: new Date("2026-10-31T12:00:00.000Z"),
    });
    expect(result).not.toHaveProperty("fileData");
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("passportId");
  });
});
