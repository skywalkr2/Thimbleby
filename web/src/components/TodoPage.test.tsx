import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { RecordPage } from "./RecordPage";

// A to-do's page (design 7.5): the title, Mark done at the top, and each fact once in words; the record's internal fields
// are not shown.

const on = "kind=action&id=ACT-1";

const kind: S["KindView"] = {
  kind: "action",
  fields: [
    { name: "id", description: "", type: "text", required: true, editable: false },
    { name: "text", description: "The work the action stands for. It is long text.", long_text: "plain", type: "long_text", required: true, editable: true },
    { name: "owners", description: "", type: "list", required: false, editable: true },
    { name: "due", description: "", type: "date", required: false, editable: true },
    { name: "evidence", description: "", type: "text", required: false, editable: false },
    { name: "told", description: "", type: "list", required: false, editable: false },
    { name: "project", description: "", refers_to: "project", type: "reference", required: false, editable: true },
    { name: "status", description: "", type: "text", required: false, editable: false },
  ],
};

function routes(extra: Routes = {}): Routes {
  return {
    [`GET record?${on}`]: () => ({
      kind: "action",
      id: "ACT-1",
      version: 4,
      fields: {
        id: "ACT-1",
        text: "Send the headcount.",
        owners: [{ person: "P-2" }],
        due: "2026-11-04",
        evidence: { quote: "I will send the headcount." },
        told: ["P-3"],
        project: "PRJ-1",
        status: "open",
      },
      long_text: ["text"],
    }),
    "GET kinds/action": () => kind,
    "GET people": () => [
      { id: "P-2", name: "Robin Example" },
      { id: "P-3", name: "Sam Twin" },
    ],
    "GET projects": () => [{ id: "PRJ-1", name: "Harbor" }],
    "GET record-pages/ACT-1?kind=action": () => ({
      kind: "action",
      id: "ACT-1",
      version: 4,
      name: "Send the headcount.",
      details: [],
      open_actions: [],
      open_questions: [],
      completed_actions: [],
      fact_source: null,
      activity: [],
    }),
    [`GET plugin-actions?${on}`]: () => [],
    [`GET task-kinds?${on}`]: () => [],
    "GET promises/ACT-1": () => ({
      action: "ACT-1",
      version: 4,
      text: "Send the headcount.",
      status: "open",
      quote: "I will send the headcount.",
      owners: [{ id: "P-2", name: "Robin Example" }],
      mine: false,
      promised_to: [],
      due: "2026-11-04",
      due_words: "by Wednesday",
      due_check: false,
      basis: "said",
      said_by: "Robin Example",
      origin: null,
      news: [],
    }),
    "POST actions/ACT-1/status": () => ({ ok: "ACT-1", request: null }),
    "POST changesets/CS-1/undo": () => ({ restored: [0], skipped: [] }),
    ...extra,
  };
}

test("the page is a To-do headed by its title, not by the kind of record", async () => {
  fakeApi(routes());
  renderApp(<RecordPage kind="action" id="ACT-1" onBack={() => {}} />);
  expect(await screen.findByRole("heading", { level: 1, name: /Send the headcount/ })).toBeInTheDocument();
  expect(screen.getAllByText("To-do").length).toBeGreaterThan(0);
  expect(screen.queryByRole("heading", { name: "Action" })).toBeNull();
});

test("each fact is said once: one Owner and one Due, none of the internal fields, and no schema help", async () => {
  fakeApi(routes());
  renderApp(<RecordPage kind="action" id="ACT-1" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  await waitFor(() => expect(within(details).getAllByRole("term").length).toBeGreaterThan(0));
  const terms = within(details).getAllByRole("term").map((x) => x.textContent);
  expect(terms).toEqual(expect.arrayContaining(["Owner", "Due"]));
  for (const hidden of ["Evidence", "Wording", "Told", "Who was told", "Owners", "Who owes it", "Who does it", "Due date"]) {
    expect(terms).not.toContain(hidden);
  }
  expect(terms.filter((x) => x === "Owner")).toHaveLength(1);
  expect(terms.filter((x) => x === "Due")).toHaveLength(1);
  expect(within(details).getByText("Robin Example")).toBeInTheDocument();
  // The same facts are not said again by the why block or a text section.
  expect(screen.queryByText("Who owes it")).toBeNull();
  expect(screen.queryByText(/stands for/)).toBeNull();
  expect(screen.queryByRole("region", { name: "Wording" })).toBeNull();
  expect(screen.queryByText("Draft")).toBeNull();
});

// A to-do's own page (design 7.5, 7.14): it is a to-do, with Mark done at the top; each fact is said once, so the words that are
// the heading are not a detail too; and a text nobody has written is one line, not a heading, help and an empty box.

const WORDS = "Send the headcount";

function serve(status: string, extra: Routes = {}, text = { text: "", versions: [] as unknown[] }) {
  return fakeApi({
    "GET record?kind=action&id=ACT-2": () => ({ kind: "action", id: "ACT-2", version: 3, fields: { id: "ACT-2", text: WORDS, status, owners: [{ person: "PER-1" }], project: "PRJ-1" }, long_text: ["work"] }),
    "GET kinds/action": () => ({ kind: "action", fields: [{ name: "text", description: "", type: "text", required: true, editable: true }] }),
    "GET record-pages/ACT-2?kind=action": () => ({ kind: "action", id: "ACT-2", version: 3, name: WORDS, details: [], open_actions: [], open_questions: [], completed_actions: [], facts: [], fact_source: null, activity: [] }),
    "GET people": () => [person("PER-1", "Robin Sample")],
    "GET projects": () => [project("PRJ-1", "Harbor")],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    "GET plugin-actions?kind=action&id=ACT-2": () => [],
    "GET task-kinds?kind=action&id=ACT-2": () => [],
    "GET texts?kind=action&id=ACT-2&field=work": () => ({ text: text.text, versions: text.versions, authorship: [], working_copies: [] }),
    "GET records/action/ACT-2/conversation": () => ({ kind: "action", id: "ACT-2", turns: [] }),
    ...extra,
  });
}

test("an open to-do has Mark done at the top of its page, which marks it done with Undo", async () => {
  const user = userEvent.setup();
  const calls = serve("open", { "POST actions/ACT-2/status": () => ({ ok: "ACT-2", request: null }) });
  renderApp(<RecordPage kind="action" id="ACT-2" onBack={() => {}} />);
  expect(await screen.findByRole("heading", { level: 1, name: WORDS })).toBeInTheDocument();
  const button = await screen.findByRole("button", { name: "Mark done" });
  expect(button).toHaveAttribute("data-variant", "primary");
  await user.click(button);
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/ACT-2/status")?.body).toEqual({ status: "done" }));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST actions/ACT-2/status")[1].body).toEqual({ status: "open" }));
});

test("a to-do that is done has no Mark done", async () => {
  serve("done");
  renderApp(<RecordPage kind="action" id="ACT-2" onBack={() => {}} />);
  await screen.findByRole("heading", { level: 1, name: WORDS });
  expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull();
});

test("the words are the heading and not a detail again, and each fact is one row", async () => {
  serve("open");
  renderApp(<RecordPage kind="action" id="ACT-2" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  await within(details).findByText("Harbor");
  expect(within(details).queryByText("Wording")).toBeNull();
  expect(within(details).getAllByRole("term").map((x) => x.textContent)).toEqual(["Owner", "Due", "Project"]);
});

const SECTION = { name: "Draft" } as const;

test("a to-do nobody asked a draft for has no Draft section", async () => {
  serve("open");
  renderApp(<RecordPage kind="action" id="ACT-2" onBack={() => {}} />);
  await screen.findByRole("heading", { level: 1, name: WORDS });
  await within(await screen.findByRole("region", { name: "Details" })).findByText("Harbor");
  expect(screen.queryByRole("region", SECTION)).toBeNull();
  expect(screen.queryByText("No text yet.")).toBeNull();
  expect(screen.queryByText(/waits for your review/)).toBeNull();
});

test("a to-do with drafted text shows its Draft section", async () => {
  serve("open", {}, { text: "Here is the drafted reply.", versions: [] });
  renderApp(<RecordPage kind="action" id="ACT-2" onBack={() => {}} />);
  const draft = await screen.findByRole("region", SECTION);
  expect(within(draft).getByText("Here is the drafted reply.")).toBeInTheDocument();
});

test("a to-do with a draft waiting for review shows its Draft section", async () => {
  const waiting = { id: "V-2", number: 1, version: 2, status: "pending", source: "draft", words: 4, base: null, note: null, created_at: "2026-10-30T09:00:00Z", questions: [], unmapped: [] };
  serve("open", {}, { text: "", versions: [waiting] });
  renderApp(<RecordPage kind="action" id="ACT-2" onBack={() => {}} />);
  expect(await screen.findByRole("region", SECTION)).toBeInTheDocument();
});

test("a list of records in a field is never joined into the details: only the page's own section shows it", async () => {
  const news = [
    { on: "2026-10-31", text: "Upcoming scheduled payment", quote: "", source: "SRC-1", delivered: false, non_answer: true },
    { on: "2026-11-01", text: "Second note about it", quote: "", source: "SRC-2", delivered: true, non_answer: false },
  ];
  serve("open", {
    "GET record?kind=action&id=ACT-2": () => ({ kind: "action", id: "ACT-2", version: 3, fields: { id: "ACT-2", text: WORDS, status: "open", owners: [{ person: "PER-1" }], project: "PRJ-1", news }, long_text: [] }),
    "GET promises/ACT-2": () => ({
      action: "ACT-2", version: 3, text: WORDS, status: "open", quote: "", owners: [{ id: "PER-1", name: "Robin Sample" }], mine: false, promised_to: [],
      due: null, due_words: null, due_check: false, basis: "said", said_by: "Robin Sample", origin: null, news,
    }),
  });
  renderApp(<RecordPage kind="action" id="ACT-2" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  await within(details).findByText("Harbor");
  expect(within(details).queryByText(/Upcoming scheduled payment/)).toBeNull();
  expect(within(details).queryByText("Second note about it")).toBeNull();
  expect(within(details).queryByText(/^(Yes|No)$/)).toBeNull();
  expect(within(details).queryByText(/^News$/)).toBeNull();
  // The page's own section still says what was heard.
  expect(await screen.findByRole("heading", { name: "What was heard since" })).toBeInTheDocument();
  expect(screen.getByText(/Upcoming scheduled payment/)).toBeInTheDocument();
});
