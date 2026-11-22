import { afterEach, describe, expect, it } from "vitest";
import {
  decryptEvidenceBytes,
  encryptEvidenceBytes,
  EvidenceEncryptionUnavailableError,
  extractEvidenceDraft,
  passportFinancialProfileSchema,
} from "./passport-evidence-service";

const originalKey = process.env.PASSPORT_EVIDENCE_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.PASSPORT_EVIDENCE_ENCRYPTION_KEY;
  else process.env.PASSPORT_EVIDENCE_ENCRYPTION_KEY = originalKey;
});

describe("Passport evidence intake safeguards", () => {
  it("encrypts stored content and rejects ciphertext tampering", () => {
    process.env.PASSPORT_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const plain = Buffer.from("private statement content", "utf8");
    const encrypted = encryptEvidenceBytes(plain);
    expect(encrypted).not.toContain(plain.toString("utf8"));
    expect(decryptEvidenceBytes(encrypted).toString("utf8")).toBe("private statement content");
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    const changedTag = `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`;
    expect(() => decryptEvidenceBytes([version, iv, changedTag, ciphertext].join("."))).toThrow();
  });

  it("fails closed when the encryption key is missing", () => {
    delete process.env.PASSPORT_EVIDENCE_ENCRYPTION_KEY;
    expect(() => encryptEvidenceBytes(Buffer.from("private"))).toThrow(EvidenceEncryptionUnavailableError);
  });

  it("extracts CSV text as an editable draft and rejects malformed UTF-8", () => {
    const csv = Buffer.from('month,description,amount\n2026-10,"Salary, October",2500\n', "utf8");
    expect(extractEvidenceDraft(csv, "text/csv")).toContain("Salary, October");
    expect(() => extractEvidenceDraft(Buffer.from([0xff, 0xfe]), "text/csv")).toThrow();
  });

  it("extracts text from basic PDFs without treating it as verified evidence", () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nstream\nBT (Statement total) Tj ET\nendstream\nendobj", "latin1");
    expect(extractEvidenceDraft(pdf, "application/pdf")).toBe("Statement total");
    expect(() => extractEvidenceDraft(Buffer.from("not a pdf"), "application/pdf")).toThrow(/valid PDF/);
  });

  it("limits scoreable profile currencies to the supported conversion set", () => {
    expect(() => passportFinancialProfileSchema.parse({
      countryCode: "GB",
      currencyCode: "EUR",
      incomeAmount: "",
      housingCost: "",
      savingsAmount: "",
      commitmentsAmount: "",
      financialHistorySummary: "",
      financialHistory: [],
    })).toThrow();
  });
});
