import type { MemEvidence } from "./mem-store";

export function toEvidenceMetadata(item: MemEvidence) {
  return {
    id: item.id,
    documentType: item.documentType,
    label: item.label,
    tier: item.tier,
    fileName: item.fileName,
    status: item.status,
    submittedAt: item.submittedAt,
  };
}
