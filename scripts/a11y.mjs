// Accessibility walk: runs axe-core over every screenshot state (light + dark)
// and reports serious/critical violations. Also checks tap targets ≥ 44px for
// interactive elements and icon-only controls without a name.
//   BASE_URL=http://localhost:3000 node scripts/a11y.mjs [filter]
// Output: screenshots/a11y.json (gitignored) and a console summary.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { ROUTES } from "./screenshot-routes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE_URL ?? "http://localhost:3000";
const filter = process.argv[2];
const axeSource = readFileSync(join(root, "node_modules/axe-core/axe.min.js"), "utf8");
mkdirSync(join(root, "screenshots"), { recursive: true });

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
const report = [];
let totalViolations = 0;

for (const route of ROUTES) {
  if (filter && !route.name.includes(filter)) continue;
  for (const theme of route.themes ?? ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme, locale: "ar-SA" });
    const page = await context.newPage();
    try {
      if (route.demo) {
        await page.request.post(`${base}/api/demo/enter`, { data: { scenario: route.demo } });
        await page.request.post(`${base}/api/demo/reset`);
      }
      if (route.member) await page.request.post(`${base}/api/session/member`, { data: { memberId: route.member } });
      await page.goto(`${base}${route.path}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      if (route.action) await route.action(page);
      await page.waitForTimeout(300);
      await page.addScriptTag({ content: axeSource });
      const result = await page.evaluate(async () => {
        const axe = window.axe;
        const r = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] },
          rules: { region: { enabled: false } },
        });
        // Tap targets: interactive elements smaller than 44×44 that are visible.
        const small = [];
        for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=checkbox]")) {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || el.closest("[hidden]")) continue;
          if (el.tagName === "INPUT" && (el.type === "radio" || el.type === "checkbox") && el.closest("label")) continue; // visually hidden, label is the target
          if (el.hasAttribute("data-hit-extended")) continue; // ::before extends the hit area to 44px (see Chip/Toggle CSS)
          if (rect.width < 44 || rect.height < 44) {
            const name = el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 40) || el.id || el.className;
            small.push({ tag: el.tagName.toLowerCase(), name, w: Math.round(rect.width), h: Math.round(rect.height) });
          }
        }
        return {
          violations: r.violations
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })),
          small,
        };
      });
      totalViolations += result.violations.length;
      report.push({ name: route.name, theme, path: route.path, ...result });
      const flag = result.violations.length ? "✗" : "✓";
      console.log(`${flag} ${route.name} (${theme}) — ${result.violations.length} violations, ${result.small.length} small targets`);
      for (const v of result.violations) console.log(`    ${v.impact}: ${v.id} — ${v.help} @ ${v.nodes.join(" | ")}`);
    } catch (err) {
      console.error(`! ${route.name} (${theme}): ${err.message}`);
      report.push({ name: route.name, theme, path: route.path, error: err.message });
    } finally {
      await context.close();
    }
  }
}

await browser.close();
writeFileSync(join(root, "screenshots", "a11y.json"), JSON.stringify(report, null, 2));
console.log(`\n${totalViolations} serious/critical violations across ${report.length} states → screenshots/a11y.json`);
