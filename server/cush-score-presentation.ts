import type { CushScoreResult } from "./cush-score-service";

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
