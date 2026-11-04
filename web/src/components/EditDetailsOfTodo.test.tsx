import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp, dayValue } from "../test-utils";
import { RecordPage } from "./RecordPage";

// A to-do's page edits it with the short editor its row has, never a form of the record's own fields (sweep X71): what, due,
// who, and the side or project by name, and a save sends only what the person touched, with the version it read.

const ID = "ACT-6";
const WORDS = "Send the headcount.";
const STORED = "Send the headcount by 2026-11-04.";

const open: S["OpenActionView"] = {
  id: ID,
  version: 5,
  text: STORED,
  state: "open",
  owners: [{ person: "PER-1", name: "Robin Sample" }],
  due: "2026-11-04",
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
};

const KIND_FIELDS = ["text", "owners", "due", "status", "reply_owed", "reported_by", "due_words", "due_check", "source", "evidence", "basis"].map((name) => ({
  name,
  description: "",
  type: name === "owners" ? "other" : name === "due" ? "date" : "text",
  required: false,
  editable: true,
}));

function serve() {
  return fakeApi({
    [`GET record?kind=action&id=${ID}`]: () => ({
      kind: "action",
      id: ID,
      version: 5,
      fields: { id: ID, text: STORED, status: "open", due: "2026-11-04", owners: [{ person: "PER-1" }], project: "PRJ-1", source: "SRC-2", reply_owed: false },
      long_text: [],
    }),
    "GET kinds/action": () => ({ kind: "action", fields: KIND_FIELDS }),
    [`GET record-pages/${ID}?kind=action`]: () => ({ kind: "action", id: ID, version: 5, name: STORED, details: [], open_actions: [], open_questions: [], completed_actions: [], facts: [], fact_source: null, activity: [] }),
    "GET open-items": () => ({ actions: [open], questions: [], stale_days: 21 }),
    "GET people": () => [person("PER-1", "Robin Sample")],
    "GET projects": () => [project("PRJ-1", "Harbor")],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    [`GET plugin-actions?kind=action&id=${ID}`]: () => [],
    [`GET task-kinds?kind=action&id=${ID}`]: () => [],
    "POST records/edit": () => ({ changeset: "CS-1" }),
  });
}

test("Edit details on a to-do opens the short editor, with no field of the record's own", async () => {
  const user = userEvent.setup();
  serve();
  renderApp(<RecordPage kind="action" id={ID} onBack={() => {}} />);
  await user.click(await screen.findByRole("button", { name: "Edit details" }));
  expect(await screen.findByLabelText("Title")).toHaveValue(WORDS);
  expect(dayValue(screen.getByLabelText("Due"))).toBe("2026-11-04");
  for (const raw of ["Reply owed", "Reported by", "Date set by", "Where it came from", "Status", "Wording", "Area"]) {
    expect(screen.queryByLabelText(raw)).toBeNull();
  }
  expect(screen.queryByRole("form", { name: "Edit details" })).toBeNull();
  expect(document.body.textContent).not.toMatch(/PRJ-1|\[object Object\]|SRC-2/);
});

test("changing only the due date sends the due date alone, never the words", async () => {
  const user = userEvent.setup();
  const calls = serve();
  renderApp(<RecordPage kind="action" id={ID} onBack={() => {}} />);
  await user.click(await screen.findByRole("button", { name: "Edit details" }));
  const due = await screen.findByLabelText("Due");
  await user.clear(due);
  await user.type(due, "2026-11-09");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST records/edit")).toBeDefined());
  expect(calls.find((c) => c.route === "POST records/edit")?.body).toEqual({
    kind: "action",
    id: ID,
    fields: { due: "2026-11-09", due_words: null, due_check: false },
    read_version: 5,
  });
});

test("the to-do page's editor is a drawer with Cancel and Save in its footer, one label style and the usual repeat list", async () => {
  const user = userEvent.setup();
  serve();
  renderApp(<RecordPage kind="action" id={ID} onBack={() => {}} />);
  await user.click(await screen.findByRole("button", { name: "Edit details" }));
  const drawer = await screen.findByRole("dialog", { name: "Edit to-do" });
  expect(await within(drawer).findByLabelText("Title")).toHaveValue(WORDS);
  expect(within(drawer).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  expect(within(drawer).getByRole("button", { name: "Save" })).toBeInTheDocument();
  // Repeats is a list of the usual ways, not a box to type in.
  expect(within(drawer).getByRole("combobox", { name: "Repeats" })).toHaveValue("");
  expect(within(drawer).queryByRole("textbox", { name: "Repeats" })).toBeNull();
  // Cancel closes it and nothing is sent.
  await user.click(within(drawer).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit to-do" })).toBeNull());
});
