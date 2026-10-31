# Interswitch credit-history mapping — draft for review

**Status: not active.** Provider data is retained as normalized evidence, but it does not currently add points to the Cush Score. The live V2 credit component remains unavailable and the assessment remains incomplete until a scoring rule is approved and implemented.

## Source response and privacy boundary

The selected Interswitch credit-history endpoint returns repayment records, not a numeric bureau score or a documented score range. The response also contains profile and identity fields that are not needed for this draft. The application should:

- Send the BVN only after separate, explicit consent to send it to Interswitch.
- Use the BVN only in the provider request; never store, log, or return it.
- Discard the raw provider response, including names, addresses, identifiers, institutions, balances, and dates.
- Store only aggregate counts of accounts, loan statuses, performance statuses, and repayment statuses, along with retrieval time, consent record, and mapping status.
- Keep lookup evidence separate from the score until a policy is approved.

## Candidate evidence interpretation

The normalized evidence records these categories without treating them as points:

- Loan status: open, closed, or other.
- Performance status: performing, non-performing, or other.
- Repayment schedule: settled, overdue, adverse, pending, or other.

Pending and unrecognized statuses are not evidence of missed payment. Empty or malformed history is not automatically a thin file or a negative result. A thin-file result should be assigned only if Interswitch documents or explicitly returns that outcome.

## Proposed scoring approach for approval

The credit-history component is 15% of the overall Cush Score and uses a 0–100 component scale. A repayment-based rule could use resolved repayment schedule entries as its main evidence, with pending and unknown entries excluded from the denominator. Provider performance status may be used as a consistency check, not counted a second time. An explicitly documented thin-file result would retain the already-approved neutral component value of 50.

**Candidate formula, not active:** assign 1.0 to a settled installment, 0.5 to an overdue installment, and 0.0 to a confirmed missed/default installment. The component would be the rounded average times 100 across resolved installments. Pending and other statuses are excluded. If there are no resolved installments, leave the component unavailable unless Interswitch explicitly confirms a thin-file outcome; that outcome maps to the already-approved neutral 50. Provider performance status is used as a consistency check only. Conflicting or ambiguous evidence leaves the component unavailable for review.

This formula is a proposal, not an approved scoring policy. The supplied sample does not establish the provider meanings for every status, reporting period, coverage, or whether the records are complete. Missing, ambiguous, or provider-error data must leave the component unavailable rather than count against the user.

## Validation required before activation

1. Confirm status definitions and the period covered with Interswitch.
2. Confirm that the status categories and the proposed 1.0 / 0.5 / 0.0 values are appropriate.
3. Test representative reports: current/paid, overdue, missed/default, thin-file, empty, duplicate, and malformed.
4. Review the proposed outcomes, including appeal/correction handling.
5. Version the approved policy and retain the policy version with the derived evidence used in each score.
6. Confirm inquiry impact and charges with Interswitch before enabling production lookups.

## Runtime configuration

Configure these server-side values in Render. Keep credentials in Render secrets:

- `INTERSWITCH_CLIENT_ID`
- `INTERSWITCH_SECRET_KEY`
- `INTERSWITCH_CREDIT_HISTORY_AUTH_URL`
- `INTERSWITCH_CREDIT_HISTORY_URL`
- `INTERSWITCH_CREDIT_HISTORY_LIVE_ENABLED=true` only after live inquiry impact, charges, and production access are confirmed.

Sandbox URLs use `https://sandbox.interswitchng.com/marketplace-routing/api/v1/authentication/client` and `https://sandbox.interswitchng.com/marketplace-routing/api/v1/verify/identity/credit-history-lookup`. Production URLs use the same paths on `api-marketplace-routing.interswitchng.com`.
