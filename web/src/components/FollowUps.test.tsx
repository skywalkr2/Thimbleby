import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { actFixture } from "../lib/acts-fixtures";
import { nextMonday } from "../lib/dates";
import { FILTER_BAR_MIN, setFilterBarMin } from "../lib/filterbar";
import { besidePane, fakeApi, renderApp, snapshotOf } from "../test-utils";
import { DecisionRow, FollowUps } from "./FollowUps";

// The window is wide, so a person's detail stands beside the list (design 7.13).
beforeEach(() => {
  besidePane();
  window.localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

/** The detail pane beside the list: the chosen person's message and asks. */
const findPane = () => screen.findByRole("complementary");
/** The one group shown in place of a list and a pane: its items, with the group's name as their heading. */
const findInPlace = async () => {
  await screen.findByRole("heading", { name: /./, level: 2 });
  return document.querySelector<HTMLElement>("[data-in-place]")!;
};
/** The Copy under the message box: the last of the identical buttons on the screen (the line's and the detail's come first). */
const underBox = () => screen.getAllByRole("button", { name: "Copy message" }).at(-1)!;

/** Made-up addresses are built from this, so no address is written out whole. */
const WEB = "https" + "://";

const sections: S["FollowupSection"][] = [
  {
    person: "PER-1",
    name: "Pat Example",
    is_pm: true,
    questions: [],
    actions: [{ id: "ACT-9", text: "Approve the proof", due: "2026-11-03", project_name: "Book", told: null, to_send: true, told_days: null, followed_up: null, chase_due: false, chases: 0 }],
    message: "",
    to_send: 0,
  },
  {
    person: "PER-2",
    name: "Robin Sample",
    is_pm: false,
    questions: [
      { id: "Q-1", title: "Is the index final?", text: "", links: [], kind: "question", status: "open", sent: null, waiting_days: null, chase_due: false, chases: 0, about: null, options: [] },
    ],
    actions: [{ id: "ACT-1", text: "Send the index", due: "2026-10-16", project_name: "Book", told: null, to_send: true, told_days: null, followed_up: null, chase_due: false, chases: 0 }],
    message: "Hi Robin,\n\nIs the index final?\n\nAction items with you:\n- Send the index\n\nThanks!",
    to_send: 2,
  },
  // A second person with something to send keeps the list beside its pane: one person alone is shown in place.
  {
    person: "PER-9",
    name: "Tess Example",
    is_pm: false,
    questions: [],
    actions: [{ id: "ACT-8", text: "Send the cover", due: null, project_name: "Book", told: null, to_send: true, told_days: null, followed_up: null, chase_due: false, chases: 0 }],
    message: "Hi Tess,\n\nAction items with you:\n- Send the cover\n\nThanks!",
    to_send: 1,
  },
];

test("the time this screen is open and in view is counted as time spent looking over the assistant's work, once, when the person leaves it", async () => {
  const start = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(start);
  const calls = fakeApi({ "GET followups": () => sections, "GET people": () => [], "POST quality/review-time": () => ({ seconds: 30 }) });
  renderApp(<FollowUps />);
  await screen.findByRole("link", { name: "Your own to-dos" });
  clock.mockReturnValue(start + 30_000);
  cleanup();
  clock.mockRestore();
  expect(calls.filter((c) => c.route === "POST quality/review-time").map((c) => c.body)).toEqual([{ screen: "followups", seconds: 30 }]);
});

test("the compact follow-ups on Today are part of Today and count nothing of their own", async () => {
  const start = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(start);
  const calls = fakeApi({ "GET followups": () => sections, "GET people": () => [], "POST quality/review-time": () => ({ seconds: 30 }) });
  renderApp(<FollowUps compact />);
  await waitFor(() => expect(calls.some((c) => c.route === "GET followups")).toBe(true));
  clock.mockReturnValue(start + 30_000);
  cleanup();
  clock.mockRestore();
  expect(calls.filter((c) => c.route === "POST quality/review-time")).toEqual([]);
});

test("the own to-dos line comes first, then each other person, and only the pane holds Copy", async () => {
  fakeApi({ "GET followups": () => sections, "GET people": () => [] });
  renderApp(<FollowUps />);
  const you = await screen.findByRole("link", { name: "Your own to-dos" });
  const robin = screen.getByRole("listitem", { name: "Robin Sample" });
  expect(you.compareDocumentPosition(robin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // A line only opens the pane: the one Copy for the person is in the pane, so the same action is not in view twice.
  expect(within(robin).queryByRole("button", { name: "Copy message" })).toBeNull();
  expect(within(await findPane()).getAllByRole("button", { name: "Copy message" })).not.toHaveLength(0);
  expect(within(robin).getByText("2 to send")).toBeInTheDocument();
  // The line about their own to-dos is plain text with a link, not a row of the list.
  expect(you.closest("li")).toBeNull();
});

const markSentRoutes = {
  "GET followups": () => sections,
  "GET people": () => [],
  "POST followups/PER-2/mark-sent": () => ({ questions: 1, actions: 1, question_ids: ["Q-1"], action_ids: ["ACT-1"] }),
  "POST followups/PER-2/unmark-sent": () => ({ ok: "PER-2" }),
};
const posts = (calls: { route: string }[]) => calls.filter((c) => c.route.startsWith("POST"));

test("Copy puts the edited message on the clipboard and changes nothing on the server", async () => {
  const user = userEvent.setup();
  const calls = fakeApi(markSentRoutes);
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  const box = screen.getByRole("textbox", { name: /Message to Robin Sample/ });
  await user.type(box, " PS");
  await user.click(underBox());
  expect(await navigator.clipboard.readText()).toBe(sections[1].message + " PS");
  expect(await screen.findByText("Copied")).toBeInTheDocument();
  expect(posts(calls)).toHaveLength(0);
  expect(screen.queryByText(/Marked as sent/)).toBeNull();
});

test("a message that still names the assistant shows why it is held back and cannot be copied", async () => {
  const user = userEvent.setup();
  const reason = "Held back: the message to Robin Sample names Helper. Take the name out before this goes to anyone.";
  const held = [sections[0], { ...sections[1], message: "", withheld: reason }, sections[2]];
  const calls = fakeApi({ ...markSentRoutes, "GET followups": () => held });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  expect((await screen.findByText(reason)).closest('[role="alert"]')).not.toBeNull();
  expect(underBox()).toBeDisabled();
  expect(posts(calls)).toHaveLength(0);
});

test("a to-do the person is outside the limit of is left out of their message, and the detail says so", async () => {
  const user = userEvent.setup();
  const limited = [{ kind: "action" as const, id: "ACT-7", text: "Check the print run", limited_to: "Pat Example, Lee Sample" }];
  fakeApi({ ...markSentRoutes, "GET followups": () => [sections[0], { ...sections[1], limited_out: limited }, sections[2]] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  const pane = await findPane();
  expect(within(pane).getByText("Left out of every message to Robin Sample: Check the print run. It is limited to Pat Example, Lee Sample.")).toBeInTheDocument();
});

test("a message with many items lists the first six above its box and says Show N more for the rest; the box has no resize handle", async () => {
  const user = userEvent.setup();
  const many = Array.from({ length: 9 }, (_, i) => ({ ...sections[1].actions[0], id: `ACT-M${i}`, text: `Item number ${i}`, due: null }));
  fakeApi({ ...markSentRoutes, "GET followups": () => [sections[0], { ...sections[1], actions: many }, sections[2]] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  const pane = await findPane();
  const list = within(pane).getByRole("list", { name: "In this message" });
  // One question and nine to-dos are in the message: five to-dos fill the six places, four more are one press away.
  expect(within(list).getAllByRole("listitem")).toHaveLength(6);
  const more = within(pane).getByRole("button", { name: "Show 4 more" });
  await user.click(more);
  expect(within(list).getAllByRole("listitem")).toHaveLength(10);
  expect(within(pane).queryByRole("button", { name: /^Show \d+ more$/ })).toBeNull();
  // The label of the list is for a screen reader only.
  expect(within(pane).queryByText("In this message")).toBeNull();
});

afterEach(() => {
  // A test that gave the browser a rich clipboard takes it away again.
  vi.unstubAllGlobals();
  if (navigator.clipboard) Reflect.deleteProperty(navigator.clipboard, "write");
});

/** What a rich copy put on the clipboard, as text by kind. */
async function richCopies(): Promise<Record<string, string>[]> {
  const text = (blob: Blob) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
  const written: FakeClipboardItem[] = [];
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
  Object.defineProperty(navigator.clipboard, "write", { configurable: true, value: async (items: FakeClipboardItem[]) => void written.push(...items) });
  return new Proxy([] as Record<string, string>[], {
    get: (_, key) => (key === "read" ? async () => Promise.all(written.map(async (item) => Object.fromEntries(await Promise.all(item.types.map(async (type) => [type, await text(await item.getType(type))]))))) : undefined),
  });
}

test("Copy puts the message on the clipboard formatted and plain together, and what is pasted is the text in the box", async () => {
  const user = userEvent.setup();
  fakeApi(markSentRoutes);
  const rich = (await richCopies()) as unknown as { read: () => Promise<Record<string, string>[]> };
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  const box = screen.getByRole("textbox", { name: /Message to Robin Sample/ });
  await user.type(box, " <b>PS</b>");
  await user.click(underBox());
  const [item] = await rich.read();
  expect(item["text/plain"]).toBe(sections[1].message + " <b>PS</b>");
  expect(item["text/html"]).toContain("<p>Hi Robin,</p>");
  expect(item["text/html"]).toContain("Thanks! &lt;b&gt;PS&lt;/b&gt;</p>");
  expect(item["text/html"]).not.toContain("<b>");
});

test("the menu's Copy as plain text puts only the plain text on the clipboard, and then the card offers Mark sent", async () => {
  const user = userEvent.setup();
  fakeApi(markSentRoutes);
  const rich = (await richCopies()) as unknown as { read: () => Promise<Record<string, string>[]> };
  const plain = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(screen.getByRole("button", { name: "More actions for Robin Sample" }));
  await user.click(await screen.findByRole("menuitem", { name: "Copy as plain text" }));
  await waitFor(() => expect(plain).toHaveBeenCalledWith(sections[1].message));
  expect(await rich.read()).toHaveLength(0);
  expect(await screen.findByText("Copied as plain text")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Mark sent" }).length).toBeGreaterThan(0);
});

test("the person's own to-dos are one plain line at the top that opens To-dos, with no You group and no list of them", async () => {
  fakeApi({ "GET followups": () => sections, "GET people": () => [] });
  renderApp(<FollowUps />);
  const link = await screen.findByRole("link", { name: "Your own to-dos" });
  const line = link.closest("[data-own-todos]")!;
  expect(line).toHaveTextContent("1 to-do of yours");
  expect(link).toHaveAttribute("href", expect.stringMatching(/#work\/open$/));
  // Follow-ups lists other people only: no You group, the to-do itself is not listed here, with no button or menu either.
  expect(screen.queryByRole("listitem", { name: "You" })).toBeNull();
  expect(screen.queryByRole("button", { name: /^You/ })).toBeNull();
  expect(screen.queryByText("Approve the proof")).toBeNull();
  expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull();
  // The list holds only the other people, and the pane opens on the first of them.
  expect(screen.getByRole("listitem", { name: "Robin Sample" })).toHaveAttribute("aria-current", "true");
});

test("the own to-dos line counts decisions and questions put to the person too, and is left out when there is nothing of theirs", async () => {
  const withAsks = structuredClone(sections);
  const ask = (id: string, title: string, kind: string): S["FollowupQuestion"] => ({ id, title, text: "", links: [], kind, status: "open", sent: null, waiting_days: null, chase_due: false, chases: 0, about: null, options: [] });
  withAsks[0].questions = [ask("Q-7", "Ship the proof now?", "decision"), ask("Q-8", "Which cover do you prefer?", "question")];
  fakeApi({ "GET followups": () => withAsks, "GET people": () => [] });
  const first = renderApp(<FollowUps />);
  expect((await screen.findByRole("link", { name: "Your own to-dos" })).closest("[data-own-todos]")).toHaveTextContent("1 decision · 1 question · 1 to-do of yours");
  expect(screen.queryByText("Ship the proof now?")).toBeNull();
  first.unmount();
  fakeApi({ "GET followups": () => [sections[1], sections[2]], "GET people": () => [] });
  renderApp(<FollowUps />);
  await screen.findByRole("listitem", { name: "Robin Sample" });
  expect(screen.queryByRole("link", { name: "Your own to-dos" })).toBeNull();
});

test("what waits to go out is the first row chosen even when the messages are here before it", async () => {
  fakeApi({
    "GET followups": () => sections,
    "GET people": () => [],
    // The server answers for the acts later than for the messages.
    "GET acts": async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return { acts: [actFixture()] };
    },
  });
  renderApp(<FollowUps />);
  expect(await screen.findByRole("complementary", { name: "Message to Ana Example" })).toBeInTheDocument();
  expect(screen.queryByRole("complementary", { name: "Robin Sample" })).toBeNull();
});

test("a click on another person's line opens their message and copies nothing; the one Copy is under the box", async () => {
  const user = userEvent.setup();
  // Robin's message is the one shown first, so the card that is closed and unseen is another person's.
  const more = structuredClone(sections);
  more.push({ ...structuredClone(sections[1]), person: "PER-3", name: "Sam Other", message: "Hi Sam,\n\nIs the index final?\n\nThanks!" });
  const calls = fakeApi({ ...markSentRoutes, "GET followups": () => more });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Sam Other/ }));
  const box = await screen.findByRole("textbox", { name: /Message to Sam Other/ });
  expect(box).toHaveValue(more[3].message);
  expect(await navigator.clipboard.readText()).toBe("");
  expect(screen.queryByText("Copied")).toBeNull();
  expect(posts(calls)).toHaveLength(0);
  // Only the message on screen is copied, and then the card offers Mark sent.
  await user.click(underBox());
  expect(await navigator.clipboard.readText()).toBe(more[3].message);
  expect(await screen.findByText("Copied")).toBeInTheDocument();
});

test("after copying, the button under the box becomes Mark sent, and the line has no button", async () => {
  const user = userEvent.setup();
  fakeApi(markSentRoutes);
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(within(await findPane()).getAllByRole("button", { name: "Copy message" })[0]);
  // The button under the box says it now; the line holds none and the detail's top holds only its menu.
  expect(await screen.findAllByRole("button", { name: "Mark sent" })).toHaveLength(1);
  expect(within(screen.getByRole("listitem", { name: "Robin Sample" })).queryByRole("button", { name: "Copy message" })).toBeNull();
  expect(within(await findPane()).queryByRole("button", { name: "Copy message" })).toBeNull();
});

test("the pane opens on the first person to message, and the own to-dos line is no choice in the list", async () => {
  fakeApi(markSentRoutes);
  renderApp(<FollowUps />);
  const you = await screen.findByRole("link", { name: "Your own to-dos" });
  const robin = screen.getByRole("listitem", { name: "Robin Sample" });
  await waitFor(() => expect(robin).toHaveAttribute("aria-current", "true"));
  expect(you).not.toHaveAttribute("aria-current");
  expect(await screen.findByRole("textbox", { name: /Message to Robin Sample/ })).toBeInTheDocument();
});

test("Mark sent records the box's text and offers Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi(markSentRoutes);
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.type(screen.getByRole("textbox", { name: /Message to Robin Sample/ }), " PS");
  await user.click(underBox());
  await user.click((await screen.findAllByRole("button", { name: "Mark sent" }))[0]);
  await waitFor(() => expect(calls.some((c) => c.route === "POST followups/PER-2/mark-sent")).toBe(true));
  expect(calls.find((c) => c.route === "POST followups/PER-2/mark-sent")!.body).toEqual({ text: sections[1].message + " PS" });
  expect(await screen.findByText("Marked as sent to Robin Sample")).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST followups/PER-2/unmark-sent")?.body).toEqual({
      question_ids: ["Q-1"],
      action_ids: ["ACT-1"],
    }),
  );
});

test("the row menu's Mark sent works without copying", async () => {
  const user = userEvent.setup();
  const calls = fakeApi(markSentRoutes);
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(await screen.findByRole("button", { name: "More actions for Robin Sample" }));
  await user.click(await screen.findByRole("menuitem", { name: "Mark sent" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST followups/PER-2/mark-sent")?.body).toEqual({ text: sections[1].message }),
  );
  expect(await screen.findByText("Marked as sent to Robin Sample")).toBeInTheDocument();
});

test("when the clipboard is blocked nothing is marked, the card keeps Copy, and Mark sent is offered beside the box, not only in the menu", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({ "GET followups": () => sections, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("blocked"));
  await user.click(underBox());
  expect(await screen.findByText(/Copying was blocked/)).toBeInTheDocument();
  expect(calls.some((c) => c.route.startsWith("POST"))).toBe(false);
  expect(screen.queryByText(/Marked as sent/)).toBeNull();
  expect(screen.queryByText("Copied")).toBeNull();
  expect(screen.getAllByRole("button", { name: /^Copy/ }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "Mark sent" })).toHaveLength(1);
});

test("a card lists only what is still to send, with no buttons or pills on the items", async () => {
  const user = userEvent.setup();
  const mixed = structuredClone(sections);
  mixed[1].questions.push({
    id: "Q-2", title: "Did the cover ship?", text: "", links: [], kind: "question", status: "sent", sent: "2026-10-08", waiting_days: 2, chase_due: false, chases: 0, about: null, options: [],
  });
  mixed[1].actions.push({ id: "ACT-2", text: "Return the proof", due: null, project_name: "Book", told: "2026-10-08", to_send: false, told_days: 2, followed_up: null, chase_due: false, chases: 0 });
  mixed[1].to_send = 2;
  fakeApi({ "GET followups": () => mixed, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  const list = screen.getByRole("list", { name: "In this message" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(within(list).getByText("Is the index final?")).toBeInTheDocument();
  expect(within(list).getByText(/Send the index/)).toBeInTheDocument();
  expect(within(list).queryByRole("button")).toBeNull();
  expect(screen.queryByText("Did the cover ship?")).toBeNull();
  expect(screen.queryByText("Return the proof")).toBeNull();
  expect(screen.getByRole("button", { name: /^Robin Sample/ }).closest("li")!).toHaveTextContent("2 to send");
});

test("the workspace can rename the section", async () => {
  fakeApi({ "GET followups": () => sections, "GET people": () => [] });
  renderApp(<FollowUps />, { "followups.title": "Chasers" });
  expect(await screen.findByRole("heading", { name: "Chasers" })).toBeInTheDocument();
});


function waitingSections(): S["FollowupSection"][] {
  const sent = structuredClone(sections.slice(1, 2));
  sent[0].questions[0].status = "sent";
  sent[0].questions[0].sent = "2026-10-08";
  sent[0].questions[0].waiting_days = 2;
  sent[0].actions[0].told = "2026-10-09";
  sent[0].actions[0].to_send = false;
  sent[0].actions[0].told_days = 1;
  sent[0].message = "";
  sent[0].to_send = 0;
  return sent;
}

test("the default view hides what was already sent; Waiting on them shows it, one line each", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET followups": () => waitingSections(), "GET people": () => [] });
  renderApp(<FollowUps />);
  expect(await screen.findByText("Nothing left to send.")).toBeInTheDocument();
  expect(screen.queryByText("Is the index final?")).toBeNull();
  expect(screen.queryByRole("button", { name: /Copy/ })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Waiting on them" }));
  // With one person waiting there is nothing to choose between: their name heads one line for each, in place.
  expect(await screen.findByRole("heading", { name: "Robin Sample", level: 2 })).toBeInTheDocument();
  expect(screen.queryByRole("complementary")).toBeNull();
  const rows = within(await findInPlace())
    .getAllByRole("listitem")
    .filter((li) => li.hasAttribute("data-item"));
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent(/Is the index final\?/);
  expect(rows[0]).toHaveTextContent(/sent .* \(2 days\)/);
  expect(rows[1]).toHaveTextContent(/sent .* \(1 day\)/);
  expect(within(rows[0]).getByRole("button", { name: "Record reply" })).toBeInTheDocument();
  expect(within(rows[1]).getByRole("button", { name: "Mark their work done" })).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).toBeNull();
});

// First day (promise P77): with nothing to follow up on any tab, the choices between tabs and groupings change nothing, so they
// are not drawn until there is something; the heading and the empty message are what is there.
test("with nothing on any tab, By person, By project, To send, Later and Waiting on them are not drawn; with something they are", async () => {
  fakeApi({ "GET followups": () => [], "GET people": () => [], "GET acts": () => [] });
  const empty = renderApp(<FollowUps />);
  // One line says what a follow-up is for and where to go: the people, whom a follow-up is for.
  expect(await screen.findByText("No follow-ups yet. They appear when someone else owes you an answer.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to People" })).toHaveAttribute("href", expect.stringMatching(/#records\/people$/));
  expect(screen.queryByRole("link", { name: "Your own to-dos" })).toBeNull();
  for (const name of ["By person", "By project", "To send", "Later", "Waiting on them"]) expect(screen.queryByRole("button", { name })).toBeNull();
  empty.unmount();
  fakeApi({ "GET followups": () => sections, "GET people": () => [], "GET acts": () => [] });
  renderApp(<FollowUps />);
  await screen.findByRole("listitem", { name: "Robin Sample" });
  for (const name of ["To send", "Later", "Waiting on them"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
});

test("Waiting on them has its own empty state, and the own to-dos line stays under To send", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET followups": () => sections, "GET people": () => [] });
  renderApp(<FollowUps />);
  expect(await screen.findByRole("link", { name: "Your own to-dos" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Waiting on them" }));
  expect(screen.getByText(/You're not waiting for any replies/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Your own to-dos" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "To send" }));
  expect(screen.getByRole("link", { name: "Your own to-dos" })).toBeInTheDocument();
});

test("a waiting question takes its reply right on its line", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET followups": () => waitingSections(),
    "GET people": () => [],
    "POST questions/Q-1/reply": () => ({ request: "REQ-5", source: "SRC-5" }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  await user.click(screen.getByRole("button", { name: "Record reply" }));
  await user.type(screen.getByRole("textbox", { name: /Robin's reply/ }), "Yes, the index is final.");
  await user.click(screen.getByRole("button", { name: "Add reply" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST questions/Q-1/reply")?.body).toEqual({ text: "Yes, the index is final." }),
  );
});

test("a reply handed in while Today waits for Start says it waits until the person chooses Start", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET followups": () => waitingSections(),
    "GET people": () => [],
    "GET today/queue": () => [{ key: "first_go", group: "decide", kind: "first_go", count: 2, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {} }],
    "POST questions/Q-1/reply": () => ({ request: "REQ-5", source: "SRC-5" }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  await user.click(screen.getByRole("button", { name: "Record reply" }));
  await user.type(screen.getByRole("textbox", { name: /Robin's reply/ }), "Yes, the index is final.");
  await user.click(screen.getByRole("button", { name: "Add reply" }));
  expect(await screen.findByText("Handed in. It waits until you choose Start on Today.")).toBeInTheDocument();
  expect(screen.queryByText(/is on it/)).toBeNull();
});

const finishRoutes = {
  "POST followups/PER-2/actions/ACT-1/finished": () => ({ ok: "ACT-1" }),
  "POST actions/ACT-1/status": () => ({ ok: "ACT-1" }),
  "POST followups/PER-2/actions/ACT-1/followed-up": () => ({ on: "2026-10-13", previous_told: "2026-10-09" }),
  "POST followups/PER-2/actions/ACT-1/unfollow": () => ({ ok: "ACT-1" }),
};

function chaseSections(): S["FollowupSection"][] {
  const waiting = waitingSections();
  waiting[0].actions[0].told_days = 5;
  waiting[0].actions[0].chase_due = true;
  return waiting;
}

test("Mark their work done closes the action as the person's work and offers Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({ "GET followups": () => waitingSections(), "GET people": () => [], ...finishRoutes });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  expect(screen.queryByRole("button", { name: "Followed up" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Mark their work done" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST followups/PER-2/actions/ACT-1/finished")).toBe(true));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/ACT-1/status")?.body).toEqual({ status: "open" }));
});

test("once the follow-up rule says it is time, Followed up is the primary and Mark their work done moves to the row's menu", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET followups": () => chaseSections(), "GET people": () => [], ...finishRoutes });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  expect(within(row).getByRole("button", { name: "Followed up" })).toBeInTheDocument();
  expect(within(row).queryByRole("button", { name: "Mark their work done" })).toBeNull();
  await user.click(within(row).getByRole("button", { name: "More actions for Send the index" }));
  expect(await screen.findByRole("menuitem", { name: "Mark their work done" })).toBeInTheDocument();
});

test("Followed up records the chase, says so on the row and can be undone", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({ "GET followups": () => chaseSections(), "GET people": () => [], ...finishRoutes });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  await user.click(screen.getByRole("button", { name: "Followed up" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST followups/PER-2/actions/ACT-1/followed-up")).toBe(true));
  expect(calls.some((c) => c.route === "POST actions/ACT-1/status")).toBe(false);
  expect(await screen.findByText("Recorded your follow-up with Robin. It stays open.")).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST followups/PER-2/actions/ACT-1/unfollow")?.body).toEqual({
      on: "2026-10-13",
      previous_told: "2026-10-09",
    }),
  );
});

test("a followed-up row shows when, and the menu can chase again", async () => {
  const user = userEvent.setup();
  const chased = chaseSections();
  chased[0].actions[0].followed_up = "2026-10-10";
  chased[0].actions[0].chase_due = false;
  const calls = fakeApi({ "GET followups": () => chased, "GET people": () => [], ...finishRoutes });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  expect(row).toHaveTextContent(/followed up .*/);
  expect(row).not.toHaveTextContent(/sent .*\(/);
  await user.click(within(row).getByRole("button", { name: "More actions for Send the index" }));
  await user.click(await screen.findByRole("menuitem", { name: "Followed up" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST followups/PER-2/actions/ACT-1/followed-up")).toBe(true));
});

test("a waiting pill says how long, and says follow up in words as well as color once it is time", async () => {
  const user = userEvent.setup();
  const waiting = waitingSections();
  waiting[0].actions[0].told_days = 3;
  waiting[0].questions[0].waiting_days = 6;
  waiting[0].questions[0].chase_due = true;
  fakeApi({ "GET followups": () => waiting, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const pane = await findInPlace();
  const calm = within(pane).getByText("waiting 3 days");
  expect(calm).toHaveAttribute("data-tone", "need");
  const late = within(pane).getByText("waiting 6 days · follow up");
  expect(late).toHaveAttribute("data-tone", "danger");
});

test("one day of waiting is singular, in the pill and with follow up", async () => {
  const user = userEvent.setup();
  const waiting = waitingSections();
  waiting[0].actions[0].told_days = 1;
  waiting[0].questions[0].waiting_days = 1;
  waiting[0].questions[0].chase_due = true;
  fakeApi({ "GET followups": () => waiting, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const pane = await findInPlace();
  expect(within(pane).getByText("waiting 1 day")).toHaveAttribute("data-tone", "need");
  expect(within(pane).getByText("waiting 1 day · follow up")).toHaveAttribute("data-tone", "danger");
  expect(document.body).not.toHaveTextContent("1 days");
});

test("an action on hold shows what it waits for with its old due date in the tooltip, and is not chased", async () => {
  const user = userEvent.setup();
  const waiting = waitingSections();
  waiting[0].actions[0].told_days = 30;
  waiting[0].actions[0].on_hold = "the printer's quote";
  fakeApi({ "GET followups": () => waiting, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  const pill = within(row).getByText("Paused: the printer's quote");
  expect(pill).toHaveAttribute("title", expect.stringMatching(/^Was due .*16/));
  expect(within(row).queryByText(/waiting 30d/)).toBeNull();
  expect(within(row).queryByRole("button", { name: "Followed up" })).toBeNull();
  await user.click(within(row).getByRole("button", { name: "More actions for Send the index" }));
  expect(await screen.findByRole("menuitem", { name: "Resume" })).toBeInTheDocument();
});

test("Pause asks what it waits for with the cursor in the field, acts at once and can be undone", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET followups": () => waitingSections(),
    "GET people": () => [],
    "POST actions/ACT-1/hold": () => ({ ok: "ACT-1", previous: null }),
    "POST actions/ACT-1/hold/restore": () => ({ ok: "ACT-1" }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  await user.click(within(row).getByRole("button", { name: "More actions for Send the index" }));
  await user.click(await screen.findByRole("menuitem", { name: "Pause" }));
  const field = within(row).getByRole("textbox", { name: "What is it waiting for?" });
  expect(field).toHaveFocus();
  expect(within(row).getByRole("button", { name: "Pause" })).toBeDisabled();
  await user.type(field, "the printer's quote");
  await user.click(within(row).getByRole("button", { name: "Pause" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/ACT-1/hold")?.body).toEqual({ waiting_for: "the printer's quote" }));
  expect(await screen.findByText("Paused, waiting for the printer's quote.")).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/ACT-1/hold/restore")?.body).toEqual({ hold: null }));
});

test("Drop on an action row asks why with the cursor in the field, acts at once and Undo takes it back", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET followups": () => waitingSections(),
    "GET people": () => [],
    "POST actions/ACT-1/drop": () => ({ changeset: "CS-9", drafts: [], acts: [] }),
    "POST changesets/CS-9/undo": () => ({ restored: [0], skipped: [] }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  await user.click(within(row).getByRole("button", { name: "More actions for Send the index" }));
  await user.click(await screen.findByRole("menuitem", { name: "Drop" }));
  const field = within(row).getByRole("textbox", { name: "Why isn't it needed?" });
  expect(field).toHaveFocus();
  expect(within(row).getByRole("button", { name: "Drop it" })).toBeDisabled();
  await user.type(field, "The printer did it already");
  await user.click(within(row).getByRole("button", { name: "Drop it" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/ACT-1/drop")?.body).toEqual({ reason: "The printer did it already" }));
  expect(await screen.findByText("Dropped.")).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-9/undo")).toBe(true));
});

test("Escape closes the Drop form and sends nothing", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({ "GET followups": () => waitingSections(), "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  await user.click(await screen.findByRole("button", { name: "More actions for Send the index" }));
  await user.click(await screen.findByRole("menuitem", { name: "Drop" }));
  const field = await screen.findByRole("textbox", { name: "Why isn't it needed?" });
  await user.type(field, "x{Escape}");
  expect(screen.queryByRole("textbox", { name: "Why isn't it needed?" })).toBeNull();
  expect(calls.some((c) => c.route.startsWith("POST"))).toBe(false);
});

test("Resume acts at once and Undo puts the old hold back", async () => {
  const user = userEvent.setup();
  const held = waitingSections();
  held[0].actions[0].on_hold = "the printer's quote";
  const previous = { waiting_for: "the printer's quote", since: "2026-10-10" };
  const calls = fakeApi({
    "GET followups": () => held,
    "GET people": () => [],
    "POST actions/ACT-1/unhold": () => ({ ok: "ACT-1", previous }),
    "POST actions/ACT-1/hold/restore": () => ({ ok: "ACT-1" }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  await user.click(within(row).getByRole("button", { name: "More actions for Send the index" }));
  await user.click(await screen.findByRole("menuitem", { name: "Resume" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST actions/ACT-1/unhold")).toBe(true));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/ACT-1/hold/restore")?.body).toEqual({ hold: previous }));
});

// ---- the table view (design 7.5) ----------------------------------------------------------------------------------------

const tableSections: S["FollowupSection"][] = [
  sections[0],
  {
    person: "PER-2",
    name: "Robin Sample",
    is_pm: false,
    questions: [
      { id: "Q-1", title: "Is the index final?", text: "", links: [{ label: "Book page", url: `${WEB}example.com/book` }], kind: "question", status: "open", project_name: "Book", sent: null, waiting_days: null, chase_due: false, chases: 0, about: null, options: [] },
      { id: "Q-2", title: "Who writes the jacket copy?", text: "", links: [], kind: "question", status: "open", project_name: "Book", sent: "2026-10-10", waiting_days: null, chase_due: false, chases: 0, about: null, options: [] },
    ],
    actions: [
      { id: "ACT-2", text: "Send the acknowledgments page", due: "2099-10-23", project_name: "Book", links: [], told: null, to_send: true, told_days: null, followed_up: null, chase_due: false, chases: 0 },
      { id: "ACT-1", text: "Send the index", due: "2020-10-14", project_name: "Book", links: [{ label: "Book page", url: `${WEB}example.com/book` }], told: null, to_send: true, told_days: null, followed_up: null, chase_due: false, chases: 0 },
    ],
    message: "Hi Robin",
    to_send: 4,
  },
  sections[2],
] as S["FollowupSection"][];

const tableRoutes = { ...markSentRoutes, "GET followups": () => tableSections };

async function showTable(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(screen.getByRole("button", { name: "More actions for Robin Sample" }));
  await user.click(await screen.findByRole("menuitem", { name: "Show as a table" }));
}

test("the message is what shows first; the table is one choice in the person's menu, with no switch on the card", async () => {
  const user = userEvent.setup();
  fakeApi(tableRoutes);
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  expect(screen.queryByRole("radiogroup", { name: "Show as" })).toBeNull();
  expect(screen.getByRole("textbox", { name: /Message to Robin Sample/ })).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
  await user.click(screen.getByRole("button", { name: "More actions for Robin Sample" }));
  expect(await screen.findByRole("menuitem", { name: "Show as a table" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Show as a message" })).toBeNull();
});

test("the table is on screen before anything is copied: actions by due date with overdue first, questions by first asked", async () => {
  const user = userEvent.setup();
  const calls = fakeApi(tableRoutes);
  renderApp(<FollowUps />);
  await showTable(user);
  const [actions, questions] = screen.getAllByRole("table");
  expect(within(actions).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Project", "To-do", "Due", "Link", "Your update"]);
  expect(within(questions).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Project", "Question", "First asked", "Link", "Your answer"]);
  const bodyRows = (table: HTMLElement) => within(table).getAllByRole("row").slice(1);
  const a = bodyRows(actions).map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
  expect(a.map((r) => r[1])).toEqual(["Send the index", "Send the acknowledgments page"]);
  // The project is on every row; overdue is said in words; no link is a dash; the fill-in column is empty.
  expect(a.map((r) => r[0])).toEqual(["Book", "Book"]);
  expect(a[0][2]).toMatch(/ · overdue$/);
  expect(a[1][2]).not.toMatch(/overdue/);
  expect(a[0][3]).toContain("Book page");
  expect(a[1][3]).toBe("—");
  expect(a.map((r) => r[4])).toEqual(["", ""]);
  const q = bodyRows(questions).map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
  expect(q.map((r) => r[1])).toEqual(["Who writes the jacket copy?", "Is the index final?"]);
  expect(q[0][2]).toMatch(/Oct 10/);
  expect(q[1][2]).toBe("Not sent yet");
  expect(q.map((r) => r[4])).toEqual(["", ""]);
  // Nothing has been copied, and no AI run or other request was made for it.
  expect(await navigator.clipboard.readText()).toBe("");
  expect(posts(calls)).toHaveLength(0);
});

test("the fill-in column is the last one, and the menu's Show as a message keeps the message", async () => {
  const user = userEvent.setup();
  fakeApi(tableRoutes);
  renderApp(<FollowUps />);
  await showTable(user);
  for (const table of screen.getAllByRole("table")) {
    const headers = within(table).getAllByRole("columnheader");
    expect(headers[headers.length - 1].textContent).toMatch(/^Your (update|answer)$/);
  }
  await user.click(screen.getByRole("button", { name: "More actions for Robin Sample" }));
  await user.click(await screen.findByRole("menuitem", { name: "Show as a message" }));
  expect(screen.getByRole("textbox", { name: /Message to Robin Sample/ })).toHaveValue("Hi Robin");
});

/** The browser's rich clipboard item, which the test browser lacks. */
class FakeClipboardItem {
  constructor(private data: Record<string, Blob>) {}
  get types() {
    return Object.keys(this.data);
  }
  async getType(type: string) {
    return this.data[type];
  }
}

test("Copy as table puts an HTML table on the clipboard and Copy for a spreadsheet puts tab-separated cells with full addresses", async () => {
  const user = userEvent.setup();
  const calls = fakeApi(tableRoutes);
  renderApp(<FollowUps />);
  await showTable(user);
  await user.click(screen.getByRole("button", { name: "Copy for a spreadsheet" }));
  const sheet = await navigator.clipboard.readText();
  expect(sheet.split("\n")[0]).toBe("Project\tTo-do\tDue\tLink\tYour update");
  expect(sheet).toContain("Send the index");
  expect(sheet).toContain(`${WEB}example.com/book`);
  expect(sheet).not.toContain("Book page");
  expect(await screen.findByText("Copied for a spreadsheet.")).toBeInTheDocument();
  // The rich copy needs the browser's clipboard item, which the test browser lacks.
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
  const written: FakeClipboardItem[] = [];
  Object.defineProperty(navigator.clipboard, "write", { configurable: true, value: async (items: FakeClipboardItem[]) => void written.push(...items) });
  await user.click(screen.getByRole("button", { name: "Copy as table" }));
  await waitFor(() => expect(written).toHaveLength(1));
  const textOf = (blob: Blob) =>
    new Promise<string>((done) => {
      const reader = new FileReader();
      reader.onload = () => done(String(reader.result));
      reader.readAsText(blob);
    });
  const html = await textOf(await written[0].getType("text/html"));
  expect(html).toContain("<table");
  expect(html).toContain(`<a href="${WEB}example.com/book">Book page</a>`);
  expect(html).not.toContain("<caption");
  expect(await textOf(await written[0].getType("text/plain"))).toBe(sheet);
  expect(await screen.findByText("Copied as a table.")).toBeInTheDocument();
  expect(posts(calls)).toHaveLength(0);
});

test("when the browser can't copy a table the person is told, and nothing is marked sent", async () => {
  vi.stubGlobal("ClipboardItem", undefined);
  const user = userEvent.setup();
  const calls = fakeApi(tableRoutes);
  renderApp(<FollowUps />);
  await showTable(user);
  await user.click(screen.getByRole("button", { name: "Copy as table" }));
  expect(await screen.findByText(/Copying was blocked/)).toBeInTheDocument();
  // The table is selected, so the toast is true: it can be copied by hand.
  expect(window.getSelection()?.toString()).toContain("Send the index");
  expect(posts(calls)).toHaveLength(0);
});

test("the two copy buttons are named for where the table goes, with one hint, and Mark sent sits beside them", async () => {
  const user = userEvent.setup();
  const calls = fakeApi(tableRoutes);
  renderApp(<FollowUps />);
  await showTable(user);
  const buttons = screen.getAllByRole("button").map((b) => b.textContent);
  const at = buttons.indexOf("Copy as table");
  expect(buttons.slice(at, at + 3)).toEqual(["Copy as table", "Copy for a spreadsheet", "Mark sent"]);
  expect(screen.getByText(/Copy for a spreadsheet to paste into cells/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Copy as table" }));
  await user.click(screen.getAllByRole("button", { name: "Mark sent" })[0]);
  await waitFor(() => expect(calls.some((c) => c.route === "POST followups/PER-2/mark-sent")).toBe(true));
  expect(await screen.findByText("Marked as sent to Robin Sample")).toBeInTheDocument();
});

test("a link to a person's group opens the list that shows them, with the cursor on their group", async () => {
  const waiting: S["FollowupSection"] = {
    person: "PER-3",
    name: "Quinn Sample",
    is_pm: false,
    questions: [
      { id: "Q-5", title: "Can proof copies ship by Nov 3?", text: "", links: [], kind: "question", status: "sent", sent: "2026-10-12", waiting_days: 6, chase_due: false, chases: 0, about: null, options: [] },
    ],
    actions: [],
    message: "",
    to_send: 0,
  };
  const alsoWaiting: S["FollowupSection"] = { ...waiting, person: "PER-4", name: "Sam Sample", questions: [{ ...waiting.questions[0], id: "Q-6", title: "Is the jacket proof back?" }] };
  fakeApi({ "GET followups": () => [...sections, waiting, alsoWaiting], "GET people": () => [] });
  renderApp(<FollowUps />);
  await screen.findByRole("button", { name: /^Robin Sample/ });
  expect(screen.getByRole("button", { name: "To send" })).toHaveAttribute("aria-pressed", "true");
  const { reveal } = await import("../lib/reveal");
  act(() => {
    expect(reveal("person", "PER-3")).toBe(true);
  });
  const row = await screen.findByRole("listitem", { name: "Quinn Sample" });
  expect(screen.getByRole("button", { name: "Waiting on them" })).toHaveAttribute("aria-pressed", "true");
  // Their line has the cursor and is the one chosen, so their detail stands beside the list.
  await waitFor(() => expect(row).toHaveFocus());
  expect(await screen.findByRole("complementary", { name: "Quinn Sample" })).toBeInTheDocument();
});

const waitingQuestion = (extra: Partial<S["FollowupQuestion"]> = {}): S["FollowupQuestion"] => ({
  id: "Q-7",
  title: "Do we have written permission for the epigraph?",
  text: "",
  links: [],
  kind: "question",
  status: "sent",
  sent: "2026-10-10",
  followed_up: null,
  chases: 0,
  waiting_days: 6,
  chase_due: true,
  about: null,
  options: [],
  ...extra,
});

const nudgeText = "Hi Quinn,\n\nFollowing up on one thing from my note on Sat, Oct 10:\n\nDo we have written permission for the epigraph?\n\nA quick yes or no, or a date, is plenty.\n\nThanks!";
const nudgeSection = (extra: Partial<S["FollowupSection"]> = {}): S["FollowupSection"] => ({
  person: "PER-4",
  name: "Quinn Sample",
  is_pm: false,
  questions: [waitingQuestion()],
  actions: [],
  message: "",
  to_send: 0,
  nudge: { text: nudgeText, round: 1, question_ids: ["Q-7"], action_ids: [] },
  ...extra,
});

const nudgeRoutes = {
  "GET followups": () => [nudgeSection()],
  "GET people": () => [],
  "POST followups/PER-4/followed-up": () => ({ questions: 1, actions: 0, question_ids: ["Q-7"], action_ids: [], on: "2026-10-16", previous_told: {}, signal_at: null }),
  "POST followups/PER-4/unfollow": () => ({ ok: "PER-4" }),
};

test("a person who hasn't answered gets a drafted nudge: the items, the box with the template's text, then Copy and Mark sent", async () => {
  const user = userEvent.setup();
  const calls = fakeApi(nudgeRoutes);
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  await user.click(await screen.findByRole("button", { name: "Draft a nudge" }));
  // The cursor is in the message, and what it lists is above it.
  const box = screen.getByRole("textbox", { name: /Message to Quinn Sample/ });
  expect(box).toHaveFocus();
  expect(box).toHaveValue(nudgeText);
  const card = box.closest("[data-nudge]") as HTMLElement;
  expect(within(card).getByText("Do we have written permission for the epigraph?", { selector: "li *, li" })).toBeInTheDocument();
  expect(within(card).getByText("1st follow-up")).toBeInTheDocument();
  // Copy puts the edited text on the clipboard and records nothing; Mark sent records the text as sent, with Undo.
  await user.type(box, " PS");
  await user.click(within(card).getByRole("button", { name: "Copy" }));
  expect(await navigator.clipboard.readText()).toBe(nudgeText + " PS");
  expect(calls.filter((c) => c.route.startsWith("POST"))).toHaveLength(0);
  await user.click(within(card).getByRole("button", { name: "Mark sent" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST followups/PER-4/followed-up")?.body).toEqual({ text: nudgeText + " PS", question_ids: ["Q-7"], action_ids: [] }));
  expect(await screen.findByText(/Recorded your follow-up with Quinn/)).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST followups/PER-4/unfollow")?.body).toEqual({
      question_ids: ["Q-7"],
      action_ids: [],
      on: "2026-10-16",
      previous_told: {},
      signal_at: null,
    }),
  );
});

test("a second nudge says which follow-up it is, and an item chased before shows when", async () => {
  const user = userEvent.setup();
  fakeApi({
    ...nudgeRoutes,
    "GET followups": () => [
      nudgeSection({
        questions: [waitingQuestion({ chases: 1, followed_up: "2026-10-12" })],
        nudge: { text: "Hi Quinn,\n\nChecking in again.", round: 2, question_ids: ["Q-7"], action_ids: [] },
      }),
    ],
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  await user.click(await screen.findByRole("button", { name: "Draft a nudge" }));
  expect(screen.getByText("2nd follow-up")).toBeInTheDocument();
  expect(screen.getByText(/first asked/)).toBeInTheDocument();
});

test("nothing is offered to draft while nothing has waited long enough", async () => {
  const user = userEvent.setup();
  fakeApi({ ...nudgeRoutes, "GET followups": () => [nudgeSection({ nudge: null, questions: [waitingQuestion({ chase_due: false, chases: 0, waiting_days: 1 })] })] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  await screen.findByRole("heading", { name: "Quinn Sample" });
  expect(screen.queryByRole("button", { name: "Draft a nudge" })).toBeNull();
});

// ---- Later: a question held for a meeting or a day ---------------------------------------------------------------------

function withLater(): S["FollowupSection"][] {
  const held = structuredClone(sections);
  const [first] = held[1].questions;
  held[1].questions = [];
  held[1].later = [{ ...first, id: "Q-1", held_until: "2026-10-20", held_for_name: null }];
  held[1].to_send = 1;
  return held;
}

test("Later lists the questions held for a meeting or a day, per person, and To send does not", async () => {
  const user = userEvent.setup();
  const held = withLater();
  const later = held[1].later ?? [];
  held[1].later = [...later, { ...later[0], id: "Q-5", title: "Is the cover final?", held_until: "2026-10-22", held_for_name: "Print sync" }];
  fakeApi({ "GET followups": () => held, "GET people": () => [] });
  renderApp(<FollowUps />);
  expect((await screen.findByRole("button", { name: /^Robin Sample/ })).closest("li")!).toHaveTextContent("1 to send");
  expect(screen.queryByText("Is the index final?")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Later" }));
  // One person holds all that is for later, so their items stand in place.
  const rows = within(await findInPlace())
    .getAllByRole("listitem")
    .filter((li) => li.parentElement?.tagName === "UL");
  expect(rows[0]).toHaveTextContent(/Is the index final\?/);
  expect(rows[0]).toHaveTextContent(/Waiting until .*20/);
  expect(rows[1]).toHaveTextContent(/Is the cover final\?/);
  expect(rows[1]).toHaveTextContent(/Waiting for Print sync, .*22/);
  expect(screen.queryByRole("button", { name: /Copy/ })).toBeNull();
});

test("Later says so when nothing is held, and Send now brings a question back with Undo", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET followups": () => sections, "GET people": () => [] });
  const { unmount } = renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Later" }));
  expect(screen.getByText(/Nothing is put off until later\./)).toBeInTheDocument();
  unmount();
  const previous = { on: "2026-10-20", since: "2026-10-14" };
  const calls = fakeApi({
    "GET followups": () => withLater(),
    "GET people": () => [],
    "POST questions/Q-1/held-for": () => ({ ok: "Q-1", previous }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Later" }));
  await user.click(await screen.findByRole("button", { name: "More actions for Is the index final?" }));
  await user.click(await screen.findByRole("menuitem", { name: "Send now" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST questions/Q-1/held-for")?.body).toEqual({ held_for: null }));
  expect(await screen.findByText("Brought back to what is left to send.")).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST questions/Q-1/held-for").at(-1)?.body).toEqual({ held_for: previous }));
});

test("Hold for later on a card holds a question for a day, with the cursor in the field, at once and with Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET followups": () => sections,
    "GET people": () => [],
    "GET today/agenda": () => [],
    "POST questions/Q-1/held-for": () => ({ ok: "Q-1", previous: null }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(await screen.findByRole("button", { name: "More actions for Robin Sample" }));
  await user.click(await screen.findByRole("menuitem", { name: "Hold for later…" }));
  const choice = screen.getByRole("combobox", { name: "Hold it for" });
  expect(choice).toHaveFocus();
  const save = screen.getByRole("button", { name: "Hold for later" });
  expect(save).toBeDisabled();
  await user.type(screen.getByLabelText("Send it on"), "2099-01-05");
  expect(save).toBeEnabled();
  await user.click(save);
  await waitFor(() => expect(calls.find((c) => c.route === "POST questions/Q-1/held-for")?.body).toEqual({ held_for: { on: "2099-01-05" } }));
  expect(await screen.findByText(/^Kept for later, until /)).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST questions/Q-1/held-for").at(-1)?.body).toEqual({ held_for: null }));
});

test("Hold for later has one choice for next Monday: a day hold for the coming Monday, at once and with Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET followups": () => sections,
    "GET people": () => [],
    "GET today/agenda": () => [],
    "POST questions/Q-1/held-for": () => ({ ok: "Q-1", previous: null }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(await screen.findByRole("button", { name: "More actions for Robin Sample" }));
  await user.click(await screen.findByRole("menuitem", { name: "Hold for later…" }));
  const choice = screen.getByRole("combobox", { name: "Hold it for" });
  await user.selectOptions(choice, within(await snapshotOf(choice)).getByRole("option", { name: /^Until next Monday, / }));
  expect(screen.queryByLabelText("Send it on")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Hold for later" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST questions/Q-1/held-for")?.body).toEqual({ held_for: { on: nextMonday(new Date()) } }));
  const [y, m, d] = nextMonday(new Date()).split("-").map(Number);
  expect(new Date(y, m - 1, d).getDay()).toBe(1);
  expect(await screen.findByText(/^Kept for later, until /)).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST questions/Q-1/held-for").at(-1)?.body).toEqual({ held_for: null }));
});

test("Hold for later offers the meetings the calendar keeps entries for, a series as its next one, and holds for the one picked", async () => {
  const user = userEvent.setup();
  const meeting = (extra: Partial<S["AgendaItemView"]>): S["AgendaItemView"] => ({
    snapshot: "s", source: "c", title: "Print sync", start: "2026-10-20", all_day: true, cancelled: false, days: ["2026-10-20"], own: true, open_items: 0, entry: "EVT-1", ...extra,
  });
  const calls = fakeApi({
    "GET followups": () => sections,
    "GET people": () => [],
    "GET today/agenda": () => [meeting({ series: "SER-1" }), meeting({ title: "One-off review", entry: "EVT-2", series: null }), meeting({ title: "No entry", entry: null }), meeting({ title: "Called off", entry: "EVT-3", cancelled: true })],
    "POST questions/Q-1/held-for": () => ({ ok: "Q-1", previous: null }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(await screen.findByRole("button", { name: "More actions for Robin Sample" }));
  await user.click(await screen.findByRole("menuitem", { name: "Hold for later…" }));
  const choice = await screen.findByRole("combobox", { name: "Hold it for" });
  await waitFor(async () => expect(within(await snapshotOf(choice)).getAllByRole("option")).toHaveLength(4));
  expect(within(await snapshotOf(choice)).getByRole("option", { name: "Print sync, the next one" })).toBeTruthy();
  expect(within(await snapshotOf(choice)).getByRole("option", { name: /^One-off review, / })).toBeTruthy();
  expect(within(await snapshotOf(choice)).queryByRole("option", { name: /No entry|Called off/ })).toBeNull();
  await user.selectOptions(choice, "series:SER-1");
  expect(screen.queryByLabelText("Send it on")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Hold for later" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST questions/Q-1/held-for")?.body).toEqual({ held_for: { series: "SER-1" } }));
});

const twoQuestions: S["FollowupSection"][] = [
  sections[0],
  {
    ...sections[1],
    questions: [...sections[1].questions, { ...sections[1].questions[0], id: "Q-2", title: "Who signs off the proof?" }],
    to_send: 3,
  },
  sections[2],
];

test("a message with several questions can be held whole: one choice, with the cursor in its field, at once and with Undo", async () => {
  const user = userEvent.setup();
  const previous = [
    { id: "Q-1", held_for: null },
    { id: "Q-2", held_for: null },
  ];
  const calls = fakeApi({
    "GET followups": () => twoQuestions,
    "GET people": () => [],
    "GET today/agenda": () => [],
    "POST followups/PER-2/held-for": () => ({ ok: "PER-2", previous }),
    "POST followups/PER-2/held-for/restore": () => ({ ok: "PER-2" }),
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(await screen.findByRole("button", { name: "More actions for Robin Sample" }));
  await user.click(await screen.findByRole("menuitem", { name: "Hold this message for later…" }));
  // the whole message is held, so no question is picked
  expect(screen.queryByRole("combobox", { name: "Which question" })).toBeNull();
  expect(screen.getByRole("combobox", { name: "Hold it for" })).toHaveFocus();
  const save = screen.getByRole("button", { name: "Hold for later" });
  expect(save).toBeDisabled();
  await user.type(screen.getByLabelText("Send it on"), "2099-01-05");
  await user.click(save);
  await waitFor(() => expect(calls.find((c) => c.route === "POST followups/PER-2/held-for")?.body).toEqual({ held_for: { on: "2099-01-05" } }));
  expect(calls.some((c) => c.route.startsWith("POST questions/"))).toBe(false);
  expect(await screen.findByText(/^Kept for later, until /)).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST followups/PER-2/held-for/restore")?.body).toEqual({ holds: previous }));
});

test("a message with one question offers only the one hold, not a second choice for the whole message", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET followups": () => sections, "GET people": () => [], "GET today/agenda": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: /^Robin Sample/ }));
  await user.click(await screen.findByRole("button", { name: "More actions for Robin Sample" }));
  expect(await screen.findByRole("menuitem", { name: "Hold for later…" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Hold this message for later…" })).toBeNull();
});

// By person or by project (design 7.5): the same open items, grouped under the project each belongs to.

const byProject: S["FollowupSection"][] = [
  sections[0],
  {
    ...sections[1],
    questions: [{ ...sections[1].questions[0], project_name: "Cover" }],
    actions: [{ ...sections[1].actions[0], project_name: "Book" }],
  },
];

test("a switch groups the open items by project, each saying who it is with and where it stands, the ones with no project last", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET followups": () => byProject, "GET people": () => [] });
  renderApp(<FollowUps />);
  expect(await screen.findByRole("radio", { name: "By person" })).toBeChecked();
  await user.click(screen.getByRole("radio", { name: "By project" }));
  const list = await screen.findByRole("list", { name: "Open follow-ups by project" });
  // One line per project, how many are open; the first project is chosen, and its items are in the detail beside the list.
  expect(within(list).getAllByRole("listitem").map((li) => li.getAttribute("aria-label"))).toEqual(["Book", "Cover"]);
  expect(within(list).getByRole("listitem", { name: "Book" })).toHaveTextContent("1 open");
  const book = await screen.findByRole("complementary", { name: "Book" });
  // One anatomy for every line: the words, then who it is with (their name is the button that opens their messages) and where it stands.
  expect(book).toHaveTextContent("Robin Sample · To-do · To send");
  expect(within(book).getByRole("button", { name: "Open Robin Sample's follow-ups" })).toHaveTextContent("Robin Sample");
  expect(within(book).queryByRole("button", { name: "Open" })).toBeNull();
  await user.click(within(list).getByRole("listitem", { name: "Cover" }));
  expect(await screen.findByRole("complementary", { name: "Cover" })).toHaveTextContent("Robin Sample · Question · To send");
  // The same To send / Later / Waiting on them switch as by person stays, and it picks the rows each project holds.
  expect(screen.getByRole("group", { name: "Show" })).toBeInTheDocument();
});

test("by project the To send, Later and Waiting on them switch stays and picks the rows each project lists", async () => {
  const user = userEvent.setup();
  const waiting = structuredClone(byProject);
  waiting[1].questions = [{ ...waiting[1].questions[0], status: "sent", sent: "2026-10-12", waiting_days: 5, chase_due: true, project_name: "Cover" }];
  waiting[1].later = [{ ...waiting[1].questions[0], id: "Q-8", title: "Is the jacket final?", status: "open", held_until: "2026-11-02", project_name: "Jacket" }];
  fakeApi({ "GET followups": () => waiting, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("radio", { name: "By project" }));
  expect(screen.getByRole("button", { name: "To send" })).toHaveAttribute("aria-pressed", "true");
  // Only Book holds anything to send: with one group its items are shown in place.
  expect(await screen.findByRole("heading", { name: "Book", level: 2 })).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Open follow-ups by project" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Waiting on them" }));
  const cover = await screen.findByRole("heading", { name: "Cover", level: 2 });
  expect(cover).toBeInTheDocument();
  expect(document.body).toHaveTextContent("Robin Sample · Question · waiting 5 days · follow up");
  await user.click(screen.getByRole("button", { name: "Later" }));
  expect(await screen.findByRole("heading", { name: "Jacket", level: 2 })).toBeInTheDocument();
  expect(document.body).toHaveTextContent("Robin Sample · Question · Later");
  expect(screen.getByRole("radio", { name: "By project" })).toBeChecked();
});

test("an item with no project is gathered under Not in a project, after the projects, never under No project", async () => {
  const user = userEvent.setup();
  const loose = [{ ...sections[1], questions: [], actions: [{ ...sections[1].actions[0], project_name: "" }] }, sections[2]];
  fakeApi({ "GET followups": () => loose, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("radio", { name: "By project" }));
  const list = await screen.findByRole("list", { name: "Open follow-ups by project" });
  expect(within(list).getAllByRole("listitem").map((li) => li.getAttribute("aria-label"))).toEqual(["Book", "Not in a project"]);
  expect(screen.queryByText("No project")).toBeNull();
});

test("an item filed on a side and in none of its projects is grouped as Not in a project under the side, never as a project", async () => {
  const user = userEvent.setup();
  const onSide = [{ ...sections[1], questions: [], actions: [{ ...sections[1].actions[0], project_name: "", side_name: "Orchard Press" }] }, sections[2]];
  fakeApi({ "GET followups": () => onSide, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("radio", { name: "By project" }));
  const list = await screen.findByRole("list", { name: "Open follow-ups by project" });
  expect(within(list).getAllByRole("listitem").map((li) => li.getAttribute("aria-label"))).toEqual(["Book", "Not in a project"]);
});

test("by project the lines are grouped by side first, each side under its name, then by project", async () => {
  const user = userEvent.setup();
  const orchard = { project: "PRJ-orchard", kind: "business", name: "Orchard Press" };
  const mixed: S["FollowupSection"][] = [
    {
      ...sections[1],
      questions: [{ ...sections[1].questions[0], project_name: "Cider", side: "PRJ-orchard" }],
      actions: [
        { ...sections[1].actions[0], project_name: "Garden", side: "PRJ-personal" },
        { ...sections[1].actions[0], id: "ACT-3", text: "Pick the apples", project_name: "", side_name: "Orchard Press", side: "PRJ-orchard" },
      ],
    },
  ];
  fakeApi({
    "GET followups": () => mixed,
    "GET people": () => [],
    "GET setup/business": () => ({ business: true, name: orchard.name, personal: "PRJ-personal", sides: [orchard], chosen: "work" }),
    "GET projects": () => [],
  });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("radio", { name: "By project" }));
  // Personal first, then the side; each side's projects under its own heading, the one in none of them last.
  const personal = await screen.findByRole("list", { name: "Personal" });
  expect(within(personal).getAllByRole("listitem").map((li) => li.getAttribute("aria-label"))).toEqual(["Garden"]);
  const side = screen.getByRole("list", { name: "Orchard Press" });
  expect(within(side).getAllByRole("listitem").map((li) => li.getAttribute("aria-label"))).toEqual(["Cider", "Not in a project"]);
  const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(headings.indexOf("Personal")).toBeLessThan(headings.indexOf("Orchard Press"));
  expect(screen.queryByText("No project")).toBeNull();
});

test("with only one group its items show in place, not as a list beside a pane that holds everything", async () => {
  const asked: S["FollowupSection"] = {
    ...sections[1],
    questions: [{ ...sections[1].questions[0], id: "Q-4", title: "Which printer do we use?", kind: "question", about: null }],
    actions: [],
    to_send: 1,
  };
  fakeApi({ "GET followups": () => [asked], "GET people": () => [] });
  renderApp(<FollowUps />);
  expect(await screen.findByRole("heading", { name: "Robin Sample", level: 2 })).toBeInTheDocument();
  expect(await screen.findByText("Which printer do we use?")).toBeInTheDocument();
  // No list of one line, and no pane.
  expect(screen.queryByRole("listitem", { name: "Robin Sample" })).toBeNull();
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(document.querySelector("[data-in-place]")).not.toBeNull();
});

test("a link to the only group's items puts the cursor on its heading", async () => {
  const waiting: S["FollowupSection"] = { ...waitingSections()[0] };
  fakeApi({ "GET followups": () => [waiting], "GET people": () => [] });
  renderApp(<FollowUps />);
  await screen.findByText(/Nothing left to send/);
  const { reveal } = await import("../lib/reveal");
  act(() => {
    expect(reveal("person", "PER-2")).toBe(true);
  });
  const heading = await screen.findByRole("heading", { name: "Robin Sample", level: 2 });
  await waitFor(() => expect(heading).toHaveFocus());
});

test("a row's Open goes to that person's group, on the list that holds what is waiting on them", async () => {
  const user = userEvent.setup();
  const sent = structuredClone(byProject);
  sent[1].questions = [{ ...sent[1].questions[0], status: "sent", sent: "2026-10-12", waiting_days: 5, chase_due: true }];
  sent[1].actions = [];
  sent[1].to_send = 0;
  fakeApi({ "GET followups": () => sent, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("radio", { name: "By project" }));
  await user.click(screen.getByRole("button", { name: "Waiting on them" }));
  await user.click((await screen.findAllByRole("button", { name: "Open Robin Sample's follow-ups" }))[0]);
  expect(screen.getByRole("radio", { name: "By person" })).toBeChecked();
  expect(await screen.findByRole("heading", { name: "Robin Sample" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Waiting on them" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("list", { name: "Open follow-ups by project" })).toBeNull();
});

test("with no side besides Personal the follow-ups are by person only: there is no switch to group by project", async () => {
  fakeApi({
    "GET followups": () => byProject,
    "GET people": () => [],
    "GET setup/business": () => ({ business: false, name: null, personal: "PRJ-personal", sides: [], chosen: "me" }),
    "GET projects": () => [{ id: "PRJ-personal", name: "Personal", group: null, status: null, phase: null, target: null, owner: null, owner_name: null, summary: null, language: "en-US", language_own: false, role: "run", completed: false, spent_usd: 0, open_actions: 0, open_questions: 0, no_end: true }],
  });
  renderApp(<FollowUps />);
  await screen.findByRole("heading", { name: "Robin Sample", level: 2 });
  await waitFor(() => expect(screen.queryByRole("radiogroup", { name: "Group by" })).toBeNull());
  await waitFor(() => expect(screen.queryByRole("radio", { name: "By project" })).toBeNull());
  await waitFor(() => expect(screen.queryByRole("radio", { name: "By person" })).toBeNull());
  // The person filters stay.
  expect(screen.getByRole("group", { name: "Show" })).toBeInTheDocument();
});

test("on Today the switch is not shown", async () => {
  fakeApi({ "GET followups": () => byProject, "GET people": () => [] });
  renderApp(<FollowUps compact />);
  await screen.findByRole("button", { name: /^Robin Sample/ });
  expect(screen.queryByRole("radio", { name: "By project" })).toBeNull();
});

// ---- an ask that is an action: its project with the project it is part of, its notes, and Reassign (roadmap B-6a) -----------

function detailedSections(): S["FollowupSection"][] {
  const waiting = waitingSections();
  Object.assign(waiting[0].actions[0], {
    parent_name: "Upper Shelf",
    notes: "Ask about the paper too",
    version: 4,
    owners: [{ person: "PER-2", name: "Robin Sample" }],
  });
  return waiting;
}

const reassignRoutes = {
  "GET people": () => [
    { id: "PER-1", name: "Pat Example", status: "active" },
    { id: "PER-2", name: "Robin Sample", status: "active" },
    { id: "PER-3", name: "Sam Twin", status: "active" },
  ],
  "POST records/edit": () => ({ changeset: "CS-1" }),
  "POST changesets/CS-1/undo": () => ({ restored: [0], skipped: [] }),
};

test("a waiting ask that is an action names its project with the project it is part of", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET followups": () => detailedSections(), ...reassignRoutes });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  expect(within(row).getByText("Upper Shelf › Book")).toBeInTheDocument();
  // Its date is said in words with the day it was sent; whether that date is past depends on the day the test runs.
  expect(row).toHaveTextContent(/Upper Shelf › Book · (due|overdue since) .*Oct 16 · sent Fri, Oct 9/);
});

test("an ask's notes are on hover, on focus and to a screen reader; an ask with none has neither", async () => {
  const user = userEvent.setup();
  const found = detailedSections();
  found[0].actions.push({ ...found[0].actions[0], id: "ACT-2", text: "Order the copies", notes: null });
  fakeApi({ "GET followups": () => found, ...reassignRoutes });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  const title = within(row).getByText("Send the index");
  expect(title.closest("[title]")).toHaveAttribute("title", "Ask about the paper too");
  // Focus on the row reads the notes: the row's words point at a description a screen reader reads.
  const described = title.closest("[aria-describedby]")!.getAttribute("aria-describedby")!;
  expect(document.getElementById(described)).toHaveTextContent("Ask about the paper too");
  const plain = screen.getByText("Order the copies").closest("li") as HTMLElement;
  expect(plain.querySelector("[title]")).toBeNull();
});

test("on a phone the notes are a second line, as there is no hover", async () => {
  document.documentElement.setAttribute("data-narrow", "");
  try {
    const user = userEvent.setup();
    fakeApi({ "GET followups": () => detailedSections(), ...reassignRoutes });
    renderApp(<FollowUps />);
    await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
    const line = await screen.findByText("Ask about the paper too");
    expect(line).toBeVisible();
    expect(line.closest("[title]")).toBeNull();
  } finally {
    document.documentElement.removeAttribute("data-narrow");
  }
});

test("Reassign on a waiting ask picks a person from a list, changes the owner and offers Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({ "GET followups": () => detailedSections(), ...reassignRoutes });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  await user.click(within(row).getByRole("button", { name: "More actions for Send the index" }));
  await user.click(await screen.findByRole("menuitem", { name: "Reassign…" }));
  const picker = await screen.findByRole("combobox", { name: "Reassign to" });
  await waitFor(() => expect(picker).toHaveFocus());
  await user.selectOptions(picker, "PER-3");
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST records/edit")?.body).toEqual({
      kind: "action",
      id: "ACT-1",
      read_version: 4,
      fields: { owners: [{ person: "PER-3" }] },
    }),
  );
  expect(await screen.findByText("Reassigned to Sam Twin.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-1/undo")).toBe(true));
});

test("on a shared ask, Reassign changes the part of the person whose message it is and leaves the other owners", async () => {
  const user = userEvent.setup();
  const found = detailedSections();
  found[0].actions[0].owners = [
    { person: "PER-2", name: "Robin Sample" },
    { person: "PER-1", name: "Pat Example" },
  ];
  const calls = fakeApi({ "GET followups": () => found, ...reassignRoutes });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const row = screen.getByText("Send the index").closest("li") as HTMLElement;
  await user.click(within(row).getByRole("button", { name: "More actions for Send the index" }));
  await user.click(await screen.findByRole("menuitem", { name: "Reassign…" }));
  expect(screen.queryByRole("combobox", { name: /Whose part/ })).toBeNull();
  await user.selectOptions(await screen.findByRole("combobox", { name: "Reassign to" }), "PER-3");
  await waitFor(() =>
    expect((calls.find((c) => c.route === "POST records/edit")?.body as { fields: unknown }).fields).toEqual({
      owners: [{ person: "PER-3" }, { person: "PER-1" }],
    }),
  );
});

test("a person chosen while what waits to go out is still loading stays chosen when it arrives", async () => {
  besidePane();
  type Acts = { acts: ReturnType<typeof actFixture>[] };
  let release: (value: Acts) => void = () => undefined;
  fakeApi({
    "GET followups": () => sections,
    "GET people": () => [],
    "GET acts": () => new Promise<Acts>((resolve) => (release = resolve)),
  });
  renderApp(<FollowUps />);
  const robin = await screen.findByRole("listitem", { name: "Robin Sample" });
  await userEvent.click(within(robin).getByRole("button", { name: /^Robin Sample/ }));
  expect(await screen.findByRole("complementary", { name: "Robin Sample" })).toBeInTheDocument();
  await act(async () => release({ acts: [] }));
  await waitFor(() => expect(screen.queryByRole("complementary", { name: "Your own to-dos" })).toBeNull());
  expect(screen.getByRole("complementary", { name: "Robin Sample" })).toBeInTheDocument();
});

// ---- a link that came from an email says so before it is opened (design 7.7) --------------------------------------------

test("a question's link that came from an email says so beside the link, and one the person wrote does not", async () => {
  const link = [{ label: "The portal", url: `${WEB}example.com/pay` }];
  const question = (id: string, title: string, from_outside: boolean) => ({ id, title, text: "", links: link, kind: "question", status: "open", sent: null, waiting_days: null, chase_due: false, chases: 0, about: null, options: [], from_outside });
  fakeApi({ "GET people": () => [] });
  renderApp(
    <ol>
      <DecisionRow question={question("Q-8", "Pay the printer?", true) as S["FollowupQuestion"]} reveal={0} />
      <DecisionRow question={question("Q-9", "Book the room?", false) as S["FollowupQuestion"]} reveal={0} />
    </ol>,
  );
  await screen.findByText("Pay the printer?");
  const rows = screen.getAllByRole("listitem").filter((r) => r.hasAttribute("data-item"));
  const asked = rows.filter((r) => r.textContent?.includes("Pay the printer?"));
  const own = rows.filter((r) => r.textContent?.includes("Book the room?"));
  expect(asked.some((r) => within(r).queryByText("From an email; check the address before you open it."))).toBe(true);
  expect(own.length).toBeGreaterThan(0);
  expect(own.every((r) => within(r).queryByText("From an email; check the address before you open it.") === null)).toBe(true);
});

// What is due soon (design 7.5): at the top of a person's group on every tab, so a date on another tab is never out of sight.

/** Robin with a message to send and a to-do already told to them that is overdue (so it is on Waiting on them, not on this tab). */
function dueElsewhere(): S["FollowupSection"][] {
  const robin = structuredClone(sections[1]);
  robin.actions = [
    { ...robin.actions[0], id: "ACT-1", text: "Send the index", due: "2020-10-14", told: "2020-10-09", to_send: false, told_days: 5, chase_due: true, due_soon: true },
  ];
  return [robin];
}

test("a to-do due soon that sits on Waiting on them is listed at the top of the person's group while To send is open, with its own primary", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({ "GET followups": () => dueElsewhere(), "GET people": () => [], ...finishRoutes });
  renderApp(<FollowUps />);
  const band = await screen.findByRole("heading", { name: "1 due soon" });
  const row = within(band.closest("[data-due-soon]") as HTMLElement).getByText("Send the index").closest("li") as HTMLElement;
  expect(row).toHaveTextContent("overdue since");
  // The same primary as on its own tab, and it acts at once.
  await user.click(within(row).getByRole("button", { name: "Followed up" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST followups/PER-2/actions/ACT-1/followed-up")).toBe(true));
  // The message to send is still there below it.
  expect(screen.getAllByRole("button", { name: "Copy message" }).length).toBeGreaterThan(0);
});

test("a to-do that is not sent yet and is due soon is listed while Waiting on them is open, and Show message opens the message", async () => {
  const user = userEvent.setup();
  const robin = structuredClone(sections[1]);
  robin.questions = [{ ...robin.questions[0], id: "Q-2", status: "sent", sent: "2026-10-08", waiting_days: 2 }];
  robin.actions = [{ ...robin.actions[0], id: "ACT-2", text: "Order the signs", due: "2020-10-14", to_send: true, due_soon: true }];
  fakeApi({ "GET followups": () => [robin], "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  const band = (await screen.findByRole("heading", { name: "1 due soon" })).closest("[data-due-soon]") as HTMLElement;
  expect(within(band).getByText("Order the signs")).toBeInTheDocument();
  await user.click(within(band).getByRole("button", { name: "Show message to Robin Sample" }));
  expect(screen.getByRole("button", { name: "To send" })).toHaveAttribute("aria-pressed", "true");
  expect(await screen.findByRole("textbox", { name: /Message to Robin Sample/ })).toBeInTheDocument();
  // On its own tab it is in the message, not in a band.
  expect(screen.queryByRole("heading", { name: /due soon/ })).toBeNull();
});

test("a sent to-do that is due soon but whose follow-up is not due waits on the other person, so it is not in the band (X89)", async () => {
  const sentOnly = dueElsewhere();
  sentOnly[0].actions = sentOnly[0].actions.map((a) => ({ ...a, chase_due: false }));
  fakeApi({ "GET followups": () => sentOnly, "GET people": () => [] });
  renderApp(<FollowUps />);
  await screen.findByRole("button", { name: "Copy message" });
  expect(screen.queryByRole("heading", { name: /due soon/ })).toBeNull();
  expect(screen.queryByText("Send the index")).toBeNull();
});

test("a to-do already listed on the open tab is not repeated in the band, and with nothing due soon there is no band", async () => {
  const user = userEvent.setup();
  const waiting = waitingSections();
  waiting[0].actions[0].due_soon = true;
  fakeApi({ "GET followups": () => waiting, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Waiting on them" }));
  await findInPlace();
  expect(screen.queryByRole("heading", { name: /due soon/ })).toBeNull();
  cleanup();
  fakeApi({ "GET followups": () => [{ ...dueElsewhere()[0], actions: dueElsewhere()[0].actions.map((a) => ({ ...a, due_soon: false })) }], "GET people": () => [] });
  renderApp(<FollowUps />);
  await screen.findByRole("button", { name: "Copy message" });
  expect(screen.queryByRole("heading", { name: /due soon/ })).toBeNull();
});

test("by project, what is due soon on another tab opens the project's detail, with the same person link as its other rows", async () => {
  const user = userEvent.setup();
  const robin = dueElsewhere()[0];
  robin.actions[0].project_name = "Book";
  robin.questions = [{ ...robin.questions[0], project_name: "Book" }];
  fakeApi({ "GET followups": () => [robin], "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("radio", { name: "By project" }));
  const band = (await screen.findByRole("heading", { name: "1 due soon" })).closest("[data-due-soon]") as HTMLElement;
  expect(within(band).getByText("Send the index")).toBeInTheDocument();
  expect(band).toHaveTextContent(/Robin Sample · (To-do|Question) · overdue since/);
  expect(within(band).getByRole("button", { name: "Open Robin Sample's follow-ups" })).toHaveTextContent("Robin Sample");
  // Its own tab is Waiting on them: there it is listed once, in the project's items.
  await user.click(screen.getByRole("button", { name: "Waiting on them" }));
  await screen.findByRole("heading", { name: "Book", level: 2 });
  expect(screen.queryByRole("heading", { name: /due soon/ })).toBeNull();
});

test("each draft says which mailbox it is sent from: a list to pick from when several can send, starting on the conversation's own", async () => {
  const user = userEvent.setup();
  const several = sections.map((s) => (s.person === "PER-2" ? { ...s, send_from: ["alex@example.com", "blake@example.com", "casey@example.com"], send_from_default: "blake@example.com" } : s.person === "PER-9" ? { ...s, send_from: ["alex@example.com"], send_from_default: "alex@example.com" } : s));
  fakeApi({ "GET followups": () => several, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Robin Sample" }));
  const pane = await findPane();
  const pick = within(pane).getByRole("combobox", { name: "Send to Robin Sample from" });
  expect(within(await snapshotOf(pick)).getAllByRole("option").map((o) => o.textContent)).toEqual(["alex@example.com", "blake@example.com", "casey@example.com"]);
  expect(pick).toHaveValue("blake@example.com");
  // The pick is remembered for that person on this browser.
  await user.selectOptions(pick, "casey@example.com");
  expect(window.localStorage.getItem("cockpit:followups:send-from:PER-2")).toBe("casey@example.com");
  // Where one mailbox can send it is named, with nothing to pick.
  await user.click(screen.getByRole("button", { name: "Tess Example" }));
  const second = await findPane();
  expect(within(second).queryByRole("combobox", { name: /Send to/ })).toBeNull();
  expect(within(second).getByText("Send it from alex@example.com.")).toBeInTheDocument();
});

test("a draft with no mailbox to name says nothing about one", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET followups": () => sections, "GET people": () => [] });
  renderApp(<FollowUps />);
  await user.click(await screen.findByRole("button", { name: "Robin Sample" }));
  const pane = await findPane();
  expect(within(pane).queryByText(/Send it from/)).toBeNull();
  expect(within(pane).queryByRole("combobox", { name: /Send to/ })).toBeNull();
});

test("a tab that holds nothing shows no side counts and no grouping switch, and a short list has no filter bar", async () => {
  setFilterBarMin(FILTER_BAR_MIN);
  const user = userEvent.setup();
  const orchard = { project: "PRJ-orchard", kind: "business", name: "Orchard Press" };
  fakeApi({
    "GET followups": () => sections,
    "GET people": () => [],
    "GET setup/business": () => ({ business: true, name: orchard.name, personal: "PRJ-personal", sides: [orchard], chosen: "work" }),
    "GET waiting": () => ({ changed: { total: 0 }, followups: { total: 4, sides: [{ side: "PRJ-orchard", count: 4 }] }, handled: { total: 0 }, open: { total: 0 } }),
    "GET projects": () => [],
  });
  renderApp(<FollowUps />);
  await screen.findByRole("button", { name: /^To send/ });
  // The few follow-ups on the first tab are fewer than the bar's minimum, so no side counts and no grouping switch are drawn.
  expect(screen.queryByRole("radio", { name: /Orchard Press/ })).toBeNull();
  expect(screen.queryByRole("radio", { name: "By project" })).toBeNull();
  await user.click(screen.getByRole("button", { name: /^Later/ }));
  expect(screen.queryByRole("radio", { name: /waiting/ })).toBeNull();
});
