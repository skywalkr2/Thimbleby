import { open, audit, mainText, info, others } from "./lib.mjs";
import { aiFake } from "./ai_fake.mjs";
const I = await info();
const { browser, page } = await open();
await aiFake(page, I);
console.log(await audit(page, "r1-19-mail-day"));
await others("r1-19-mail");
await browser.close();
