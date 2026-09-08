// Contrast audit: for every visible text node in every screenshot state
// (light + dark), resolve the effective foreground and the nearest solid
// background and compute the WCAG ratio. Elements sitting over images or
// gradients are reported separately ("over media") rather than guessed.
//   BASE_URL=http://localhost:3000 node scripts/contrast.mjs [filter]
import { chromium } from "playwright-core";
import { existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES } from "./screenshot-routes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE_URL ?? "http://localhost:3000";
const filter = process.argv[2];
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  const direct = join(dir, "chromium");
  if (existsSync(direct)) return direct;
  for (const entry of readdirSync(dir)) for (const c of ["chrome-linux/chrome", "chrome"]) { const p = join(dir, entry, c); if (existsSync(p)) return p; }
}

const browser = await chromium.launch({ executablePath: findChromium(), args: ["--no-sandbox"] });
const report = [];
const seen = new Set();

for (const route of ROUTES) {
  if (filter && !route.name.includes(filter)) continue;
  for (const theme of route.themes ?? ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme, locale: "ar-SA" });
    const page = await context.newPage();
    try {
      if (route.demo) { await page.request.post(`${base}/api/demo/enter`, { data: { scenario: route.demo } }); await page.request.post(`${base}/api/demo/reset`); }
      if (route.member) await page.request.post(`${base}/api/session/member`, { data: { memberId: route.member } });
      await page.goto(`${base}${route.path}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      if (route.action) await route.action(page);
      await page.waitForTimeout(300);
      const rows = await page.evaluate(() => {
        const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = "1"] = m[1].split(",").map((s) => parseFloat(s)); return { r, g, b, a }; };
        const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
        const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          const text = n.textContent.trim();
          if (!text || text.length < 2) continue;
          const el = n.parentElement;
          if (!el) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (el.closest("[hidden], [aria-hidden='true'], .sr-only, dialog:not([open])")) continue;
          let fg = parse(cs.color);
          if (!fg) continue;
          // find nearest solid background; note media/gradient in between
          let bg = null, overMedia = false, e = el;
          while (e && e !== document.documentElement) {
            const s = getComputedStyle(e);
            if (s.backgroundImage && s.backgroundImage !== "none") { overMedia = true; break; }
            const c = parse(s.backgroundColor);
            if (c && c.a > 0) { bg = bg ? blend(bg, c) : c; if (c.a >= 1) break; }
            e = e.parentElement;
          }
          if (overMedia) { out.push({ text: text.slice(0, 40), overMedia: true, cls: el.className?.toString().slice(0, 60) }); continue; }
          if (!bg || bg.a < 1) { const body = parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 }; bg = bg ? blend(bg, body) : body; }
          if (fg.a < 1) fg = blend(fg, bg);
          const size = parseFloat(cs.fontSize);
          const weight = parseInt(cs.fontWeight, 10) || 400;
          const large = size >= 18.66 || (size >= 14 && weight >= 700);
          const r = ratio(fg, bg);
          const min = large ? 3 : 4.5;
          if (r < min) out.push({ text: text.slice(0, 40), ratio: +r.toFixed(2), min, size, weight, fg: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, cls: el.className?.toString().slice(0, 70), tag: el.tagName.toLowerCase() });
        }
        return out;
      });
      const fails = rows.filter((r) => !r.overMedia);
      const media = rows.filter((r) => r.overMedia);
      for (const f of fails) {
        const key = `${theme}|${f.cls}|${f.fg}|${f.bg}`;
        if (seen.has(key)) continue;
        seen.add(key);
        report.push({ state: route.name, theme, ...f });
      }
      console.log(`${fails.length ? "✗" : "✓"} ${route.name} (${theme}) — ${fails.length} low-contrast, ${media.length} over media`);
    } catch (err) {
      console.error(`! ${route.name} (${theme}): ${err.message}`);
    } finally {
      await context.close();
    }
  }
}
await browser.close();
mkdirSync(join(root, "screenshots"), { recursive: true });
writeFileSync(join(root, "screenshots", "contrast.json"), JSON.stringify(report, null, 2));
console.log(`\n${report.length} unique failing text styles → screenshots/contrast.json`);
for (const r of report) console.log(`  [${r.theme}] ${r.state}: "${r.text}" ${r.ratio}:1 (min ${r.min}) fg ${r.fg} on ${r.bg} · .${r.cls}`);
