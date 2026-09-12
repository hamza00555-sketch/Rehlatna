# Asset backlog

Every production asset the product is designed around but does not ship
with. The app is fully functional without them: each slot renders the
approved neutral placeholder and keeps its information hierarchy. Nothing in
this list may be faked with stock footage or a mature-fetus loop resized.

Paths are served from `/public/media/…`. Manifest: `src/media/weekly.ts`
(`WEEKLY_MEDIA`), `src/domain/types.ts` (`MediaAsset`, `WeeklyBabyMedia`).

## 1. Weekly baby media — weeks 5 to 40 (36 sets)

| File | Purpose | Ratio / size | Crop & safe area | Medical review |
| --- | --- | --- | --- | --- |
| `weekly/week-NN.mp4` | Silent loop, Today hero + expanded hero | 4:5 (1080×1350), 6–10 s, H.264, ≤ 2.5 MB | Focal point on the baby, centred; keep top 18% and bottom 26% free of detail (scrim + text) | **Required** before `medicallyReviewed: true` |
| `weekly/week-NN.webm` | Same loop, VP9 | as above | as above | same review as the MP4 |
| `weekly/week-NN.poster.webp` | First frame, shown before playback and under reduced motion | 4:5, 1080×1350, ≤ 160 KB | identical framing to the loop | same review |
| `weekly/week-NN.thumb.webp` | Weekly development page, journey history | 1:1, 480×480 | tighter crop on the baby | same review |

Rules: one visual universe (lighting, material, lens, palette) across all
36 weeks; each week is a distinct, stage-accurate model — never scaled or
morphed from another week; no diagnostic look; `alt` stays descriptive and
non-medical. Set `reviewedAt` and `reviewNotes` when the reviewer signs off.

## 2. Onboarding and story

| File | Purpose | Ratio | Notes |
| --- | --- | --- | --- |
| `story/welcome.webp` | Full-bleed welcome hero | 9:16 | dark cinematic, text-safe bottom 40% |
| `story/chapter-01.webp` … `chapter-03.webp` | Story steps | 9:16 | same universe as weekly media |

## 3. Preparation objects (studio photography)

| File | Purpose | Ratio | Notes |
| --- | --- | --- | --- |
| `preparation/{category}/{slug}.webp` | Object cards, item detail | 4:3 | one warm neutral background, one soft shadow direction, consistent scale; no brands, no prices in frame |

Categories: sleep, travel, feeding, clothing, care, bath, mother_postpartum,
hospital_bag.

## 4. Care, travel, birth, postpartum

| File | Purpose | Ratio | Notes |
| --- | --- | --- | --- |
| `care/hospital-placeholder.webp` | Hospital detail hero when no photo is set | 16:9 | neutral architecture / light |
| `travel/route-abstract.webp` | Travel plan header | 3:1 | abstract, no maps |
| `birth/confirmed.webp` | "وصل صغيرنا" confirmation backdrop | 9:16 | material and light, no child |
| `postpartum/neutral-fallback.webp` | Postpartum hero when the family has not added a photo | 4:5 | material and light, **never** a generated child |

## 5. Icons

The custom set in `src/components/icons/Icon.tsx` covers every current
use. Remaining wishes: a `bottle`/`spoon` glyph for feeding tasks, a
`suitcase` variant for travel, and 20 px optical variants for dense rows.

## 6. Development placeholders (present)

Generated placeholders live under `public/media/dev/…` and are wired through
`src/media/dev.ts`. They exercise the pipeline (focal point, scrim, poster →
video lifecycle, reduced motion, dark mode) and are **not** production
assets: no medical review, no photography sign-off. The hero shows the
"غير مُراجَع طبياً — للتطوير فقط" badge whenever one is on screen.

| Slot | Status |
| --- | --- |
| Weekly posters | 17 of 36 weeks: 5, 8, 12, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 32, 36, 40 (poster 1080×1350 + thumb 480×480). Weeks 18, 19, 20, 21, 22, 23, 24, 25 and 26 are sourced from the same Drive library (Rehlatna-Warm-Visual-Library) — a coherent warm run across weeks 18–26 — instead of generated placeholders; still `medicallyReviewed: false`, no medical sign-off, not diagnostic. Weeks 5, 8, 12, 16, 28, 32, 36, 40 remain the older generated placeholders (week 12 the weakest of those). No loops (mp4/webm) exist; the hero stays poster-only. |
| Story welcome | present (silhouette, 9:16) |
| Birth confirmed backdrop | present (linen and light, 9:16) |
| Postpartum neutral fallback | present (linen and light, 4:5) |
| Hospital placeholder | present (interior, 16:9) |
| Travel abstract | present, not yet placed on a screen |
| Preparation objects | 7 of 8 categories: stroller, crib, bassinet, car seat, pump, bath, travel bag |

Regenerate with `scripts/convert-dev-media.mjs <raw-dir>` after dropping new
PNGs named `NN.png`, `story-welcome.png`, `birth-confirmed.png`,
`postpartum-neutral.png`, `hospital.png`, `travel.png`, `prep-<slug>.png`.
