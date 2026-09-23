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
  storyWelcome: `${ROOT}/story/welcome.webp` as string | undefined,
  birthConfirmed: `${ROOT}/birth/confirmed.webp` as string | undefined,
  postpartumNeutral: `${ROOT}/postpartum/neutral-fallback.webp` as string | undefined,
  hospitalPlaceholder: `${ROOT}/care/hospital-placeholder.webp` as string | undefined,
  travelAbstract: `${ROOT}/travel/route-abstract.webp` as string | undefined,
  preparation: Object.fromEntries(["stroller", "crib", "bassinet", "carseat", "pump", "bath", "travel-bag"].map((slug) => [slug.replace("-", "_"), `${ROOT}/preparation/${slug}.webp`])) as Record<string, string>,
};
