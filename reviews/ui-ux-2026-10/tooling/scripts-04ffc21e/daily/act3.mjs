import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
await go(page, "#today");
const S = async (name) => { await page.waitForTimeout(1300); await audit(page, name, { full: false }); };
const toasts = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" || ");
await page.getByRole("button", { name: "Review & copy" }).click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: "Copy message" }).last().click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: "Mark sent" }).last().click(); await S("a-mark-sent");
console.log("MARK SENT toasts:", await toasts());
console.log((await mainText(page)).slice(0, 1000));
const undo = page.getByRole("button", { name: "Undo" }).last();
if (await undo.count()) { await undo.click(); await S("a-mark-sent-undo"); console.log("UNDO toasts:", await toasts()); console.log((await mainText(page)).slice(0, 800)); }
await browser.close();
