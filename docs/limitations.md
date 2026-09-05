# Known limitations and approximations

Honest inventory of what this build does not do, or does approximately.

## Not implemented

- **Authentication.** A cookie names the active household member. The swap
  point is `src/server/session.ts`; the rest of the server only sees a
  `Viewer`. The member switcher in Settings is a development tool.
- **Database.** Development persists to `.data/store.json` through
  `src/server/store.ts`; the demo runs in memory. A Postgres/Supabase adapter
  replaces `FileStore` without touching callers.
- **Photo upload.** `Baby.personalMediaAssetId` and the `user-upload` media
  family exist; there is no upload endpoint yet. The postpartum hero uses the
  neutral fallback.
- **Notifications.** Preferences are stored; nothing is delivered.
- **Production media.** Only generated development placeholders ship
  (`public/media/dev`, 11 of 36 weekly posters, no loops). They are flagged
  unreviewed in the UI. See `docs/asset-backlog.md`.
- **English catalogue.** Copy is Arabic-only; `src/i18n` is structured for a
  second catalogue.

## Approximations

- Pregnancy math uses a 280-day term from the due date; weeks are whole
  weeks from the derived LMP. Postpartum months are 30-day months.
- Finance monthly requirement: `ceil(remaining / periods)`, periods being
  calendar months from the current month through the funding month.
  `spendingDate` never enters the calculation.
- Insurance coverage is a belief with a verification stamp; 90 days marks it
  stale. The app never states coverage as fact.
- Weekly development text is general information for expectant parents,
  flagged `medicallyReviewed: false`, and is not diagnostic.
- Date/time pickers are native inputs; their display format follows the
  platform (the walker renders them as `mm/dd/yyyy`). The onboarding due
  date keeps the custom calendar.

## Accessibility notes

- Chips and switches keep their compact visual size; the touch target is
  extended to 44 px with a pseudo-element. `scripts/a11y.mjs` knows this
  via `data-hit-extended`.
- Cards with fixed light tones (rose, sage, blue, attention) re-scope the
  theme aliases so their text keeps AA contrast in dark mode.
- Reduced motion: OS preference or the household setting replaces the hero
  expansion with a 120 ms opacity change and keeps the poster.

## QA coverage

- 61 unit/integration tests (`npm test`): domain math, permissions at the
  route handlers, the finance privacy boundary, template-first household,
  copy agreement, source hygiene (no real-family data, no emoji).
- 72 screenshot states, light and dark (`npm run screenshots`), and an
  axe-core walk over the same states (`npm run a11y`). Output lands in
  `screenshots/` (gitignored).
