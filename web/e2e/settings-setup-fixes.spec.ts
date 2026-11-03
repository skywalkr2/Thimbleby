// The re-sweep's setup and Settings items (X94 to X104, X53, X66, X96, X97, X99), as a person meets them in the browser: the
// AI step lets a choice go, shows one card for an account and no jargon; the time zone note can be read; the folder chooser
// has a breadcrumb and a New folder and refuses the computer's own folders; choosing a backup folder replaces the old one and
// a folder can be removed after asking; the synced folder shows after Save with when it applies; Add connection closes with
// Escape at its second step, the cursor in its first field; the add-on cards are a name, a line, a pill and one action. A
// workspace made as a person makes it, with the add-ons on, beside the fake services (tests/fake_services.py).
import { expect, test, type Page } from "@playwright/test";
import { collectProblems, fakeAddress, pressStart, visit, FIRST_SCREEN, type Info } from "./journey-helpers";

const FAKE = fakeAddress("JOURNEY_SETTINGS_FAKE_PORT", 8773);
const LOADED = { timeout: 30_000 };

let info: Info;
const problems: string[] = [];

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);

test.describe.serial("setup and settings fixes", () => {
  test.beforeAll(async () => {
    info = await (await fetch(`${FAKE}/__e2e/info`)).json();
  });

  test.afterAll(() => {
    expect(problems.filter((p) => !p.includes("Failed to load resource"))).toEqual([]);
  });

  test("X96, X94, X97. the time zone note can be read, the AI step lets a choice go and shows one card, and the folder chooser has a breadcrumb, New folder and no system folders", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    collectProblems(page, problems);
    await page.goto(`?token=${info.token}`);
    await expect(page.getByRole("heading", { level: 2, name: "Welcome", exact: true })).toBeVisible(FIRST_SCREEN);
    await pressStart(page);
    const main = page.locator("main#main");

    // X96: "No time zone matches" is drawn as a line of words, tall enough to read, with no empty box over it.
    await expect(main.getByRole("heading", { level: 2, name: "You" })).toBeVisible();
    await main.getByLabel("Your full name").fill(info.people[0]);
    await main.getByLabel("Your time zone").fill("Narnia");
    const note = main.getByText("No time zone matches. Try another spelling.");
    await expect(note).toBeVisible();
    const box = await note.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(14);
    expect(box!.width).toBeGreaterThan(100);
    await expect(main.locator("ul.time-zone-list")).toHaveCount(0);
    await main.getByLabel("Your time zone").fill("");
    await main.getByLabel("Your time zone").blur();
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "What it's for" })).toBeVisible();
    await main.getByRole("button", { name: "Continue" }).click();

    // X94: choosing a service, then Something else, lets the first one go: its guide leaves and one card is selected.
    await expect(main.getByRole("heading", { level: 2, name: "Your AI account" })).toBeVisible();
    await main.getByRole("radio").first().click();
    await expect(main.getByText(/^Connect /).first()).toBeVisible();
    await main.getByRole("radio", { name: /Something else/ }).click();
    await expect(main.getByText(/^Connect /)).toHaveCount(0);
    await expect(main.getByRole("radio", { name: /Something else/ })).toBeChecked();
    expect(await main.locator('input[type="radio"][name^="ai-kind"]:checked').count()).toBe(1);
    await main.getByRole("button", { name: /^Another service/ }).click();
    await main.getByLabel(/^Another service/).check();
    await main.locator("#ai-key").fill("a-made-up-key");
    await main.getByRole("textbox", { name: "Service address" }).fill(info.ai_base_url);
    await main.getByRole("textbox", { name: "Service address" }).blur();
    await expect(main.getByText("Works. Ready to use.")).toBeVisible();
    await main.getByRole("radio", { name: /^Allow/ }).check();
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();

    // Back on the AI step after connecting: one card for the one account, none of the jargon.
    await main.getByRole("button", { name: "Back", exact: true }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Your AI account" })).toBeVisible();
    const accounts = main.locator("section.ai-accounts");
    await expect(accounts).toBeVisible(LOADED);
    await expect(accounts.getByRole("listitem")).toHaveCount(1);
    await expect(accounts.getByRole("group", { name: "Who does the work" })).toHaveCount(0);
    await expect(main).not.toContainText(/\bMeasure\b|Change AI models/);
    await visit(page);
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    await main.getByRole("button", { name: "I'll do this later" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Your promises" })).toBeVisible();
    await main.getByRole("button", { name: "Continue" }).click();

    // X97: the Backups step. The chooser starts where the checked folder is, shows the way down as a breadcrumb, can make a
    // folder, and refuses the computer's own folders in words.
    await expect(main.getByRole("heading", { level: 2, name: "Backups" })).toBeVisible();
    await main.getByLabel("Folder", { exact: true }).fill(info.backup_folder);
    await main.getByRole("button", { name: "Check", exact: true }).click();
    await expect(main.getByText(/That folder works/)).toBeVisible();
    await main.getByRole("button", { name: "Choose…" }).click();
    const dialog = page.getByRole("dialog", { name: "Choose a folder" });
    await expect(dialog.getByRole("navigation", { name: "Where you are" })).toBeVisible(LOADED);
    await expect(dialog.getByRole("navigation", { name: "Where you are" }).getByRole("listitem").last()).toHaveAttribute("aria-current", "location").catch(() => undefined);
    await dialog.getByRole("button", { name: "New folder" }).click();
    await expect(dialog.getByLabel("Folder name")).toBeFocused();
    await dialog.getByLabel("Folder name").fill("Made in the chooser");
    await dialog.getByRole("button", { name: "Make folder" }).click();
    await expect(dialog.getByRole("navigation", { name: "Where you are" }).getByText("Made in the chooser")).toBeVisible(LOADED);
    await dialog.getByRole("button", { name: "Use this folder" }).click();
    await expect(main.getByLabel("Folder", { exact: true })).toHaveValue(/Made in the chooser$/);
    // A folder the computer keeps for itself is refused with a plain reason, in the check and in the chooser's list.
    await main.getByLabel("Folder", { exact: true }).fill("/etc");
    await main.getByRole("button", { name: "Check", exact: true }).click();
    await expect(main.getByText(/belongs to the computer itself/)).toBeVisible();
    await main.getByLabel("Folder", { exact: true }).fill(info.backup_folder);
    await main.getByRole("button", { name: "Back up now and continue" }).click();
    await expect(page.locator('[data-screen="backup"][data-state]')).toContainText("Done");
    await expect(main.getByRole("heading", { level: 2, name: "People" })).toBeVisible();
    await main.getByRole("button", { name: "I'll do this later" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Where things stand" })).toBeVisible();
    await main.getByRole("button", { name: "Go to Today" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible(LOADED);
    // X66: the tab names the workspace and the product.
    await expect(page).toHaveTitle(/ · Thimbleby$/);
  });

  test("X100, X98, X58. choosing a backup folder replaces the old one, copies are listed once, a folder is removed after asking, and no command shows", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/backups");
    const main = page.locator("main#main");
    await expect(main.getByRole("heading", { level: 2, name: "Backups" })).toBeVisible(LOADED);
    // Making a new folder in the chooser and choosing it replaces the folder backups went to.
    const where = main.getByRole("region", { name: "Where backups go" });
    await expect(where.locator("ul.plain-list li").first()).toContainText("offsite");
    await where.getByRole("radio", { name: /Choose another folder/ }).check();
    await where.getByLabel("Folder", { exact: true }).fill(`${info.backup_folder}/second`);
    const made = await page.request.post("api/setup/folders/new", { headers: { Authorization: `Bearer ${info.token}` }, data: { inside: info.backup_folder, name: "second" } });
    expect(made.ok()).toBe(true);
    await where.getByRole("button", { name: /Use this folder for backups/ }).first().click();
    await expect(where.locator("ul.plain-list li")).toHaveCount(1, LOADED);
    await expect(where.locator("ul.plain-list li").first()).toContainText("second");
    // Every copy is listed once.
    const copies = main.getByRole("list", { name: "Copies you can restore from" });
    const paths = await copies.getByRole("listitem").allTextContents();
    expect(new Set(paths).size).toBe(paths.length);
    // Restore shows no command and no developer steps.
    const restore = main.getByRole("group", { name: "Restore from a backup" });
    await expect(restore).not.toContainText(/cockpit|--backup/);
    await expect(restore.locator("details")).toHaveCount(0);
    // Remove asks first; Cancel keeps it; going on stops backing up there, and leaves the copies.
    await where.getByRole("button", { name: /^Remove / }).click();
    const ask = page.getByRole("dialog", { name: /^Stop backing up to / });
    await expect(ask).toContainText("Copies already there stay where they are.");
    await ask.getByRole("button", { name: "Cancel" }).click();
    await expect(where.locator("ul.plain-list li")).toHaveCount(1);
    await where.getByRole("button", { name: /^Remove / }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Stop backing up here" }).click();
    await expect(where.locator("ul.plain-list li")).toHaveCount(0, LOADED);
    // X58: a backup key over the most is refused with the maximum named.
    const long = await page.request.post("api/backup-key", { headers: { Authorization: `Bearer ${info.token}` }, data: { value: "k".repeat(5000), fingerprint: (await (await page.request.get("api/settings", { headers: { Authorization: `Bearer ${info.token}` } })).json()).fingerprint } });
    expect(long.status()).toBe(400);
    expect(((await long.json()) as { detail: string }).detail).toMatch(/at most \d+ characters/);
  });

  test("X98, X04. Restore this copy asks first, then the restore waits for the restart a person starts, shown on the page and on Today, and Cancel leaves the workspace as it was", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const headers = { Authorization: `Bearer ${info.token}` };
    // The folder removed by the test above is chosen again through the app's own route, which makes the first copy.
    const fingerprint = ((await (await page.request.get("api/settings", { headers })).json()) as { fingerprint: string }).fingerprint;
    const chosen = await page.request.post("api/setup/backup-folder", { headers, data: { path: info.backup_folder, label: "", fingerprint } });
    expect(chosen.ok()).toBe(true);
    expect((await page.request.post("api/backup", { headers })).ok()).toBe(true);
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/backups");
    const main = page.locator("main#main");
    await expect(main.getByRole("heading", { level: 2, name: "Backups" })).toBeVisible(LOADED);
    const copies = main.getByRole("list", { name: "Copies you can restore from" });
    await expect(copies.getByRole("listitem").first()).toBeVisible(LOADED);
    // The words say it can be done here, and no longer that it can't.
    const restore = main.getByRole("group", { name: "Restore from a backup" });
    await expect(restore).toContainText("set aside, not deleted");
    await expect(restore).not.toContainText(/isn't a button|cockpit|--backup/);
    // Restore asks first and says plainly what happens; the cursor is on the dialog's heading, as the copy has no key.
    await copies.getByRole("button", { name: /^Restore the copy from / }).first().click();
    const ask = page.getByRole("dialog", { name: /^Restore your workspace from / });
    await expect(ask).toContainText("Changes made since then are set aside, not deleted.");
    await expect(ask).toContainText("needs to restart to do this, and you choose when");
    await ask.getByRole("button", { name: "Restore this copy" }).click();
    // The restore waits for the restart: the page says so with Cancel, and nothing restarted by itself.
    const waiting = main.locator("[data-restore-pending]");
    await expect(waiting).toContainText(/Restores .+ at the next restart/, LOADED);
    await expect(waiting.getByRole("button", { name: "Restart now" })).toBeVisible();
    const status = (await (await page.request.get("api/status", { headers })).json()) as { restart_for: string[] };
    expect(status.restart_for).toEqual(["restore"]);
    // Today has a line for it, with the restart for the person to start. It is not started here.
    await go(page, "today");
    const line = page.locator('[data-queue-line="restore"]');
    await expect(line).toContainText(/Restart to restore your workspace \(from /, LOADED);
    await expect(line.getByRole("button", { name: "Restart now" })).toBeVisible();
    // Cancel removes it, and the page goes back to how it was.
    await go(page, "settings/backups");
    await main.locator("[data-restore-pending]").getByRole("button", { name: "Cancel the restore" }).click();
    await expect(main.locator("[data-restore-pending]")).toHaveCount(0, LOADED);
    await expect(main.getByText("Okay. Nothing will be restored.")).toBeVisible();
    expect(((await (await page.request.get("api/status", { headers })).json()) as { restart_for: string[] }).restart_for).toEqual([]);
  });

  test("X99. the synced folder shows after Save with when it applies and Restart now, and a disabled Save says why", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/backups");
    const sync = page.getByRole("region", { name: "Synced folder" });
    await expect(sync).toBeVisible(LOADED);
    await sync.getByRole("button", { name: "Choose a folder" }).click();
    const dialog = page.getByRole("dialog", { name: "Choose a folder" });
    await expect(dialog.getByRole("navigation", { name: "Where you are" })).toBeVisible(LOADED);
    await dialog.getByRole("button", { name: "Use this folder" }).click();
    await expect(sync.getByRole("button", { name: "Save the folder" })).toBeDisabled();
    await expect(sync.getByText("Choose one of the two answers first.")).toBeVisible();
    await sync.getByRole("radio", { name: "No, only I use it" }).check();
    await sync.getByRole("button", { name: "Save the folder" }).click();
    await expect(sync.getByText(/It applies after a restart\./)).toBeVisible(LOADED);
    await expect(sync.getByRole("button", { name: "Restart now" })).toBeVisible();
    await expect(sync.getByText(/isn't kept in a synced folder/)).toHaveCount(0);
  });

  test("X101, X95, X104. Add connection closes with Escape on its second step, the cursor is in its first field, every field is labeled, and the add-on cards are a pill and one action", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    await go(page, "settings/connections");
    await expect(page.getByRole("heading", { level: 2, name: "Connections" })).toBeVisible(LOADED);
    await page.getByRole("button", { name: "Add mail, calendar or folder" }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByRole("radio", { name: /A calendar/ }).check();
    await drawer.getByRole("button", { name: "Continue" }).click();
    // The cursor is in the new step's first field, and every box in the form has a label.
    await expect(drawer.getByLabel("Name")).toBeFocused();
    await expect(drawer.getByLabel("Calendar link")).toHaveAttribute("type", "password");
    await expect(drawer.getByLabel("Calendar file")).toBeVisible();
    const unlabeled = await drawer.locator("input:not([type=hidden]), select, textarea").evaluateAll((els) =>
      els.filter((el) => !(el as HTMLInputElement).labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")).length,
    );
    expect(unlabeled).toBe(0);
    await visit(page);
    // Escape closes it at once: nothing typed, nothing asked.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // And so does the close button, on the second step.
    await page.getByRole("button", { name: "Add mail, calendar or folder" }).click();
    await page.getByRole("dialog").getByRole("radio", { name: /A calendar/ }).check();
    await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Close/ }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // The add-on cards: a name, a line, a status pill, one action, the rest under Details.
    await go(page, "settings/addons");
    await expect(page.getByRole("heading", { level: 2, name: "Add-ons" })).toBeVisible(LOADED);
    const first = page.getByRole("tabpanel").getByRole("listitem").first();
    await expect(first).toBeVisible(LOADED);
    await expect(first.getByText(/^(On|Off|Not installed|Needs a restart)$/)).toBeVisible();
    await expect(first.locator("details[data-pack-details] summary")).toHaveText("Details");
    expect(await first.locator("details[data-pack-details]").evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
  });

  test("X102, X103. a long value is refused in plain words, a negative amount reads -$5.00, and AI and spending groups its kinds of work", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`?token=${info.token}`);
    const auth = { Authorization: `Bearer ${info.token}` };
    const fingerprint = async () => ((await (await page.request.get("api/settings", { headers: auth })).json()) as { fingerprint: string }).fingerprint;
    const refused = await page.request.post("api/settings", { headers: auth, data: { changes: { "workspace.name": "w".repeat(120) }, reset: [], fingerprint: await fingerprint() } });
    expect(refused.status()).toBe(400);
    expect(((await refused.json()) as { detail: string }).detail).toBe("Use at most 80 characters.");
    // A business named like an existing area is refused as a sentence, with none of the engine's words.
    const taken = await page.request.post("api/setup/business", { headers: auth, data: { name: "Personal" } });
    expect(taken.status()).toBe(409);
    expect(((await taken.json()) as { detail: string }).detail).toBe("You already have something called Personal. Choose a different name.");
    // An amount typed as 0.0000001 is never written as an exponent.
    await go(page, "settings/ai");
    const main = page.locator("main#main");
    await expect(main.getByRole("heading", { level: 2, name: "AI and spending" })).toBeVisible(LOADED);
    const day = main.getByLabel(/^Stop starting anything new for the day/);
    await day.fill("0.0000001");
    await day.blur();
    await expect(day).not.toHaveValue(/e-/);
    await day.fill("-5");
    await day.blur();
    await expect(main.getByRole("alert").or(main.getByText(/-\$5\.00/)).first()).not.toContainText("$-5.00");
    // The kinds of work come in folded groups, one line each.
    const groups = main.locator("details[data-kind-group]");
    await expect(groups.first()).toBeVisible(LOADED);
    expect(await groups.evaluateAll((els) => els.every((el) => !(el as HTMLDetailsElement).open))).toBe(true);
  });
});
