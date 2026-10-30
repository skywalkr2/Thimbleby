import { open, audit, go, mainText, info } from "./lib.mjs";
import fs from "node:fs";
const { browser, ctx, page } = await open({ scheme: "light" });
await go(page, "#settings/advanced");
console.log(await page.evaluate(() => { const el = [...document.querySelectorAll("main *")].find(e => e.textContent.trim() === "What the assistant learns" && e.children.length === 0); return el ? el.outerHTML + " parent: " + el.parentElement.outerHTML.slice(0, 300) : "none"; }));
for (const name of ["What the assistant learns", "Follow-ups and reminders", "Filing", "Mail", "Meetings"]) {
  await page.locator("main").getByText(name, { exact: true }).first().click(); await page.waitForTimeout(800);
}
await audit(page, "adv-all-open");
const t = (await mainText(page)).split("Advanced\n").slice(-1)[0].replace(/\n(\d\d:\d\d\n)+/g, "\n[times]\n");
fs.writeFileSync(process.env.OUT + "/adv-text.txt", t);
console.log(t.slice(0, 12000));
console.log(await page.locator("main input, main select").evaluateAll(i => i.map(x => `${x.type} ${x.id} = ${x.value}`)));
await browser.close();
