---
name: Cush Score policy
description: Product rules and scoring design supplied for Cush Score implementation.
---

# Cush Score policy

## Rules

- Each assessment covers one account holder only. Never use dependants, household size, household income, or household affordability adjustments.
- The prompt's component weights are available funds 35%, income strength 30%, cash-flow behaviour 20%, and credit history 15%.
- The score is 0–1000. Confidence is separate, 1–100 when an assessment exists; it describes evidence quality and completeness, not financial strength.
- Thin credit file maps to neutral 50. Other credit classifications require an approved mapping; no bureau connection or result may be fabricated.
- Initial destination baselines are configurable: £1,203/month outside London and £1,518/month in London. Keep destination, effective date, and configuration provenance with a calculation.
- The V2 input release accepts GBP only. The user identified GTBank's FX rates page (https://www.gtbank.com/personal-banking/fx-rates) as a source to evaluate for future conversion.
- Count only verified, accessible funds, avoid double counting, and exclude one-off income from recurring income. Family support may count as the applicant's own inflow when regular and supported.
- Do not present a full score before the four-month and evidence requirements are satisfied. Missing or unavailable data is not proof of poor financial behaviour.
- Plaid was available but not connected when this policy was recorded; no credit-bureau integration was available. Label integrations pending until actually connected and verified.

**Why:** The user supplied the scoring prompt and explicitly approved replacing the legacy 40/30/30 calculation with V2, showing incomplete status when required inputs are absent. The user chose GBP-only entry first and named GTBank as a future FX source.

**How to apply:** V2 is the active passport score. Preserve its incomplete/provisional gates; never fall back to 40/30/30 or fabricate missing funds, history, destination, bureau, or confidence-policy inputs. Do not convert non-GBP amounts until the GTBank source is verified and an explicit conversion policy is implemented.
