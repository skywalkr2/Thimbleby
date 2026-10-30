import { open, audit, go, mainText, info } from "./lib.mjs";
import fs from "node:fs";
for (const [tag, opts] of [["d", { scheme: "light" }], ["n", { scheme: "dark" }], ["p", { width: 390, height: 844 }]]) {
  const { browser, page } = await open(opts);
  for (const h of ["quality", "handover", "styleguide"]) {
    await go(page, "#" + h); await page.waitForTimeout(1500);
    await audit(page, `adm-${tag}-${h}`);
    if (tag === "d") fs.writeFileSync(`${process.env.OUT}/adm-${h}.txt`, await mainText(page));
  }
  await browser.close();
}
