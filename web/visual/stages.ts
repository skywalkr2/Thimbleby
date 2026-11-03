// The stages of each server: the state it is in while pages are captured. A stage's setup runs once, before the captures of
// that stage, and records in `seed` what the drives need. Stages only add to a server, so they run in this order.
import type { BrowserContext } from "playwright-core";
import { api, LONG } from "./drive.ts";
import { chromiumSignIn } from "./signin.ts";

export type ServerName = "accounts" | "sides";
export type Stage = "fresh" | "signed-in" | "failing" | "empty" | "seeded" | "bulk";

export const STAGE_ORDER: Record<ServerName, Stage[]> = {
  // fresh: nothing signed in, the walkthrough closed so the app's own menus are there; signed-in: three accounts read;
  // failing: the third account's sign-in has been withdrawn.
  accounts: ["fresh", "signed-in", "failing"],
  // empty: five sides and nothing else; seeded: a few people, to-dos and a long-named person; bulk: over a hundred to-dos.
  sides: ["empty", "seeded", "bulk"],
};

export interface StageEnv {
  context: BrowserContext;
  base: string;
  token: string;
  fake: string | null;
  seed: Record<string, any>;
}

const dayOffset = (days: number): string => {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
};

/** Titles in other scripts and of unusual length, for the large lists: made up, nothing from a real source. */
const OTHER_LANGUAGES = [
  "Rechnung für die Druckerei prüfen",
  "Réserver la salle pour jeudi",
  "Llamar al proveedor de telas",
  "Wyslać fakturę do klienta",
  "請款單寄給客戶",
  "Позвонить поставщику ткани",
  "تأكيد موعد التسليم",
  "Memesan bunga untuk acara",
];
const LONG_TITLE =
  "Print, sign and mail the unclaimed property claim forms to the State Treasurer, P.O. Box 1004, before the end of the month and keep a copy for the file";

export async function setUp(server: ServerName, stage: Stage, env: StageEnv): Promise<void> {
  const key = `${server}/${stage}`;
  switch (key) {
    case "accounts/fresh": {
      // Close the walkthrough for good, as a person who chose Finish later; it opens again on request (#setup).
      const page = await env.context.newPage();
      await page.goto(`${env.base}?token=${env.token}`);
      await page.getByRole("heading", { level: 1, name: "Getting started" }).waitFor(LONG);
      await page.getByRole("button", { name: "Finish later" }).click();
      await page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/ }).waitFor(LONG);
      await page.close();
      const info = (await (await fetch(`${env.fake}/__e2e/accounts`)).json()) as { accounts: Array<{ address: string }> };
      env.seed.addresses = info.accounts.map((a) => a.address);
      env.seed.aiBase = ((await (await fetch(`${env.fake}/__e2e/info`)).json()) as { ai_base_url: string }).ai_base_url;
      return;
    }
    case "accounts/signed-in": {
      const page = await env.context.newPage();
      await page.goto(`${env.base}?token=${env.token}#today`);
      await page.evaluate(() => {
        window.location.hash = "settings/connections";
      });
      await page.getByRole("heading", { level: 2, name: "Connections" }).waitFor(LONG);
      for (const [n, address] of (env.seed.addresses as string[]).entries()) await chromiumSignIn(page, address, n === 0);
      // Let the first reads of the three accounts land before anything is captured.
      await page.waitForTimeout(4000);
      await page.close();
      return;
    }
    case "accounts/failing": {
      // The service withdraws the third account's sign-in; each of its parts is read once, so the app finds out.
      const studio = (env.seed.addresses as string[])[2];
      await fetch(`${env.fake}/__e2e/failing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: 3, how: "expired" }) });
      const page = await env.context.newPage();
      await page.goto(`${env.base}?token=${env.token}#today`);
      await page.evaluate(() => {
        window.location.hash = "settings/connections";
      });
      await page.getByRole("heading", { level: 2, name: "Connections" }).waitFor(LONG);
      for (const label of [`Your inbox, ${studio}`, `Your calendar, ${studio}`]) {
        const row = page.getByRole("table", { name: "Connections" }).getByRole("row", { name: label });
        await row.getByRole("button", { name: `More actions for ${label}` }).click();
        await page.getByRole("menuitem", { name: "Read now" }).click();
      }
      await page.getByRole("list", { name: "Accounts that need you to sign in" }).waitFor(LONG);
      env.seed.failing = studio;
      await page.close();
      return;
    }
    case "sides/empty": {
      const seeded = (await (await fetch(`${env.base}__e2e/many-sides`)).json()) as { names: string[]; ids: string[] };
      env.seed.sides = seeded.names;
      const people = await api<Array<{ id: string; is_pm: boolean }>>(env.base, env.token, "people");
      env.seed.me = people.find((p) => p.is_pm)!.id;
      return;
    }
    case "sides/seeded": {
      const me = env.seed.me as string;
      const make = (body: object) => api<{ id: string }>(env.base, env.token, "people", { method: "POST", body });
      const pat = await make({ full_name: "Pat Sample", role: "Printer", how_to_reach: { email: ["pat.sample@example.com"] } });
      const long = await make({ full_name: "Bartholomew Featherstonehaugh-Winterbottom" });
      const fresh = await make({ full_name: "Robin Placeholder" });
      env.seed.people = { pat: pat.id, long: long.id, fresh: fresh.id };
      const todos: Array<{ text: string; when?: string }> = [
        { text: "Pay the deposit", when: dayOffset(0) },
        { text: "Send the headcount", when: dayOffset(0) },
        { text: "Book the van for the move", when: dayOffset(2) },
        { text: "Order linen samples", when: dayOffset(5) },
        { text: "Renew the parking permit", when: dayOffset(12) },
        { text: "Call Pat Sample about the proofs" },
        { text: LONG_TITLE, when: dayOffset(3) },
        { text: OTHER_LANGUAGES[4], when: dayOffset(1) },
      ];
      for (const todo of todos) await api(env.base, env.token, "todos", { method: "POST", body: { ...todo, owners: [me] } });
      return;
    }
    case "sides/bulk": {
      const me = env.seed.me as string;
      for (let n = 1; n <= 120; n += 1) {
        const text = `${OTHER_LANGUAGES[n % OTHER_LANGUAGES.length]} (${n})`;
        await api(env.base, env.token, "todos", { method: "POST", body: { text, when: dayOffset(n % 9), owners: [me] } });
      }
      return;
    }
    default:
      return;
  }
}
