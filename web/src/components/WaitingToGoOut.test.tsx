import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import type { Act } from "../lib/acts";
import { actFixture, actsAnswer, recipient } from "../lib/acts-fixtures";
import { reveal, revealOrKeep } from "../lib/reveal";
import { besidePane, fakeApi, Refuse, renderApp, type Routes } from "../test-utils";
import { FollowUps } from "./FollowUps";

// Waiting to go out, now Follow-ups' To send tab (design 7.4, 6.12): one line for each thing that will leave, its state in
// words and an icon, its one button; the one chosen in full beside the list, with its exact content, its target, the recipients
// called out to acknowledge by name, and Approve and send, which confirms and then says yes on exactly what is shown and sends.
// The guards are the ones the screen had on its own.

afterEach(() => vi.unstubAllGlobals());

function show(acts: Act[], extra: Routes = {}) {
  besidePane();
  const calls = fakeApi({ "GET acts": (_b, q) => actsAnswer(acts, q), "GET followups": () => [], ...extra });
  renderApp(<FollowUps />);
  return { calls };
}

const sent = (status: Act["status"] = "sent") => ({ id: "XACT-1", status, reason: null, changeset: null });

describe("nothing waiting", () => {
  test("the To send tab is Follow-ups' own: nothing is listed to approve and the screen says nobody is waiting", async () => {
    show([]);
    expect(screen.getByRole("heading", { level: 1, name: "Follow-ups" })).toBeInTheDocument();
    expect(await screen.findByText(/Nobody is waiting on anything from you/)).toBeInTheDocument();
    // With nothing on any tab the tabs change nothing, so they are not drawn.
    expect(screen.queryByRole("button", { name: "To send" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Waiting to go out" })).toBeNull();
  });

  test("acts that have gone out or been taken back are not listed", async () => {
    show([actFixture({ status: "sent" }), actFixture({ id: "XACT-2", status: "withdrawn" })]);
    expect(await screen.findByText(/Nobody is waiting on anything from you/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Waiting to go out" })).toBeNull();
  });
});

describe("the To send tab holds what waits to go out with the messages to send", () => {
  const person = (): S["FollowupSection"] => ({
    person: "PER-2",
    name: "Robin Sample",
    is_pm: false,
    questions: [
      { id: "Q-1", title: "Is the index final?", text: "", links: [], kind: "question", status: "open", sent: null, waiting_days: null, chase_due: false, chases: 0, about: null, options: [] },
    ],
    actions: [],
    message: "Hi Robin,\n\nIs the index final?\n\nThanks!",
    to_send: 1,
  });

  test("the acts come first under their own heading, and a person's message to copy is below them in the same list", async () => {
    show([actFixture()], { "GET followups": () => [person()] });
    const waiting = await screen.findByRole("list", { name: "Waiting to go out" });
    expect(within(waiting).getByText("Message to Ana Example")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Waiting to go out" })).toBeInTheDocument();
    const row = await screen.findByRole("listitem", { name: "Robin Sample" });
    expect(within(row).getByRole("button", { name: "Copy message" })).toBeInTheDocument();
    // Both are in the one tab, and the act is the one chosen beside the list.
    expect(screen.getByRole("button", { name: "To send" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByRole("complementary", { name: "Message to Ana Example" })).toBeInTheDocument();
  });

  test("choosing the person's line shows their message in the same pane, and choosing the act shows the act again", async () => {
    const user = userEvent.setup();
    show([actFixture()], { "GET followups": () => [person()] });
    await screen.findByRole("complementary", { name: "Message to Ana Example" });
    await user.click(within(await screen.findByRole("listitem", { name: "Robin Sample" })).getByRole("button", { name: /Robin Sample/ }));
    expect(await screen.findByRole("complementary", { name: "Robin Sample" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve and send" })).toBeNull();
    await user.click(within(await screen.findByRole("list", { name: "Waiting to go out" })).getByRole("button", { name: "Review and send" }));
    expect(await screen.findByRole("complementary", { name: "Message to Ana Example" })).toBeInTheDocument();
  });

  test("the other tabs list only follow-ups: no act is shown under Later or Waiting on them", async () => {
    const user = userEvent.setup();
    show([actFixture()], { "GET followups": () => [person()] });
    await screen.findByRole("list", { name: "Waiting to go out" });
    await user.click(screen.getByRole("button", { name: "Waiting on them" }));
    expect(screen.queryByRole("list", { name: "Waiting to go out" })).toBeNull();
  });
});

describe("the list", () => {
  test("a line for each act names its target in plain words, with its state as a word, and one button", async () => {
    show([
      actFixture(),
      actFixture({ id: "XACT-2", kind: "calendar", calendar: "Planning", when: "2026-10-23 10:00", parts: { title: "Planning call" }, recipients: [], status: "approved" }),
      actFixture({ id: "XACT-3", kind: "file", folder: "Reports", parts: { body: "Totals" }, recipients: [] }),
    ]);
    const list = await screen.findByRole("list", { name: "Waiting to go out" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Message to Ana Example")).toBeInTheDocument();
    expect(within(rows[0]).getByText("To approve")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("button", { name: "Review and send" })).toBeInTheDocument();
    expect(within(rows[1]).getByText("Calendar entry on Planning")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Approved")).toBeInTheDocument();
    expect(within(rows[2]).getByText("File for Reports")).toBeInTheDocument();
  });

  test.each([
    ["draft", "To approve", "Review and send"],
    ["approved", "Approved", "Review and send"],
    ["stale", "Changed", "Look again"],
    ["failed", "Not sent", "Review and send"],
    ["uncertain", "Unsure", "Check it"],
  ] as const)("a %s act says %s, with an icon beside the word, and its button is %s", async (status, word, button) => {
    show([actFixture({ status, failure: status === "failed" ? { kind: "outage", reason: "The service was down.", at: "2026-10-22T09:00:00Z" } : null })]);
    const row = (await screen.findByRole("list", { name: "Waiting to go out" })).querySelector("li") as HTMLElement;
    const pill = within(row).getByText(word);
    expect(pill.closest("[data-tone]")?.querySelector("svg")).not.toBeNull();
    expect(within(row).getByRole("button", { name: button })).toBeInTheDocument();
  });

  test("an act being sent has no button, only its state", async () => {
    show([actFixture({ status: "sending" })]);
    const row = (await screen.findByRole("list", { name: "Waiting to go out" })).querySelector("li") as HTMLElement;
    expect(within(row).getByText("Sending")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Review|Check|Look/ })).toBeNull();
  });

  test("the first act is chosen and its exact content is shown as plain text, every part, beside the list", async () => {
    show([actFixture({ parts: { subject: "The <b>proofs</b>", body: "Line one.\n\nLine two." } })]);
    const pane = await screen.findByRole("complementary", { name: "Message to Ana Example" });
    expect(within(pane).getByText("Subject")).toBeInTheDocument();
    expect(within(pane).getByText("The <b>proofs</b>")).toBeInTheDocument();
    expect(pane.querySelector("b")).toBeNull();
    expect(pane.querySelector('[data-part="body"]')?.textContent).toBe("Line one.\n\nLine two.");
  });

  test("the target is shown in full: each recipient by name with the address as it is now, and the channel", async () => {
    show([actFixture({ recipients: [recipient(), recipient({ key: "PER-3", person: "PER-3", name: "Ben Example", address: "ben@example.com", role: "cc" })] })]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByText("To: Ana Example, ana@example.com")).toBeInTheDocument();
    expect(within(pane).getByText("Copy: Ben Example, ben@example.com")).toBeInTheDocument();
    expect(within(pane).getByText("Goes by Test channel")).toBeInTheDocument();
  });

  test("Withdraw is in the menu and takes it back at once, with Undo", async () => {
    const user = userEvent.setup();
    const { calls } = show([actFixture()], {
      "POST acts/XACT-1/withdraw": () => ({ id: "XACT-1", status: "withdrawn", reason: null, changeset: "CS-9" }),
      "POST changesets/CS-9/undo": () => ({}),
    });
    const row = (await screen.findByRole("list", { name: "Waiting to go out" })).querySelector("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: /More actions for/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Take it back" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST acts/XACT-1/withdraw")).toBe(true));
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-9/undo")).toBe(true));
  });
});

describe("Approve and send", () => {
  test("a recipient called out must be acknowledged by name before Approve and send is offered", async () => {
    const user = userEvent.setup();
    show([actFixture({ recipients: [recipient({ reasons: ["new", "outside"] })] })]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByRole("button", { name: "Approve and send" })).toBeDisabled();
    expect(within(pane).getByText("Tick each one above first.")).toBeInTheDocument();
    expect(within(pane).getByText("You haven't written to them before.")).toBeInTheDocument();
    expect(within(pane).getByText("They are outside the people in your workspace.")).toBeInTheDocument();
    await user.click(within(pane).getByRole("checkbox", { name: "I know about Ana Example (ana@example.com)" }));
    expect(within(pane).getByRole("button", { name: "Approve and send" })).toBeEnabled();
  });

  test("an address taken from an email says so at the step that uses it, and one that was not says nothing", async () => {
    show([actFixture({ recipients: [recipient({ reasons: ["untrusted"] })] })]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByText("From an email; check the address before you send.")).toBeInTheDocument();
    cleanup();
    show([actFixture({ recipients: [recipient({ reasons: ["new"] })] })]);
    const other = await screen.findByRole("complementary");
    expect(within(other).queryByText(/From an email/)).toBeNull();
  });

  test("it confirms in words, then says yes on the fingerprint shown with the acknowledgements, then sends", async () => {
    const user = userEvent.setup();
    const { calls } = show([actFixture({ fingerprint: "fp-shown", recipients: [recipient({ reasons: ["untrusted"] })] })], {
      "POST acts/XACT-1/approve": () => ({ id: "XACT-1", status: "approved", reason: null, changeset: "CS-1" }),
      "POST acts/XACT-1/send": () => sent(),
    });
    const pane = await screen.findByRole("complementary");
    await user.click(within(pane).getByRole("checkbox", { name: /I know about Ana Example/ }));
    await user.click(within(pane).getByRole("button", { name: "Approve and send" }));
    const dialog = await screen.findByRole("dialog", { name: "Send this message to Ana Example now?" });
    // Nothing has gone before the person says so.
    expect(calls.filter((c) => c.route.startsWith("POST"))).toHaveLength(0);
    await user.click(within(dialog).getByRole("button", { name: "Send" }));
    await waitFor(() => expect(calls.filter((c) => c.route.startsWith("POST"))).toHaveLength(2));
    const posts = calls.filter((c) => c.route.startsWith("POST"));
    expect(posts.map((c) => c.route)).toEqual(["POST acts/XACT-1/approve", "POST acts/XACT-1/send"]);
    expect(posts[0].body).toEqual({ fingerprint: "fp-shown", acknowledged: ["PER-2"] });
    expect(posts[1].body).toEqual({ fingerprint: "fp-shown", acknowledged: ["PER-2"] });
    expect(await screen.findByText("Sent the message to Ana Example.")).toBeInTheDocument();
  });

  test("Cancel in the confirm sends nothing", async () => {
    const user = userEvent.setup();
    const { calls } = show([actFixture()]);
    await user.click(await screen.findByRole("button", { name: "Approve and send" }));
    const dialog = await screen.findByRole("dialog", { name: "Send this message to Ana Example now?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(calls.filter((c) => c.route.startsWith("POST"))).toHaveLength(0);
  });

  test("an act that already has the yes is only sent", async () => {
    const user = userEvent.setup();
    const { calls } = show([actFixture({ status: "approved", recipients: [recipient({ reasons: ["new"] })] })], { "POST acts/XACT-1/send": () => sent() });
    const pane = await screen.findByRole("complementary");
    expect(within(pane).queryByRole("checkbox")).toBeNull();
    await user.click(within(pane).getByRole("button", { name: "Approve and send" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Send" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST acts/XACT-1/send")).toBe(true));
    expect(calls.some((c) => c.route === "POST acts/XACT-1/approve")).toBe(false);
  });

  test("a send that fails says why, and one that the server refuses says what it says", async () => {
    const user = userEvent.setup();
    show([actFixture()], {
      "POST acts/XACT-1/approve": () => new Refuse(409, "this act is different from the one you were shown; look at it again"),
    });
    await user.click(await screen.findByRole("button", { name: "Approve and send" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/different from the one you were shown/)).toBeInTheDocument();
  });

  test("a channel's refusal is told in the toast", async () => {
    const user = userEvent.setup();
    show([actFixture({ status: "approved" })], {
      "POST acts/XACT-1/send": () => ({ id: "XACT-1", status: "failed", reason: "The service was down.", changeset: null }),
    });
    await user.click(await screen.findByRole("button", { name: "Approve and send" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Send" }));
    expect(await screen.findByText("It didn't go out: The service was down.")).toBeInTheDocument();
  });

  test("content that still names the assistant is not offered", async () => {
    show([actFixture({ withheld: "The message to Ana still names the assistant." })]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByText("The message to Ana still names the assistant.")).toBeInTheDocument();
    expect(within(pane).getByRole("button", { name: "Approve and send" })).toBeDisabled();
  });
});

describe("an act the person sends themselves", () => {
  const byHand = (over: Partial<Act> = {}) => actFixture({ channel: "copy", channel_label: "Copy", ...over });

  test("it has Copy and Mark sent instead of Approve and send", async () => {
    show([byHand()]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).queryByRole("button", { name: "Approve and send" })).toBeNull();
    expect(within(pane).getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(within(pane).getByRole("button", { name: "Mark sent" })).toBeDisabled();
    expect(within(pane).getByText(/copy it, send it, then mark it sent/)).toBeInTheDocument();
  });

  test("Copy says yes on what is shown, puts exactly that on the clipboard and sends nothing", async () => {
    const user = userEvent.setup();
    const { calls } = show([byHand({ fingerprint: "fp-copy" })], {
      "POST acts/XACT-1/approve": () => ({ id: "XACT-1", status: "approved", reason: null, changeset: "CS-1" }),
    });
    await user.click(await screen.findByRole("button", { name: "Copy" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST acts/XACT-1/approve")).toBe(true));
    expect(calls.find((c) => c.route === "POST acts/XACT-1/approve")?.body).toEqual({ fingerprint: "fp-copy", acknowledged: [] });
    expect(await navigator.clipboard.readText()).toBe("The proofs\n\nThe proofs ship on Monday.\n\nThanks.");
    expect(calls.some((c) => c.route.endsWith("/send"))).toBe(false);
  });

  test("Mark sent is the person's answer, with Undo, and needs no confirm", async () => {
    const user = userEvent.setup();
    const { calls } = show([byHand({ status: "approved" })], {
      "POST acts/XACT-1/settle": () => ({ id: "XACT-1", status: "sent", reason: null, changeset: "CS-5" }),
      "POST changesets/CS-5/undo": () => ({}),
    });
    await user.click(await screen.findByRole("button", { name: "Mark sent" }));
    await waitFor(() => expect(calls.find((c) => c.route === "POST acts/XACT-1/settle")?.body).toEqual({ answer: "sent" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-5/undo")).toBe(true));
  });
});

describe("an act that went stale", () => {
  test("it says what changed and offers to look again before the yes, which comes after a fresh read", async () => {
    const user = userEvent.setup();
    const { calls } = show([actFixture({ status: "stale", why: ["target", "content"] })]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByText(/changed after you approved it: who it goes to and what will be sent/)).toBeInTheDocument();
    expect(within(pane).queryByRole("button", { name: "Approve and send" })).toBeNull();
    const before = calls.filter((c) => c.route.startsWith("GET acts?")).length;
    await user.click(within(pane).getByRole("button", { name: "Look again" }));
    expect(await within(pane).findByRole("button", { name: "Approve and send" })).toBeInTheDocument();
    expect(calls.filter((c) => c.route.startsWith("GET acts?")).length).toBeGreaterThan(before);
    expect(within(pane).getByText(/Here is how it reads now/)).toBeInTheDocument();
  });

  test("the row's button looks again and opens it, and the yes is then offered", async () => {
    const user = userEvent.setup();
    show([actFixture({ status: "stale", why: ["content"] })]);
    const row = (await screen.findByRole("list", { name: "Waiting to go out" })).querySelector("li") as HTMLElement;
    expect(within(row).getByText(/Changed: what will be sent/)).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "Look again" }));
    expect(await screen.findByRole("button", { name: "Approve and send" })).toBeInTheDocument();
  });
});

describe("failed and unsure", () => {
  test("a failure says why in the detail and the yes can be given again", async () => {
    show([actFixture({ status: "failed", failure: { kind: "auth", reason: "Sign in to Work mail again", at: "2026-10-22T09:00:00Z" } })]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByText("It didn't go out: Sign in to Work mail again")).toBeInTheDocument();
    expect(within(pane).getByText("Sign in again first, then approve it again.")).toBeInTheDocument();
    expect(within(pane).getByRole("button", { name: "Approve and send" })).toBeEnabled();
  });

  test("an unsure act has It was sent and Send it again, and Send it again confirms", async () => {
    const user = userEvent.setup();
    const { calls } = show([actFixture({ status: "uncertain", why: ["lost_answer"] })], {
      "POST acts/XACT-1/settle": () => ({ id: "XACT-1", status: "sent", reason: null, changeset: "CS-2" }),
    });
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByText(/Look in the place it would have gone/)).toBeInTheDocument();
    await user.click(within(pane).getByRole("button", { name: "Send it again" }));
    const dialog = await screen.findByRole("dialog", { name: "Send this message to Ana Example again?" });
    expect(calls.some((c) => c.route === "POST acts/XACT-1/settle")).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "Send" }));
    await waitFor(() => expect(calls.find((c) => c.route === "POST acts/XACT-1/settle")?.body).toEqual({ answer: "again" }));
  });

  test("It was sent is the person's answer and needs no confirm", async () => {
    const user = userEvent.setup();
    const { calls } = show([actFixture({ status: "uncertain" })], {
      "POST acts/XACT-1/settle": () => ({ id: "XACT-1", status: "sent", reason: null, changeset: "CS-2" }),
    });
    await user.click(await screen.findByRole("button", { name: "It was sent" }));
    await waitFor(() => expect(calls.find((c) => c.route === "POST acts/XACT-1/settle")?.body).toEqual({ answer: "sent" }));
  });
});

describe("opened from Today", () => {
  const two = () => [actFixture(), actFixture({ id: "XACT-2", kind: "file", folder: "Reports", parts: { body: "Totals" }, recipients: [], status: "failed", failure: { kind: "outage", reason: "Down.", at: "2026-10-22T09:00:00Z" } })];

  test("a line asked for before the list has loaded is the one chosen when it has", async () => {
    revealOrKeep("act", "XACT-2");
    show(two());
    expect(await screen.findByRole("complementary", { name: "File for Reports" })).toBeInTheDocument();
  });

  test("a line asked for while the screen is open is chosen, and the cursor goes into its detail", async () => {
    show(two());
    await screen.findByRole("complementary", { name: "Message to Ana Example" });
    reveal("act", "XACT-2");
    const pane = await screen.findByRole("complementary", { name: "File for Reports" });
    await waitFor(() => expect(pane.contains(document.activeElement)).toBe(true));
  });
});


describe("the lists ask the server for the states they show", () => {
  test("Waiting to go out asks for the states that wait, and what went out for the latest ten that went out or were taken back", async () => {
    const { calls } = show([actFixture()]);
    await screen.findByRole("list", { name: "Waiting to go out" });
    const asked = calls.filter((c) => c.route.startsWith("GET acts?")).map((c) => new URLSearchParams(c.route.split("?")[1]));
    const waiting = asked.find((q) => q.getAll("status").includes("draft"));
    expect(waiting?.getAll("status").sort()).toEqual(["approved", "draft", "failed", "sending", "stale", "uncertain"]);
    expect(waiting?.get("limit")).toBeNull();
    const went = asked.find((q) => q.getAll("status").includes("sent"));
    expect(went?.getAll("status").sort()).toEqual(["sent", "undone"]);
    expect(went?.get("limit")).toBe("10");
    expect(calls.some((c) => c.route === "GET acts")).toBe(false);
  });
});

describe("a stale act shows what changed", () => {
  const stale = (over: Partial<Act> = {}) =>
    actFixture({
      status: "stale",
      why: ["target", "content"],
      changes_known: true,
      changes: [
        { part: "target", field: "to", name: null, before: "ana@example.com", after: "ana.new@example.com" },
        { part: "content", field: "body", name: null, before: "The proofs ship on Monday.", after: "The proofs ship on Tuesday." },
      ],
      ...over,
    });

  test("each change names its field and gives the words the yes covered and the words now, before the person looks again", async () => {
    show([stale()]);
    const pane = await screen.findByRole("complementary");
    const section = within(pane).getByRole("region", { name: "What changed since you approved it" });
    const to = section.querySelector('[data-change="target:to"]') as HTMLElement;
    expect(within(to).getByText("Sent to")).toBeInTheDocument();
    expect(to.querySelector("[data-before]")).toHaveTextContent("You approved: ana@example.com");
    expect(to.querySelector("[data-after]")).toHaveTextContent("Now: ana.new@example.com");
    const body = section.querySelector('[data-change="content:body"]') as HTMLElement;
    expect(within(body).getByText("Message")).toBeInTheDocument();
    expect(body.querySelector("[data-before]")).toHaveTextContent("You approved: The proofs ship on Monday.");
    expect(body.querySelector("[data-after]")).toHaveTextContent("Now: The proofs ship on Tuesday.");
  });

  test("a thing that was not there says so, and a yes given before the words were kept says only the kind of change is shown", async () => {
    show([
      stale({
        changes_known: false,
        changes: [],
      }),
    ]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByText(/before the exact words were kept/)).toBeInTheDocument();
    expect(within(pane).getByText(/changed after you approved it: who it goes to and what will be sent/)).toBeInTheDocument();
  });

  test("an act that is not stale shows no list of changes", async () => {
    show([actFixture()]);
    const pane = await screen.findByRole("complementary");
    expect(within(pane).queryByRole("region", { name: "What changed since you approved it" })).toBeNull();
  });
});
