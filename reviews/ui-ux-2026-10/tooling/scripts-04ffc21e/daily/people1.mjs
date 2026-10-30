import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#records/people");
await page.getByRole("button", { name: "Add a person" }).click(); await page.waitForTimeout(1000);
await audit(page, "p-d-add-person", { full: false });
console.log((await page.locator("[role=dialog]").allInnerTexts()).join("\n---\n") || await mainText(page));
console.log(await page.locator("[role=dialog] input, [role=dialog] select, [role=dialog] textarea").evaluateAll(els => els.map(e => e.tagName + " " + (e.labels?.[0]?.textContent||e.getAttribute("aria-label")||e.name) + (e.tagName==="SELECT" ? " ["+[...e.options].map(o=>o.text).join("|")+"]" : ""))));
await browser.close();
