import type { V2AssessmentInput } from "@shared/schema";

type ProfileScoreInputs = Pick<V2AssessmentInput, "availableFunds" | "incomeHistory" | "cashFlowHistory"> & {
  unscoredCurrencyCodes: string[];
};

export function mergePassportScoreInputs(
  preArrival: ProfileScoreInputs,
  postArrival: ProfileScoreInputs,
): ProfileScoreInputs {
  const availableFunds = new Map<string, V2AssessmentInput["availableFunds"][number]>();
  for (const fund of [...preArrival.availableFunds, ...postArrival.availableFunds]) {
    availableFunds.set(fund.deduplicationKey.toLowerCase(), fund);
  }
  const incomeHistory = new Map<string, V2AssessmentInput["incomeHistory"][number]>();
  for (const income of [...preArrival.incomeHistory, ...postArrival.incomeHistory]) {
    incomeHistory.set(`${income.sourceId}:${income.month}`, income);
  }
  const cashFlowHistory = new Map<string, V2AssessmentInput["cashFlowHistory"][number]>();
  for (const row of [...preArrival.cashFlowHistory, ...postArrival.cashFlowHistory]) {
    cashFlowHistory.set(row.month, row);
  }
  return {
    availableFunds: [...availableFunds.values()],
    incomeHistory: [...incomeHistory.values()],
    cashFlowHistory: [...cashFlowHistory.values()],
    unscoredCurrencyCodes: [...new Set([
      ...preArrival.unscoredCurrencyCodes,
      ...postArrival.unscoredCurrencyCodes,
    ])].sort(),
  };
}
