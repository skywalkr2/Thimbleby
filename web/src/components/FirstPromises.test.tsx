import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { day } from "../lib/dates";
import { RestartProvider } from "../lib/restart";
import { fakeApi, Refuse, renderApp, setupStep, setupView, statusFixture } from "../test-utils";
import { FirstPromises } from "./FirstPromises";
import { MissedOneProvider } from "./MissedOne";
import { Walkthrough } from "./Walkthrough";

// The walkthrough's first result (design 7.8): once a mailbox is connected and an AI account is chosen it offers the look
// back over the person's own mail with its estimate first; after their Go it lists a handful of the open promises found
// with one follow-up ready to copy; with none found it says what was read and offers "Hand something in" and "Missed one".

const view = (over: Partial<S["FirstPromisesView"]> = {}): S["FirstPromisesView"] => ({
  stage: "ready",
  sources: ["Your inbox"],
  days: 14,
  count: 0,
  finished: 0,
  unpriced: 0,
  promises: [],
  more: 0,
  coverage: [],
  complete: true,
  messages_read: 0,
  meetings_week: 0,
  ...over,
});

const folder = (name: string, over: Partial<S["FirstFolder"]> = {}): S["FirstFolder"] => ({ source: name.toLowerCase(), name, sent: false, outcome: "read", ...over });
const place = (folders: S["FirstFolder"][], over: Partial<S["FirstPlace"]> = {}): S["FirstPlace"] => ({ kind: "mail", account: "work@example.com", folders, missing_sent: false, ...over });

const promise = (id: string, over: Partial<S["FirstPromise"]> = {}): S["FirstPromise"] => ({
  action: id,
  text: `Promise ${id}`,
  owner: "Ana Example",
  mine: false,
  promised_to: [],
  ...over,
});

const noop = () => undefined;

function show(
  first: S["FirstPromisesView"],
  routes: Parameters<typeof fakeApi>[0] = {},
  go: (screen: S["WalkthroughView"]["step"]) => void = noop,
  handIn: () => void = noop,
) {
  const calls = fakeApi({ "GET setup/first-promises": () => first, ...routes });
  const rendered = renderApp(
    <MissedOneProvider>
      <FirstPromises go={go} onHandIn={handIn} />
    </MissedOneProvider>,
  );
  return Object.assign(calls, { client: rendered.client });
}

describe("the offer", () => {
  const offer = view({ stage: "offer", count: 12, days: 14, estimate_usd: 0.3 });

  test("it names the days of mail and the items, says about what it costs, and reads nothing before Start", async () => {
    const calls = show(offer);
    expect(await screen.findByRole("heading", { level: 3, name: "Look back over the last 14 days of your own mail" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("12 items to look over. About $0.30 in all. Nothing is read by the assistant until you press Start.");
    expect(calls.filter((c) => c.route === "POST setup/first-promises/go")).toHaveLength(0);
  });

  test("the cost says less than a cent for nothing priced, and the plan's allowance when it has no price", async () => {
    show(view({ ...offer, estimate_usd: 0 }));
    expect(await screen.findByText(/Less than a cent in all\./i)).toBeInTheDocument();
  });

  test("with no price it says it uses the plan's allowance", async () => {
    show(view({ ...offer, estimate_usd: null, unpriced: 12 }));
    expect(await screen.findByText(/It uses your plan's allowance\./)).toBeInTheDocument();
  });

  test("Start starts it once, and the screen then says how far it is", async () => {
    const user = userEvent.setup();
    let stage: S["FirstPromisesView"] = offer;
    const calls = show(offer, {
      "GET setup/first-promises": () => stage,
      "POST setup/first-promises/go": () => {
        stage = view({ stage: "working", count: 12, finished: 3 });
        return { started: 12 };
      },
    });
    await user.click(await screen.findByRole("button", { name: "Start" }));
    expect(await screen.findByText("Looking over your mail: 3 of 12 done.")).toBeInTheDocument();
    expect(calls.filter((c) => c.route === "POST setup/first-promises/go")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  test("a single day of mail and a source with no mail read plainly", async () => {
    show(view({ ...offer, days: 1, count: 1 }));
    expect(await screen.findByRole("heading", { level: 3, name: "Look back over the last day of your own mail" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 item to look over.");
  });
});

describe("before the offer", () => {
  test("with no AI account it points back to the account screen", async () => {
    const user = userEvent.setup();
    const go = vi.fn();
    show(view({ stage: "no_ai" }), {}, go);
    expect(await screen.findByText(/Choose an AI account first/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Go to your AI account" }));
    expect(go).toHaveBeenCalledWith("ai");
  });

  test("with no mail the main action is to hand something in, and the way back to mail is the quieter one", async () => {
    const user = userEvent.setup();
    const go = vi.fn();
    const handIn = vi.fn();
    show(view({ stage: "no_mail" }), {}, go, handIn);
    expect(await screen.findByText(/hand it something to read/)).toBeInTheDocument();
    expect(screen.queryByText(/Connect your mail first/)).toBeNull();
    const main = screen.getByRole("button", { name: "Hand something in to see what it does" });
    const mail = screen.getByRole("button", { name: "Go to mail and calendar" });
    expect(main.className).toMatch(/_primary/);
    expect(mail.className).not.toMatch(/_primary/);
    await user.click(main);
    expect(handIn).toHaveBeenCalledTimes(1);
    await user.click(mail);
    expect(go).toHaveBeenCalledWith("mail");
  });

  test("before the first read it says it is reading", async () => {
    show(view({ stage: "reading" }));
    expect(await screen.findByText("Reading your mail. This takes a few seconds.")).toBeInTheDocument();
  });
});

describe("what was found", () => {
  const found = view({
    promises: [
      promise("ACT-1", { text: "Send the floor plan", owner: "Ana Example", promised_to: ["Casey Example"], due: "2026-11-02", quote: "I'll send the floor plan" }),
      promise("ACT-2", { text: "Book the room", mine: true }),
    ],
    more: 2,
    follow_up: { person: "PER-2", name: "Ana Example", message: "Hi Ana,\n\nSend the floor plan.\n\nThanks!", to_send: 1 },
  });

  test("it lists the promises, each with who owes it, to whom, its day and the words it came from", async () => {
    show(found);
    const list = await screen.findByRole("list", { name: "Promises found" });
    const first = within(list).getByText("Send the floor plan").closest("li") as HTMLElement;
    expect(first).toHaveTextContent("Owed by Ana Example");
    expect(first).toHaveTextContent("Promised to Casey Example");
    expect(first).toHaveTextContent("Due");
    expect(first).toHaveTextContent("From: “I'll send the floor plan”");
    const second = within(list).getByText("Book the room").closest("li") as HTMLElement;
    expect(second).toHaveTextContent("You owe this");
    expect(second).not.toHaveTextContent("Owed by");
    expect(screen.getByText("2 more promises are kept. They show on Today when they need you.")).toBeInTheDocument();
  });

  test("one follow-up is ready: Copy puts the message on the clipboard, then Mark sent keeps it as copied", async () => {
    const user = userEvent.setup();
    const calls = show(found, { "POST followups/PER-2/mark-sent": () => ({ questions: 0, actions: 1, question_ids: [], action_ids: ["ACT-1"] }) });
    const section = await screen.findByRole("region", { name: "One follow-up is ready" });
    expect(within(section).getByLabelText("Message to Ana Example")).toHaveValue("Hi Ana,\n\nSend the floor plan.\n\nThanks!");
    await user.click(within(section).getByRole("button", { name: "Copy message" }));
    expect(await navigator.clipboard.readText()).toBe("Hi Ana,\n\nSend the floor plan.\n\nThanks!");
    // Copying alone keeps nothing on the server.
    expect(calls.filter((c) => c.route === "POST followups/PER-2/mark-sent")).toHaveLength(0);
    await user.click(within(section).getByRole("button", { name: "Mark sent" }));
    await waitFor(() => expect(calls.find((c) => c.route === "POST followups/PER-2/mark-sent")?.body).toEqual({ text: "Hi Ana,\n\nSend the floor plan.\n\nThanks!" }));
    expect(await screen.findByText("Marked as sent to Ana Example")).toBeInTheDocument();
  });

  test("the message can be edited first, and the edited words are the ones copied", async () => {
    const user = userEvent.setup();
    show(found);
    const box = await screen.findByLabelText("Message to Ana Example");
    await user.type(box, " PS");
    await user.click(screen.getByRole("button", { name: "Copy message" }));
    expect(await navigator.clipboard.readText()).toBe("Hi Ana,\n\nSend the floor plan.\n\nThanks! PS");
  });

  test("when the browser blocks the copy nothing is marked and Copy stays", async () => {
    const user = userEvent.setup();
    const calls = show(found);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("blocked"));
    await user.click(await screen.findByRole("button", { name: "Copy message" }));
    expect(await screen.findByText(/Copying was blocked/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy message" })).toBeInTheDocument();
    expect(calls.filter((c) => c.route.startsWith("POST"))).toHaveLength(0);
  });

  test("with promises but nobody to follow up with, the list shows and no follow-up is offered", async () => {
    show(view({ promises: [promise("ACT-2", { mine: true })] }));
    expect(await screen.findByRole("list", { name: "Promises found" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "One follow-up is ready" })).toBeNull();
    expect(screen.queryByText(/more promise/)).toBeNull();
  });

  test("with none found it says what was read, the meetings this week and that nothing was promised", async () => {
    show(view({ messages_read: 7, meetings_week: 2, coverage: [place([folder("Inbox"), folder("Sent", { sent: true })])] }));
    expect(await screen.findByText("7 messages read, 2 meetings this week, nothing you promised.")).toBeInTheDocument();
  });

  test("one message and one meeting read in the singular", async () => {
    show(view({ messages_read: 1, meetings_week: 1, coverage: [place([folder("Inbox")])] }));
    expect(await screen.findByText("1 message read, 1 meeting this week, nothing you promised.")).toBeInTheDocument();
  });

  test("with none found it offers Hand something in, which opens the hand-in box, and says what it is for", async () => {
    const user = userEvent.setup();
    const handIn = vi.fn();
    show(view({ messages_read: 7, coverage: [place([folder("Inbox")])] }), {}, noop, handIn);
    await user.click(await screen.findByRole("button", { name: "Hand something in to see what it does" }));
    expect(handIn).toHaveBeenCalledTimes(1);
  });

  test("with promises found there is no Hand something in and no count of what was read", async () => {
    show(view({ promises: [promise("ACT-2", { mine: true })], messages_read: 7, coverage: [place([folder("Inbox")])] }));
    await screen.findByRole("list", { name: "Promises found" });
    expect(screen.queryByRole("button", { name: /Hand something in/ })).toBeNull();
    expect(screen.queryByText(/nothing you promised/)).toBeNull();
  });

  test("with none found it says so plainly and offers Missed one, which opens its form", async () => {
    const user = userEvent.setup();
    show(view());
    expect(await screen.findByText("No open promises found in the mail it looked over.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Promises found" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Missed something?" }));
    expect(await screen.findByRole("dialog", { name: "Report something missed" })).toBeInTheDocument();
  });
});

describe("what it reads", () => {
  const from = "2026-10-05";
  const planned = view({
    stage: "offer",
    count: 4,
    days: 14,
    complete: true,
    coverage: [place([folder("Inbox", { from_date: from }), folder("Sent", { sent: true, from_date: from })])],
  });
  const dated = day(from);

  test("before the Start it names the account, each folder and the day it reads from, one row each", async () => {
    show(planned);
    const list = await screen.findByRole("list", { name: "What it will read" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([`Your mail at work@example.com: Inbox, from ${dated}`, `Your mail at work@example.com: Sent, from ${dated}`]);
    expect(screen.queryByRole("button", { name: "Choose the Sent folder" })).toBeNull();
  });

  test("a mailbox folder that differs from its name is named beside it; a source with no known account says only mail", async () => {
    show(view({ ...planned, coverage: [place([folder("Work mail", { folder: "Sent Items", from_date: from })], { account: null })] }));
    expect(await screen.findByText(`Your mail: Work mail (folder Sent Items), from ${dated}`)).toBeInTheDocument();
  });

  const missingSent = view({ ...planned, complete: false, coverage: [place([folder("Inbox", { from_date: from })], { missing_sent: true })] });

  test("the screen never goes looking for a sent folder: the server reads it when the mailbox is connected", async () => {
    const calls = show(missingSent);
    await screen.findByRole("list", { name: "What it will read" });
    expect(calls.filter((c) => c.route.startsWith("POST"))).toHaveLength(0);
  });

  test("where no sent folder could be found, the line says what can't be found and offers choosing it", async () => {
    show(missingSent);
    expect(await screen.findByText("The mail you sent from work@example.com isn't being read, so promises you made in it can't be found until you add its Sent folder.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Choose the Sent folder" })).toBeInTheDocument();
  });

  describe("choosing the Sent folder opens the picker in place, with the likeliest folder first, and the screen stays where it is", () => {
    const folders = (over: Partial<S["MailFoldersView"]>): S["MailFoldersView"] => ({ folders: [], sent: null, taken: ["INBOX"], listed: true, ...over });

    test("a mailbox lists its own folders: the one the server marks, then those named for sent mail, first", async () => {
      const user = userEvent.setup();
      const calls = show(missingSent, {
        "GET watch/inbox/folders": () => folders({ folders: ["Archive", "INBOX", "Notes", "Sent Items"], sent: "Sent Items" }),
        "GET settings": () => ({ items: [], fingerprint: "f1" }),
        "POST watch/inbox/sent-folder": () => ({ changes: [], fingerprint: "f2", needs_restart: false }),
      });
      await user.click(await screen.findByRole("button", { name: "Choose the Sent folder" }));
      const pick = await screen.findByRole("combobox", { name: "Folder of the mail you sent" });
      expect(within(pick).getAllByRole("option").map((o) => o.textContent)).toEqual(["Sent Items", "Archive", "Notes"]);
      expect(pick).toHaveValue("Sent Items");
      await user.click(screen.getByRole("button", { name: "Read it too" }));
      await waitFor(() => expect(calls.some((c) => c.route === "POST watch/inbox/sent-folder")).toBe(true));
      expect(calls.find((c) => c.route === "POST watch/inbox/sent-folder")!.body).toEqual({ folder: "Sent Items", label: "Inbox, sent", fingerprint: "f1" });
      // No message is raised and nothing navigates: the picker closes and the screen is where it was.
      await waitFor(() => expect(screen.queryByRole("combobox", { name: "Folder of the mail you sent" })).toBeNull());
      expect(screen.queryByRole("region", { name: "Notifications" })?.textContent ?? "").not.toMatch(/Saved/);
    });

    test("an add-on's mail can't be asked for its folders: the usual names come first and another can be typed", async () => {
      const user = userEvent.setup();
      const calls = show(missingSent, {
        "GET watch/inbox/folders": () => folders({ folders: ["Sent", "Sent Items", "Sent Mail"], sent: "Sent", listed: false }),
        "GET settings": () => ({ items: [], fingerprint: "f1" }),
        "POST watch/inbox/sent-folder": () => ({ changes: [], fingerprint: "f2", needs_restart: false }),
      });
      await user.click(await screen.findByRole("button", { name: "Choose the Sent folder" }));
      const box = await screen.findByRole("combobox", { name: "Folder of the mail you sent" });
      expect(box).toHaveValue("Sent");
      expect(box.getAttribute("list")).toBeTruthy();
      expect(Array.from(document.getElementById(box.getAttribute("list")!)!.querySelectorAll("option")).map((o) => o.getAttribute("value"))).toEqual(["Sent", "Sent Items", "Sent Mail"]);
      await user.clear(box);
      expect(screen.getByRole("button", { name: "Read it too" })).toBeDisabled();
      await user.type(box, "Outbox");
      await user.click(screen.getByRole("button", { name: "Read it too" }));
      await waitFor(() => expect(calls.find((c) => c.route === "POST watch/inbox/sent-folder")?.body).toMatchObject({ folder: "Outbox" }));
    });

    test("a refusal is said in words beside the picker, which stays open", async () => {
      const user = userEvent.setup();
      show(missingSent, {
        "GET watch/inbox/folders": () => folders({ folders: ["Sent"], sent: "Sent", listed: false }),
        "GET settings": () => ({ items: [], fingerprint: "f1" }),
        "POST watch/inbox/sent-folder": () => new Refuse(400, "Choose a folder that isn't read yet."),
      });
      await user.click(await screen.findByRole("button", { name: "Choose the Sent folder" }));
      await screen.findByRole("combobox", { name: "Folder of the mail you sent" });
      await user.click(screen.getByRole("button", { name: "Read it too" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Choose a folder that isn't read yet.");
      expect(screen.getByRole("combobox", { name: "Folder of the mail you sent" })).toBeInTheDocument();
    });

    test("a picker opened while the first run is working stays open, with what was picked, when the run finishes and the screen is drawn again", async () => {
      const user = userEvent.setup();
      const coverage = [place([folder("Inbox", { from_date: from })], { missing_sent: true })];
      let now = view({ stage: "working", count: 12, finished: 3, complete: false, coverage });
      const shown = show(now, {
        "GET setup/first-promises": () => now,
        "GET watch/inbox/folders": () => folders({ folders: ["Archive", "Sent", "Sent Items"], sent: "Sent" }),
      });
      await user.click(await screen.findByRole("button", { name: "Choose the Sent folder" }));
      const pick = await screen.findByRole("combobox", { name: "Folder of the mail you sent" });
      await user.selectOptions(pick, "Sent Items");
      // The run ends: the same screen is now the result, with the same missing sent folder.
      now = view({ stage: "ready", count: 12, finished: 12, complete: false, coverage });
      await shown.client.invalidateQueries({ queryKey: ["first-promises"] });
      await waitFor(() => expect(document.querySelector('[data-first-promises="none"], [data-first-promises="found"]')).not.toBeNull());
      expect(screen.getByRole("combobox", { name: "Folder of the mail you sent" })).toHaveValue("Sent Items");
      expect(screen.queryByRole("button", { name: "Choose the Sent folder" })).toBeNull();
    });

    test("Cancel closes the picker and the button is back", async () => {
      const user = userEvent.setup();
      show(missingSent, { "GET watch/inbox/folders": () => folders({ folders: ["Sent"], sent: "Sent" }) });
      await user.click(await screen.findByRole("button", { name: "Choose the Sent folder" }));
      await screen.findByRole("combobox", { name: "Folder of the mail you sent" });
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("combobox", { name: "Folder of the mail you sent" })).toBeNull();
      expect(screen.getByRole("button", { name: "Choose the Sent folder" })).toBeInTheDocument();
    });
  });

  test("where the sent folder is read there is no button to choose it", async () => {
    show(view({ ...planned, coverage: [place([folder("Inbox", { from_date: from }), folder("Sent", { sent: true, from_date: from })])] }));
    await screen.findByRole("list", { name: "What it will read" });
    expect(screen.queryByRole("button", { name: /Sent folder/ })).toBeNull();
  });

  test("with only the sent folder missing, nothing found isn't blamed on something unread: the missing sent folder is said instead", async () => {
    show(view({ complete: false, coverage: [place([folder("Inbox", { from_date: from })], { missing_sent: true })] }));
    expect(await screen.findByText("No open promises found in the mail it looked over.")).toBeInTheDocument();
    expect(screen.getByText("Everything listed was read, but not the mail you sent, so this list may be missing promises you made.")).toBeInTheDocument();
    expect(screen.queryByText(/wasn't read, so there may be/)).toBeNull();
    expect(screen.queryByText("Everything listed was read.")).toBeNull();
    expect(await screen.findByRole("button", { name: "Choose the Sent folder" })).toBeInTheDocument();
  });

  test("after the read each source is said as read, and a list of everything read says so", async () => {
    show(view({ coverage: [place([folder("Inbox", { from_date: from }), folder("Sent", { sent: true, from_date: from })])], promises: [promise("ACT-2", { mine: true })] }));
    const list = await screen.findByRole("list", { name: "What was read" });
    expect(within(list).getAllByRole("listitem").map((r) => r.textContent)).toEqual([`Your mail at work@example.com: Inbox, read from ${dated}`, `Your mail at work@example.com: Sent, read from ${dated}`]);
    expect(screen.getByText("Everything listed was read.")).toBeInTheDocument();
  });

  test("a folder that wasn't read is named in words beside it and the list is not called complete", async () => {
    show(
      view({
        complete: false,
        coverage: [place([folder("Inbox", { from_date: from }), folder("Sent", { sent: true, outcome: "failed", from_date: from })])],
        promises: [promise("ACT-2", { mine: true })],
      }),
    );
    expect(await screen.findByText("Your mail at work@example.com: Sent wasn't read. It couldn't be reached. Open Connections to see why.")).toBeInTheDocument();
    expect(screen.getByText("Not everything was read, so this list may be missing promises.")).toBeInTheDocument();
    expect(screen.queryByText("Everything listed was read.")).toBeNull();
  });

  test("offline, throttled and not yet tried each have their own words", async () => {
    show(
      view({
        complete: false,
        coverage: [place([folder("Inbox", { outcome: "offline" }), folder("Sent", { outcome: "throttled" }), folder("Archive", { outcome: "not_yet" })])],
        promises: [promise("ACT-2", { mine: true })],
      }),
    );
    expect(await screen.findByText(/Inbox wasn't read\. There was no internet connection\./)).toBeInTheDocument();
    expect(screen.getByText(/Sent wasn't read yet\. The service asked to wait\./)).toBeInTheDocument();
    expect(screen.getByText("Your mail at work@example.com: Archive hasn't been read yet.")).toBeInTheDocument();
  });

  test("with none found and a source not read it does not say the mail held none", async () => {
    show(view({ complete: false, coverage: [place([folder("Inbox", { outcome: "failed" })])] }));
    expect(await screen.findByText(/No open promises found in what was read\. Some of what you connected wasn't read/)).toBeInTheDocument();
    expect(screen.queryByText("No open promises found in the mail it looked over.")).toBeNull();
  });

  test("while it works it shows how far it is and which sources were read", async () => {
    show(view({ stage: "working", count: 4, finished: 1, coverage: [place([folder("Inbox", { from_date: from })])] }));
    expect(await screen.findByText("Looking over your mail: 1 of 4 done.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "What was read" })).toBeInTheDocument();
  });
});

describe("in the walkthrough", () => {
  const CORE = ["workspace", "ai", "mail", "backup", "people", "template", "first_note", "addons"];
  const shell = (step: S["WalkthroughView"]["step"]) => {
    const calls = fakeApi({
      "GET setup": () => setupView(CORE.map((id) => setupStep(id, { done: id === "mail" })), { walkthrough: { open: true, step } }),
      "GET setup/first-promises": () => view({ stage: "offer", count: 4, days: 14, estimate_usd: 0.12 }),
      "GET settings": () => ({ fingerprint: "fp", items: [] }),
      "GET me": () => ({ person: null, full_name: "" }),
      "GET ai/endpoints": () => [],
      "GET ai/accounts": () => [],
      "GET ai/local": () => [],
      "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [] }),
      "GET sign-ins": () => [],
      "GET watch": () => [],
      "GET status": () => statusFixture(),
      "GET templates": () => [],
      "POST setup/walkthrough": (body: unknown) => ({ open: true, step: "you", closed: false, finished: false, ...(body as object) }),
    });
    renderApp(
      <RestartProvider hellos={1} pollSeconds={0.05} doneSeconds={0.05}>
        <Walkthrough at={null} onOpenPeople={noop} onOpenAddons={noop} onHandIn={noop} onFinishLater={noop} onDone={noop} />
      </RestartProvider>,
    );
    return calls;
  };

  test("the first result is the screen right after mail and before backups, and nothing else comes first", async () => {
    const user = userEvent.setup();
    shell("mail");
    const nav = await screen.findByRole("navigation", { name: "Setup steps" });
    expect(within(nav).getAllByRole("button").map((b) => b.getAttribute("data-screen")).filter(Boolean)).toEqual(["you", "work", "ai", "mail", "promises", "backup", "people", "done"]);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Your promises" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 3, name: "Look back over the last 14 days of your own mail" })).toBeInTheDocument();
    // The offer is on screen with its estimate before anything about projects, areas, packs or more accounts.
    expect(screen.queryByText(/Optional extras/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Backups" })).toBeInTheDocument();
  });

  test("it resumes at the first result", async () => {
    shell("promises");
    expect(await screen.findByRole("heading", { level: 2, name: "Your promises" })).toBeInTheDocument();
  });
});
