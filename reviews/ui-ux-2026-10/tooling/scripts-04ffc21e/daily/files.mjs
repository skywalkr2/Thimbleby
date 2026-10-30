import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#records/files");
await page.getByRole("button", { name: "Add a file" }).click(); await page.waitForTimeout(1000);
await audit(page, "f-add", { full: false });
console.log("ADD FILE:", (await page.locator("[role=dialog]").allInnerTexts()).join("\n") || (await mainText(page)));
console.log(await page.locator("[role=dialog] input, [role=dialog] select, [role=dialog] textarea").evaluateAll(els => els.map(e => e.tagName+":"+e.type+":"+(e.getAttribute("aria-label")||e.labels?.[0]?.textContent||e.placeholder||e.name).slice(0,60) + (e.tagName==="SELECT" ? " ["+[...e.options].map(o=>o.text).join("|")+"]" : ""))));
await browser.close();
