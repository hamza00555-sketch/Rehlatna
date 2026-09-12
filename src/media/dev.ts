/**
 * Development placeholder media.
 *
 * These files were generated to exercise the media pipeline (focal points,
 * scrims, poster→video lifecycle, reduced motion, dark mode). They are NOT
 * production assets: no medical review, no photography brief sign-off. Each
 * consumer falls back to the neutral placeholder when a path is absent, so
 * removing a file here degrades gracefully. Production paths and requirements
 * live in docs/asset-backlog.md.
 */

const ROOT = "/media/dev";

export const DEV_MEDIA = {
  /** Weekly posters that exist as development placeholders (week → path). */
  weeklyPosters: Object.fromEntries(Array.from({ length: 36 }, (_, i) => i + 5).map((w) => [w, `${ROOT}/weekly/week-${String(w).padStart(2, "0")}.poster.webp`])) as Record<number, string>,
  storyWelcome: `${ROOT}/story/welcome.webp` as string | undefined,
  birthConfirmed: `${ROOT}/birth/confirmed.webp` as string | undefined,
  postpartumNeutral: `${ROOT}/postpartum/neutral-fallback.webp` as string | undefined,
  hospitalPlaceholder: `${ROOT}/care/hospital-placeholder.webp` as string | undefined,
  travelAbstract: `${ROOT}/travel/route-abstract.webp` as string | undefined,
  preparation: Object.fromEntries(["stroller", "crib", "bassinet", "carseat", "pump", "bath", "travel-bag"].map((slug) => [slug.replace("-", "_"), `${ROOT}/preparation/${slug}.webp`])) as Record<string, string>,
};

export function devWeeklyPoster(week: number): string | undefined {
  return DEV_MEDIA.weeklyPosters[week];
}

export function devWeeklyThumb(week: number): string | undefined {
  const poster = DEV_MEDIA.weeklyPosters[week];
  return poster?.replace(".poster.webp", ".thumb.webp");
}
