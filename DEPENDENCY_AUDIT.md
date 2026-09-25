# Dependency audit

Historical review from September 6, 2026 with `npm audit` after a clean `npm ci --ignore-scripts`. This is not a current audit: the environment-specific lockfile was subsequently removed for portability. Regenerate a portable lockfile and rerun `npm audit` before release.

## Result

- Baseline: 33 advisories, including 17 high-severity advisories.
- Current: 4 moderate advisories, 0 high, 0 critical.
- The application build completes with the existing `npm run build` script.

## Applied fixes

- Updated Drizzle ORM to `0.45.2`, the patched release for the SQL-identifier injection advisory.
- Updated Drizzle Kit to `0.31.10` and kept the existing `drizzle-kit push` interface.
- Updated Vite to `6.4.3`, PostCSS to `8.5.28`, ws to the patched `8.21.x` line, and http-proxy-middleware to `3.0.7`.
- Updated express-session and allowed the lockfile to resolve the patched Express 4.22.2, body-parser, and route-parser dependencies.
- Updated `@google/genai` to the current 1.x line, which removes the vulnerable gaxios 6 / uuid 9 chain.
- Added a `qs` override at `6.16.0`, which is API-compatible with the Express 4 request parser and removes the remaining qs/body-parser advisories.
- Updated `@tailwindcss/vite` to `4.3.3`, replacing an older optional native bundle.
- Safe transitive updates resolved the original high-severity advisories in brace-expansion, browserslist, glob, jws, lodash, minimatch, path-to-regexp, picomatch, and Rollup.

## Accepted remaining advisories

The remaining four moderate advisories are the same deprecated `@esbuild-kit` loader chain:

- `drizzle-kit@0.31.10` depends on `@esbuild-kit/esm-loader`, which brings its own `esbuild@0.18.20`.
- npm's suggested fix is a forced downgrade to `drizzle-kit@0.18.1`, which is a breaking downgrade and would move the project away from the current Drizzle Kit interface.
- This chain is used by the development-only schema CLI, not the production server bundle. It is accepted until Drizzle Kit removes the deprecated loader dependency or provides a compatible patched release.