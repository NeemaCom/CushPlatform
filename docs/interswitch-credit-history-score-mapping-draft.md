# Interswitch credit-history scoring rule

**Status: approved and implemented in code.** The mapping contributes a 0–100 credit-history component worth 15% of the 0–1000 Cush Score. Production use still depends on deploying the code and applying `migrations/manual/enable-interswitch-credit-history-scoring.sql` after `migrations/manual/create-interswitch-credit-history-evidence.sql`.

## Source response and privacy boundary

The selected Interswitch credit-history endpoint returns repayment records, not a numeric bureau score or a documented score range. The response also contains profile and identity fields that are not needed for this draft. The application should:

- Send the BVN only after separate, explicit consent to send it to Interswitch.
- Use the BVN only in the provider request; never store, log, or return it.
- Discard the raw provider response, including names, addresses, identifiers, institutions, balances, and dates.
- Store only aggregate counts of accounts, loan statuses, performance statuses, and repayment statuses, along with retrieval time, consent record, and mapping version.
- Keep only the latest normalized report per user. Never store the BVN or raw provider report.

## Candidate evidence interpretation

The normalized evidence records these categories without treating them as points:

- Loan status: open, closed, or other.
- Performance status: performing, non-performing, or other.
- Repayment schedule: settled, overdue, adverse, pending, or other.

Pending and unrecognized statuses are not evidence of missed payment. Empty or malformed history is not automatically a thin file or a negative result. A thin-file result should be assigned only if Interswitch documents or explicitly returns that outcome.

## Approved scoring approach

The credit-history component is 15% of the overall Cush Score and uses a 0–100 component scale. Resolved repayment schedule entries are the main evidence. Pending and unrecognized entries are excluded from the denominator. Provider performance status is a consistency check, not a second source of points.

The implemented formula assigns 1.0 to a settled installment, 0.5 to an overdue installment, and 0.0 to a confirmed missed/default installment. The component is the rounded average times 100 across resolved installments. If there are no resolved installments, the component stays unavailable. Thin-file maps to 50 only when Interswitch explicitly confirms that result; the current credit-history response does not supply a thin-file indicator. Conflicting evidence, including a non-performing account with no overdue/default schedule evidence, leaves the component unavailable.

Missing, ambiguous, or provider-error data leaves the component unavailable rather than counting against the user. The provider's exact status definitions and report coverage still need confirmation before enabling live checks.

## Production validation

1. Confirm status definitions and reporting coverage with Interswitch.
2. Test representative reports: settled, overdue, missed/default, explicitly confirmed thin-file, empty, duplicate, inconsistent, and malformed.
3. Review the result-correction/appeal path.
4. Confirm inquiry impact and charges with Interswitch before enabling production lookups.

## Runtime configuration

Configure these server-side values in Render. Keep credentials in Render secrets:

- `INTERSWITCH_CLIENT_ID`
- `INTERSWITCH_SECRET_KEY`
- `INTERSWITCH_CREDIT_HISTORY_AUTH_URL`
- `INTERSWITCH_CREDIT_HISTORY_URL`
- `INTERSWITCH_CREDIT_HISTORY_LIVE_ENABLED=true` only after live inquiry impact, charges, and production access are confirmed.

The mapping version stored with each normalized result is `interswitch-repayment-history-v1`. The overall score still requires an active Cush Score policy with destination baselines and confidence parameters, plus the existing four-month supported-evidence gates.

Sandbox URLs use `https://sandbox.interswitchng.com/marketplace-routing/api/v1/authentication/client` and `https://sandbox.interswitchng.com/marketplace-routing/api/v1/verify/identity/credit-history-lookup`. Production URLs use the same paths on `api-marketplace-routing.interswitchng.com`.
