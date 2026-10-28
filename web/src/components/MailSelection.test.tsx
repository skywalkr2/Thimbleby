import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { actFixture } from "../lib/acts-fixtures";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { Handled } from "./Handled";

// Several saved messages at once (design 6.12, S1b-2): messages ticked in Handled for you's list are archived, moved, labeled or
// marked read together. Each is its own act in one change; the panel shows each exactly and the person's one yes approves and sends
// every one. Nothing is done before it, and Take them back undoes the drafts.

const row = (id: string, over: Partial<S["HandledRow"]> = {}): S["HandledRow"] => ({
  id: `REQ-${id}`,
  version: 1,
  tab: "read",
  kind: "other",
  title: `Subject ${id}`,
  sender: `Sender ${id}`,
  source: "Inbox",
  received: "2026-10-11T08:30:00+00:00",
  reason: null,
  link: null,
  saved: `SRC-${id}`,
  address: "",
  domain: null,
  section: "notices",
  request: `REQ-${id}`,
  item: "mail",
  rule: null,
  change: null,
  older_version: false,
  ...over,
});

const READ: S["HandledView"] = {
  tab: "read",
  group: "kind",
  query: "",
  item: null,
  kept_days: 30,
  page_rows: 25,
  counts: { set_aside: 0, read: 3 },
  kinds: [{ item: "mail", count: 3 }],
  groups: [{ key: "kind:other", label: null, count: 3, items: [row("a"), row("b"), row("c", { saved: null })] }],
};

const NO_CLOSES: S["SilentClosesView"] = {
  count: 0,
  closes: [],
  measure: { days: 14, since: "2026-10-12T00:00:00+00:00", until: "2026-10-26T00:00:00+00:00", total: 0, silent: 0, by_person: 0, approved: 0, rate: null, kinds: [] },
};

const about = (id: string, n: string) => ({ id, kind: "message" as const, title: `Subject ${n}`, sender: `Sender ${n}`, when: "2026-10-11", end: null });
const draftOf = (id: string, rec: string, n: string, action: string, over: Partial<S["ActView"]> = {}) =>
  actFixture({ id, kind: "mailbox", action, parts: {}, recipients: [], about: [about(rec, n)], fingerprint: `fp-${id}`, channel_label: "Mailbox", ...over });

function open(extra: Routes = {}, view: S["HandledView"] = READ) {
  const calls = fakeApi({
    "GET handled?tab=read&q=": () => view,
    "GET handled?tab=set_aside&q=": () => ({ ...view, tab: "set_aside", groups: [] }),
    "GET silent-closes": () => NO_CLOSES,
    ...extra,
  });
  renderApp(<Handled />);
  return calls;
}
const posts = (calls: ReturnType<typeof fakeApi>, route: string) => calls.filter((c) => c.route === route);

async function tick(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  await user.click(await screen.findByRole("radio", { name: /Read, nothing to do/ }));
  const header = await screen.findByRole("button", { name: /^Other mail · 3/ });
  if (header.getAttribute("aria-expanded") === "false") await user.click(header);
  for (const n of names) await user.click(await screen.findByRole("checkbox", { name: `Select ${n}` }));
}

test("a saved mail has a box to tick, and a mail that isn't saved has none", async () => {
  const user = userEvent.setup();
  open();
  await tick(user, []);
  expect(await screen.findByRole("checkbox", { name: "Select Subject a" })).not.toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Select Subject b" })).toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: "Select Subject c" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Selected mail" })).toBeNull();
});

test("ticking shows how many are selected with the four changes, and Clear selection empties it", async () => {
  const user = userEvent.setup();
  open();
  await tick(user, ["Subject a"]);
  const bar = await screen.findByRole("region", { name: "Selected mail" });
  expect(within(bar).getByText("1 message selected")).toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: "Select Subject b" }));
  expect(within(bar).getByText("2 messages selected")).toBeInTheDocument();
  expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["Archive", "Mark as read", "Move to…", "Label…", "Clear selection"]);
  await user.click(within(bar).getByRole("button", { name: "Clear selection" }));
  expect(screen.queryByRole("region", { name: "Selected mail" })).toBeNull();
  expect(screen.getByRole("checkbox", { name: "Select Subject a" })).not.toBeChecked();
});

test("Archive drafts one act for each message and shows each exactly, with nothing done until the one yes", async () => {
  const user = userEvent.setup();
  const drafted: S["ActBatchView"] = {
    acts: [draftOf("XACT-1", "SRC-a", "a", "archive"), draftOf("XACT-2", "SRC-b", "b", "archive")],
    skipped: [],
    changeset: "CS-9",
  };
  const calls = open({ "POST acts/batch": () => drafted });
  await tick(user, ["Subject a", "Subject b"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Archive" }));
  const panel = await screen.findByRole("group", { name: "Your yes on each of these" });
  expect(within(panel).getByRole("heading", { name: "Archive 2 messages" })).toBeInTheDocument();
  const lines = within(panel).getAllByRole("listitem").map((li) => li.textContent ?? "");
  expect(lines).toHaveLength(2);
  expect(lines[0]).toContain("Sender a");
  expect(lines[0]).toContain("Subject a");
  expect(lines[1]).toContain("Sender b");
  expect(lines[1]).toContain("Subject b");
  expect(posts(calls, "POST acts/batch")[0].body).toEqual({ action: "archive", about: ["SRC-a", "SRC-b"] });
  expect(posts(calls, "POST acts/batch/send")).toHaveLength(0);
  expect(within(panel).getByRole("button", { name: "Approve and send all 2" })).toBeEnabled();
});

test("the one yes approves each act on the fingerprint shown, says how many went, and Undo takes back each sent one", async () => {
  const user = userEvent.setup();
  const drafted: S["ActBatchView"] = {
    acts: [draftOf("XACT-1", "SRC-a", "a", "archive"), draftOf("XACT-2", "SRC-b", "b", "archive")],
    skipped: [],
    changeset: "CS-9",
  };
  const calls = open({
    "POST acts/batch": () => drafted,
    "POST acts/batch/send": () => ({
      results: [
        { id: "XACT-1", status: "sent", reason: null, changeset: "CS-10" },
        { id: "XACT-2", status: "failed", reason: "The service was down.", changeset: "CS-11" },
      ],
    }),
    "GET acts/XACT-1": () => draftOf("XACT-1", "SRC-a", "a", "archive", { status: "sent", undoable: true }),
    "POST acts/XACT-1/undo": () => ({ id: "XACT-1", status: "undone", reason: null, changeset: null }),
  });
  await tick(user, ["Subject a", "Subject b"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Archive" }));
  await user.click(await screen.findByRole("button", { name: "Approve and send all 2" }));
  await waitFor(() => expect(posts(calls, "POST acts/batch/send")).toHaveLength(1));
  expect(posts(calls, "POST acts/batch/send")[0].body).toEqual({
    acts: [
      { id: "XACT-1", fingerprint: "fp-XACT-1", acknowledged: [] },
      { id: "XACT-2", fingerprint: "fp-XACT-2", acknowledged: [] },
    ],
  });
  expect(await screen.findByText(/Done for 1 message\. 1 didn't go: The service was down\./)).toBeInTheDocument();
  // The selection is cleared once the yes is given.
  await waitFor(() => expect(screen.queryByRole("region", { name: "Selected mail" })).toBeNull());
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(posts(calls, "POST acts/XACT-1/undo")).toHaveLength(1));
  expect(posts(calls, "POST acts/XACT-2/undo")).toHaveLength(0);
});

test("Take them back undoes the drafts in one change and sends nothing", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST acts/batch": () => ({ acts: [draftOf("XACT-1", "SRC-a", "a", "mark_read")], skipped: [], changeset: "CS-9" }),
    "POST changesets/CS-9/undo": () => ({ restored: 1, skipped: [] }),
  });
  await tick(user, ["Subject a"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Mark as read" }));
  expect(await screen.findByRole("heading", { name: "Mark 1 message as read" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Take them back" }));
  await waitFor(() => expect(posts(calls, "POST changesets/CS-9/undo")).toHaveLength(1));
  expect(posts(calls, "POST acts/batch/send")).toHaveLength(0);
  await waitFor(() => expect(screen.queryByRole("group", { name: "Your yes on each of these" })).toBeNull());
});

test("a message nothing was drafted for is named with why, never left out silently", async () => {
  const user = userEvent.setup();
  open({
    "POST acts/batch": () => ({
      acts: [draftOf("XACT-1", "SRC-a", "a", "archive")],
      skipped: [
        { record: "SRC-b", title: "Subject b", why: "acting_off", account_label: "Home mail" },
        { record: "SRC-x", title: "", why: "gone" },
      ],
      changeset: "CS-9",
    }),
  });
  await tick(user, ["Subject a", "Subject b"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Archive" }));
  const panel = await screen.findByRole("group", { name: "Your yes on each of these" });
  expect(within(panel).getByText("Subject b: Home mail isn't switched on for acting. Turn it on in Settings.")).toBeInTheDocument();
  expect(within(panel).getByText("A message: it isn't saved any more.")).toBeInTheDocument();
  expect(within(panel).getByRole("button", { name: "Approve and send" })).toBeInTheDocument();
});

test("when nothing could be drafted the panel says so and has no yes to give", async () => {
  const user = userEvent.setup();
  open({ "POST acts/batch": () => ({ acts: [], skipped: [{ record: "SRC-a", title: "Subject a", why: "no_account", account_label: null }], changeset: null }) });
  await tick(user, ["Subject a"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Archive" }));
  expect(await screen.findByRole("heading", { name: "Nothing could be drafted for what you selected." })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Approve and send/ })).toBeNull();
});

test("Move to picks from the one account's own folders and drafts the move for each message", async () => {
  const user = userEvent.setup();
  const calls = open({
    "GET acts/batch-options?record=SRC-a&record=SRC-b": () => ({ account: "mailbox:work", account_label: "Work mail", several_accounts: false, folder_source: "work", folders_listed: true }),
    "GET watch/work/folders": () => ({ folders: ["Inbox", "Projects"], sent: null, taken: [] }),
    "POST acts/batch": () => ({ acts: [draftOf("XACT-1", "SRC-a", "a", "move", { folder: "Projects" })], skipped: [], changeset: "CS-9" }),
  });
  await tick(user, ["Subject a", "Subject b"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Move to…" }));
  const folder = await screen.findByRole("combobox", { name: "Move to folder" });
  await waitFor(() => expect(within(folder).getAllByRole("option").map((o) => o.textContent)).toEqual(["Choose a folder", "Inbox", "Projects"]));
  await user.selectOptions(folder, "Projects");
  await user.click(screen.getByRole("button", { name: "Draft the move" }));
  expect(await screen.findByRole("heading", { name: "Move 1 message to Projects" })).toBeInTheDocument();
  expect(posts(calls, "POST acts/batch")[0].body).toEqual({ action: "move", about: ["SRC-a", "SRC-b"], folder: "Projects" });
});

test("Move to for a signed-in account that can't list its folders says so plainly and takes the folder's name", async () => {
  const user = userEvent.setup();
  const calls = open({
    "GET acts/batch-options?record=SRC-a": () => ({ account: "demo-service:pat@example.com", account_label: "Demo service (pat@example.com)", several_accounts: false, folder_source: null, folders_listed: false }),
    "POST acts/batch": () => ({ acts: [draftOf("XACT-1", "SRC-a", "a", "move", { folder: "Receipts" })], skipped: [], changeset: "CS-9" }),
  });
  await tick(user, ["Subject a"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Move to…" }));
  expect(await screen.findByText("Demo service (pat@example.com) doesn't list its folders. Type the folder's name exactly as it is called there.")).toBeInTheDocument();
  expect(screen.queryByRole("combobox")).toBeNull();
  await user.type(screen.getByRole("textbox", { name: "Name of the folder" }), "Receipts");
  await user.click(screen.getByRole("button", { name: "Draft the move" }));
  await waitFor(() => expect(posts(calls, "POST acts/batch")).toHaveLength(1));
  expect(posts(calls, "POST acts/batch")[0].body).toEqual({ action: "move", about: ["SRC-a"], folder: "Receipts" });
});

const CHANNEL_ACCOUNT = "demo-service:pat@example.com";
const channelBatch = (): S["ActBatchOptionsView"] => ({ account: CHANNEL_ACCOUNT, account_label: "Demo service (pat@example.com)", several_accounts: false, folder_source: null, folders_listed: true, folders_account: CHANNEL_ACCOUNT });
const channelRoute = `GET acts/accounts/${encodeURIComponent(CHANNEL_ACCOUNT)}/folders`;

test("Move to for an account whose channel lists its folders picks a folder and drafts the move with its id, and the panel names it", async () => {
  const user = userEvent.setup();
  const calls = open({
    "GET acts/batch-options?record=SRC-a&record=SRC-b": channelBatch,
    [channelRoute]: () => ({ listed: true, reason: null, folders: [{ id: "fld-1", name: "Projects/Archive", kind: "folder" }, { id: "lbl-1", name: "Waiting", kind: "label" }] }),
    "POST acts/batch": () => ({ acts: [draftOf("XACT-1", "SRC-a", "a", "move", { folder: "fld-1", folder_name: "Projects/Archive" })], skipped: [], changeset: "CS-9" }),
  });
  await tick(user, ["Subject a", "Subject b"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Move to…" }));
  const folder = await screen.findByRole("combobox", { name: "Move to folder" });
  expect(within(folder).getAllByRole("option").map((o) => o.textContent)).toEqual(["Choose a folder", "Projects/Archive"]);
  await user.selectOptions(folder, "Projects/Archive");
  await user.click(screen.getByRole("button", { name: "Draft the move" }));
  expect(await screen.findByRole("heading", { name: "Move 1 message to Projects/Archive" })).toBeInTheDocument();
  expect(posts(calls, "POST acts/batch")[0].body).toEqual({ action: "move", about: ["SRC-a", "SRC-b"], folder: "fld-1" });
});

test("Label for an account whose channel lists its labels picks a label and drafts the label with its id", async () => {
  const user = userEvent.setup();
  const calls = open({
    "GET acts/batch-options?record=SRC-a": channelBatch,
    [channelRoute]: () => ({ listed: true, reason: null, folders: [{ id: "fld-1", name: "Projects/Archive", kind: "folder" }, { id: "lbl-1", name: "Waiting", kind: "label" }] }),
    "POST acts/batch": () => ({ acts: [draftOf("XACT-1", "SRC-a", "a", "label", { label: "lbl-1", label_name: "Waiting" })], skipped: [], changeset: "CS-9" }),
  });
  await tick(user, ["Subject a"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Label…" }));
  const label = await screen.findByRole("combobox", { name: "Label" });
  expect(within(label).getAllByRole("option").map((o) => o.textContent)).toEqual(["Choose a label", "Waiting"]);
  await user.selectOptions(label, "Waiting");
  await user.click(screen.getByRole("button", { name: "Draft the label" }));
  expect(await screen.findByRole("heading", { name: "Label 1 message Waiting" })).toBeInTheDocument();
  expect(posts(calls, "POST acts/batch")[0].body).toEqual({ action: "label", about: ["SRC-a"], label: "lbl-1" });
});

test("when the channel couldn't list, a selection says why and takes the folder's name typed", async () => {
  const user = userEvent.setup();
  const calls = open({
    "GET acts/batch-options?record=SRC-a": channelBatch,
    [channelRoute]: () => ({ listed: true, folders: [], reason: "offline" }),
    "POST acts/batch": () => ({ acts: [draftOf("XACT-1", "SRC-a", "a", "move", { folder: "Receipts" })], skipped: [], changeset: "CS-9" }),
  });
  await tick(user, ["Subject a"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Move to…" }));
  expect(await screen.findByText("You are offline, so the folders and labels of Demo service (pat@example.com) can't be shown. Type the name exactly as it is called there.")).toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Name of the folder" }), "Receipts");
  await user.click(screen.getByRole("button", { name: "Draft the move" }));
  await waitFor(() => expect(posts(calls, "POST acts/batch")).toHaveLength(1));
  expect(posts(calls, "POST acts/batch")[0].body).toEqual({ action: "move", about: ["SRC-a"], folder: "Receipts" });
});

test("Move to for messages from several accounts says a folder belongs to one account and offers no list", async () => {
  const user = userEvent.setup();
  open({ "GET acts/batch-options?record=SRC-a&record=SRC-b": () => ({ account: null, account_label: null, several_accounts: true, folder_source: null, folders_listed: false }) });
  await tick(user, ["Subject a", "Subject b"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Move to…" }));
  expect(await screen.findByText(/a folder belongs to one account/)).toBeInTheDocument();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Name of the folder" })).toBeNull();
});

test("Label asks for the label and drafts it for each message", async () => {
  const user = userEvent.setup();
  const calls = open({ "POST acts/batch": () => ({ acts: [draftOf("XACT-1", "SRC-a", "a", "label", { label: "Waiting" })], skipped: [], changeset: "CS-9" }) });
  await tick(user, ["Subject a"]);
  await user.click(within(screen.getByRole("region", { name: "Selected mail" })).getByRole("button", { name: "Label…" }));
  await user.type(await screen.findByRole("textbox", { name: "Label" }), "Waiting");
  await user.click(screen.getByRole("button", { name: "Draft the label" }));
  expect(await screen.findByRole("heading", { name: "Label 1 message Waiting" })).toBeInTheDocument();
  expect(posts(calls, "POST acts/batch")[0].body).toEqual({ action: "label", about: ["SRC-a"], label: "Waiting" });
});
