import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await page.getByRole("button", { name: "Finish later" }).click();
await page.waitForTimeout(2000);
await audit(page, "skip-01-after-finish-later");
console.log(await page.locator("body").innerText());
for (const s of ["you","ai","today","backups","appearance","links","business","lists","connections","addons","files","advanced"]) {
  await go(page, "#settings/" + s);
  const t = await audit(page, "skip-settings-" + s);
  console.log("=====", s, "\n", (await mainText(page)).slice(0, 1500));
}
await browser.close();
