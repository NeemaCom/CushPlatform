# Dependency audit

Updated November 14, 2026. No package versions or application code were changed during this review.

## Current scanner results

- `npm audit`: 6 high, 13 moderate, 1 low, 0 critical (20 total).
- `npm audit --omit=dev`: the same counts. Several build/schema tools are still declared as production dependencies, so npm includes them in this report.
- Replit's OSV dependency scan: 1 high, 0 moderate/low/critical. It identifies the Zod advisory in `package-lock.json` and recommends a fix at `zod@4.6.6`.
- The scanners agree on the Zod issue but report different totals. The earlier report of 0 high and 4 moderate is historical and no longer current.

## High findings

- **Zod** — installed `zod@3.25.76` is flagged for memory exhaustion when validating oversized arrays. npm suggests `4.6.7`; Replit's OSV scan lists `4.6.6`. Both require a major-version upgrade. The app uses Zod across server and shared schemas, so this needs a compatibility migration rather than a forced update.
- **Firebase client SDK** — `firebase@11.10.0` brings in Firestore and `@grpc/grpc-js@1.9.16`, which npm flags. Source imports use Firebase App and Auth; no Firestore imports were found. npm's suggested `firebase@9.14.0` is a major downgrade, so it is not a safe automatic fix.
- **`zod-validation-error`** — npm reports the Zod advisory through installed `zod-validation-error@3.5.4` and suggests version 5.0.0, a major change. No source imports of this package were found; review whether it can be removed during a proper lockfile update.

## Moderate and low findings

- **Firebase Admin** — `firebase-admin@13.10.0` and related Google Cloud packages are flagged; npm suggests `firebase-admin@14.5.1`, a major upgrade.
- **Tailwind Typography** — `@tailwindcss/typography@0.5.20` is flagged through `postcss-selector-parser`. npm suggests `0.5.4`, a downgrade that should not be applied blindly.
- **Drizzle Kit / esbuild** — `drizzle-kit@0.31.11` pulls in the deprecated `@esbuild-kit` loader and vulnerable `esbuild@0.18.20`. npm suggests downgrading Drizzle Kit to `0.18.1`, which would break the current CLI interface. The app's schema scripts use Drizzle Kit, but the server bundle does not.
- **fast-xml-parser** — one low-severity advisory has an available fix; no update was made.

## Reachability and remediation notes

- The current Zod array schemas found in `server/` and `shared/` have explicit `.max()` limits. `server/index.ts` uses `express.json()` without a custom limit. These constraints reduce exposure to the specific oversized-array scenario but do not remove the package advisory.
- Firebase Firestore appears in the installed dependency tree, but the application source does not import it. The npm result is based on installed packages, not proof that the flagged Firestore code is reachable in the built app.
- Moving Drizzle Kit out of production dependencies may reduce the production-only audit results, but the lockfile contains many related development/optional dependency classifications. Do not hand-edit that graph; regenerate it through the approved package workflow.
- No major dependency upgrades, forced downgrades, overrides, or lockfile edits were made. The high findings remain open pending a safe migration plan.

## Historical note

The September 6, 2026 review recorded earlier fixes to Drizzle ORM, Vite, PostCSS, Express-related packages, and several transitive dependencies. Its advisory counts were superseded by the current scans above.
