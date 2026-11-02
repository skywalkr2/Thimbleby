// Renders the 4.6 mockups. Env: WEB_DIR (repo/web, for Playwright), M (the mockups-46 folder), PAGES (comma list).
// Copy the two brand fonts into M/fonts while rendering; they are not committed.
import { createRequire } from "node:module";
const require = createRequire(process.env.WEB_DIR + "/package.json");
const { chromium } = require("playwright");
const M = process.env.M; const pages = process.env.PAGES.split(",");
const b = await chromium.launch(); let n = 0;
for (const p of pages) for (const [scheme, w] of [["light", 1440], ["dark", 1440], ["light", 1024], ["light", 390], ["dark", 390]]) {
  if (p.endsWith("-states") && w !== 1440) continue;
  const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, colorScheme: scheme });
  const pg = await ctx.newPage(); await pg.goto(`file://${M}/${p}.html`); await pg.waitForTimeout(400);
  if (w === 390) await pg.screenshot({ path: `${M}/png/${p}-${scheme === "light" ? "day" : "night"}-390-screen.png` });
  await pg.addStyleTag({ content: ".tabbar,.wfoot{position:static!important}" });
  await pg.screenshot({ path: `${M}/png/${p}-${scheme === "light" ? "day" : "night"}-${w}.png`, fullPage: true }); await ctx.close(); n++;
}
await b.close(); console.log("rendered", n);
