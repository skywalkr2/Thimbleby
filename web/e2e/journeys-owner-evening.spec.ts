// Journey 7, the batch's closing proof: the owner's whole first evening on a fresh workspace, from the first setup field
// to a working Today. A workspace made by the init command with no template, started by the serve command, beside the
// fake outside services (tests/fake_services.py, started with --evening): an AI service whose model list opens with a
// retired model, and a mailbox and calendar that hold a booking confirmation for an appointment the calendar also has,
// a one-time code from a no-reply sender, and a bill. Nothing is touched by hand: the page, the fake services and the
// file the app prints are all the journey reads. Names come from the fictional workspace the fake services serve.
//
// What the fakes can't produce, and what is asserted instead:
// - the sent folder taken by itself is for the plain mailbox; this journey signs in to the add-on, so it asserts the
//   step says the sent mail isn't read yet and offers "Choose the Sent folder", then shows Done after moving on;
// - a failed check that names the retired model needs the app to pick it; the app never does, so the journey asserts the
//   pick is a usable model and the retired one is not on offer (the replace line is covered by WelcomeAi.test.tsx).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { collectProblems, fakeAddress, openView, pressStart, visit, widerThanWindow, type Info, type Requests, type SignInSeen } from "./journey-helpers";

const FAKE = fakeAddress("JOURNEY_EVENING_FAKE_PORT", 8761);
const RETIRED = "fake-retired-text";
const HALL = "Maple Hall";
const BILL_LINE = "Pay the water bill of $84.20 by 2026-11-05.";

let info: Info;
const problems: string[] = [];

const requests = async (): Promise<Requests> => (await fetch(`${FAKE}/__e2e/ai-requests`)).json();
const service = async (): Promise<SignInSeen> => (await fetch(`${FAKE}/__e2e/sign-in`)).json();
const restarts = (): number => (readFileSync(String(info.log), "utf8").match(/Restarting, as asked/g) ?? []).length;

test.describe.serial("journey: the owner's first evening", () => {
  test.beforeAll(async () => {
    info = await (await fetch(`${FAKE}/__e2e/info`)).json();
  });

  test.afterAll(() => {
    expect(problems.filter((p) => !p.includes("Failed to load resource"))).toEqual([]);
  });

  test("J7. The owner's first evening: a fresh workspace from setup to a working Today", async ({ page }) => {
    test.setTimeout(240_000);
    collectProblems(page, problems);
    await page.setViewportSize({ width: 1280, height: 900 });
    const installed = join(String(info.install_target), "journey_mail");
    expect(existsSync(installed)).toBe(false);
    const [me, friend] = info.people;

    await page.goto(`?token=${info.token}`);
    await expect(page.getByRole("heading", { level: 1, name: "Getting started" })).toBeVisible();
    await pressStart(page);
    const main = page.locator("main#main");

    // 1. You: the cursor is in the first field; only the name and the time zone are asked (the workspace's name and the
    // assistant's, Reginald, are Settings'); the time zone is one searchable list.
    await expect(main.getByRole("heading", { level: 2, name: "You" })).toBeVisible();
    expect(await widerThanWindow(page, "You")).toEqual([]);
    const fullName = main.getByLabel("Your full name");
    await expect(fullName).toBeFocused();
    await page.keyboard.type(me);
    await expect(main.getByLabel("Name shown at the top")).toHaveCount(0);
    await expect(main.getByLabel("Your assistant's name")).toHaveCount(0);
    await expect(main.getByRole("radio")).toHaveCount(0);
    const zone = main.getByRole("combobox", { name: "Your time zone" });
    await expect(main.getByRole("searchbox")).toHaveCount(0);
    await zone.click();
    await page.keyboard.type("Pacific");
    const choice = page.getByRole("listbox").getByRole("option", { name: /Los Angeles/ });
    await expect(choice).toBeVisible();
    await choice.click();
    await expect(zone).toHaveValue(/Los Angeles/);
    await visit(page);
    await main.getByRole("button", { name: "Continue" }).click();

    // 1b. What it's for, on its own screen: your own life is always included, then two tick boxes. A job shows the notice
    // about work mail; leaving both unticked is just me, which the evening is.
    await expect(main.getByRole("heading", { level: 2, name: "What it's for" })).toBeVisible();
    await expect(main.getByRole("radio")).toHaveCount(0);
    await expect(main.getByRole("checkbox")).toHaveCount(2);
    await expect(main.getByText("Your own life is always included.")).toBeVisible();
    await main.getByRole("checkbox", { name: "A job" }).check();
    await expect(main.getByRole("note")).toContainText("may need your employer's permission");
    await main.getByRole("checkbox", { name: "A job" }).uncheck();
    await expect(main.getByRole("note")).toHaveCount(0);
    await main.getByRole("button", { name: "Continue" }).click();

    // 2. The AI account, by key, against a service whose list opens with a retired model: the pick is a usable one.
    await expect(main.getByRole("heading", { level: 2, name: "Your AI account" })).toBeVisible();
    expect(await widerThanWindow(page, "Your AI account")).toEqual([]);
    await main.getByRole("radio", { name: /Something else/ }).check();
    await main.getByRole("button", { name: /^Another service/ }).click();
    await main.getByLabel(/^Another service/).check();
    await main.locator("#ai-key").fill("a-made-up-key");
    await main.getByRole("textbox", { name: "Service address" }).fill(info.ai_base_url);
    await main.getByRole("textbox", { name: "Service address" }).blur();
    await expect(main.getByText("Works. Ready to use.")).toBeVisible();
    // The model is picked for the person and never shown here; the account that is saved holds a usable one.
    await expect(main.getByLabel("AI model for everyday work")).toHaveCount(0);
    await expect(main.getByText(/no longer offered|has been deprecated/)).toHaveCount(0);
    await main.getByRole("radio", { name: /^Allow/ }).check();
    await visit(page);
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    const saved = JSON.stringify(await page.evaluate(async () => (await fetch("api/ai/accounts", { credentials: "same-origin" })).json()));
    expect(saved).not.toContain(RETIRED);
    expect(saved).toMatch(/fake-(small|large)/);

    // 3. Mail and calendar: the row is one line and one Connect button; one click adds the add-on, restarts once and opens the sign-in in a
    // popup; the app's window never goes to the service.
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    const row = main.locator('[data-service="journey-mail"]');
    await expect(row).toHaveAttribute("data-state", "not_installed");
    await expect(row.locator("[data-needs-addon]")).toContainText("The app restarts for a few seconds first");
    expect(restarts()).toBe(0);
    // No setup step is wider than the window, the mail step with the add-on line shown included.
    const wide = await widerThanWindow(page, "Mail and calendar");
    expect(wide).toEqual([]);
    const appAddress = page.url();
    // The bill is read by a scripted answer, so its amount and due day are the ones in the mail.
    await fetch(`${FAKE}/__e2e/script`, {
      method: "POST",
      body: JSON.stringify({
        when: BILL_LINE,
        answer: {
          summary: "Read by the journey's script.",
          ops: [{ op: "action.add", text: "Pay the water bill, $84.20.", owners: ["me"], due: "2026-11-05", basis: "said", evidence: { quote: BILL_LINE } }],
        },
      }),
    });
    await row.getByRole("button", { name: /^Connect Example mail/ }).click();
    const signInButton = main.getByRole("button", { name: "Sign in to Example mail", exact: true });
    await expect(signInButton).toBeVisible({ timeout: 120_000 });
    const [popup] = await Promise.all([page.waitForEvent("popup", { timeout: 60_000 }), signInButton.click()]);
    // The add-on went into the throwaway place this app installs into, and nowhere in the computer's own add-ons place.
    expect(existsSync(installed)).toBe(true);
    expect(existsSync(join(String(info.real_install_target), "journey_mail"))).toBe(false);
    expect(restarts()).toBe(1);
    expect(page.url()).toBe(appAddress);
    await popup.waitForEvent("close", { timeout: 60_000 }).catch(() => undefined);
    await expect(main.locator("[data-mail-result]")).toContainText("Example mail is connected.", { timeout: 90_000 });
    await main.getByRole("button", { name: "Connect another" }).click();
    await expect(main.getByText(/Signed in as .+@example\.com/)).toBeVisible();
    expect(page.url()).not.toMatch(/code=|state=|sign_in=/);
    await main.getByRole("button", { name: "Continue" }).click();

    // 4. Your promises, in its place after mail; started here, so the bill and the rest are read before Today.
    await expect(main.getByRole("heading", { level: 2, name: "Your promises" })).toBeVisible();
    expect(await widerThanWindow(page, "Your promises")).toEqual([]);
    const offer = main.locator('[data-first-promises="offer"]');
    await expect(offer.getByRole("button", { name: "Start", exact: true })).toBeVisible({ timeout: 30_000 });
    await offer.getByRole("button", { name: "Start", exact: true }).click();
    await expect.poll(async () => (await requests()).work, { timeout: 90_000 }).toBeGreaterThan(0);
    // An add-on's mail has no sent folder taken by itself (that is for the plain mailbox): the screen says so and offers it.
    await expect(main.getByRole("button", { name: "Choose the Sent folder" })).toBeVisible();
    // The choice opens right there with the usual name first (an add-on's mail can't list its folders), and Cancel leaves it.
    // It stays open while the first run is working and the list of what was read is drawn again as the run moves on.
    await main.getByRole("button", { name: "Choose the Sent folder" }).click();
    // The list waits for the add-on's answer about its folders, which takes longer while the first run is working.
    await expect(main.getByRole("combobox", { name: "Folder of the mail you sent" })).toHaveValue("Sent", { timeout: 15_000 });
    await expect(main.getByRole("heading", { level: 2, name: "Your promises" })).toBeVisible();
    await main.getByRole("button", { name: "Cancel" }).click();
    await main.getByRole("button", { name: "Continue" }).click();
    // Backups, then People.
    await expect(main.getByRole("heading", { level: 2, name: "Backups" })).toBeVisible();
    expect(await widerThanWindow(page, "Backups")).toEqual([]);
    await main.getByLabel("Folder", { exact: true }).fill(info.backup_folder);
    await main.getByRole("button", { name: "Back up now and continue" }).click();

    // 5. People by relation.
    await expect(main.getByRole("heading", { level: 2, name: "People" })).toBeVisible();
    expect(await widerThanWindow(page, "People")).toEqual([]);
    const addRow = main.getByRole("form", { name: "Add someone" });
    await addRow.getByLabel("Name").fill(friend);
    await addRow.getByLabel("Who they are").selectOption({ label: "my friend" });
    await addRow.getByRole("button", { name: "Add", exact: true }).click();
    // The people added so far are their own list; the suggestions above it may still show the same name for a moment.
    await expect(main.getByRole("region", { name: "The people in your life" }).getByRole("listitem").filter({ hasText: friend })).toContainText("my friend");
    await visit(page);
    await main.getByRole("button", { name: "Continue" }).click();
    // Headed Done when every counted step is done, else where things stand.
    await expect(main.getByRole("heading", { level: 2, name: /^(Done|Where things stand)$/ })).toBeVisible();
    expect(await widerThanWindow(page, "Done")).toEqual([]);
    const recap = main.getByRole("list", { name: "What was set up" });
    for (const step of ["workspace", "work", "ai", "mail", "backup", "people"]) await expect(recap.locator(`[data-step="${step}"]`)).toContainText("Done");
    await main.getByRole("button", { name: "Go to Today" }).click();

    // 6. Today.
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    const header = page.getByRole("banner");
    await expect(header).toContainText("Reginald");
    await expect(page.getByRole("button", { name: "Missed something?" })).toBeVisible();
    // Nothing reaches past the right edge of a 1280 wide window.
    const past = await page.evaluate(() =>
      Array.from(document.querySelectorAll("header *, [role=banner] *")).filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5).map((el) => el.tagName + ":" + (el.textContent ?? "").slice(0, 30)),
    );
    expect(past).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // The calendar's entry two days ahead is on the agenda once; the booking made no second entry and no clash.
    const agenda = page.getByRole("region", { name: "Schedule" });
    await expect(agenda.getByText(HALL).first()).toBeVisible({ timeout: 60_000 });
    await expect(agenda.getByText(new RegExp(HALL))).toHaveCount(1);
    // The fake calendar's two back-to-back meetings in different rooms are a real clash line; the appointment is in none.
    await expect(page.locator('[data-queue-line="clash"]').filter({ hasText: HALL })).toHaveCount(0);
    await visit(page);

    // The one-time code is set aside under notices, and is not in What changed, which is the history of the work.
    // It is on Handled for you, in the group of its reason, which is collapsed until it is opened.
    await openView(page, "Handled for you");
    const handled = page.locator("[data-handled]");
    await expect(handled.locator("[data-group]").first()).toBeVisible({ timeout: 60_000 });
    const shut = handled.locator("[data-group] > h2 button[aria-expanded=false]");
    for (let closed = await shut.count(); closed > 0; closed = await shut.count()) await shut.first().click();
    await expect(handled.getByText("Your verification code")).toBeVisible();
    await openView(page, "What changed");
    await expect(page.getByText("Your verification code")).toHaveCount(0);

    // The bill is a to-do with its amount and due day. Nothing is beside Personal here, so the row has no place words: the
    // person has no other place it could be.
    await openView(page, "To-dos and questions");
    const bill = page.getByRole("listitem").filter({ hasText: "Pay the water bill" });
    await expect(bill).toHaveCount(1, { timeout: 60_000 });
    await expect(bill).toContainText("$84.20");
    await expect(bill).toContainText(/Nov(ember)? 5|2026-11-05|5 Nov/);
    await expect(bill).not.toContainText("Personal");

    // Nothing on the Knowledge page says a word is not known yet.
    await openView(page, "Knowledge");
    await expect(page.getByRole("heading", { level: 2, name: "Your words" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/not known yet/i)).toHaveCount(0);

    expect(restarts()).toBe(1);
    expect((await service()).unauthorized).toBe(0);
  });
});
