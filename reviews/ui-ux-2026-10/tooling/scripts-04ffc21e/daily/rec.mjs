import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
const visit = async (from, linkName, shot) => {
  await go(page, from);
  await page.getByRole("link", { name: linkName }).first().click(); await page.waitForTimeout(1800);
  await audit(page, shot);
  console.log(`\n===== ${shot} ${page.url().split("#")[1]}\n` + (await mainText(page)).slice(0, 2200));
  console.log("BTNS:", await page.locator("main button, main a").evaluateAll(els => els.map(e => (e.getAttribute("aria-label")||e.textContent.trim()).slice(0,40)).filter(Boolean)));
};
await visit("#records/project/PRJ-1", "Pick up the dry cleaning.", "r-todo");
await visit("#records/project/PRJ-1", "We skip the gym membership this year.", "r-fact");
await visit("#records/project/PRJ-1", "from you, Oct 28", "r-fact-source");
await visit("#records/project/PRJ-1", "from Priya Hart's email, Oct 28", "r-email-source");
await browser.close();
