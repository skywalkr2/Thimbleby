import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(1500);
const toast = async () => (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
const seg = (t, a, n=1500) => { const i = t.indexOf(a); return i<0? "(not found)": t.slice(i, i+n); };
for (const [name, txt] of [["cal","Your calendar"],["sent","Your sent mail"],["draft","Draft new text"]]) {
  const ln = page.locator("[data-queue-line]", { hasText: txt });
  await ln.getByRole("button", { name: "Look over" }).click(); await page.waitForTimeout(2000);
  await audit(page, `t26-lookover-${name}`);
  console.log(`=== ${name}\n`, seg(await mainText(page), txt, 1200).split("Review\n")[0]);
  await go(page, "#today");
}
await browser.close();
