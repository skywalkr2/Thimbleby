import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { person } from "../lib/records-fixtures";
import { fakeApi, Refuse, renderApp } from "../test-utils";
import { InlineAddTodo } from "./InlineAddTodo";

function api(extra = {}) {
  return fakeApi({
    "GET people": () => [{ ...person("P-1", "Quinn Sample"), is_pm: true }],
    "GET setup/business": () => ({ business: false, personal: null, sides: [] }),
    "POST todos": () => ({ action: "A-9", changesets: ["CS-9"] }),
    "POST changesets/CS-9/undo": () => ({ restored: [0], skipped: [] }),
    ...extra,
  });
}

const row = (onDetails: (words: string) => void = () => undefined) => renderApp(<ul><InlineAddTodo onDetails={onDetails} /></ul>);

test("typing a title and pressing Enter adds the to-do as the person's own, with Undo, and the cursor stays in the row for the next one", async () => {
  const user = userEvent.setup();
  const calls = api();
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET people")).toBe(true));
  await user.type(field, "Call the printer{Enter}");
  await waitFor(() => expect(calls.find((c) => c.route === "POST todos")?.body).toEqual({ text: "Call the printer", owners: ["P-1"] }));
  await waitFor(() => expect(field).toHaveValue(""));
  expect(field).toHaveFocus();
  expect(await screen.findByRole("button", { name: "Undo" })).toBeVisible();
  // The next one goes the same way.
  await user.type(field, "Send the proof{Enter}");
  await waitFor(() => expect(calls.filter((c) => c.route === "POST todos")).toHaveLength(2));
});

test("Enter pressed before the list of people has come back waits for it and adds the to-do, never dropping it", async () => {
  // A busy server answers the people list late; the row used to drop the Enter silently, words left in the box.
  const user = userEvent.setup();
  let answer: (value: unknown) => void = () => undefined;
  const late = new Promise((resolve) => (answer = resolve));
  const calls = api({ "GET people": () => late });
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await user.type(field, "Call the printer{Enter}");
  expect(calls.some((c) => c.route === "POST todos")).toBe(false);
  answer([{ ...person("P-1", "Quinn Sample"), is_pm: true }]);
  await waitFor(() => expect(calls.find((c) => c.route === "POST todos")?.body).toEqual({ text: "Call the printer", owners: ["P-1"] }));
  await waitFor(() => expect(field).toHaveValue(""));
});

test("nothing is added for an empty title or for words past the limit, which are said in words", async () => {
  const user = userEvent.setup();
  const calls = api();
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await user.type(field, "{Enter}");
  await user.click(field);
  await user.paste("x".repeat(320));
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("status")).toHaveTextContent(/20/);
  expect(field).toHaveAttribute("aria-invalid", "true");
  expect(calls.some((c) => c.route === "POST todos")).toBe(false);
});

test("with several sides and none picked the form opens with the words typed, since it asks where the to-do belongs", async () => {
  const user = userEvent.setup();
  let words = "";
  const calls = api({
    "GET setup/business": () => ({ business: true, personal: "PRJ-0", sides: [{ project: "PRJ-1", name: "Harbor" }] }),
  });
  row((w: string) => {
    words = w;
  });
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET setup/business")).toBe(true));
  await user.type(field, "Call the printer");
  await waitFor(() => expect(calls.filter((c) => c.route === "GET setup/business").length).toBeGreaterThan(0));
  await user.keyboard("{Enter}");
  await waitFor(() => expect(words).toBe("Call the printer"));
  expect(calls.some((c) => c.route === "POST todos")).toBe(false);
  expect(field).toHaveValue("");
});

// ---- a date said at the end of the title ------------------------------------------------------------------------------

/** The day the server reads each phrase as, on a fixed Monday (2026-11-02): the add row asks it and shows the answer. */
const DAYS: Record<string, string> = { "by Friday": "2026-11-06", tomorrow: "2026-11-03", "on the 12th": "2026-11-12", "next week": "2026-11-13" };

function withDays(extra = {}) {
  return api({
    "POST todos/day": (body: unknown) => {
      const words = (body as { words: string }).words;
      return DAYS[words] ? { status: "ok", day: DAYS[words] } : { status: "unclear", day: null };
    },
    ...extra,
  });
}

test.each([
  ["Send the headcount by Friday", "Send the headcount", "by Friday", "Fri, Nov 6"],
  ["Call the printer tomorrow", "Call the printer", "tomorrow", "Tue, Nov 3"],
  ["Pay the deposit on the 12th", "Pay the deposit", "on the 12th", "Thu, Nov 12"],
  ["Book the room next week", "Book the room", "next week", "Fri, Nov 13"],
])("%s: the date found is shown before Enter, and the to-do is added with that day and the title without it", async (typed, title, phrase, shown) => {
  const user = userEvent.setup();
  const calls = withDays();
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET people")).toBe(true));
  await user.type(field, typed);
  const found = await screen.findByText(`Due ${shown}`);
  expect(found.closest("[data-date-found]")).not.toBeNull();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(calls.find((c) => c.route === "POST todos")?.body).toEqual({ text: title, when: phrase, owners: ["P-1"] }));
  await waitFor(() => expect(field).toHaveValue(""));
});

test("the date found can be dropped before Enter: the whole words are added with no day", async () => {
  const user = userEvent.setup();
  const calls = withDays();
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET people")).toBe(true));
  await user.type(field, "Send the headcount by Friday");
  await screen.findByText("Due Fri, Nov 6");
  await user.click(screen.getByRole("button", { name: "Don't set a date from “by Friday”" }));
  expect(screen.queryByText("Due Fri, Nov 6")).toBeNull();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(calls.find((c) => c.route === "POST todos")?.body).toEqual({ text: "Send the headcount by Friday", owners: ["P-1"] }));
});

test("a title with no date goes in as it is, to Needs a date, and shows no date", async () => {
  const user = userEvent.setup();
  const calls = withDays();
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET people")).toBe(true));
  await user.type(field, "Call the printer{Enter}");
  await waitFor(() => expect(calls.find((c) => c.route === "POST todos")?.body).toEqual({ text: "Call the printer", owners: ["P-1"] }));
  expect(calls.some((c) => c.route === "POST todos/day")).toBe(false);
  expect(document.querySelector("[data-date-found]")).toBeNull();
});

test("a phrase the server can't read is not taken out of the title", async () => {
  const user = userEvent.setup();
  const calls = withDays();
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET people")).toBe(true));
  await user.type(field, "Visit Sam on Friday{Enter}");
  await waitFor(() => expect(calls.find((c) => c.route === "POST todos")?.body).toEqual({ text: "Visit Sam on Friday", owners: ["P-1"] }));
});

// ---- a save that fails ------------------------------------------------------------------------------------------------

test("a failed add keeps the words in the row, says Not saved with the reason, and Try again adds it", async () => {
  const user = userEvent.setup();
  let fail = true;
  const calls = api({ "POST todos": () => (fail ? new Refuse(500, "The app couldn't write to its folder.") : { action: "A-9", changesets: ["CS-9"] }) });
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET people")).toBe(true));
  await user.type(field, "Pay the deposit{Enter}");
  const note = await screen.findByRole("alert");
  expect(note).toHaveTextContent("Not saved");
  expect(note).toHaveTextContent("“Pay the deposit” wasn't saved.");
  expect(note).toHaveTextContent("The app couldn't write to its folder.");
  // Nothing is lost: the words are still in the row, and no toast took the failure.
  expect(field).toHaveValue("Pay the deposit");
  fail = false;
  await user.click(within(note).getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(field).toHaveValue(""));
  expect(calls.filter((c) => c.route === "POST todos")).toHaveLength(2);
  expect(screen.queryByText("Not saved")).toBeNull();
});
