// The re-sweep's data-and-trust items, as a person meets them in the browser: a to-do's page edits it with the short editor
// and a save of the day alone leaves its words (X71), a time the server wrote in UTC reads on the person's own clock (X16, X73),
// nothing internal shows on the pages a row opens (X37, X38, X72), sending one item back adds none of the others again (X74),
// and removing the AI account asks first and leaves Today with nothing to Start (X76).
import { expect, test, type Page } from "@playwright/test";
import { choicesOf } from "./choose";
import { findInternals } from "./internals-scan";

const AUTH = { Authorization: "Bearer e2e-token" };
const LOADED = { timeout: 20_000 };

const ahead = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function openScreen(page: Page, hash: string) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, hash);
  await expect(page).toHaveURL(new RegExp(`#${hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await expect(page.getByRole("main").getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
}

/** What a person reads on the open screen: the visible text and the labels a screen reader reads. */
async function readScreen(page: Page): Promise<string> {
  return page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("body [aria-label], body [title]"))
      .map((el) => [el.getAttribute("aria-label"), el.getAttribute("title")].filter(Boolean).join("\n"))
      .join("\n");
    return `${document.body.innerText}\n${labels}`;
  });
}

async function theTodo(page: Page, text: string): Promise<{ id: string; version: number }> {
  const me = ((await (await page.request.get("api/people", { headers: AUTH })).json()) as Array<{ id: string; is_pm: boolean }>).find((p) => p.is_pm)!.id;
  const added = await page.request.post("api/todos", { headers: AUTH, data: { text, when: ahead(2), owners: [me] } });
  expect(added.ok(), await added.text()).toBe(true);
  const open = (await (await page.request.get("api/open-items", { headers: AUTH })).json()) as { actions: Array<{ id: string; version: number; text: string }> };
  return open.actions.find((a) => a.text === text)!;
}

test("a to-do's Edit details is the short editor, and saving only the day leaves its title as it was", async ({ page }) => {
  const stamp = Date.now() % 100_000;
  const todo = await theTodo(page, `Send the headcount ${stamp} by ${ahead(2)}.`);
  await page.goto("?token=e2e-token");
  await openScreen(page, `records/action/${todo.id}`);
  const heading = page.getByRole("main").getByRole("heading", { level: 1 }).first();
  await expect(heading).toContainText(`Send the headcount ${stamp}`, LOADED);
  const before = await heading.innerText();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByLabel("Title")).toBeVisible(LOADED);
  // A short editor, not a form of the record's own fields.
  for (const raw of ["Reply owed", "Reported by", "Date set by", "Where it came from", "Status", "Wording"]) await expect(page.getByLabel(raw)).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(/PRJ-\d|PER-\d|SRC-\d|\[object Object\]/);
  await page.getByLabel("Due", { exact: true }).fill(ahead(6));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.").first()).toBeVisible(LOADED);
  // The day is the new one and the words say nothing else: no old day left in the title.
  const record = (await (await page.request.get(`api/record?kind=action&id=${todo.id}`, { headers: AUTH })).json()) as { fields: { text: string; due: string } };
  expect(record.fields.due).toBe(ahead(6));
  expect(record.fields.text).toBe(`Send the headcount ${stamp}.`);
  await expect(heading).toHaveText(before, LOADED);
});

test("the Schedule card and Came in write times on the person's own clock, the one Now is on, not in UTC", async ({ page }) => {
  await page.goto("?token=e2e-token");
  const { timezone } = (await (await page.request.get("api/runtime-config", { headers: AUTH })).json()) as { timezone: string };
  const sent = new Date(Date.now() + 90 * 60_000);
  const received = new Date();
  const day = (zone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  await page.route("**/api/today/agenda", (route) =>
    route.fulfill({
      json: [{ snapshot: "EVT-99", source: "", title: "Venue walk", start: sent.toISOString(), end: null, all_day: false, cancelled: false, own: true, open_items: 0, days: [day(timezone)] }],
    }),
  );
  await page.route("**/api/today/arrived", (route) =>
    route.fulfill({
      json: { items: [{ snapshot: "SNAP-9", source: "mail-9", title: "Proof is ready", sender: "Robin Sample", received: received.toISOString(), unread: true, version: 1 }], left_out: 0, set_aside: 0 },
    }),
  );
  await page.goto("?token=e2e-token#today");
  const clock = (when: Date, zone: string) =>
    page.evaluate(([iso, z]) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: z }).format(new Date(iso)), [when.toISOString(), zone] as const);
  const [mine, utc, mineReceived, utcReceived] = [await clock(sent, timezone), await clock(sent, "UTC"), await clock(received, timezone), await clock(received, "UTC")];
  const schedule = page.getByRole("region", { name: "Schedule" });
  await expect(schedule.getByText("Venue walk")).toBeVisible(LOADED);
  await expect(schedule).toContainText(mine);
  if (utc !== mine) await expect(schedule).not.toContainText(utc);
  const came = page.getByRole("region", { name: "Came in" });
  await expect(came.getByText("Proof is ready")).toBeVisible(LOADED);
  await expect(came.locator("time.tb-when").first()).toHaveText(mineReceived);
  if (utcReceived !== mineReceived) await expect(came.locator("time.tb-when").first()).not.toHaveText(utcReceived);
});

const DUMP = ["[", "{", '  "ask_whether_the_date_should_change": "Robin Sample (PER-1)",', "}", "]", "The headcount moved to 2026-11-09 for ACT-6.", "(none)"].join("\n");

test("the pages a row opens show nothing internal: a note, a message, what changed, Pause, search", async ({ page }) => {
  test.setTimeout(180_000);
  const found: string[] = [];
  const read = async (name: string) => {
    for (const hit of findInternals(await readScreen(page))) found.push(`${name}: ${hit}`);
  };
  // A note the assistant wrote from a data dump, and a message a mailbox watcher kept.
  await page.route("**/api/notes", (route) =>
    route.fulfill({ json: [{ id: "NOTE-77", text: DUMP, project: null, project_name: null, side_name: null, created_at: "2026-10-28T09:00:00Z", trust: "untrusted" }] }),
  );
  await page.route(/\/api\/record\?kind=source&id=SRC-77$/, (route) =>
    route.fulfill({
      json: {
        kind: "source",
        id: "SRC-77",
        version: 1,
        fields: {
          id: "SRC-77",
          title: "Venue list",
          received_at: "2026-10-28T09:00:00Z",
          kind: "watched:journey-mail/mail",
          content_hash: "6bdf0cc6ce1e0123456789abcdef",
          trust: "untrusted",
          watched: { source: "journey-mail", key: "m-1", author: "Pat Example <pat@example.com>", by_us: false, by_you: false, change: "new" },
        },
        long_text: [],
      },
    }),
  );
  const f = (name: string, type: string) => ({ name, description: "", type, required: false, editable: false });
  await page.route(/\/api\/kinds\/source$/, (route) =>
    route.fulfill({ json: { kind: "source", fields: [f("title", "text"), f("received_at", "text"), f("kind", "text"), f("content_hash", "text"), f("trust", "choice"), f("watched", "other")] } }),
  );
  await page.route(/\/api\/record-pages\/SRC-77\?kind=source$/, (route) =>
    route.fulfill({ json: { kind: "source", id: "SRC-77", version: 1, name: "Venue list", details: [], open_actions: [], open_questions: [], completed_actions: [], facts: [], fact_source: null, activity: [] } }),
  );
  // A change whose lesson, from what the assistant wrote, holds ids and a data dump.
  await page.route("**/api/changes", (route) =>
    route.fulfill({
      json: [
        {
          id: "REQ-77",
          version: 1,
          state: "done",
          created_at: "2026-10-30T09:00:00Z",
          dismissed: false,
          first_go: false,
          stage_task: false,
          refused: false,
          note: null,
          source: null,
          source_title: null,
          waiting: null,
          title: { kind: "note", topic: "Moved the headcount" },
          changeset: {
            id: "CS-77",
            summary: "Moved the headcount",
            status: "applied",
            reviewed: true,
            trust: "trusted",
            ops: [],
            groups: [],
            made: [],
            applied: [{ id: "LES-77", kind: "lesson", version: 1, text: DUMP, status: "active" }],
          },
        },
      ],
    }),
  );
  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 2, name: "Needs you", exact: true })).toBeVisible(LOADED);
  await openScreen(page, "records/notes");
  await expect(page.getByRole("link", { name: /The headcount moved to/ })).toBeVisible(LOADED);
  await read("Notes");
  await openScreen(page, "records/source/SRC-77");
  await expect(page.getByText("Pat Example")).toBeVisible(LOADED);
  await read("A message's page");
  const message = await readScreen(page);
  for (const gone of ["Content hash", "By us", "By you", "Reference", "Kind"]) expect(message).not.toContain(gone);
  await openScreen(page, "work/changed");
  await expect(page.getByText("The headcount moved to", { exact: false }).first()).toBeVisible(LOADED);
  await read("What changed's pane");
  // Pause on a to-do, whose text may hold a day written as year-month-day, and the search box.
  const me = ((await (await page.request.get("api/people", { headers: AUTH })).json()) as Array<{ id: string; is_pm: boolean }>).find((p) => p.is_pm)!.id;
  const stamp = Date.now() % 100_000;
  for (const text of [`Send the venue list ${stamp} by ${ahead(2)}.`, `Lend the trailer ${stamp} on ${ahead(3)}`]) {
    const made = await page.request.post("api/todos", { headers: AUTH, data: { text, when: ahead(2), owners: [me] } });
    expect(made.ok(), await made.text()).toBe(true);
  }
  await page.unroute("**/api/changes");
  await openScreen(page, "work/open");
  const row = page.getByRole("listitem").filter({ hasText: `Send the venue list ${stamp}` }).first();
  await row.getByRole("button", { name: /^More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Pause" }).click();
  const pick = page.getByRole("combobox", { name: "Or pick what it waits on" });
  await expect(pick).toBeVisible(LOADED);
  const options = (await choicesOf(pick)).map((c) => c.label).join("\n");
  for (const hit of findInternals(options)) found.push(`Pause: ${hit}`);
  await page.keyboard.press("Escape");
  const search = page.getByRole("banner").getByRole("searchbox");
  await search.fill(`venue list ${stamp}`);
  await expect(page.getByRole("button", { name: new RegExp(`Send the venue list ${stamp}`) }).first()).toBeVisible(LOADED);
  await read("Search");
  expect(found).toEqual([]);
});

test("sending one item back adds none of the others again", async ({ page, request, baseURL }) => {
  test.setTimeout(180_000);
  // The stand-in AI answers a case with its ideal answer, whatever it is handed: the first case that adds two to-dos is used,
  // and every re-run of it gives the same two again.
  const origin = new URL(baseURL!).origin;
  const cases = (await (await request.get(`${origin}/__e2e/cases`)).json()) as Array<{ id: string; pasted?: string; note?: string; stub_answer?: { ops: Array<{ op: string; text?: string }> } }>;
  const pick = cases.find((c) => (c.stub_answer?.ops ?? []).filter((o) => o.op === "action.add").length >= 2);
  test.skip(!pick, "no case of the fixture adds two to-dos");
  const adds = (pick!.stub_answer!.ops).filter((o) => o.op === "action.add").map((o) => o.text as string);
  const open = async () => ((await (await page.request.get("api/open-items", { headers: AUTH })).json()) as { actions: Array<{ text: string }> }).actions.map((a) => a.text);
  const times = (all: string[], text: string) => all.filter((x) => x === text).length;
  await page.goto("?token=e2e-token");
  const before = await open();
  const handed = await page.request.post("api/handin", { headers: AUTH, data: pick!.pasted ? { pasted: pick!.pasted, note: pick!.note ?? "" } : { note: pick!.note ?? "" } });
  expect(handed.ok(), await handed.text()).toBe(true);
  await expect
    .poll(
      async () => {
        const now = await open();
        return adds.every((t) => times(now, t) > times(before, t));
      },
      { timeout: 60_000, message: "the hand-in made its to-dos" },
    )
    .toBe(true);
  const changes = (await (await page.request.get("api/changes", { headers: AUTH })).json()) as Array<{ changeset: { id: string; ops: Array<{ index: number; op: string; status: string; title: string }> } | null }>;
  const made = changes.find((c) => c.changeset?.ops.some((o) => o.op === "action.add" && o.title === adds[0]))!;
  const first = made.changeset!.ops.find((o) => o.op === "action.add" && o.title === adds[0])!;
  const kept = Object.fromEntries(adds.map((t) => [t, times(before, t) + 1]));
  const sent = await page.request.post(`api/changesets/${made.changeset!.id}/send-back`, { headers: AUTH, data: { note: "Not this one", ops: [first.index] } });
  expect(sent.ok(), await sent.text()).toBe(true);
  // The re-run reads the same input again and gives every item once more: the one that was sent back is made anew, and the
  // ones that were kept are not made a second time.
  await expect
    .poll(async () => ((await (await page.request.get("api/changes", { headers: AUTH })).json()) as Array<{ state: string }>).every((c) => !["queued", "running"].includes(c.state)), { timeout: 60_000, message: "the re-run finished" })
    .toBe(true);
  const after = await open();
  for (const text of adds) expect(times(after, text), `"${text}" is there once more than before, not twice`).toBeLessThanOrEqual(kept[text]);
});

test("removing the account the assistant's work runs on asks first, and Today offers no Start while there is no account", async ({ page }) => {
  test.setTimeout(120_000);
  // The account list is read as it is, but with no backup anywhere, so removing the main account would stop the work.
  await page.route("**/api/ai/accounts", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const real = (await (await route.fetch()).json()) as Array<Record<string, unknown>>;
    return route.fulfill({ json: real.map((a) => ({ ...a, backup_for: [] })) });
  });
  const removals: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/api\/ai\/accounts\/[^/]+\/remove$/.test(r.url())) removals.push(r.url());
  });
  await page.goto("?token=e2e-token#settings/ai");
  await expect(page.getByRole("heading", { level: 1, name: /^Settings/ })).toBeVisible(LOADED);
  const menus = page.getByRole("button", { name: /^More actions for / });
  await expect(menus.first()).toBeVisible(LOADED);
  let asked = false;
  for (let i = 0; i < (await menus.count()) && !asked; i += 1) {
    await menus.nth(i).click();
    const remove = page.getByRole("menuitem", { name: /^Remove · .* will have no account for its work$/ });
    if (await remove.count()) {
      await remove.click();
      asked = true;
    } else {
      await page.keyboard.press("Escape");
    }
  }
  expect(asked, "an account whose removal stops the work is on the page").toBe(true);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /^Remove .+\?$/ })).toBeVisible(LOADED);
  await expect(dialog).toContainText("stops until you add one");
  // Nothing has been removed yet, and Cancel removes nothing.
  expect(removals).toEqual([]);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  expect(removals).toEqual([]);

  // With no account, the line that would start the assistant's work says so and offers to add one, never Start.
  await page.route("**/api/status", async (route) => {
    const real = (await (await route.fetch()).json()) as { ai: { state: string; detail: string | null } };
    return route.fulfill({ json: { ...real, ai: { state: "not_set_up", detail: null } } });
  });
  await page.route("**/api/today/queue", (route) =>
    route.fulfill({
      json: [{ key: "first_go", group: "decide", kind: "first_go", count: 2, untrusted: false, estimate_usd: 0.2, unpriced: 0, actions: [], questions: [], outcome: {} }],
    }),
  );
  await page.goto("?token=e2e-token#today");
  await expect(page.getByText("2 items are waiting for an AI account")).toBeVisible(LOADED);
  await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add an AI account" }).first()).toBeVisible(LOADED);
});

test("five quick due-date edits to one to-do leave one What changed row of the edits and no note from a follow-on run", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now() % 100_000;
  const text = `Send the headcount ${stamp}.`;
  const todo = await theTodo(page, text);
  await page.goto("?token=e2e-token");
  // Five edits of the day, one after another, as fast as a person can save them.
  let version = todo.version;
  const days = [3, 4, 5, 6, 7].map(ahead);
  for (const day of days) {
    const saved = await page.request.post("api/records/edit", { headers: AUTH, data: { kind: "action", id: todo.id, fields: { due: day }, read_version: version } });
    expect(saved.ok(), await saved.text()).toBe(true);
    version = ((await (await page.request.get(`api/record?kind=action&id=${todo.id}`, { headers: AUTH })).json()) as { version: number }).version;
  }
  type Row = { id: string; state: string; follows: string | null; edits?: Array<{ id: string }>; changeset: { ops: Array<{ op: string }> } | null };
  const rows = async () => (await (await page.request.get("api/changes", { headers: AUTH })).json()) as Row[];
  // The assistant's follow-on work settles: nothing is tied to a to-do's day, so it closes without a run.
  await expect.poll(async () => (await rows()).every((r) => !["queued", "running"].includes(r.state)), { timeout: 60_000, message: "the follow-on work settled" }).toBe(true);
  const all = await rows();
  const own = all.filter((r) => (r.edits ?? []).length > 1);
  expect(own.some((r) => (r.edits ?? []).length === days.length), "the five edits are one row").toBe(true);
  const followOns = all.filter((r) => r.follows !== null);
  expect(followOns.length, "at most one follow-on outcome for the five edits").toBeLessThanOrEqual(1);
  for (const row of followOns) expect(row.changeset?.ops.some((o) => o.op === "note") ?? false, "the follow-on filed no note").toBe(false);
  const notes = (await (await page.request.get("api/notes", { headers: AUTH })).json()) as Array<{ text: string }>;
  expect(notes.filter((n) => n.text.includes(text) || n.text.includes("What moved")), "no note repeats what the run was sent").toEqual([]);
  // On the screen: one row of the person's edits, "You changed … 5 times".
  await openScreen(page, "work/changed");
  await expect(page.getByText(`You changed Send the headcount ${stamp}`).first()).toBeVisible(LOADED);
  await expect(page.getByText(`${days.length} times`).first()).toBeVisible(LOADED);
});
