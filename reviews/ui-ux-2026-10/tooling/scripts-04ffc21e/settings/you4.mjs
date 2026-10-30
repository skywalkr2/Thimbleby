import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#settings/you");
const toast = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ");
console.log("hdr:", (await page.locator("header").innerText()).replace(/\n/g," / "));
// wrong input: empty assistant name
const an = page.getByRole("textbox", { name: "Your assistant's name" });
await an.fill(""); await an.press("Tab"); await page.waitForTimeout(1500);
console.log("empty name toast:", await toast());
await audit(page, "you-empty-assistant", { full: false });
console.log("value now:", await an.inputValue());
await an.fill("X".repeat(120)); await an.press("Tab"); await page.waitForTimeout(1500);
console.log("long name toast:", await toast());
await audit(page, "you-long-assistant", { full: false });
await go(page, "#today"); await audit(page, "you-long-assistant-today", { full: false });
await go(page, "#settings/you");
await page.getByRole("button", { name: "Reset: Your assistant's name" }).click(); await page.waitForTimeout(1500);
console.log("reset toast:", await toast());
console.log("value after reset:", await page.getByRole("textbox", { name: "Your assistant's name" }).inputValue());
// undo the reset
const undo = page.getByRole("button", { name: "Undo" }).last();
await undo.click(); await page.waitForTimeout(1500);
console.log("after undo:", await page.getByRole("textbox", { name: "Your assistant's name" }).inputValue(), "|", await toast());
await page.getByRole("textbox", { name: "Your assistant's name" }).fill("Penny"); await page.keyboard.press("Tab"); await page.waitForTimeout(1500);
// your name empty
const yn = page.getByRole("textbox", { name: "Your name" });
await yn.fill(""); await yn.press("Tab"); await page.waitForTimeout(1500);
console.log("empty your name:", await toast(), "| val:", await yn.inputValue());
await audit(page, "you-empty-yourname", { full: false });
await page.reload(); await page.waitForTimeout(2500);
console.log("your name after reload:", await page.getByRole("textbox", { name: "Your name" }).inputValue());
// bad time zone
const tz = page.locator("[id='setting-workspace.user.timezone']");
await tz.fill("Narnia"); await tz.press("Tab"); await page.waitForTimeout(1500);
console.log("bad tz:", await toast(), "| val:", await tz.inputValue());
await audit(page, "you-bad-tz", { full: false });
await tz.fill("Paris"); await page.waitForTimeout(700);
console.log("paris opts:", await page.evaluate(() => [...document.querySelectorAll("[role=option]")].map(o => o.textContent)));
await tz.fill("Sydney"); await page.waitForTimeout(700);
console.log("sydney opts:", await page.evaluate(() => [...document.querySelectorAll("[role=option]")].map(o => o.textContent)));
await tz.fill("Eastern"); await page.waitForTimeout(700);
console.log("eastern opts:", await page.evaluate(() => [...document.querySelectorAll("[role=option]")].map(o => o.textContent)));
await tz.fill("Toronto"); await page.waitForTimeout(700);
console.log("toronto opts:", await page.evaluate(() => [...document.querySelectorAll("[role=option]")].map(o => o.textContent)));
await page.keyboard.press("Escape");
await browser.close();
