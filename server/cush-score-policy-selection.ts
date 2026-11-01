import type { CushScorePolicyConfig } from "@shared/schema";

export type DestinationBaselinePolicy = CushScorePolicyConfig["destinationBaselines"][number];

export function selectVersionedDestinationBaseline(
  configuration: CushScorePolicyConfig | null,
  selectedBaselineId: string | null,
  asOfDate: string,
): DestinationBaselinePolicy | null {
  if (!configuration) return null;
  const eligible = configuration.destinationBaselines.filter((baseline) =>
    baseline.countryCode === "GB" &&
    baseline.currencyCode === "GBP" &&
    baseline.effectiveDate <= asOfDate,
  );
  const selected = selectedBaselineId
    ? eligible.find((baseline) => baseline.id === selectedBaselineId)
    : undefined;
  return selected ?? eligible.sort((left, right) =>
    right.effectiveDate.localeCompare(left.effectiveDate),
  )[0] ?? null;
}
