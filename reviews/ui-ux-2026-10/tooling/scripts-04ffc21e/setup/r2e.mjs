import { open, audit, mainText, info } from "./lib.mjs";
import { aiFake } from "./ai_fake.mjs";
const I = await info();
const { browser, ctx, page } = await open({ path: "#setup" });
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(2500);
await aiFake(page, I);
console.log("on:", (await mainText(page)).slice(0, 30));
const row = page.locator('[data-service="journey-mail"]');
await row.getByRole("button", { name: /^Connect/ }).click();
for (let i = 0; i < 40; i++) { await page.waitForTimeout(2500); if (await row.getByRole("button", { name: /^Sign in/ }).count()) break; }
console.log("restart done; row:", (await row.innerText()).replace(/\n+/g, " | "));
ctx.on("page", p => console.log("popup:", p.url().slice(0, 60)));
await row.getByRole("button", { name: /^Sign in/ }).click();
for (let i = 0; i < 40; i++) { await page.waitForTimeout(3000); if (await row.getAttribute("data-signed-in", { timeout: 1000 }).catch(() => null) !== null) break; if (!(await row.count())) break; }
await page.waitForTimeout(3000);
const t = await mainText(page); console.log("== MAIL WITH SIDES\n", t.slice(t.indexOf("Mail and calendar\n")));
await audit(page, "r2-07-mail-connected-sides");
await browser.close();
