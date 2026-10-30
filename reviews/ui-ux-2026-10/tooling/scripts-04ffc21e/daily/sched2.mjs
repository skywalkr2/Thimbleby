import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#schedule");
console.log(await page.locator("main button").evaluateAll(els => els.slice(0,20).map(e => (e.getAttribute("aria-label")||"") + " / " + e.textContent.trim())));
const prev = page.locator("main button").nth(1);
await page.getByRole("button", { name: "Add to schedule" }).click(); await page.waitForTimeout(1000);
await audit(page, "t-d-sched-add", { full: false });
console.log((await page.locator("[role=dialog]").allInnerTexts()).join("\n---\n"));
// try saving empty
const save = page.locator("[role=dialog]").getByRole("button").last();
console.log("last dlg btn:", await save.textContent(), await save.isEnabled());
await browser.close();
