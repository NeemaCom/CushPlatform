# Cush Passport financial profile and evidence intake

## Setup

1. Apply `migrations/manual/create-cush-passport-evidence-intake.sql` to the Passport database.
2. Generate a separate random 32-byte key for each environment, Base64-encode it, and save it as the private `PASSPORT_EVIDENCE_ENCRYPTION_KEY` secret. For example, generate locally with Node.js using `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"`. Do not put the generated value in source control or chat.
3. Restart the app after saving the secret.

If the key is missing or changes, the app fails closed for encrypted profile and document reads/writes. Back up the key securely; ciphertext cannot be recovered without it.

## Assessment behavior

- Users can enter current financial details and monthly history across countries, alongside connected sources.
- GBP, USD, and NGN self-declared amounts can contribute to provisional V2 Score components as `self_reported`. USD and NGN are converted to GBP pence using the CBN central rate for the reported month; if a recent rate is unavailable, the assessment reports that conversion failed rather than substituting a value.
- Self-declared data does not satisfy final-score evidence requirements. The 0–1000 scale, component weights, verified-data completion gates, and separate Confidence scale remain unchanged.
- The scoring-policy editor's new draft configuration assigns 5 source-quality points to self-declared data. An authorized admin must save and activate that draft before the active policy awards those points.
- Plaid's existing post-arrival transaction review remains separate and is not persisted or used for Score by this feature. Interswitch remains the existing consented credit-history lookup.

## Document handling

Uploads are PDF/CSV only and limited to 5 MB. Files, extracted text, user corrections, and review notes are encrypted before database persistence. CSV parsing reads UTF-8 text; PDF extraction handles common text-based PDFs. Image-only/scanned PDFs may need a user-entered correction. Extraction and Cush review classifications do not by themselves make content a V2 score input.

The admin queue requires `admin.documents.read` to view submissions and `admin.documents.review` to submit a review decision. Independently verified or institution-confirmed classifications require a recorded confirmation basis.
