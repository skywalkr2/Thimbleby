import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
const toasts = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" || ");
const item = async (todo, label, shot) => {
  await go(page, "#work/open");
  await page.getByRole("button", { name: `More actions for ${todo}` }).click(); await page.waitForTimeout(600);
  await page.getByRole("menuitem", { name: new RegExp("^" + label) }).first().click(); await page.waitForTimeout(1300);
  await audit(page, shot, { full: false });
  const dl = (await page.locator("[role=dialog]").allInnerTexts()).join("\n---\n");
  console.log(`\n##### ${label} on ${todo}\nDIALOG: ${dl.slice(0, 1200)}\nTOASTS: ${await toasts()}`);
  if (!dl) console.log("ROW NOW:", (await page.locator("main").innerText()).split(todo)[1]?.slice(0, 300));
  return page.locator("[role=dialog]");
};
let d;
d = await item("Pay the water bill", "Add a note", "td-m-addnote");
if (await d.count()) { const ta = d.locator("textarea, input[type=text]").first(); await ta.fill("Account number is on the fridge."); await d.getByRole("button").last().click(); await page.waitForTimeout(1200); console.log("after note toasts:", await toasts()); }
d = await item("Pay the water bill", "Edit", "td-m-edit");
if (await d.count()) { console.log(await d.locator("input,select,textarea").evaluateAll(els=>els.map(e=>e.tagName+":"+(e.labels?.[0]?.textContent||e.getAttribute("aria-label"))+"="+e.value))); await page.keyboard.press("Escape"); }
d = await item("Pay the water bill", "Reassign", "td-m-reassign"); await page.keyboard.press("Escape");
d = await item("Pay the water bill", "Change reminder", "td-m-reminder"); await page.keyboard.press("Escape");
d = await item("Pay the water bill", "Change this", "td-m-changethis"); await page.keyboard.press("Escape");
d = await item("Take the bins out", "Pause", "td-m-pause");
d = await item("Buy a birthday card for Mum", "Hand to the assistant", "td-m-hand"); await page.keyboard.press("Escape");
await browser.close();
