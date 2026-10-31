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
- Thin credit file maps to neutral 50. The user approved normalizing a documented Interswitch bureau-score range linearly to the 0–100 credit component; other report outcomes require an approved mapping.
- An Interswitch credit-history lookup is required for a complete Cush Score. BVN submission requires separate explicit consent to Interswitch; never persist the BVN or raw provider response. Keep only the latest normalized evidence counts.
- Initial destination baselines are configurable: £1,203/month outside London and £1,518/month in London. Keep destination, effective date, and configuration provenance with a calculation.
- V2 scoring is GBP-normalized. Reviewed Mono statement data may originate in GBP, USD, or NGN; use the user's approved CBN central rates by transaction date for USD/NGN conversion.
- Count only verified, accessible funds, avoid double counting, and exclude one-off income from recurring income. Family support may count as the applicant's own inflow when regular and supported.
- Do not present a full score before the four-month and evidence requirements are satisfied. Missing or unavailable data is not proof of poor financial behaviour.
- Mono statement data may feed V2 only after user review and consent. The user selected Interswitch's credit-history lookup and approved storing only normalized derived counts; the repayment scoring formula is still a review-only draft.

**Why:** The user supplied the scoring prompt and explicitly approved replacing the legacy 40/30/30 calculation with V2, showing incomplete status when required inputs are absent. The user approved CBN central rates with transaction-date conversion for USD/NGN Mono data, supplied the six-factor confidence rules, chose no family-support-only cap for now, and requires Interswitch credit history for completion. The user approved linear normalization only for a documented numeric bureau-score range; their actual Interswitch payload has repayment histories instead, so a separate rule remains unapproved. They approved separate BVN consent for Interswitch and minimal normalized-data retention. Freshness must reflect source refresh, not merely resaving a self-reported form.

**How to apply:** V2 is the active passport score. Keep confidence separate from the Cush Score; do not return or display a total until the bank/statement, four-month history, scoreable component, and supported credit-check gates pass. Use only user-reviewed Mono aggregates as bank evidence; retain the exact CBN rate values/date provenance, and do not score unreviewed credits or expenses. The Interswitch lookup is required to complete a score, but never submit a BVN without separate explicit consent for Interswitch. Do not store BVNs or raw reports; only the latest normalized evidence counts are approved for storage. Provider-supplied status alone earns no credit-component points. Keep the repayment rule inactive until reviewed; keep thin-file at neutral 50 only when provider semantics support it. Never award verified-source, credit-check, account-coverage, or freshness points from unsupported self-reported data. Never fall back to 40/30/30 or fabricate missing funds, history, destination, bureau, or confidence-policy inputs.
