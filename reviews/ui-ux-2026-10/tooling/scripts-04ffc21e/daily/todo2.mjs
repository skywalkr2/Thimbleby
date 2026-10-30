import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#work/open");
const add = async (what, due, len, who, rep, shot) => {
  await page.getByRole("button", { name: /Add a to-do/ }).first().click(); await page.waitForTimeout(800);
  const d = page.locator("[role=dialog]");
  await d.getByLabel("What to do").fill(what);
  if (due) { await d.getByLabel("Due (optional)").fill(due); await d.getByLabel("Due (optional)").blur(); }
  if (len) await d.getByLabel("How long it takes").selectOption({ label: len });
  if (who) await d.getByLabel("Who does it").selectOption({ label: who });
  if (rep) { await d.getByLabel("Repeats").fill(rep); await d.getByLabel("Repeats").blur(); }
  await page.waitForTimeout(800);
  console.log("FORM", what.slice(0,30), "::", (await d.innerText()).replace(/\n+/g, " | ").slice(0, 600));
  if (shot) await audit(page, shot, { full: false });
  const addb = d.getByRole("button", { name: "Add", exact: true });
  if (await addb.isEnabled()) { await addb.click(); await page.waitForTimeout(1500); } else { console.log("ADD DISABLED"); await d.getByRole("button", { name: "Cancel" }).click(); }
  if (await d.count() && await d.isVisible()) { console.log("DIALOG STILL OPEN:", (await d.innerText()).slice(0,300)); await page.keyboard.press("Escape"); }
};
await add("Buy a birthday card for Mum", "", "", "", "", "");
await add("Pay the water bill", "Friday", "15 minutes", "", "", "td-d-form-due");
await add("Take the bins out", "", "", "", "every Tuesday", "td-d-form-repeat");
await add("Return Sam's ladder", "Saturday", "", "Jordan Ellis Hart", "", "");
await add("Send the guest list for Mum's party", "next Tuesday", "", "Priya Hart", "", "");
await add("Nonsense due", "blorp", "", "", "", "td-d-form-bad-due");
await add("Nonsense repeat", "", "", "", "whenever I feel like it", "td-d-form-bad-repeat");
await add("A".repeat(20) + " very long to-do " + "word ".repeat(80), "", "", "", "", "");
await go(page, "#work/open");
await audit(page, "td-d-list");
console.log(await mainText(page));
await browser.close();
