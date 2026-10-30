import { open, audit, go, mainText, info } from "./lib.mjs";
const inf = await info();
const { browser, ctx, page } = await open();
await go(page, "#settings/connections");
const form = async () => (await mainText(page)).split("What to read").slice(1).join("§").split("Your inbox")[0];
const flds = async () => page.locator("main input, main select, main textarea").evaluateAll(b => b.filter(x => !["radio","search"].includes(x.type)).map(x => `${x.type} id=${x.id} "${(document.querySelector(`label[for="${x.id}"]`)?.innerText || x.closest("label")?.innerText || x.getAttribute("aria-label")||"").trim().slice(0,50)}" val=${x.value}`));
const errs = async () => (await page.locator("main [role=alert]").allInnerTexts()).join(" ; ");
const bodyToasts = async () => ((await page.locator("body").innerText()).match(/\n(Added[^\n]*|Couldn't[^\n]*|[^\n]*isn't allowed[^\n]*|[^\n]*can't[^\n]*)/g) || []).join(" | ");
// folder
await page.getByRole("button", { name: "Add a connection" }).click(); await page.waitForTimeout(1000);
await page.getByRole("radio", { name: "A folder", exact: true }).click(); await page.waitForTimeout(1200);
console.log("FOLDER FORM:", await form()); console.log(await flds());
await audit(page, "cn-folder-form");
const pathInput = page.locator("main input[id$='-setting-path'], main input[id$='-setting-folder'], main input[id$='-setting-root']").first();
console.log("path inputs:", await pathInput.count());
if (await pathInput.count()) {
  await pathInput.fill("/no/such/folder/here");
  await page.getByRole("button", { name: "Add connection" }).click(); await page.waitForTimeout(3000);
  console.log("bad folder:", await errs(), "|", await bodyToasts());
  await audit(page, "cn-folder-bad");
  await pathInput.fill(inf.source_folder).catch(()=>{});
  await page.getByRole("button", { name: "Add connection" }).click().catch(()=>{}); await page.waitForTimeout(5000);
  console.log("good folder:", await errs(), "|", await bodyToasts());
  console.log("LIST:", (await mainText(page)).split("Your sent mail")[1]?.replace(/\n+/g, " / ").slice(0, 800));
  await audit(page, "cn-folder-good");
}
await browser.close();
