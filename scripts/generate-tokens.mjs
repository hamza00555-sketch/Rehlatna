// Generates src/app/tokens.css from src/design/tokens.ts — the single source
// of truth. Run with `npm run tokens` (wired into predev/prebuild).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src/design/tokens.ts"), "utf8");

// Extracts `export const <group> = { key: "value", … } as const;` blocks so
// generation needs no TypeScript toolchain.
const groups = {};
const groupRe = /export const (\w+) = \{([\s\S]*?)\} as const;/g;
let m;
while ((m = groupRe.exec(src)) !== null) {
  const [, name, body] = m;
  if (name === "tokens") continue;
  const entries = {};
  const entryRe = /(?:"([\w-]+)"|(\w+)):\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  let e;
  while ((e = entryRe.exec(body)) !== null) entries[e[1] ?? e[2]] = e[3];
  groups[name] = entries;
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const prefixes = {
  color: "color",
  composite: "c",
  component: "comp",
  fontFamily: "font",
  fontSize: "text",
  fontWeight: "weight",
  lineHeight: "leading",
  letterSpacing: "tracking",
  spacing: "space",
  layout: "layout",
  radius: "radius",
  shadow: "shadow",
  border: "border",
  motion: "motion",
};

let css = `/* GENERATED — do not edit. Source: src/design/tokens.ts (npm run tokens). */\n:root {\n`;
for (const [group, entries] of Object.entries(groups)) {
  const prefix = prefixes[group];
  if (!prefix) continue;
  for (const [key, value] of Object.entries(entries)) {
    css += `  --${prefix}-${kebab(key)}: ${value};\n`;
  }
}
css += `}\n`;

// Theme-adaptive aliases. Light on :root, dark under an explicit
// data-theme="dark" and under system preference when nothing is stamped.
// Components use ONLY these `--t-*` aliases for theme-adaptive surfaces.
const aliases = [
  ["canvas", "--color-canvas", "--color-dark-canvas"],
  ["surface", "--color-surface", "--color-dark-surface"],
  ["surface-raised", "--color-surface-raised", "--color-dark-raised"],
  ["surface-tint", "--color-surface-tint", "--color-dark-tint"],
  ["surface-warm", "--color-surface-warm", "--color-dark-tint"],
  ["ink", "--color-ink", "--color-dark-ink"],
  ["muted", "--color-muted", "--color-dark-muted"],
  ["line", "--color-line", "--color-dark-line"],
  ["line-strong", "--color-line-strong", "--color-dark-line"],
  ["border", "--border-hairline", "--border-dark"],
  ["shadow-floating", "--shadow-floating", "--shadow-dark-raised"],
  ["shadow-raised", "--shadow-raised", "--shadow-dark-raised"],
  ["nav-bg", "--c-nav-light-bg", "--c-nav-dark-bg"],
  ["sheet-bg", "--c-sheet-light-bg", "--c-sheet-dark-bg"],
  ["shimmer", "--c-shimmer-light", "--c-shimmer-dark"],
  ["nav-active", "--color-primary", "--color-dark-ink"],
  ["chip-selected-bg", "--color-ink", "--color-dark-ink"],
  ["chip-selected-fg", "--color-on-primary", "--color-dark-canvas"],
  // Warning text on themed surfaces: the light warning brown fails on dark surfaces.
  ["warning-text", "--color-warning", "--color-accent-warm-soft"],
  // Text roles whose light-theme colour fails on dark surfaces.
  ["link", "--color-primary", "--color-dark-ink"],
  ["success-text", "--color-success", "--c-postpartum-completed-text"],
  ["needed-text", "--c-needed-badge-text", "--color-accent-warm"],
  ["danger-text", "--color-danger", "--color-accent-warm"],
];

css += `\n:root {\n`;
for (const [name, light] of aliases) css += `  --t-${name}: var(${light});\n`;
css += `  color-scheme: light;\n}\n`;

const darkBlock = aliases.map(([name, , dark]) => `  --t-${name}: var(${dark});`).join("\n");

css += `\n:root[data-theme="dark"] {\n${darkBlock}\n  color-scheme: dark;\n}\n`;
css += `\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${darkBlock.replace(/^/gm, "  ")}\n    color-scheme: dark;\n  }\n}\n`;

const outDir = join(root, "src/app");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "tokens.css"), css);
console.log(`tokens.css generated (${Object.keys(groups).length} groups)`);
