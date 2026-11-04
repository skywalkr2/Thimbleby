// The shared rules of the visual standard (the reviewer's VP01 to VP06), held by one browser test over six screens at a desktop and a
// phone width, so a screen that drifts back to its own version fails here:
//   VP04  at most one filled button in view: the screen's own primary (the header's Hand something in is the outline and the phone's + is tonal);
//   VP02  every row has the 24px leading slot (none at all, in a list where no row has a mark), and every row title in a list starts at the same x, within 1px;
//   VP03  every group label is uppercase, 11px, and carries its count in a pill;
//   VP06  no element shows a focus ring before a key is pressed, and a key then shows it on the row it moves to;
//   VP01  no screen scrolls sideways, and a screen's header, tabs, lists and rail share the content area's left and right edges;
//   VC05  no browser date, time or list control: every date, time and list to pick from is the app's own (ui/DateField, TimeField, Select).
// The layout server holds the long made-up text and many items of the fixtures, so the rules hold with them. Checked by hand, not
// here: the colors of the weights, a card's edge by night, the order and look of a row's parts (the reviewer's side-by-side pages).
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
const AUTH = { Authorization: "Bearer e2e-token" };

const SIZES = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

interface Screen {
  name: string;
  hash: string;
  /** What shows the screen has loaded what it holds, so a rule is never read on a page still empty. */
  ready: (page: Page) => Promise<void>;
  /** The screen's lists have group labels (at least one is drawn). */
  groups?: boolean;
}

const heading = (page: Page, name: string | RegExp, level: 1 | 2 = 1) => expect(page.getByRole("main").getByRole("heading", { level, name }).first()).toBeVisible(LOADED);
const settled = async (page: Page) => {
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
};

const SCREENS: Screen[] = [
  {
    name: "Today",
    hash: "today",
    groups: true,
    ready: async (page) => {
      await heading(page, /^Good (morning|afternoon|evening)/);
      await expect(page.getByRole("heading", { level: 2, name: "Needs you", exact: true })).toBeVisible(LOADED);
      await expect(page.locator("[data-queue-line]").first()).toBeVisible(LOADED);
    },
  },
  { name: "To-dos and questions", hash: "work/open", groups: true, ready: (page) => heading(page, "To-dos and questions") },
  { name: "Follow-ups", hash: "work/followups", ready: (page) => heading(page, "Follow-ups") },
  { name: "Schedule", hash: "schedule", ready: (page) => heading(page, "Schedule") },
  { name: "Connections", hash: "settings/connections", ready: (page) => heading(page, /^Settings$/) },
  // Settings' own pages and the footers inside them (VP01: the list footers inside panels, Settings' layout).
  { name: "Settings, You", hash: "settings/you", ready: (page) => expect(page.getByRole("navigation", { name: "Settings sections" })).toBeVisible(LOADED) },
  { name: "Settings, AI and spending", hash: "settings/ai", ready: (page) => expect(page.getByRole("navigation", { name: "Settings sections" })).toBeVisible(LOADED) },
];

/** The filled (primary-weight) buttons in the window: those that name their weight, and anything else drawn in the accent color. */
const filledInView = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--accent)";
    document.body.append(probe);
    const accent = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const inView = (el: Element) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth && style.visibility !== "hidden" && style.display !== "none" && !el.closest("[hidden], [inert]");
    };
    const found = new Set<Element>();
    for (const el of Array.from(document.querySelectorAll('[data-weight="filled"]'))) if (inView(el)) found.add(el);
    for (const el of Array.from(document.querySelectorAll("button, a[href], [role=button]"))) if (getComputedStyle(el).backgroundColor === accent && inView(el)) found.add(el);
    return Array.from(found).map((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40));
  });

/** For every row drawn in the main content: its leading slot's size, and where its title starts, grouped by the row's own left edge
 * (rows in the same column of one screen) so a title that is off its list's edge by more than 1px is named. */
const rowEdges = (page: Page) =>
  page.evaluate(() => {
    const visible = (el: Element) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const slots: string[] = [];
    const columns = new Map<number, Array<{ x: number; text: string }>>();
    for (const row of Array.from(document.querySelectorAll("main [data-row], main li[data-queue-line], main section[data-queue-line]"))) {
      if (!visible(row)) continue;
      const lead = row.querySelector(":scope > [data-row-lead]");
      if (!lead) continue;
      const slot = lead.getBoundingClientRect();
      const name = (row.textContent ?? "").trim().slice(0, 24);
      // A list in which no row has a mark takes no width for the slot (an empty lead wider than nothing fails); a list in which one
      // row has one keeps a 24px slot on every row.
      const listHasMark = Array.from(row.parentElement?.children ?? []).some((r) => r.querySelector(":scope > [data-row-lead]:not(:empty)"));
      if (listHasMark) {
        if (Math.abs(slot.width - 24) > 0.5 || Math.abs(slot.height - 24) > 0.5) slots.push(`${Math.round(slot.width)}x${Math.round(slot.height)} "${name}"`);
      } else if (slot.width > 0.5) slots.push(`an empty lead ${Math.round(slot.width)}px wide, in a list with no mark "${name}"`);
      const title = row.querySelector(":scope > * > [data-row-title]");
      if (!title || !visible(title)) continue;
      const left = Math.round(row.getBoundingClientRect().left);
      const list = columns.get(left) ?? [];
      list.push({ x: title.getBoundingClientRect().left, text: (title.textContent ?? "").trim().slice(0, 24) });
      columns.set(left, list);
    }
    const ragged: string[] = [];
    for (const [left, titles] of columns) {
      const xs = titles.map((t) => t.x);
      const spread = Math.max(...xs) - Math.min(...xs);
      if (spread > 1) ragged.push(`rows at ${left}: titles start between ${Math.min(...xs).toFixed(1)} and ${Math.max(...xs).toFixed(1)} ("${titles.find((t) => t.x === Math.max(...xs))?.text}")`);
    }
    return { slots: slots.slice(0, 5), ragged: ragged.slice(0, 5), rows: Array.from(columns.values()).reduce((n, c) => n + c.length, 0) };
  });

/** The group labels drawn, and the ones that are not uppercase, 11px and spaced, or whose count is not a pill. */
const groupLabels = (page: Page) =>
  page.evaluate(() => {
    const bad: string[] = [];
    const labels = Array.from(document.querySelectorAll("main [data-group-label]")).filter((el) => el.getBoundingClientRect().width > 0);
    for (const el of labels) {
      const style = getComputedStyle(el);
      const name = (el.textContent ?? "").trim().slice(0, 20);
      if (style.textTransform !== "uppercase") bad.push(`"${name}" is not uppercase (${style.textTransform})`);
      if (style.fontSize !== "11px") bad.push(`"${name}" is ${style.fontSize}, not 11px`);
      if (style.letterSpacing === "normal" || parseFloat(style.letterSpacing) <= 0) bad.push(`"${name}" has no letter spacing`);
      const count = el.querySelector("[data-group-count]");
      if (count && parseFloat(getComputedStyle(count).borderTopLeftRadius) < 8) bad.push(`"${name}" count is not a pill`);
    }
    return { count: labels.length, bad: bad.slice(0, 5) };
  });

/** What shows a ring: an element that has the cursor and draws an outline or a shadow (a ring, or a row's cursor bar). */
const ringsShown = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [];
    for (const el of Array.from(document.querySelectorAll(":focus-visible, :focus"))) {
      const style = getComputedStyle(el);
      const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      const shadow = style.boxShadow !== "none";
      if (outline || shadow) found.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} (${outline ? `outline ${style.outlineWidth}` : style.boxShadow.slice(0, 60)})`);
    }
    return { found, input: document.documentElement.getAttribute("data-input") };
  });

/** Where a header, its tabs and filters, the lists and the rail start and end: the left and right edges of what the screen draws in
 * the content area, so any that sticks out or falls short of the others by more than 2px is named. */
const contentEdges = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main")!;
    const area = main.getBoundingClientRect();
    const left = area.left + parseFloat(getComputedStyle(main).paddingLeft);
    const right = area.right - parseFloat(getComputedStyle(main).paddingRight);
    const off: string[] = [];
    const blocks = Array.from(main.querySelectorAll("[data-page-header], [data-row-list], section[aria-labelledby], [data-region]")).filter((el) => {
      const box = el.getBoundingClientRect();
      // Only what sits directly on the content area: not what is inside a pane, a row or a card.
      return box.width > 0 && box.height > 0 && !el.parentElement?.closest("[data-row-list], section[aria-labelledby], [data-region], [data-row]");
    });
    for (const el of blocks) {
      const box = el.getBoundingClientRect();
      const name = `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? ` "${el.getAttribute("aria-label")}"` : ""}`;
      if (box.left < left - 2) off.push(`${name} starts ${Math.round(left - box.left)}px outside the content area's left edge`);
      if (box.right > right + 2) off.push(`${name} ends ${Math.round(box.right - right)}px outside the content area's right edge`);
    }
    // The header, its tab strip and its filter strip start on the content area's left edge, whatever the width (a strip that moves
    // from screen to screen, or hangs off the end of the tabs, is the fault this names).
    for (const el of Array.from(main.querySelectorAll("[data-page-header], [data-header-tabs], [data-header-filters]"))) {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && Math.abs(box.left - left) > 2) off.push(`${el.getAttribute("data-page-header") !== null ? "the page header" : "the header's strip"} starts ${Math.round(box.left - left)}px from the content area's left edge`);
    }
    return off.slice(0, 5);
  });

const sideways = (page: Page) => page.evaluate(() => ({ page: document.documentElement.scrollWidth - window.innerWidth, body: document.body.scrollWidth - window.innerWidth }));

async function load(page: Page, hash: string) {
  // A fresh page load, so what has the cursor is what the app gave it as the screen opened, before anything is pressed.
  await page.goto(`?token=e2e-token#${hash}`);
}

test.describe("the shared rules hold on every main screen", () => {
  for (const size of SIZES) {
    for (const screen of SCREENS) {
      test(`${screen.name} at ${size.name}: one filled button, rows on one edge, uppercase group labels, no ring before a key, no sideways scroll`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
        await page.setViewportSize({ width: size.width, height: size.height });
        await load(page, screen.hash);
        await screen.ready(page);
        await settled(page);

        // VP04: the filled weight is the screen's own primary, and no more than one is in view.
        const filled = await filledInView(page);
        expect(filled.length, `filled buttons in view: ${filled.join(" | ")}`).toBeLessThanOrEqual(1);

        // VP02: a 24px leading slot on every row, and titles on one edge.
        const rows = await rowEdges(page);
        expect(rows.slots, "a row's leading slot is not 24px, or is empty and takes width").toEqual([]);
        expect(rows.ragged, "titles of one list do not start on one edge").toEqual([]);
        // The rule is read on real rows: the screens that list things draw rows with a slot and a title.
        if (screen.groups) expect(rows.rows, "the screen draws rows with the shared row").toBeGreaterThan(0);

        // VP03: group labels.
        const labels = await groupLabels(page);
        expect(labels.bad).toEqual([]);
        if (screen.groups && screen.name === "Today") expect(labels.count, "Today draws its groups with the shared label").toBeGreaterThan(0);

        // VP06: no ring, and no cursor fill or bar, before any key is pressed.
        const before = await ringsShown(page);
        expect(before.input, "no key or press has happened yet").toBeNull();
        expect(before.found, "an element shows a ring before a key is pressed").toEqual([]);

        // VP01: no sideways scroll, and what the screen draws on the content area keeps to its edges.
        const wide = await sideways(page);
        expect(wide.page).toBeLessThanOrEqual(0);
        expect(wide.body).toBeLessThanOrEqual(0);
        expect(await contentEdges(page)).toEqual([]);
      });
    }

    test(`a person's page at ${size.name}: the same rules`, async ({ page, request }) => {
      test.setTimeout(120_000);
      const people = (await (await request.get("api/people", { headers: AUTH })).json()) as Array<{ id: string; is_pm: boolean }>;
      const person = people.find((p) => !p.is_pm) ?? people[0];
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await page.setViewportSize({ width: size.width, height: size.height });
      await load(page, `records/person/${encodeURIComponent(person.id)}`);
      await expect(page.getByRole("main").getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
      await settled(page);
      const filled = await filledInView(page);
      expect(filled.length, `filled buttons in view: ${filled.join(" | ")}`).toBeLessThanOrEqual(1);
      const rows = await rowEdges(page);
      expect(rows.slots).toEqual([]);
      expect(rows.ragged).toEqual([]);
      expect((await groupLabels(page)).bad).toEqual([]);
      const before = await ringsShown(page);
      expect(before.input).toBeNull();
      expect(before.found).toEqual([]);
      const wide = await sideways(page);
      expect(wide.page).toBeLessThanOrEqual(0);
      expect(wide.body).toBeLessThanOrEqual(0);
      expect(await contentEdges(page)).toEqual([]);
    });
  }

  test("a key then shows the ring on the row it moves to, and a press takes it away again (roving focus by keyboard still works)", async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await load(page, "today");
    await expect(page.locator("[data-queue-line]").first()).toBeVisible(LOADED);
    // The cursor starts on the first line with nothing drawn on it.
    await expect(page.locator("[data-queue-line]").first()).toBeFocused();
    expect((await ringsShown(page)).found).toEqual([]);
    await page.keyboard.press("j");
    const second = page.locator("[data-queue-line]").nth(1);
    await expect(second).toBeFocused();
    const shown = await ringsShown(page);
    expect(shown.input).toBe("keyboard");
    expect(shown.found.length, "the row reached by the keyboard shows its ring").toBeGreaterThan(0);
    await page.keyboard.press("k");
    await expect(page.locator("[data-queue-line]").first()).toBeFocused();
    expect((await ringsShown(page)).found.length).toBeGreaterThan(0);
    // A press with the pointer takes the ring away: the mouse gets none.
    await page.mouse.click(5, 300);
    expect((await ringsShown(page)).found).toEqual([]);
  });
});

// VP04: the setup guide's steps and an open dialog have one filled button too (they sit over the whole window, so the count is the window's).
for (const size of SIZES) {
  test(`the setup guide at ${size.name}: one filled button in view, and a footer that is at most two rows tall on a phone`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.setViewportSize({ width: size.width, height: size.height });
    await load(page, "setup");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
    await expect(page.locator("[data-step-footer]").first()).toBeVisible(LOADED);
    const filled = await filledInView(page);
    expect(filled.length, `filled buttons in view: ${filled.join(" | ")}`).toBeLessThanOrEqual(1);
    // VP01: the footer's bar and each of its buttons keep to the window's edges (a footer inside a panel is the same rule).
    const bar = (await page.locator("[data-step-footer]").first().boundingBox())!;
    expect(bar.x).toBeGreaterThanOrEqual(-1);
    expect(bar.x + bar.width).toBeLessThanOrEqual(size.width + 1);
    for (const button of await page.locator("[data-step-footer] button").all()) {
      const box = await button.boundingBox();
      if (box) expect(box.x >= 0 && box.x + box.width <= size.width + 1, "a footer button keeps to the window").toBe(true);
    }
    if (size.width < 640) {
      // The blank band before the step is gone: the step's first line is within the header's reach, not centred in the window.
      const title = await page.getByRole("heading", { level: 2 }).first().boundingBox();
      const top = Math.round(title?.y ?? 9999);
      expect(top, "the step starts under the header on a phone").toBeLessThan(160);
      const foot = await page.locator("[data-step-footer]").first().boundingBox();
      expect(foot!.height, "the footer is one or two rows").toBeLessThanOrEqual(120);
    }
  });

  test(`an open dialog at ${size.name} has one filled button in view`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.setViewportSize({ width: size.width, height: size.height });
    await load(page, "work/open");
    await heading(page, "To-dos and questions");
    await page.getByRole("button", { name: /^Hand something in|Hand in/ }).first().click().catch(() => page.getByRole("button", { name: "Add a to-do" }).first().click());
    await expect(page.getByRole("dialog")).toBeVisible(LOADED);
    const filled = await filledInView(page);
    expect(filled.length, `filled buttons in view: ${filled.join(" | ")}`).toBeLessThanOrEqual(1);
  });
}

// VC02: the way back from a page is one control on every page that has one: the same shape and size, at the title's left edge.
for (const size of SIZES) {
  test(`the way back is the same control on every page that has one, at ${size.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.setViewportSize({ width: size.width, height: size.height });
    const found: string[] = [];
    for (const hash of ["handover", "quality", "records/rules-review", "settings/ai-compare"]) {
      await load(page, hash);
      await expect(page.getByRole("heading").first()).toBeVisible(LOADED);
      const back = page.locator("[data-back-link] button");
      await expect(back, `${hash} has one way back`).toHaveCount(1, LOADED);
      const box = (await back.boundingBox())!;
      const head = (await page.getByRole("heading", { level: 1 }).first().boundingBox()) ?? box;
      found.push(`${Math.round(box.height)}x${Math.round(box.x - head.x)}`);
      // A sub-page of Settings draws it under the title, inside its content column; the others at the title's edge.
      if (hash !== "settings/ai-compare") expect(box.x, `${hash}: the way back starts at or left of the title`).toBeLessThanOrEqual(head.x + 1);
    }
    // One height and one place against the title on every page.
    expect(new Set(found.map((f) => f.split("x")[0])).size, `heights ${found.join(", ")}`).toBe(1);
  });
}

// VC05: the browser's own date, time and list controls ("mm/dd/yyyy", "--:-- --", the grey select) are gone from every screen
// and form. A date is a text box with a calendar button, a time a text box with a list of times, a list a button that opens a
// listbox. (A file picker is the browser's own and stays; it is not matched here.)
const NATIVE = "input[type=date], input[type=time], input[type=datetime-local], select";
const native = (page: Page) => page.locator(NATIVE);

test.describe("no browser date, time or list controls (VC05)", () => {
  for (const screen of SCREENS) {
    test(`${screen.name}: none on the screen`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await load(page, screen.hash);
      await screen.ready(page);
      await settled(page);
      await expect(native(page)).toHaveCount(0);
    });
  }

  test("none in the Add to-do form, the Schedule's Add form, Quality's count form or a to-do's Edit details; the day in each is the app's own box (typed words, with a calendar where there is a date to pick)", async ({ page, request }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // To-dos: Add a to-do.
    await load(page, "work/open");
    await heading(page, "To-dos and questions");
    await page.getByRole("textbox", { name: "Add a to-do" }).fill("Call the printer");
    await page.getByRole("button", { name: "More options" }).click();
    const todo = page.getByRole("dialog", { name: "Add a to-do" });
    await expect(todo).toBeVisible(LOADED);
    // How long it takes, who and the repeat are under the form's own More options.
    await todo.getByText("More options").click();
    await expect(native(page)).toHaveCount(0);
    // Its day is the person's own words, read by rules and said back ("Friday", "next Tuesday"): a text box, not a date control.
    await expect(todo.getByRole("textbox", { name: "Due (optional)" })).toBeVisible();
    await expect(todo.getByRole("combobox", { name: "How long it takes" })).toBeVisible();
    // The words carried over make the form unsaved; they are cleared so Escape closes it without asking.
    await todo.getByRole("textbox", { name: "What to do" }).fill("");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Add a to-do" })).toHaveCount(0);

    // Schedule: Add to schedule, with a day, a start time and an end time.
    await load(page, "schedule");
    await heading(page, "Schedule");
    await page.getByRole("button", { name: /^Add (to schedule|an event|a meeting)$|^Add$/ }).first().click();
    await expect(page.getByRole("textbox", { name: "Day" })).toBeVisible(LOADED);
    await expect(native(page)).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /^Starts at/ })).toBeVisible();
    await page.keyboard.press("Escape");

    // Quality: the day count.
    await load(page, "quality");
    await expect(page.getByRole("main").getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
    await settled(page);
    await expect(native(page)).toHaveCount(0);

    // A to-do's Edit details.
    const open = (await (await request.get("api/open-items", { headers: AUTH })).json()) as { actions: Array<{ id: string }> };
    expect(open.actions.length).toBeGreaterThan(0);
    await load(page, `records/action/${open.actions[0].id}`);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
    await page.getByRole("button", { name: "Edit details" }).click();
    await expect(page.getByLabel("Title")).toBeVisible(LOADED);
    await expect(native(page)).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Due", exact: true })).toBeVisible();
  });

  test("a date is typed in the person's words or picked from the calendar, with the keyboard, and the cursor returns to its button", async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const open = (await (await request.get("api/open-items", { headers: AUTH })).json()) as { actions: Array<{ id: string }> };
    await load(page, `records/action/${open.actions[0].id}`);
    await page.getByRole("button", { name: "Edit details" }).click();
    const due = page.getByRole("textbox", { name: "Due", exact: true });
    await expect(due).toBeVisible(LOADED);
    await due.fill("tomorrow");
    await due.blur();
    await expect(due).not.toHaveValue("tomorrow");
    const picker = page.getByRole("button", { name: "Choose a date: Due" });
    await picker.click();
    const dialog = page.getByRole("dialog", { name: "Calendar" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(picker).toBeFocused();
  });
});
