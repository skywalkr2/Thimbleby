import { open, audit, go, mainText } from "./lib.mjs";
import fs from "node:fs";
const secs = ["you","ai","today","backups","appearance","links","business","lists","connections","addons","files","advanced","ai-compare"];
for (const [tag, opts] of [["d", {}], ["n", { scheme: "dark" }], ["p", { width: 390, height: 844 }]]) {
  const { browser, page } = await open(opts);
  await go(page, "#settings/you");
  if (tag === "d") {
    const nav = await page.locator("main nav a, main nav button, main [role=tab]").evaluateAll(els => els.map(e => e.textContent.trim() + " -> " + (e.getAttribute("href")||"")));
    console.log("NAV", nav);
  }
  for (const s of secs) {
    await go(page, "#settings/" + s);
    await audit(page, `b-${tag}-${s}`);
    if (tag === "d") fs.writeFileSync(`${process.env.OUT}/main-${s}.txt`, await mainText(page));
  }
  await browser.close();
}
