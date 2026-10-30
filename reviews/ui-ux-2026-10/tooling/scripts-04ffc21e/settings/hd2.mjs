import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open({ scheme: "light" });
await go(page, "#settings/you");
await page.getByRole("button", { name: "Help" }).first().click(); await page.waitForTimeout(600);
await page.getByRole("menuitem", { name: "Write feedback" }).click(); await page.waitForTimeout(1200);
console.log("WRITE FEEDBACK:", (await page.locator("[role=dialog]").allInnerTexts()).join(" || "));
await audit(page, "hd-write-feedback", { full: false });
const ta = page.locator("[role=dialog] textarea");
if (await ta.count()) {
  await page.locator("[role=dialog]").getByRole("button", { name: /Send|Save|Copy/ }).first().click().catch(()=>console.log("send disabled when empty"));
  await ta.fill("The settings page is hard to find things in."); 
  const btns = await page.locator("[role=dialog] button").evaluateAll(b => b.map(x => x.textContent.trim() + (x.disabled ? "(disabled)" : "")));
  console.log("btns:", btns);
  await page.locator("[role=dialog]").getByRole("button", { name: /Send|Save/ }).first().click().catch(()=>{}); await page.waitForTimeout(2000);
  console.log("after send:", (await page.locator("body").innerText()).match(/\n[^\n]*(feedback|Thanks|sent|Saved)[^\n]*/gi));
  await audit(page, "hd-write-feedback-sent", { full: false });
}
await browser.close();
{
const { browser, page } = await open({ width: 390, height: 844 });
await go(page, "#settings/you");
console.log("phone header:", (await page.locator("header").innerText()).replace(/\n/g, " / "));
console.log("phone bottom:", await page.locator("nav").last().innerText().then(t => t.replace(/\n/g, " / ")));
await page.getByRole("button", { name: "More" }).last().click().catch(()=>console.log("no More")); await page.waitForTimeout(800);
console.log("phone More:", (await page.locator("[role=dialog], [role=menu]").allInnerTexts()).join(" || "));
await audit(page, "hd-phone-more", { full: false });
await browser.close();
}
