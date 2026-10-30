import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
const toasts = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" || ");
const line = (t) => page.locator("[data-queue-line]").filter({ hasText: t }).first();
// Look over the school-run to-dos
await line("Look over 4 to-dos").getByRole("button", { name: "Look over", exact: true }).click(); await page.waitForTimeout(1200);
await audit(page, "a4-lookover-4", { full: false });
const insp = page.locator("[data-queue-line]").filter({ hasText: "Look over 4 to-dos" }).first();
console.log("LOOKOVER4:", (await insp.innerText()).replace(/\n+/g, " | "));
console.log(await insp.locator("button, a, select").evaluateAll(els => els.map(e => (e.getAttribute("aria-label")||e.textContent.trim()).slice(0,50))));
// Not right on the babysitter one
const nr = insp.getByRole("button", { name: "Not right" }).first();
await nr.click(); await page.waitForTimeout(1200);
await audit(page, "a4-notright", { full: false });
console.log("NOT RIGHT:", (await insp.innerText()).replace(/\n+/g, " | ").slice(0, 1500));
await browser.close();
