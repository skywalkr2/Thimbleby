// The inventory: every screen of the app, for the owner's gate before a hand-back. Where pages.ts maps the reviewer's mockup pages, this
// map has one entry per screen (and per shared state of a screen), whether or not a mockup exists. `--inventory` captures it.
//
//  - `page` is the screen's id (the first part of its picture's name), `title` a state's name (the second part), `label` and `group`
//    what index.md calls them.
//  - `main` adds the 390-wide night picture; `widths` restricts an entry to the widths where it exists (the phone's More sheet).
//  - A screen that can't be reached says why (`undrivable`, or a drive that throws Unreachable): it is listed, never skipped.
import {
  api,
  go,
  goOffline,
  holdReads,
  open,
  settle,
  Unreachable,
  type Env,
} from "./drive.ts";
import type { Entry } from "./pages.ts";
import type { Route } from "playwright-core";

export interface Screen extends Entry {
  /** The screen's name as a person reads it. */
  label: string;
  /** The part of the app it belongs to; index.md has one section for each. */
  group: string;
  /** The main screens are also taken on a phone at night. */
  main?: boolean;
  /** Taken as the window shows it, not the whole page: a dialog, drawer, sheet or menu sits over the window, and the scrim of a
   * full-page picture would cover only its first screen. */
  window?: boolean;
  /** Only these window widths (a screen that exists only on a phone, or only on a wide window). */
  widths?: number[];
}

const NEUTRAL = "settings/appearance";

// ---------------------------------------------------------------- drives

/** Presses a choice of a strip, however it is drawn: a radio, a tab or a button. */
async function choose(env: Env, name: string | RegExp): Promise<void> {
  for (const role of ["radio", "tab", "button"] as const) {
    const found = env.page.getByRole(role, { name }).first();
    if ((await found.count()) > 0 && (await found.isVisible().catch(() => false))) {
      await found.click();
      await env.page.waitForTimeout(800);
      return;
    }
  }
  throw new Unreachable(`no choice named ${String(name)} on this screen`);
}

/** Opens a screen and then one of its choices. */
const withChoice = (hash: string, name: string | RegExp) => async (env: Env) => {
  await open(env, hash);
  await choose(env, name);
};

/** Clicks the first button (or link) whose name matches, on the page. */
async function press(env: Env, name: string | RegExp, why: string): Promise<void> {
  for (const role of ["button", "link"] as const) {
    const found = env.page.getByRole(role, { name }).first();
    if ((await found.count()) > 0 && (await found.isVisible().catch(() => false))) {
      await found.click();
      await env.page.waitForTimeout(900);
      return;
    }
  }
  throw new Unreachable(why);
}

/** Loading: the screen's own reads are held (as in pages.ts). */
const loading = (hash: string, also?: RegExp) => (env: Env) => holdReads(env, NEUTRAL, hash, also);

const offline = (hash: string) => async (env: Env) => {
  await open(env, hash);
  await goOffline(env);
};

/** Couldn't load: every read the app did not make to start is answered with a failure, then the screen is opened. */
const couldntLoad = (hash: string, also?: RegExp) => async (env: Env) => {
  await env.page.goto("about:blank");
  await env.page.goto(`${env.base}?token=${env.token}#${NEUTRAL}`);
  await settle(env.page);
  const known = new Set<string>();
  for (const name of await env.page.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name))) {
    const url = new URL(name);
    known.add(url.pathname + url.search);
  }
  if (also) for (const path of [...known]) if (also.test(path)) known.delete(path);
  const handler = async (route: Route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET" || known.has(url.pathname + url.search)) return route.fallback();
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "The app couldn't read this." }) });
  };
  await env.page.route("**/api/**", handler);
  env.undo.push(() => env.page.unroute("**/api/**", handler));
  if (also) {
    await env.page.goto("about:blank");
    await env.page.goto(`${env.base}?token=${env.token}#${hash}`);
  } else {
    await go(env, hash);
  }
  await env.page.waitForTimeout(1800);
};

/** Filtered to nothing: the fourth side has nothing in this workspace, so a screen that honors the side filter says so. */
const filteredToNothing = (hash: string) => async (env: Env) => {
  await open(env, hash);
  const side = (env.seed.sides as string[])[3];
  const button = env.page.getByRole("button", { name: /^Side: / }).first();
  const list = env.page.getByRole("combobox", { name: "Show" }).first();
  if ((await button.count()) > 0 && (await button.isVisible())) {
    await button.click();
    await env.page.getByRole("dialog", { name: "Show one side" }).locator("[data-side-option]").filter({ hasText: side.slice(0, 12) }).first().click();
  } else if ((await list.count()) > 0 && (await list.isVisible())) {
    await list.selectOption({ label: side });
  } else {
    const group = env.page.getByRole("radiogroup", { name: "Show" }).first();
    if ((await group.count()) === 0) throw new Unreachable("this screen has no side filter");
    await group.getByRole("radio", { name: new RegExp(`^${side.slice(0, 12)}`) }).click();
  }
  await env.page.waitForTimeout(800);
};

/** A step of the setup guide, opened from the list of steps (see pages.ts: the first screen is left through Start). */
async function setupScreen(env: Env, name: string | RegExp | null): Promise<void> {
  await open(env, "setup");
  if (name === null) return;
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

/** The id of the first open to-do, read through the app's own API. */
async function firstTodo(env: Env): Promise<string> {
  const items = await api<{ actions: Array<{ id: string }> }>(env.base, env.token, "open-items");
  if (items.actions.length === 0) throw new Unreachable("the workspace has no to-do");
  return items.actions[0].id;
}

/** Opens Ask the way a person does, from the search field (a phone has the search behind an icon first). */
async function openAsk(env: Env): Promise<void> {
  const field = env.page.getByRole("banner").getByRole("searchbox");
  const phone = env.page.getByRole("button", { name: "Search", exact: true }).first();
  if (!(await field.isVisible().catch(() => false))) await phone.click();
  await env.page.getByRole("searchbox").first().click();
  await env.page.getByRole("list", { name: "Results" }).getByRole("button", { name: /^Ask / }).click();
  await env.page.waitForTimeout(900);
}

/** The Help menu: a button in the header, and in the More sheet on a phone. */
async function openHelpItem(env: Env, item: string | RegExp): Promise<void> {
  const help = env.page.getByRole("button", { name: "Help", exact: true });
  if ((await help.count()) > 0 && (await help.first().isVisible())) {
    await help.first().click();
    await env.page.waitForTimeout(500);
    await env.page.getByRole("menuitem", { name: item }).click();
  } else {
    await env.page.getByRole("button", { name: "More", exact: true }).click();
    await env.page.waitForTimeout(500);
    await env.page.getByRole("dialog", { name: "More" }).getByRole("button", { name: item }).click();
  }
  await env.page.waitForTimeout(900);
}

// ---------------------------------------------------------------- building the map

type Where = Pick<Screen, "server" | "stage">;
const SIGNED: Where = { server: "accounts", stage: "signed-in" };
const FRESH: Where = { server: "accounts", stage: "fresh" };
const SEEDED: Where = { server: "sides", stage: "seeded" };
const FILLED: Where = { server: "sides", stage: "filled" };
const EMPTY: Where = { server: "sides", stage: "empty" };

const s = (group: string, page: string, label: string, where: Where, open: Screen["open"], more: Partial<Screen> = {}): Screen => ({ group, page, label, ...where, open, ...more });
const state = (base: Screen, title: string, where: Where, open: Screen["open"], more: Partial<Screen> = {}): Screen => ({ group: base.group, page: base.page, label: base.label, title, ...where, open, ...more });
const reach = (hash: string) => (env: Env) => open(env, hash);

/** The shared states of a screen that reads data: loading, couldn't load and offline. */
function shared(base: Screen, hash: string, also?: RegExp): Screen[] {
  const where: Where = { server: base.server, stage: base.stage };
  return [state(base, "Loading", where, loading(hash, also)), state(base, "Couldn't load", where, couldntLoad(hash, also)), state(base, "Offline", where, offline(hash))];
}

const LISTS = /\/api\/(today|todos|actions|followups|projects|people|open-items|changes|stages|handled|since)/;

function build(): Screen[] {
  const all: Screen[] = [];
  const add = (...screens: Screen[]) => all.push(...screens);

  // ---- Today and the work screens
  const today = s("Today", "today", "Today", SIGNED, reach("today"), { main: true });
  add(
    today,
    ...shared(today, "today", /\/api\/(today|changes|followups|stages|watch)/),
    state(today, "Filtered to nothing", EMPTY, filteredToNothing("today")),
    s("Today", "today-review", "Today, a line opened for review", SIGNED, async (env) => {
      await open(env, "today");
      await press(env, /^(Look over|Open )/, "Today has no line to look over or open on this fixture");
    }),
  );
  const since = s("Work", "since-yesterday", "Since yesterday", SIGNED, reach("work/since"));
  add(since, ...shared(since, "work/since", LISTS));
  const changed = s("Work", "what-changed", "What changed", SIGNED, reach("work/changed"), { main: true });
  add(changed, ...shared(changed, "work/changed", LISTS));
  const handled = s("Work", "handled-for-you", "Handled for you", SIGNED, reach("work/handled"));
  add(handled, ...shared(handled, "work/handled", LISTS));
  const followups = s("Work", "followups", "Follow-ups", FILLED, reach("work/followups"), { main: true });
  add(
    followups,
    s("Work", "followups-later", "Follow-ups, Later", FILLED, withChoice("work/followups", /^Later/)),
    s("Work", "followups-waiting", "Follow-ups, Waiting on them", FILLED, withChoice("work/followups", /^Waiting on them/)),
    s("Work", "followups-by-project", "Follow-ups, by project", FILLED, withChoice("work/followups", /^By project/)),
    s("Work", "followups-empty", "Follow-ups, nobody has one yet", SEEDED, reach("work/followups")),
    ...shared(followups, "work/followups", LISTS),
    state(followups, "Filtered to nothing", EMPTY, filteredToNothing("work/followups")),
  );
  const todos = s("Work", "todos", "To-dos", SEEDED, reach("work/open"), { main: true });
  add(
    todos,
    s("Work", "questions", "Questions", SEEDED, withChoice("work/open", /^Questions/)),
    ...shared(todos, "work/open", LISTS),
    state(todos, "Filtered to nothing", EMPTY, filteredToNothing("work/open")),
    s("Work", "todos-many", "To-dos, over a hundred", { server: "sides", stage: "bulk" }, reach("work/open")),
    s("Work", "stages", "Stages", SEEDED, reach("work/stages")),
  );
  const schedule = s("Schedule", "schedule-day", "Schedule, Day", SIGNED, withChoice("schedule", "Day"), { main: true });
  add(
    schedule,
    s("Schedule", "schedule-work-week", "Schedule, Work week", SIGNED, withChoice("schedule", /^(Work week|Weekdays)/)),
    s("Schedule", "schedule-week", "Schedule, Week", SIGNED, withChoice("schedule", "Week"), { main: true }),
    s("Schedule", "schedule-month", "Schedule, Month", SIGNED, withChoice("schedule", "Month")),
    s("Schedule", "schedule-timeline", "Schedule, Timeline", SIGNED, withChoice("schedule", "Timeline")),
    s("Schedule", "schedule-add", "Schedule, Add to schedule", SIGNED, async (env) => {
      // The Schedule opens in the view last picked in this window; the Timeline, which a screen before this one picks, has no button.
      await withChoice("schedule", "Day")(env);
      await press(env, /Add to schedule/, "the Schedule has no Add to schedule button");
    }),
    s("Schedule", "schedule-entry", "Schedule, an entry opened", SIGNED, async (env) => {
      await withChoice("schedule", "Week")(env);
      // A clash block or an entry in the grid: the first thing in the main area that shows a time and can be pressed.
      const entry = env.page.locator("main button, main a").filter({ hasText: /\d{1,2}:\d\d ?(AM|PM)|at once/ }).first();
      if ((await entry.count()) === 0) throw new Unreachable("the Schedule shows no entry to open on this fixture");
      await entry.click();
      await env.page.waitForTimeout(900);
    }),
    state(schedule, "Loading", SIGNED, loading("schedule", /\/api\/(schedule|today)/)),
    state(schedule, "Couldn't load", SIGNED, couldntLoad("schedule", /\/api\/(schedule|today)/)),
    state(schedule, "Offline", SIGNED, offline("schedule")),
  );

  // ---- Records
  const projects = s("Records", "projects", "Projects", SEEDED, reach("records/projects"), { main: true });
  add(
    projects,
    ...shared(projects, "records/projects", LISTS),
    s("Records", "project-page", "A project's page", SEEDED, (env) => open(env, `records/project/${encodeURIComponent((env.seed.sideProjects as string[])[0])}`)),
    s("Records", "side-page", "A business's page, with a long name", SEEDED, (env) => open(env, `records/project/${encodeURIComponent((env.seed.sides as string[])[1])}`)),
    s("Records", "project-missing", "A page that no longer exists", SEEDED, reach("records/project/NOT-THERE")),
  );
  const people = s("Records", "people", "People", SEEDED, reach("records/people"), { main: true });
  add(
    people,
    ...shared(people, "records/people", LISTS),
    s("Records", "person-page", "A person's page", SEEDED, (env) => open(env, `records/person/${env.seed.people.pat}`)),
    s("Records", "person-long-name", "A person's page, with a very long name", SEEDED, (env) => open(env, `records/person/${env.seed.people.long}`)),
    s("Records", "person-new", "A person's page, with nothing yet", SEEDED, (env) => open(env, `records/person/${env.seed.people.fresh}`)),
    s("Records", "person-missing", "A person's page that no longer exists", SEEDED, reach("records/person/PER-9999")),
    s("Records", "person-add", "Add a person", SEEDED, async (env) => {
      await open(env, "records/people");
      await press(env, /^Add a person/, "People has no Add a person button");
    }),
    s("Records", "person-edit", "A person's page, Edit", SEEDED, async (env) => {
      await open(env, `records/person/${env.seed.people.pat}`);
      await press(env, /^Edit$/, "the person's page has no Edit button");
    }),
    s("Records", "organization-page", "An organization's page", FILLED, (env) => open(env, `records/organization/${env.seed.organizations.long}`)),
    s("Records", "organizations", "People, with organizations", FILLED, reach("records/people")),
    s("Records", "organization-removed", "An organization removed, with Undo", FILLED, async (env) => {
      await open(env, "records/people");
      // Removing acts at once and offers Undo in a toast; the organization is put back when the capture is over.
      await env.page.getByRole("button", { name: "More actions for Quarry Press" }).click();
      env.undo.push(() => api(env.base, env.token, `organizations/${env.seed.organizations.short}/restore`, { method: "POST" }).then(() => undefined));
      await env.page.getByRole("menuitem", { name: /^Remove/ }).first().click();
      await env.page.waitForTimeout(900);
    }),
  );
  const files = s("Records", "files", "Files", SEEDED, reach("records/files"));
  add(
    files,
    ...shared(files, "records/files"),
    s("Records", "files-add", "Add a file", SEEDED, async (env) => {
      await open(env, "records/files");
      await press(env, /^Add a file/, "Files has no Add a file button");
    }),
  );
  const notes = s("Records", "notes", "Notes", SEEDED, reach("records/notes"));
  add(notes, ...shared(notes, "records/notes"));
  const knowledge = s("Records", "knowledge", "Knowledge", SEEDED, reach("records/knowledge"));
  add(knowledge, ...shared(knowledge, "records/knowledge"), s("Records", "rules-review", "Rules to look over", SEEDED, reach("records/rules-review")));
  const todoPage = s("Records", "todo-page", "A to-do's page", SEEDED, async (env) => open(env, `records/action/${await firstTodo(env)}`));
  add(
    todoPage,
    s("Records", "todo-edit-details", "A to-do's Edit details", SEEDED, async (env) => {
      await open(env, `records/action/${await firstTodo(env)}`);
      await press(env, "Edit details", "the to-do's page has no Edit details button");
    }),
  );
  add(
    s("Records", "handover", "Handover", SEEDED, reach("handover")),
    s("Records", "quality", "How the assistant is doing", SEEDED, reach("quality"), { main: true }),
  );

  // ---- Settings
  const sections: Array<[string, string, Where]> = [
    ["you", "You", SIGNED],
    ["ai", "AI and spending", SIGNED],
    ["today", "Notices", SIGNED],
    ["backups", "Backups", SIGNED],
    ["appearance", "Appearance", SIGNED],
    ["links", "Quick links", SIGNED],
    ["business", "Your business", SEEDED],
    ["lists", "Lists", SEEDED],
    ["connections", "Connections", SIGNED],
    ["addons", "Add-ons", SIGNED],
    ["files", "Files", SIGNED],
    ["advanced", "Advanced", SIGNED],
  ];
  for (const [id, label, where] of sections) {
    const base = s("Settings", `settings-${id}`, `Settings, ${label}`, where, reach(`settings/${id}`), { main: id === "connections" });
    add(base);
    if (["you", "ai", "connections", "business"].includes(id)) add(...shared(base, `settings/${id}`));
  }
  add(
    s("Settings", "settings-ai-compare", "Settings, Compare AI accounts", SIGNED, reach("settings/ai-compare")),
    s("Settings", "settings-menu", "Settings, the menu and search", SIGNED, async (env) => {
      await open(env, "settings");
    }),
    s("Settings", "settings-addon-page", "An add-on's page", SIGNED, async (env) => {
      await open(env, "settings/addons");
      // The add-on's entry in Settings' own menu (folded away below 1100px): its address is read, then opened as the link would.
      const href = await env.page.locator('a[href*="settings/addon/"]').first().getAttribute("href").catch(() => null);
      if (!href) throw new Unreachable("the Add-ons screen has no add-on page to open on this fixture");
      await go(env, href.slice(href.indexOf("#") + 1));
      await settle(env.page);
    }),
    s("Settings", "settings-add-connection", "Settings, Add a connection (the drawer)", SIGNED, async (env) => {
      await open(env, "settings/connections");
      await press(env, /^Add (mail|an account|a connection)/, "Connections has no Add button");
    }),
    s("Settings", "settings-sign-out", "Settings, Sign out of an account (the question)", SIGNED, async (env) => {
      await open(env, "settings/connections");
      await env.page.getByRole("button", { name: /^More actions for [^\s,]+@[^\s,]+$/ }).last().click();
      await env.page.getByRole("menuitem", { name: "Sign out" }).click();
      await env.page.waitForTimeout(900);
    }),
    s("Settings", "settings-ai-add", "Settings, Add an AI account", SIGNED, async (env) => {
      await open(env, "settings/ai");
      await press(env, /^Add an account/, "AI and spending has no Add an account button");
    }),
  );

  // ---- Setup
  const step = (id: string, label: string, name: string | RegExp | null, where: Where): Screen => s("Setup", `setup-${id}`, `Setup, ${label}`, where, (env) => setupScreen(env, name), { main: id === "ai" || id === "mail" });
  add(
    step("welcome", "Welcome", null, FRESH),
    step("you", "You", /^You/, FRESH),
    step("work", "What it's for", /^What it's for/, FRESH),
    step("ai", "Your AI account", /^Your AI account/, FRESH),
    step("mail", "Mail and calendar", /^Mail and calendar/, SIGNED),
    step("promises", "Your promises", /^Your promises/, FRESH),
    step("backup", "Backups", /^Backups/, FRESH),
    step("people", "People", /^People/, FRESH),
    step("done", "Done", /^(Done|Where things stand)/, FRESH),
    s("Setup", "setup-ai-other", "Setup, Your AI account, Something else", FRESH, async (env) => {
      await setupScreen(env, /^Your AI account/);
      await env.page.locator("main").getByRole("radio", { name: /Something else/ }).check();
      await env.page.waitForTimeout(700);
    }),
    state(step("mail", "Mail and calendar", /^Mail and calendar/, SIGNED), "One account needs sign-in", { server: "accounts", stage: "failing" }, (env) => setupScreen(env, /^Mail and calendar/)),
  );

  // ---- The header, the menus, the drawers and the dialogs
  add(
    s("Header and menus", "status-popover", "The header's status popover", SIGNED, async (env) => {
      await open(env, "today");
      await press(env, /^App status: /, "the header has no status button");
    }),
    s("Header and menus", "user-menu", "The user menu", SIGNED, async (env) => {
      await open(env, "today");
      await press(env, /^Menu for /, "the header has no user menu");
    }),
    s("Header and menus", "help-menu", "The help menu", SIGNED, async (env) => {
      await open(env, "today");
      const help = env.page.getByRole("button", { name: "Help", exact: true });
      if ((await help.count()) === 0 || !(await help.first().isVisible())) throw new Unreachable("the Help menu is in the More sheet on a phone (see the More sheet)");
      await help.first().click();
      await env.page.waitForTimeout(700);
    }, { widths: [1440, 1024] }),
    s("Header and menus", "more-sheet", "The phone's More sheet", SIGNED, async (env) => {
      await open(env, "today");
      await env.page.getByRole("button", { name: "More", exact: true }).click();
      await env.page.getByRole("dialog", { name: "More" }).waitFor({ timeout: 12_000 });
      await env.page.waitForTimeout(600);
    }, { widths: [390] }),
    s("Header and menus", "shortcuts", "Keyboard shortcuts", SIGNED, async (env) => {
      await open(env, "today");
      await openHelpItem(env, /^Show keyboard shortcuts/);
    }, { widths: [1440, 1024] }),
    s("Header and menus", "feedback", "Write feedback", SIGNED, async (env) => {
      await open(env, "today");
      await openHelpItem(env, /^Write feedback/);
    }),
    s("Header and menus", "hand-in", "Hand something in", SEEDED, async (env) => {
      await open(env, "today");
      await press(env, "Hand something in", "no Hand something in button");
    }),
    s("Header and menus", "add-todo", "Add a to-do", SEEDED, async (env) => {
      await open(env, "work/open");
      await press(env, "Add a to-do", "To-dos has no Add a to-do button");
    }),
    s("Header and menus", "ask", "Ask", SEEDED, async (env) => {
      await open(env, "today");
      await openAsk(env);
    }, { main: true }),
    s("Header and menus", "search-results", "Search, with results", SEEDED, async (env) => {
      await open(env, "today");
      const field = env.page.getByRole("banner").getByRole("searchbox");
      if (!(await field.isVisible().catch(() => false))) await env.page.getByRole("button", { name: "Search", exact: true }).first().click();
      await env.page.getByRole("searchbox").first().fill("Pat");
      await env.page.waitForTimeout(1200);
    }),
  );
  return all;
}

/** The screens that are an overlay on another: pictures of the window, not of the whole page. */
const OVERLAYS = new Set(["status-popover", "user-menu", "help-menu", "more-sheet", "shortcuts", "feedback", "hand-in", "add-todo", "ask", "search-results", "settings-sign-out", "settings-add-connection", "schedule-add", "person-add", "person-edit", "organization-removed", "todo-edit-details", "files-add", "settings-ai-add"]);

export const INVENTORY: Screen[] = build().map((e) => (OVERLAYS.has(e.page) ? { ...e, window: true } : e));

/** The ids of the screens, in order and without repeats. */
export const SCREEN_IDS: string[] = [...new Set(INVENTORY.map((e) => e.page))];
