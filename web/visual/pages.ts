// The capture map: for each page of the reviewer's mockups, and each state on its states sheet, how to reach it in the build.
//
//  - `server` and `stage` say which server and which state of it the capture needs (stages.ts); `open` goes to the screen and,
//    for a state, drives it there.
//  - A state's `title` is its title on the mockup's states sheet, exactly, so the picture of the sheet can be cut at it.
//  - `undrivable` is a reason, written for the person reading the difference list, why the build can't be put in that state with
//    the fixtures and fakes there are. Nothing is skipped without one; a drive that throws is listed with what it said.
import {
  clickFirstOf,
  goOffline,
  go,
  holdReads,
  open,
  refuseReads,
  refuseWrites,
  Unreachable,
  type Env,
} from "./drive.ts";
import type { ServerName, Stage } from "./stages.ts";

export interface Entry {
  /** The mockup page it sits beside: `today`, or a states sheet such as `today-states`. */
  page: string;
  /** A state's title on the sheet; absent for a page's main picture. */
  title?: string;
  server: ServerName;
  stage: Stage;
  open?: (env: Env) => Promise<void>;
  undrivable?: string;
}

/** Every mockup page, in the order of the reviewer's README. */
export const PAGES = [
  "today",
  "today-review",
  "today-states",
  "todos",
  "todos-states",
  "schedule",
  "schedule-states",
  "connections",
  "connections-states",
  "person",
  "person-states",
  "quality",
  "quality-states",
  "setup-ai",
  "setup-mail",
  "setup-states",
] as const;

// ---------------------------------------------------------------- shared drives

/** A made-up first state for screens that load slowly: a neutral screen that needs no data, then the screen asked for. */
const NEUTRAL = "settings/appearance";

/** The side filter, whether it is a row of choices (a window) or a list (a phone): picks the side with this name. */
async function pickSide(env: Env, name: string): Promise<void> {
  const list = env.page.getByRole("combobox", { name: "Show" }).first();
  if ((await list.count()) > 0 && (await list.isVisible())) {
    await list.selectOption({ label: name });
  } else {
    await env.page.getByRole("radiogroup", { name: "Show" }).first().getByRole("radio", { name: new RegExp(`^${name.slice(0, 12)}`) }).click();
  }
  await env.page.waitForTimeout(700);
}

/** Ticks the first to-do of the list, however the list draws its tick. */
async function tickFirstTodo(env: Env): Promise<void> {
  const box = env.page.locator('main [role="checkbox"], main input[type="checkbox"], main li [aria-label^="Mark"]').first();
  if ((await box.count()) > 0) {
    await box.click();
  } else {
    const first = env.page.locator("main li button").first();
    if ((await first.count()) === 0) throw new Unreachable("no to-do row with a tick on this screen");
    await first.click();
  }
  await env.page.waitForTimeout(800);
}

/** Opens a person's page by the id the seed recorded. */
const person = (key: "pat" | "long" | "fresh") => (env: Env) => open(env, `records/person/${env.seed.people[key]}`);

/** A step of the setup guide, opened from its list of steps: the guide's first screen is left through its Start button, and on
 * a phone the list is behind a Steps button. */
async function setupStep(env: Env, name: string | RegExp): Promise<void> {
  await open(env, "setup");
  const start = env.page.getByRole("button", { name: "Start", exact: true });
  if ((await start.count()) > 0 && (await start.first().isVisible())) {
    await start.first().click();
    await env.page.waitForTimeout(700);
  }
  const step = env.page.getByRole("button", { name }).first();
  if (!(await step.isVisible().catch(() => false))) {
    await env.page.getByRole("button", { name: "Steps", exact: true }).click();
    await env.page.waitForTimeout(400);
  }
  await step.click();
  await env.page.waitForTimeout(900);
}

/** A sign-in window that is opened and left waiting on the service's page, as a person who has not picked an account yet. */
async function waitingSignIn(env: Env, button: RegExp): Promise<void> {
  const [popup] = await Promise.all([env.page.waitForEvent("popup", { timeout: 30_000 }), env.page.getByRole("button", { name: button }).first().click()]);
  env.undo.push(() => popup.close().catch(() => undefined));
  await env.page.waitForTimeout(900);
}

const LOADING = (hash: string) => (env: Env) => holdReads(env, NEUTRAL, hash);
const OFFLINE = (hash: string) => async (env: Env) => {
  await open(env, hash);
  await goOffline(env);
};

// ---------------------------------------------------------------- the map

export const ENTRIES: Entry[] = [
  // ---- Today
  { page: "today", server: "accounts", stage: "signed-in", open: (env) => open(env, "today") },
  {
    page: "today-review",
    server: "accounts",
    stage: "signed-in",
    open: async (env) => {
      await open(env, "today");
      await clickFirstOf(env, [/^Look over/], "Today has no line to look over on this fixture");
      await env.page.waitForTimeout(900);
    },
  },
  { page: "today-states", title: "All clear (brand moment)", server: "sides", stage: "empty", open: (env) => open(env, "today") },
  { page: "today-states", title: "Loading (skeleton at row height, no shift)", server: "accounts", stage: "signed-in", open: LOADING("today") },
  { page: "today-states", title: "One account of three needs you", server: "accounts", stage: "failing", open: (env) => open(env, "today") },
  { page: "today-states", title: "Offline", server: "accounts", stage: "signed-in", open: OFFLINE("today") },
  {
    page: "today-states",
    title: "The side filter opened, with a fifth side that has a long name",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await open(env, "today");
      // A window shows the sides as a row of choices already; a phone shows a list, which is opened here.
      const list = env.page.getByRole("combobox", { name: "Show" }).first();
      if ((await list.count()) > 0 && (await list.isVisible())) await list.focus();
    },
  },
  {
    page: "today-states",
    title: "A save that failed",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await open(env, "today");
      await refuseWrites(env, 500, "The app couldn't write to its folder.");
      await clickFirstOf(env, [/^Back up now$/, /^Give them dates$/, /^Continue setup$/], "Today has no row whose button saves something on this fixture");
      await env.page.waitForTimeout(900);
    },
  },
  {
    page: "today-states",
    title: "A side filtered to nothing",
    server: "sides",
    stage: "empty",
    open: async (env) => {
      await open(env, "today");
      await pickSide(env, (env.seed.sides as string[])[3]);
    },
  },
  {
    page: "today-states",
    title: "Changed somewhere else (saves merge)",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await open(env, "today");
      await refuseWrites(env, 409, "This changed since you opened it.");
      await clickFirstOf(env, [/^Back up now$/, /^Give them dates$/, /^Continue setup$/], "Today has no row whose button saves something on this fixture");
      await env.page.waitForTimeout(900);
    },
  },
  { page: "today-states", title: "100+ items, long titles, other languages", server: "sides", stage: "bulk", open: (env) => open(env, "today") },

  // ---- To-dos
  { page: "todos", server: "sides", stage: "seeded", open: (env) => open(env, "work/open") },
  { page: "todos-states", title: "All done (a brand moment)", server: "sides", stage: "empty", open: (env) => open(env, "work/open") },
  {
    page: "todos-states",
    title: "Filtered to nothing",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await open(env, "work/open");
      await env.page.getByRole("radio", { name: /^Lantern Row Studio/ }).click();
      await env.page.waitForTimeout(700);
    },
  },
  {
    page: "todos-states",
    title: "Questions",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await open(env, "work/open");
      await env.page.getByRole("tab", { name: /^Questions/ }).click();
      await env.page.waitForTimeout(700);
    },
  },
  { page: "todos-states", title: "Loading", server: "sides", stage: "seeded", open: LOADING("work/open") },
  {
    page: "todos-states",
    title: "Ticked, with Undo",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await open(env, "work/open");
      await tickFirstTodo(env);
    },
  },
  { page: "todos-states", title: "Offline", server: "sides", stage: "seeded", open: OFFLINE("work/open") },
  {
    page: "todos-states",
    title: "A save that failed",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await open(env, "work/open");
      await refuseWrites(env, 500, "The app couldn't write to its folder.");
      await tickFirstTodo(env);
    },
  },
  { page: "todos-states", title: "Long content", server: "sides", stage: "seeded", open: (env) => open(env, "work/open") },
  { page: "todos-states", title: "A large count", server: "sides", stage: "bulk", open: (env) => open(env, "work/open") },

  // ---- Schedule
  { page: "schedule", server: "accounts", stage: "signed-in", open: (env) => open(env, "schedule") },
  { page: "schedule-states", title: "A week with nothing in it", server: "sides", stage: "empty", open: (env) => open(env, "schedule") },
  { page: "schedule-states", title: "One calendar can't be read", server: "accounts", stage: "failing", open: (env) => open(env, "schedule") },
  { page: "schedule-states", title: "Three meetings at once", server: "accounts", stage: "signed-in", open: (env) => open(env, "schedule") },
  { page: "schedule-states", title: "Loading", server: "accounts", stage: "signed-in", open: LOADING("schedule") },
  {
    page: "schedule-states",
    title: "Studio entries shown while its calendar can’t be read",
    server: "accounts",
    stage: "failing",
    open: (env) => open(env, "schedule"),
  },
  { page: "schedule-states", title: "Offline", server: "accounts", stage: "signed-in", open: OFFLINE("schedule") },
  {
    page: "schedule-states",
    title: "A save that failed",
    server: "accounts",
    stage: "signed-in",
    undrivable: "the Schedule only reads in this build: no entry can be moved or edited from the screen, so no write is sent that could fail",
  },
  {
    page: "schedule-states",
    title: "Long content",
    server: "accounts",
    stage: "signed-in",
    undrivable: "the stand-in calendars hold no entry with a long title, and the app has no way to add an entry",
  },
  {
    page: "schedule-states",
    title: "A large count",
    server: "accounts",
    stage: "signed-in",
    undrivable: "the stand-in calendars hold a handful of entries, and the app has no way to add one; a made-up answer would need the calendar's whole answer shape",
  },

  // ---- Connections
  { page: "connections", server: "accounts", stage: "signed-in", open: (env) => open(env, "settings/connections") },
  { page: "connections-states", title: "No accounts yet", server: "sides", stage: "empty", open: (env) => open(env, "settings/connections") },
  {
    page: "connections-states",
    title: "Signing in again",
    server: "accounts",
    stage: "failing",
    open: async (env) => {
      await open(env, "settings/connections");
      await waitingSignIn(env, new RegExp(`^Sign in again as ${env.seed.failing}`));
    },
  },
  { page: "connections-states", title: "All healthy", server: "accounts", stage: "signed-in", open: (env) => open(env, "settings/connections") },
  {
    page: "connections-states",
    title: "Sign-in refused",
    server: "accounts",
    stage: "failing",
    open: async (env) => {
      await open(env, "settings/connections");
      // The window asks which account; the first one is picked, which is not the account being signed in again.
      const [popup] = await Promise.all([
        env.page.waitForEvent("popup", { timeout: 30_000 }),
        env.page.getByRole("button", { name: new RegExp(`^Sign in again as ${env.seed.failing}`) }).first().click(),
      ]);
      await popup.getByRole("link", { name: env.seed.addresses[0], exact: true }).click();
      await popup.waitForEvent("close", { timeout: 30_000 }).catch(() => undefined);
      await env.page.waitForTimeout(1200);
    },
  },
  {
    page: "connections-states",
    title: "Removing an account asks first",
    server: "accounts",
    stage: "signed-in",
    open: async (env) => {
      await open(env, "settings/connections");
      // An account's own menu, not a connection's: its name is the address alone.
      await env.page.getByRole("button", { name: /^More actions for [^\s,]+@[^\s,]+$/ }).last().click();
      await env.page.getByRole("menuitem", { name: "Sign out" }).click();
      await env.page.waitForTimeout(700);
    },
  },
  { page: "connections-states", title: "Offline", server: "accounts", stage: "signed-in", open: OFFLINE("settings/connections") },
  {
    page: "connections-states",
    title: "A save that failed",
    server: "accounts",
    stage: "signed-in",
    open: async (env) => {
      await open(env, "settings/connections");
      await refuseWrites(env, 500, "The app couldn't write to its folder.");
      const row = env.page.locator("[data-source-row]").first();
      await row.getByRole("button", { name: /^More actions for/ }).click();
      await env.page.getByRole("menuitem", { name: /^(Pause|Turn off|Read now|Change)/ }).first().click();
      await env.page.waitForTimeout(900);
    },
  },
  {
    page: "connections-states",
    title: "Long content",
    server: "accounts",
    stage: "signed-in",
    undrivable: "the stand-in service's accounts have short addresses, and the app takes an address only from the service's own sign-in page",
  },
  {
    page: "connections-states",
    title: "A large count",
    server: "accounts",
    stage: "signed-in",
    undrivable: "the stand-in service plays three accounts; there is no fixture of a hundred",
  },

  // ---- A person
  { page: "person", server: "sides", stage: "seeded", open: person("pat") },
  { page: "person-states", title: "Someone just added, with nothing yet", server: "sides", stage: "seeded", open: person("fresh") },
  { page: "person-states", title: "A long name and no email", server: "sides", stage: "seeded", open: person("long") },
  { page: "person-states", title: "Loading", server: "sides", stage: "seeded", open: async (env) => holdReads(env, NEUTRAL, `records/person/${env.seed.people.pat}`) },
  {
    page: "person-states",
    title: "Person not found",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await go(env, "today");
      await open(env, "records/person/PER-9999");
    },
  },
  {
    page: "person-states",
    title: "Editing the details",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await person("pat")(env);
      await env.page.getByRole("button", { name: "Edit", exact: true }).click();
      await env.page.waitForTimeout(700);
    },
  },
  {
    page: "person-states",
    title: "Offline",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await person("pat")(env);
      await goOffline(env);
    },
  },
  {
    page: "person-states",
    title: "A save that failed",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await person("pat")(env);
      await env.page.getByRole("button", { name: "Edit", exact: true }).click();
      await refuseWrites(env, 500, "The app couldn't write to its folder.");
      await env.page.getByRole("button", { name: "Save", exact: true }).click();
      await env.page.waitForTimeout(900);
    },
  },
  { page: "person-states", title: "Long content", server: "sides", stage: "seeded", open: person("long") },
  {
    page: "person-states",
    title: "A large count",
    server: "sides",
    stage: "bulk",
    undrivable: "no fixture ties a hundred to-dos or messages to one person; the bulk to-dos are the person's own",
  },

  // ---- How Reginald is doing
  { page: "quality", server: "sides", stage: "seeded", open: (env) => open(env, "quality") },
  { page: "quality-states", title: "First week, not enough to measure", server: "sides", stage: "empty", open: (env) => open(env, "quality") },
  { page: "quality-states", title: "Loading", server: "sides", stage: "seeded", open: LOADING("quality") },
  { page: "quality-states", title: "Nothing to look at", server: "sides", stage: "empty", open: (env) => open(env, "quality") },
  {
    page: "quality-states",
    title: "A worse period, said plainly",
    server: "sides",
    stage: "seeded",
    undrivable: "the fixtures hold no four weeks of history to compare, and a made-up answer would need the page's whole answer shape",
  },
  {
    page: "quality-states",
    title: "Couldn’t load",
    server: "sides",
    stage: "seeded",
    open: async (env) => {
      await open(env, NEUTRAL);
      await refuseReads(env, /\/api\/(quality|measures|doing)/, 500, "These numbers couldn't be worked out.");
      await go(env, "quality");
      await env.page.waitForTimeout(1500);
    },
  },
  { page: "quality-states", title: "Offline", server: "sides", stage: "seeded", open: OFFLINE("quality") },
  { page: "quality-states", title: "Long content", server: "sides", stage: "seeded", undrivable: "the page lists mistakes the assistant made, and the fixtures hold none to give a long one" },
  { page: "quality-states", title: "A large count", server: "sides", stage: "bulk", undrivable: "the page lists mistakes the assistant made, and the fixtures hold none to count" },

  // ---- Setup
  { page: "setup-ai", server: "accounts", stage: "fresh", open: (env) => setupStep(env, /^Your AI account/) },
  { page: "setup-mail", server: "accounts", stage: "signed-in", open: (env) => setupStep(env, /^Mail and calendar/) },
  {
    page: "setup-states",
    title: "Empty: Continue waits, and says why",
    server: "accounts",
    stage: "fresh",
    open: (env) => setupStep(env, /^Your AI account/),
  },
  {
    page: "setup-states",
    title: "Checking",
    server: "accounts",
    stage: "fresh",
    open: async (env) => {
      await setupStep(env, /^Your AI account/);
      // The check of the key is held, so the screen stays as it is while it runs.
      await env.page.route("**/api/ai/**", () => new Promise(() => undefined));
      env.undo.push(() => env.page.unroute("**/api/ai/**"));
      await fillAnotherService(env);
      await env.page.waitForTimeout(1200);
    },
  },
  {
    page: "setup-states",
    title: "Accepted",
    server: "accounts",
    stage: "fresh",
    open: async (env) => {
      await setupStep(env, /^Your AI account/);
      await fillAnotherService(env);
      await env.page.getByText("Works. Ready to use.").waitFor({ timeout: 60_000 });
    },
  },
  {
    page: "setup-states",
    title: "Not recognized",
    server: "accounts",
    stage: "fresh",
    open: async (env) => {
      await setupStep(env, /^Your AI account/);
      // The service refuses the key: its test answers that the sign-in failed.
      await env.page.route("**/api/ai/**", (route) => (route.request().method() === "GET" ? route.fallback() : route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "The service didn't recognize this key." }) })));
      env.undo.push(() => env.page.unroute("**/api/ai/**"));
      await fillAnotherService(env);
      await env.page.waitForTimeout(1500);
    },
  },
  { page: "setup-states", title: "Mail: no account yet", server: "accounts", stage: "fresh", open: (env) => setupStep(env, /^Mail and calendar/) },
  {
    page: "setup-states",
    title: "Key valid, but no credit",
    server: "accounts",
    stage: "fresh",
    undrivable: "the stand-in AI service never answers that the account has no credit left; a made-up refusal would need the service's own wording to be classified",
  },
  {
    page: "setup-states",
    title: "Mail: one account needs sign-in",
    server: "accounts",
    stage: "failing",
    open: (env) => setupStep(env, /^Mail and calendar/),
  },
  {
    page: "setup-states",
    title: "Offline during setup",
    server: "accounts",
    stage: "fresh",
    open: async (env) => {
      await setupStep(env, /^Your AI account/);
      await goOffline(env);
    },
  },
  {
    page: "setup-states",
    title: "Mail: waiting for the sign-in window",
    server: "accounts",
    stage: "fresh",
    open: async (env) => {
      await setupStep(env, /^Mail and calendar/);
      await waitingSignIn(env, /^Sign in/);
    },
  },
];

/** Chooses "Something else", then "Another service", and fills in the stand-in AI service's address and a made-up key. */
async function fillAnotherService(env: Env): Promise<void> {
  const main = env.page.locator("main#main, main");
  await main.getByRole("radio", { name: /Something else/ }).check();
  await main.getByRole("button", { name: /^Another service/ }).click();
  await main.getByLabel(/^Another service/).check();
  await main.locator("#ai-key").fill("a-made-up-key");
  const address = main.getByRole("textbox", { name: "Service address" });
  await address.fill(String(env.seed.aiBase));
  await address.blur();
}
