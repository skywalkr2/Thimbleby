import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({ width: 390, height: 844 });
await go(page, "#today");
for (const n of ["Your day", "More", "Ask"]) {
  await page.getByRole("button", { name: n, exact: true }).or(page.getByRole("link", { name: n, exact: true })).last().click(); await page.waitForTimeout(1200);
  await audit(page, `ph-${n.replace(" ", "")}`, { full: false });
  console.log(`== ${n}:`, (await page.locator("[role=dialog], [role=menu]").allInnerTexts()).join("\n").slice(0, 800) || (await mainText(page)).slice(0, 400));
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
}
await page.getByRole("button", { name: /Hand something in/ }).last().click(); await page.waitForTimeout(1200);
await audit(page, "ph-handin", { full: false });
await page.keyboard.press("Escape");
await page.getByRole("button", { name: /App status|Connected/ }).first().click(); await page.waitForTimeout(800);
await audit(page, "ph-status", { full: false });
await page.keyboard.press("Escape");
await page.getByRole("button", { name: /Change appearance/ }).click(); await page.waitForTimeout(800);
await audit(page, "ph-usermenu", { full: false });
console.log("USERMENU:", (await page.locator("[role=menu]").allInnerTexts()).join(" | "));
await browser.close();
