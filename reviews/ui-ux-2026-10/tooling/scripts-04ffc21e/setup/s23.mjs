import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
await page.locator("main").getByRole("button", { name: "Start", exact: true }).click();
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(5000);
  const t = await mainText(page);
  console.log(`--- t+${(i+1)*5}s`, t.slice(t.indexOf("Your promises\n")+14, t.indexOf("Back\n")).replace(/\n+/g, " | ").slice(0, 600));
  if (i === 0) await audit(page, "r1-32-promises-running");
  if (!/Reading|Looking|reading…|Working/i.test(t) && i > 1) break;
}
console.log(await audit(page, "r1-33-promises-result"));
await others("r1-33-promises-result");
await browser.close();
