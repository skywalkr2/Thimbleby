import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page,"#setup");
await page.getByRole("button", { name: "Set them separately" }).click().catch(async()=>{await page.getByText("Set them separately").click()});
await page.waitForTimeout(800);
await audit(page, "s11-mail-separately");
console.log(await mainText(page));
console.log((await page.locator("main input[type=checkbox]").evaluateAll(els=>els.map(e=>`${e.id} ${e.checked} ${e.closest('fieldset,section,div')?.innerText.slice(0,60).replace(/\n/g,'|')}`))).join("\n"));
await browser.close();
