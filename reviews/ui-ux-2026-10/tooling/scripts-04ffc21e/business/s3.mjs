import { open, audit, go, mainText, info } from "./lib.mjs";
const I = await info();
const { browser, page } = await open();
const t = await mainText(page);
if (!(await page.locator("#work-job-name").count())) { await page.getByLabel("A job").check(); await page.getByLabel("My own business").check(); await page.waitForTimeout(500); }
await page.locator("#work-job-name").fill("Northwind Clinic");
await page.locator("#work-business-1-name").fill("Calloway Upholstery");
await page.locator("#work-business-1-about").fill("I reupholster chairs and sofas from a small workshop.");
await page.locator("#work-business-1-works-on").fill("Mrs Hale's wingback chair\nCafe booth seating\nWorkshop move");
if (!(await page.locator("#work-business-1-group-name").isVisible())) await page.getByText("Do some of these belong together").click();
await page.waitForTimeout(500);
await page.locator("#work-business-1-group-name").fill("Customer jobs");
const boxes = page.locator("input[type=checkbox]");
console.log("boxes", await boxes.count());
// tick first two "in" boxes
const ins = page.getByText("in Customer jobs");
await ins.nth(0).click(); await ins.nth(1).click();
await page.waitForTimeout(300);
await audit(page, "s05-whatfor-filled");
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(1500);
await audit(page, "s06-ai");
console.log(await mainText(page));
await browser.close();
