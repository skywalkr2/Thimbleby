import { createRequire } from "node:module";
const require = createRequire(process.env.WEB_DIR + "/package.json");
const { chromium } = require("playwright");
const M = process.env.M;
const b = await chromium.launch();
const jobs = [];
for (const n of ["today", "todos", "connections", "quality", "person", "setup-ai"]) {
  jobs.push([n, "light", 1440, 900], [n, "dark", 1440, 900]);
  if (n === "today" || n === "todos") jobs.push([n, "light", 390, 844]);
}
for (const [n, scheme, w, h] of jobs) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
  const p = await ctx.newPage();
  await p.goto(`file://${M}/${n}.html`); await p.waitForTimeout(300);
  // A page with a sticky footer is captured at its full height so the footer sits at the bottom, over nothing.
  if (w !== 390) { const full = await p.evaluate(() => document.documentElement.scrollHeight); if (full > h) await p.setViewportSize({ width: w, height: full }); }
  await p.screenshot({ path: `${M}/${n}-${scheme === "light" ? "day" : "night"}-${w}.png`, fullPage: false });
  await ctx.close();
}
await b.close(); console.log("rendered", jobs.length);
