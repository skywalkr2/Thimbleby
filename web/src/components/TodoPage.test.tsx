import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
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

test("Mark done is at the top of an open to-do's page, acts at once and offers Undo", async () => {
  const calls = fakeApi(routes());
  const user = userEvent.setup();
  renderApp(<RecordPage kind="action" id="ACT-1" onBack={() => {}} />);
  await user.click(await screen.findByRole("button", { name: "Mark done" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST actions/ACT-1/status")).toBe(true));
  expect(calls.find((c) => c.route === "POST actions/ACT-1/status")?.body).toMatchObject({ status: "done" });
});

test("a to-do that is already done has no Mark done", async () => {
  fakeApi(
    routes({
      [`GET record?${on}`]: () => ({
        kind: "action",
        id: "ACT-1",
        version: 4,
        fields: { id: "ACT-1", text: "Send the headcount.", owners: [{ person: "P-2" }], status: "done" },
        long_text: ["text"],
      }),
    }),
  );
  renderApp(<RecordPage kind="action" id="ACT-1" onBack={() => {}} />);
  await screen.findByRole("heading", { level: 1 });
  expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull();
});
