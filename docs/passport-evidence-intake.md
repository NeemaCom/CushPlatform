# Cush Passport financial profile and evidence intake

## Setup

1. If evidence intake has not been installed, apply `migrations/manual/create-cush-passport-evidence-intake.sql` to the Passport database.
2. Apply `migrations/manual/extend-cush-passport-multicurrency.sql` after the initial evidence migration. It adds a separate encrypted Post-Arrival financial profile and period tagging for evidence; it preserves existing Pre-Arrival data.
3. Generate a separate random 32-byte key for each environment, Base64-encode it, and save it as the private `PASSPORT_EVIDENCE_ENCRYPTION_KEY` secret. For example, generate locally with Node.js using `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"`. Do not put the generated value in source control or chat.
4. Restart the app after saving the secret.

If the key is missing or changes, the app fails closed for encrypted profile and document reads/writes. Back up the key securely; ciphertext cannot be recovered without it.

## Assessment behavior

- Users can enter financial details and monthly history in both Pre-Arrival and, after confirming arrival, Post-Arrival. Those profiles are stored separately and preserve original country, date, amount, and ISO 4217 currency code.
- The currency picker lists runtime-supported ISO currency codes. Manual values are never relabelled as GBP. GBP contributes directly to provisional V2 Score components; USD and NGN use the existing CBN central rate for the reported month. Other valid currencies are saved, shown to the user, and excluded from the GBP-based Score until a dated conversion rate and source are approved. A missing CBN rate for USD/NGN remains an explicit conversion failure.
- Self-declared data does not satisfy final-score evidence requirements. The 0–1000 scale, component weights, verified-data completion gates, and separate Confidence scale remain unchanged.
- Self-declared data does not satisfy final-score evidence requirements. The 0–1000 scale, component weights, verified-data completion gates, and separate Confidence scale remain unchanged.
- The scoring-policy editor's new draft configuration assigns 5 source-quality points to self-declared data. An authorized admin must save and activate that draft before the active policy awards those points.
- Plaid's existing post-arrival transaction review remains separate and is not persisted or used for Score by this feature. Interswitch remains the existing consented credit-history lookup.

## Document handling

Uploads are PDF/CSV only and limited to 5 MB in both periods. Each document keeps a user-confirmed country and currency. The parser detects explicit ISO codes and currency names in readable text and reports ambiguous symbols (for example, `$`) as candidate currencies; it never guesses. It does not extract transaction amounts or categorize financial activity. CSV parsing reads UTF-8 text; PDF extraction handles common text-based PDFs. Image-only/scanned PDFs may need a user-entered correction because OCR is not enabled. Files, extracted text, user corrections, and review notes are encrypted before database persistence. Extraction and Cush review classifications do not by themselves make content a V2 score input.

The admin queue requires `admin.documents.read` to view submissions and `admin.documents.review` to submit a review decision. Independently verified or institution-confirmed classifications require a recorded confirmation basis.

## Currency limitations

There is currently no approved conversion-rate source for currencies other than GBP, USD, and NGN. Do not add a market-rate API or silently use an estimated rate. To score additional currencies, first approve a provider, rate date, fallback policy, and audit requirements.
