import type { CushScoreResult, DestinationBaseline } from "./cush-score-service";

export const FLAT_UK_BASELINE: DestinationBaseline = {
  destination: "United Kingdom",
  monthlyBaselinePence: 100_000,
  effectiveDate: "2026-11-01",
  countryCode: "GB",
};

export type CustomerCalculation = Omit<
  CushScoreResult,
  | "componentScores"
  | "weightedContributions"
  | "confidenceBreakdown"
  | "scoredComponentCount"
  | "recognizedMonthlyIncomePence"
  | "fundsMonths"
  | "incomeRatio"
  | "cashFlowCap"
  | "assessmentContext"
>;

export function toCustomerCalculation(calculation: CushScoreResult): CustomerCalculation {
  const {
    componentScores: _componentScores,
    weightedContributions: _weightedContributions,
    confidenceBreakdown: _confidenceBreakdown,
    scoredComponentCount: _scoredComponentCount,
    recognizedMonthlyIncomePence: _recognizedMonthlyIncomePence,
    fundsMonths: _fundsMonths,
    incomeRatio: _incomeRatio,
    cashFlowCap: _cashFlowCap,
    assessmentContext: _assessmentContext,
    ...customerCalculation
  } = calculation;
  return customerCalculation;
}
