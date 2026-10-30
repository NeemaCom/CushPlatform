---
name: Cush Score policy
description: Product rules and scoring design supplied for Cush Score implementation.
---

# Cush Score policy

## Rules

- Each assessment covers one account holder only. Never use dependants, household size, household income, or household affordability adjustments.
- The prompt's component weights are available funds 35%, income strength 30%, cash-flow behaviour 20%, and credit history 15%.
- The score is 0–1000. Confidence is separate, 1–100 when an assessment exists; it describes evidence quality and completeness, not financial strength.
- Confidence rules: history earns 5/month up to 6 months (30); source quality is bank connection 25 or verified statement 15 weighted by data share; credit check is matched 15, thin 10, no match 5, not done 0; freshness is 10/6/3 within 7/30/90 days; account coverage is up to 10 reduced by unresolved-transfer share; income source is UK payslip/credits 10, steady employer 8, variable 5, UK offer 4, family support only 3. Each confirmed integrity flag deducts 5; floor at 1. Bands are 1–39 Low, 40–69 Medium, 70–100 High.
- Do not cap confidence at 80 for family-support-only income unless the user changes this decision.
- Thin credit file maps to neutral 50. Other credit classifications require an approved mapping; no bureau connection or result may be fabricated.
- Initial destination baselines are configurable: £1,203/month outside London and £1,518/month in London. Keep destination, effective date, and configuration provenance with a calculation.
- The V2 input release accepts GBP only. The user identified GTBank's FX rates page (https://www.gtbank.com/personal-banking/fx-rates) as a source to evaluate for future conversion.
- Count only verified, accessible funds, avoid double counting, and exclude one-off income from recurring income. Family support may count as the applicant's own inflow when regular and supported.
- Do not present a full score before the four-month and evidence requirements are satisfied. Missing or unavailable data is not proof of poor financial behaviour.
- The user says account data is called up and Credit Link is connected. Do not assume those connections are unavailable; verify whether their returned data is consumed by the V2 scoring path.

**Why:** The user supplied the scoring prompt and explicitly approved replacing the legacy 40/30/30 calculation with V2, showing incomplete status when required inputs are absent. The user chose GBP-only entry first, named GTBank as a future FX source, supplied the six-factor confidence rules, chose no family-support-only cap for now, and confirmed accounts are called up with Credit Link connected. Freshness must reflect source refresh, not merely resaving a self-reported form.

**How to apply:** V2 is the active passport score. Keep confidence separate from the Cush Score; do not return or display a total until the bank/statement, four-month history, scoreable component, and supported credit-check gates pass. Before labeling values self-reported, verify whether the connected-account and Credit Link results are available to the V2 calculation path. Never award verified-source, credit-check, account-coverage, or freshness points from unsupported self-reported data. Never fall back to 40/30/30 or fabricate missing funds, history, destination, bureau, or confidence-policy inputs. Do not convert non-GBP amounts until the GTBank source is verified and an explicit conversion policy is implemented.
