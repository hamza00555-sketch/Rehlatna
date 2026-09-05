// Fetches an approved composition reference from the design-system screen API
// into docs/references/<name>.<ext>. The read-only key is NOT committed:
//   DESIGN_REF_KEY=… node scripts/fetch-reference.mjs today-week-08
// Screen names are listed in docs/design-system.md ("Pictures of the product").
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = "https://design-system-web-9mj4.vercel.app/api/systems/screen";
const key = process.env.DESIGN_REF_KEY;
const name = process.argv[2];

if (!key || !name) {
  console.error("Usage: DESIGN_REF_KEY=<key> node scripts/fetch-reference.mjs <screen-name>");
  process.exit(1);
}

const res = await fetch(endpoint, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name }),
});
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const body = await res.json();
const ext = body.mimeType?.includes("png") ? "png" : body.mimeType?.includes("webp") ? "webp" : "jpg";
const outDir = join(root, "docs/references");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${name}.${ext}`);
writeFileSync(out, Buffer.from(body.data, "base64"));
console.log(out);
