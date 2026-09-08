# Known limitations and approximations

Honest inventory of what this build does not do, or does approximately.

## Not implemented

- **Partner invitations.** Supabase auth signs one person in per household
  today: the creator. The membership table and its policies already allow the
  owner to add a partner's user id; the invite flow (code or link) is not
  built, so the second member is a named profile without a login.
- **Email delivery.** Google sign-in avoids email entirely and is the
  recommended path. The email fallback uses the built-in Supabase mailer,
  which allows only a few messages per hour and is meant for development. Custom SMTP is required before
  real users. The sign-in link must be opened in the same browser that
  requested it (PKCE); a code flow needs custom SMTP so the template can
  include `{{ .Token }}`.
- **Development session.** Without Supabase env vars the app uses a cookie
  session and a JSON file store; the member switcher in Settings exists only
  in that mode and in the demo.
- **Photo upload.** `Baby.personalMediaAssetId` and the `user-upload` media
  family exist; there is no upload endpoint yet. The postpartum hero uses the
  neutral fallback.
- **Notifications.** Preferences are stored; nothing is delivered.
- **Production media.** Only generated development placeholders ship
  (`public/media/dev`, 11 of 36 weekly posters, no loops). They are flagged
  unreviewed in the UI. See `docs/asset-backlog.md`.
- **English catalogue.** Copy is Arabic-only; `src/i18n` is structured for a
  second catalogue.

- **Demo on serverless hosts.** The demo lives in memory per server
  instance and seeds itself on first read, so entering the demo always works,
  but a change made on one instance may not show on the next request. The
  demo is a showcase, not a workspace.

## Approximations

- Care windows (`docs/care-reference.md`) describe a low-risk pregnancy only.
  Windows are inferred from appointment types and gestational weeks; a family
  record always overrides the inference. Nothing is diagnostic.

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
