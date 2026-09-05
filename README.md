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

Both walkers expect a running server (`BASE_URL`, default
`http://localhost:3000`) and the preinstalled Chromium
(`PLAYWRIGHT_BROWSERS_PATH` or `CHROMIUM_PATH`).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
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
src/server/                 store adapter, session, http helpers, serializers (privacy boundary), view models
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
