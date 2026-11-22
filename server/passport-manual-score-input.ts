import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import type { V2AssessmentInput } from "@shared/schema";
import {
  convertMinorToGbpPence,
  getCbnDailyRates,
} from "./cbn-fx-rates";
import type { PassportFinancialProfile } from "./passport-evidence-service";

type ManualHistory = PassportFinancialProfile["financialHistory"][number];

type ScoreRow = {
  id: string;
  month: string;
  countryCode: string;
  currencyCode: string;
  label: string;
  incomeAmount: string;
  incomeFrequency: "weekly" | "monthly" | "annual" | "variable" | "";
  incomeCategory: "salary" | "contract" | "business" | "family_support" | "other";
  recurring: boolean;
  variable: boolean;
  savingsAmount: string;
  savingsLabel: string;
  expensesAmount: string;
  completeCashFlow: boolean;
};

export class ManualScoreConversionError extends Error {
  constructor() {
    super("Manual financial entries could not be converted with a supported, recent exchange rate.");
    this.name = "ManualScoreConversionError";
  }
}

function minorUnits(value: string): number {
  const amount = new Decimal(value);
  const minor = amount.mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const result = minor.toNumber();
  if (!minor.isFinite() || minor.isNegative() || !Number.isSafeInteger(result)) {
    throw new ManualScoreConversionError();
  }
  return result;
}

function monthEndDate(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

export function rateLookupDateForMonth(month: string, asOfDate: string): string {
  return monthEndDate(month) > asOfDate ? asOfDate : monthEndDate(month);
}

function withinSixMonthWindow(month: string, assessmentMonth: string): boolean {
  const [assessmentYear, assessmentNumber] = assessmentMonth.split("-").map(Number);
  const [year, monthNumber] = month.split("-").map(Number);
  const distance = assessmentYear * 12 + assessmentNumber - (year * 12 + monthNumber);
  return distance >= 0 && distance < 6;
}

function monthlyAmount(value: string, frequency: ScoreRow["incomeFrequency"]): string {
  const amount = new Decimal(value);
  if (frequency === "weekly") return amount.mul(52).div(12).toFixed(4);
  if (frequency === "annual") return amount.div(12).toFixed(4);
  return amount.toFixed(4);
}

async function toGbpPence(
  amount: string,
  currency: string,
  month: string,
  rateCache: Map<string, Awaited<ReturnType<typeof getCbnDailyRates>>>,
  asOfDate: string,
): Promise<number | null> {
  if (!amount) return 0;
  const minor = minorUnits(amount);
  if (currency === "GBP") return minor;
  if (currency !== "USD" && currency !== "NGN") return null;
  const date = rateLookupDateForMonth(month, asOfDate);
  const cacheKey = `${currency}:${date}`;
  let rates = rateCache.get(cacheKey);
  if (!rates) {
    try {
      rates = await getCbnDailyRates(date);
    } catch {
      throw new ManualScoreConversionError();
    }
    rateCache.set(cacheKey, rates);
  }
  try {
    return convertMinorToGbpPence(minor, currency, rates);
  } catch {
    throw new ManualScoreConversionError();
  }
}

function toScoreCategory(category: ScoreRow["incomeCategory"]) {
  if (category === "contract") return "self_employment" as const;
  if (category === "business") return "business" as const;
  if (category === "family_support") return "family_support" as const;
  if (category === "salary") return "salary" as const;
  return "other" as const;
}

function rowsForProfile(profile: PassportFinancialProfile, assessmentMonth: string): ScoreRow[] {
  const rows: ScoreRow[] = profile.financialHistory.map((entry: ManualHistory) => ({
    id: entry.id,
    month: entry.month,
    countryCode: entry.countryCode,
    currencyCode: entry.currencyCode,
    label: entry.label,
    incomeAmount: entry.incomeAmount,
    incomeFrequency: entry.incomeFrequency,
    incomeCategory: entry.incomeCategory,
    recurring: entry.recurring,
    variable: entry.variable || entry.incomeFrequency === "variable",
    savingsAmount: entry.savingsAmount,
    savingsLabel: entry.savingsLabel,
    expensesAmount: entry.expensesAmount,
    completeCashFlow: entry.completeCashFlow,
  }));
  const hasCurrentProfileData = Boolean(
    profile.incomeAmount || profile.savingsAmount || profile.housingCost || profile.commitmentsAmount,
  );
  const currentMonthEntryIndex = rows.findIndex((row) =>
    row.month === assessmentMonth &&
    row.countryCode === profile.countryCode &&
    row.currencyCode === profile.currencyCode,
  );
  if (hasCurrentProfileData) {
    const currentValues: Partial<ScoreRow> = {};
    if (profile.incomeAmount && profile.incomeFrequency) {
      currentValues.incomeAmount = profile.incomeAmount;
      currentValues.incomeFrequency = profile.incomeFrequency;
      currentValues.incomeCategory = profile.incomeCategory;
      currentValues.recurring = true;
      currentValues.variable = profile.incomeFrequency === "variable";
    }
    if (profile.savingsAmount) {
      currentValues.savingsAmount = profile.savingsAmount;
      currentValues.savingsLabel = profile.savingsLabel || "Current savings";
    }
    if (profile.housingCost || profile.commitmentsAmount) {
      currentValues.expensesAmount = new Decimal(profile.housingCost || "0")
        .plus(profile.commitmentsAmount || "0")
        .toFixed(4);
    }
    if (profile.completeCashFlow) currentValues.completeCashFlow = true;
    if (currentMonthEntryIndex >= 0) {
      rows[currentMonthEntryIndex] = {
        ...rows[currentMonthEntryIndex],
        ...currentValues,
        completeCashFlow: Boolean(currentValues.completeCashFlow || rows[currentMonthEntryIndex].completeCashFlow),
      };
    } else {
      rows.push({
        id: randomUUID(),
        month: assessmentMonth,
        countryCode: profile.countryCode,
        currencyCode: profile.currencyCode,
        label: "Current financial profile",
        incomeAmount: "",
        incomeFrequency: "",
        incomeCategory: profile.incomeCategory,
        recurring: true,
        variable: false,
        savingsAmount: "",
        savingsLabel: "",
        expensesAmount: "",
        completeCashFlow: false,
        ...currentValues,
      });
    }
  }
  return rows;
}

export async function buildProfileScoreInputs(
  profile: PassportFinancialProfile | null,
  assessmentMonth: string,
  asOfDate = new Date().toISOString().slice(0, 10),
): Promise<Pick<V2AssessmentInput, "availableFunds" | "incomeHistory" | "cashFlowHistory"> & { unscoredCurrencyCodes: string[] }> {
  if (!profile) return { availableFunds: [], incomeHistory: [], cashFlowHistory: [], unscoredCurrencyCodes: [] };
  const rateCache = new Map<string, Awaited<ReturnType<typeof getCbnDailyRates>>>();
  const allRows = rowsForProfile(profile, assessmentMonth);
  const rows = allRows.filter((row) => withinSixMonthWindow(row.month, assessmentMonth));
  const unscoredCurrencyCodes = new Set<string>();
  const availableFunds: V2AssessmentInput["availableFunds"] = [];
  const latestSavings = new Map<string, { row: ScoreRow; amount: string }>();
  for (const row of rows) {
    if (!row.savingsAmount) continue;
    const label = row.savingsLabel || row.label;
    const key = `${row.countryCode}:${row.currencyCode}:${label.toLowerCase()}`;
    const existing = latestSavings.get(key);
    if (!existing || existing.row.month < row.month) {
      latestSavings.set(key, { row, amount: row.savingsAmount });
    }
  }
  for (const [key, value] of latestSavings) {
    const amountPence = await toGbpPence(value.amount, value.row.currencyCode, value.row.month, rateCache, asOfDate);
    if (amountPence === null) {
      unscoredCurrencyCodes.add(value.row.currencyCode);
      continue;
    }
    if (amountPence <= 0) continue;
    availableFunds.push({
      id: value.row.id,
      label: value.row.savingsLabel || value.row.label,
      deduplicationKey: `passport-manual:${key}`.slice(0, 120),
      amountPence,
      currencyCode: "GBP",
      accessible: true,
    });
  }

  const incomeHistory: V2AssessmentInput["incomeHistory"] = [];
  const cashFlowByMonth = new Map<string, {
    incomePence: number;
    expensesPence: number;
    complete: boolean;
    rowCount: number;
  }>();
  for (const row of rows) {
    const hasIncome = Boolean(row.incomeAmount && row.incomeFrequency);
    const incomePence = hasIncome
      ? await toGbpPence(monthlyAmount(row.incomeAmount, row.incomeFrequency), row.currencyCode, row.month, rateCache, asOfDate)
      : 0;
    if (hasIncome && incomePence === null) {
      unscoredCurrencyCodes.add(row.currencyCode);
      continue;
    }
    if (hasIncome && incomePence !== null && incomePence > 0) {
      incomeHistory.push({
        id: row.id,
        month: row.month,
        sourceId: `passport-manual:${row.countryCode}:${row.currencyCode}:${row.label.toLowerCase()}`.slice(0, 100),
        category: toScoreCategory(row.incomeCategory),
        amountPence: incomePence,
        recurring: row.recurring,
        variable: row.variable,
      });
    }
    if (!hasIncome && !row.expensesAmount && !row.completeCashFlow) continue;
    const expensesPence = await toGbpPence(row.expensesAmount || "0", row.currencyCode, row.month, rateCache, asOfDate);
    if (expensesPence === null) {
      unscoredCurrencyCodes.add(row.currencyCode);
      continue;
    }
    const month = cashFlowByMonth.get(row.month) ?? {
      incomePence: 0,
      expensesPence: 0,
      complete: true,
      rowCount: 0,
    };
    month.incomePence += row.recurring ? (incomePence ?? 0) : 0;
    month.expensesPence += expensesPence;
    month.complete = month.complete && row.completeCashFlow;
    month.rowCount += 1;
    cashFlowByMonth.set(row.month, month);
  }

  const cashFlowHistory: V2AssessmentInput["cashFlowHistory"] = [];
  for (const [month, value] of cashFlowByMonth) {
    if (!value.rowCount) continue;
    if (!Number.isSafeInteger(value.incomePence) || !Number.isSafeInteger(value.expensesPence)) {
      throw new ManualScoreConversionError();
    }
    cashFlowHistory.push({
      id: randomUUID(),
      month,
      eligibleRecurringIncomePence: value.incomePence,
      eligibleExpensesPence: value.expensesPence,
      complete: value.complete,
    });
  }
  return { availableFunds, incomeHistory, cashFlowHistory, unscoredCurrencyCodes: [...unscoredCurrencyCodes].sort() };
}
