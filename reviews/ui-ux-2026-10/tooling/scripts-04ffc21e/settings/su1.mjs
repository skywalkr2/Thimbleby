import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#setup");
console.log((await mainText(page)).slice(0, 1800));
await audit(page, "setup-ai-revisit");
await browser.close();
