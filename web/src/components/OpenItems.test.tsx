import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { chooseFilters } from "../lib/open-items";
import { dateAndTime } from "./ReminderLine";
import { OpenItems } from "./OpenItems";

const WEB = "https" + "://";

const action = (id: string, text: string, over: Partial<S["OpenActionView"]> = {}): S["OpenActionView"] => ({
  id,
  version: 3,
  text,
  state: "open",
  owners: [{ person: "P-1", name: "Quinn Sample" }],
  due: null,
  project: "PRJ-1",
  project_name: "Harbor",
  parent_name: null,
  notes: null,
  since: "2026-10-01",
  on_hold: null,
  blocker: null,
  duplicate: null,
  origin: null,
  untouched_days: null,
  owner_question: null,
  to_send: false,
  ...over,
});

const question = (id: string, title: string, over: Partial<S["OpenQuestionView"]> = {}): S["OpenQuestionView"] => ({
  id,
  version: 2,
  title,
  text: "",
  kind: "question",
  state: "waiting",
  to: "P-2",
  to_name: "Robin Sample",
  project_name: "Harbor",
  projects: ["PRJ-1"],
  since: "2026-10-08",
  waiting_days: 6,
  chases: 0,
  held_until: null,
  origin: null,
  ...over,
});

const actions = [
  action("A-1", "Send the proof to the printer", {
    due: "2026-10-12",
    state: "overdue",
    parent_name: "Upper Shelf",
    notes: "Ask about the paper too",
    origin: { kind: "link", url: `${WEB}docs.example.com/plan`, source: "S-1" },
  }),
  action("A-2", "Order the sample copies", { owners: [{ person: "P-2", name: "Robin Sample" }], project: "PRJ-2", project_name: "Lighthouse", due: "2026-10-30" }),
  action("A-3", "Tidy the style sheet", { state: "stale", untouched_days: 30 }),
  action("A-4", "Book the room", { owners: [], state: "no_owner", owner_question: "Q-9" }),
  action("A-5", "Wait for the printer's quote", { state: "on_hold", on_hold: "the printer's quote" }),
];
const questions = [
  question("Q-1", "Is the acknowledgments page final?"),
  question("Q-2", "Which cover finish?", { state: "yours", to: "P-1", to_name: "Quinn Sample", waiting_days: null, since: "2026-10-10" }),
];

function api(extra: Routes = {}, shown: { actions?: S["OpenActionView"][]; questions?: S["OpenQuestionView"][] } = {}) {
  return fakeApi({
    "GET open-items": () => ({ actions: shown.actions ?? actions, questions: shown.questions ?? questions, stale_days: 21 }),
    "GET people": () => [person("P-1", "Quinn Sample"), person("P-2", "Robin Sample"), person("P-3", "Sam Twin")],
    "GET projects": () => [project("PRJ-1", "Harbor"), project("PRJ-2", "Lighthouse")],
    "POST actions/A-1/status": () => ({ ok: "A-1", request: null }),
    "POST records/edit": () => ({ changeset: "CS-1" }),
    "POST changesets/CS-1/undo": () => ({ restored: [0], skipped: [] }),
    ...extra,
  });
}

async function rows() {
  const list = await screen.findByRole("list", { name: "Open to-dos" });
  return within(list).getAllByRole("listitem");
}

test("every open to-do is a row with its owners, due date, project and the project it is part of, and where it came from", async () => {
  api();
  renderApp(<OpenItems />);
  const all = await rows();
  expect(all).toHaveLength(5);
  const first = all[0];
  expect(first).toHaveTextContent("Send the proof to the printer");
  expect(first).toHaveTextContent("Quinn Sample");
  expect(first).toHaveTextContent("Oct 12");
  expect(first).toHaveTextContent("Harbor");
  expect(first).toHaveTextContent("Upper Shelf");
  expect(within(first).getByRole("link", { name: "Where it came from" })).toHaveAttribute("href", `${WEB}docs.example.com/plan`);
  expect(within(first).getByText("Overdue")).toBeInTheDocument();
  expect(all[2]).toHaveTextContent("Not touched for 30 days");
  expect(all[3]).toHaveTextContent("Nobody yet");
  expect(all[4]).toHaveTextContent("Paused: the printer's quote");
});

test("a row whose date is to be checked says so beside the date and is not shown as overdue", async () => {
  api({}, { actions: [action("A-1", "Send the proof", { due: "2026-10-12", due_check: true, state: "open" }), action("A-2", "Review it", { due: "2026-10-12" })] });
  renderApp(<OpenItems />);
  const [first, second] = await rows();
  expect(first).toHaveTextContent(/due Mon, Oct 12 \(check this date\)/);
  expect(within(first).queryByText("Overdue")).toBeNull();
  expect(second).not.toHaveTextContent("check this date");
});

test("a to-do whose owner hasn't been told says to send, and the others don't", async () => {
  api({}, { actions: [action("A-1", "Send the proof", { to_send: true }), action("A-2", "Review it", { to_send: false })] });
  renderApp(<OpenItems />);
  const [first, second] = await rows();
  expect(within(first).getByText("To send")).toBeInTheDocument();
  expect(within(second).queryByText("To send")).toBeNull();
});

test("a row's notes are on hover and read by a screen reader too", async () => {
  api();
  renderApp(<OpenItems />);
  const [first, second] = await rows();
  const title = within(first).getByText("Send the proof to the printer");
  expect(title.closest("[title]")).toHaveAttribute("title", "Ask about the paper too");
  const described = title.closest("[aria-describedby]")!.getAttribute("aria-describedby")!;
  expect(document.getElementById(described)).toHaveTextContent("Ask about the paper too");
  expect(second.querySelector("[title]")).toBeNull();
});

test("the questions are another list: who each waits on and since when", async () => {
  const user = userEvent.setup();
  api();
  renderApp(<OpenItems />);
  await user.click(await screen.findByRole("button", { name: /Questions/ }));
  const list = await screen.findByRole("list", { name: "Open questions" });
  const [waiting, yours] = within(list).getAllByRole("listitem");
  expect(waiting).toHaveTextContent("Is the acknowledgments page final?");
  expect(waiting).toHaveTextContent("Waiting on Robin Sample");
  expect(waiting).toHaveTextContent("since Oct 8");
  expect(waiting).toHaveTextContent("6 days");
  expect(yours).toHaveTextContent("Waiting on you");
  expect(yours).toHaveTextContent("since Oct 10");
});

test("a question waiting on you says Answer on Today, and takes you there; it has no answer form on this screen", async () => {
  const user = userEvent.setup();
  api();
  renderApp(<OpenItems />);
  await user.click(await screen.findByRole("button", { name: /Questions/ }));
  const list = await screen.findByRole("list", { name: "Open questions" });
  const yours = within(list).getAllByRole("listitem")[1];
  expect(within(yours).queryByRole("button", { name: "Answer" })).toBeNull();
  expect(within(yours).queryByRole("textbox")).toBeNull();
  window.location.hash = "";
  await user.click(within(yours).getByRole("button", { name: "Answer on Today" }));
  expect(window.location.hash).toBe("#today");
  window.location.hash = "";
});

test("project, person and state each narrow the list, from lists to pick from", async () => {
  const user = userEvent.setup();
  api();
  renderApp(<OpenItems />);
  await rows();
  const project = screen.getByRole("combobox", { name: "Project" });
  expect(within(project).getAllByRole("option").map((o) => o.textContent)).toEqual(["All projects", "Harbor", "Lighthouse"]);
  await user.selectOptions(project, "PRJ-2");
  expect(await rows()).toHaveLength(1);
  expect((await rows())[0]).toHaveTextContent("Order the sample copies");
  await user.selectOptions(project, "");
  const who = screen.getByRole("combobox", { name: "Person" });
  expect(within(who).getAllByRole("option").map((o) => o.textContent)).toEqual(["Everyone", "Quinn Sample", "Robin Sample"]);
  await user.selectOptions(who, "P-1");
  expect((await rows()).map((r) => r.textContent).join(" ")).not.toContain("Order the sample copies");
  expect(await rows()).toHaveLength(3);
  await user.selectOptions(who, "");
  await user.selectOptions(screen.getByRole("combobox", { name: "State" }), "stale");
  expect(await rows()).toHaveLength(1);
  expect((await rows())[0]).toHaveTextContent("Tidy the style sheet");
});

test("the state list for questions is its own", async () => {
  const user = userEvent.setup();
  api();
  renderApp(<OpenItems />);
  await user.click(await screen.findByRole("button", { name: /Questions/ }));
  const state = await screen.findByRole("combobox", { name: "State" });
  expect(within(state).getAllByRole("option").map((o) => o.textContent)).toEqual(["Any state", "Waiting on you", "Waiting on them", "Not sent yet", "For later"]);
  await user.selectOptions(state, "yours");
  const list = await screen.findByRole("list", { name: "Open questions" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(1);
});

test("Mark done acts at once, with Undo", async () => {
  const user = userEvent.setup();
  const calls = api();
  renderApp(<OpenItems />);
  const [first] = await rows();
  await user.click(within(first).getByRole("button", { name: "Mark done" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/A-1/status")?.body).toEqual({ status: "done" }));
  expect(await screen.findByText("Marked done.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST actions/A-1/status").pop()?.body).toEqual({ status: "open" }));
});

test("a note typed on Mark done reaches the assistant with the act", async () => {
  const user = userEvent.setup();
  const calls = api({ "POST actions/A-1/status": () => ({ ok: "A-1", request: "R-1" }) });
  renderApp(<OpenItems />);
  const [first] = await rows();
  await user.click(within(first).getByRole("button", { name: /More actions for Send the proof/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Add a note" }));
  const box = await screen.findByRole("textbox", { name: /note/i });
  await waitFor(() => expect(box).toHaveFocus());
  await user.type(box, "Done, the printer has it{Enter}");
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/A-1/status")?.body).toEqual({ status: "done", note: "Done, the printer has it" }));
});

test("Reassign picks a person from a list and changes the owner, with Undo", async () => {
  const user = userEvent.setup();
  const calls = api();
  renderApp(<OpenItems />);
  const [first] = await rows();
  await user.click(within(first).getByRole("button", { name: /More actions for Send the proof/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Reassign…" }));
  const picker = await screen.findByRole("combobox", { name: "Reassign to" });
  await waitFor(() => expect(picker).toHaveFocus());
  await user.selectOptions(picker, "P-3");
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST records/edit")?.body).toEqual({
      kind: "action",
      id: "A-1",
      read_version: 3,
      fields: { owners: [{ person: "P-3" }] },
    }),
  );
  expect(await screen.findByText("Reassigned to Sam Twin.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-1/undo")).toBe(true));
});

test("on a shared to-do, Reassign changes one owner and leaves the rest", async () => {
  const user = userEvent.setup();
  const shared = action("A-7", "Agree on the back-cover copy", {
    owners: [
      { person: "P-1", name: "Quinn Sample" },
      { person: "P-2", name: "Robin Sample" },
    ],
  });
  const calls = api({}, { actions: [shared] });
  renderApp(<OpenItems />);
  const [row] = await rows();
  await user.click(within(row).getByRole("button", { name: /More actions for Agree on the back-cover copy/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Reassign…" }));
  await user.selectOptions(await screen.findByRole("combobox", { name: "Whose part" }), "P-2");
  await user.selectOptions(await screen.findByRole("combobox", { name: "Reassign to" }), "P-3");
  await waitFor(() => expect(calls.find((c) => c.route === "POST records/edit")?.body).toMatchObject({ fields: { owners: [{ person: "P-1" }, { person: "P-3" }] } }));
});

test("Edit changes the words and the due date from the row, sending only what changed", async () => {
  const user = userEvent.setup();
  const calls = api();
  renderApp(<OpenItems />);
  const [first] = await rows();
  await user.click(within(first).getByRole("button", { name: /More actions for Send the proof/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Edit…" }));
  const text = await screen.findByRole("textbox", { name: "What to do" });
  await waitFor(() => expect(text).toHaveFocus());
  await user.clear(text);
  await user.type(text, "Send the corrected proof to the printer");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST records/edit")?.body).toEqual({
      kind: "action",
      id: "A-1",
      read_version: 3,
      fields: { text: "Send the corrected proof to the printer" },
    }),
  );
  expect(await screen.findByText("Saved.")).toBeInTheDocument();
});

test("a to-do that nearly repeats another offers Merge with it, at once and with one Undo; one that doesn't offers nothing", async () => {
  const user = userEvent.setup();
  const twin = action("A-8", "Order the sample copies today", {
    duplicate: { id: "A-9", text: "Order the sample copies for the reviewers", version: 4 },
  });
  const calls = api({ "POST actions/A-8/merge": () => ({ changeset: "CS-1" }) }, { actions: [twin, actions[1]] });
  renderApp(<OpenItems />);
  const [row, other] = await rows();
  await user.click(within(other).getByRole("button", { name: /More actions for Order the sample copies$/ }));
  expect(screen.queryByRole("menuitem", { name: /Merge with/ })).toBeNull();
  await user.keyboard("{Escape}");
  await user.click(within(row).getByRole("button", { name: /More actions for Order the sample copies today/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Merge with “Order the sample copies for the reviewers”" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/A-8/merge")?.body).toEqual({ other: "A-9", read_version: 3, other_version: 4 }));
  expect(await screen.findByText("Merged: “Order the sample copies for the reviewers” is closed.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-1/undo")).toBe(true));
});

test("a to-do with no owner asks who, in the row", async () => {
  const user = userEvent.setup();
  const calls = api({ "POST questions/Q-9/answer": () => ({ ok: "Q-9", request: null }) });
  renderApp(<OpenItems />);
  const row = (await rows())[3];
  await user.click(within(row).getByRole("button", { name: "Pick an owner" }));
  await user.selectOptions(await within(row).findByRole("combobox"), "P-2");
  await user.click(within(row).getByRole("button", { name: "Add the to-do" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST questions/Q-9/answer")?.body).toEqual({ person: "P-2" }));
});

test("a question can be answered, reworded, asked of someone else or dropped from its row", async () => {
  const user = userEvent.setup();
  api();
  renderApp(<OpenItems />);
  await user.click(await screen.findByRole("button", { name: /Questions/ }));
  const [waiting] = within(await screen.findByRole("list", { name: "Open questions" })).getAllByRole("listitem");
  await user.click(within(waiting).getByRole("button", { name: /More actions for Is the acknowledgments page final/ }));
  const names = (await screen.findAllByRole("menuitem")).map((m) => m.querySelector('[slot="label"]')?.textContent ?? m.textContent);
  expect(names).toEqual(expect.arrayContaining(["Reword", "Ask someone else", "Drop"]));
});

test("with nothing open the screen says so, and a failed load offers to try again", async () => {
  api({}, { actions: [], questions: [] });
  renderApp(<OpenItems />);
  expect(await screen.findByText("Nothing is open. To-dos and questions appear here as they are made.")).toBeInTheDocument();
});

test("reassigning keeps the team the owner acted for", async () => {
  const user = userEvent.setup();
  const teamed = action("A-6", "Print the proofs", { owners: [{ person: "P-1", name: "Quinn Sample (Print)", team: "T-1" }] });
  const calls = api({}, { actions: [teamed] });
  renderApp(<OpenItems />);
  const [row] = await rows();
  await user.click(within(row).getByRole("button", { name: /More actions for Print the proofs/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Reassign…" }));
  await user.selectOptions(await screen.findByRole("combobox", { name: "Reassign to" }), "P-3");
  await waitFor(() => expect(calls.find((c) => c.route === "POST records/edit")?.body).toMatchObject({ fields: { owners: [{ person: "P-3", team: "T-1" }] } }));
});

test("with no side besides Personal the filters say Area, never Project, and the state list has no No owner", async () => {
  api({
    "GET setup/business": () => ({ business: false, name: null, personal: "PRJ-personal", sides: [], chosen: "me" }),
    "GET projects": () => [project("PRJ-personal", "Personal")],
  });
  renderApp(<OpenItems />);
  await rows();
  expect(await screen.findByRole("combobox", { name: "Area" })).toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Project" })).toBeNull();
  expect(within(screen.getByRole("combobox", { name: "Area" })).getByRole("option", { name: "All areas" })).toBeInTheDocument();
  const states = within(screen.getByRole("combobox", { name: "State" })).getAllByRole("option").map((o) => o.textContent);
  expect(states).toEqual(expect.arrayContaining(["Overdue", "Not touched in a while", "Paused"]));
  expect(states).not.toContain("No owner");
});

test("with a side the filters keep Project and No owner", async () => {
  api({ "GET setup/business": () => ({ business: true, name: "Orchard Press", personal: "PRJ-personal", sides: [{ project: "PRJ-side", kind: "business", name: "Orchard Press" }], chosen: "work" }) });
  renderApp(<OpenItems />);
  await rows();
  expect(screen.getByRole("combobox", { name: "Project" })).toBeInTheDocument();
  expect(within(screen.getByRole("combobox", { name: "State" })).getByRole("option", { name: "No owner" })).toBeInTheDocument();
});

// ---- the to-do row's own acts: Drop, Change this, a reminder, a hold, what is learned (moved here with the row) ---------------

test("Drop on a to-do asks why with the cursor in the field, acts at once and Undo takes it back", async () => {
  const user = userEvent.setup();
  const calls = api({ "POST actions/A-1/drop": () => ({ changeset: "CS-9", drafts: [], acts: [] }), "POST changesets/CS-9/undo": () => ({ restored: [0], skipped: [] }) });
  renderApp(<OpenItems />);
  const [first] = await rows();
  await user.click(within(first).getByRole("button", { name: /More actions for Send the proof/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Drop" }));
  const field = await screen.findByRole("textbox", { name: "Why isn't it needed?" });
  expect(field).toHaveFocus();
  const form = field.closest("form") as HTMLElement;
  expect(within(form).getByRole("button", { name: "Drop it" })).toBeDisabled();
  await user.type(field, "The index moved to the printer");
  await user.click(within(form).getByRole("button", { name: "Drop it" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/A-1/drop")?.body).toEqual({ reason: "The index moved to the printer" }));
  expect(await screen.findByText("Dropped.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-9/undo")).toBe(true));
});

test("Drop on a to-do that reached people reads Drop it and tell them, says a note waits for the yes, and one Undo takes the note and the drop back", async () => {
  const user = userEvent.setup();
  const calls = api(
    {
      "POST actions/A-1/drop": () => ({ changeset: "CS-9", drafts: ["CS-10"], acts: ["XACT-1"] }),
      "POST changesets/CS-9/undo": () => ({ restored: [0], skipped: [] }),
      "POST changesets/CS-10/undo": () => ({ restored: [0], skipped: [] }),
    },
    { actions: [action("A-1", "Send the proof to the printer", { told_names: ["Robin Sample"] }), action("A-2", "Tidy the style sheet")] },
  );
  renderApp(<OpenItems />);
  const [first, second] = await rows();
  await user.click(within(second).getByRole("button", { name: /More actions for Tidy the style sheet/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Drop" }));
  const plain = await screen.findByRole("textbox", { name: "Why isn't it needed?" });
  await user.type(plain, "x");
  expect(within(plain.closest("form") as HTMLElement).getByRole("button", { name: "Drop it" })).toBeInTheDocument();
  expect(within(plain.closest("form") as HTMLElement).queryByRole("button", { name: "Drop it and tell them" })).toBeNull();
  await user.keyboard("{Escape}");
  await user.click(within(first).getByRole("button", { name: /More actions for Send the proof/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Drop" }));
  const field = await screen.findByRole("textbox", { name: "Why isn't it needed?" });
  const form = field.closest("form") as HTMLElement;
  expect(within(form).queryByRole("button", { name: "Drop it" })).toBeNull();
  await user.type(field, "The index moved to the printer");
  await user.click(within(form).getByRole("button", { name: "Drop it and tell them" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/A-1/drop")?.body).toEqual({ reason: "The index moved to the printer" }));
  expect(await screen.findByText("Dropped. A note to Robin Sample is waiting for your yes.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route.endsWith("/undo")).map((c) => c.route)).toEqual(["POST changesets/CS-9/undo"]));
});

test("a to-do's menu has Change this, which posts the person's note about that action", async () => {
  const user = userEvent.setup();
  const calls = api({ "POST items/action/A-1/change": () => ({ ok: "A-1", request: "REQ-7", signal: "SIG-1" }) });
  renderApp(<OpenItems />);
  const [first] = await rows();
  await user.click(within(first).getByRole("button", { name: /More actions for Send the proof/ }));
  await user.click(screen.getByRole("menuitem", { name: "Change this" }));
  await user.type(await screen.findByRole("textbox", { name: "Your note" }), "Due on Friday instead");
  await user.click(screen.getByRole("button", { name: "Ask for the change" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST items/action/A-1/change")?.body).toEqual({ note: "Due on Friday instead" }));
  expect(await screen.findByText("Helper will look at it.")).toBeInTheDocument();
});

test("what is being learned from a change asked for on a to-do shows on that row", async () => {
  api({
    "GET knowledge/learned": () => ({
      lines: [{ signal: "SIG-1", kind: "change_requested", changeset: null, refs: ["A-2"], state: "learning", waiting: "With the assistant, starting now" }],
    }),
  });
  renderApp(<OpenItems />);
  const row = (await screen.findByText("Order the sample copies")).closest("li")!;
  expect(await within(row).findByRole("status")).toHaveTextContent("Learning from this…");
});

test("a to-do whose blocker is over says who answered and when, and Resume clears it", async () => {
  const user = userEvent.setup();
  const answered = action("A-6", "Ship the proofs", {
    blocker: { kind: "question", id: "Q-4", name: "Can proof copies ship by Nov 3?", who: "Morgan Sample", state: "answered", answered: "2026-10-09" },
  });
  const calls = api({ "POST actions/A-6/unhold": () => ({ ok: "A-6", previous: { waiting_for: "Morgan Sample", since: "2026-10-01", on: "Q-4" } }) }, { actions: [answered] });
  renderApp(<OpenItems />);
  expect(await screen.findByText(/^Unblocked: Morgan Sample answered .*9$/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "More actions for Ship the proofs" }));
  await user.click(await screen.findByRole("menuitem", { name: "Resume" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST actions/A-6/unhold")).toBe(true));
});

test("a blocked to-do says Blocked, waiting on who or what it waits on", async () => {
  api({}, { actions: [action("A-7", "Sign the contract", { state: "on_hold", on_hold: "Morgan Sample", blocker: { kind: "person", id: "PER-9", name: "Morgan Sample", state: "waiting" } })] });
  renderApp(<OpenItems />);
  expect(await screen.findByText(/Blocked, waiting on/)).toHaveTextContent("Blocked, waiting on Morgan Sample");
});

test("a to-do's menu sets a reminder from a day and time, and a set one is said on its row and can be changed or removed", async () => {
  const user = userEvent.setup();
  const calls = api({ "POST reminders/A-1": () => ({ changeset: "CS-6" }) });
  const first = renderApp(<OpenItems />);
  const [row] = await rows();
  await user.click(within(row).getByRole("button", { name: /More actions for Send the proof/ }));
  expect(screen.queryByRole("menuitem", { name: "Remove reminder" })).toBeNull();
  await user.click(screen.getByRole("menuitem", { name: "Remind me…" }));
  const box = await screen.findByLabelText("Remind me at");
  fireEvent.change(box, { target: { value: "2026-10-21T10:30" } });
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST reminders/A-1")?.body).toEqual({ at: "2026-10-21T10:30" }));
  first.unmount();

  const at = "2026-10-21T10:30:00-04:00";
  const again = api({ "POST reminders/A-1": () => ({ changeset: "CS-6" }) }, { actions: [action("A-1", "Send the proof to the printer", { remind_at: at })] });
  renderApp(<OpenItems />);
  expect(await screen.findByText(new RegExp(`Reminder ${dateAndTime(at)}`))).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /More actions for Send the proof/ }));
  expect(screen.getByRole("menuitem", { name: "Change reminder…" })).toBeInTheDocument();
  await user.click(screen.getByRole("menuitem", { name: "Remove reminder" }));
  await waitFor(() => expect(again.filter((c) => c.route === "POST reminders/A-1").map((c) => c.body)).toEqual([{}]));
});

test("a reminder is a menu entry, never a second primary button on the row", async () => {
  api();
  renderApp(<OpenItems />);
  const [first] = await rows();
  expect(within(first).queryByRole("button", { name: /Remind me/ })).toBeNull();
  expect(within(first).getAllByRole("button").filter((b) => b.getAttribute("data-variant") === "primary" || b.classList.contains("primary"))).toHaveLength(1);
});

test("the overdue line's link shows the person's own overdue to-dos and no one else's, as many as the line counts", async () => {
  const mine = [action("A-1", "Send the proof to the printer", { state: "overdue", due: "2026-10-12" }), action("A-8", "Pay the invoice", { state: "overdue", due: "2026-10-10" })];
  const theirs = action("A-2", "Order the sample copies", { state: "overdue", due: "2026-10-09", owners: [{ person: "P-2", name: "Robin Sample" }] });
  api({}, { actions: [theirs, ...mine, action("A-3", "Tidy the style sheet")] });
  chooseFilters({ state: "overdue", person: "P-1" });
  renderApp(<OpenItems />);
  const listed = await rows();
  expect(listed).toHaveLength(2);
  expect(listed.map((r) => r.textContent).join(" ")).toMatch(/Send the proof to the printer.*Pay the invoice|Pay the invoice.*Send the proof/);
  expect(screen.queryByText("Order the sample copies")).toBeNull();
});
