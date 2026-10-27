// What changed as list | detail (design 7.13): one line per change; the chosen change in full beside the list, as a drawer
// below 1024px; the first change is chosen as the list opens; Up and Down move the choice,
// Enter moves the cursor into the detail and Escape closes it and puts the cursor back on the line.
import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { useShortcuts } from "../lib/keys";
import { besidePane, fakeApi, renderApp } from "../test-utils";
import { WhatChanged } from "./WhatChanged";

afterEach(() => vi.unstubAllGlobals());

function change(id: string, title: string, extra: Partial<S["ChangeItem"]> = {}): S["ChangeItem"] {
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
    source: null,
    source_title: title,
    changeset: {
      id: `CS-${id}`,
      summary: `Summary of ${title}.`,
      status: "applied",
      reviewed: false,
      trust: "trusted",
      ops: [
        {
          index: 0,
          op: "fact",
          status: "applied",
          reason: null,
          group: "op0",
          title: `Send ${title}`,
          meta: { owners: [] },
          evidence: null,
          record: { kind: "fact", id: `FACT-${id}` },
          ask: null,
        },
      ],
    },
    ...extra,
  };
}

const routes = (items: () => S["ChangeItem"][], extra: Record<string, (b: unknown) => unknown> = {}) => ({
  "GET changes": items,
  "GET stages/requests": () => [],
  "GET stages/records": () => [],
  "GET people": () => [],
  ...extra,
});

// The shortcuts the app installs: Up and Down walk the rows, Enter on a row opens it.
function WithShortcuts() {
  useShortcuts({ next: "j", previous: "k", primary: "a" }, { undo: () => undefined, hand_in: () => undefined, ask: () => undefined, help: () => undefined });
  return <WhatChanged />;
}

const line = (title: string) => screen.findByRole("listitem", { name: title });
const chosenId = () => document.querySelector("[aria-current]")?.getAttribute("data-choice");

describe("beside the list", () => {
  beforeEach(() => besidePane());

  test("a change is one line, its detail is beside it, and the first change is chosen as the list opens", async () => {
    fakeApi(routes(() => [change("A", "First thing"), change("B", "Second thing")]));
    renderApp(<WhatChanged />);
    const pane = await screen.findByRole("complementary", { name: "First thing" });
    expect(within(pane).getByText("Send First thing")).toBeInTheDocument();
    expect(within(pane).getByText("Send First thing")).toBeInTheDocument();
    expect(chosenId()).toBe("A");
    // The line holds the state, the title, one line of what was done and the menu, with no button for the work: nothing of the details.
    const second = await line("Second thing");
    expect(within(second).getByText("Second thing")).toBeInTheDocument();
    expect(within(second).getByText(/Recorded 1 thing|Recorded a fact|Handed in/)).toBeInTheDocument();
    expect(within(second).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual([expect.stringMatching(/^Second thing/), "More actions for Second thing"]);
    expect(within(second).queryByText("Send Second thing")).toBeNull();
    expect(screen.queryByText("Send Second thing")).toBeNull();
  });

  test("a click on a line chooses it, and its detail replaces the one shown", async () => {
    const user = userEvent.setup();
    fakeApi(routes(() => [change("A", "First thing"), change("B", "Second thing")]));
    renderApp(<WhatChanged />);
    await screen.findByRole("complementary", { name: "First thing" });
    await user.click(await line("Second thing"));
    const pane = await screen.findByRole("complementary", { name: "Second thing" });
    expect(within(pane).getByText("Send Second thing")).toBeInTheDocument();
    expect(screen.queryByText("Send First thing")).toBeNull();
    expect(chosenId()).toBe("B");
  });

  test("Down and Up move the choice with the cursor, Enter moves the cursor into the detail, Escape closes it and returns to the line", async () => {
    const user = userEvent.setup();
    fakeApi(routes(() => [change("A", "First thing"), change("B", "Second thing"), change("C", "Third thing")]));
    renderApp(<WithShortcuts />);
    await screen.findByRole("complementary", { name: "First thing" });
    (await line("First thing")).focus();
    await user.keyboard("{ArrowDown}");
    expect(await screen.findByRole("complementary", { name: "Second thing" })).toBeInTheDocument();
    expect(await line("Second thing")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(await screen.findByRole("complementary", { name: "Third thing" })).toBeInTheDocument();
    await user.keyboard("{ArrowUp}");
    expect(await screen.findByRole("complementary", { name: "Second thing" })).toBeInTheDocument();
    // Enter puts the cursor in the detail, where its own keys work.
    await user.keyboard("{Enter}");
    const pane = screen.getByRole("complementary", { name: "Second thing" });
    await waitFor(() => expect(pane.contains(document.activeElement)).toBe(true));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("complementary")).toBeNull());
    await waitFor(async () => expect(await line("Second thing")).toHaveFocus());
    // Closed, the choice does not follow the cursor, and Enter chooses the line again.
    await user.keyboard("{ArrowDown}");
    expect(screen.queryByRole("complementary")).toBeNull();
    // The cursor moves a moment after the key: wait for it to be on the line before Enter acts on it.
    await waitFor(async () => expect(await line("Third thing")).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("complementary", { name: "Third thing" })).toBeInTheDocument();
  });

  test("Escape on a line closes the detail and keeps the cursor on the line", async () => {
    const user = userEvent.setup();
    fakeApi(routes(() => [change("A", "First thing"), change("B", "Second thing")]));
    renderApp(<WithShortcuts />);
    await screen.findByRole("complementary", { name: "First thing" });
    (await line("First thing")).focus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("complementary")).toBeNull());
    expect(await line("First thing")).toHaveFocus();
  });

  test("Looks good is the first choice in the detail's menu, and the next change takes its place", async () => {
    const user = userEvent.setup();
    let items = [change("A", "First thing"), change("B", "Second thing")];
    const calls = fakeApi(
      routes(() => items, {
        "POST changesets/CS-A/looks-good": () => {
          items = [change("B", "Second thing")];
          return { ok: "CS-A" };
        },
        "POST changesets/CS-A/reopen": () => ({ ok: "CS-A" }),
      }),
    );
    renderApp(<WhatChanged />);
    const pane = await screen.findByRole("complementary", { name: "First thing" });
    expect(within(pane).queryByRole("button", { name: "Looks good" })).toBeNull();
    await user.click(within(pane).getByRole("button", { name: "More actions for First thing" }));
    await user.click(await screen.findByRole("menuitem", { name: "Looks good" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-A/looks-good")).toBe(true));
    // The change that was approved is gone from the list; the one after it is chosen.
    expect(await screen.findByRole("complementary", { name: "Second thing" })).toBeInTheDocument();
    expect(screen.queryByText("Send First thing")).toBeNull();
    expect(chosenId()).toBe("B");
  });

  test("Send back, from the detail's menu or the line's, opens its note in the detail", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(routes(() => [change("A", "First thing"), change("B", "Second thing")], { "POST changesets/CS-B/send-back": () => ({ request: "REQ-9" }) }));
    renderApp(<WhatChanged />);
    const first = await screen.findByRole("complementary", { name: "First thing" });
    // From the detail's own menu.
    await user.click(within(first).getByRole("button", { name: "More actions for First thing" }));
    await user.click(await screen.findByRole("menuitem", { name: "Send back with a note" }));
    expect(within(first).getByLabelText(/^What should .* do differently\?/)).toBeInTheDocument();
    // From another line's menu: that change is chosen and its note is in the detail.
    const row = await line("Second thing");
    await user.click(within(row).getByRole("button", { name: "More actions for Second thing" }));
    await user.click(await screen.findByRole("menuitem", { name: "Send back with a note" }));
    const second = await screen.findByRole("complementary", { name: "Second thing" });
    await user.type(await within(second).findByRole("textbox"), "Change the dates");
    await user.click(within(second).getByRole("button", { name: "Send back" }));
    await waitFor(() => expect(calls.find((c) => c.route === "POST changesets/CS-B/send-back")?.body).toEqual({ note: "Change the dates" }));
  });

  test("the detail has the source with its highlighted words, and a question for the person is a link to Today, not a form", async () => {
    const user = userEvent.setup();
    const held = change("A", "First thing");
    held.source = "SRC-1";
    held.changeset!.ops[0] = { ...held.changeset!.ops[0], op: "action.add", status: "held", reason: "Waiting for you to say who this is", evidence: { quote: "ship on November 5" }, ask: { id: "Q-1", status: "open", about: "held-op", name: "Robin", options: [{ id: "PER-2", name: "Robin Sample" }] } };
    const calls = fakeApi(
      routes(() => [change("Z", "Quiet thing"), held], {
        "GET sources/SRC-1": () => ({ id: "SRC-1", title: "Email", kind: "pasted", trust: "untrusted", received_at: "2026-10-09T14:00:00Z", url: null, text: "Proof copies ship on November 5 by courier." }),
        "GET today/queue": () => [{ key: "question:Q-1", group: "decide", kind: "who_is", count: 1, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {}, changeset: "CS-A", op: 0, question: "Q-1" }],
      }),
    );
    renderApp(<WhatChanged />);
    // The first change in the list is chosen as it opens; the one holding a question is chosen by its line.
    await screen.findByRole("complementary", { name: "Quiet thing" });
    expect(chosenId()).toBe("Z");
    await user.click(await line("First thing"));
    const pane = await screen.findByRole("complementary", { name: "First thing" });
    expect(chosenId()).toBe("A");
    await user.click(within(pane).getByRole("button", { name: "Show source" }));
    expect((await within(pane).findByText((_, el) => el?.tagName === "MARK")).textContent).toContain("ship on November 5");
    expect(within(pane).queryByRole("combobox")).toBeNull();
    expect(await within(pane).findByRole("link", { name: "Answer on Today" })).toBeInTheDocument();
    expect(calls.some((c) => c.route.startsWith("POST"))).toBe(false);
  });
});

describe("below 1024px", () => {
  test("nothing is chosen as the list opens; a line opens its detail as a drawer, and closing it puts the cursor back on the line", async () => {
    const user = userEvent.setup();
    fakeApi(routes(() => [change("A", "First thing"), change("B", "Second thing")]));
    renderApp(<WhatChanged />);
    const row = await line("Second thing");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(chosenId()).toBeUndefined();
    await user.click(within(row).getByRole("button", { name: /^Second thing/ }));
    const drawer = await screen.findByRole("dialog", { name: "Second thing" });
    expect(within(drawer).getByText("Send Second thing")).toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(async () => expect(await line("Second thing")).toHaveFocus());
  });
});
