export type PassportDocumentFinancialFact = {
  id: string;
  month: string | null;
  label: string;
  incomeAmount: string;
  incomeFrequency: "monthly" | "";
  incomeCategory: "salary" | "contract" | "business" | "family_support" | "other";
  recurring: boolean;
  variable: boolean;
  savingsAmount: string;
  expensesAmount: string;
};

type CsvTransaction = {
  month: string;
  description: string;
  kind: "income" | "expense";
  amountCents: number;
  category: PassportDocumentFinancialFact["incomeCategory"];
  recurring: boolean;
};

const MONTH_NUMBERS: Record<string, string> = {
  jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
  apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07",
  july: "07", aug: "08", august: "08", sep: "09", sept: "09", september: "09",
  oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12",
};

function validMonth(year: string, month: string): string | null {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  return yearNumber >= 2000 && yearNumber <= 2100 && monthNumber >= 1 && monthNumber <= 12
    ? `${yearNumber}-${String(monthNumber).padStart(2, "0")}`
    : null;
}

export function detectDocumentMonth(text: string): string | null {
  for (const match of text.matchAll(/\b(20\d{2})[-/.](\d{1,2})(?:[-/.]\d{1,2})?\b/g)) {
    const month = validMonth(match[1], match[2]);
    if (month) return month;
  }
  for (const match of text.matchAll(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+[,.-]?\s*(20\d{2})\b/gi)) {
    const monthName = match[1].toLowerCase();
    const monthNumber = MONTH_NUMBERS[monthName] ?? MONTH_NUMBERS[monthName.slice(0, 3)];
    if (monthNumber) return `${match[2]}-${monthNumber}`;
  }
  for (const match of text.matchAll(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})\b/gi)) {
    const monthName = match[2].toLowerCase();
    const monthNumber = MONTH_NUMBERS[monthName] ?? MONTH_NUMBERS[monthName.slice(0, 3)];
    if (monthNumber) return `${match[3]}-${monthNumber}`;
  }
  return null;
}

function parseAmountCents(value: string): number | null {
  const normalized = value.replace(/[,\s£$€₦]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000_000) return null;
  return Math.round(amount * 100);
}

function formatCents(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}

function categoryFor(description: string): PassportDocumentFinancialFact["incomeCategory"] {
  const value = description.toLowerCase();
  if (/salary|payroll|wage|pay\s?cheque|paycheck/.test(value)) return "salary";
  if (/contract|freelance|invoice/.test(value)) return "contract";
  if (/business|merchant settlement/.test(value)) return "business";
  if (/family support|family transfer/.test(value)) return "family_support";
  return "other";
}

function isIgnoredTransfer(description: string): boolean {
  return /\b(internal transfer|own account transfer|refund|reversal|chargeback|balance transfer)\b/i.test(description);
}

function splitExtractedCsvRows(text: string): string[][] {
  return text.split(/\r?\n/).map((line) => line.split(/\s+\|\s+/).map((cell) => cell.trim()));
}

function findHeaderIndex(headers: string[], patterns: RegExp[]): number {
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
}

function parseTransactionMonth(value: string): string | null {
  const iso = value.match(/\b(20\d{2})[-/.](\d{1,2})(?:[-/.]\d{1,2})?\b/);
  if (iso) return validMonth(iso[1], iso[2]);
  const named = detectDocumentMonth(value);
  if (named) return named;
  const numeric = value.match(/\b(\d{1,2})[/. -](\d{1,2})[/. -](20\d{2})\b/);
  if (!numeric) return null;
  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  // Do not guess the month where both day-first and month-first interpretations fit.
  if (first <= 12 && second <= 12) return null;
  return validMonth(numeric[3], first > 12 ? String(second) : String(first));
}

function extractCsvFacts(text: string): PassportDocumentFinancialFact[] {
  const rows = splitExtractedCsvRows(text);
  const headerIndex = rows.findIndex((row) =>
    findHeaderIndex(row.map((value) => value.toLowerCase()), [/^date$/, /transaction date/, /posted date/]) >= 0 &&
    findHeaderIndex(row.map((value) => value.toLowerCase()), [/^amount$/, /transaction amount/, /^credit$/, /^debit$/]) >= 0,
  );
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((value) => value.toLowerCase());
  const dateIndex = findHeaderIndex(headers, [/^date$/, /transaction date/, /posted date/]);
  const descriptionIndex = findHeaderIndex(headers, [/description/, /details/, /narrative/, /payee/, /merchant/]);
  const amountIndex = findHeaderIndex(headers, [/^amount$/, /transaction amount/]);
  const creditIndex = findHeaderIndex(headers, [/^credit$/, /credit amount/, /deposit amount/]);
  const debitIndex = findHeaderIndex(headers, [/^debit$/, /debit amount/, /withdrawal amount/]);
  const typeIndex = findHeaderIndex(headers, [/^type$/, /transaction type/, /^category$/]);
  const buckets = new Map<string, CsvTransaction[]>();

  for (const row of rows.slice(headerIndex + 1)) {
    const month = parseTransactionMonth(row[dateIndex] ?? "");
    const description = [row[descriptionIndex] ?? "", row[typeIndex] ?? ""].join(" ").trim();
    if (!month || isIgnoredTransfer(description)) continue;
    const type = (row[typeIndex] ?? "").toLowerCase();
    const creditCents = creditIndex >= 0 ? parseAmountCents(row[creditIndex] ?? "") : null;
    const debitCents = debitIndex >= 0 ? parseAmountCents(row[debitIndex] ?? "") : null;
    const amountCents = amountIndex >= 0 ? parseAmountCents(row[amountIndex] ?? "") : null;
    const values: CsvTransaction[] = [];
    const category = categoryFor(description);
    if (creditCents !== null && creditCents > 0) {
      values.push({ month, description, kind: "income", amountCents: creditCents, category, recurring: category === "salary" });
    }
    if (debitCents !== null && debitCents > 0) {
      values.push({ month, description, kind: "expense", amountCents: debitCents, category, recurring: false });
    }
    if (creditCents === null && debitCents === null && amountCents !== null) {
      const isIncome = amountCents > 0 && (
        category !== "other" ||
        /\b(income|credit|deposit|inflow)\b/.test(type)
      );
      const isExpense = amountCents < 0 || /\b(expense|debit|withdrawal|outflow)\b/.test(type);
      if (isIncome) {
        values.push({ month, description, kind: "income", amountCents: Math.abs(amountCents), category, recurring: category === "salary" });
      } else if (isExpense) {
        values.push({ month, description, kind: "expense", amountCents: Math.abs(amountCents), category, recurring: false });
      }
    }
    for (const item of values) {
      const bucketKey = `${item.month}:${item.kind}:${item.category}`;
      const bucket = buckets.get(bucketKey) ?? [];
      bucket.push(item);
      buckets.set(bucketKey, bucket);
    }
  }

  return [...buckets.entries()].map(([key, items]) => {
    const [month, kind, category] = key.split(":");
    const cents = items.reduce((total, item) => total + item.amountCents, 0);
    const isIncome = kind === "income";
    const readableCategory = category === "salary" ? "salary" : category === "other" ? "other income" : category;
    const incomeFrequency: PassportDocumentFinancialFact["incomeFrequency"] = isIncome ? "monthly" : "";
    return {
      id: `csv:${key}`,
      month,
      label: isIncome ? `Statement ${readableCategory}` : "Statement expenses",
      incomeAmount: isIncome ? formatCents(cents) : "",
      incomeFrequency,
      incomeCategory: category as PassportDocumentFinancialFact["incomeCategory"],
      recurring: isIncome && items.every((item) => item.recurring),
      variable: false,
      savingsAmount: "",
      expensesAmount: isIncome ? "" : formatCents(cents),
    };
  }).slice(0, 72);
}

const MONEY = String.raw`(?:£|€|₦|\$|\b(?:GBP|USD|NGN|EUR|CAD|AUD)\b\s*)?\s*(-?\d[\d,]*(?:\.\d{1,2})?)`;

function labeledAmount(text: string, labels: string[]): string {
  const matches = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    for (const label of labels) {
      const match = line.match(new RegExp(`\\b${label}\\b[^\\n\\d]{0,20}${MONEY}`, "i"));
      const cents = match ? parseAmountCents(match[1]) : null;
      if (cents !== null && cents > 0) matches.add(formatCents(cents));
    }
  }
  return matches.size === 1 ? [...matches][0] : "";
}

export function extractPassportDocumentFinancialFacts(
  text: string,
  documentType: string,
  mimeType = "",
): PassportDocumentFinancialFact[] {
  if (!text.trim()) return [];
  if (mimeType === "text/csv") {
    return extractCsvFacts(text);
  }
  const month = detectDocumentMonth(text);
  const facts = {
    incomeAmount: documentType === "payslip" || documentType === "bank_statement"
      ? labeledAmount(text, ["net\\s+pay", "take[- ]?home\\s+pay", "salary\\s+credits?", "total\\s+salary\\s+credits"])
      : "",
    savingsAmount: documentType === "bank_statement" || documentType === "savings_statement"
      ? labeledAmount(text, ["closing\\s+balance", "ending\\s+balance", "available\\s+balance", "current\\s+balance"])
      : "",
    expensesAmount: documentType === "rent_receipt"
      ? labeledAmount(text, ["rent\\s+paid", "rent\\s+amount", "monthly\\s+rent"])
      : documentType === "commitment_statement"
        ? labeledAmount(text, ["monthly\\s+repayment", "monthly\\s+payment", "amount\\s+due"])
        : documentType === "bank_statement"
          ? labeledAmount(text, ["total\\s+debits", "total\\s+expenses", "total\\s+outgoing"])
          : "",
  };
  if (!facts.incomeAmount && !facts.savingsAmount && !facts.expensesAmount) return [];
  return [{
    id: `pdf:${documentType}:${month ?? "period-required"}`,
    month,
    label: documentType === "payslip" ? "Payslip details"
      : documentType === "rent_receipt" ? "Rent details"
        : documentType === "commitment_statement" ? "Commitment details"
          : "Statement details",
    incomeAmount: facts.incomeAmount,
    incomeFrequency: facts.incomeAmount ? "monthly" : "",
    incomeCategory: "salary",
    recurring: Boolean(facts.incomeAmount),
    variable: false,
    savingsAmount: facts.savingsAmount,
    expensesAmount: facts.expensesAmount,
  }];
}
