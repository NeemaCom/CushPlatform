# Cush Passport

A mobile-first credit-passport prototype built with React, Vite, TypeScript, Express, PostgreSQL, Drizzle, and Firebase Authentication. Users can enter financial signals, receive a PPP-normalized score, and share a public passport link.

## Run locally

Requires Node.js 20+, npm, and a PostgreSQL database with the schema from `shared/schema.ts`.

1. Run `npm install`.
2. Provide `DATABASE_URL`, a unique random `SESSION_SECRET` (at least 32 characters), and `FIREBASE_PROJECT_ID` in the server process environment. See `.env.example`; the example file is not automatically loaded. For the bundled Firebase client project, the project ID is `cushportal`.
3. Set up the database schema with `npm run db:push` if necessary.
4. Run `npm run dev` and open `http://localhost:5000`.

The package lockfile is intentionally not checked in because the previous one contained environment-specific package registry URLs. To restore reproducible installs, generate and commit a lockfile using a standard public or company-managed npm registry outside this workspace.

## Scripts

- `npm run dev` — Express API with Vite development middleware.
- `npm run build` — compile browser assets and bundle the Express server.
- `npm run start` — run the built server with `NODE_ENV=production`.
- `npm run lint` — TypeScript static check.
- `npm test` — automated tests.

## Configuration

The browser calls same-origin `/api/...` by default. Set `VITE_API_URL` **at build time** only if the API is hosted at another origin; do not add `/api` to its value. Set `FRONTEND_ORIGIN` on the API to a comma-separated list of exact allowed frontend origins for credentialed cross-origin requests. Development also allows `http://localhost:3000` and `http://localhost:5000` (and their `127.0.0.1` equivalents).

Sessions default to `SameSite=Strict`; for a frontend and API on different *sites*, set `SESSION_COOKIE_SAME_SITE=none` and serve both over HTTPS. The Firebase popup flow has no server-side OAuth callback or redirect URI; configure the deployed frontend hostname as an authorized domain in Firebase Authentication. See `FIREBASE_AUTH_SETUP.md`.

For a single Node deployment, serve the built frontend and `/api` from the same process using `npm run build` then `npm run start`. See `DEPLOYMENT.md`. Static-only hosting will not run this API.

Passport and evidence data, as well as Express sessions, are still process-local; this prototype is not ready for multi-instance or restart-safe production data.