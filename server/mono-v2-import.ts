import { randomUUID } from "node:crypto";
import {
  monoV2AssessmentEvidenceSchema,
  type MonoV2AssessmentEvidence,
} from "@shared/schema";
import {
  convertMinorToGbpPence,
  getCbnDailyRates,
  type CbnDailyRates,
  type SupportedCurrency,
} from "./cbn-fx-rates";

const PREVIEW_TTL_MS = 10 * 60 * 1000;
const MAX_PREVIEW_TRANSACTIONS = 5_000;
const CBN_SOURCE = "https://www.cbn.gov.ng/api/GetAllExchangeRates?format=json";

export type MonoTransactionDirection = "credit" | "debit";
export type MonoIncomeCategory =
  | "salary"
  | "self_employment"
  | "freelance"
  | "business"
  | "scholarship"
  | "family_support"
  | "other";

export interface MonoV2PreviewTransaction {
  id: string;
  date: string;
  description: string;
  direction: MonoTransactionDirection;
  currencyCode: SupportedCurrency;
  amountMinor: number;
  amountGbpPence: number;
  rateDate: string | null;
  usdNgnCentralRate: string | null;
  gbpNgnCentralRate: string | null;
}

export interface MonoV2Preview {
  token: string;
  linkedAccountId: number;
  statementPeriodMonths: number;
  fetchedAt: string;
  balance: {
    asOfDate: string;
    currencyCode: SupportedCurrency;
    amountMinor: number;
    amountGbpPence: number;
    rateDate: string | null;
    usdNgnCentralRate: string | null;
    gbpNgnCentralRate: string | null;
  } | null;
  transactions: MonoV2PreviewTransaction[];
  fullMonthOptions: string[];
}

interface StoredPreview extends MonoV2Preview {
  userId: number;
  expiresAt: number;
}

const previewCache = new Map<string, StoredPreview>();

export class MonoV2PreviewError extends Error {}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function findTransactionList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
  }
  const root = asRecord(value);
  const data = asRecord(root?.data);
  for (const candidate of [data, root]) {
    if (!candidate) continue;
    for (const key of ["transactions", "statement", "records"]) {
      if (Array.isArray(candidate[key])) {
        return (candidate[key] as unknown[])
          .map(asRecord)
          .filter((item): item is Record<string, unknown> => item !== null);
      }
    }
  }
  throw new MonoV2PreviewError("Mono returned statement data in an unsupported format.");
}

function transactionDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const directDate = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(directDate)) {
    const date = new Date(`${directDate}T00:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === directDate) {
      return directDate;
    }
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function amountMinor(value: unknown): number | null {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(amount)) return null;
  return Math.abs(amount);
}

function directionOf(value: unknown, amountValue: unknown): MonoTransactionDirection | null {
  if (typeof value === "string") {
    const direction = value.trim().toLowerCase();
    if (["credit", "cr", "inflow"].includes(direction)) return "credit";
    if (["debit", "dr", "outflow"].includes(direction)) return "debit";
    return null;
  }
  const amount = typeof amountValue === "number" ? amountValue : Number(amountValue);
  if (Number.isFinite(amount) && amount !== 0) return amount > 0 ? "credit" : "debit";
  return null;
}

function currencyOf(value: unknown, fallback: unknown): SupportedCurrency | null {
  const currency = typeof value === "string" ? value : fallback;
  if (typeof currency !== "string") return null;
  const normalized = currency.trim().toUpperCase();
  return normalized === "GBP" || normalized === "USD" || normalized === "NGN"
    ? normalized
    : null;
}

function descriptionOf(row: Record<string, unknown>): string {
  const value = row.narration ?? row.description ?? row.reference ?? row.transaction_description;
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 180) : "Bank transaction";
}

export function parseMonoStatementTransactions(
  value: unknown,
  accountCurrency?: unknown,
): Array<Omit<MonoV2PreviewTransaction, "amountGbpPence" | "rateDate" | "usdNgnCentralRate" | "gbpNgnCentralRate">> {
  const rows = findTransactionList(value);
  if (rows.length > MAX_PREVIEW_TRANSACTIONS) {
    throw new MonoV2PreviewError("This statement contains too many transactions to review in one import.");
  }
  const transactions: Array<Omit<MonoV2PreviewTransaction, "amountGbpPence" | "rateDate" | "usdNgnCentralRate" | "gbpNgnCentralRate">> = [];
  for (const row of rows) {
    const amountValue = row.amount ?? row.value;
    const amount = amountMinor(amountValue);
    const direction = directionOf(row.type ?? row.transaction_type ?? row.direction, amountValue);
    const date = transactionDate(row.date ?? row.datetime ?? row.transaction_date ?? row.created_at);
    const currencyCode = currencyOf(row.currency ?? row.currency_code, accountCurrency);
    if (amount === null || !direction || !date || !currencyCode) {
      throw new MonoV2PreviewError("Mono statement rows include unsupported currencies or missing transaction details; no import was prepared.");
    }
    if (amount === 0) continue;
    transactions.push({
      id: randomUUID(),
      date,
      description: descriptionOf(row),
      direction,
      currencyCode,
      amountMinor: amount,
    });
  }
  return transactions;
}

function findAccountData(value: unknown): Record<string, unknown> | null {
  const root = asRecord(value);
  const data = asRecord(root?.data);
  return asRecord(data?.account) ?? data ?? asRecord(root?.account) ?? root;
}

export function parseMonoAccountBalance(value: unknown): {
  currencyCode: SupportedCurrency;
  amountMinor: number;
} | null {
  const data = findAccountData(value);
  if (!data) return null;
  const currencyCode = currencyOf(data.currency ?? data.currency_code, undefined);
  const amount = amountMinor(data.balance ?? data.available_balance ?? data.current_balance);
  if (!currencyCode || amount === null) return null;
  return { currencyCode, amountMinor: amount };
}

function monthBefore(month: string, count: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - count);
  return date.toISOString().slice(0, 7);
}

function lagosCalendarDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function fullClosedMonthsInPeriod(periodMonths: number, now: Date): string[] {
  const currentMonth = lagosCalendarDate(now).slice(0, 7);
  const result: string[] = [];
  for (let offset = 1; offset < periodMonths; offset += 1) {
    const month = monthBefore(currentMonth, offset);
    result.push(month);
  }
  return result.sort();
}

async function converted(
  amount: number,
  currencyCode: SupportedCurrency,
  date: string,
  fetcher: typeof fetch,
): Promise<{
  amountGbpPence: number;
  rateDate: string | null;
  usdNgnCentralRate: string | null;
  gbpNgnCentralRate: string | null;
  rates: CbnDailyRates | null;
}> {
  if (currencyCode === "GBP") {
    return { amountGbpPence: amount, rateDate: null, usdNgnCentralRate: null, gbpNgnCentralRate: null, rates: null };
  }
  const rates = await getCbnDailyRates(date, fetcher);
  return {
    amountGbpPence: convertMinorToGbpPence(amount, currencyCode, rates),
    rateDate: rates.effectiveDate,
    usdNgnCentralRate: rates.usdNgnCentralRate,
    gbpNgnCentralRate: rates.gbpNgnCentralRate,
    rates,
  };
}

export async function createMonoV2Preview(options: {
  userId: number;
  linkedAccountId: number;
  periodMonths: number;
  statement: unknown;
  accountDetails: unknown;
  now?: Date;
  rateFetcher?: typeof fetch;
}): Promise<MonoV2Preview> {
  const now = options.now ?? new Date();
  const rateFetcher = options.rateFetcher ?? fetch;
  const fetchedAt = now.toISOString();
  const balanceAsOfDate = lagosCalendarDate(now);
  const accountData = findAccountData(options.accountDetails);
  const accountCurrency = accountData?.currency ?? accountData?.currency_code;
  const parsedBalance = parseMonoAccountBalance(options.accountDetails);
  let balance: MonoV2Preview["balance"] = null;
  if (parsedBalance && parsedBalance.amountMinor > 0) {
    const balanceConversion = await converted(
      parsedBalance.amountMinor,
      parsedBalance.currencyCode,
      balanceAsOfDate,
      rateFetcher,
    );
    balance = {
      asOfDate: balanceAsOfDate,
      currencyCode: parsedBalance.currencyCode,
      amountMinor: parsedBalance.amountMinor,
      amountGbpPence: balanceConversion.amountGbpPence,
      rateDate: balanceConversion.rateDate,
      usdNgnCentralRate: balanceConversion.usdNgnCentralRate,
      gbpNgnCentralRate: balanceConversion.gbpNgnCentralRate,
    };
  }

  const parsedTransactions = parseMonoStatementTransactions(options.statement, accountCurrency);
  const transactions: MonoV2PreviewTransaction[] = [];
  const dateRates = new Map<string, CbnDailyRates>();
  for (const transaction of parsedTransactions) {
    const conversion = transaction.currencyCode === "GBP"
      ? await converted(transaction.amountMinor, transaction.currencyCode, transaction.date, rateFetcher)
      : await (async () => {
          const rates = dateRates.get(transaction.date) ?? await getCbnDailyRates(transaction.date, rateFetcher);
          dateRates.set(transaction.date, rates);
          return {
            amountGbpPence: convertMinorToGbpPence(transaction.amountMinor, transaction.currencyCode, rates),
            rateDate: rates.effectiveDate,
            usdNgnCentralRate: rates.usdNgnCentralRate,
            gbpNgnCentralRate: rates.gbpNgnCentralRate,
          };
        })();
    transactions.push({ ...transaction, ...conversion });
  }

  const token = randomUUID();
  const preview: StoredPreview = {
    ...{
      token,
      linkedAccountId: options.linkedAccountId,
      statementPeriodMonths: options.periodMonths,
      fetchedAt,
      balance,
      transactions,
      fullMonthOptions: fullClosedMonthsInPeriod(options.periodMonths, now),
    },
    userId: options.userId,
    expiresAt: now.getTime() + PREVIEW_TTL_MS,
  };
  for (const [key, item] of previewCache) {
    if (item.expiresAt <= now.getTime()) previewCache.delete(key);
  }
  if (previewCache.size >= 100) {
    const oldest = [...previewCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) previewCache.delete(oldest[0]);
  }
  previewCache.set(token, preview);
  const { userId: _userId, expiresAt: _expiresAt, ...safePreview } = preview;
  return safePreview;
}

export interface MonoV2ImportSelection {
  previewToken: string;
  recurringIncome: Array<{
    transactionId: string;
    category: MonoIncomeCategory;
    variable: boolean;
  }>;
  eligibleExpenseIds: string[];
  completeMonths: string[];
  includeBalance: boolean;
  consent: true;
}

export function buildMonoV2Evidence(options: {
  userId: number;
  linkedAccountId: number;
  selection: MonoV2ImportSelection;
  now?: Date;
}): MonoV2AssessmentEvidence {
  const now = options.now ?? new Date();
  const preview = previewCache.get(options.selection.previewToken);
  if (!preview || preview.expiresAt <= now.getTime() ||
      preview.userId !== options.userId ||
      preview.linkedAccountId !== options.linkedAccountId) {
    throw new MonoV2PreviewError("This Mono review expired. Prepare a new statement review.");
  }

  const incomeSelections = new Map<string, MonoV2ImportSelection["recurringIncome"][number]>();
  for (const item of options.selection.recurringIncome) {
    if (incomeSelections.has(item.transactionId)) {
      throw new MonoV2PreviewError("A statement transaction was selected more than once.");
    }
    incomeSelections.set(item.transactionId, item);
  }
  const expenseIds = new Set(options.selection.eligibleExpenseIds);
  if (expenseIds.size !== options.selection.eligibleExpenseIds.length) {
    throw new MonoV2PreviewError("A statement transaction was selected more than once.");
  }
  const allowedMonths = new Set(preview.fullMonthOptions);
  const completeMonths = new Set(options.selection.completeMonths);
  if (completeMonths.size !== options.selection.completeMonths.length ||
      [...completeMonths].some((month) => !allowedMonths.has(month))) {
    throw new MonoV2PreviewError("Choose only full months available in this Mono statement.");
  }

  const transactionById = new Map(preview.transactions.map((item) => [item.id, item]));
  for (const [id] of incomeSelections) {
    if (transactionById.get(id)?.direction !== "credit") {
      throw new MonoV2PreviewError("Only statement credits can be marked as recurring income.");
    }
  }
  for (const id of expenseIds) {
    if (transactionById.get(id)?.direction !== "debit") {
      throw new MonoV2PreviewError("Only statement debits can be included as expenses.");
    }
  }

  const monthly = new Map<string, { income: number; expenses: number }>();
  const incomeByMonthCategory = new Map<string, {
    month: string;
    category: MonoIncomeCategory;
    variable: boolean;
    amount: number;
  }>();
  const audit = new Map<string, MonoV2AssessmentEvidence["conversionAudit"][number]>();
  const sourceCurrencies = new Set<SupportedCurrency>();
  if (options.selection.includeBalance && preview.balance) {
    sourceCurrencies.add(preview.balance.currencyCode);
  }
  const selectedTransactions = new Set([...incomeSelections.keys(), ...expenseIds]);
  for (const month of completeMonths) monthly.set(month, { income: 0, expenses: 0 });

  const addMoney = (transaction: MonoV2PreviewTransaction, key: "income" | "expenses") => {
    const month = transaction.date.slice(0, 7);
    const record = monthly.get(month) ?? { income: 0, expenses: 0 };
    const total = record[key] + transaction.amountGbpPence;
    if (!Number.isSafeInteger(total)) throw new MonoV2PreviewError("The imported monthly total exceeds supported precision.");
    record[key] = total;
    monthly.set(month, record);
  };

  for (const id of selectedTransactions) {
    const transaction = transactionById.get(id);
    if (!transaction) throw new MonoV2PreviewError("A selected transaction is no longer in this statement review.");
    sourceCurrencies.add(transaction.currencyCode);
    if (transaction.currencyCode !== "GBP" && transaction.rateDate &&
        transaction.usdNgnCentralRate && transaction.gbpNgnCentralRate) {
      const key = `${transaction.date}:${transaction.currencyCode}:${transaction.rateDate}`;
      audit.set(key, {
        source: CBN_SOURCE,
        valueDate: transaction.date,
        dateBasis: "transaction_date",
        rateDate: transaction.rateDate,
        currencyCode: transaction.currencyCode,
        usdNgnCentralRate: transaction.usdNgnCentralRate,
        gbpNgnCentralRate: transaction.gbpNgnCentralRate,
      });
    }

    const incomeSelection = incomeSelections.get(id);
    if (incomeSelection) {
      addMoney(transaction, "income");
      const month = transaction.date.slice(0, 7);
      const groupKey = `${month}:${incomeSelection.category}:${incomeSelection.variable}`;
      const group = incomeByMonthCategory.get(groupKey) ?? {
        month,
        category: incomeSelection.category,
        variable: incomeSelection.variable,
        amount: 0,
      };
      group.amount += transaction.amountGbpPence;
      if (!Number.isSafeInteger(group.amount)) throw new MonoV2PreviewError("The imported income total exceeds supported precision.");
      incomeByMonthCategory.set(groupKey, group);
    }
    if (expenseIds.has(id)) addMoney(transaction, "expenses");
  }

  const availableFunds = options.selection.includeBalance && preview.balance && preview.balance.amountGbpPence > 0
    ? [{
        id: randomUUID(),
        label: `Mono linked account ${options.linkedAccountId}`,
        deduplicationKey: `mono-linked-account-${options.linkedAccountId}`,
        amountPence: preview.balance.amountGbpPence,
        currencyCode: "GBP" as const,
        accessible: true,
      }]
    : [];

  if (options.selection.includeBalance && preview.balance?.currencyCode !== "GBP" &&
      preview.balance?.rateDate && preview.balance.usdNgnCentralRate && preview.balance.gbpNgnCentralRate) {
    const key = `balance:${preview.balance.asOfDate}:${preview.balance.currencyCode}:${preview.balance.rateDate}`;
    audit.set(key, {
      source: CBN_SOURCE,
      valueDate: preview.balance.asOfDate,
      dateBasis: "balance_snapshot_date",
      rateDate: preview.balance.rateDate,
      currencyCode: preview.balance.currencyCode as "USD" | "NGN",
      usdNgnCentralRate: preview.balance.usdNgnCentralRate,
      gbpNgnCentralRate: preview.balance.gbpNgnCentralRate,
    });
  }

  const cashFlowHistory = [...monthly.entries()].map(([month, values]) => ({
    id: randomUUID(),
    month,
    eligibleRecurringIncomePence: values.income,
    eligibleExpensesPence: values.expenses,
    complete: completeMonths.has(month),
  }));

  const selectedStatementDates = preview.transactions
    .filter((transaction) => selectedTransactions.has(transaction.id))
    .map((transaction) => transaction.date);
  const completeMonthEndDates = [...completeMonths].map((month) => {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  });
  const statementDataThroughDate = [...selectedStatementDates, ...completeMonthEndDates]
    .sort()
    .at(-1) ?? null;

  const evidence = monoV2AssessmentEvidenceSchema.parse({
    fxRateSource: CBN_SOURCE,
    fxRateDateBasis: "transaction_date",
    sourceCurrencies: sourceCurrencies.size ? [...sourceCurrencies] : ["GBP"],
    availableFunds,
    incomeHistory: [...incomeByMonthCategory.values()].map((item) => ({
      id: randomUUID(),
      month: item.month,
      sourceId: `mono-account-${options.linkedAccountId}-${item.category}-${item.variable ? "variable" : "stable"}`,
      category: item.category,
      amountPence: item.amount,
      recurring: true,
      variable: item.variable,
    })),
    cashFlowHistory,
    // Mono's account-detail payload in this flow does not provide a confirmed
    // balance snapshot date. The fetch timestamp is used as a confidence
    // fallback and surfaced for admin review instead of being called a source date.
    balanceAsOfDate: null,
    statementDataThroughDate,
    conversionAudit: [...audit.values()],
    statementPeriodMonths: preview.statementPeriodMonths,
    fetchedAt: preview.fetchedAt,
    consentVersion: "mono-v2-statement-assessment-v1",
    consentAcceptedAt: now.toISOString(),
  });
  previewCache.delete(options.selection.previewToken);
  return evidence;
}

export function clearMonoV2PreviewCacheForTests() {
  previewCache.clear();
}
