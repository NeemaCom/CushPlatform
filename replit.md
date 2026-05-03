# Cush Passport V1 — Credit Identity Engine

## Project Overview
Cush Passport is a lean, focused Credit Identity engine. Users build a PPP-normalized credit score (0–1000) from their global income, surplus, and financial stability signals. The passport is shareable with landlords and lenders via a public token link. No Super App features remain.

## Architecture
- **Frontend**: React 18 + Vite, TypeScript, wouter, TanStack Query v5, shadcn/ui, Tailwind CSS, framer-motion v11
- **Backend**: Express.js + TypeScript (9 files, ~2,000 lines total)
- **Database**: PostgreSQL via Drizzle ORM (4 tables only)
- **Auth**: Firebase Authentication (Google OAuth + email/password) → backend session sync
- **Data**: All passport data stored in-memory via `server/mem-store.ts` (DB unavailable / Neon stale)

## Database Schema (4 tables only)
1. `users` — core auth fields + profile (no Stripe, no MFA backup codes)
2. `passports` — score, confidence, mode (pre/post arrival), shareToken, scoreBreakdown
3. `financial_signals` — income/surplus/transfer/stability signals, PPP-normalized
4. `evidence_vault` — uploaded documents with tier and scoreBoost

## Server Files (9 files)
| File | Purpose |
|------|---------|
| `server/index.ts` | Express app bootstrap |
| `server/routes.ts` | Health checks + auth routes only (321 lines) |
| `server/passport-routes.ts` | All `/api/passport/*` routes |
| `server/auth.ts` | Auth middleware (`isAuthenticated`, `requireAdmin`) |
| `server/storage.ts` | User CRUD only — no legacy tables (87 lines) |
| `server/mem-store.ts` | In-memory passport/user store (DB fallback) |
| `server/normalization-service.ts` | PPP scoring engine (Income 40% / Surplus 30% / Stability 30%) |
| `server/security.ts` | Rate limiting, encryption, audit logging |
| `server/db.ts` | Drizzle + Neon DB connection |

## Frontend Pages (7 pages)
| Route | Page | Auth |
|-------|------|------|
| `/` | `Home.tsx` | Public (redirects to `/dashboard` if authed) |
| `/login` | `Login.tsx` | Public |
| `/dashboard` | `CreditPassport.tsx` | Auth-gated |
| `/passport` | `CreditPassport.tsx` | Auth-gated |
| `/passport/:token` | `PublicPassport.tsx` | Public (landlord view) |
| `/sample` | `SamplePassport.tsx` | Public (demo) |
| `/privacy-policy` | `PrivacyPolicy.tsx` | Public |
| `/terms-of-service` | `TermsOfService.tsx` | Public |

## Key V1 Features
1. **PPP-Normalized Scoring** — 0–1000 score across Income (40%), Surplus (30%), Stability (30%)
2. **Dual Mode** — Pre-Arrival (diaspora) and Post-Arrival (settled) with different signal sets
3. **Evidence Vault** — Tier 1 (manual entry) and Tier 2 (document upload) evidence
4. **Gamified Checklist** — Progress checklist with floating `+N pts` indicators and confetti
5. **Public Passport Page** — Shareable token link for landlords/lenders
6. **Animated Score Ring** — framer-motion count-up, SVG ring, tier-change confetti burst

## Auth Flow
1. Firebase email/password or Google OAuth in `Login.tsx`
2. POST `/api/auth/firebase-sync` → creates/updates backend user, establishes session
3. Session cookie → `isAuthenticated` middleware → `req.userId`
4. Fallback: mem-store users when DB unavailable

## Removed in V1 Purge (Audit & Decommission)
- **50 legacy DB tables** (loans, wallets, remittance, community, jobs, achievements, Railsr, Stripe, admin, support, etc.)
- **28 legacy server files** (loan-service, wallet-service, remittance-service, gemini-service, notification-service, admin-service, support-service, railsr-service, cymonz-service, ai-analytics-service, mood-analyzer, financial-health-analyzer, avatarService, email-service, seed-data, etc.)
- **15 legacy frontend files** (Dashboard, Loans, Pay, RailsrPay, Jobs, Achievements, Settings pages + imisi-chat, sidebar, balance-chart, AchievementBadge, AchievementWidget, FinancialGoalsWidget, transaction-list components)
- **16 npm packages** (stripe, @stripe/*, @sendgrid/mail, passport, passport-local, passport-google-oauth20, openid-client, chart.js, chartjs-adapter-date-fns, recharts, connect-pg-simple, @types/passport*)
- **routes.ts**: reduced from 6,625 lines to 321 lines
- **schema.ts**: reduced from 2,116 lines to 201 lines

## Scoring Algorithm
```
PPP Factor = World Bank PPP index for country (e.g. Nigeria: 0.32, UK: 1.0)
Normalized = rawAmountCents × pppFactor / 100

Income Score  (0–400): sum of normalized income signals, capped at tier thresholds
Surplus Score (0–300): sum of normalized surplus/transfer signals
Stability Score (0–300): signal count × consistency bonus

Total Score = Income + Surplus + Stability (0–1000)
Confidence  = evidence count × 10, capped at 100
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection (Replit built-in Neon)
- `SESSION_SECRET` — Express session secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — legacy OAuth (not used, Firebase handles auth)
- Firebase config is hardcoded in `src/firebase.ts` (public project: `cushportal`)

## User Preferences
- Zero ghost code — no dead imports, no unused files
- Lean file count — every file earns its place
- TypeScript strict throughout
- Mobile-first, framer-motion animations
- Color palette: Base `#0f172a`, Action `#2563eb`, Success `#10b981`
