// Shared helpers for the full sweep. Env: WEB_DIR (repo/web), OUT (folder for shots and findings), APP (app url, trailing /),
// FAKE (fake services url) or TOKEN (app token).
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(process.env.WEB_DIR + "/package.json");
const { chromium } = require("playwright");
export const OUT = process.env.OUT;
fs.mkdirSync(OUT, { recursive: true });
const ISSUES = `${OUT}/auto-issues.jsonl`;
export async function token() {
  if (process.env.TOKEN) return process.env.TOKEN;
  const info = await (await fetch(process.env.FAKE + "/__e2e/info")).json();
  return info.token;
}
export async function info() { return process.env.FAKE ? (await fetch(process.env.FAKE + "/__e2e/info")).json() : {}; }
export async function open({ width = 1440, height = 900, scheme = "light", path = "" } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, ignoreHTTPSErrors: true, bypassCSP: true });
  const page = await ctx.newPage();
  page._errors = [];
  page.on("pageerror", (e) => page._errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) page._errors.push("console: " + m.text().slice(0, 200)); });
  await page.goto(process.env.APP + "?token=" + (await token()) + path);
  await page.waitForTimeout(1800);
  return { browser, ctx, page };
}
export async function go(page, hash) { await page.goto(page.url().split("#")[0] + hash); await page.waitForTimeout(1800); }
/** Screenshot plus automatic checks. Returns the page text. */
export async function audit(page, name, { full = true, note = "" } = {}) {
  await page.waitForTimeout(500);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: full });
  const text = await page.locator("body").innerText();
  fs.writeFileSync(`${OUT}/${name}.txt`, text);
  const found = [];
  const checks = [
    [/\b(PER|ORG|TEAM|PRJ|ACT|Q|DEC|FACT|NOTE|SRC|SER|EVT|RULE|LES)-\d+\b/, "internal id on screen"],
    [/[{}]\s*"|"\w+":\s*["\d\[{]/, "raw JSON on screen"],
    [/\b20\d\d-\d\d-\d\d\b/, "raw ISO date on screen"],
    [/\b(undefined|null|NaN|\[object Object\])\b/, "undefined/null/NaN on screen"],
    [/\b[a-z]+(\.[a-z_]+){2,}\b/, "wording key or code name on screen"],
    [/Loading…|Loading\.\.\./, "Loading text still showing"],
    [/\{[a-z_]+\}/, "unfilled {placeholder}"],
    [/Traceback|Internal Server Error|Something went wrong|That didn't work/i, "error text"],
  ];
  for (const [re, label] of checks) { const m = text.match(re); if (m) found.push(`${label}: "${text.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\n/g, " ⏎ ")}"`); }
  const geo = await page.evaluate(() => {
    const out = {};
    out.sideways = document.documentElement.scrollWidth > window.innerWidth + 1 ? `${document.documentElement.scrollWidth}>${window.innerWidth}` : "";
    const small = [];
    for (const el of document.querySelectorAll("button, a[href], input, select, [role=button], [role=tab]")) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const st = getComputedStyle(el); if (st.visibility === "hidden") continue;
      if (el.tagName === "A" && st.display === "inline") continue;
      if ((r.width < 24 || r.height < 24) && !(el.type === "checkbox" || el.type === "radio")) small.push((el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    out.small = small.slice(0, 6);
    const cut = [];
    for (const el of document.querySelectorAll("main *")) {
      if (el.children.length) continue; const st = getComputedStyle(el);
      if (st.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim().length > 3) cut.push(el.textContent.trim().slice(0, 50));
    }
    out.cut = cut.slice(0, 6);
    const empty = [...document.querySelectorAll("main button, main a")].filter(b => !b.textContent.trim() && !b.getAttribute("aria-label") && !b.getAttribute("title")).length;
    out.unnamed = empty;
    return out;
  });
  if (geo.sideways) found.push(`scrolls sideways ${geo.sideways}`);
  if (geo.small.length) found.push(`targets under 24px: ${geo.small.join("; ")}`);
  if (geo.cut.length) found.push(`text cut off: ${geo.cut.join(" | ")}`);
  if (geo.unnamed) found.push(`${geo.unnamed} buttons or links with no name`);
  if (page._errors.length) { found.push(...page._errors.splice(0).map(e => e.slice(0, 200))); }
  fs.appendFileSync(ISSUES, JSON.stringify({ name, url: page.url(), note, found }) + "\n");
  console.log(`--- ${name} (${page.url().split("#")[1] || ""})${found.length ? "\n  AUTO: " + found.join("\n  AUTO: ") : ""}`);
  return text;
}
/** The main column's text without the menu, to read a screen quickly. */
export async function mainText(page) { return (await page.locator("main").innerText().catch(() => "")).trim(); }
