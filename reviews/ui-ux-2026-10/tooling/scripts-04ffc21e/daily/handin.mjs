import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
const items = [
 ["Someone else's", "From: Priya Hart <priya.hart@example.org>\nTo: Jordan\nSubject: Mum's 70th - can you book the restaurant?\n\nHi Jordan,\nCould you book a table for 8 at Lantern House for Mum's 70th on Saturday November 14? Please do it by Friday November 6, they fill up fast. Also can you let me know if Uncle Ravi is coming?\nThanks!\nPriya", "", "Normal"],
 ["Mine", "Told Sam Okoro next door I'd give his ladder back by Saturday. Also need to renew the car insurance before November 20.", "", "Normal"],
 ["Someone else's", "From: orders@shop.example.com\nSubject: Your order has shipped\n\nHi Jordan, your order of a Cordless Kettle (order number 4471-2209) has shipped and will arrive Thursday, October 29 between 9am and 1pm. Someone needs to sign for it. Track your parcel on our site.", "save the delivery date", "Normal"],
 ["Someone else's", "Invitation: Parent-teacher conference\nWhen: Tuesday, November 3, 2026 4:30pm – 5:00pm\nWhere: Oakwood Elementary, Room 12\nWho: Ms. Delgado (teacher), Jordan Ellis Hart\nPlease reply to confirm you can attend.", "", "Private"],
];
let i = 0;
for (const [who, text, todo, vis] of items) {
  i++;
  await page.getByRole("button", { name: /Hand something in/ }).first().click(); await page.waitForTimeout(800);
  const d = page.locator("[role=dialog]");
  await d.getByLabel("Paste or type it here").fill(text);
  await d.getByRole("button", { name: who, exact: true }).or(d.getByRole("radio", { name: who, exact: true })).or(d.getByRole("tab", { name: who, exact: true })).first().click();
  if (todo) await d.getByLabel(/Anything to do with it/).fill(todo);
  await d.getByLabel("Who may see this?").selectOption({ label: vis });
  await page.waitForTimeout(400);
  if (i === 1) await audit(page, "h-d-handin-filled", { full: false });
  await d.getByRole("button", { name: "Hand in" }).click(); await page.waitForTimeout(2500);
  await audit(page, `h-d-after-handin-${i}`, { full: false });
  console.log("AFTER", i, (await page.locator("body").innerText()).slice(0, 300).replace(/\n+/g, " | "));
}
console.log(await mainText(page));
await browser.close();
