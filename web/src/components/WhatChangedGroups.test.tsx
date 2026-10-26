import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { besidePane, fakeApi, renderApp } from "../test-utils";
import { WhatChanged } from "./WhatChanged";

// The window is wide, so a change's detail stands beside the list (design 7.13).
beforeEach(() => besidePane());
afterEach(() => vi.unstubAllGlobals());

const op = (index: number, status: S["OpView"]["status"], answerGroup: string | null, title: string): S["OpView"] => ({
  index,
  op: "note",
  status,
  reason: status === "held" ? "Waiting for you" : null,
  group: `op${index}`,
  answer_group: answerGroup,
  title,
  meta: { owners: [] },
  evidence: null,
  record: null,
  ask: null,
});

/** An answer the task kind grouped: two notes that stand, a group with one change waiting, and a plain one. */
function grouped(ops: S["OpView"][], groups: S["AnswerGroupView"][]): S["ChangeItem"] {
  return {
    id: "REQ-1",
    version: 3,
    dismissed: false,
    stage_task: false,
    first_go: false,
    refused: false,
    state: "review",
    waiting: null,
    created_at: "2026-10-09T14:00:00Z",
    note: null,
    source: null,
    source_title: "Sorting the shelf",
    changeset: { id: "CS-1", summary: "Sorted.", status: "held", reviewed: false, trust: "trusted", ops, groups },
  };
}

const GROUPS: S["AnswerGroupView"][] = [
  { id: 0, label: "Asides", ops: [0, 1], applied: 2, held: 0, refused: 0, undone: 0 },
  { id: 1, label: "Structure", ops: [2, 3], applied: 1, held: 1, refused: 0, undone: 0 },
];
const OPS = [op(0, "applied", "Asides", "First aside"), op(1, "applied", "Asides", "Second aside"), op(2, "applied", "Structure", "A shelf"), op(3, "held", "Structure", "Closing chapter"), op(4, "applied", null, "Looked at everything")];

test("an answer the task kind grouped is one row for each group, and the ops in a group are not listed again", async () => {
  fakeApi({ "GET changes": () => [grouped(OPS, GROUPS)] });
  renderApp(<WhatChanged />);
  const asides = (await screen.findByText("Asides")).closest("li")!;
  expect(within(asides).getByText("2 done")).toBeInTheDocument();
  const structure = screen.getByText("Structure").closest("li")!;
  expect(within(structure).getByText("1 done · 1 waits for you")).toBeInTheDocument();
  expect(screen.getByText("Looked at everything")).toBeInTheDocument(); // an op with no group keeps its own row
  expect(screen.queryByText("First aside")).toBeNull();
  expect(screen.queryByText("Closing chapter")).toBeNull();
  // Keep is offered only where something waits.
  expect(within(asides).queryByRole("button", { name: "Keep" })).toBeNull();
  expect(within(structure).getByRole("button", { name: "Keep" })).toBeInTheDocument();
});

test("Keep releases a group's held changes at once and offers Undo for what it released", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [grouped(OPS, GROUPS)],
    "POST changesets/CS-1/groups/1/keep": () => ({ released: [3], restored: [], declined: [], skipped: [] }),
    "POST changesets/CS-1/undo": () => ({ restored: [3], skipped: [] }),
  });
  renderApp(<WhatChanged />);
  const structure = (await screen.findByText("Structure")).closest("li")!;
  await user.click(within(structure).getByRole("button", { name: "Keep" }));
  await waitFor(() => expect(calls.map((c) => c.route)).toContain("POST changesets/CS-1/groups/1/keep"));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-1/undo")?.body).toEqual({ ops: [3] }));
});

test("Drop is in the group's menu, drops the whole group, and says what it left", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [grouped(OPS, GROUPS)],
    "POST changesets/CS-1/groups/0/drop": () => ({ released: [], restored: [1], declined: [], skipped: [{ ops: [0], reason: "changed since" }] }),
  });
  renderApp(<WhatChanged />);
  await user.click(await screen.findByRole("button", { name: /More actions for Asides/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Drop" }));
  await waitFor(() => expect(calls.map((c) => c.route)).toContain("POST changesets/CS-1/groups/0/drop"));
  expect(await screen.findByText("Done, except 1 item, which need a look.")).toBeInTheDocument();
});

test("Release all is offered when more than one change waits, with one Undo", async () => {
  const user = userEvent.setup();
  const waiting = [op(0, "held", null, "First waiting"), op(1, "held", null, "Second waiting")];
  const calls = fakeApi({
    "GET changes": () => [grouped(waiting, [])],
    "POST changesets/CS-1/release-all": () => ({ released: [0, 1], restored: [], declined: [], skipped: [] }),
    "POST changesets/CS-1/undo": () => ({ restored: [0, 1], skipped: [] }),
  });
  renderApp(<WhatChanged />);
  await user.click(await screen.findByRole("button", { name: "Release all" }));
  await waitFor(() => expect(calls.map((c) => c.route)).toContain("POST changesets/CS-1/release-all"));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-1/undo")?.body).toEqual({ ops: [0, 1] }));
});

test("one change waiting has no Release all", async () => {
  fakeApi({ "GET changes": () => [grouped([op(0, "held", null, "Only waiting")], [])] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Only waiting")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Release all" })).toBeNull();
});
