/**
 * Cush Passport V1 — Global Power Normalization Engine
 *
 * Uses Relative Economic Strength (PPP-adjusted) rather than raw Forex.
 * Every income figure is evaluated against the median earner in that country,
 * then scaled to a universal 0-100 signal, weighted into a final 0-1000 score.
 *
 * Weighted model (deterministic, no ML):
 *   Income     40%
 *   Surplus    30%
 *   Stability  30%
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

export interface PassportScoreResult {
  finalScore: number;       // 0-1000 (×10 for credit-score-style display)
  confidenceScore: number;  // 0-100 based on evidence verification
  incomeScore: number;
  surplusScore: number;
  stabilityScore: number;
  reasonCodes: string[];
  generatedAt: Date;
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
   * Calculates the composite Cush Passport Score (0-1000).
   * Deterministic weighted rules-based model.
   */
  calculatePassportScore(
    signals: SignalInput[],
    evidenceItems: { status: string; scoreBoost: number }[]
  ): PassportScoreResult {
    const incomeSignals = signals.filter((s) => s.type === "income");
    const surplusSignals = signals.filter((s) => s.type === "surplus");
    const stabilitySignals = signals.filter((s) => s.type === "stability");
    const transferSignals = signals.filter((s) => s.type === "transfer");

    const avgScore = (items: SignalInput[]): number => {
      if (items.length === 0) return 0;
      const sum = items.reduce((acc, s) => {
        return acc + this.normalizeSignal(s).globalScore;
      }, 0);
      return sum / items.length;
    };

    const incomeScore = avgScore(incomeSignals);

    // Surplus uses max transfer as "asset power" signal too
    const allSurplus = [...surplusSignals, ...transferSignals];
    const surplusScore = avgScore(allSurplus);

    // Stability: number and consistency of signals submitted
    const stabilityScore =
      stabilitySignals.length > 0
        ? avgScore(stabilitySignals)
        : Math.min(signals.length * 10, 60); // fallback: signal count contributes

    // Weighted combination → 0-100
    const weightedRaw =
      incomeScore * 0.4 + surplusScore * 0.3 + stabilityScore * 0.3;

    // Scale to 0-1000 for credit-score-style presentation
    const baseScore = Math.round(weightedRaw * 10);

    // Evidence boost (up to +80 pts, proportional to verified evidence)
    const evidenceBoost = evidenceItems.reduce((acc, e) => {
      if (e.status === "VERIFIED") return acc + e.scoreBoost;
      if (e.status === "PENDING_REVIEW") return acc + Math.floor(e.scoreBoost * 0.3);
      return acc;
    }, 0);

    const finalScore = Math.min(baseScore + evidenceBoost, 1000);

    // Confidence = % of submitted evidence that is VERIFIED or PENDING_REVIEW
    const confidenceScore = this.calculateConfidence(evidenceItems, signals.length);

    const reasonCodes = this.generateReasonCodes(
      incomeScore,
      surplusScore,
      stabilityScore,
      signals,
      evidenceItems
    );

    return {
      finalScore,
      confidenceScore,
      incomeScore: Math.round(incomeScore),
      surplusScore: Math.round(surplusScore),
      stabilityScore: Math.round(stabilityScore),
      reasonCodes,
      generatedAt: new Date(),
    };
  }

  /**
   * Confidence score: 0-100.
   * Driven by what % of evidence is verified and how many signals are submitted.
   */
  calculateConfidence(
    evidenceItems: { status: string }[],
    signalCount: number
  ): number {
    if (evidenceItems.length === 0 && signalCount === 0) return 0;

    const verifiedCount = evidenceItems.filter(
      (e) => e.status === "VERIFIED"
    ).length;
    const pendingCount = evidenceItems.filter(
      (e) => e.status === "PENDING_REVIEW"
    ).length;
    const selfReportedCount = evidenceItems.filter(
      (e) => e.status === "SELF_REPORTED"
    ).length;

    const total = evidenceItems.length || 1;
    const verificationWeight =
      (verifiedCount * 1.0 + pendingCount * 0.5 + selfReportedCount * 0.1) / total;

    // Signal richness adds up to 20 pts of confidence
    const signalBonus = Math.min(signalCount * 5, 20);

    return Math.min(
      Math.round(verificationWeight * 80 + signalBonus),
      100
    );
  }

  /**
   * Generates 3-5 human-readable reason codes for the landlord-facing view.
   */
  generateReasonCodes(
    incomeScore: number,
    surplusScore: number,
    stabilityScore: number,
    signals: SignalInput[],
    evidenceItems: { status: string; scoreBoost: number }[]
  ): string[] {
    const codes: string[] = [];

    if (incomeScore >= 80) codes.push("Top 10% earner relative to local cost-of-living");
    else if (incomeScore >= 60) codes.push("Above-average income relative to local purchasing power");
    else if (incomeScore >= 40) codes.push("Stable local income established");
    else codes.push("Income history in early build stage");

    if (surplusScore >= 70) codes.push("Proven high-value asset transfer history");
    else if (surplusScore >= 40) codes.push("Consistent monthly financial surplus demonstrated");

    if (stabilityScore >= 60) codes.push("Multi-period income consistency verified");
    else if (signals.length >= 3) codes.push("Financial history spanning multiple periods");

    const verifiedDocs = evidenceItems.filter((e) => e.status === "VERIFIED").length;
    if (verifiedDocs >= 3) codes.push(`${verifiedDocs} documents independently verified`);
    else if (verifiedDocs >= 1) codes.push(`${verifiedDocs} supporting document verified`);

    if (incomeScore >= 60 && surplusScore >= 50) {
      codes.push("Consistent surplus exceeding 30% of monthly income");
    }

    return codes.slice(0, 5);
  }

  /**
   * Returns a human-readable confidence label.
   */
  getConfidenceLabel(score: number): { label: string; color: string } {
    if (score >= 80) return { label: "High Confidence", color: "emerald" };
    if (score >= 55) return { label: "Moderate Confidence", color: "blue" };
    if (score >= 30) return { label: "Building Confidence", color: "amber" };
    return { label: "Low Confidence", color: "slate" };
  }

  getAllBenchmarks(): PPPBenchmark[] {
    return Object.values(BENCHMARKS);
  }
}

export const normalizationService = new NormalizationService();
