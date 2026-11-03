// A person with several accounts and sides (design 6.32, 7.7, 7.9; re-sweep X77 to X82, X84, X45): three accounts of one mail
// and calendar service are signed in through the service's own page, one at a time, then read; the screens tell them apart and
// tell each one's state from its own. A workspace made by the init command with no template, started by the serve command, with
// the mail add-on on, and the fake services (tests/fake_services.py) playing three people (`--accounts 3`): each with an inbox
// and a calendar of their own, one invitation and one thread in the first two, and one calendar entry in the first two that
// overlap. /__e2e/failing makes one account fail afterwards. Addresses come from the fake services, never written out here.
import { expect, test, type Page } from "@playwright/test";
import { collectProblems, fakeAddress, type Info } from "./journey-helpers";

const FAKE = `http://127.0.0.1:${process.env.JOURNEY_ACCOUNTS_FAKE_PORT ?? 8769}`;
void fakeAddress;

const LOADED = { timeout: 60_000 };
let info: Info;
let addresses: string[];
const problems: string[] = [];

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);

async function signIn(page: Page, address: string, first: boolean) {
  const section = page.locator("section", { has: page.locator("#sign-ins-title") }).first();
  const button = first ? section.getByRole("button", { name: "Sign in to Example mail", exact: true }) : section.getByRole("button", { name: "Add another account to Example mail", exact: true });
  const [popup] = await Promise.all([page.waitForEvent("popup"), button.click()]);
  // The service's own page asks which account; the made-up one lists each address as a link.
  await popup.getByRole("link", { name: address, exact: true }).click();
  await popup.waitForEvent("close", { timeout: 30_000 }).catch(() => undefined);
  await expect(section.getByText(address).first()).toBeVisible(LOADED);
}

const connections = (page: Page) => page.getByRole("table", { name: "Connections" });

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
      await expect(connections(page).getByRole("row", { name: `Your inbox, ${address}` })).toBeVisible(LOADED);
      await expect(connections(page).getByRole("row", { name: `Your calendar, ${address}` })).toBeVisible(LOADED);
    }
    await expect(connections(page).getByRole("row", { name: "Your inbox", exact: true })).toHaveCount(0);
    // Every row is read, and every account is asked for no sign-in while all are well.
    for (const address of addresses) {
      await expect(connections(page).getByRole("row", { name: `Your inbox, ${address}` })).toContainText("Read", LOADED);
    }
    await expect(page.getByRole("list", { name: "Accounts that need you to sign in" })).toHaveCount(0);
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
    await expect(review.first()).toContainText(`also in Your calendar, ${addresses[1]}`);
    // The legend: a button for each calendar with its name, and pressed while its entries show.
    const legend = page.getByRole("list", { name: "Calendars" });
    await expect(legend.getByRole("button")).toHaveCount(3);
    for (const address of addresses) await expect(legend.getByRole("button", { name: `Your calendar, ${address}` })).toHaveAttribute("aria-pressed", "true");
    // Each calendar has a color of its own, never two the same, beside its name.
    const colors = await legend.locator("[data-color]").evaluateAll((els) => els.map((el) => el.getAttribute("data-color")));
    expect(new Set(colors).size).toBe(3);
    // Hiding the third calendar hides its entries and says so in words, not only by the mark.
    const third = legend.getByRole("button", { name: `Your calendar, ${addresses[2]}` });
    const before = await page.locator("[data-entry-key]").count();
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "false");
    await expect(third).toContainText("Hidden");
    expect(await page.locator("[data-entry-key]").count()).toBeLessThan(before);
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "true");
    // The entry's page says which calendars hold it.
    await review.first().click();
    await expect(page.getByText("Also in").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test("X78. the same thread in two mailboxes is one row of Came in, naming the other mailbox", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "today");
    const came = page.getByRole("region", { name: /Came in/ });
    await expect(came).toBeVisible(LOADED);
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
    await ask.getByRole("button", { name: "Done" }).click();
    // Later, the same sides are in the connection's own change form, beside the rest of its settings.
    await go(page, "settings/connections");
    const row = connections(page).getByRole("row", { name: `Your inbox, ${addresses[1]}` });
    await row.getByRole("button", { name: `More actions for Your inbox, ${addresses[1]}` }).click();
    await page.getByRole("menuitem", { name: "Change" }).click();
    const sides = page.getByRole("group", { name: `Your inbox, ${addresses[1]}: who is it for?` });
    await expect(sides).toBeVisible(LOADED);
    await expect(sides.getByRole("checkbox", { name: "Harborview Community Support Partnership Incorporated" })).toBeChecked();
    await expect(sides.getByRole("checkbox", { name: "Personal" })).toBeChecked();
  });

  test("X80. under the business filter Today leaves out what is only Personal: the first account's mail, and a clash that is not on the business", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "today");
    const filter = page.getByRole("radiogroup", { name: "Show" }).first();
    await expect(filter).toBeVisible(LOADED);
    const came = page.getByRole("region", { name: /Came in/ });
    await expect(came.getByText("Question for account 1")).toBeVisible(LOADED);
    await filter.getByRole("radio", { name: /^Harborview/ }).click();
    // The first account serves only Personal: its own mail is not shown under the business, the second account's (which serves both) is.
    await expect(came.getByText("Question for account 1")).toHaveCount(0);
    await expect(came.getByText("Question for account 2")).toBeVisible();
    // The clash between the first and the second account's meetings is between Personal and the business: it shows under the business.
    await expect(page.locator('[data-queue-line="clash"]').first()).toBeVisible(LOADED);
    await filter.getByRole("radio", { name: "Personal" }).click();
    await expect(came.getByText("Question for account 1")).toBeVisible();
    await filter.getByRole("radio", { name: "All" }).click();
  });

  test("X77. one account failing is one line naming it with Sign in again; its rows say so, the others still say Read, and the header says a connection failed", async ({ page }) => {
    test.setTimeout(180_000);
    await fetch(`${FAKE}/__e2e/failing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: 2, how: "expired" }) });
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/connections");
    const failing = addresses[1];
    // Read it now: the service refuses the second account's sign-in.
    for (const label of [`Your inbox, ${failing}`, `Your calendar, ${failing}`]) {
      const row = connections(page).getByRole("row", { name: label });
      await row.getByRole("button", { name: `More actions for ${label}` }).click();
      await page.getByRole("menuitem", { name: "Read now" }).click();
    }
    const needs = page.getByRole("list", { name: "Accounts that need you to sign in" });
    await expect(needs).toBeVisible(LOADED);
    await expect(needs.getByRole("listitem")).toHaveCount(1);
    await expect(needs).toContainText(failing);
    await expect(needs.getByRole("button", { name: `Sign in again as ${failing}` })).toBeVisible();
    // Not nine identical red lines: the rows say what they need, and none of this account's says Read.
    for (const label of [`Your inbox, ${failing}`, `Your calendar, ${failing}`]) {
      const row = connections(page).getByRole("row", { name: label });
      await expect(row).toContainText("Sign in again");
      await expect(row).not.toContainText(/\bRead\b(?! every)/);
      await expect(row.locator(".problem-note")).toHaveCount(0);
    }
    // The other accounts are read.
    for (const address of [addresses[0], addresses[2]]) await expect(connections(page).getByRole("row", { name: `Your inbox, ${address}` })).toContainText("Read");
    // The header never says all good beside it; its popover names the account once.
    await expect(page.locator("[data-status]").first()).toHaveAttribute("data-status", "connection_failed", LOADED);
    await page.locator("[data-status]").first().click();
    const dialog = page.getByRole("dialog", { name: "Status" });
    await expect(dialog.locator("[data-coverage='unread']")).toHaveCount(1);
    await expect(dialog.locator("[data-coverage='unread']")).toContainText(failing);
    await page.keyboard.press("Escape");
    // Today holds one line for the account, not one for each of its connections.
    await go(page, "today");
    await expect(page.locator('[data-queue-line="source_unread"]')).toHaveCount(1, LOADED);
    await expect(page.locator('[data-queue-line="source_unread"]')).toContainText(failing);
  });

  test("X84. setup's mail step with three accounts is one compact row for each, not a wall", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`?token=${info.token}`);
    await go(page, "setup");
    await page.getByRole("button", { name: /^Mail and calendar/ }).click();
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
    await page.getByRole("button", { name: "Pat Sample" }).first().click();
    const pick = page.getByRole("combobox", { name: "Send to Pat Sample from" });
    await expect(pick).toBeVisible(LOADED);
    await expect(pick.getByRole("option")).toHaveText(addresses);
    // Mail from them was read in the first account's mailbox, so that is where the draft starts.
    await expect(pick).toHaveValue(addresses[0]);
    await pick.selectOption(addresses[2]);
    await expect(pick).toHaveValue(addresses[2]);
  });
});
