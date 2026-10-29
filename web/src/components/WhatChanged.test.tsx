import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { revealOrKeep } from "../lib/reveal";
import { day } from "../lib/dates";
import { besidePane, fakeApi, renderApp } from "../test-utils";
import { ChangeRow, WhatChanged } from "./WhatChanged";

// The window is wide, so a change's detail stands beside the list (design 7.13).
beforeEach(() => besidePane());
afterEach(() => vi.unstubAllGlobals());

/** The detail pane beside the list: the chosen change in full. */
const findPane = () => screen.findByRole("complementary");

/** A line of Today's queue for a held item, as the queue serves it. */
function todayLine(over: Partial<S["QueueLineView"]>): S["QueueLineView"] {
  return { key: "x", group: "decide", kind: "held", count: 1, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {}, ...over };
}

/** Records the lines the screen asks Today to open, in place of Today being on screen. */
function watchReveals() {
  const seen: Array<{ type: string; id: string }> = [];
  const on = (event: Event) => {
    seen.push((event as CustomEvent).detail);
    event.preventDefault();
  };
  window.addEventListener("reveal-row", on);
  return { seen, stop: () => window.removeEventListener("reveal-row", on) };
}

/** What changed is the history: a row has no button, so each choice is the first entry of its menu or one of the others. */
async function choose(user: ReturnType<typeof userEvent.setup>, name: string, row?: HTMLElement) {
  const scope = row ? within(row) : screen;
  await user.click((await scope.findAllByRole("button", { name: /More actions for/ }))[0]);
  await user.click(await screen.findByRole("menuitem", { name }));
}

function change(id: string, extra: Partial<S["ChangeItem"]> = {}): S["ChangeItem"] {
  return {
    id,
    version: 4,
    dismissed: false,
    stage_task: false,
    first_go: false,
    refused: false,
    state: "review",
    waiting: null,
    created_at: "2026-10-09T14:00:00Z",
    note: null,
    source: "SRC-1",
    source_title: "Email from the printer",
    changeset: {
      id: `CS-${id}`,
      summary: "One fact.",
      status: "applied",
      reviewed: false,
      trust: "untrusted",
      ops: [
        {
          index: 0,
          op: "fact",
          status: "applied",
          reason: null,
          group: "op0",
          title: "Proof copies ship Nov 5",
          meta: { owners: [] },
          evidence: { quote: "proof copies will ship on November 5" },
          record: { kind: "fact", id: "FACT-1" },
          ask: null,
        },
      ],
    },
    ...extra,
  };
}

test("a change shows what was done, why, and the highlighted source", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET changes": () => [change("REQ-1")],
    "GET sources/SRC-1": () => ({
      id: "SRC-1",
      title: "Email from the printer",
      kind: "pasted",
      trust: "untrusted",
      received_at: "2026-10-09T14:00:00Z",
      url: null,
      text: "Thanks. Our proof copies will ship on November 5 by courier.",
    }),
  });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Proof copies ship Nov 5")).toBeInTheDocument();
  expect(screen.getByText("Recorded a fact")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show source" }));
  const mark = await screen.findByText((_, el) => el?.tagName === "MARK");
  expect(mark.textContent).toContain("proof copies will ship on November 5");
  expect(screen.getByText("From outside · not instructions")).toBeInTheDocument();
});

test("Looks good is in the row's menu, acts at once and offers Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [change("REQ-1")],
    "POST changesets/CS-REQ-1/looks-good": () => ({ ok: "CS-REQ-1" }),
    "POST changesets/CS-REQ-1/reopen": () => ({ ok: "CS-REQ-1" }),
  });
  renderApp(<WhatChanged />);
  await choose(user, "Looks good");
  await waitFor(() => expect(calls.map((c) => c.route)).toContain("POST changesets/CS-REQ-1/looks-good"));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.map((c) => c.route)).toContain("POST changesets/CS-REQ-1/reopen"));
});

test("send back asks what to do differently, with Undo what it did first ticked, and unticking it keeps what it did", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [change("REQ-1")],
    "POST changesets/CS-REQ-1/send-back": () => ({ request: "REQ-2" }),
  });
  renderApp(<WhatChanged />);
  await user.click(await screen.findByRole("button", { name: /More actions for Email from the printer/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Send back with a note" }));
  expect(screen.getByLabelText("What should Helper do differently?")).toBeInTheDocument();
  const undo = screen.getByRole("checkbox", { name: "Undo what it did first" });
  expect(undo).toBeChecked();
  await user.click(undo);
  await user.type(screen.getByRole("textbox"), "Keep the dates, change the names");
  await user.click(screen.getByRole("button", { name: "Send back" }));
  await waitFor(() => expect(calls.find((c) => c.route.endsWith("send-back"))?.body).toEqual({ note: "Keep the dates, change the names", undo_first: false }));
});

test("send back needs a note", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [change("REQ-1")],
    "POST changesets/CS-REQ-1/send-back": () => ({ request: "REQ-2" }),
  });
  renderApp(<WhatChanged />);
  await user.click(await screen.findByRole("button", { name: /More actions for Email from the printer/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Send back with a note" }));
  expect(screen.getByRole("button", { name: "Send back" })).toBeDisabled();
  expect(screen.getByText("Write what to do differently first.")).toBeInTheDocument();
  await user.type(screen.getByRole("textbox"), "That date is the courier's, not the printer's");
  // The reason goes with the button's being off.
  expect(screen.queryByText("Write what to do differently first.")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Send back" }));
  await waitFor(() => expect(calls.find((c) => c.route.endsWith("send-back"))?.body).toEqual({ note: "That date is the courier's, not the printer's" }));
});

test("a who-is question is information in the history, with one link that opens its line on Today", async () => {
  const user = userEvent.setup();
  const held = change("REQ-3");
  held.changeset!.ops[0] = {
    ...held.changeset!.ops[0],
    op: "action.add",
    status: "held",
    reason: "Waiting for you to say who this is",
    title: "Send spine options",
    ask: { id: "Q-7", status: "open", about: "held-op", name: "Robin", options: [{ id: "PER-2", name: "Robin Sample" }, { id: "PER-5", name: "Robin Other" }] },
  };
  const calls = fakeApi({
    "GET changes": () => [held],
    "GET today/queue": () => [todayLine({ key: "question:Q-7", kind: "who_is", changeset: "CS-REQ-3", op: 0, question: "Q-7" })],
  });
  const reveals = watchReveals();
  try {
    renderApp(<WhatChanged />);
    const pane = await findPane();
    // It is said as a fact, in the pane's full width, and nothing in it answers the question.
    expect(await within(pane).findByText("Needs you")).toBeInTheDocument();
    expect(within(pane).getByText("Send spine options")).toBeInTheDocument();
    expect(within(pane).getByText("proof copies will ship on November 5", { exact: false })).toBeInTheDocument();
    expect(within(pane).queryByRole("combobox")).toBeNull();
    expect(within(pane).queryByRole("button", { name: "Use this person" })).toBeNull();
    const link = await within(pane).findByRole("link", { name: "Answer on Today" });
    await user.click(link);
    expect(reveals.seen).toEqual([{ type: "line", id: "question:Q-7" }]);
    expect(calls.some((c) => c.route.startsWith("POST"))).toBe(false);
  } finally {
    reveals.stop();
  }
});

test("when nothing was recorded, the row says so and never shows the assistant's summary", async () => {
  const item = change("REQ-9", { source: null, source_title: null, note: "Write an email to the printer" });
  item.changeset!.ops = [];
  item.changeset!.summary = "You asked for an email draft; writing emails isn't something I can do from here.";
  fakeApi({ "GET changes": () => [item] });
  renderApp(<WhatChanged />);
  expect(within(await findPane()).queryByText(item.changeset!.summary)).toBeNull();
  expect(within(await findPane()).getByText(/Nothing recorded/)).toBeInTheDocument();
});

test("a change's line says what was done, as what it was, not as a count of things", async () => {
  const item = change("REQ-8");
  const op = (index: number, kind: string, status = "applied"): S["OpView"] => ({ ...item.changeset!.ops[0], index, op: kind, status: status as S["OpView"]["status"], group: `op${index}` });
  item.changeset!.ops = [op(0, "action.add"), op(1, "action.add"), op(2, "action.add"), op(3, "note"), op(4, "question.add", "held"), op(5, "some.other.kind")];
  fakeApi({ "GET changes": () => [item] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText(/Added 3 to-dos, Asked 1 question, Filed 1 note, Helper did 1 thing/)).toBeInTheDocument();
});

function noteChange(project: string | null, side_name: string | null = null): S["ChangeItem"] {
  const base = change("REQ-9");
  const op = { ...base.changeset!.ops[0], op: "note", title: "A thought", evidence: null, meta: { owners: [], project, side_name } };
  return { ...base, changeset: { ...base.changeset!, ops: [op] } };
}

test("an action the assistant added for someone not yet told says to send on its row", async () => {
  const base = change("REQ-9");
  const op = { ...base.changeset!.ops[0], op: "action.add", title: "Send the proof", evidence: null, meta: { owners: ["Robin Sample"], to_send: true } };
  fakeApi({ "GET changes": () => [{ ...base, changeset: { ...base.changeset!, ops: [op] } }] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Robin Sample · To send")).toBeInTheDocument();
});

test("a changed field is named by its label and its date is written as elsewhere, never as its key and an ISO date", async () => {
  const base = change("REQ-9");
  const set = (index: number, field: string, value: unknown): S["OpView"] => ({ ...base.changeset!.ops[0], index, op: "record.set", title: "Send two spine options", group: `op${index}`, evidence: null, meta: { owners: [], field, value } });
  fakeApi({ "GET changes": () => [{ ...base, changeset: { ...base.changeset!, ops: [set(0, "due", "2026-10-19"), set(1, "why_they_matter", "Runs the press")] } }] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText(`Due date: ${day("2026-10-19")}`)).toBeInTheDocument();
  expect(screen.getByText("Why they matter: Runs the press")).toBeInTheDocument();
  expect(screen.queryByText(/2026-10-19/)).toBeNull();
  expect(screen.queryByText(/^due:/)).toBeNull();
});

test("a filed note says which project it went under", async () => {
  fakeApi({ "GET changes": () => [noteChange("A project")] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Filed a note under A project")).toBeInTheDocument();
});

test("a note filed on a side and in none of its projects says so, never that it went under a project", async () => {
  fakeApi({ "GET changes": () => [noteChange(null, "Orchard Press")] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Filed a note in Orchard Press, not in a project")).toBeInTheDocument();
  expect(screen.queryByText(/under Orchard Press/)).toBeNull();
});

test("an action filed on a side shows the side as not in a project in its meta line", async () => {
  const base = change("REQ-9");
  const op = { ...base.changeset!.ops[0], op: "action.add", title: "Send the proof", evidence: null, meta: { owners: ["Robin Sample"], project: null, side_name: "Orchard Press", action_status: "open" } };
  fakeApi({ "GET changes": () => [{ ...base, changeset: { ...base.changeset!, ops: [op] } }] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Robin Sample · Orchard Press: not in a project")).toBeInTheDocument();
});

test("a filed note with no project says so", async () => {
  fakeApi({ "GET changes": () => [noteChange(null)] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Filed a note (no project)")).toBeInTheDocument();
});

const stopped = (extra: Partial<S["ChangeItem"]> = {}) =>
  change("REQ-9", {
    state: "needs_you",
    waiting: "Something went wrong processing this: the account is out of credit.",
    note: "File the printer's dates",
    source: null,
    source_title: null,
    changeset: null,
    ...extra,
  });

test("a stopped hand-in has Try again first in its menu, with Dismiss, and Dismiss has Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [stopped()],
    "POST requests/REQ-9/dismiss": () => ({ ok: "REQ-9", version: 5 }),
    "POST requests/REQ-9/undismiss": () => ({ ok: "REQ-9", version: 6 }),
  });
  renderApp(<WhatChanged />);
  await screen.findByRole("listitem", { name: "File the printer's dates" });
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  // The line's menu: the first in the page, whether or not the chosen change's pane beside it has drawn yet.
  await user.click(screen.getAllByRole("button", { name: /More actions for/ })[0]);
  expect((await screen.findAllByRole("menuitem")).map((m) => m.textContent)).toEqual(["Try again", "Dismiss"]);
  await user.click(await screen.findByRole("menuitem", { name: "Dismiss" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST requests/REQ-9/dismiss")?.body).toEqual({ read_version: 4 }),
  );
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST requests/REQ-9/undismiss")?.body).toEqual({ read_version: 5 }),
  );
});

test("a review row has no Dismiss, a dismissed hand-in is labeled in the list, and Done leaves out what still waits", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET changes": () => [
      change("REQ-1"),
      stopped({ state: "done", dismissed: true }),
    ],
  });
  renderApp(<WhatChanged />);
  // The list opens on everything, newest first: the review and the dismissed hand-in are both there.
  await screen.findByRole("listitem", { name: "Email from the printer" });
  expect(screen.getByRole("listitem", { name: "File the printer's dates" })).toBeInTheDocument();
  expect(screen.getAllByText("Dismissed").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /^Needs attention/ })).toBeNull();
  await user.click(screen.getAllByRole("button", { name: /More actions for/ })[0]);
  expect(await screen.findByRole("menuitem", { name: "Send back with a note" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Dismiss" })).toBeNull();
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Done" }));
  // The dismissed hand-in is finished, so it stays; the change nobody has checked yet is not.
  expect(await screen.findByRole("listitem", { name: "File the printer's dates" })).toBeInTheDocument();
  expect(screen.getAllByText(/you dismissed it/).length).toBeGreaterThan(0);
  expect(screen.queryByRole("listitem", { name: "Email from the printer" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "All" }));
  expect(screen.getByRole("listitem", { name: "Email from the printer" })).toBeInTheDocument();
});

const gated = (extra: Partial<S["ChangeItem"]> = {}) =>
  stopped({ approval: "required", estimate_usd: 0.8, waiting: "About $0.80. Waiting for you to start it.", ...extra });

test("a run held for its cost is its own row: the estimate, Start in its menu with the version read, and no Try again", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [gated()],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET stages/requests": () => [],
    "POST requests/REQ-9/go": () => ({ ok: "queued" }),
  });
  renderApp(<WhatChanged />);
  const row = await screen.findByRole("listitem", { name: "File the printer's dates" });
  expect(within(row).getByText("Waiting for you to start it")).toBeInTheDocument();
  expect(within(row).getByText("About $0.80")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  expect(within(row).queryByRole("button", { name: "Start" })).toBeNull();
  await choose(user, "Start", row);
  await waitFor(() => expect(calls.find((c) => c.route === "POST requests/REQ-9/go")?.body).toEqual({ read_version: 4 }));
  expect(await screen.findByText("Approved. Helper is on it.")).toBeInTheDocument();
});

test("a cost-held row can be dismissed from its menu, which has only Start besides", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [gated({ estimate_usd: 0.004 })],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET stages/requests": () => [],
    "POST requests/REQ-9/dismiss": () => ({ ok: "REQ-9", version: 5 }),
  });
  renderApp(<WhatChanged />);
  const row = await screen.findByRole("listitem", { name: "File the printer's dates" });
  expect(within(row).getByText("Less than a cent")).toBeInTheDocument();
  await user.click(within(row).getByRole("button", { name: /More actions for/ }));
  expect((await screen.findAllByRole("menuitem")).map((i) => i.textContent)).toEqual(["Start", "Dismiss"]);
  await user.click(screen.getByRole("menuitem", { name: "Dismiss" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST requests/REQ-9/dismiss")?.body).toEqual({ read_version: 4 }),
  );
});

test("a second opinion is labeled in words, by where it came from, in the change's detail", async () => {
  const user = userEvent.setup();
  const other = change("REQ-1", { source_title: "From another account" });
  other.changeset!.second_opinion = "other_account";
  const same = change("REQ-2", { source_title: "From the same account" });
  same.changeset!.second_opinion = "same_account";
  const plain = change("REQ-3", { source_title: "No second opinion" });
  fakeApi({ "GET changes": () => [other, same, plain] });
  renderApp(<WhatChanged />);
  // The first change is chosen as the list opens; the others by a click on their line.
  expect(await within(await findPane()).findByText("Second opinion from another account")).toBeInTheDocument();
  await user.click(screen.getByRole("listitem", { name: "From the same account" }));
  expect(await within(await findPane()).findByText("Second opinion from the same account, starting fresh")).toBeInTheDocument();
  expect(within(await findPane()).queryByText("Second opinion from another account")).toBeNull();
  await user.click(screen.getByRole("listitem", { name: "No second opinion" }));
  await within(await findPane()).findByRole("heading", { name: "No second opinion" });
  expect(within(await findPane()).queryByText(/Second opinion/)).toBeNull();
  // A line itself says only what was done.
  expect(within(screen.getByRole("listitem", { name: "From the same account" })).queryByText(/Second opinion/)).toBeNull();
});

test("the assistant's own summary of a run never shows, in the row or its details", async () => {
  const after = change("REQ-1", { source_title: "Chapter updates", follows: "CS-3", follows_summary: "Told the user about chapter 4" });
  fakeApi({ "GET changes": () => [after] });
  renderApp(<WhatChanged />);
  const pane = await findPane();
  expect(within(pane).queryByText(/Told the user/)).toBeNull();
  expect(within(pane).queryByText(/One fact\./)).toBeNull();
  expect(document.body.textContent).not.toMatch(/the user|assistant says/i);
});

test("a refused request offers Send to another account first in its menu, with Try again and Dismiss", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [stopped({ refused: true })],
    "GET requests/REQ-9/accounts": () => [
      { use: "first/model-a", label: "Work account" },
      { use: "second/model-b", label: "Second account" },
    ],
    "POST requests/REQ-9/retry": () => ({ ok: "REQ-9" }),
  });
  renderApp(<WhatChanged />);
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  // The line's first choice opens the choice of account in the change's detail.
  const row = await screen.findByRole("listitem", { name: "File the printer's dates" });
  expect(within(row).queryByRole("button", { name: "Send to another account" })).toBeNull();
  await choose(user, "Send to another account", row);
  const chooser = await screen.findByRole("group", { name: "Choose an account to try it with." });
  // The accounts are asked for when the chooser opens, so they are listed a moment after it.
  await waitFor(() => expect(within(chooser).getAllByRole("button").map((b) => b.textContent)).toEqual(["Work account", "Second account", "Cancel"]));
  await waitFor(() => expect(within(chooser).getByRole("button", { name: "Work account" })).toHaveFocus());
  await user.click(within(chooser).getByRole("button", { name: "Second account" }));
  expect(await screen.findByText("Sent to Second account.")).toBeInTheDocument();
  expect(calls.find((c) => c.route === "POST requests/REQ-9/retry")?.body).toEqual({ use: "second/model-b" });
  await waitFor(() => expect(screen.queryByRole("group", { name: "Choose an account to try it with." })).toBeNull());
  await user.click(within(row).getByRole("button", { name: /More actions for/ }));
  expect((await screen.findAllByRole("menuitem")).map((m) => m.textContent)).toEqual(["Send to another account", "Try again", "Dismiss"]);
  await user.click(screen.getByRole("menuitem", { name: "Try again" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST requests/REQ-9/retry")).toHaveLength(2));
  expect(calls.filter((c) => c.route === "POST requests/REQ-9/retry")[1].body).toBeUndefined();
});

test("with no other account, the chooser says so and points to the AI settings", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET changes": () => [stopped({ refused: true })], "GET requests/REQ-9/accounts": () => [] });
  renderApp(<WhatChanged />);
  const row = await screen.findByRole("listitem", { name: "File the printer's dates" });
  await choose(user, "Send to another account", row);
  expect(await screen.findByText("No other account can do this. Add one in AI accounts.")).toBeInTheDocument();
  const chooser = screen.getByRole("group", { name: /No other account/ });
  expect(within(chooser).getAllByRole("button").map((b) => b.textContent)).toEqual(["Cancel"]);
  await user.click(within(chooser).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("group", { name: /No other account/ })).toBeNull();
});

test("a request stopped because no account may see its level offers one action that lets the account see it, with Undo", async () => {
  const user = userEvent.setup();
  const key = "ai.providers.first.allowed_data";
  const calls = fakeApi({
    "GET changes": () => [stopped({ cause: { kind: "data_level", level: "internal", account: "first" } })],
    "POST requests/REQ-9/allow-data": () => ({
      request: "REQ-9",
      account: "first",
      level: "internal",
      saved: {
        changes: [{ key, before: ["open"], after: ["open", "internal"], was_default: false, is_default: false }],
        fingerprint: "fp-2",
        needs_restart: false,
      },
    }),
    "POST settings": () => ({ changes: [], fingerprint: "fp-3", needs_restart: false }),
  });
  renderApp(<WhatChanged />);
  const row = await screen.findByRole("listitem", { name: "File the printer's dates" });
  expect(within(row).queryByRole("button", { name: "Try again" })).toBeNull();
  expect(within(row).queryByRole("button", { name: "Let first see confidential material" })).toBeNull();
  await choose(user, "Let first see confidential material", row);
  expect(await screen.findByText("first can now see confidential material. Trying again.")).toBeInTheDocument();
  expect(calls.filter((c) => c.route === "POST requests/REQ-9/allow-data")).toHaveLength(1);
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST settings")?.body).toEqual({ changes: { [key]: ["open"] }, reset: [], fingerprint: "fp-2" }));
});

test("a request waiting for the person to be named offers Say who you are, which opens the setup guide at that step", async () => {
  const user = userEvent.setup();
  const open = vi.fn();
  const calls = fakeApi({
    "GET changes": () => [stopped({ waiting: "Say who you are first", cause: { kind: "no_person" } })],
  });
  renderApp(<WhatChanged onOpenGuide={open} />);
  const row = await screen.findByRole("listitem", { name: "File the printer's dates" });
  expect(within(row).queryByRole("button", { name: "Try again" })).toBeNull();
  expect(await within(await findPane()).findByText("Say who you are first")).toBeInTheDocument();
  await choose(user, "Say who you are", row);
  expect(open).toHaveBeenCalledWith("workspace");
  expect(calls.some((c) => c.route.startsWith("POST"))).toBe(false);
});

test("a change asked for before this screen opened is opened once its list has loaded", async () => {
  const done = change("REQ-2", { state: "done" });
  done.changeset!.ops[0].title = "Added the action about the proofs.";
  const third = change("REQ-3", { state: "done" });
  third.changeset!.ops[0].title = "Another summary, not asked for.";
  fakeApi({ "GET changes": () => [change("REQ-1", { state: "done" }), done, third] });
  // The person chose "Where it came from" on another screen, which then opened this one.
  expect(revealOrKeep("changeset", "CS-REQ-2")).toBe(false);
  renderApp(<WhatChanged />);
  // The change asked for is the one chosen, so its detail stands beside the list; the first change is not.
  expect(await within(await findPane()).findByText("Added the action about the proofs.")).toBeInTheDocument();
  expect(screen.queryByText("Another summary, not asked for.")).toBeNull();
});

test("each item in a review card has its own Change this, which sends back that item and no other", async () => {
  const user = userEvent.setup();
  const two = change("REQ-1");
  two.changeset!.ops.push({
    index: 1,
    op: "action.add",
    status: "applied",
    reason: null,
    group: "op1",
    title: "Send two spine options",
    meta: { owners: [] },
    evidence: null,
    record: { kind: "action", id: "ACT-7" },
    ask: null,
  });
  const calls = fakeApi({
    "GET changes": () => [two],
    "POST items/action/ACT-7/change": () => ({ ok: "ACT-7", request: "REQ-9", signal: "SIG-1" }),
  });
  renderApp(<WhatChanged />);
  await user.click(await screen.findByRole("button", { name: "More actions for Send two spine options" }));
  await user.click(await screen.findByRole("menuitem", { name: "Change this" }));
  await user.type(await screen.findByRole("textbox", { name: "Your note" }), "Make it three options");
  await user.click(screen.getByRole("button", { name: "Ask for the change" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST items/action/ACT-7/change")?.body).toEqual({ note: "Make it three options" }));
  // The fact beside it was not sent back.
  expect(calls.some((c) => c.route.startsWith("POST items/fact/"))).toBe(false);
  expect(calls.some((c) => c.route.endsWith("send-back"))).toBe(false);
});

test("an item that was not applied has no Change this", async () => {
  const user = userEvent.setup();
  const held = change("REQ-1");
  held.changeset!.ops[0] = { ...held.changeset!.ops[0], status: "refused", reason: "No such person" };
  fakeApi({ "GET changes": () => [held] });
  renderApp(<WhatChanged />);
  await user.click(await screen.findByRole("button", { name: "More actions for Proof copies ship Nov 5" }));
  expect(await screen.findByRole("menuitem", { name: "Show source" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Change this" })).toBeNull();
});

test("a finished item shows what it cost beside its estimate", async () => {
  fakeApi({});
  const item = change("REQ-1", { state: "done", spent_usd: 0.03, range_usd: [0.02, 0.08] });
  renderApp(
    <ol>
      <ChangeRow item={item} reveal={0} open />
    </ol>,
  );
  expect(await screen.findByText("Cost $0.03, estimated at $0.02 to $0.08")).toBeInTheDocument();
});

test("a Today line for a new source's intake narrows the list to what that intake found, until it is cleared", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET changes": () => [
      change("REQ-1", { intake: "m", source_title: "What the inbox found" }),
      change("REQ-2", { intake: "other", source_title: "Another source's thing" }),
      change("REQ-3", { source_title: "A pasted note's thing" }),
    ],
    "GET watch": () => [{ id: "m", label: "Inbox", connector: "kind-a", connector_label: "A kind", enabled: true, every_minutes: 15, items: 0, last: null, read_at: null, failures: 0, problem: null }],
  });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Another source's thing")).toBeInTheDocument();
  revealOrKeep("intake", "m");
  await waitFor(() => expect(screen.queryByText("Another source's thing")).toBeNull());
  expect(screen.getByRole("listitem", { name: "What the inbox found" })).toBeInTheDocument();
  expect(screen.queryByText("A pasted note's thing")).toBeNull();
  expect(await screen.findByText("Found in Inbox")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show everything" }));
  expect(await screen.findByText("A pasted note's thing")).toBeInTheDocument();
  expect(screen.getByText("Another source's thing")).toBeInTheDocument();
});

// ---- the first results are one clear list ----------------------------------------------------------------------------

function asking(id: string, who: string): S["ChangeItem"] {
  const item = change(id, { state: "done", source_title: `Question from ${who}` });
  item.changeset!.ops[0] = {
    ...item.changeset!.ops[0],
    op: "action.add",
    status: "held",
    reason: "Waiting for you to say who this is",
    title: `Send spine options (${who})`,
    ask: { id: `Q-${id}`, status: "open", about: "held-op", name: who, options: [{ id: "PER-2", name: "Robin Sample" }] },
  };
  return item;
}

test("rows that arrive while the list shows nothing appear at once, never as N new over an empty list", async () => {
  let rows: S["ChangeItem"][] = [];
  fakeApi({ "GET changes": () => rows, "GET people": () => [] });
  const { client } = renderApp(<WhatChanged />);
  expect(await screen.findByText(/Nothing here yet/i)).toBeInTheDocument();
  rows = [change("REQ-1"), change("REQ-2"), change("REQ-3")];
  await client.invalidateQueries();
  // Three rows at once (the first open, the others one line each), never "3 new" over nothing.
  expect(await screen.findAllByText("Email from the printer")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: /Show \d+ new items?/ })).toBeNull();
});

test("rows that arrive while the list shows others still wait behind N new", async () => {
  let rows = [change("REQ-1")];
  fakeApi({ "GET changes": () => rows });
  const { client } = renderApp(<WhatChanged />);
  expect(await screen.findAllByText("Proof copies ship Nov 5")).toHaveLength(1);
  rows = [change("REQ-1"), change("REQ-2")];
  await client.invalidateQueries();
  expect(await screen.findByRole("button", { name: /Show \d+ new items?/ })).toBeInTheDocument();
  expect(screen.getAllByText("Proof copies ship Nov 5")).toHaveLength(1);
});

test("the newest change is the one chosen first, and a change that holds a question shows it as information with a link to Today", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET changes": () => [change("REQ-0", { source_title: "Nothing asked here" }), asking("REQ-1", "Robin"), asking("REQ-2", "Sam")],
    "GET today/queue": () => [todayLine({ key: "question:Q-REQ-1", kind: "who_is", changeset: "CS-REQ-1", op: 0, question: "Q-REQ-1" })],
  });
  renderApp(<WhatChanged />);
  // The first change in the list is chosen, whether or not a later one holds a question.
  await within(await findPane()).findByRole("heading", { name: "Nothing asked here" });
  expect(document.querySelector("[aria-current]")?.getAttribute("data-choice")).toBe("REQ-0");
  await user.click(screen.getByRole("listitem", { name: "Question from Robin" }));
  const pane = await findPane();
  expect(await within(pane).findByRole("link", { name: "Answer on Today" })).toBeInTheDocument();
  expect(within(pane).queryByRole("combobox")).toBeNull();
});

// What changed is the history (design 7.3, 7.7): the review is on Today's review line, so a phone has no one-at-a-time review here.
test("on a phone there is no review mode: What changed is the history, and the review is on Today", async () => {
  document.documentElement.setAttribute("data-narrow", "");
  try {
    fakeApi({ "GET changes": () => [change("A", { source_title: "First thing" })], "GET stages/requests": () => [], "GET stages/records": () => [] });
    renderApp(<WhatChanged />);
    await screen.findByText("First thing");
    expect(screen.queryByRole("button", { name: "Review one at a time" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Looks good" })).toBeNull();
  } finally {
    document.documentElement.removeAttribute("data-narrow");
  }
});

describe("the history: rows are past tense, have no button, and keep their choices in the menu", () => {
  const done = (id: string, extra: Partial<S["ChangeItem"]> = {}) => change(id, { state: "done", source_title: `Email ${id}`, ...extra });

  test("no row of the list and no detail beside it has a button for the work, whatever state the change is in", async () => {
    fakeApi({
      "GET changes": () => [
        change("REQ-1"),
        done("REQ-2"),
        stopped({ id: "REQ-3" }),
        stopped({ id: "REQ-4", refused: true }),
        stopped({ id: "REQ-5", waiting: "Say who you are first", cause: { kind: "no_person" } }),
      ],
      "GET stages/requests": () => [],
      "GET stages/records": () => [],
    });
    renderApp(<WhatChanged onOpenGuide={() => undefined} />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "All" }));
    await screen.findByRole("listitem", { name: "Email REQ-2" });
    for (const name of ["Looks good", "Try again", "Send to another account", "Say who you are", "Start", "Dismiss", "Send back with a note"]) {
      expect(screen.queryByRole("button", { name }), name).toBeNull();
    }
    // Every row has a menu, and nothing else in its line is a button but the title that chooses it.
    const list = screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-choice"));
    expect(list.length).toBeGreaterThan(0);
    for (const row of list) {
      const names = within(row).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
      expect(names.filter((n) => !/^More actions for /.test(n ?? "") && !/Email|File the printer/.test(n ?? "")), row.textContent ?? "").toEqual([]);
    }
  });

  test("Undo is in the row's menu, and says it is done once it is", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({
      "GET changes": () => [done("REQ-2")],
      "POST changesets/CS-REQ-2/undo": () => ({ restored: [0], skipped: [] }),
    });
    renderApp(<WhatChanged />);
    await user.click(await screen.findByRole("button", { name: "All" }));
    await choose(user, "Undo everything it did");
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Undo everything" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-REQ-2/undo")).toBe(true));
  });

  test("a change the assistant finished and nobody has checked reads Not yet checked, and its line says what was done", async () => {
    fakeApi({ "GET changes": () => [change("REQ-1")] });
    renderApp(<WhatChanged />);
    const row = await screen.findByRole("listitem", { name: "Email from the printer" });
    expect(within(row).getByText("Not yet checked")).toBeInTheDocument();
    expect(within(row).queryByText("Review")).toBeNull();
    expect(within(row).getByText(/Recorded 1 thing/)).toBeInTheDocument();
  });

  test("what needed no look reads Filed, and a batch the person said looks good reads Checked", async () => {
    fakeApi({
      "GET changes": () => [
        change("REQ-1", { review: "filed", source_title: "Email from the printer" }),
        change("REQ-2", { review: "checked", state: "done", source_title: "Email from the framer" }),
      ],
    });
    renderApp(<WhatChanged />);
    const filed = await screen.findByRole("listitem", { name: "Email from the printer" });
    expect(within(filed).getByText("Filed")).toBeInTheDocument();
    expect(within(filed).queryByText("Not yet checked")).toBeNull();
    const checked = await screen.findByRole("listitem", { name: "Email from the framer" });
    expect(within(checked).getByText("Checked")).toBeInTheDocument();
  });

  test("a correction the menu makes still records its signal: Send back goes through the same route with its note", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({ "GET changes": () => [change("REQ-1")], "POST changesets/CS-REQ-1/send-back": () => ({ request: "REQ-2" }) });
    renderApp(<WhatChanged />);
    await choose(user, "Send back with a note");
    await user.type(await screen.findByRole("textbox"), "Use the courier's date");
    await user.click(screen.getByRole("button", { name: "Send back" }));
    await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-REQ-1/send-back")?.body).toEqual({ note: "Use the courier's date" }));
  });
});

// ---- a held change the line on Today asks as a question ---------------------------------------------------------------

function heldDrop(): S["ChangeItem"] {
  const item = change("REQ-5");
  item.changeset!.ops = [
    {
      index: 0,
      op: "action.drop",
      status: "held",
      reason: "Someone has already been sent this: look at it before dropping it.",
      group: "op0",
      title: "Confirm the seating plan",
      meta: { owners: ["Robin Sample"], action_status: "open" },
      evidence: { quote: "the seating plan is no longer needed" },
      record: { kind: "action", id: "ACT-5" },
      ask: null,
      held: { ask: "drop", item: "Confirm the seating plan", record: "ACT-5", owners: ["Robin Sample"], told: ["Casey Moor", "Robin Sample"], told_on: "2026-10-10", quote: "the seating plan is no longer needed" },
    },
  ];
  return item;
}

test("a held drop in the history is information with who was told, the quote and one link, and no button", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [heldDrop()],
    "GET today/queue": () => [todayLine({ key: "held:CS-REQ-5:0", kind: "held", changeset: "CS-REQ-5", op: 0 })],
    "GET sources/SRC-1": () => ({ id: "SRC-1", title: "Email from the printer", kind: "pasted", trust: "untrusted", received_at: "2026-10-09T14:00:00Z", url: null, text: "Note: the seating plan is no longer needed." }),
  });
  const reveals = watchReveals();
  try {
    renderApp(<WhatChanged />);
    const pane = await findPane();
    const op = (await within(pane).findByText("Confirm the seating plan")).closest("li") as HTMLElement;
    expect(within(op).getByText("Would drop a to-do")).toBeInTheDocument();
    expect(within(op).getByText("Needs you")).toBeInTheDocument();
    // None of the line's answers is here: the choice is made on Today.
    for (const name of ["Drop it", "Keep it", "Do it anyway", "Release all", "Keep"]) expect(within(pane).queryByRole("button", { name }), name).toBeNull();
    // Who was told is the reason it is held, so it comes first.
    const told = within(op).getByText(`Casey Moor, Robin Sample were told on ${day("2026-10-10")}`);
    expect(told.tagName).toBe("STRONG");
    expect(op.firstElementChild!.firstElementChild).toContainElement(told);
    expect(within(op).getByText("the seating plan is no longer needed")).toBeInTheDocument();
    expect(within(op).getByRole("button", { name: "Show source" })).toBeInTheDocument();
    // Exactly one way on: the link, which opens the held line.
    await user.click(await within(op).findByRole("link", { name: "Answer on Today" }));
    expect(reveals.seen).toEqual([{ type: "line", id: "held:CS-REQ-5:0" }]);
    expect(calls.some((c) => c.route.startsWith("POST"))).toBe(false);
  } finally {
    reveals.stop();
  }
});

test("a held change the engine doesn't ask as a question shows its reason and the link, never Do it anyway", async () => {
  const item = heldDrop();
  item.changeset!.ops[0].held = null;
  item.changeset!.ops[0].reason = "A way to reach someone waits for your confirmation.";
  fakeApi({ "GET changes": () => [item], "GET today/queue": () => [todayLine({ key: "held:CS-REQ-5:0", changeset: "CS-REQ-5", op: 0 })] });
  renderApp(<WhatChanged />);
  const op = (await screen.findByText("Confirm the seating plan")).closest("li") as HTMLElement;
  expect(within(op).queryByRole("button", { name: "Do it anyway" })).toBeNull();
  expect(within(op).getByText("A way to reach someone waits for your confirmation.")).toBeInTheDocument();
  expect(await within(op).findByRole("link", { name: "Answer on Today" })).toBeInTheDocument();
});

test("a held item with no line on Today (its change was dismissed) is information only, with no link", async () => {
  const item = heldDrop();
  fakeApi({ "GET changes": () => [item], "GET today/queue": () => [] });
  renderApp(<WhatChanged />);
  const op = (await screen.findByText("Confirm the seating plan")).closest("li") as HTMLElement;
  expect(within(op).getByText("Needs you")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("link", { name: "Answer on Today" })).toBeNull());
});

test("a change made from what the person typed is titled Your note, with their words under it", async () => {
  const item = change("REQ-6", { source: null, source_title: null, note: "Mark 'Settle the endpaper color' closed; the Print sync will cover it." });
  fakeApi({ "GET changes": () => [item] });
  renderApp(<WhatChanged />);
  // The line is titled Your note; their words are under it in the change's detail.
  await screen.findByRole("listitem", { name: "Your note" });
  expect(await within(await findPane()).findByText("Mark 'Settle the endpaper color' closed; the Print sync will cover it.")).toBeInTheDocument();
  expect(within(await findPane()).getByText("Your note", { selector: ".what" })).toBeInTheDocument();
});

test("words typed to answer a question are titled You answered, not Your note (sweep X22)", async () => {
  const item = change("REQ-6", { source: null, source_title: null, title: { kind: "answer", topic: "" }, note: "Soft-touch, please." });
  fakeApi({ "GET changes": () => [item] });
  renderApp(<WhatChanged />);
  await screen.findByRole("listitem", { name: "You answered" });
  expect(within(await findPane()).getByText("You answered", { selector: ".what" })).toBeInTheDocument();
  expect(screen.queryByText("Your note")).toBeNull();
});

test("a change the person undid says Undone, not Done (sweep X29)", async () => {
  const base = change("REQ-8", { state: "done" });
  const undone = { ...base, changeset: { ...base.changeset!, status: "undone", ops: base.changeset!.ops.map((o) => ({ ...o, status: "undone" as const })) } };
  fakeApi({ "GET changes": () => [undone] });
  renderApp(<WhatChanged />);
  const row = await screen.findByRole("listitem", { name: /Email from the printer/ });
  expect(within(row).getByText("Undone")).toBeInTheDocument();
  expect(within(row).queryByText("Done")).toBeNull();
});

test("a change from an email is titled by Today's rule, never by the first line of what came in", async () => {
  const item = change("REQ-7", {
    source_title: "From: Casey Moor",
    title: { kind: "email", person: "PER-2", person_name: "Casey Moor", sender: null, topic: "proof copies" },
  });
  fakeApi({ "GET changes": () => [item] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Email from Casey Moor · proof copies")).toBeInTheDocument();
  expect(screen.queryByText("From: Casey Moor")).toBeNull();
});

test("a change from a note with a topic is titled Your note and the topic, as on Today", async () => {
  const item = change("REQ-8", { source: null, source_title: null, note: "Put on the agenda", title: { kind: "note", person: null, person_name: null, sender: null, topic: "Put on the agenda" } });
  fakeApi({ "GET changes": () => [item] });
  renderApp(<WhatChanged />);
  expect(await screen.findByText("Your note · Put on the agenda")).toBeInTheDocument();
});

test("a quiet count of what was handled for the person links to Handled for you, and is left out when nothing was", async () => {
  fakeApi({ "GET changes": () => [], "GET handled/counts": () => ({ set_aside: 6, read: 5 }) });
  const view = renderApp(<WhatChanged />);
  const link = await screen.findByRole("link", { name: "11 handled for you" });
  expect(link.getAttribute("href")).toMatch(/#work\/handled$/);
  view.unmount();
  fakeApi({ "GET changes": () => [], "GET handled/counts": () => ({ set_aside: 0, read: 0 }) });
  renderApp(<WhatChanged />);
  await screen.findByText(/Nothing/);
  expect(screen.queryByRole("link", { name: /handled for you/ })).not.toBeInTheDocument();
});

// ---- the history opens on everything, and what waits is counted once, with a link to Today --------------------------------

const QUIET: Record<string, () => unknown> = {
  "GET plugin-today": () => [],
  "GET stages/requests": () => [],
  "GET stages/records": () => [],
  "GET stages/ready": () => [],
  "GET acts": () => ({ acts: [] }),
};

test("the list opens on All with the newest first, and Needs attention is not a choice", async () => {
  fakeApi({
    "GET changes": () => [change("REQ-2", { source_title: "Newest thing", created_at: "2026-10-10T09:00:00Z" }), change("REQ-1", { state: "done", source_title: "Older thing" })],
    ...QUIET,
  });
  renderApp(<WhatChanged />);
  await screen.findByRole("listitem", { name: "Newest thing" });
  expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Done" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.queryByRole("button", { name: /Needs attention/ })).toBeNull();
  const titles = screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-choice")).map((li) => li.getAttribute("aria-labelledby"));
  expect(titles).toEqual(["t-REQ-2", "t-REQ-1"]);
});

test("one line at the top counts what waits on Today and opens it, and is left out when nothing waits", async () => {
  const lines = [todayLine({ key: "held:CS-1:0" }), todayLine({ key: "review:REQ-1", group: "review", kind: "review" })];
  fakeApi({ "GET changes": () => [change("REQ-1")], "GET today/queue": () => lines, ...QUIET });
  const view = renderApp(<WhatChanged />);
  const line = await screen.findByText(/2 things wait for you on Today/);
  expect(line.closest("p")).toHaveTextContent("2 things wait for you on Today · Open Today");
  expect(within(line.closest("p") as HTMLElement).getByRole("link", { name: "Open Today" }).getAttribute("href")).toMatch(/#today$/);
  view.unmount();
  fakeApi({ "GET changes": () => [change("REQ-1")], "GET today/queue": () => [lines[0]], ...QUIET });
  const one = renderApp(<WhatChanged />);
  expect(await screen.findByText(/1 thing waits for you on Today/)).toBeInTheDocument();
  one.unmount();
  fakeApi({ "GET changes": () => [change("REQ-1")], "GET today/queue": () => [], ...QUIET });
  renderApp(<WhatChanged />);
  await screen.findByRole("listitem", { name: "Email from the printer" });
  expect(screen.queryByText(/wait for you on Today|waits for you on Today/)).toBeNull();
});

test("the first go and a stage's go are not rows of the history: runs waiting for them are counted in the line, not listed", async () => {
  fakeApi({
    "GET changes": () => [
      change("REQ-1"),
      stopped({ id: "REQ-8", first_go: true, approval: "required", estimate_usd: 0.3, source_title: "Waiting for the first go", waiting: "About $0.30" }),
    ],
    "GET today/queue": () => [todayLine({ key: "first_go", kind: "first_go" })],
    ...QUIET,
  });
  renderApp(<WhatChanged />);
  await screen.findByRole("listitem", { name: "Email from the printer" });
  expect(screen.queryByText(/Start the assistant/)).toBeNull();
  expect(screen.queryByRole("listitem", { name: "Waiting for the first go" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Give the go|^Start$/ })).toBeNull();
  expect(await screen.findByText(/1 thing waits for you on Today/)).toBeInTheDocument();
});

test("a to-do's title in the history never shows a raw date, and drops the phrase its meta line already says", async () => {
  const item = change("REQ-1");
  item.changeset!.ops = [
    { ...item.changeset!.ops[0], op: "action.add", title: "Send the venue list by 2026-11-02.", meta: { owners: [], due: "2026-11-02" }, evidence: null },
    { ...item.changeset!.ops[0], index: 1, op: "action.add", title: "Plan the move, done on 2026-11-04", meta: { owners: [] }, evidence: null },
  ];
  fakeApi({ "GET changes": () => [item], ...QUIET });
  renderApp(<WhatChanged />);
  const pane = await findPane();
  expect(await within(pane).findByText("Send the venue list.")).toBeInTheDocument();
  expect(within(pane).getByText(`Plan the move, done on ${day("2026-11-04")}`)).toBeInTheDocument();
  expect(pane.textContent).not.toMatch(/2026-11/);
});

test("an item the assistant added that waits only for an owner is information with the link to its question on Today", async () => {
  const item = change("REQ-4");
  item.changeset!.ops[0] = {
    ...item.changeset!.ops[0],
    op: "action.add",
    status: "applied",
    title: "Print the agenda.",
    meta: { owners: [], action_status: "held" },
    ask: { id: "Q-9", status: "open", about: "owner", name: null, options: [] },
  };
  fakeApi({
    "GET changes": () => [item],
    "GET today/queue": () => [todayLine({ key: "question:Q-9", kind: "owner", question: "Q-9" })],
  });
  renderApp(<WhatChanged />);
  const pane = await findPane();
  expect(await within(pane).findByText("Needs an owner")).toBeInTheDocument();
  expect(within(pane).queryByRole("combobox")).toBeNull();
  expect(await within(pane).findByRole("link", { name: "Answer on Today" })).toBeInTheDocument();
});

test("Undo this on one item acts at once with the Undo toast and no confirm", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [change("REQ-1")],
    "POST changesets/CS-REQ-1/undo": () => ({ restored: [0], skipped: [] }),
  });
  renderApp(<WhatChanged />);
  await user.click(await screen.findByRole("button", { name: /More actions for Proof copies ship Nov 5/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Undo this" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-REQ-1/undo")?.body).toEqual({ ops: [0] }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("Undo everything asks first, and only the confirm undoes the change", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET changes": () => [change("REQ-1")],
    "POST changesets/CS-REQ-1/undo": () => ({ restored: [0], skipped: [] }),
  });
  renderApp(<WhatChanged />);
  await choose(user, "Undo everything it did");
  const dialog = await screen.findByRole("dialog");
  expect(calls.some((c) => c.route === "POST changesets/CS-REQ-1/undo")).toBe(false);
  await user.click(within(dialog).getByRole("button", { name: "Undo everything" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-REQ-1/undo")).toBe(true));
});
