import { createDecipheriv, createCipheriv, randomBytes } from "node:crypto";
import { inflateSync } from "node:zlib";
import { z } from "zod";

export const MAX_EVIDENCE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_EXTRACTED_TEXT_CHARS = 25_000;

const optionalText = (max: number) => z.string().trim().max(max).default("");
const amountText = z.string().trim().max(32).default("").refine(
  (value) => value === "" || /^\d{1,18}(?:\.\d{1,4})?$/.test(value),
  "Use a positive amount with up to four decimal places.",
);

export const passportFinancialProfileSchema = z.object({
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  employmentStatus: optionalText(80),
  employer: optionalText(160),
  jobTitle: optionalText(120),
  incomeAmount: amountText,
  incomeFrequency: z.enum(["weekly", "monthly", "annual", "variable", ""]).default(""),
  housingStatus: optionalText(100),
  housingCost: amountText,
  savingsAmount: amountText,
  commitmentsAmount: amountText,
  financialHistorySummary: optionalText(2000),
}).strict();

export type PassportFinancialProfile = z.infer<typeof passportFinancialProfileSchema>;

export const evidenceDocumentTypeSchema = z.enum([
  "payslip",
  "bank_statement",
  "rent_receipt",
  "savings_statement",
  "commitment_statement",
  "proof_of_residency",
  "tax_return",
  "employment_contract",
  "transfer_receipt",
  "other",
]);

export const evidenceUploadMetadataSchema = z.object({
  documentType: evidenceDocumentTypeSchema,
  label: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  fileName: z.string().trim().min(1).max(180),
}).strict();

export const evidenceDraftCorrectionSchema = z.object({
  correctedDraft: z.string().max(MAX_EXTRACTED_TEXT_CHARS, "Corrections must be 25,000 characters or fewer."),
}).strict();

export const evidenceReviewSchema = z.object({
  reviewStatus: z.enum(["under_review", "additional_information_required", "approved", "rejected"]),
  evidenceClassification: z.enum([
    "self_declared",
    "document_supported",
    "independently_verified",
    "institution_confirmed",
  ]),
  notes: z.string().trim().max(1200).default(""),
  reviewBasis: z.string().trim().max(1200).default(""),
}).strict().superRefine((value, context) => {
  if (
    ["independently_verified", "institution_confirmed"].includes(value.evidenceClassification) &&
    value.reviewBasis.length < 20
  ) {
    context.addIssue({
      code: "custom",
      path: ["reviewBasis"],
      message: "Record at least 20 characters describing the independent confirmation basis.",
    });
  }
});

export class EvidenceEncryptionUnavailableError extends Error {
  constructor() {
    super("Passport evidence encryption is not configured.");
    this.name = "EvidenceEncryptionUnavailableError";
  }
}

function encryptionKey(): Buffer {
  const encoded = process.env.PASSPORT_EVIDENCE_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new EvidenceEncryptionUnavailableError();
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
    throw new EvidenceEncryptionUnavailableError();
  }
  return key;
}

export function encryptEvidenceBytes(plainText: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptEvidenceBytes(envelope: string): Buffer {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded, ...extra] = envelope.split(".");
  if (version !== "v1" || !ivEncoded || !tagEncoded || !ciphertextEncoded || extra.length > 0) {
    throw new Error("Evidence content is not in a supported encrypted format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64")),
    decipher.final(),
  ]);
}

export function encryptEvidenceJson(value: unknown): string {
  return encryptEvidenceBytes(Buffer.from(JSON.stringify(value), "utf8"));
}

export function decryptEvidenceJson<T>(envelope: string): T {
  return JSON.parse(decryptEvidenceBytes(envelope).toString("utf8")) as T;
}

export function getFinancialProfileProgress(profile: PassportFinancialProfile | null) {
  const steps = [
    { id: "employment", label: "Employment details", complete: Boolean(profile?.employmentStatus || profile?.employer || profile?.jobTitle) },
    { id: "income", label: "Income details", complete: Boolean(profile?.incomeAmount && profile?.incomeFrequency) },
    { id: "housing", label: "Housing costs", complete: Boolean(profile?.housingStatus || profile?.housingCost) },
    { id: "savings", label: "Savings", complete: Boolean(profile?.savingsAmount) },
    { id: "commitments", label: "Financial commitments", complete: Boolean(profile?.commitmentsAmount) },
    { id: "history", label: "Financial history", complete: Boolean(profile?.financialHistorySummary) },
  ];
  const completed = steps.filter((step) => step.complete).length;
  return {
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
    steps,
  };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      if (rows.length >= 1000) break;
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
}

function decodePdfLiteral(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      result += char;
      continue;
    }
    const next = value[index + 1];
    if (next === undefined) continue;
    index += 1;
    if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "t") result += "\t";
    else if (next === "b") result += "\b";
    else if (next === "f") result += "\f";
    else if (next === "\n") continue;
    else if (next === "\r") {
      if (value[index + 1] === "\n") index += 1;
    } else if (/[0-7]/.test(next)) {
      let octal = next;
      for (let count = 0; count < 2 && /[0-7]/.test(value[index + 1] ?? ""); count += 1) {
        octal += value[++index];
      }
      result += String.fromCharCode(parseInt(octal, 8));
    } else {
      result += next;
    }
  }
  return result;
}

function decodePdfHex(value: string): string {
  const bytes = Buffer.from(value.length % 2 ? `${value}0` : value, "hex");
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const points: number[] = [];
    for (let index = 2; index + 1 < bytes.length; index += 2) points.push(bytes.readUInt16BE(index));
    return String.fromCharCode(...points);
  }
  return bytes.toString("latin1");
}

function pdfTextFromStream(stream: string): string[] {
  const found: string[] = [];
  for (const match of stream.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
    found.push(decodePdfLiteral(match[1]));
  }
  for (const match of stream.matchAll(/\[((?:.|\n)*?)\]\s*TJ/g)) {
    for (const literal of match[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)) {
      found.push(decodePdfLiteral(literal[1]));
    }
    for (const hex of match[1].matchAll(/<([0-9a-fA-F]{4,})>/g)) {
      found.push(decodePdfHex(hex[1]));
    }
  }
  for (const match of stream.matchAll(/<([0-9a-fA-F]{4,})>\s*Tj/g)) {
    found.push(decodePdfHex(match[1]));
  }
  return found;
}

export function extractPdfDraft(file: Buffer): string {
  const raw = file.toString("latin1");
  const streams: string[] = [];
  let cursor = 0;
  let decompressedBytes = 0;
  while (true) {
    const startMarker = raw.indexOf("stream", cursor);
    if (startMarker < 0) break;
    let dataStart = startMarker + 6;
    if (raw[dataStart] === "\r" && raw[dataStart + 1] === "\n") dataStart += 2;
    else if (raw[dataStart] === "\n" || raw[dataStart] === "\r") dataStart += 1;
    const endMarker = raw.indexOf("endstream", dataStart);
    if (endMarker < 0) break;
    const headerStart = raw.lastIndexOf("endobj", startMarker);
    const header = raw.slice(headerStart < 0 ? 0 : headerStart, startMarker);
    let streamBytes = Buffer.from(raw.slice(dataStart, endMarker), "latin1");
    if (header.includes("/FlateDecode")) {
      try {
        streamBytes = inflateSync(streamBytes, { maxOutputLength: 20 * 1024 * 1024 });
      } catch {
        cursor = endMarker + 9;
        continue;
      }
    } else if (/\/Filter\b/.test(header)) {
      cursor = endMarker + 9;
      continue;
    }
    decompressedBytes += streamBytes.length;
    if (decompressedBytes > 20 * 1024 * 1024) {
      throw new Error("The PDF contains too much decompressed content to preview safely.");
    }
    streams.push(streamBytes.toString("latin1"));
    cursor = endMarker + 9;
  }

  const extracted = streams.flatMap(pdfTextFromStream).join("\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return extracted.slice(0, MAX_EXTRACTED_TEXT_CHARS);
}

export function extractEvidenceDraft(file: Buffer, mimeType: string): string {
  if (mimeType === "text/csv") {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(file);
    const rows = parseCsvRows(decoded);
    if (!rows.length) return "";
    return rows.map((row) => row.join(" | ")).join("\n").slice(0, MAX_EXTRACTED_TEXT_CHARS);
  }
  if (mimeType === "application/pdf") {
    if (file.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("This file does not appear to be a valid PDF.");
    }
    return extractPdfDraft(file);
  }
  throw new Error("Upload a PDF or CSV file.");
}
