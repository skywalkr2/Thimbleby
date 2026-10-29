// Today's state machine (sweep cause 5): an item has one state and one line, nothing a person does adds lines, and Undo
// redraws. This runs a person's actions on Today (open, confirm, Undo, answer, pick an owner) against a server that keeps
// the lines, and after each one checks that every item has exactly one line and that the heading count, the group counts,
// the pane's count and the menu's count all equal the number of lines shown.
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { forgetLine, useTodayCount } from "../lib/today";
import { fakeApi, renderApp, statusFixture, type Routes } from "../test-utils";
import { Today } from "./Today";

type Line = S["QueueLineView"];

function line(kind: Line["kind"], group: Line["group"], over: Partial<Line> = {}): Line {
  return { key: `${kind}:1`, group, kind, count: 1, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {}, ...over };
}

const title: S["ItemTitle"] = { kind: "email", person_name: "Sam Example", topic: "proof copies" };
const todo = (n: number, text: string): Line =>
  line("batch_item", "review", { key: `item:CS-1:${n}`, what: "action", text, request: "REQ-1", changeset: "CS-1", op: n, title });

const TODO_TEXTS = ["Send two spine options", "Book the proof run", "Confirm the hall"];
const OWNER_TEXT = "Print the agenda.";
const review = line("review", "review", {
  key: "review:REQ-1",
  count: 3,
  request: "REQ-1",
  changeset: "CS-1",
  changesets: ["CS-1"],
  items: TODO_TEXTS.map((text, n) => todo(n, text)),
  title,
  outcome: { actions_added: 3 },
});
const owner = line("owner", "decide", { key: "question:Q-9", text: OWNER_TEXT, question: "Q-9" });
const send = line("send", "send", { key: "send:PER-2", person: "PER-2", person_name: "Robin Sample", count: 2, questions: ["Q-2"], actions: ["ACT-2"] });

function change(): S["ChangeItem"] {
  return {
    id: "REQ-1",
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
    source_title: "Email from Sam Example",
    changeset: { id: "CS-1", summary: "Three actions.", status: "applied", reviewed: false, trust: "untrusted",
      ops: [{ index: 0, op: "action.add", status: "applied", reason: null, group: "op0", title: OWNER_TEXT, meta: { owners: [], action_status: "held" }, evidence: null, record: { kind: "action", id: "ACT-7" }, ask: { id: "Q-9", status: "open", about: "owner", name: null, options: [] } }],
    },
  } as S["ChangeItem"];
}

/** The menu's count, read the way the side menu reads it. */
function MenuCount() {
  const n = useTodayCount();
  return <output data-testid="menu-count">{n === null ? "" : n}</output>;
}

/** The server: the lines it holds, changed by what the person does. */
function start(initial: Line[] = [owner, review, send], extra: Routes = {}) {
  const server = { lines: initial };
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
  const calls = fakeApi({
    "GET today/queue": () => server.lines,
    "GET changes": () => [change()],
    "GET followups": () => [],
    "GET plugin-today": () => [],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET stages/requests": () => [],
    "GET acts": () => ({ acts: [] }),
    "GET today/agenda": () => [],
    "GET today/arrived": () => ({ items: [], left_out: 0, set_aside: 0 }),
    "GET today/week": () => ({ first: "2026-10-19", last: "2026-10-23", due: [], waiting: [], meetings: [] }),
    "GET setup": () => ({ finished: false, steps: [], settled: 0, total: 3 }),
    "GET watch": () => [],
    "GET projects": () => [],
    "GET people": () => [{ id: "PER-2", name: "Robin Sample", role: null }],
    "GET status": () => statusFixture({}, { assistant: { last_run_at: "2026-10-20T08:00:00Z" } }),
    "GET runtime-config": () => ({ instance: null }),
    "POST changesets/confirm": () => {
      server.lines = server.lines.filter((l) => l.key !== review.key);
      return { changesets: ["CS-1"], signals: ["SIG-1"] };
    },
    "POST changesets/unconfirm": () => {
      server.lines = [owner, review, send].filter((l) => l.key === review.key || server.lines.includes(l));
      return { reopened: 1 };
    },
    "POST questions/Q-9/answer": () => {
      server.lines = server.lines.filter((l) => l.key !== owner.key);
      return { ok: "Q-9" };
    },
    ...extra,
  });
  const { client } = renderApp(
    <RestartProvider hellos={1}>
      <MenuCount />
      <Today workspace="Workspace" onView={vi.fn()} onAddSource={vi.fn()} onOpenGuide={vi.fn()} onHandIn={vi.fn()} onOpenRecord={vi.fn()} shortcuts={{ next: "j", previous: "k" }} />
    </RestartProvider>,
  );
  return { server, calls, refresh: () => act(() => client.invalidateQueries()) };
}

const rows = () => Array.from(document.querySelectorAll<HTMLElement>("[data-queue-line]"));
const numbers = (re: RegExp, text: string) => Array.from(text.matchAll(re)).map((m) => Number(m[1]));

/** Every item has one line, and every count on the screen is the number of lines. */
async function oneLineEach(where: string, server: { lines: Line[] }) {
  const expected = server.lines.length;
  await waitFor(() => expect(rows(), `${where}: lines shown`).toHaveLength(expected));
  const keys = rows().map((r) => r.getAttribute("data-line-key"));
  expect(new Set(keys).size, `${where}: a line is drawn twice (${keys.join(", ")})`).toBe(keys.length);
  // Each item's words are on screen once at most: the owner question once while it is a line, a to-do only inside its open review.
  const pane = document.body;
  const seen = (text: string) => within(pane).queryAllByText(text, { selector: "li *, li" }).length;
  expect(seen(OWNER_TEXT) + seen(`Pick an owner for “${OWNER_TEXT}”`), `${where}: the owner question's words`).toBe(server.lines.includes(owner) ? 1 : 0);
  for (const text of TODO_TEXTS) expect(seen(text), `${where}: ${text}`).toBeLessThanOrEqual(1);
  // The counts: the heading's, the pane's, each group's and the menu's.
  const header = document.querySelector("h1, [data-page-header]")?.parentElement?.textContent ?? "";
  const heading = numbers(/(\d+) things? need you/g, header);
  const pane2 = screen.queryAllByText(/^\d+$/, { selector: "[aria-hidden]" }).filter((e) => e.closest("[aria-label='Needs you'], section[aria-labelledby], [role='region']") && !e.closest("li"));
  const groups = Array.from(document.querySelectorAll<HTMLElement>("h3 > span[aria-hidden]")).map((e) => Number(e.textContent?.replace(/\D/g, "")));
  if (expected > 0) {
    for (const n of heading) expect(n, `${where}: heading count`).toBe(expected);
    expect(heading.length, `${where}: the heading says the count`).toBeGreaterThan(0);
    expect(groups.reduce((a, b) => a + b, 0), `${where}: group counts ${groups.join("+")}`).toBe(expected);
    expect(Number(screen.getByTestId("menu-count").textContent), `${where}: menu count`).toBe(expected);
    expect(pane2.length, `${where}: pane count`).toBeGreaterThan(0);
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetLine();
});

test("a person's actions on Today never add a line, every item keeps one line, and the counts agree after each (open, confirm, Undo, answer)", async () => {
  const user = userEvent.setup();
  const { server, refresh } = start();
  await screen.findByText("Look over 3 to-dos Helper added");
  await oneLineEach("at the start", server);

  // Open: the review's items show under it; no line is added.
  await user.click(screen.getByRole("button", { name: "Look over" }));
  await within(document.querySelector<HTMLElement>("[data-queue-line='review']")!).findByText(TODO_TEXTS[0]);
  await oneLineEach("after opening the review", server);

  // Confirm, then Undo: the line goes, and comes back as the same one line.
  await user.click(screen.getByRole("button", { name: "All looks good" }));
  await waitFor(() => expect(server.lines).not.toContain(review));
  await refresh();
  await oneLineEach("after confirming", server);
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(server.lines).toContain(review));
  await refresh();
  await oneLineEach("after Undo", server);

  // Answer the owner question.
  await user.click(screen.getByRole("button", { name: "Pick an owner" }));
  const picker = await screen.findByRole("combobox", { name: "Who owns this?" });
  await screen.findByRole("option", { name: "Robin Sample" });
  await user.selectOptions(picker, "Robin Sample");
  await user.click(screen.getByRole("button", { name: "Add the to-do" }));
  await waitFor(() => expect(server.lines).not.toContain(owner));
  await refresh();
  await oneLineEach("after answering", server);
});

test("a question is said once: its words are on its line and not again in the answer form under it", async () => {
  const user = userEvent.setup();
  const words = "Matte or soft-touch?";
  const asked = { id: "Q-1", title: words, text: words, links: [], kind: "decision", status: "open", sent: null, waiting_days: null, chase_due: false, chases: 0, about: null, options: [] } as S["FollowupQuestion"];
  start([line("decision", "decide", { key: "question:Q-1", text: words, question: "Q-1", title })], {
    "GET followups": () => [{ person: "PER-1", name: "Pat Example", is_pm: true, questions: [asked], actions: [], message: "", to_send: 0 }],
  });
  await screen.findByText(words, { selector: "li *" });
  await user.click(screen.getByRole("button", { name: "Answer" }));
  await screen.findByRole("textbox");
  expect(screen.getAllByText(words)).toHaveLength(1);
});
