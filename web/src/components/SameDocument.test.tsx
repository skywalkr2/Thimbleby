import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { Handled } from "./Handled";
import { RecordPage } from "./RecordPage";
import { CurrentCopy } from "./SameDocument";

const REASON = "an older version; the current one is Plan v2.md";

const older = (extra: Partial<S["HandledRow"]> = {}): S["HandledRow"] => ({
  id: "REQ-a",
  version: 3,
  tab: "closed",
  kind: "other",
  item: "file",
  title: "Plan.md",
  sender: null,
  source: "Shared folder",
  received: "2026-10-10T09:00:00+00:00",
  reason: REASON,
  link: null,
  saved: "SRC-a",
  address: "",
  domain: null,
  section: "notices",
  request: "REQ-a",
  rule: "Older version",
  change: "changed",
  older_version: true,
  ...extra,
});

const CLOSED = (row: S["HandledRow"]): S["HandledView"] => ({
  tab: "closed",
  group: "reason",
  query: "",
  item: null,
  kept_days: 30,
  page_rows: 25,
  counts: { set_aside: 0, closed: 1, read: 0 },
  kinds: [{ item: "file", count: 1 }],
  groups: [{ key: REASON, label: REASON, count: 1, items: [row] }],
});

const NO_CLOSES: S["SilentClosesView"] = {
  count: 0,
  closes: [],
  measure: { days: 14, since: "2026-10-12T00:00:00+00:00", until: "2026-10-26T00:00:00+00:00", total: 0, silent: 0, by_person: 0, approved: 0, rate: null, kinds: [] },
};

const VIEW: S["VersionsView"] = {
  applicable: true,
  file: "Plan.md",
  others: [
    { key: "Costs.md", title: "Costs.md" },
    { key: "Plan v2.md", title: "Plan v2.md" },
  ],
  can_split: true,
  family: [{ key: "Plan v2.md", title: "Plan v2.md" }],
};

const CHOSEN: S["VersionChosen"] = {
  changes: [{ key: "watch.versions.not_same", before: {}, after: { shared: ["Plan.md"] }, was_default: true, is_default: false }],
  request: "REQ-a",
};

function open(extra: Routes = {}, row: S["HandledRow"] = older()) {
  const calls = fakeApi({
    "GET handled?tab=set_aside&q=": () => ({ ...CLOSED(row), tab: "set_aside", groups: [] }),
    "GET handled?tab=closed&q=": () => CLOSED(row),
    "GET silent-closes": () => NO_CLOSES,
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    "GET versions/SRC-a": () => VIEW,
    ...extra,
  });
  renderApp(<Handled />);
  return calls;
}

const body = (calls: ReturnType<typeof fakeApi>, route: string) => calls.find((c) => c.route === route)?.body;

async function menuOfRow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Closed by a rule · 1" }));
  const header = await screen.findByRole("button", { name: new RegExp(`^${REASON} · 1$`) });
  if (header.getAttribute("aria-expanded") === "false") await user.click(header);
  const row = within(header.closest("section") as HTMLElement).getByRole("listitem");
  await user.click(within(row).getByRole("button", { name: "More actions for Plan.md" }));
  return row;
}

test("an older-version row offers Same document as and Not the same document in its menu", async () => {
  const user = userEvent.setup();
  open();
  await menuOfRow(user);
  expect(await screen.findByRole("menuitem", { name: "Same document as…" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Not the same document" })).toBeInTheDocument();
});

test("Not the same document hands the change in after all, says so, and Undo puts everything back", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST versions/SRC-a/apart": () => CHOSEN,
    "POST versions/undo": () => ({ changes: [] }),
  });
  await menuOfRow(user);
  await user.click(await screen.findByRole("menuitem", { name: "Not the same document" }));
  await waitFor(() => expect(body(calls, "POST versions/SRC-a/apart")).toEqual({ request: "REQ-a", read_version: 3 }));
  expect(await screen.findByText("Plan.md is a document of its own now.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(body(calls, "POST versions/undo")).toEqual({ changes: CHOSEN.changes, request: "REQ-a", asked: null }));
});

test("Same document as lists the files of the folder, links the one chosen, and Undo takes it back", async () => {
  const user = userEvent.setup();
  const linked: S["VersionChosen"] = { changes: [{ key: "watch.versions.same_document", before: [], after: [{ source: "shared", files: ["Costs.md", "Plan.md"] }], was_default: true, is_default: false }] };
  const calls = open({ "POST versions/SRC-a/same": () => linked, "POST versions/undo": () => ({ changes: [] }) });
  await menuOfRow(user);
  await user.click(await screen.findByRole("menuitem", { name: "Same document as…" }));
  const pick = await screen.findByRole("combobox", { name: "Which file is it the same document as?" });
  expect(pick).toHaveFocus();
  expect(within(pick).getAllByRole("option").map((o) => o.textContent)).toEqual(["Choose a file", "Costs.md", "Plan v2.md"]);
  const go = screen.getByRole("button", { name: "They are the same document" });
  expect(go).toBeDisabled();
  await user.selectOptions(pick, "Costs.md");
  await user.click(go);
  await waitFor(() => expect(body(calls, "POST versions/SRC-a/same")).toEqual({ other: "Costs.md" }));
  expect(await screen.findByText("Plan.md and Costs.md are now one document. Only the newest copy is read.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(body(calls, "POST versions/undo")).toEqual({ changes: linked.changes, request: null, asked: null }));
});

test("a file that is not in a watched folder offers neither choice", async () => {
  const user = userEvent.setup();
  open({ "GET versions/SRC-a": () => ({ applicable: false }) });
  await user.click(await screen.findByRole("button", { name: "Closed by a rule · 1" }));
  const header = await screen.findByRole("button", { name: new RegExp(`^${REASON} · 1$`) });
  await user.click(header);
  await user.click(await screen.findByRole("button", { name: "More actions for Plan.md" }));
  expect(screen.queryByRole("menuitem", { name: "Same document as…" })).not.toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Not the same document" })).not.toBeInTheDocument();
});

test("a closed row of a rule other than the older-version rule splits without handing anything in", async () => {
  const user = userEvent.setup();
  const calls = open({ "POST versions/SRC-a/apart": () => ({ changes: CHOSEN.changes }) }, older({ older_version: false, rule: "Spacing" }));
  await menuOfRow(user);
  await user.click(await screen.findByRole("menuitem", { name: "Not the same document" }));
  await waitFor(() => expect(body(calls, "POST versions/SRC-a/apart")).toEqual({ request: null, read_version: null }));
});

test("the question about which copy is current lists the copies, and the answer can be undone", async () => {
  const user = userEvent.setup();
  const made: S["VersionChosen"] = { changes: [{ key: "watch.versions.current", before: {}, after: { shared: ["Plan.md"] }, was_default: true, is_default: false }], asked: "Q-1" };
  const calls = fakeApi({ "POST versions/answer/Q-1": () => made, "POST versions/undo": () => ({ changes: [] }) });
  renderApp(
    <CurrentCopy
      question="Q-1"
      copies={[
        { id: "Plan DRAFT.md", name: "Plan DRAFT.md" },
        { id: "Plan.md", name: "Plan.md" },
      ]}
    />,
  );
  const go = screen.getByRole("button", { name: "This is the current copy" });
  expect(go).toBeDisabled();
  await user.selectOptions(screen.getByRole("combobox", { name: "Which copy is the current one?" }), "Plan.md");
  await user.click(go);
  await waitFor(() => expect(body(calls, "POST versions/answer/Q-1")).toEqual({ file: "Plan.md" }));
  expect(await screen.findByText("Plan.md is the current copy. The others are older versions.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(body(calls, "POST versions/undo")).toEqual({ changes: made.changes, request: null, asked: "Q-1" }));
});

test("a watched file's own page offers the same choices, and linking acts at once with Undo", async () => {
  const user = userEvent.setup();
  const linked: S["VersionChosen"] = { changes: [{ key: "watch.versions.same_document", before: [], after: [], was_default: true, is_default: false }] };
  const calls = fakeApi({
    "GET record?kind=source&id=SRC-a": () => ({ kind: "source", id: "SRC-a", version: 2, fields: { id: "SRC-a", title: "Plan.md" }, long_text: [] }),
    "GET kinds/source": () => ({ kind: "source", fields: [] }),
    "GET record-pages/SRC-a?kind=source": () => ({ kind: "source", id: "SRC-a", version: 2, name: "Plan.md", details: [], open_actions: [], open_questions: [], completed_actions: [], fact_source: null, activity: [] }),
    "GET people": () => [],
    "GET projects": () => [],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    "GET plugin-actions?kind=source&id=SRC-a": () => [],
    "GET task-kinds?kind=source&id=SRC-a": () => [],
    "GET versions/SRC-a": () => VIEW,
    "POST versions/SRC-a/same": () => linked,
    "POST versions/undo": () => ({ changes: [] }),
  });
  renderApp(<RecordPage kind="source" id="SRC-a" onBack={() => {}} />);
  await user.click(await screen.findByRole("button", { name: "More actions for Plan.md" }));
  await user.click(await screen.findByRole("menuitem", { name: "Same document as…" }));
  await user.selectOptions(await screen.findByRole("combobox", { name: "Which file is it the same document as?" }), "Plan v2.md");
  await user.click(screen.getByRole("button", { name: "They are the same document" }));
  await waitFor(() => expect(body(calls, "POST versions/SRC-a/same")).toEqual({ other: "Plan v2.md" }));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST versions/undo")).toBe(true));
});
