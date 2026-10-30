/**
 * Legacy signal normalization helpers retained for existing signal records.
 * V2 composite scores are calculated by cush-score-service.
 */

export interface PPPBenchmark {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  medianMonthlyIncomeCents: number; // In local currency minor units
  pppMultiplier: number;
}

export interface SignalInput {
  type: "income" | "surplus" | "transfer" | "stability";
  rawAmountCents: number;
  currencyCode: string;
  country: string;
  period: "monthly" | "annual";
}

export interface NormalizationResult {
  localStrength: number;   // UserIncome / CountryMedianIncome
  globalScore: number;     // Capped 0-100
  normalizedValue: number; // The globalScore stored as decimal
  benchmark: PPPBenchmark | null;
}

// ─── PPP Benchmarks (2026 reference) ─────────────────────────────────────────
const BENCHMARKS: Record<string, PPPBenchmark> = {
  NG: {
    countryCode: "NG",
    countryName: "Nigeria",
    currencyCode: "NGN",
    medianMonthlyIncomeCents: 10000000, // ₦100,000 in kobo
    pppMultiplier: 4.5,
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    currencyCode: "GBP",
    medianMonthlyIncomeCents: 235000, // £2,350 in pence
    pppMultiplier: 1.0,
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    currencyCode: "USD",
    medianMonthlyIncomeCents: 480000, // $4,800 in cents
    pppMultiplier: 1.1,
  },
  CA: {
    countryCode: "CA",
    countryName: "Canada",
    currencyCode: "CAD",
    medianMonthlyIncomeCents: 430000, // CAD 4,300 in cents
    pppMultiplier: 1.0,
  },
  AU: {
    countryCode: "AU",
    countryName: "Australia",
    currencyCode: "AUD",
    medianMonthlyIncomeCents: 520000, // AUD 5,200 in cents
    pppMultiplier: 0.95,
  },
  GH: {
    countryCode: "GH",
    countryName: "Ghana",
    currencyCode: "GHS",
    medianMonthlyIncomeCents: 200000, // GHS 2,000 in pesewas
    pppMultiplier: 3.8,
  },
  KE: {
    countryCode: "KE",
    countryName: "Kenya",
    currencyCode: "KES",
    medianMonthlyIncomeCents: 4000000, // KES 40,000 in cents
    pppMultiplier: 4.0,
  },
  ZA: {
    countryCode: "ZA",
    countryName: "South Africa",
    currencyCode: "ZAR",
    medianMonthlyIncomeCents: 2500000, // ZAR 25,000 in cents
    pppMultiplier: 2.8,
  },
  IN: {
    countryCode: "IN",
    countryName: "India",
    currencyCode: "INR",
    medianMonthlyIncomeCents: 2500000, // INR 25,000 in paise
    pppMultiplier: 3.5,
  },
  DE: {
    countryCode: "DE",
    countryName: "Germany",
    currencyCode: "EUR",
    medianMonthlyIncomeCents: 280000, // €2,800 in cents
    pppMultiplier: 1.0,
  },
};

export class NormalizationService {
  getBenchmark(country: string): PPPBenchmark | null {
    return BENCHMARKS[country.toUpperCase()] ?? null;
  }

  /**
   * Normalizes a raw income amount to a 0-100 global score.
   * Formula: GlobalScore = (UserIncome / CountryMedian) × PPP_Multiplier × 20
   * Capped at 100.
   */
  normalizeSignal(input: SignalInput): NormalizationResult {
    const benchmark = this.getBenchmark(input.country);

    if (!benchmark) {
      return {
        localStrength: 0,
        globalScore: 0,
        normalizedValue: 0,
        benchmark: null,
      };
    }

    // Annualize if monthly for consistent comparison
    const monthlyAmountCents =
      input.period === "annual"
        ? Math.round(input.rawAmountCents / 12)
        : input.rawAmountCents;

    const localStrength = monthlyAmountCents / benchmark.medianMonthlyIncomeCents;
    const rawGlobalScore = localStrength * benchmark.pppMultiplier * 20;
    const globalScore = Math.min(Math.round(rawGlobalScore * 100) / 100, 100);

    return {
      localStrength: Math.round(localStrength * 1000) / 1000,
      globalScore,
      normalizedValue: globalScore,
      benchmark,
    };
  }

  /**
   * Returns a human-readable confidence label.
   */
  getConfidenceLabel(score: number): { label: string; color: string } {
    if (score >= 70) return { label: "High", color: "emerald" };
    if (score >= 40) return { label: "Moderate", color: "amber" };
    return { label: "Low", color: "slate" };
  }

  getAllBenchmarks(): PPPBenchmark[] {
    return Object.values(BENCHMARKS);
  }
}

export const normalizationService = new NormalizationService();
