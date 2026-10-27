// Journey 2: a person signs in to their mail and calendar on the walkthrough's Mail and calendar screen, the walkthrough
// offers to look back over the last two weeks with its estimate, one Start reads everything, and what was found is one line
// for each source on Today to look over (a sign-in's sources are taken in quietly, design 6.32). A workspace made by the init command with no template, started
// by the serve command, with the mail add-on on (as one the person had already installed and turned on would be) and fakes only at the outside services
// (tests/fake_services.py): the AI service over plain HTTP, and the sign-in, mail and calendar services over HTTPS with
// a throwaway authority the app trusts through its environment.
// Names come from the fictional workspace the fake services serve, never written out here.
import { expect, test } from "@playwright/test";
import {
  collectProblems,
  fakeAddress,
  openView,
  pressStart,
  visit,
  type Info,
  type Requests,
  type SignInSeen,
} from "./journey-helpers";

const FAKE = fakeAddress("JOURNEY_MAIL_FAKE_PORT", 8792);

let info: Info;
const problems: string[] = [];

const requests = async (): Promise<Requests> => (await fetch(`${FAKE}/__e2e/ai-requests`)).json();
const service = async (): Promise<SignInSeen> => (await fetch(`${FAKE}/__e2e/sign-in`)).json();

test.describe.serial("journey: mail", () => {
  test.beforeAll(async () => {
    info = await (await fetch(`${FAKE}/__e2e/info`)).json();
  });

  test.afterAll(() => {
    expect(problems.filter((p) => !p.includes("Failed to load resource"))).toEqual([]);
  });

  test("J2. Sign in to my mail and calendar: the look back is offered with its estimate, one Start reads it, and what was found is one line for each source on Today", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    collectProblems(page, problems);

    // A new workspace with the mail add-on on: the walkthrough opens by itself.
    await page.goto(`?token=${info.token}`);
    await expect(page.getByRole("heading", { level: 1, name: "Getting started" })).toBeVisible();
    await visit(page);
    await pressStart(page);

    // You, then an AI account, as in the first journey.
    const main = page.locator("main#main");
    await expect(main.getByRole("heading", { level: 2, name: "You" })).toBeVisible();
    await main.getByLabel("Your full name").fill(info.people[0]);
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator('[data-screen="you"][data-state]')).toContainText("Done");
    // Work: Just me, which is already chosen.
    await expect(main.getByRole("heading", { level: 2, name: "What it's for" })).toBeVisible();
    await main.getByRole("button", { name: "Continue" }).click();
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
    await visit(page);

    // Mail and calendar: the add-on I had installed is listed as a service, on, with what it reads and what it needs
    // to reach. Nothing has been read, and nothing has asked the assistant anything. No restart is waiting.
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    const row = main.locator('[data-service="journey-mail"]');
    await expect(row).toHaveAttribute("data-state", "ready");
    await expect(row).toContainText("Reads your mail and calendar");
    await expect(main.getByText(/Restart to finish connecting/)).toHaveCount(0);
    await expect(main.locator("[data-reading]")).toHaveCount(0);
    // The step says, in one line, that social updates, promotions and mailing lists are set aside by themselves.
    await expect(
      main.getByText("Social updates, promotions and mailing lists are set aside; you can turn this off."),
    ).toBeVisible();
    await visit(page);
    const before = await requests();
    expect(before.work).toBe(0);
    const appAddress = page.url();
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      row.getByRole("button", { name: "Sign in to Example mail", exact: true }).click(),
    ]);
    // The service's page opens in its own window; the app's window stays on the walkthrough.
    expect(page.url()).toBe(appAddress);
    await popup.waitForEvent("close", { timeout: 30_000 }).catch(() => undefined);

    // Signing in happens on the service's own page, which sends me back to the same screen. The service is asked once,
    // and the app proves the sign-in is its own. The answer's code and state are not left in the address.
    await expect(main.getByRole("heading", { level: 2, name: "Mail and calendar" })).toBeVisible();
    await expect(main.getByText(/Signed in as .+@example\.com/)).toBeVisible();
    // The row no longer says to sign in: it says who is signed in and what is read, and offers no Sign in.
    await expect(row).toHaveAttribute("data-signed-in", "");
    await expect(row).toContainText("Reading your mail and calendar.");
    await expect(row).not.toContainText("Sign in to start reading");
    await expect(row.getByRole("button", { name: /^Sign in/ })).toHaveCount(0);
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
    // The mailbox also holds a social update (the service's own category) and a sales mail (a bulk flag), both from the
    // last day: neither is work, so neither is taken in. The look back takes in the last 14 days of work mail (a message
    // from last week too) and every event, whatever its day, so each is counted once below.
    const { mail: recentMail, events: recentEvents, noted: recentNoted, set_aside: aside } = seen.recent_items;
    expect(recentMail.length).toBeGreaterThan(0);
    expect(recentNoted.length).toBeGreaterThan(0);
    expect(aside).toHaveLength(2);
    const { mail, events, noted, mail_to_check: mailToCheck, events_to_check: eventsToCheck } = seen.intake_items;
    const handedIn = mail.length + events.length;
    expect(handedIn).toBeGreaterThan(recentMail.length + recentEvents.length);
    expect(noted).toHaveLength(0);

    // The next screen, Your promises, comes right after Mail and calendar, before anything about backups or people. Once
    // the first read has happened it offers the look back over the last 14 days of my own mail, with what it would cost,
    // and the assistant has been asked nothing.
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Your promises" })).toBeVisible();
    const offer = main.locator('[data-first-promises="offer"]');
    await expect(offer.getByRole("heading", { level: 3, name: "Look back over the last 14 days of your own mail" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(offer).toContainText(
      new RegExp(`${handedIn} items to look over\\. (About \\$\\d+\\.\\d\\d|Less than a cent) in all\\. Nothing is read by the assistant until you press Start\\.`),
    );
    await visit(page);
    expect((await requests()).work).toBe(0);

    // Start: one request for each item taken in, each item once, and the offer gives way to what was found. The stand-in
    // rules find no promise in these messages, so the screen says so plainly and offers "Missed something?".
    await offer.getByRole("button", { name: "Start", exact: true }).click();
    await expect.poll(async () => (await requests()).work, { timeout: 60_000 }).toBe(handedIn);
    const asked = await requests();
    // The work mail the rules could not place was sorted in one run for the whole batch; it is not counted as work.
    expect(asked.sorting).toBe(1);
    for (const title of [...mail, ...events]) {
      expect(asked.inputs.filter((input) => input.includes(title))).toHaveLength(1);
    }
    for (const title of aside) expect(asked.inputs.filter((input) => input.includes(title))).toHaveLength(0);
    const none = main.locator('[data-first-promises="none"]');
    await expect(none).toContainText("No open promises found in the mail it looked over.", { timeout: 60_000 });
    await expect(none.getByRole("button", { name: "Missed something?" })).toBeVisible();
    await visit(page);

    // Backups and People are left for later, and Done names what was skipped.
    await main.getByRole("button", { name: "Continue" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Backups" })).toBeVisible();
    await main.getByRole("button", { name: "I'll do this later" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "People" })).toBeVisible();
    await main.getByRole("button", { name: "I'll do this later" }).click();
    await expect(main.getByRole("heading", { level: 2, name: "Done" })).toBeVisible();
    const recap = main.getByRole("list", { name: "What was set up" });
    await expect(recap.locator('[data-step="mail"]')).toContainText("Done");
    await expect(recap.locator('[data-step="backup"]')).toContainText("Skipped");
    await visit(page);
    await main.getByRole("button", { name: "Go to Today" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();

    // The sign-in's sources were read at once and taken in when I pressed Start, so Today has nothing to start: no first-go
    // line, no line waiting for a go.
    const agenda = page.getByRole("region", { name: "Schedule" });
    const came = page.getByRole("region", { name: "Came in" });
    await expect(came.getByText(recentMail[0])).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-queue-line="first_go"]')).toHaveCount(0);
    await expect(page.locator('[data-queue-line="intake_go"]')).toHaveCount(0);

    // Today lists the recent mail on Came in and today's meetings on the agenda; what is older or further off is not.
    for (const title of recentMail) await expect(came.getByText(title, { exact: true })).toBeVisible();
    // A meeting that runs past midnight is listed under both days, so the first is enough.
    for (const title of recentEvents) await expect(agenda.getByText(title, { exact: true }).first()).toBeVisible();
    // Came in shows only the work mail; what was set aside is counted on What changed and listed on Handled for you,
    // never on Today.
    for (const title of aside) await expect(came.getByText(title, { exact: true })).toHaveCount(0);
    await expect(came.getByRole("button", { name: /set aside/ })).toHaveCount(0);
    for (const title of recentNoted) await expect(came.getByText(title, { exact: true })).toHaveCount(0);
    seen = await service();
    expect(seen).toMatchObject({ mail_reads: 1, calendar_reads: 1, unauthorized: 0 });

    // Connections says what is read without my having chosen it, and who is signed in.
    await openView(page, "Connections");
    await expect(page.getByRole("heading", { level: 1, name: "Connections" })).toBeVisible();
    await expect(page.getByText(/Signed in as .+@example\.com/)).toBeVisible();
    await expect(page.getByText("Your inbox").first()).toBeVisible();
    await expect(page.getByText("Your calendar").first()).toBeVisible();
    await visit(page);

    // What was found is one line for each source, not a line for each item: none of the items' own review lines is on
    // Today until I open the list.
    await openView(page, "Today");
    const found = page.locator('[data-queue-line="intake_review"]');
    const inbox = found.filter({ hasText: "Your inbox" });
    const calendar = found.filter({ hasText: "Your calendar" });
    // Only what needs a look is counted: a thank-you, an agreement or a plain announcement is filed quietly.
    const items = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;
    await expect(inbox).toContainText(`Look over what was found in Your inbox: ${items(mailToCheck.length)}`, { timeout: 60_000 });
    await expect(calendar).toContainText(`Look over what was found in Your calendar: ${items(eventsToCheck.length)}`, { timeout: 60_000 });
    await expect(found).toHaveCount(2);
    await expect(page.locator('[data-queue-line="review"]')).toHaveCount(0);
    await visit(page);
    expect((await requests()).work).toBe(handedIn);

    // Look over opens a list's items in the details, on Today: the address stays, nothing is marked seen and nothing splits
    // into lines of its own. All looks good reviews the list and the line leaves.
    await inbox.getByRole("button", { name: "Look over", exact: true }).click();
    await expect(page).toHaveURL(/#today$/);
    await expect(inbox.getByRole("button", { name: /^Not right/ }).first()).toBeVisible();
    await expect(page.locator('[data-queue-line="review"]')).toHaveCount(0);
    await expect(found).toHaveCount(2);
    await inbox.getByRole("button", { name: "All looks good" }).click();
    await expect(found).toHaveCount(1);
    await page.locator('[data-queue-line="intake_review"]').filter({ hasText: "Your calendar" }).getByRole("button", { name: "Look over", exact: true }).click();
    await page.locator('[data-queue-line="intake_review"]').filter({ hasText: "Your calendar" }).getByRole("button", { name: "All looks good" }).click();
    await expect(found).toHaveCount(0);
    // Reviewing added nothing to Today: no line of its own for any item, and no "N new" waiting.
    await expect(page.locator('[data-queue-line="review"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Show \d+ new items?$/ })).toHaveCount(0);
    // My own words filed my action; a to-do is listed in To-dos and questions, not on Today. Filed under Personal, a to-do
    // that names nobody is my own, so nothing asks who owns it.
    await openView(page, "To-dos and questions");
    await expect(page.getByText("Send the venue list.").first()).toBeVisible();
    await openView(page, "Today");
    await expect(page.getByText("Who owns this?")).toHaveCount(0);
    await visit(page);
    await expect(page.getByText(/stopped, see why below/)).toHaveCount(0);
    expect((await requests()).work).toBe(handedIn);
    // What changed says what was checked.
    await openView(page, "What changed");
    await expect(page.getByText("Checked").first()).toBeVisible();

    // Handled for you lists both messages, grouped and collapsed, each with why it was set aside.
    const social = aside.find((t) => /neighbors/i.test(t)) ?? "";
    const sales = aside.find((t) => /sale/i.test(t)) ?? "";
    await openView(page, "What changed");
    await page.getByRole("link", { name: /handled for you$/ }).click();
    const folder = page.locator("[data-handled]");
    await expect(folder.getByRole("heading", { level: 1, name: "Handled for you" })).toBeVisible();
    // The groups arrive after the heading; open each once they are there.
    await expect(folder.locator("[data-group]").first()).toBeVisible();
    const collapsed = folder.locator("[data-group] > h2 button[aria-expanded=false]");
    for (let closed = await collapsed.count(); closed > 0; closed = await collapsed.count()) await collapsed.first().click();
    const socialRow = folder.locator("li.line", { hasText: social });
    const salesRow = folder.locator("li.line", { hasText: sales });
    await expect(socialRow).toContainText("Set aside because: your mail service files it under social");
    await expect(salesRow).toContainText("Set aside because: it was sent to many people");
    await visit(page);

    // A closer look at the sales mail hands it in (this person has no side to name): it gets its own request, and nothing else
    // is asked.
    await salesRow.getByRole("button", { name: `Take a closer look at ${sales}` }).click();
    await expect(page.getByText(`Handed in ${sales}.`)).toBeVisible();
    await expect(folder.locator("li.line", { hasText: sales })).toHaveCount(0);
    await expect.poll(async () => (await requests()).work, { timeout: 60_000 }).toBe(handedIn + 1);
    const handed = await requests();
    expect(handed.inputs.filter((input) => input.includes(sales))).toHaveLength(1);
    expect(handed.inputs.filter((input) => input.includes(social))).toHaveLength(0);

    // Choosing Always set aside mail like this teaches the sorting about the sender; the message stays in the folder.
    await socialRow.getByRole("button", { name: `More actions for ${social}` }).click();
    await page.getByRole("menuitem", { name: "Always set aside mail like this" }).click();
    await expect(
      page.getByText("From now on, mail from updates@network.example.com is set aside as sales mail."),
    ).toBeVisible();
    await expect(folder.locator("li.line", { hasText: social })).toHaveCount(1);
    await visit(page);

    // The next read brings a new message from that sender, saying nothing about itself: it is set aside by the new
    // sorting, with no request for the assistant.
    const later = await (await fetch(`${FAKE}/__e2e/mail-later`, { method: "POST" })).json();
    await openView(page, "Today");
    const cameIn = page.getByRole("region", { name: "Came in" });
    await expect(cameIn.getByRole("button", { name: "Check now" })).toBeVisible();
    await cameIn.getByRole("button", { name: "Check now" }).click();
    await expect(cameIn.getByText(later.subject)).toHaveCount(0);
    // The earlier message is still in the list, so it is counted until the new one is read, then both are.
    await openView(page, "Handled for you");
    const handled = page.locator("[data-handled]");
    await expect(handled.getByRole("radio", { name: "Set aside before reading · 2" })).toBeVisible({ timeout: 30_000 });
    await expect(handled.locator("[data-group]").first()).toBeVisible();
    const shut = handled.locator("[data-group] > h2 button[aria-expanded=false]");
    for (let closed = await shut.count(); closed > 0; closed = await shut.count()) await shut.first().click();
    await expect(handled.locator("li.line", { hasText: later.subject })).toContainText(
      `Set aside because: it is from ${later.sender}`,
    );
    // Counted by input: on a busy computer a call that times out goes to the next account with the same input, which is
    // the same work, not new work.
    const after = await requests();
    expect(after.inputs.filter((input) => input.includes(later.subject))).toHaveLength(0);
    expect(new Set(after.inputs).size).toBe(handedIn + 1);
    expect(await service()).toMatchObject({ unauthorized: 0, refused: 0 });
  });
});
