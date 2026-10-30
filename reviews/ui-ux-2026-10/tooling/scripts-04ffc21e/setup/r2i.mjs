import { open, audit, mainText } from "./lib.mjs";
const { browser, page } = await open({ path: "#today" });
const lines = page.locator("[data-queue-line]");
console.log("lines:", (await lines.allInnerTexts()).map(s=>s.replace(/\n+/g," | ")));
const sent = lines.filter({ hasText: "sent mail" }).first();
await sent.getByRole("button", { name: /Look over/ }).click(); await page.waitForTimeout(2000);
console.log((await page.locator("body").innerText()).slice(0, 3000));
await audit(page, "r2-12-today-sent-lookover");
await browser.close();
