import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#work/open");
await page.getByRole("button", { name: /Add a to-do/ }).first().click(); await page.waitForTimeout(1000);
await audit(page, "td-d-add-form", { full: false });
const scope = page.locator("[role=dialog]").or(page.locator("main"));
console.log((await page.locator("[role=dialog]").allInnerTexts()).join("\n") || await mainText(page));
console.log(await page.locator("[role=dialog] input, [role=dialog] select, [role=dialog] textarea, main input, main select, main textarea").evaluateAll(els => els.map(e => e.tagName+":"+e.type+":"+(e.getAttribute("aria-label")||e.labels?.[0]?.textContent||e.placeholder||e.name).slice(0,60) + (e.tagName==="SELECT" ? " ["+[...e.options].map(o=>o.text).join("|")+"]" : ""))));
await browser.close();
