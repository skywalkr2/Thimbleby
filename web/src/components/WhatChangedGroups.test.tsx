import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { besidePane, fakeApi, renderApp } from "../test-utils";
import { ChangeRow, WhatChanged } from "./WhatChanged";

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

/** A line of Today's queue that asks one held change. */
const todayLine = (key: string, index: number): S["QueueLineView"] => ({ key, group: "decide", kind: "held", count: 1, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {}, changeset: "CS-1", op: index });

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
  fakeApi({ "GET changes": () => [grouped(OPS, GROUPS)], "GET today/queue": () => [todayLine("held:CS-1:3", 3)] });
  renderApp(<WhatChanged />);
  const asides = (await screen.findByText("Asides")).closest("li")!;
  expect(within(asides).getByText("2 done")).toBeInTheDocument();
  const structure = screen.getByText("Structure").closest("li")!;
  expect(within(structure).getByText("1 done · 1 waits for you")).toBeInTheDocument();
  expect(screen.getByText("Looked at everything")).toBeInTheDocument(); // an op with no group keeps its own row
  expect(screen.queryByText("First aside")).toBeNull();
  expect(screen.queryByText("Closing chapter")).toBeNull();
  // The history has no Keep: where something waits, its row links to the line on Today that asks it.
  expect(within(asides).queryByRole("link", { name: "Answer on Today" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Keep" })).toBeNull();
  expect(await within(structure).findByRole("link", { name: "Answer on Today" })).toBeInTheDocument();
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

test("the history has no Release all, however many changes wait: each is answered on its line on Today", async () => {
  const waiting = [op(0, "held", null, "First waiting"), op(1, "held", null, "Second waiting")];
  fakeApi({ "GET changes": () => [grouped(waiting, [])], "GET today/queue": () => [todayLine("held:CS-1:0", 0), todayLine("held:CS-1:1", 1)] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("First waiting")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Release all" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Do it anyway" })).toBeNull();
  expect(await screen.findAllByRole("link", { name: "Answer on Today" })).toHaveLength(2);
});

// The same change opened from Today's review line keeps its buttons: that is where it is answered.
test("on Today's review line a group has Keep and the answer has Release all, each with one Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "POST changesets/CS-1/groups/1/keep": () => ({ released: [3], restored: [], declined: [], skipped: [] }),
    "POST changesets/CS-1/release-all": () => ({ released: [3, 5], restored: [], declined: [], skipped: [] }),
    "POST changesets/CS-1/undo": () => ({ restored: [3], skipped: [] }),
  });
  const ops = [...OPS, op(5, "held", null, "Another waiting")];
  renderApp(
    <ol>
      <ChangeRow item={grouped(ops, GROUPS)} reveal={0} open />
    </ol>,
  );
  const structure = (await screen.findByText("Structure")).closest("li")!;
  await user.click(within(structure).getByRole("button", { name: "Keep" }));
  await waitFor(() => expect(calls.map((c) => c.route)).toContain("POST changesets/CS-1/groups/1/keep"));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-1/undo")?.body).toEqual({ ops: [3] }));
  await user.click(await screen.findByRole("button", { name: "Release all" }));
  await waitFor(() => expect(calls.map((c) => c.route)).toContain("POST changesets/CS-1/release-all"));
});
