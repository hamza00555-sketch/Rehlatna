# Design notes — compositions, approximations, deviations

Every place the implementation composes something the design system does not
define verbatim, or resolves an ambiguity, is recorded here. Nothing on this
list is a silent deviation.

## Token handling

- `src/design/tokens.ts` is the single source; `src/app/tokens.css` is
  generated (`npm run tokens`). Components reference variables only.
- **Composite values** (`--c-*`): scrims, gradients, soft borders and tints
  that appear inside approved component-state CSS but are not top-level
  tokens (e.g. `rgba(255,248,242,0.94)` nav background, `#0E182A` pressed
  primary). Copied verbatim; not new colours.
- **Component dimensions** (`--comp-*`): min-heights and paddings copied
  from component CSS (52px buttons, 14px vertical button padding, 34px chips
  …). Not a spacing scale.
- **Layout** (`--layout-*`): 20px gutter, 12px grid gap, 24px section
  rhythm come from the explicit grid rule; `520px` max width and the
  76px/82px bar heights are implementation constants (max width is not in
  the spec — chosen so the four-column mobile grid stays intact on larger
  screens).
- Theme aliases (`--t-*`) map light → dark pairs: `surfaceWarm` has no dark
  counterpart, so it maps to `darkTint`; `faint` maps to `darkMuted` in dark
  mode (spec: faint is never used for essential text anyway).

## Component compositions

| Component | Spec coverage | Composition |
| --- | --- | --- |
| Button `outline` | Variant named, no CSS | Transparent surface, `lineStrong` border, ink text, 52px pill |
| Button `danger` | Variant named, no CSS | Transparent surface, `danger` border and text — destructive confirmation only |
| Button `quiet` | Not in spec | Text-only secondary action keeping the 52px target; used for "later"/"not now" paths |
| IconButton `accent` | Variant named, no CSS | `accentWarmSoft` fill with `accentWarm` border (the spec's pressed colours) |
| StatusBadge `medical` | Not in spec | `accentBlueSoft` field with the medical row border |
| PrivacyNotice `private` | Spec names it `fatherPrivate` | Same CSS; renamed because the financial planner is configurable (brief §5 governs) |
| RolePrivacyGate | Spec = CSS `display:none` | Implemented server-side: `serializeFinanceOverview` returns `null`; nothing is rendered or fetched. CSS hiding is never used. |
| TaskRow `undecided` | Variant named, no CSS | Open row with muted text |
| Card tones | Not a spec component | Surface primitive with tone + hairline border (spec rule: tone before shadow) |
| Bento | Spec sizes only | CSS grid, four columns, dense flow; items choose spans |
| Toggle | Not in spec | Composed from `primary`, `line`, `surfaceRaised`, `raised` shadow |
| EmptyState visual | "one material image" | Neutral `surfaceTint` panel + product icon until material photography exists |

## Icons

Custom set drawn on a 24px grid, 1.6px stroke, round joins, softened-square
geometry, selective active fill for the four navigation icons. `back` points
to the inline start (right in RTL) and `forward` to the inline end; they are
semantic, not mirrored copies.

## Copy

All strings live in `src/i18n/ar.ts`. Reference screenshots were used for
composition only; their Arabic was re-typeset from the catalogue.

## Conflicts resolved

1. Finance ownership: spec labels finance "father-only"; brief forbids
   assuming the father. Behaviour follows the brief (`financial_planner`
   role); visuals follow the spec.
2. 20px gutter is not a spacing token but is an explicit grid rule →
   `layout.gutter`.
3. `today-week-08` reference shows a fetus more mature than week 8 → the
   composition is used, stage accuracy governs assets.

## Dark-mode additions

- Text-role aliases (`--t-link`, `--t-success-text`, `--t-needed-text`,
  `--t-danger-text`, `--t-warning-text`): every colour that is only legible on
  light surfaces has a dark counterpart from the same palette. CSS modules
  reference the alias, never the light token, when the surface is themed.
  Fixed light surfaces (card tones, completed rows) re-scope the aliases to
  their light values so nested components inherit the right pair.
- `--c-hero-neutral`: the sustained no-poster hero uses a dark warm material
  instead of the light loading gradient, so the light ink and the muted lines
  stay above 4.5:1 at every scroll position. The loading gradient remains
  the loading state only.
- `scripts/contrast.mjs` walks every screenshot state in both themes and
  reports text below WCAG AA against its nearest solid surface; the axe walk
  in `scripts/a11y.mjs` covers the rest.

- `--t-warning-text`: the warning brown (`#805124`) fails AA on dark surfaces;
  in dark the alias resolves to `accentWarmSoft`. Used for warning-coloured
  text on themed (non-fixed) surfaces only.
- Card tones with fixed light surfaces (rose, sage, blue, attention) re-scope
  `--t-ink` / `--t-muted` / `--t-line` so nested components keep contrast.

## Phase 4 decisions (care, travel, birth)

- Insurance coverage is stored as a belief (`insuranceBelievedCovered`) with a
  `lastVerifiedAt` stamp. A record older than 90 days flips to the attention
  treatment and reads "مرّ وقت طويل على آخر تحقق". Nothing in the UI reads as a
  guarantee; the disclaimer is always visible next to coverage.
- "Verify coverage" offers two outcomes: mark verified today, or create a
  verification task. Tasks are shared and appear on the hospital, insurance
  and care-list screens.
- Travel plan only appears when follow-up city and delivery city differ.
  Its dates are optional; the checklist is free-form.
- Birth confirmation is a full-screen dark flow (`/journey/birth`) with an
  explicit confirm button. It rejects future dates and a second birth event.
  On success the household switches to postpartum, default postpartum tasks
  are seeded and the journey drops pregnancy milestones dated after birth.
- Date and time inputs are native `<input type="date|time">` styled with
  tokens; the platform picker is preferred over a custom one for reliability.
  The onboarding due-date step keeps the custom calendar because it is the
  hero moment.
- Missing records inside the shell render `(app)/not-found.tsx` (a calm dead
  end with a way back), never the error boundary.

## Phase 5 decisions (postpartum)

- Feeding preference is a multi-select with no default. Formula is one option
  among equals, with a neutral note; the page never recommends a method and
  carries a disclaimer that medical advice is the reference.
- The postpartum chapter (`/journey/postpartum`) reads: baby age, forty-day
  progress, the first three months as three quiet cards, postpartum
  milestones, feeding summary, the full task stack (toggle, delete, add), and
  a row back into the pregnancy history so the narrative stays continuous.
- The postpartum hero keeps at most five tasks in view; "الأربعين وكل المهام"
  opens the full stack.
- The screenshot walker re-seeds demo data on every capture so an interaction
  in one state (e.g. toggling a task) never leaks into the next.
