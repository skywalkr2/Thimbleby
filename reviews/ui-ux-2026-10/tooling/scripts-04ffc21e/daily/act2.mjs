import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
await go(page, "#today");
const S = async (name) => { await page.waitForTimeout(1300); await audit(page, name, { full: false }); };
const toasts = async () => (await page.locator("[role=status], [role=alert], [data-toast]").allInnerTexts().catch(()=>[])).join(" || ");
// Remind me
const rm = page.getByRole("button", { name: "Remind me" });
if (await rm.count()) { await rm.first().click(); await S("a-remind-me"); console.log("REMIND toasts:", await toasts()); console.log((await mainText(page)).slice(0, 1500)); }
// Review & copy -> Copy message
await go(page, "#today");
await page.getByRole("button", { name: "Review & copy" }).click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: "Copy message" }).last().click(); await S("a-copy-message");
console.log("COPY toasts:", await toasts());
console.log("clipboard:", await page.evaluate(() => navigator.clipboard.readText()).catch(e => "ERR " + e.message));
console.log((await mainText(page)).slice(0, 1800));
await browser.close();
