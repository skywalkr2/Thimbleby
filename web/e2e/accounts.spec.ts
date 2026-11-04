// A person with several accounts and sides (design 6.32, 7.7, 7.9; re-sweep X77 to X82, X84, X45): three accounts of one mail
// and calendar service are signed in through the service's own page, one at a time, then read; the screens tell them apart and
// tell each one's state from its own. A workspace made by the init command with no template, started by the serve command, with
// the mail add-on on, and the fake services (tests/fake_services.py) playing three people (`--accounts 3`): each with an inbox
// and a calendar of their own, one invitation and one thread in the first two, and one calendar entry in the first two that
// overlap. /__e2e/failing makes one account fail afterwards. Addresses come from the fake services, never written out here.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { choicesOf, choose } from "./choose";
import { collectProblems, fakeAddress, pressStart, showSteps, type Info } from "./journey-helpers";
import { pickSide, sideFilter } from "./side-pick";

const FAKE = `http://127.0.0.1:${process.env.JOURNEY_ACCOUNTS_FAKE_PORT ?? 8769}`;
void fakeAddress;

const LOADED = { timeout: 60_000 };
let info: Info;
let addresses: string[];
const problems: string[] = [];

// The Schedule shortens a calendar's name to the part before the "@" when every calendar shares one domain.
const onSchedule = (address: string) => `Your calendar, ${address.split("@")[0]}`;

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);

async function signIn(page: Page, address: string, first: boolean) {
  const section = page.locator("section", { has: page.locator("#sign-ins-title") }).first();
  const card = page.getByRole("region", { name: address, exact: true });
  const button = first ? section.getByRole("button", { name: "Sign in to Example mail", exact: true }) : section.getByRole("button", { name: "Add another account to Example mail", exact: true });
  const [popup] = await Promise.all([page.waitForEvent("popup"), button.click()]);
  // The service's own page asks which account; the made-up one lists each address as a link.
  await popup.getByRole("link", { name: address, exact: true }).click();
  await popup.waitForEvent("close", { timeout: 30_000 }).catch(() => undefined);
  // The account is a card of its own once it is signed in.
  await expect(card).toBeVisible(LOADED);
}

const connections = (page: Page) => page.getByRole("list", { name: "Connections", exact: true }).first();
/** One account's card, by its address. */
const card = (page: Page, address: string) => page.locator(`[data-connection-card="${address}"]`);

test.describe.serial("several accounts", () => {
  test.beforeAll(async () => {
    info = await (await fetch(`${FAKE}/__e2e/info`)).json();
    addresses = ((await (await fetch(`${FAKE}/__e2e/accounts`)).json()) as { accounts: Array<{ address: string }> }).accounts.map((a) => a.address);
    expect(addresses).toHaveLength(3);
  });
  test.afterAll(() => {
    expect(problems.filter((p) => !p.includes("Failed to load resource"))).toEqual([]);
  });

  test("X79. three accounts signed in: each connection is named by its account, never three identical Your inbox", async ({ page }) => {
    test.setTimeout(240_000);
    collectProblems(page, problems);
    await page.goto(`?token=${info.token}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible(LOADED);
    if (await page.getByRole("button", { name: "Finish later" }).count()) await page.getByRole("button", { name: "Finish later" }).click();
    await go(page, "settings/connections");
    await expect(page.getByRole("heading", { level: 2, name: "Connections" })).toBeVisible(LOADED);
    for (const [n, address] of addresses.entries()) await signIn(page, address, n === 0);
    // Six connections, each named by its account; none of them is just "Your inbox".
    for (const address of addresses) {
      await expect(connections(page).getByRole("listitem", { name: `Your inbox, ${address}` })).toBeVisible(LOADED);
      await expect(connections(page).getByRole("listitem", { name: `Your calendar, ${address}` })).toBeVisible(LOADED);
    }
    await expect(connections(page).getByRole("listitem", { name: "Your inbox", exact: true })).toHaveCount(0);
    // Every row is read, and every account is asked for no sign-in while all are well.
    for (const address of addresses) {
      await expect(connections(page).getByRole("listitem", { name: `Your inbox, ${address}` })).toContainText("Read", LOADED);
    }
    // One card for each account address, each holding that account's inbox and calendar, and none asking to sign in.
    await expect(page.locator("[data-connection-card]")).toHaveCount(3);
    for (const address of addresses) {
      await expect(card(page, address).getByRole("heading", { name: address, exact: true })).toBeVisible();
      await expect(card(page, address).getByRole("listitem")).toHaveCount(2);
      await expect(card(page, address)).toContainText("Connected");
    }
    await expect(page.locator("[data-connection-card][data-need]")).toHaveCount(0);
    await expect(page.locator("table")).toHaveCount(0);
    await expect(page.locator("[data-status]").first()).not.toHaveAttribute("data-status", "connection_failed");
  });

  test("X78 and X45. the same invitation is one entry on the Schedule naming both calendars; the legend tells the calendars apart and hides one", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "schedule");
    await expect(page.getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible(LOADED);
    // Month shows every day of the invitation once: Quarterly review appears one time, not once for each account.
    await page.getByRole("radio", { name: "Month" }).check().catch(() => page.getByRole("radio", { name: "Month" }).click());
    const review = page.getByRole("button", { name: /Quarterly review/ });
    await expect(review.first()).toBeVisible(LOADED);
    await expect(review).toHaveCount(1);
    await expect(review.first()).toContainText(`also in ${onSchedule(addresses[1])}`);
    // The legend: a button for each calendar with its name, and pressed while its entries show.
    const legend = page.getByRole("list", { name: "Calendars", exact: true });
    await expect(legend.getByRole("button")).toHaveCount(3);
    for (const address of addresses) await expect(legend.getByRole("button", { name: onSchedule(address), exact: true })).toHaveAttribute("aria-pressed", "true");
    // Each calendar has a color of its own, never two the same, beside its name.
    const colors = await legend.locator("[data-color]").evaluateAll((els) => els.map((el) => el.getAttribute("data-color")));
    expect(new Set(colors).size).toBe(3);
    // Hiding the third calendar hides its entries and says so in words, not only by the mark.
    const third = legend.getByRole("button", { name: onSchedule(addresses[2]) });
    const before = await page.locator("[data-entry-key]").count();
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "false");
    await expect(third).toContainText("Hidden");
    expect(await page.locator("[data-entry-key]").count()).toBeLessThan(before);
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "true");
    // The entry's page says which calendars hold it.
    await review.first().click();
    // (The row names them too, in words for a screen reader; the page's own label is the whole text of its term.)
    await expect(page.getByText("Also in", { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test("X78. the same thread in two mailboxes is one row of Came in, naming the other mailbox", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "today");
    const came = page.getByRole("region", { name: /Came in/ });
    await expect(came).toBeVisible(LOADED);
    // The card lists the first rows of what came in (`ui.today.rail_rows`) and folds the rest behind "N more".
    // The rows are read before the fold is looked for, so a slow read can't be mistaken for "nothing is folded".
    await expect(came.getByRole("listitem").first()).toBeVisible(LOADED);
    const more = came.getByRole("button", { name: /^\d+ more$/ });
    if (await more.count()) await more.click();
    const thread = came.getByText("Joint lease renewal");
    await expect(thread.first()).toBeVisible(LOADED);
    await expect(thread).toHaveCount(1);
    await expect(came.getByText(/also in Your inbox, /)).toHaveCount(1);
  });

  test("X82. a business added after the accounts asks which of the connected mailboxes and calendars serve it, and Connections can change it later", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/business");
    await page.getByRole("button", { name: "Add a business" }).click();
    const form = page.getByRole("dialog", { name: "Add a business" });
    await form.getByRole("textbox", { name: /^Business name/ }).fill("Harborview Community Support Partnership Incorporated");
    await form.getByRole("button", { name: "Add the business" }).click();
    const ask = page.getByRole("dialog", { name: /^Which of your connections serve/ });
    await expect(ask).toBeVisible(LOADED);
    // Every connected mailbox and calendar is a tick; the second account's two serve the business.
    const group = ask.getByRole("group", { name: /^Serve / });
    await expect(group.getByRole("checkbox")).toHaveCount(6);
    await group.getByRole("checkbox", { name: `Your inbox, ${addresses[1]}` }).check();
    await group.getByRole("checkbox", { name: `Your calendar, ${addresses[1]}` }).check();
    await expect(group.getByRole("checkbox", { name: `Your inbox, ${addresses[1]}` })).toBeChecked();
    // Each tick is saved as it is made, one after the other; both are in the settings before the drawer is closed.
    await expect
      .poll(
        async () => {
          const read = (await (await page.request.get("api/settings", { headers: { Authorization: `Bearer ${info.token}` } })).json()) as { items: Array<{ key: string; value: unknown }> };
          const held = read.items.find((i) => i.key === "watch.sources")!.value as Array<{ label: string; sides?: string[] }>;
          return held.filter((x) => x.label.endsWith(addresses[1]) && (x.sides ?? []).length > 1).length;
        },
        { timeout: 30_000 },
      )
      .toBe(2);
    await ask.getByRole("button", { name: "Done" }).click();
    // Later, the same sides are in the connection's own change form, beside the rest of its settings.
    await go(page, "settings/connections");
    const row = connections(page).getByRole("listitem", { name: `Your inbox, ${addresses[1]}` });
    await row.getByRole("button", { name: `More actions for Your inbox, ${addresses[1]}` }).click();
    await page.getByRole("menuitem", { name: "Change" }).click();
    const sides = page.getByRole("group", { name: `Your inbox, ${addresses[1]}: who is it for?` });
    await expect(sides).toBeVisible(LOADED);
    await expect(sides.getByRole("checkbox", { name: "Harborview Community Support Partnership Incorporated" })).toBeChecked();
    await expect(sides.getByRole("checkbox", { name: "Personal" })).toBeChecked();
  });

  test("G5b. the business page puts a section's gap under its buttons and a small one under the label of its rows; Connections stands the accounts a section's gap below its last card", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`?token=${info.token}#settings/business`);
    const label = page.getByRole("heading", { level: 3, name: "What it is called" });
    await expect(label).toBeVisible(LOADED);
    const buttons = (await page.getByRole("button", { name: "Add a job" }).boundingBox())!;
    const words = (await label.boundingBox())!;
    const rows = (await page.locator("[data-side]").first().boundingBox())!;
    // Measured: 32px (a section's gap) under the buttons, at most 12px between the label and its first row.
    expect(words.y - (buttons.y + buttons.height)).toBeGreaterThanOrEqual(28);
    expect(rows.y - (words.y + words.height)).toBeLessThanOrEqual(12);
    await go(page, "settings/connections");
    const accounts = page.locator("#sign-ins-title");
    await expect(accounts).toBeVisible(LOADED);
    const last = (await page.locator("[data-connection-card]").last().boundingBox())!;
    const heading = (await accounts.boundingBox())!;
    expect(heading.y - (last.y + last.height)).toBeGreaterThanOrEqual(28);
  });

  test("X80. under the business filter Today leaves out what is only Personal: the first account's mail, and a clash that is not on the business", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "today");
    await expect(sideFilter(page)).toBeVisible(LOADED);
    const came = page.getByRole("region", { name: /Came in/ });
    // The card lists the first rows of what came in (`ui.today.rail_rows`) and folds the rest behind "N more": opened before a row is looked for.
    const all = async () => {
      await expect(came).toBeVisible(LOADED);
      const more = came.getByRole("button", { name: /^\d+ more$/ });
      if (await more.count()) await more.click();
    };
    await all();
    await expect(came.getByText("Question for account 1")).toBeVisible(LOADED);
    await pickSide(page, "Harborview Community Support Partnership Incorporated");
    await all();
    // The first account serves only Personal: its own mail is not shown under the business, the second account's (which serves both) is.
    await expect(came.getByText("Question for account 1")).toHaveCount(0);
    await expect(came.getByText("Question for account 2")).toBeVisible();
    // The clash between the first and the second account's meetings is between Personal and the business: it shows under the business.
    await expect(page.locator('[data-queue-line="clash"]').first()).toBeVisible(LOADED);
    await pickSide(page, "Personal");
    await all();
    await expect(came.getByText("Question for account 1")).toBeVisible();
    await pickSide(page, "All");
  });

  test("X77. one account failing is one line naming it with Sign in again; its rows say so, the others still say Read, and the header says a connection failed", async ({ page }) => {
    test.setTimeout(180_000);
    await fetch(`${FAKE}/__e2e/failing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: 2, how: "expired" }) });
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/connections");
    const failing = addresses[1];
    // Read it now: the service refuses the second account's sign-in.
    for (const label of [`Your inbox, ${failing}`, `Your calendar, ${failing}`]) {
      const row = connections(page).getByRole("listitem", { name: label });
      await row.getByRole("button", { name: `More actions for ${label}` }).click();
      await page.getByRole("menuitem", { name: "Read now" }).click();
    }
    const needs = page.locator("[data-connection-card][data-need]");
    await expect(needs).toHaveCount(1, LOADED);
    await expect(needs).toHaveAttribute("data-connection-card", failing);
    await expect(needs.getByRole("button", { name: `Sign in again as ${failing}` })).toBeVisible();
    // Not nine identical red lines: the rows say what they need, and none of this account's says Read.
    for (const label of [`Your inbox, ${failing}`, `Your calendar, ${failing}`]) {
      const row = connections(page).getByRole("listitem", { name: label });
      await expect(row).toContainText(/Not read (since|yet)/);
      await expect(row).not.toContainText(/\bRead\b(?! every)/);
      await expect(row.locator(".problem-note")).toHaveCount(0);
    }
    // The other accounts are read.
    for (const address of [addresses[0], addresses[2]]) await expect(connections(page).getByRole("listitem", { name: `Your inbox, ${address}` })).toContainText("Read");
    // The header never says all good beside it; its popover names the account once.
    await expect(page.locator("[data-status]").first()).toHaveAttribute("data-status", "connection_failed", LOADED);
    await page.locator("[data-status]").first().click();
    const dialog = page.getByRole("dialog", { name: "Status" });
    // The account is one row, said once, and the sign-in lines of the page and the header are the same row.
    const rows = dialog.getByRole("list", { name: "Accounts" }).getByRole("listitem");
    await expect(rows.filter({ hasText: failing })).toHaveCount(1);
    await expect(rows.filter({ hasText: failing })).toContainText("Needs sign-in");
    await expect(dialog.locator("[data-coverage='unread']")).toHaveCount(0);
    await page.keyboard.press("Escape");
    // A failure becomes a line on Today only once it has lasted longer than the connection's read interval since its last good read
    // (`watch.unread_gap_factor`). The test server moves the account's reads back in time, as if they had been made hours ago;
    // Today then holds one line for the account, never one for each of its connections.
    const aged = await page.request.post(new URL("/__e2e/age-runs", page.url()).href, { data: { account: failing, minutes: 6 * 60 } });
    expect(aged.ok(), await aged.text()).toBe(true);
    await go(page, "today");
    await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeVisible(LOADED);
    await expect(page.locator('[data-queue-line="source_unread"]')).toHaveCount(1, LOADED);
    await expect(page.locator('[data-queue-line="source_unread"]')).toContainText(failing);
  });

  test("VC13. with one of three accounts failing the header says 1 account needs you, and its popover is one state row for each account, not a wall of red lines", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/connections");
    const chip = page.locator("[data-status]").first();
    await expect(chip).toHaveAttribute("data-status", "connection_failed", LOADED);
    // The pill and the page say the same thing: one account, named once, in the same words.
    await expect(chip).toContainText("1 account needs you");
    await expect(chip).toHaveAttribute("data-tone", "danger");
    const failing = addresses[1];
    const onPage = page.locator("[data-connection-card][data-need]");
    await expect(onPage).toHaveCount(1);
    const pageWords = ((await onPage.locator("header [data-state-mark]").first().innerText()) ?? "").trim();
    expect(pageWords).toMatch(/^Needs sign-in/);

    await chip.click();
    const dialog = page.getByRole("dialog", { name: "Status" });
    const rows = dialog.getByRole("list", { name: "Accounts" }).getByRole("listitem");
    // One row for each of the three accounts, whatever number of connections each holds.
    await expect(rows).toHaveCount(3);
    for (const address of addresses) await expect(rows.filter({ hasText: address })).toHaveCount(1);
    // The failing one has the edge, the tint, its words and its button; the others are a dot and a word and nothing more.
    const bad = rows.filter({ hasText: failing });
    await expect(bad).toHaveAttribute("data-state", "danger");
    await expect(bad.locator("[data-state-mark]")).toHaveText(pageWords);
    await expect(bad.locator("[data-state-mark] svg")).toHaveCount(1);
    await expect(bad.getByRole("button", { name: `Sign in again as ${failing}` })).toBeVisible();
    for (const address of [addresses[0], addresses[2]]) {
      const ok = rows.filter({ hasText: address });
      await expect(ok).not.toHaveAttribute("data-state", /./);
      await expect(ok.locator("[data-state-mark]")).toContainText("Read");
      await expect(ok.getByRole("button")).toHaveCount(0);
    }
    // Nothing in the popover is a red line of its own: the state is the row's.
    await expect(dialog.locator(".problem-note")).toHaveCount(0);
    // The edge is drawn: a 3px bar on the failing row's leading side.
    const edge = await bad.evaluate((el) => {
      const after = getComputedStyle(el, "::before");
      return { width: after.width, content: after.content };
    });
    expect(edge.width).toBe("3px");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    await page.keyboard.press("Escape");
  });

  test("VS06. the calendars are toggles with their color: pressing one hides its entries and says Hidden, pressing it again shows them; the week never scrolls sideways at 1440, 1024 and 390", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`?token=${info.token}`);
    for (const [width, lanes] of [[1440, 5], [1024, 5], [390, 0]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await go(page, "schedule");
      await expect(page.getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible(LOADED);
      await page.locator("body").press("2");
      // Exact: the list of calendars that need a sign-in is named "Calendars that need you to sign in" and holds a button too.
      const toggles = page.getByRole("list", { name: "Calendars", exact: true });
      await expect(toggles.getByRole("button")).toHaveCount(3, LOADED);
      if (lanes) await expect(page.locator("main ul[data-day]")).toHaveCount(lanes);
      else await expect(page.locator("main [data-schedule-list]")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      // On a phone the toggles scroll inside their own row, never moving the page.
      if (width === 390) expect(["auto", "scroll"]).toContain(await toggles.evaluate((el) => getComputedStyle(el).overflowX));
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await go(page, "schedule");
    // The month: the third calendar's one entry is an all-day holiday three days ahead, which the day view of today never shows.
    await page.locator("body").press("4");
    const toggles = page.getByRole("list", { name: "Calendars", exact: true });
    const third = toggles.getByRole("button", { name: onSchedule(addresses[2]) });
    const color = await third.locator("[data-color]").getAttribute("data-color");
    const mine = page.locator(`main [data-entry-key][data-color="${color}"]`);
    await expect(mine.first()).toBeVisible(LOADED);
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "false");
    await expect(third).toContainText("Hidden");
    await expect(mine).toHaveCount(0);
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "true");
    await expect(mine.first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test("VS18. on a phone the failing account's card is first, its name, its state and Sign in again before anything else; signing in as another account is refused in words, and the header agrees", async ({ page }) => {
    test.setTimeout(180_000);
    // The second account is still the one the service refused (set in the earlier tests).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/connections");
    const failing = addresses[1];
    const chip = page.locator("[data-status]").first();
    await expect(chip).toContainText("1 account needs you", LOADED);
    // One card for each account, the one that needs the person first.
    const cards = page.locator("[data-connection-card]");
    await expect(cards).toHaveCount(3, LOADED);
    const first = cards.first();
    await expect(first).toHaveAttribute("data-connection-card", failing);
    await expect(first).toHaveAttribute("data-need", /./);
    // Its name, its state and its one button come before what kind of service it is and before its connections.
    const top = async (locator: ReturnType<Page["locator"]>) => (await locator.first().boundingBox())!.y;
    const name = await top(first.getByRole("heading", { name: failing, exact: true }));
    const state = await top(first.locator("[data-state-mark]"));
    const again = await top(first.getByRole("button", { name: `Sign in again as ${failing}` }));
    const service = await top(first.getByText("Example mail", { exact: true }));
    const parts = await top(first.getByRole("listitem"));
    expect(name).toBeLessThan(state);
    expect(state).toBeLessThan(again);
    expect(again).toBeLessThan(service);
    expect(service).toBeLessThan(parts);
    // The pill and the cards count the same accounts.
    await expect(page.locator("[data-connection-card][data-need]")).toHaveCount(1);
    // Signing in again as the wrong account: the service's page is asked for the first account, which is not this one.
    const [popup] = await Promise.all([page.waitForEvent("popup"), first.getByRole("button", { name: `Sign in again as ${failing}` }).click()]);
    await popup.getByRole("link", { name: addresses[0], exact: true }).click();
    await popup.waitForEvent("close", { timeout: 30_000 }).catch(() => undefined);
    const refused = first.getByRole("alert");
    await expect(refused).toContainText(`That was a different account: ${addresses[0]}. Sign in as ${failing}.`, LOADED);
    await expect(refused.getByRole("button", { name: "Try again" })).toBeVisible();
    // Nothing was added or replaced: still three accounts, the same one needing the person, and the pill says the same.
    await expect(cards).toHaveCount(3);
    await expect(page.locator("[data-connection-card][data-need]")).toHaveCount(1);
    await expect(chip).toContainText("1 account needs you");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test("X84. setup's mail step with three accounts is one compact row for each, not a wall", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`?token=${info.token}`);
    await go(page, "setup");
    // The walkthrough opens on its welcome the first time; its steps are listed once it is started.
    await pressStart(page);
    await showSteps(page);
    await page.getByRole("navigation", { name: "Setup steps" }).getByRole("button", { name: /^Mail and calendar/ }).click();
    const result = page.locator("[data-mail-result]");
    await expect(result).toBeVisible(LOADED);
    const rows = result.getByRole("list", { name: "The accounts being read" }).getByRole("listitem");
    await expect(rows).toHaveCount(3);
    for (const [n, address] of addresses.entries()) await expect(rows.nth(n)).toContainText(address);
    // Three rows and a Continue, not a page of blocks: the whole result is short and never wider than the window.
    const box = (await result.boundingBox())!;
    expect(box.height, "the mail step's result is a short list, not a 1900px wall").toBeLessThan(900);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test("X85. each follow-up draft says which mailbox it is sent from: a list of the three, starting on the one the conversation is in", async ({ page }) => {
    test.setTimeout(120_000);
    const auth = { Authorization: `Bearer ${info.token}` };
    // Someone who writes to the second account, and a to-do for them to send a message about.
    const person = (await (await page.request.post("api/people", { headers: auth, data: { full_name: "Pat Sample", how_to_reach: { email: ["pat.sample@partner.example.com"] } } })).json()) as { id: string };
    const added = await page.request.post("api/todos", { headers: auth, data: { text: "Send the lease papers", owners: [person.id] } });
    expect(added.ok()).toBe(true);
    await page.goto(`?token=${info.token}`);
    await go(page, "work/followups");
    await expect(page.getByRole("heading", { level: 1, name: "Follow-ups" })).toBeVisible(LOADED);
    // At this width the first person's card is open beside the list already; the only button named for them is its menu.
    await expect(page.getByRole("heading", { level: 2, name: "Pat Sample" })).toBeVisible(LOADED);
    const pick = page.getByRole("combobox", { name: "Send to Pat Sample from" });
    await expect(pick).toBeVisible(LOADED);
    expect((await choicesOf(pick)).map((c) => c.label)).toEqual(addresses);
    // Mail from them was read in the first account's mailbox, so that is where the draft starts.
    await expect(pick).toHaveAttribute("value", addresses[0]);
    await choose(pick, addresses[2]);
    await expect(pick).toHaveAttribute("value", addresses[2]);
  });

  test("X53. after a person's own sign-out the rows and the status say signed out, and the header says so as a warning: not Read, not All good, not Connection failed", async ({ page }) => {
    test.setTimeout(180_000);
    const auth = { Authorization: `Bearer ${info.token}` };
    await page.goto(`?token=${info.token}`);
    const listed = (await (await page.request.get("api/sign-ins", { headers: auth })).json()) as Array<{ name: string; accounts: Array<{ key: string; address: string | null }> }>;
    const signIn = listed.find((l) => l.accounts.some((a) => a.address === addresses[1]))!;
    const account = signIn.accounts.find((a) => a.address === addresses[1])!;
    // Signing out the account that was failing leaves only a deliberate sign-out: nothing was refused any more.
    const out = await page.request.delete(`api/sign-ins/${signIn.name}?account=${encodeURIComponent(account.key)}`, { headers: auth });
    expect(out.ok()).toBe(true);
    await go(page, "settings/connections");
    for (const label of [`Your inbox, ${addresses[1]}`, `Your calendar, ${addresses[1]}`]) {
      const row = connections(page).getByRole("listitem", { name: label });
      await expect(row).toContainText(/Not read (since|yet)/, LOADED);
      await expect(row).not.toContainText(/\bRead\b(?! every)/);
    }
    await expect(card(page, addresses[1])).toContainText("Signed out");
    const chip = page.locator("[data-status]").first();
    await expect(chip).toHaveAttribute("data-status", "connection_signed_out", LOADED);
    // The account needs the person (to sign in again), and the header counts it the way Connections lists it.
    await expect(chip).toContainText("1 account needs you");
    await expect(chip).not.toContainText("All good");
    await expect(chip).not.toContainText("Connection failed");
    await expect(chip).toHaveAttribute("data-tone", "warn");
  });
});
