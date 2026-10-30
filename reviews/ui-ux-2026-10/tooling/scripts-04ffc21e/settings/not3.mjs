import { open, audit, go, mainText } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#settings/today");
const sels = page.locator("main select");
console.log("selects:", await sels.evaluateAll(s => s.map(x => (x.getAttribute("aria-label")||x.id) + "=" + x.value)));
// working hours: end before start
const wh = await sels.evaluateAll(s => s.map(x => x.getAttribute("aria-label")||x.id));
await sels.nth(2).selectOption("18:00"); await page.waitForTimeout(1200); console.log("start 18:00:", await toasts(page));
await sels.nth(3).selectOption("08:00"); await page.waitForTimeout(1200); console.log("end 08:00:", await toasts(page));
await audit(page, "not-wh-backwards", { full: false });
await sels.nth(0).selectOption({ label: "Saturday" }); await page.waitForTimeout(1200); console.log("first Sat:", await toasts(page));
await sels.nth(1).selectOption({ label: "Wednesday" }); await page.waitForTimeout(1200); console.log("last Wed:", await toasts(page));
await sels.nth(4).selectOption("07:00"); await page.waitForTimeout(1200); console.log("quiet 7-7:", await toasts(page));
await audit(page, "not-wh-odd", { full: false });
await page.reload(); await page.waitForTimeout(2500);
console.log("after reload:", await page.locator("main select").evaluateAll(s => s.map(x => x.value).slice(0, 6)));
// reset all back
for (const r of await page.getByRole("button", { name: /^Reset/ }).all()) { await r.click().catch(()=>{}); await page.waitForTimeout(800); }
console.log("after resets:", await page.locator("main select").evaluateAll(s => s.map(x => x.value).slice(0, 6)), await toasts(page));
// reminders radios
for (const name of [/In the app's calendar/, /In my calendar/, /To my mail/]) {
  await page.getByRole("radio", { name }).click(); await page.waitForTimeout(1500);
  const sec = (await mainText(page)).split("Where reminders reach you when the app isn't open")[1]?.split("Ways to get a notice")[0];
  console.log("RADIO", name, "=>", sec?.replace(/\n+/g," / ").slice(0, 700), "| toasts:", await toasts(page));
  await audit(page, "not-radio-" + String(name).replace(/\W/g, ""), { full: false });
  const dlg = page.locator("[role=dialog]");
  if (await dlg.count()) { console.log("DIALOG:", (await dlg.innerText()).slice(0, 800)); await page.keyboard.press("Escape"); }
}
// brief off
await page.getByRole("checkbox", { name: "Open Today with the brief" }).uncheck(); await page.waitForTimeout(1500);
await go(page, "#today"); const tt = await mainText(page); console.log("brief on today?", /Morning brief|Evening wrap/.test(tt));
await go(page, "#settings/today");
await page.getByRole("checkbox", { name: "Open Today with the brief" }).check(); await page.waitForTimeout(1500);
await go(page, "#today"); console.log("brief back?", /Morning brief|Evening wrap/.test(await mainText(page)));
await browser.close();
