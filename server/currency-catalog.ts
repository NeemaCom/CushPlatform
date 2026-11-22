type IntlCurrencySupport = typeof Intl & {
  supportedValuesOf?: (key: "currency") => string[];
};

const intlCurrencySupport = Intl as IntlCurrencySupport;
const currencyCodes = new Set(
  (intlCurrencySupport.supportedValuesOf?.("currency") ?? [])
    .filter((code) => /^[A-Z]{3}$/.test(code)),
);
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });

const SYMBOL_CANDIDATES: Record<string, string[]> = {
  "$": ["USD", "CAD", "AUD", "NZD", "SGD", "HKD", "BBD", "BMD", "BSD", "FJD", "GYD", "JMD", "KYD", "LRD", "NAD", "SBD", "SRD", "TTD", "XCD"],
  "£": ["GBP", "FKP", "GIP", "SHP"],
  "€": ["EUR"],
  "₦": ["NGN"],
  "₹": ["INR"],
  "¥": ["CNY", "JPY"],
  "₩": ["KRW"],
  "₱": ["PHP"],
  "₽": ["RUB"],
  "₺": ["TRY"],
  "₴": ["UAH"],
  "₫": ["VND"],
  "₭": ["LAK"],
  "₮": ["MNT"],
  "₨": ["INR", "PKR", "NPR", "LKR", "MUR", "SCR"],
};

export type CurrencyDetection = {
  detectedCurrencyCodes: string[];
  suggestedCurrencyCode: string | null;
  ambiguousSymbols: Array<{ symbol: string; candidates: string[] }>;
};

export function isIsoCurrencyCode(value: string): boolean {
  return currencyCodes.has(value.trim().toUpperCase());
}

export function listIsoCurrencies() {
  return [...currencyCodes]
    .map((code) => ({ code, name: currencyNames.of(code) ?? code }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function detectCurrenciesInText(text: string): CurrencyDetection {
  const found = new Set<string>();
  const normalized = text.normalize("NFKC");

  for (const code of currencyCodes) {
    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nearAmount = new RegExp(
      `(?:\\b${escapedCode}\\b[^\\n]{0,32}\\d|\\d[^\\n]{0,32}\\b${escapedCode}\\b)`,
    );
    const labeledCode = new RegExp(`\\bcurrency(?:[_ ]code)?\\s*[:=,]?\\s*${escapedCode}\\b`, "i");
    if (nearAmount.test(normalized) || labeledCode.test(normalized)) found.add(code);
  }

  const names = new Map<string, string[]>();
  for (const code of currencyCodes) {
    const name = currencyNames.of(code)?.toLocaleLowerCase("en");
    if (!name || name === code.toLowerCase()) continue;
    const codes = names.get(name) ?? [];
    codes.push(code);
    names.set(name, codes);
  }
  const lowerText = normalized.toLocaleLowerCase("en");
  for (const [name, codes] of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, "i").test(lowerText)) {
      for (const code of codes) found.add(code);
    }
  }

  const ambiguousSymbols: CurrencyDetection["ambiguousSymbols"] = [];
  for (const [symbol, candidates] of Object.entries(SYMBOL_CANDIDATES)) {
    if (!normalized.includes(symbol)) continue;
    const available = candidates.filter((code) => currencyCodes.has(code));
    if (available.length === 1) found.add(available[0]);
    else if (available.length > 1) {
      const explicitMatches = available.filter((code) => found.has(code));
      if (explicitMatches.length !== 1) ambiguousSymbols.push({ symbol, candidates: available });
    }
  }

  const detectedCurrencyCodes = [...found].sort();
  return {
    detectedCurrencyCodes,
    suggestedCurrencyCode: detectedCurrencyCodes.length === 1 ? detectedCurrencyCodes[0] : null,
    ambiguousSymbols,
  };
}
