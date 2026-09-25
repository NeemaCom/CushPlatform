# Node deployment

Run the React frontend and Express API together on any Node.js 20+ host:

1. Install pinned dependencies with `npm ci`.
2. Set `DATABASE_URL`, `FIREBASE_PROJECT_ID`, and a unique random `SESSION_SECRET` (at least 32 characters) in the host's private environment settings. Set `PORT` and `HOST` if the host requires them.
3. Apply the database schema with `npm run db:push` when appropriate.
4. Run `npm run lint`, `npm test`, and `npm run build`.
5. Start the process with `npm run start`, which serves both `/api/*` and the built single-page app on the configured port (default 5000).

For a separate Vercel frontend and Node API, `vercel.json` runs `vite build`, publishes `dist`, and rewrites SPA paths to `index.html`. Set `VITE_API_URL` on Vercel to the API origin *before building* the frontend and set `FRONTEND_ORIGIN` on the API to the exact Vercel frontend origin (comma-separated if there are several). Credentialed CORS never uses `*`. Production sessions always use `SameSite=None; Secure`, so serve the API over HTTPS. Configure the frontend hostname in Firebase Authentication's authorized domains. There is no active backend OAuth callback endpoint.

This build requires a reachable PostgreSQL database and a matching schema. Passport/evidence records and sessions currently use process-local memory; they will not survive restarts or work across multiple instances. Do not treat a successful build as proof of durable production behavior.