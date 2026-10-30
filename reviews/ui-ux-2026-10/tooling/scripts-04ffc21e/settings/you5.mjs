import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#settings/you");
const toasts = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ");
const an = page.getByRole("textbox", { name: "Your assistant's name" });
console.log("start val:", await an.inputValue());
await an.fill("Penny"); await an.press("Tab"); await page.waitForTimeout(1500);
console.log("toasts:", await toasts());
await page.getByRole("button", { name: "Reset: Your assistant's name" }).click(); await page.waitForTimeout(1500);
console.log("after reset val:", await an.inputValue(), "| toasts:", await toasts());
await audit(page, "you-reset", { full: false });
const undos = page.getByRole("button", { name: /^Undo/ });
console.log("undo buttons:", await undos.count(), await undos.evaluateAll(b => b.map(x => x.closest("[role=status],[role=alert],div")?.innerText.slice(0,80))));
await undos.last().click(); await page.waitForTimeout(1500);
console.log("after undo val:", await an.inputValue(), "| toasts:", await toasts());
await page.reload(); await page.waitForTimeout(2500);
console.log("after reload val:", await page.getByRole("textbox", { name: "Your assistant's name" }).inputValue());
// ctrl+z?
await browser.close();
