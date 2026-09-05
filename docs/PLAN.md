# Implementation plan (Phase 0 output)

Status of the audit performed before any code was written. Sources of
truth: `docs/product-brief.md` (behaviour) and `docs/design-system.md`
(visual execution).

## 1. Product understanding

An assistant, not a dashboard. The promise: *"I open the app to see my
baby, and I leave knowing where we are, what we need to do, and what comes
next."* Three pillars — a living **Baby Hero** (silent weekly loops, weeks
5–40, one visual universe), a **continuous journey** from pregnancy through
birth, the forty days and the first three months, and **calm planning**
(preparation, appointments, care providers, cross-city travel, a
permission-protected financial layer). A template for any family: zero
hardcoded people, cities, dates or prices. Exactly four destinations.

## 2. Detected repository stack

The repository was empty (no commits, no files). No stack to preserve; the
architecture below is proposed as the smallest production-suitable option.

## 3. Design-system file

`docs/design-system.md` — fully parsed: 32 semantic colours (light + dark),
two font families (IBM Plex Sans Arabic for UI, Inter for numerals), 8
sizes, 3 weights, 3 line-heights, 2 letter-spacings, 7 spacing steps, 5
radii, 4 shadows, 4 borders, 27 components with variant/state CSS, ~55
Must/Should rules, and a read-only screen API exposing 40 composition
references. The committed copy has the API key redacted; set
`DESIGN_REF_KEY` locally to use `scripts/fetch-reference.mjs`.

## 4. Assets

**Present:** none. Reference screens are composition references only.

**Missing:** 36 weekly media sets (video + poster, medical review
required); onboarding/story hero imagery; preparation studio photography;
a custom icon set (20/24 px optical, ≈1.6 px stroke, softened-square
geometry — unmodified Lucide may not ship).

**Approach:** full media architecture + neutral placeholders + explicit
asset backlog (`docs/asset-backlog.md`). Development placeholders may be
generated later, always `medicallyReviewed: false`.

## 5. Architecture

| Layer | Decision |
| --- | --- |
| Framework | Next.js 15 App Router, React 19, TypeScript strict. Mobile-first web, true RTL. |
| Styling | No UI kit. `src/design/tokens.ts` is the single source of truth; `scripts/generate-tokens.mjs` emits `src/app/tokens.css`. CSS Modules reference tokens only. Fonts self-hosted via fontsource. |
| Data | Domain types → Zod schemas at API boundaries → permission-filtered serializers → view models. Storage behind an adapter (`src/server/store`), JSON file for development, swappable for Postgres/Supabase. |
| Privacy | `FundingGoal` is a separate entity linked by `preparationItemId`; preparation payloads structurally cannot carry prices. Serializers require a `Viewer` and strip finance for anyone without `finance:view`. |
| Identity | Cookie session naming the active household member. Real authentication is a documented swap point (`src/server/session.ts`). |
| Localisation | `src/i18n/ar.ts` catalogue with `t()`; English can be added as a second catalogue without touching components. |
| Quality | Vitest for domain/permission/serializer tests; Playwright (preinstalled Chromium) for the route walk and screenshots. |

## 6. Route inventory

- `/` → redirect by `JourneyMode` (setup → onboarding, else today)
- `/onboarding` → welcome · story · due-date · household · privacy · cities
- `/today` (pregnancy or postpartum) · `/today/week`
- `/journey` · `/journey/milestone/[id]` · `/journey/appointments/new` · `/journey/appointments/[id]` · `/journey/appointments/[id]/edit` · `/journey/ultrasound/[id]` · `/journey/gender` · `/journey/name` · `/journey/birth`
- `/preparation` · `/preparation/[category]` · `/preparation/item/new` · `/preparation/item/[id]` · `/preparation/hospital-bag`
- `/finance` (gated) · `/finance/goals/new` · `/finance/goals/[id]`
- `/more` · `/more/family` · `/more/family/[id]` · `/more/baby` · `/more/permissions` · `/more/providers` · `/more/providers/doctor/[id]` · `/more/providers/hospital/[id]` · `/more/providers/insurance/[id]` · `/more/travel` · `/more/birth-plan` · `/more/settings`
- `/api/*` route handlers for mutations (Zod-validated, permission-gated)

## 7. Data and permission model

23 entities (see `src/domain/types.ts`). Roles `mother | partner |
financial_planner | family_supporter`, multiple per member, deriving 11
permission scopes that are stored per member and editable. `assertCan()`
guards every route handler; every serializer takes a `Viewer`.

Finance math: `monthly = ceil(remaining / periods)` where periods = calendar
months from today's month through the funding month, inclusive (today or
later this month = 1, next month = 2, past = 1 and flagged overdue,
fully funded = 0). `spendingDate` never enters a calculation.

## 8. Phases

1. Foundation → 2. Core journey → 3. Preparation + finance → 4. Care,
travel, birth → 5. Postpartum → 6. Tests, screenshots, docs → asset pass.
One coherent commit per phase.

## 9. Conflicts and blockers

1. **Conflict — finance ownership naming.** The design system labels
   finance "father-only" (`fatherVisible` / `motherAbsent`); the brief
   forbids assuming the father is the financial owner. Resolution: the
   brief governs behaviour → a configurable `financial_planner` role;
   the design-system naming is treated as sample content.
2. **20 px page gutter** is not a spacing token but is an explicit grid
   rule; exposed as a separate `layout` token, not an invented value.
3. Reference `today-week-08` shows a fetus more mature than week 8 —
   composition only; stage accuracy governs assets.
4. Several reference names differ from their content (`journey-dark` is
   offline-error, `funding-plan` is hospital-bag, …); the "Canonical
   route" in the table is used.
5. No auth, database or currency specified → cookie session, file store
   behind an adapter, `currencyCode` in household settings (default SAR,
   editable).
6. No production weekly media → manifest + placeholders + backlog.

## 10. Status

Phases 1–6 are implemented and pushed as one commit each. Route inventory
above is complete plus `/journey/postpartum`, `/more/feeding`,
`/more/providers/new`, `/more/providers/edit/[kind]/[id]` and
`/journey/birth/confirmed`. QA: 61 tests, 72 screenshot states (light and
dark), axe-core walk with zero serious/critical violations. The asset pass
produced development placeholders for the media pipeline; production media
remains listed in `docs/asset-backlog.md`, other gaps in `docs/limitations.md`.
