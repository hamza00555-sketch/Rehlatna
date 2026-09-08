# رحلتنا

An Arabic-first companion for the pregnancy → birth → postpartum journey.
Mobile-first web, true RTL, four destinations (اليوم · الرحلة · التجهيز ·
المزيد), a signature weekly Baby Hero, and a permission-protected financial
layer. Built as a template: no family, city, date or price is hardcoded.

## Run

```bash
npm install
npm run dev          # http://localhost:3000 → /onboarding
```

Try the demo households from the welcome screen, or create a real
household through onboarding (persisted to `.data/store.json`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Next.js (tokens regenerate before each) |
| `npm run tokens` | `src/design/tokens.ts` → `src/app/tokens.css` |
| `npm run typecheck` | strict TypeScript |
| `npm test` | Vitest: domain, permissions, privacy boundary, routes |
| `npm run screenshots` | Playwright walk of every route/state, light + dark → `screenshots/` |
| `npm run a11y` | axe-core walk over the same states → `screenshots/a11y.json` |
| `node scripts/supabase-smoke.mjs` | End-to-end check of the Supabase path against a running server (needs a password user) |

Both walkers expect a running server (`BASE_URL`, default
`http://localhost:3000`) and the preinstalled Chromium
(`PLAYWRIGHT_BROWSERS_PATH` or `CHROMIUM_PATH`).

## Backend: Supabase

Production identity and persistence run on Supabase:

- **Auth** — passwordless email: the user enters an email, receives a
  six-digit code, and is signed in (`/auth`, `api/auth/otp`, `api/auth/verify`).
  Sessions live in Supabase cookies refreshed by `src/middleware.ts`.
- **Database** — one JSONB snapshot per household in `public.households`;
  `public.household_members` maps auth users to households. Row-level
  security allows a household to be read or written only by its members and
  deleted only by its owner. Field-level privacy (finance) is still enforced
  at the app's serialisation boundary. Migrations: `supabase/migrations/`.
- **Local development without Supabase** — leave the two env vars unset and
  the app falls back to the JSON file store with the development cookie
  session (this is what tests and the screenshot walk use).

One-time dashboard step for codes instead of links: Authentication → Email
Templates → *Magic Link* → make the body include `{{ .Token }}`. The
built-in mailer is rate-limited (a few emails per hour); configure a custom
SMTP provider before real users.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase project URL (enables Supabase auth + storage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Supabase publishable key |
| `NEXT_PUBLIC_PRODUCT_NAME` | `رحلتنا` | Default product name (households can override) |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | `SAR` | Default currency code |
| `DATA_FILE` | `.data/store.json` | Development store location |
| `DESIGN_REF_KEY` | — | Read-only key for `scripts/fetch-reference.mjs` (never committed) |

## Structure

```
src/design/tokens.ts        single source of truth for the design system
src/app/tokens.css          generated CSS custom properties (light/dark aliases --t-*)
src/domain/                 types, permissions, dates, pregnancy, finance, journey (+ tests)
src/schemas/                Zod schemas at every API boundary
src/server/                 supabase client, store adapters (Supabase / file / memory), session, http helpers, serializers (privacy boundary), view models
src/middleware.ts           refreshes Supabase auth cookies
supabase/migrations/        database schema and row-level security
src/app/api/                route handlers — Zod-validated, permission-gated
src/app/(app)/              the four destinations and their sub-routes
src/app/(flow)/             full-screen flows (gender, name, birth)
src/components/             ui primitives, hero, shell, feature components
src/i18n/ar.ts              every string, with Arabic count agreement helpers
src/media/weekly.ts         weeks 5–40 manifest (no production media attached)
scripts/                    tokens, screenshots, a11y, design reference fetch
docs/                       brief, design system, plan, design notes, asset backlog, limitations
```

## Principles enforced in code

- Finance is filtered at serialisation for viewers without `finance:view`;
  it is never hidden with CSS. Preparation payloads cannot carry money.
- Birth is an explicit confirmation (وصل صغيرنا), never inferred from the
  due date. Pregnancy records survive it.
- Feeding preference is a family choice with no default.
- Follow-up city and delivery city are independent; travel planning appears
  only when they differ.
- Weekly media is `medicallyReviewed: false` until a reviewer signs off.

See `docs/limitations.md` for what is approximate or not yet built, and
`docs/asset-backlog.md` for the production media inventory.
