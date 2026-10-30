import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { Refuse, fakeApi, renderApp, type Routes } from "../test-utils";
import { Quality } from "./Quality";

// The Quality screen (design 6.32): a section for each measure with its number out of its denominator, the person's own
// daily count (the cursor in its first field, a date defaulting to today, Save with an Undo toast), and an empty state in
// plain words for each section.

type View = S["QualityView"];

const quality = (over: Partial<View> = {}): View => ({
  days: 28,
  min_corrections_per_week: 10,
  knowledge_used: [],
  repeat_corrections: [],
  missing: [],
  missed: [],
  apart: { missed: 0, declined: 0, dropped: 0, weeks: [] },
  answers: { helpful: 0, not_helpful: 0, weeks: [] },
  since: "2026-09-21",
  until: "2026-10-19",
  closes: { total: 0, silent: 0, days: [] },
  endings: { made: 0, wrong: 0, declined: 0, undone: 0, reopened: 0, days: [] },
  counts: { person: "PER-1", present: 0, missed: 0, entered: 0, days: [] },
  replays: { count: 0, last_run: null },
  outcome: { promises_found: 0, promises_kept: 0, dismissed: 0, corrected: 0, review_seconds: 0, review_visits: 0, follow_ups_completed: 0, weeks: [] },
  review: { median_seconds: null, days_reviewed: 0, total_seconds: 0, visits: 0, days: [] },
  lost: { existed: 0, lost: 0, days: [], items: [] },
  sources: { checked: 0, over_a_day: 0, silent: 0, days: [] },
  sample: null,
  sample_allowed: false,
  missed_total: { present: 0, missed: 0, days: 0, messages: 0 },
  ...over,
});

const FULL = quality({
  closes: { total: 41, silent: 2, days: [{ day: "2026-10-18", total: 30, silent: 1 }, { day: "2026-10-19", total: 11, silent: 1 }] },
  endings: { made: 12, wrong: 3, declined: 1, undone: 1, reopened: 1, days: [{ day: "2026-10-19", made: 12, wrong: 3 }] },
  counts: { person: "PER-1", present: 30, missed: 4, entered: 2, days: [{ day: "2026-10-18", present: 20, missed: 3 }, { day: "2026-10-19", present: 10, missed: 1 }] },
  missed: [
    { person: "PER-1", person_name: "Casey Example", week: "2026-10-05", week_end: "2026-10-11", count: 0 },
    { person: "PER-1", person_name: "Casey Example", week: "2026-10-12", week_end: "2026-10-18", count: 3 },
    { person: "PER-1", person_name: "Casey Example", week: "2026-10-19", week_end: "2026-10-25", count: 1 },
  ],
  apart: {
    missed: 1,
    declined: 2,
    dropped: 9,
    weeks: [
      { week: "2026-10-12", week_end: "2026-10-18", missed: 0, declined: 0, dropped: 0 },
      { week: "2026-10-19", week_end: "2026-10-25", missed: 1, declined: 2, dropped: 9 },
    ],
  },
  answers: {
    helpful: 3,
    not_helpful: 1,
    weeks: [
      { week: "2026-10-12", week_end: "2026-10-18", helpful: 0, not_helpful: 0 },
      { week: "2026-10-19", week_end: "2026-10-25", helpful: 3, not_helpful: 1 },
    ],
  },
  replays: { count: 2, last_run: null },
  review: {
    median_seconds: 480,
    days_reviewed: 3,
    total_seconds: 1500,
    visits: 12,
    days: [
      { day: "2026-10-19", seconds: 480, visits: 5 },
      { day: "2026-10-18", seconds: 60, visits: 1 },
      { day: "2026-10-17", seconds: 960, visits: 6 },
    ],
  },
  lost: {
    existed: 40,
    lost: 1,
    days: [{ day: "2026-10-18", existed: 40, lost: 1 }],
    items: [{ id: "ACT-4", text: "Send the floor plan", day: "2026-10-18" }],
  },
  sources: { checked: 56, over_a_day: 4, silent: 1, days: [{ day: "2026-10-18", checked: 2, over_a_day: 1, silent: 1 }, { day: "2026-10-19", checked: 2, over_a_day: 0, silent: 0 }] },
  missed_total: { present: 36, missed: 5, days: 2, messages: 2 },
  outcome: {
    promises_found: 9,
    promises_kept: 6,
    dismissed: 2,
    corrected: 1,
    review_seconds: 1500,
    review_visits: 12,
    follow_ups_completed: 3,
    weeks: [
      { week: "2026-10-12", week_end: "2026-10-18", promises_found: 4, promises_kept: 2, dismissed: 1, corrected: 0, review_seconds: 600, review_visits: 5, follow_ups_completed: 1 },
      { week: "2026-10-19", week_end: "2026-10-25", promises_found: 5, promises_kept: 4, dismissed: 1, corrected: 1, review_seconds: 900, review_visits: 7, follow_ups_completed: 2 },
    ],
  },
});

function show(view: View, routes: Routes = {}, onBack = () => undefined) {
  const calls = fakeApi({ "GET quality": () => view, ...routes });
  renderApp(<Quality onBack={onBack} />);
  return calls;
}

/** The screen once its figures have arrived. */
const loaded = () => screen.findByText(/^Counting from /);

const section = (id: string) => {
  const found = document.querySelector<HTMLElement>(`[data-quality-section="${id}"]`) as HTMLElement;
  if (found.tagName === "DETAILS") (found as HTMLDetailsElement).open = true;
  return found;
};

test("the screen has a section for each measure and shows the window's dates", async () => {
  show(FULL);
  // The page is headed as the person's menu entry is, with the assistant's name.
  expect(screen.getByRole("heading", { level: 1, name: "How Helper is doing" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 1, name: "Quality" })).toBeNull();
  expect(await screen.findByText("Counting from Sep 21 to Oct 19.")).toBeInTheDocument();
  const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(titles).toEqual(["Week by week", "Mistakes to look at", "Your own count"]);
  expect(screen.getAllByText(/Nothing yet\./).length).toBeGreaterThan(0);
});

test("the four outcome tiles keep the API measures' meanings and compare the latest two weeks", async () => {
  show(FULL);
  await loaded();
  const tiles = screen.getByRole("region", { name: "Outcome measures" });
  const found = within(tiles).getByRole("article", { name: "Promises found" });
  expect(within(found).getByText("9")).toBeInTheDocument();
  expect(within(found).getByText("1 more than the week before")).toBeInTheDocument();
  const kept = within(tiles).getByRole("article", { name: "Promises closed as done" });
  expect(within(kept).getByText("6")).toBeInTheDocument();
  expect(within(kept).getByText("2 more than the week before")).toBeInTheDocument();
  expect(within(tiles).queryByText(/on time/i)).toBeNull();
  const alerts = within(tiles).getByRole("article", { name: "False alerts" });
  expect(within(alerts).getByText("3")).toBeInTheDocument();
  expect(within(alerts).getByText("1 more than the week before")).toBeInTheDocument();
  const review = within(tiles).getByRole("article", { name: "Time spent looking over" });
  expect(within(review).getByText("8 min")).toBeInTheDocument();
  expect(within(review).getByText("5 min more than the week before")).toBeInTheDocument();
});

test("outcome tiles omit comparisons when the API has fewer than two weeks", async () => {
  show(quality({ outcome: { ...FULL.outcome, weeks: [FULL.outcome.weeks[0]] } }));
  await loaded();
  const tiles = screen.getByRole("region", { name: "Outcome measures" });
  expect(within(tiles).queryByText(/week before/)).toBeNull();
});

test("the outcome weeks are a table with one row per week and one column per measure", async () => {
  show(FULL);
  await loaded();
  const table = screen.getByRole("table", { name: "Week by week" });
  expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
    "Week",
    "Promises found",
    "Promises closed as done",
    "False alerts",
    "Time looking over",
  ]);
  expect(within(table).getAllByRole("row")).toHaveLength(3);
  expect(within(table).getByRole("row", { name: /Oct 19 to Oct 25.*5.*4.*2.*15 min/ })).toBeInTheDocument();
  expect(within(table).getByRole("row", { name: /Oct 12 to Oct 18.*4.*2.*1.*10 min/ })).toBeInTheDocument();
});

test("mistakes to look at use the existing person-week counts and link only when a person page exists", async () => {
  show(FULL);
  await loaded();
  const mistakes = screen.getByRole("region", { name: "Mistakes to look at" });
  expect(within(mistakes).getAllByText("Casey Example").map((person) => person.getAttribute("href"))).toEqual([
    "#records/person/PER-1",
    "#records/person/PER-1",
    "#records/person/PER-1",
  ]);
  expect(within(mistakes).getByText("Oct 5 to Oct 11: said 0 times.")).toBeInTheDocument();
  expect(within(mistakes).getByText("Oct 12 to Oct 18: said 3 times.")).toBeInTheDocument();
  expect(within(mistakes).getByText("Oct 19 to Oct 25: said once.")).toBeInTheDocument();
  expect(within(mistakes).queryByRole("button", { name: /look/i })).toBeNull();
});

test("mistake rows without a person id are text, not broken person links", async () => {
  show(quality({ missed: [{ person: "", person_name: "Unmatched sender", week: "2026-10-12", week_end: "2026-10-18", count: 2 }] }));
  await loaded();
  const mistakes = screen.getByRole("region", { name: "Mistakes to look at" });
  expect(within(mistakes).getByText("Unmatched sender").tagName).toBe("SPAN");
  expect(within(mistakes).queryByRole("link")).toBeNull();
});

test("the person's own count remains the existing save-and-undo form in a compact card", async () => {
  const user = userEvent.setup();
  const calls = show(FULL, {
    "PUT quality/counts/2026-10-19": () => ({ id: "PCNT-1", day: "2026-10-19", present: 11, missed: 0, previous: { present: 10, missed: 1 } }),
    "POST quality/counts/2026-10-19/undo": () => ({ ok: "2026-10-19" }),
  });
  await loaded();
  const count = screen.getByRole("region", { name: "Your own count" });
  const present = within(count).getByLabelText("Promises on your own list");
  expect(present).toHaveValue(10);
  expect(within(count).getByLabelText("Of those, how many the app didn't have")).toHaveValue(1);
  await user.clear(present);
  await user.type(present, "11");
  await user.clear(within(count).getByLabelText("Of those, how many the app didn't have"));
  await user.type(within(count).getByLabelText("Of those, how many the app didn't have"), "0");
  await user.click(within(count).getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Corrected Oct 19: missed 0 of 11.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST quality/counts/2026-10-19/undo")?.body).toEqual({ previous: { present: 10, missed: 1 } }));
});

test("empty secondary sections stay as one-line summaries", async () => {
  show(quality());
  await loaded();
  expect(screen.getByText("Corrections that repeated").closest("summary")).toHaveTextContent("Nothing yet.");
  expect(screen.getByText("Things it couldn't do").closest("summary")).toHaveTextContent("Nothing yet.");
  expect(screen.getByText("Replays").closest("summary")).toHaveTextContent("Nothing yet.");
  expect(document.querySelector<HTMLDetailsElement>('[data-quality-section="quality-lacking"]')?.open).toBe(false);
  expect(document.querySelector<HTMLDetailsElement>('[data-quality-section="quality-replays"]')?.open).toBe(false);
  expect(screen.getByText("The assistant hasn't said it lacked anything in this window.")).not.toBeVisible();
  expect(screen.getByText("No misses have been kept as replays yet.")).not.toBeVisible();
});

test("each measure is a number out of its denominator in words, never a bare percentage", async () => {
  show(FULL);
  await loaded();
  const outcome = section("quality-outcome");
  expect(within(outcome).getByText("Promises found")).toBeInTheDocument();
  expect(within(outcome).getByText("9")).toBeInTheDocument();
  expect(within(outcome).getByText("Promises closed as done")).toBeInTheDocument();
  expect(within(outcome).getByText("6")).toBeInTheDocument();
  expect(within(outcome).getByText("False alerts")).toBeInTheDocument();
  expect(within(outcome).getByText("3")).toBeInTheDocument();
  expect(within(outcome).getByText("8 min")).toBeInTheDocument();
  expect(within(section("quality-closes")).getByText("2 of 41 closes weren't seen by you.")).toBeInTheDocument();
  expect(within(section("quality-closes")).getByText("Oct 18: 1 of 30 closes weren't seen by you.")).toBeInTheDocument();
  expect(within(section("quality-endings")).getByText("3 of 12 endings were wrong.")).toBeInTheDocument();
  expect(within(section("quality-endings")).getByText(/You kept 1 as they were, undid 1 and reopened 1 that a nudge had recorded as done\./)).toBeInTheDocument();
  expect(within(section("quality-counts")).getByText("The app missed 4 of the 30 promises you counted.")).toBeInTheDocument();
  expect(within(section("quality-counts")).getByText("Oct 19: missed 1 of 10 promises.")).toBeInTheDocument();
  expect(within(section("quality-missed")).getByText("Oct 12 to Oct 18: said 3 times.")).toBeInTheDocument();
  expect(within(section("quality-missed")).getByText("Oct 19 to Oct 25: said once.")).toBeInTheDocument();
  expect(within(section("quality-replays")).getByText("2 replays are kept.")).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/\d\s?%/);
});

test("the gate instruments read as a number out of its denominator in words", async () => {
  show(FULL);
  await loaded();
  expect(within(section("quality-lost")).getByText("1 of 40 promises disappeared with no ending anyone saw.")).toBeInTheDocument();
  expect(within(section("quality-lost")).getByText("Oct 18: Send the floor plan")).toBeInTheDocument();
  expect(within(section("quality-sources")).getByText("Checked 56 days of connected sources: 4 unread for more than a day, 1 of those with nothing on Today about it.")).toBeInTheDocument();
  expect(within(section("quality-sources")).getByText("Oct 18: of 2 sources checked, 1 unread for more than a day and 1 with nothing on Today.")).toBeInTheDocument();
  expect(within(section("quality-sources")).queryByText(/^Oct 19:/)).toBeNull();
  expect(within(section("quality-review")).getByText("The middle of the 3 days you looked its work over was 8 min.")).toBeInTheDocument();
  expect(within(section("quality-review")).getByText("Oct 17: 16 min in 6 visits.")).toBeInTheDocument();
  expect(within(section("quality-total")).getByText("The assistant missed 5 of the 36 promises you counted, over 2 days and 2 messages.")).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/\d\s?%/);
});

const SAMPLE: View["sample"] = {
  id: "SAMP-1",
  drawn_at: "2026-10-19T08:00:00Z",
  since: "2026-09-21",
  until: "2026-10-19",
  candidates: 120,
  size: 2,
  read: 1,
  present: 3,
  missed: 1,
  items: [
    { source: "SRC-10", title: "Re: proof pages", received_at: "2026-10-15T09:00:00Z", present: 3, missed: 1 },
    { source: "SRC-11", title: "Venue booking", received_at: "2026-10-16T09:00:00Z", present: null, missed: null },
  ],
};

test("without the person's consent the sample says nothing is drawn, and with it there is a button that draws one", async () => {
  const user = userEvent.setup();
  const calls = show(quality(), { "POST quality/sample": () => SAMPLE });
  await loaded();
  expect(within(section("quality-sample")).getByText("Allow the independent reading in Settings first. Nothing is drawn until you do.")).toBeInTheDocument();
  expect(within(section("quality-sample")).queryByRole("button", { name: "Draw the sample" })).toBeNull();
  cleanup();
  const again = show(quality({ sample_allowed: true }), { "POST quality/sample": () => SAMPLE });
  await loaded();
  await user.click(within(section("quality-sample")).getByRole("button", { name: "Draw the sample" }));
  expect(await screen.findByText("Drew 2 messages for you to read.")).toBeInTheDocument();
  expect(again.some((c) => c.route === "POST quality/sample")).toBe(true);
  expect(calls.some((c) => c.route === "POST quality/sample")).toBe(false);
});

test("the sample lists each message to read, and saving a message's two numbers posts them with an Undo", async () => {
  const user = userEvent.setup();
  const calls = show(quality({ sample: SAMPLE, sample_allowed: true }), {
    "PUT quality/sample/SAMP-1/items/SRC-11": () => ({ source: "SRC-11", present: 2, missed: 0, previous: null }),
    "POST quality/sample/SAMP-1/items/SRC-11/undo": () => ({ ok: "SRC-11" }),
  });
  await loaded();
  const found = within(section("quality-sample"));
  expect(found.getByText("You have read 1 of 2 messages. Of the 3 promises you found in them, the assistant missed 1.")).toBeInTheDocument();
  expect(found.getByLabelText("Promises you found in Re: proof pages")).toHaveValue(3);
  const save = found.getByRole("button", { name: "Save the count for Venue booking" });
  expect(save).toBeDisabled();
  await user.type(found.getByLabelText("Promises you found in Venue booking"), "2");
  await user.type(found.getByLabelText("Of those, how many the assistant didn't have, in Venue booking"), "0");
  await user.click(found.getByRole("button", { name: "Save the count for Venue booking" }));
  expect(await screen.findByText("Saved: missed 0 of 2 in Venue booking.")).toBeInTheDocument();
  expect(calls.find((c) => c.route === "PUT quality/sample/SAMP-1/items/SRC-11")?.body).toEqual({ present: 2, missed: 0 });
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST quality/sample/SAMP-1/items/SRC-11/undo")?.body).toEqual({ previous: null }));
});

test("more missed than found in a message is said at once and can't be saved", async () => {
  const user = userEvent.setup();
  show(quality({ sample: SAMPLE }));
  await loaded();
  const found = within(section("quality-sample"));
  await user.type(found.getByLabelText("Promises you found in Venue booking"), "1");
  await user.type(found.getByLabelText("Of those, how many the assistant didn't have, in Venue booking"), "3");
  expect(found.getByRole("alert")).toHaveTextContent("The assistant can't have missed more than you found.");
  expect(found.getByRole("button", { name: "Save the count for Venue booking" })).toBeDisabled();
});

test("the other measures read in the same plain style", async () => {
  show(
    quality({
      knowledge_used: [{ task: "notes", runs_given: 4, runs_applied: 3, dropped: 0, rate: 0.75 }],
      repeat_corrections: [
        { task: "notes", week: "2026-10-12", corrections: 12, repeats: 5, enough: true, rate: 0.4 },
        { task: "notes", week: "2026-10-19", corrections: 2, repeats: 2, enough: false, rate: null },
      ],
      missing: [{ week: "2026-10-12", groups: [{ wording: "an op to put an action on hold", count: 2, tasks: ["notes"], changesets: ["CS-1", "CS-2"], last_seen: null }] }],
    }),
  );
  await loaded();
  expect(within(section("quality-knowledge")).getByText("filing notes: used it in 3 of 4 pieces of work.")).toBeInTheDocument();
  expect(within(section("quality-repeats")).getByText("Week of Oct 12, filing notes: 5 of 12 corrections repeated a mistake it had been taught about.")).toBeInTheDocument();
  expect(within(section("quality-repeats")).getByText("Week of Oct 19, filing notes: 2 corrections, too few to say.")).toBeInTheDocument();
  expect(within(section("quality-lacking")).getByText("an op to put an action on hold: said 2 times.")).toBeInTheDocument();
});

test("missed, declined and dropped are three lines of their own, so a week of drops never reads as misses", async () => {
  show(FULL);
  await loaded();
  const apart = within(section("quality-apart"));
  expect(apart.getByText("Missed: you said once that the assistant failed to find something.")).toBeInTheDocument();
  expect(apart.getByText(/^Declined: you said no to 2 changes it asked you about/)).toBeInTheDocument();
  expect(apart.getByText(/^Dropped: you dropped 9 questions and to-dos as no longer needed\. That is not a mistake of the assistant's\./)).toBeInTheDocument();
  expect(apart.getByText("Oct 19 to Oct 25: missed 1, declined 2, dropped 9.")).toBeInTheDocument();
  expect(apart.queryByText(/Oct 12 to Oct 18/)).not.toBeInTheDocument();
});

test("helpful and not helpful answers are counted on their own, a week at a time", async () => {
  show(FULL);
  await loaded();
  const found = within(section("quality-answers"));
  expect(found.getByText("Helpful: you marked 3 answers helpful.")).toBeInTheDocument();
  expect(found.getByText("Not helpful: you marked 1 answer not helpful.")).toBeInTheDocument();
  expect(found.getByText("Oct 19 to Oct 25: helpful 3, not helpful 1.")).toBeInTheDocument();
  expect(found.queryByText(/Oct 12 to Oct 18/)).not.toBeInTheDocument();
});

test("the outcome is each measure on its own line, then each week's numbers in words", async () => {
  show(FULL);
  await loaded();
  const table = screen.getByRole("table", { name: "Week by week" });
  expect(within(table).getByRole("row", { name: "Oct 19 to Oct 25 5 4 2 15 min" })).toBeInTheDocument();
  expect(within(table).getByRole("row", { name: "Oct 12 to Oct 18 4 2 1 10 min" })).toBeInTheDocument();
});

test("a screen with nothing to show says so in plain words in every section", async () => {
  show(quality());
  await loaded();
  expect(within(section("quality-outcome")).getAllByText("0").length).toBeGreaterThan(0);
  expect(within(section("quality-closes")).getByText("Nothing was closed in this window.")).toBeInTheDocument();
  expect(within(section("quality-endings")).getByText("The assistant hasn't ended anything in this window.")).toBeInTheDocument();
  expect(within(section("quality-counts")).getByText("You haven't entered a count in this window.")).toBeInTheDocument();
  expect(within(section("quality-missed")).getByText("No one has said the assistant missed something in this window.")).toBeInTheDocument();
  expect(within(section("quality-apart")).getByText("Nothing was missed, declined or dropped in this window.")).toBeInTheDocument();
  expect(within(section("quality-answers")).getByText("You haven't marked an answer helpful or not helpful in this window.")).toBeInTheDocument();
  expect(within(section("quality-replays")).getByText("No misses have been kept as replays yet.")).toBeInTheDocument();
  expect(within(section("quality-knowledge")).getByText(/No work was given what you'd taught the assistant/)).toBeInTheDocument();
  expect(within(section("quality-repeats")).getByText("You haven't corrected the assistant in this window.")).toBeInTheDocument();
  expect(within(section("quality-lacking")).getByText("The assistant hasn't said it lacked anything in this window.")).toBeInTheDocument();
  expect(within(section("quality-lost")).getByText("No promise was open in this window.")).toBeInTheDocument();
  expect(within(section("quality-sources")).getByText("No source was connected in this window.")).toBeInTheDocument();
  expect(within(section("quality-review")).getByText("You haven't looked its work over in this window.")).toBeInTheDocument();
  expect(within(section("quality-sample")).getByText("Allow the independent reading in Settings first. Nothing is drawn until you do.")).toBeInTheDocument();
  expect(within(section("quality-total")).getByText("You haven't counted any promises in this window.")).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/NaN|undefined|null/);
});

test("the cursor starts on the heading, and the form's date holds today and shows that day's count", async () => {
  show(FULL);
  const date = await screen.findByLabelText("Day");
  await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  expect(date).not.toHaveFocus();
  expect(date).toHaveValue("2026-10-19");
  expect(date).toHaveAttribute("max", "2026-10-19");
  expect(screen.getByLabelText("Promises on your own list")).toHaveValue(10);
});

test("Save is off until both numbers are entered, and says why", async () => {
  const user = userEvent.setup();
  show(quality());
  const save = await screen.findByRole("button", { name: "Save" });
  expect(save).toBeDisabled();
  expect(screen.getByText("Enter both numbers to save.")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Promises on your own list"), "9");
  expect(save).toBeDisabled();
  await user.type(screen.getByLabelText("Of those, how many the app didn't have"), "2");
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  expect(screen.queryByText("Enter both numbers to save.")).toBeNull();
});

test("more missed than counted is said at once and can't be saved", async () => {
  const user = userEvent.setup();
  show(quality());
  await user.type(await screen.findByLabelText("Promises on your own list"), "2");
  await user.type(screen.getByLabelText("Of those, how many the app didn't have"), "5");
  expect(screen.getByRole("alert")).toHaveTextContent("The app can't have missed more than you counted.");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("saving posts the day's two numbers and an Undo toast takes the save back", async () => {
  const user = userEvent.setup();
  const calls = show(quality(), {
    "PUT quality/counts/2026-10-19": () => ({ id: "PCNT-1", day: "2026-10-19", present: 9, missed: 2, previous: null }),
    "POST quality/counts/2026-10-19/undo": () => ({ ok: "2026-10-19" }),
  });
  await user.type(await screen.findByLabelText("Promises on your own list"), "9");
  await user.type(screen.getByLabelText("Of those, how many the app didn't have"), "2");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Saved Oct 19: missed 2 of 9.")).toBeInTheDocument();
  expect(calls.find((c) => c.route === "PUT quality/counts/2026-10-19")?.body).toEqual({ present: 9, missed: 2 });
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST quality/counts/2026-10-19/undo")?.body).toEqual({ previous: null }));
});

test("a day that already has a count shows it, saving again corrects it, and Undo puts the earlier numbers back", async () => {
  const user = userEvent.setup();
  const calls = show(FULL, {
    "PUT quality/counts/2026-10-19": () => ({ id: "PCNT-1", day: "2026-10-19", present: 11, missed: 0, previous: { present: 10, missed: 1 } }),
    "POST quality/counts/2026-10-19/undo": () => ({ ok: "2026-10-19" }),
  });
  const present = await screen.findByLabelText("Promises on your own list");
  await waitFor(() => expect(present).toHaveValue(10));
  expect(screen.getByLabelText("Of those, how many the app didn't have")).toHaveValue(1);
  await user.clear(present);
  await user.type(present, "11");
  await user.clear(screen.getByLabelText("Of those, how many the app didn't have"));
  await user.type(screen.getByLabelText("Of those, how many the app didn't have"), "0");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Corrected Oct 19: missed 0 of 11.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST quality/counts/2026-10-19/undo")?.body).toEqual({ previous: { present: 10, missed: 1 } }));
});

test("a refused save says why in a toast and keeps what was typed", async () => {
  const user = userEvent.setup();
  show(quality(), { "PUT quality/counts/2026-10-19": () => new Refuse(409, "That day hasn't happened yet.") });
  await user.type(await screen.findByLabelText("Promises on your own list"), "4");
  await user.type(screen.getByLabelText("Of those, how many the app didn't have"), "1");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText(/That day hasn't happened yet\./)).toBeInTheDocument();
  expect(screen.getByLabelText("Promises on your own list")).toHaveValue(4);
});

test("a load that fails says so with Try again, and Back goes back", async () => {
  const user = userEvent.setup();
  const back = vi.fn();
  show(quality(), { "GET quality": () => new Refuse(500, "broken") }, back);
  expect(await screen.findByText("This page didn't load.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Back to Today" }));
  expect(back).toHaveBeenCalledTimes(1);
});

test("the heading says your assistant when it has no name", async () => {
  fakeApi({ "GET quality": () => FULL });
  renderApp(<Quality onBack={() => undefined} />, {}, { unnamed: true });
  expect(screen.getByRole("heading", { level: 1, name: "How your assistant is doing" })).toBeInTheDocument();
});
