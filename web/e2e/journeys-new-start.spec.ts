// Journey 6, the exit test of the first phase in automated form: a person on a fresh install does everything through
// the walkthrough only, and the walkthrough's first result (the look back over the last two weeks of their mail, with its
// estimate, then the promises it found) comes before backups, people or anything else that asks about more. A workspace made by the init command with no template and started by the serve command, with
// nothing installed or set: no mail add-on, no account, no backup. The catalog (named through the app's environment,
// so no settings file is touched) offers the mail add-on as a wheel, and fakes play the outside services
// (tests/fake_services.py): the AI service over plain HTTP, and the sign-in, mail, calendar and catalog services over
// HTTPS with a throwaway authority the app trusts through its environment.
// The journey never touches the workspace: it reads the page, the fake services, the throwaway place add-ons are
// installed into, and the file the app's output is kept in to count restarts.
// Names come from the fictional workspace the fake services serve, never written out here.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  collectProblems,
  fakeAddress,
  pressStart,
  visit,
  type Info,
  type Requests,
  type SignInSeen,
} from "./journey-helpers";

const FAKE = fakeAddress("JOURNEY_NEW_START_FAKE_PORT", 8794);

let info: Info;
const problems: string[] = [];

const requests = async (): Promise<Requests> => (await fetch(`${FAKE}/__e2e/ai-requests`)).json();
const service = async (): Promise<SignInSeen> => (await fetch(`${FAKE}/__e2e/sign-in`)).json();

/** How many times the app restarted since it was started, from what it printed. */
const restarts = (): number => (readFileSync(String(info.log), "utf8").match(/Restarting, as asked/g) ?? []).length;

test.describe.serial("journey: new start", () => {
  test.beforeAll(async () => {
    info = await (await fetch(`${FAKE}/__e2e/info`)).json();
  });

  test.afterAll(() => {
    expect(problems.filter((p) => !p.includes("Failed to load resource"))).toEqual([]);
  });

  test("J6. From a fresh install to my first promises, through the walkthrough only", async ({ page }) => {
    test.setTimeout(300_000);
    collectProblems(page, problems);
    expect(info.log).toBeTruthy();
    expect(info.install_target).toBeTruthy();
    const installed = join(String(info.install_target), "journey_mail");
    expect(restarts()).toBe(0);
    expect(existsSync(installed)).toBe(false);

    // 1. I open the link the start command printed. The walkthrough opens by itself and says nothing is spent yet.
    await page.goto(`?token=${info.token}`);
    await expect(page.getByRole("heading", { level: 1, name: "Getting started" })).toBeVisible();
    await expect(page.getByText("About 10–20 minutes. You can stop and come back.")).toBeVisible();
    await visit(page);
    await pressStart(page);
    const main = page.locator("main#main");

    // 2. You.
    await expect(main.getByRole("heading", { level: 2, name: "You" })).toBeVisible();
    await main.getByLabel("Your full name").fill(info.people[0]);
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator('[data-screen="you"][data-state]')).toContainText("Done");
    // The save went on to the next screen, so its mark in the step list says it (a toast from one screen goes when the
    // next opens); that screen's own buttons can be pressed right away. The next screen is Work: Just me is chosen.
    await expect(main.getByRole("heading", { level: 2, name: "What it's for" })).toBeVisible();
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Your AI account" })).toBeVisible();
    await main.getByRole("button", { name: "Back" }).click({ trial: true });
    await visit(page);
    // A toast from one screen is gone when the next one opens.
    await expect(main.getByRole("heading", { level: 2, name: "Your AI account" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Notifications" }).getByText(/^Saved\./)).toHaveCount(0);

    // 3. Your AI account: the fake service, with Internal ticked, since my mail is internal material.
    await expect(main.getByRole("heading", { level: 2, name: "Your AI account" })).toBeVisible();
    await main.getByRole("radio", { name: /Something else/ }).check();
    await main.getByRole("button", { name: /^Another service/ }).click();
    await main.getByLabel(/^Another service that speaks/).check();
    await main.locator("#ai-key").fill("a-made-up-key");
    await main.getByRole("textbox", { name: "Service address" }).fill(info.ai_base_url);
    await main.getByRole("textbox", { name: "Service address" }).blur();
    // The check runs by itself, for every kind of work, before anything is saved.
    await expect(main.getByText("Works. Ready to use.")).toBeVisible();
    await main.getByText("Advanced", { exact: true }).click();
    await main.getByLabel("AI model for everyday work").selectOption("fake-small");
    await expect(main.getByText("Works. Ready to use.")).toBeVisible();
    // One explicit yes lets this account read my mail and notes (the usual hand-in is internal material).
    await main.getByRole("radio", { name: /^Allow/ }).check();
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    await expect(page.locator('[data-screen="ai"][data-state]')).toContainText("Done");
    await visit(page);

    // 4. Mail and calendar: the mail add-on is not on this computer, but the catalog lists it, with what it reads and
    // what it reaches. One button installs and turns it on; nothing restarts yet.
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    const row = main.locator('[data-service="journey-mail"]');
    await expect(row).toHaveAttribute("data-state", "not_installed");
    await expect(row).toContainText("Reads your mail and calendar");
    await expect(row.getByRole("button", { name: /^Connect Example mail/ })).toBeVisible();
    await expect(row).not.toContainText("Not on this computer");
    // What it reaches is behind a disclosure, in plain words, and none of the settings jargon is on the row.
    await expect(row.getByText("What it can access")).toBeVisible();
    expect(await row.innerText()).not.toMatch(/Signs in to|Websites:|Access keys you provide/);
    await row.getByText("What it can access").click();
    await expect(row).toContainText("You sign in on the service's own page");
    await expect(main.getByText(/Restart to finish connecting/)).toHaveCount(0);
    await visit(page);
    expect(existsSync(installed)).toBe(false);
    const before = await requests();
    expect(before.work).toBe(0);
    // The row is one line and one button: it says the app restarts first, and the button adds it, restarts and opens the sign-in.
    await expect(row.locator("[data-needs-addon]")).toContainText("The app restarts for a few seconds first");
    expect((await service()).authorizations).toBe(0);
    const appAddress = page.url();
    // One click installs, turns on, restarts the app and then opens the service's sign-in in its own window; the setup
    // screen stays where it is. The window is waited for before the click, since it opens after the restart.
    const popupOpened = page.waitForEvent("popup", { timeout: 120_000 });
    await row.getByRole("button", { name: /^Connect Example mail/ }).click();
    const popup = await popupOpened;
    // It went into the throwaway place the app installs into, and the one restart happened on that click.
    expect(existsSync(installed)).toBe(true);
    expect(restarts()).toBe(1);
    // The sign-in is in its own window, and the app's window never left the walkthrough.
    expect(page.url()).toBe(appAddress);
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    // The service sends that window back to the app, which tells this screen how it went and closes the window.
    await popup.waitForEvent("close", { timeout: 60_000 }).catch(() => undefined);
    await expect(row).toHaveAttribute("data-state", "ready", { timeout: 90_000 });
    await expect(main.getByText(/Restart to finish connecting/)).toHaveCount(0);
    await expect(main.getByText(/Signed in as .+@example\.com/)).toBeVisible();
    // A page opened fresh after the restart resumes at this screen.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Getting started" })).toBeVisible();
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    await visit(page);
    // Signed in once, nothing was asked of the assistant.
    await expect(row).toHaveAttribute("data-signed-in", "");
    await expect(row).toContainText("Reading your mail and calendar.");
    await expect(row).not.toContainText("Sign in to start reading");
    await expect(row.getByRole("button", { name: /^Sign in/ })).toHaveCount(0);
    // The sign-in toast doesn't cover Back or Next either.
    await main.getByRole("button", { name: "Back" }).click({ trial: true });
    await main.getByRole("button", { name: "Continue" }).click({ trial: true });
    let seen = await service();
    expect(seen).toMatchObject({ authorizations: 1, exchanges: 1, refused: 0 });
    expect(page.url()).not.toMatch(/code=|state=|sign_in=/);
    // The screen says what is read now, and that what it reads waits for you to start the assistant.
    const reading = main.locator("[data-reading]");
    await expect(reading.getByText("Your inbox")).toBeVisible();
    await expect(reading.getByText("Your calendar")).toBeVisible();
    await expect(reading.getByText(/waits for you to start the assistant/)).toBeVisible();
    await expect(page.locator('[data-screen="mail"][data-state]')).toContainText("Done");
    await visit(page);
    expect((await requests()).work).toBe(0);
    const { mail: recentMail, events: recentEvents, noted: recentNoted } = seen.recent_items;
    expect(recentMail.length).toBeGreaterThan(0);
    expect(recentNoted.length).toBeGreaterThan(0);
    // The look back takes in the last 14 days of work mail and every event, so each is counted once below.
    // The sign-in also names the account's sent mail, which is read with the inbox and credited to me, with no folder chosen.
    const { mail, events, noted, sent, mail_to_check: mailToCheck, events_to_check: eventsToCheck } = seen.intake_items;
    expect(sent.length).toBeGreaterThan(0);
    const handedIn = mail.length + events.length + sent.length;
    expect(handedIn).toBeGreaterThan(recentMail.length + recentEvents.length);
    expect(noted).toHaveLength(0);
    // The assistant is asked, once, to read the message that holds a promise: the person's own, to send the venue list.
    const promiseLine = `${info.people[0]} will send the venue list by 2026-11-02.`;
    const scripted = await fetch(`${FAKE}/__e2e/script`, {
      method: "POST",
      body: JSON.stringify({
        when: "will send the venue list by 2026-11-02",
        answer: {
          summary: "Read by the journey's script.",
          ops: [
            {
              op: "action.add",
              text: "Send the venue list.",
              owners: ["me"],
              due: "2026-11-02",
              basis: "said",
              evidence: { quote: promiseLine },
            },
          ],
        },
      }),
    });
    expect(scripted.ok).toBe(true);
    // A second promise is only in the mail I sent: nothing I received repeats it.
    const sentLine = `${info.people[0]} will send the revised budget by 2026-11-05.`;
    const scriptedSent = await fetch(`${FAKE}/__e2e/script`, {
      method: "POST",
      body: JSON.stringify({
        when: "will send the revised budget by 2026-11-05",
        answer: {
          summary: "Read by the journey's script.",
          ops: [
            {
              op: "action.add",
              text: "Send the revised budget.",
              owners: ["me"],
              due: "2026-11-05",
              basis: "said",
              evidence: { quote: sentLine },
            },
          ],
        },
      }),
    });
    expect(scriptedSent.ok).toBe(true);
    await main.getByRole("button", { name: "Continue" }).click();

    // 5. Your promises, right after mail and before backups or people: the look back over the last 14 days of my own mail
    // is offered with what it would cost, and the assistant has been asked nothing.
    await expect(main.getByRole("heading", { level: 2, name: "Your promises" })).toBeVisible();
    const offer = main.locator('[data-first-promises="offer"]');
    await expect(offer.getByRole("heading", { level: 3, name: "Look back over the last 14 days of your own mail" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(offer).toContainText(
      new RegExp(`${handedIn} items to look over\\. (About \\$\\d+\\.\\d\\d|Less than a cent) in all\\. Nothing is read by the assistant until you press Start\\.`),
    );
    // The sent mail is in the plan with the inbox and the calendar, by itself: nobody chose a folder.
    await expect(offer.getByRole("list", { name: "What it will read" })).toContainText("Your sent mail");
    // Nothing that asks about projects, areas, packs or more accounts is on this screen.
    await expect(main.getByText("Optional extras")).toHaveCount(0);
    await visit(page);
    expect((await requests()).work).toBe(0);
    seen = await service();
    // The inbox and the sent folder are each read once; nobody chose a folder.
    expect(seen).toMatchObject({ mail_reads: 2, calendar_reads: 1, unauthorized: 0 });

    // Start: one request for each item taken in, each item once, and then the promise it found is on the screen.
    await offer.getByRole("button", { name: "Start", exact: true }).click();
    await expect.poll(async () => (await requests()).work, { timeout: 60_000 }).toBe(handedIn);
    const asked = await requests();
    // The work mail the rules could not place was sorted in one run for each source's batch (the inbox, and the sent mail
    // when the rules leave it unplaced); sorting is not counted as work.
    expect(asked.sorting).toBeGreaterThanOrEqual(1);
    expect(asked.sorting).toBeLessThanOrEqual(2);
    for (const title of [...mail, ...events, ...sent]) expect(asked.inputs.filter((input) => input.includes(title))).toHaveLength(1);
    const promises = main.getByRole("list", { name: "Promises found" });
    await expect(promises).toBeVisible({ timeout: 60_000 });
    const mine = promises.locator("li", { hasText: "Send the venue list." });
    await expect(mine).toHaveCount(1);
    await expect(mine).toContainText("You owe this");
    await expect(mine).toContainText(`From: “${promiseLine}”`);
    // The promise that is only in the mail I sent is found too, though no folder was chosen.
    const fromSent = promises.locator("li", { hasText: "Send the revised budget." });
    await expect(fromSent).toHaveCount(1);
    await expect(fromSent).toContainText("You owe this");
    await expect(fromSent).toContainText(`From: “${sentLine}”`);
    await expect(main.getByRole("button", { name: "Choose the Sent folder" })).toHaveCount(0);
    // Nobody else owes anything yet, so there is no follow-up to copy.
    await expect(main.getByRole("region", { name: "One follow-up is ready" })).toHaveCount(0);
    await visit(page);
    await main.getByRole("button", { name: "Continue" }).click();

    // 6. Backups: a folder outside the workspace, checked before it is saved.
    await expect(main.getByRole("heading", { level: 2, name: "Backups" })).toBeVisible();
    await main.getByLabel("Folder", { exact: true }).fill(info.backup_folder);
    await main.getByRole("button", { name: "Back up now and continue" }).click();
    await expect(page.locator('[data-screen="backup"][data-state]')).toContainText("Done");
    // Choosing the folder makes the first backup at once, and Back up now and continue goes on to People.
    await expect(main.getByRole("heading", { level: 2, name: "People" })).toBeVisible();
    await visit(page);

    // 7. People: skipping is fine.
    await expect(main.getByRole("heading", { level: 2, name: "People" })).toBeVisible();
    await visit(page);
    await main.getByRole("button", { name: "I'll do this later" }).click();

    // 8. Done: what was set up and what was skipped, then the optional extras. The last button lands on Today.
    await expect(main.getByRole("heading", { level: 2, name: "Done" })).toBeVisible();
    const recap = main.getByRole("list", { name: "What was set up" });
    for (const step of ["workspace", "work", "ai", "mail", "promises", "backup"]) await expect(recap.locator(`[data-step="${step}"]`)).toContainText("Done");
    await expect(recap.locator('[data-step="people"]')).toContainText("Skipped");
    const extras = main.getByRole("region", { name: "Optional extras" });
    await expect(extras).toBeVisible();
    expect(await extras.getByRole("listitem").count()).toBeGreaterThan(0);
    await visit(page);
    await main.getByRole("button", { name: "Go to Today" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    // The look back was started on the walkthrough's own screen, so Today has nothing to start.
    await expect(page.locator('[data-queue-line="first_go"]')).toHaveCount(0);
    await expect(page.locator('[data-queue-line="intake_go"]')).toHaveCount(0);
    // The first backup was made while setting up, so Today doesn't ask for one and the header chip doesn't say one is needed.
    await expect(page.getByRole("region", { name: "Backup", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^App status: / })).not.toContainText("Backup needed");

    // 9. The recent mail is on Came in within seconds, and today's meetings are on the agenda; what is older isn't.
    const came = page.getByRole("region", { name: "Came in" });
    const agenda = page.getByRole("region", { name: "Schedule" });
    await expect(came.getByText(recentMail[0])).toBeVisible({ timeout: 10_000 });
    for (const title of recentMail) await expect(came.getByText(title, { exact: true })).toBeVisible();
    // A meeting that runs past midnight is listed under both days, so the first is enough.
    for (const title of recentEvents) await expect(agenda.getByText(title, { exact: true }).first()).toBeVisible();
    for (const title of recentNoted) await expect(came.getByText(title, { exact: true })).toHaveCount(0);
    await visit(page);

    // 10. What was found is one line for each source, not a line for each item: none of the items' own review lines is on
    // Today until I open the list.
    const found = page.locator('[data-queue-line="intake_review"]');
    // Only what needs a look is counted: a thank-you, an agreement or a plain announcement is filed quietly.
    const items = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;
    await expect(found.filter({ hasText: "Your inbox" })).toContainText(
      `Look over what was found in Your inbox: ${items(mailToCheck.length)}`,
      { timeout: 60_000 },
    );
    await expect(found.filter({ hasText: "Your calendar" })).toContainText(
      `Look over what was found in Your calendar: ${items(eventsToCheck.length)}`,
      { timeout: 60_000 },
    );
    // The sent mail is its own source, so it has its own line.
    await expect(found.filter({ hasText: "Your sent mail" })).toContainText(
      `Look over what was found in Your sent mail: ${sent.length} ${sent.length === 1 ? "item" : "items"}`,
      { timeout: 60_000 },
    );
    await expect(found).toHaveCount(3);
    await expect(page.locator('[data-queue-line="review"]')).toHaveCount(0);
    await visit(page);

    // Look over opens each list on Today without leaving it, and All looks good reviews it: the lines leave and nothing is
    // added to Today in their place.
    for (const label of ["Your inbox", "Your calendar", "Your sent mail"]) {
      await found.filter({ hasText: label }).getByRole("button", { name: "Look over", exact: true }).click();
      await expect(page).toHaveURL(/#today$/);
      await found.filter({ hasText: label }).getByRole("button", { name: "All looks good" }).click();
    }
    await expect(found).toHaveCount(0);
    await expect(page.locator('[data-queue-line="review"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Show \d+ new items?$/ })).toHaveCount(0);
    await visit(page);
    await expect(page.getByText(/stopped, see why below/)).toHaveCount(0);

    // The whole path: one request per item and none before Start, one sign-in, and exactly one restart.
    expect((await requests()).work).toBe(handedIn);
    expect(await service()).toMatchObject({ authorizations: 1, exchanges: 1, unauthorized: 0, refused: 0 });
    expect(restarts()).toBe(1);
  });
});
