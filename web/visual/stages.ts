// The stages of each server: the state it is in while pages are captured. A stage's setup runs once, before the captures of
// that stage, and records in `seed` what the drives need. Stages only add to a server, so they run in this order.
import type { BrowserContext } from "playwright-core";
import { api, LONG } from "./drive.ts";
import { chromiumSignIn } from "./signin.ts";

export type ServerName = "accounts" | "sides" | "clear" | "demo";
export type Stage = "fresh" | "signed-in" | "failing" | "empty" | "seeded" | "heard-from" | "filled" | "bulk" | "done" | "demo";

export const STAGE_ORDER: Record<ServerName, Stage[]> = {
  // fresh: nothing signed in, the walkthrough closed so the app's own menus are there; signed-in: three accounts read;
  // failing: the third account's sign-in has been withdrawn.
  accounts: ["fresh", "signed-in", "failing"],
  // empty: five sides and nothing else; seeded: a few people, to-dos and a long-named person; filled: two organizations, one with a very long name (the inventory); bulk: over a hundred to-dos.
  // heard-from: the seeded printer has sent a file and has a to-do waiting on them, so their page has the Files card and Draft a message.
  sides: ["empty", "seeded", "heard-from", "filled", "bulk"],
  // done: setup finished and nothing waiting (the server's own seed; nothing is added here).
  clear: ["done"],
  // demo: the browser tests' own demo workspace with a second stand-in account: it has add-on lists, an installed add-on and two
  // AI accounts to compare, which the other servers (a workspace made by `cockpit init`) do not.
  demo: ["demo"],
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
      await fetch(`${env.fake}/__e2e/failing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: 3, how: "expired", part: "all" }) });
      const page = await env.context.newPage();
      await page.goto(`${env.base}?token=${env.token}#today`);
      await page.evaluate(() => {
        window.location.hash = "settings/connections";
      });
      await page.getByRole("heading", { level: 2, name: "Connections" }).waitFor(LONG);
      for (const label of [`Your inbox, ${studio}`, `Your calendar, ${studio}`]) {
        const row = page.getByRole("listitem", { name: label });
        await row.getByRole("button", { name: `More actions for ${label}` }).click();
        await page.getByRole("menuitem", { name: "Read now" }).click();
      }
      // Both parts of the account must be found out (its inbox and its calendar), or the Schedule's banner stays off.
      await page.locator("[data-connection-card][data-need]").first().waitFor(LONG);
      await page.waitForFunction(
        async ([base, token]) => {
          const rows = (await (await fetch(`${base}api/watch`, { headers: { Authorization: `Bearer ${token}` } })).json()) as Array<{ reads?: string[]; account_state?: string; last?: { outcome?: string; error_kind?: string } }>;
          const needing = (kind: string) => rows.some((r) => (r.reads ?? []).includes(kind) && (r.account_state === "expired" || r.account_state === "signed_out" || (r.last?.outcome === "failed" && r.last.error_kind === "auth")));
          return needing("mail") && needing("calendar");
        },
        [env.base, env.token] as [string, string],
        LONG,
      );
      env.seed.failing = studio;
      await page.close();
      return;
    }
    case "sides/empty": {
      const seeded = (await (await fetch(`${env.base}__e2e/many-sides`)).json()) as { names: string[]; ids: string[] };
      env.seed.sides = seeded.names;
      env.seed.sideProjects = seeded.ids;
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
      // Some of the to-dos belong to a side's project, so the side strip's counts differ from one side to the next.
      // The fourth side is left with nothing, so the "filtered to nothing" pictures of the screens read as they do for a person.
      const projects = ((env.seed.sideProjects as string[]) ?? []).filter((_, i) => i !== 3);
      for (const [n, todo] of todos.entries()) {
        const project = n % 3 === 2 || projects.length === 0 ? undefined : projects[n % projects.length];
        await api(env.base, env.token, "todos", { method: "POST", body: { ...todo, owners: [me], project } });
      }
      return;
    }
    case "sides/heard-from": {
      const pat = (env.seed.people as { pat: string }).pat;
      // A small made-up PDF the printer sent, kept as a file that records the person it came from.
      const sent = await fetch(`${env.base}api/files?name=${encodeURIComponent("Proof sheet.pdf")}&from_person=${encodeURIComponent(pat)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.token}`, "content-type": "application/pdf" },
        body: "%PDF-1.4\n% a made-up proof sheet\n",
      });
      if (!sent.ok) throw new Error(`POST api/files answered ${sent.status}: ${(await sent.text()).slice(0, 200)}`);
      // One item waiting on them, so a message to them can be drafted.
      await api(env.base, env.token, "todos", { method: "POST", body: { text: "Send the signed proof sheet", when: dayOffset(4), owners: [pat] } });
      return;
    }
    case "sides/filled": {
      // Two organizations through the app's own API, one with a very long name, for the screens that list or open them.
      const make = (body: object) => api<{ id: string }>(env.base, env.token, "organizations", { method: "POST", body });
      const long = await make({ name: "Featherstonehaugh, Winterbottom and Ashcombe Printing and Bindery Limited", notes: "Prints and binds small runs." });
      const short = await make({ name: "Quarry Press" });
      env.seed.organizations = { long: long.id, short: short.id };
      // To-dos owned by other people are the follow-ups: one overdue, one soon, one with no date, two in a project.
      const people = env.seed.people as { pat: string; long: string; fresh: string };
      const projects = ((env.seed.sideProjects as string[]) ?? []).filter((_, i) => i !== 3);
      const owed: Array<{ text: string; when?: string; owner: string; project?: string }> = [
        { text: "Send the proofs back", when: dayOffset(-3), owner: people.pat },
        { text: "Confirm the delivery window", when: dayOffset(2), owner: people.pat, project: projects[0] },
        { text: "Share the guest list", owner: people.fresh, project: projects[0] },
        { text: "Return the signed contract", when: dayOffset(6), owner: people.long, project: projects[1] },
      ];
      // Enough more, with no date, that the list is long enough to draw its filters and its grouping (a short list has none).
      const others = [people.pat, people.long, people.fresh];
      for (let n = 1; n <= 8; n += 1) owed.push({ text: `Return the form (${n})`, owner: others[n % others.length], project: projects[n % Math.max(projects.length, 1)] });
      for (const { owner, ...todo } of owed) await api(env.base, env.token, "todos", { method: "POST", body: { ...todo, owners: [owner] } });
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
