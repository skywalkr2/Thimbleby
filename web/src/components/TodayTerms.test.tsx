import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { forgetLine } from "../lib/today";
import { fakeApi, renderApp, statusFixture, type Routes } from "../test-utils";
import { Today } from "./Today";

// Two lines that gather many things into one: the questions about words, and a project ending read from an input.

type Line = S["QueueLineView"];

const line = (kind: Line["kind"], group: Line["group"], over: Partial<Line> = {}): Line => ({
  key: `${kind}:1`,
  group,
  kind,
  count: 1,
  untrusted: false,
  unpriced: 0,
  actions: [],
  questions: [],
  outcome: {},
  ...over,
});

const word = (id: string, term: string): S["FollowupQuestion"] => ({
  id,
  title: `What does ${term} mean here?`,
  text: "",
  links: [],
  kind: "question",
  status: "open",
  sent: null,
  waiting_days: null,
  chase_due: false,
  chases: 0,
  about: null,
  options: [],
});
const mine: S["FollowupSection"] = {
  person: "PER-1",
  name: "Pat Example",
  is_pm: true,
  questions: [word("Q-1", "AAA"), word("Q-2", "BBB"), word("Q-3", "CCC")],
  actions: [],
  message: "",
  to_send: 0,
};

function show(lines: Line[], extra: Routes = {}) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  const calls = fakeApi({
    "GET today/queue": () => lines,
    "GET changes": () => [],
    "GET followups": () => [mine],
    "GET plugin-today": () => [],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET stages/requests": () => [],
    "GET today/agenda": () => [],
    "GET today/todo": () => [],
    "GET today/arrived": () => ({ items: [], left_out: 0, set_aside: 0 }),
    "GET watch": () => [],
    "GET projects": () => [],
    "GET people": () => [],
    "GET status": () => statusFixture({}, { assistant: { last_run_at: "2026-10-20T08:00:00Z" } }),
    "GET runtime-config": () => ({ instance: null }),
    ...extra,
  });
  renderApp(
    <RestartProvider hellos={1}>
      <Today workspace="Workspace" onView={vi.fn()} onAddSource={vi.fn()} onOpenGuide={vi.fn()} onOpenRecord={vi.fn()} shortcuts={{ next: "j", previous: "k" }} />
    </RestartProvider>,
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgetLine();
});

const row = (kind: string) => document.querySelector<HTMLElement>(`[data-queue-line="${kind}"]`)!;

test("the day's questions about words are one line that opens them together", async () => {
  const user = userEvent.setup();
  show([line("terms", "review", { key: "terms", count: 3, questions: ["Q-1", "Q-2", "Q-3"] })]);
  expect(await screen.findByText("Answer 3 questions about words")).toBeInTheDocument();
  expect(document.querySelectorAll('[data-queue-line="terms"]')).toHaveLength(1);
  // The questions are not lines of their own.
  expect(screen.queryByText("What does AAA mean here?")).not.toBeInTheDocument();
  await user.click(within(row("terms")).getByRole("button", { name: "Answer" }));
  for (const term of ["AAA", "BBB", "CCC"]) expect(await screen.findByText(`What does ${term} mean here?`)).toBeInTheDocument();
});

test("one question about a word is the same line, in the singular", async () => {
  show([line("terms", "review", { key: "terms", count: 1, questions: ["Q-1"] })]);
  expect(await screen.findByText("Answer 1 question about a word")).toBeInTheDocument();
});

const ending = line("project_ending", "decide", { key: "ending:CS-1:4", count: 2, subject: "Spring book", project: "PRJ-1", changeset: "CS-1", op: 4, actions: ["ACT-1"], questions: ["Q-9"] });
const endingView: S["ProjectEndingView"] = {
  project: "PRJ-1",
  project_name: "Spring book",
  index: 4,
  items: [
    { index: 5, kind: "action", id: "ACT-1", text: "Send the proof" },
    { index: 6, kind: "question", id: "Q-9", text: "Which printer?" },
  ],
  left_open: [{ kind: "pk/risk", kind_label: "risk", id: "RSK-1", title: "Late paper" }],
};

test("a waiting project ending is one line saying what goes with it", async () => {
  show([ending]);
  expect(await screen.findByText("Confirm that Spring book has ended; 2 open items go with it")).toBeInTheDocument();
  expect(document.querySelectorAll('[data-queue-line="project_ending"]')).toHaveLength(1);
});

test("ticking items keeps them in one action, the rest drop with the ending, and one Undo takes it back", async () => {
  const user = userEvent.setup();
  const calls = show([ending], {
    "GET changesets/CS-1/ops/4/project-ending": () => endingView,
    "POST changesets/CS-1/ops/4/project-ending": () => ({ ok: "CS-1" }),
    "POST changesets/CS-1/undo": () => ({ restored: [0], skipped: [] }),
  });
  await user.click(await screen.findByRole("button", { name: "Look over" }));
  expect(await screen.findByText("Left open: the add-on that made these closes them")).toBeInTheDocument();
  expect(screen.getByText("Late paper")).toBeInTheDocument();
  // With nothing ticked, the button ends the project and drops everything.
  expect(screen.getByRole("button", { name: "End Spring book and drop these" })).toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: "Send the proof" }));
  await user.click(screen.getByRole("checkbox", { name: "Which printer?" }));
  await user.click(screen.getByRole("button", { name: "End Spring book, keeping 2 items" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-1/ops/4/project-ending")?.body).toEqual({ end: true, keep: [5, 6] }));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-1/undo")).toBe(true));
});

test("Keep all of them ticks every item at once", async () => {
  const user = userEvent.setup();
  show([ending], { "GET changesets/CS-1/ops/4/project-ending": () => endingView });
  await user.click(await screen.findByRole("button", { name: "Look over" }));
  await user.click(await screen.findByRole("checkbox", { name: "Keep all of them" }));
  expect(screen.getByRole("checkbox", { name: "Send the proof" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Which printer?" })).toBeChecked();
});

test("keeping the project as it is declines the ending and its items, and Undo asks for each back", async () => {
  const user = userEvent.setup();
  const calls = show([ending], {
    "GET changesets/CS-1/ops/4/project-ending": () => endingView,
    "POST changesets/CS-1/ops/4/project-ending": () => ({ ok: "CS-1" }),
    "POST changesets/CS-1/ops/4/undecline": () => ({ ok: "CS-1" }),
    "POST changesets/CS-1/ops/5/undecline": () => ({ ok: "CS-1" }),
    "POST changesets/CS-1/ops/6/undecline": () => ({ ok: "CS-1" }),
  });
  await user.click(await screen.findByRole("button", { name: "Look over" }));
  await user.click(await screen.findByRole("button", { name: "Keep the project as it is" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-1/ops/4/project-ending")?.body).toEqual({ end: false, keep: [] }));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route.endsWith("/undecline")).map((c) => c.route)).toEqual(["POST changesets/CS-1/ops/4/undecline", "POST changesets/CS-1/ops/5/undecline", "POST changesets/CS-1/ops/6/undecline"]));
});

test("an add-on's own item is listed with the others and kept like them", async () => {
  const user = userEvent.setup();
  const withPack: S["ProjectEndingView"] = {
    ...endingView,
    items: [...endingView.items, { index: 7, kind: "other", id: "RSK-2", text: "Close the risk 'Late paper'" }],
    left_open: [],
  };
  const calls = show([ending], {
    "GET changesets/CS-1/ops/4/project-ending": () => withPack,
    "POST changesets/CS-1/ops/4/project-ending": () => ({ ok: "CS-1" }),
  });
  await user.click(await screen.findByRole("button", { name: "Look over" }));
  const item = await screen.findByRole("checkbox", { name: "Close the risk 'Late paper'" });
  expect(screen.getByText("Add-on")).toBeInTheDocument();
  await user.click(item);
  await user.click(screen.getByRole("button", { name: "End Spring book, keeping 1 item" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-1/ops/4/project-ending")?.body).toEqual({ end: true, keep: [7] }));
});
