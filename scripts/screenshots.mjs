// Route/state walker: captures every meaningful screen in light and dark,
// pregnancy and postpartum demo states, at a mobile viewport.
//   BASE_URL=http://localhost:3000 node scripts/screenshots.mjs [filter]
// Output: screenshots/<name>.<theme>.png plus screenshots/index.json.
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { ROUTES } from "./screenshot-routes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE_URL ?? "http://localhost:3000";
const outDir = join(root, "screenshots");
const filter = process.argv[2];
mkdirSync(outDir, { recursive: true });

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (!existsSync(dir)) return undefined;
  const direct = join(dir, "chromium");
  if (existsSync(direct)) return direct;
  for (const entry of readdirSync(dir)) {
    for (const candidate of ["chrome-linux/chrome", "chrome-linux/headless_shell", "chrome"]) {
      const p = join(dir, entry, candidate);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: findChromium(), args: ["--no-sandbox"] });
const results = [];

for (const route of ROUTES) {
  if (filter && !route.name.includes(filter)) continue;
  for (const theme of route.themes ?? ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: theme,
      reducedMotion: route.reducedMotion ? "reduce" : "no-preference",
      locale: "ar-SA",
    });
    const page = await context.newPage();
    try {
      if (route.demo) {
        await page.request.post(`${base}/api/demo/enter`, { data: { scenario: route.demo } });
        // Fresh fixture every time so an interaction in one state never leaks into the next.
        await page.request.post(`${base}/api/demo/reset`);
      }
      if (route.member) {
        await page.request.post(`${base}/api/session/member`, { data: { memberId: route.member } });
      }
      await page.goto(`${base}${route.path}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      if (route.action) await route.action(page);
      await page.waitForTimeout(400);
      const file = `${route.name}.${theme}.png`;
      await page.screenshot({ path: join(outDir, file), fullPage: route.fullPage ?? true });
      results.push({ name: route.name, route: route.path, theme, demo: route.demo ?? "live", file });
      console.log(`✓ ${file}`);
    } catch (err) {
      console.error(`✗ ${route.name} (${theme}): ${err.message}`);
      results.push({ name: route.name, route: route.path, theme, error: err.message });
    } finally {
      await context.close();
    }
  }
}

await browser.close();
writeFileSync(join(outDir, "index.json"), JSON.stringify(results, null, 2));
console.log(`${results.filter((r) => !r.error).length}/${results.length} captured → screenshots/`);
