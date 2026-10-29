// People and record pages (the UI/UX review, batch 6; design 6.32, 7.14): a person's email, phone and sides are added and changed
// after setup; a friend is never asked how the person works with them; a person's page is one panel of details beside what is open
// with them; a to-do opens its own page, has one Edit and one open editor at a time; the business is one page; and Settings has Add a
// business and Add a job. The server (`--sides --plain-stages`) is a workspace with Personal, a job and a business, made as setup
// makes them; /__e2e/sides says what they are called. Names that are typed here are plain made-up ones.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };

interface Seeded {
  sides: Record<"personal" | "job" | "business", { id: string; name: string }>;
  todos: Record<"personal" | "job" | "business" | "none", string>;
}
let seeded: Seeded;

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);
const heading = (page: Page, name: string | RegExp) => expect(page.getByRole("heading", { level: 1, name }).first()).toBeVisible(LOADED);
const wider = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe("People and record pages", () => {
  test.beforeAll(async ({ request }) => {
    seeded = await (await request.get("__e2e/sides")).json();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
  });

  test("a person is added with an email, a phone and a side, and changed later; a friend is never asked how you work with them", async ({ page }) => {
    test.setTimeout(120_000);
    await go(page, "records/people");
    await heading(page, "People");
    await page.getByRole("button", { name: "Add a person" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add a person" });
    await expect(dialog.getByRole("textbox", { name: "Full name" })).toBeFocused(LOADED);
    await dialog.getByLabel("Full name").fill("Hattie Fenn");
    // The sides are ticked from the list, and a new person starts with Personal.
    const group = dialog.getByRole("group", { name: "Where they belong" });
    await expect(group.getByRole("checkbox", { name: "Personal" })).toBeChecked();
    await dialog.getByLabel(/^Who they are to you/).fill("my cousin");
    await dialog.getByLabel("Email").fill("hattie.fenn@example.com");
    await dialog.getByLabel("Phone").fill("555 0142");
    await dialog.getByRole("button", { name: "Add a person" }).click();
    await expect(dialog).toHaveCount(0, LOADED);

    // Her page is one panel of details: her email and phone, who she is, her sides, and no work question for a cousin.
    await page.getByRole("link", { name: "Hattie Fenn" }).first().click();
    await page.getByRole("link", { name: "Open Hattie Fenn's page" }).click();
    await heading(page, "Hattie Fenn");
    const details = page.getByRole("region", { name: "Details", exact: true });
    await expect(details.getByText("hattie.fenn@example.com")).toBeVisible(LOADED);
    await expect(details.getByText("555 0142")).toBeVisible(LOADED);
    await expect(details.getByText("my cousin")).toBeVisible(LOADED);
    await expect(page.getByText("How you work with them")).toHaveCount(0);
    await expect(page.getByText(/I manage them|I report to them/)).toHaveCount(0);
    // Nothing is said twice: no separate "how to reach" block, no "Name checked", no "Side" beside "Sides".
    await expect(page.getByText("How to reach them")).toHaveCount(0);
    await expect(page.getByText("Name checked")).toHaveCount(0);
    expect(await wider(page)).toBeLessThanOrEqual(0);

    // Later, she is put on the business side too: the work question appears, and a person from work can be marked as left.
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Edit person" });
    await expect(edit.getByLabel("Email")).toHaveValue("hattie.fenn@example.com");
    await edit.getByRole("group", { name: "Where they belong" }).getByRole("checkbox", { name: seeded.sides.business.name }).check();
    await edit.getByLabel("Phone").fill("555 0199");
    await edit.getByRole("button", { name: "Save" }).click();
    await expect(edit).toHaveCount(0, LOADED);
    await expect(details.getByText("555 0199")).toBeVisible(LOADED);
    await expect(page.getByText("How you work with them")).toBeVisible(LOADED);
    await page.getByRole("button", { name: "More actions for Hattie Fenn" }).click();
    await expect(page.getByRole("menuitem", { name: "Mark as left" })).toBeVisible(LOADED);
    await page.keyboard.press("Escape");
  });

  test("a name already on the list is said while it is typed, and the person's page has tabs, a timeline and one line to ask in", async ({ page }) => {
    test.setTimeout(120_000);
    await go(page, "records/people");
    await heading(page, "People");
    await page.getByRole("button", { name: "Add a person" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add a person" });
    // Someone from the list: the first person other than the person the app is for.
    const links = page.locator('main a[href*="#records/person/"]');
    await expect(links.nth(1)).toBeVisible(LOADED);
    const existing = ((await links.nth(1).textContent()) ?? "").trim();
    await dialog.getByLabel("Full name").fill(existing.toLowerCase());
    await expect(dialog.getByText(`${existing} is already on your list.`)).toBeVisible(LOADED);
    await expect(dialog.getByRole("button", { name: "Add a person" })).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancel" }).click();

    await go(page, ((await links.nth(1).getAttribute("href")) ?? "").replace(/^.*#/, ""));
    await heading(page, existing);
    await expect(page.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^Open with/ })).toBeVisible(LOADED);
    // One line to ask in, with no "nothing has been said" sentence over it.
    await expect(page.getByRole("textbox", { name: "What do you want to know, or have done?" })).toBeVisible(LOADED);
    await expect(page.getByText("Nothing has been said about this yet.")).toHaveCount(0);
    await page.getByRole("button", { name: "Activity" }).click();
    await expect(page.getByRole("region", { name: "Activity" })).toBeVisible(LOADED);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await wider(page), `at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("a to-do's title opens its page, which has Mark done; its menu has one Edit, one editor is open at a time and Escape closes it", async ({ page }) => {
    test.setTimeout(120_000);
    await go(page, "work/open");
    await heading(page, "To-dos and questions");
    const row = page.getByRole("listitem").filter({ hasText: seeded.todos.job }).first();
    await expect(row).toBeVisible(LOADED);
    await row.getByRole("button", { name: /^More actions for/ }).click();
    await expect(page.getByRole("menuitem", { name: "Reassign…" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Change this" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Edit" }).click();
    // Edit has every field: the words, the day, who does it and the project.
    await expect(row.getByRole("textbox", { name: "Title" })).toBeFocused(LOADED);
    await expect(row.getByRole("combobox", { name: "Owner" })).toBeVisible(LOADED);
    // The words are as the list shows them: nothing in them is a date written as numbers.
    await expect(row.getByRole("textbox", { name: "Title" })).toHaveValue(seeded.todos.job);
    // A second editor on the same row closes the first.
    await row.getByRole("button", { name: /^More actions for/ }).click();
    await page.getByRole("menuitem", { name: "Add a note" }).click();
    await expect(row.getByRole("textbox", { name: "Title" })).toHaveCount(0);
    await expect(row.getByRole("textbox", { name: "Your note" })).toBeVisible(LOADED);
    await row.getByRole("textbox", { name: "Your note" }).press("Escape");
    await expect(row.getByRole("textbox", { name: "Your note" })).toHaveCount(0);

    await row.getByRole("link", { name: seeded.todos.job }).click();
    await heading(page, seeded.todos.job);
    await expect(page.getByRole("button", { name: "Mark done" })).toBeVisible(LOADED);
    // Each fact once, in words, and no draft heading with developer help over an empty box.
    await expect(page.getByText("Wording", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/It is long text/)).toHaveCount(0);
    await expect(page.getByText("Where it came from")).toHaveCount(0);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("a to-do that is too long says so beside the field before it is sent", async ({ page }) => {
    await go(page, "work/open");
    await heading(page, "To-dos and questions");
    await page.getByRole("button", { name: "Add a to-do" }).first().click();
    const words = page.getByRole("textbox", { name: "What to do" });
    await words.fill("w".repeat(312));
    await expect(page.getByText(/12 characters too long/)).toBeVisible(LOADED);
    await expect(page.getByRole("dialog").getByRole("button", { name: "Add", exact: true })).toBeDisabled();
    await words.fill("Water the ferns");
    await expect(page.getByText(/characters too long/)).toHaveCount(0);
  });

  test("Notes is a screen of its own, reached from the side menu", async ({ page }) => {
    await page.getByRole("navigation", { name: "Views" }).getByRole("link", { name: "Notes", exact: true }).click();
    await heading(page, "Notes");
    await expect(page.getByText("No notes yet. A note you hand in to be kept shows up here.")).toBeVisible(LOADED);
    expect(await wider(page)).toBeLessThanOrEqual(0);
  });

  test("Settings adds a job and a business, and removing one asks about its organization; the business has one page", async ({ page }) => {
    test.setTimeout(180_000);
    await go(page, "settings/business");
    await expect(page.getByRole("heading", { level: 2, name: "Your business", exact: true })).toBeVisible(LOADED);
    await page.getByRole("button", { name: "Add a business" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a business" });
    await dialog.getByLabel(/^Business name/).fill("Quarry Studio");
    await dialog.getByLabel(/^What it is/).fill("Prints and binds small books.");
    await dialog.getByRole("button", { name: "Add the business" }).click();
    await expect(page.getByText("Added Quarry Studio.")).toBeVisible(LOADED);
    const row = page.getByRole("listitem", { name: "Quarry Studio" });
    await expect(row).toBeVisible(LOADED);

    // Its organization is the same thing: People › Organizations opens its own page, not a second one.
    await go(page, "records/people");
    const organizations = page.getByRole("region", { name: "Organizations", exact: true });
    await organizations.getByRole("link", { name: "Quarry Studio" }).click();
    await expect(page).toHaveURL(/#records\/project\//, LOADED);
    await heading(page, "Quarry Studio");

    // Removing it asks what happens to what is in it and whether its organization goes too; Undo brings both back.
    await go(page, "settings/business");
    await row.getByRole("button", { name: "Remove Quarry Studio" }).click();
    const ask = row.getByRole("group", { name: /What happens to the projects and to-dos in Quarry Studio/ });
    await ask.getByRole("checkbox", { name: /Also remove Quarry Studio from your organizations/ }).check();
    await ask.getByRole("button", { name: "Move them to Personal" }).click();
    await expect(page.getByText(/Removed Quarry Studio\./)).toBeVisible(LOADED);
    await go(page, "records/people");
    await expect(page.getByRole("region", { name: "Organizations", exact: true }).getByText("Quarry Studio")).toHaveCount(0, LOADED);
    expect(await wider(page)).toBeLessThanOrEqual(0);

    // A job is added the same way, with only the employer's name to give.
    await go(page, "settings/business");
    await page.getByRole("button", { name: "Add a job" }).click();
    const job = page.getByRole("dialog", { name: "Add a job" });
    await expect(job.getByLabel(/^What it is/)).toHaveCount(0);
    await job.getByLabel(/^Employer/).fill("Cedar Works");
    await job.getByRole("button", { name: "Add the job" }).click();
    await expect(page.getByRole("listitem", { name: "Cedar Works" })).toBeVisible(LOADED);
  });
});
