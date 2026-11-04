import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { groupChanges } from "../lib/change-groups";
import { besidePane, fakeApi, renderApp } from "../test-utils";
import { WhatChanged } from "./WhatChanged";

// What changed groups its rows (design 7.13): what needs the person first, then what is with the assistant, then the rest under
// the day it was handed in; rows that read the same are one run with their count; the state is a dot and a word only when it is
// not ordinary; and the counts of the groups are the numbers of rows.
beforeEach(() => besidePane());
afterEach(() => vi.unstubAllGlobals());

const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

function item(id: string, over: Partial<S["ChangeItem"]> = {}): S["ChangeItem"] {
  return {
    id,
    version: 1,
    dismissed: false,
    stage_task: false,
    first_go: false,
    refused: false,
    state: "done",
    waiting: null,
    created_at: ago(0),
    note: null,
    source: null,
    source_title: `Note ${id}`,
    changeset: null,
    ...over,
  };
}

const rowsOf = () => screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-row") && !li.closest("aside"));

test("the groups are what needs you, what is with the assistant, then the days, newest first", () => {
  const groups = groupChanges(
    [item("a", { state: "done", created_at: ago(60) }), item("b", { state: "queued" }), item("c", { state: "needs_you" }), item("d", { state: "done", created_at: ago(1) }), item("e", { state: "failed" })],
    (c) => c.source_title ?? "",
    (c) => c.state,
  );
  expect(groups.map((g) => [g.kind, g.runs.map((r) => r.head.id)])).toEqual([
    ["needs", ["c", "e"]],
    ["with", ["b"]],
    ["day", ["d"]],
    ["day", ["a"]],
  ]);
});

test("rows that read the same side by side are one run with the others behind it", () => {
  const same = (id: string) => item(id, { source_title: "Sorted the inbox" });
  const groups = groupChanges([same("a"), same("b"), item("c", { source_title: "Another" }), same("d")], (c) => c.source_title ?? "", (c) => c.state);
  const runs = groups[0].runs;
  expect(runs.map((r) => [r.head.id, r.same.map((c) => c.id)])).toEqual([
    ["a", ["b"]],
    ["c", []],
    ["d", []],
  ]);
});

test("a row that holds something to look at is never folded into a run", () => {
  const held = item("b", { source_title: "Sorted the inbox", note: "my note" });
  const groups = groupChanges([item("a", { source_title: "Sorted the inbox" }), held], (c) => c.source_title ?? "", (c) => c.state);
  expect(groups[0].runs.map((r) => r.head.id)).toEqual(["a", "b"]);
});

test("Needs you leads, a row in it has no chip, and the rest of the list has a heading for the day or the assistant", async () => {
  fakeApi({
    "GET changes": () => [
      item("w", { state: "queued", source_title: "Waiting thing" }),
      item("d", { state: "done", source_title: "Done today" }),
      item("o", { state: "done", source_title: "Done long ago", created_at: ago(24 * 9) }),
      item("n", { state: "needs_you", source_title: "Stopped thing", waiting: "Say who you are first" }),
    ],
  });
  renderApp(<WhatChanged />);
  await screen.findByText("Stopped thing");
  const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
  expect(headings[0]).toMatch(/^Needs you/);
  expect(headings[1]).toMatch(/^With /);
  expect(headings[2]).toMatch(/^Today/);
  // The order of the rows is the order of the groups.
  expect(rowsOf().map((li) => li.textContent?.match(/Stopped thing|Waiting thing|Done today|Done long ago/)?.[0])).toEqual(["Stopped thing", "Waiting thing", "Done today", "Done long ago"]);
  // A routine state (with the assistant, done, waiting for you) is said by its group, not by a chip on each row.
  const waiting = screen.getByRole("listitem", { name: "Waiting thing" });
  expect(within(waiting).queryByText(/^With /)).toBeNull();
  expect(waiting).toHaveTextContent("Handed in");
  expect(waiting).not.toHaveTextContent("is on it");
  // The reason a row stopped is in its meta line, not "see why below".
  expect(screen.getByRole("listitem", { name: "Stopped thing" })).toHaveTextContent("Say who you are first");
  expect(document.body).not.toHaveTextContent("see why below");
});

test("the count of a group is the number of its rows, and a run says ×N with the rest behind Show more like this", async () => {
  const user = userEvent.setup();
  const same = (id: string) => item(id, { state: "needs_you", source_title: "Stopped thing", waiting: "Say who you are first" });
  fakeApi({ "GET changes": () => [same("a"), same("b"), same("c"), item("z", { state: "queued", source_title: "Waiting thing" })] });
  renderApp(<WhatChanged />);
  await screen.findAllByText("Stopped thing");
  expect(rowsOf()).toHaveLength(2);
  const needs = screen.getByRole("heading", { level: 3, name: /^Needs you/ });
  // The count in the label is drawn for the eye and says the number of rows the group holds, folded ones included.
  expect(needs.querySelector("[data-group-count]")?.textContent).toBe("3");
  const head = screen.getAllByRole("listitem", { name: "Stopped thing" })[0];
  expect(head).toHaveTextContent("×3");
  await user.click(screen.getByRole("button", { name: "Show 2 more like this" }));
  expect(rowsOf()).toHaveLength(4);
  expect(screen.getAllByRole("listitem", { name: "Stopped thing" })).toHaveLength(3);
  await user.click(screen.getByRole("button", { name: "Show fewer" }));
  expect(rowsOf()).toHaveLength(2);
});

test("a group draws its first rows and a button for the rest, so a hundred rows are not a wall", async () => {
  const user = userEvent.setup();
  const many = Array.from({ length: 120 }, (_, i) => item(`r${i}`, { state: "done", source_title: `Different ${i}`, created_at: new Date(Date.now() - i * 1000).toISOString() }));
  fakeApi({ "GET changes": () => many });
  renderApp(<WhatChanged />);
  await screen.findByText("Different 0");
  expect(rowsOf()).toHaveLength(25);
  await user.click(screen.getByRole("button", { name: "Show 95 more" }));
  expect(rowsOf()).toHaveLength(120);
});

test("what waits on Today and what was handled are one line of links, and the held-for-restart reason is in plain words", async () => {
  fakeApi({
    "GET changes": () => [item("q", { state: "queued", source_title: "Held thing", waiting: "Settings changed since the app started; restart it to use them." })],
    "GET handled/counts": () => ({ set_aside: 1, read: 1, today: 0, total: 2 }),
    "GET today/queue": () => [],
  });
  renderApp(<WhatChanged />);
  await screen.findByText("Held thing");
  expect(await screen.findByRole("link", { name: "2 handled for you" })).toBeInTheDocument();
  expect(document.querySelectorAll("[data-changes-summary]")).toHaveLength(1);
  expect(document.body.textContent).not.toMatch(/cockpit|code changed/i);
});
