# Dependency audit

Updated November 14, 2026 after the Zod 4 migration.

## Current scanner results

- `npm audit`: 4 high, 13 moderate, 1 low, 0 critical (18 total).
- `npm audit --omit=dev`: the same counts. Several build/schema tools are still declared as production dependencies, so npm includes them in this report.
- The last Replit OSV dependency scan, run before this migration, reported one high Zod advisory and recommended `zod@4.6.6`. Zod is now `4.6.7`; rerun that scan to refresh its result.
- The earlier report of 0 high and 4 moderate is historical and no longer current.

## High findings

- **Zod** — upgraded from `3.25.76` to `4.6.7`, resolving the oversized-array advisory reported by npm. Zod 4 removes `ZodError.errors`; server responses now use `ZodError.issues`. The unused Zod 3-only `zod-validation-error` package was removed. The full test suite and production build pass.
- **Firebase client SDK** — `firebase@11.10.0` installs `@firebase/firestore@4.8.0`, which pins vulnerable `@grpc/grpc-js@~1.9.0` (resolved as `1.9.16`). npm's suggested `firebase@9.14.0` is a major downgrade and is not a safe automatic fix.

## Moderate and low findings

- **Firebase Admin** — `firebase-admin@13.10.0` and related Google Cloud packages are flagged; npm recommends `firebase-admin@14.5.1`. The [v14 release notes](https://github.com/firebase/firebase-admin-node/releases/tag/v14.0.0) require Node.js 22 or newer and remove deprecated namespace APIs. The server currently imports only modular Admin App/Auth APIs, but the Render runtime still needs confirmation before upgrading.
- **Tailwind Typography** — `@tailwindcss/typography@0.5.20` is flagged through `postcss-selector-parser`. npm suggests `0.5.4`, a downgrade that should not be applied blindly.
- **Drizzle Kit / esbuild** — `drizzle-kit@0.31.11` pulls in the deprecated `@esbuild-kit` loader and vulnerable `esbuild@0.18.20`. npm suggests downgrading Drizzle Kit to `0.18.1`, which would break the current CLI interface. The app's schema scripts use Drizzle Kit, but the server bundle does not.
- **fast-xml-parser** — one low-severity advisory has an available fix; no update was made.

## Reachability and remediation notes

- The Zod array schemas found in `server/` and `shared/` have explicit `.max()` limits. `server/index.ts` uses `express.json()` without a custom limit; Zod 4 now resolves the package advisory independently of those additional bounds.
- Firebase Firestore appears in the installed dependency tree, but the application imports only `firebase/app` and `firebase/auth`. The built browser bundle contains Firebase package/version metadata but no gRPC implementation. The upstream report says web apps use WebChannel rather than Node gRPC for Firestore.
- Current registry metadata for `firebase@13.3.0` still resolves to `@firebase/firestore@4.20.0`, which retains the `@grpc/grpc-js@~1.9.0` pin. The upstream [issue #10400](https://github.com/firebase/firebase-js-sdk/issues/10400) and [fix PR #10412](https://github.com/firebase/firebase-js-sdk/pull/10412) remain open. Upgrading the Firebase client SDK alone does not clear this finding. The official `@firebase/app` and `@firebase/auth` package READMEs say they are not intended for direct use, so replacing the supported `firebase` package with them is not recommended.
- Moving Drizzle Kit out of production dependencies may reduce the production-only audit results, but the lockfile contains many related development/optional dependency classifications. Do not hand-edit that graph; regenerate it through the approved package workflow.
- No forced downgrades or dependency overrides were used. The Zod major upgrade is complete. Keep the Firebase client finding open until the upstream Firestore dependency pin is fixed; consider the Firebase Admin upgrade separately after confirming the Render Node.js version is 22 or newer.

## Historical note

The September 6, 2026 review recorded earlier fixes to Drizzle ORM, Vite, PostCSS, Express-related packages, and several transitive dependencies. Its advisory counts were superseded by the current scans above.
