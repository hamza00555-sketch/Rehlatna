// One-off helper: converts generated PNG placeholders in a source folder into
// the WebP files referenced by src/media/dev.ts. Usage:
//   node scripts/convert-dev-media.mjs <raw-dir>
// Weekly posters: 4:5 at 1080×1350 (+ 480×480 thumbs). Story/birth: 9:16 at
// 1080×1920. Postpartum neutral: 4:5. Hospital: 16:9 at 1600×900. Travel:
// 21:9 at 1800×771. Preparation objects: 4:3 at 1200×900.
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = process.argv[2];
if (!raw) throw new Error("raw dir required");
const out = join(root, "public", "media", "dev");

async function convert(src, dest, width, height, opts = {}) {
  if (!existsSync(src)) return console.log(`· skip ${src}`);
  mkdirSync(dirname(dest), { recursive: true });
  await sharp(src).resize(width, height, { fit: "cover", position: opts.position ?? "centre" }).webp({ quality: opts.quality ?? 78 }).toFile(dest);
  console.log(`✓ ${dest.replace(root, "")}`);
}

const weeks = [5, 8, 12, 16, 20, 22, 24, 28, 32, 36, 40];
for (const w of weeks) {
  const nn = String(w).padStart(2, "0");
  await convert(join(raw, `${nn}.png`), join(out, "weekly", `week-${nn}.poster.webp`), 1080, 1350);
  await convert(join(raw, `${nn}.png`), join(out, "weekly", `week-${nn}.thumb.webp`), 480, 480, { quality: 72 });
}
await convert(join(raw, "story-welcome.png"), join(out, "story", "welcome.webp"), 1080, 1920);
await convert(join(raw, "birth-confirmed.png"), join(out, "birth", "confirmed.webp"), 1080, 1920);
await convert(join(raw, "postpartum-neutral.png"), join(out, "postpartum", "neutral-fallback.webp"), 1080, 1350);
await convert(join(raw, "hospital.png"), join(out, "care", "hospital-placeholder.webp"), 1600, 900);
await convert(join(raw, "travel.png"), join(out, "travel", "route-abstract.webp"), 1800, 771);
for (const slug of ["stroller", "crib", "bassinet", "carseat", "pump", "bath", "travel-bag"]) {
  await convert(join(raw, `prep-${slug}.png`), join(out, "preparation", `${slug}.webp`), 1200, 900);
}
