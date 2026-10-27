import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { forgetMoves } from "../lib/moves";
import { forgetLine } from "../lib/today";
import { project, unfiledItem, unfiledView } from "../lib/records-fixtures";
import { fakeApi, renderApp, statusFixture, type Routes } from "../test-utils";
import { Today } from "./Today";

// The Today line that asks which side some items belong to, with one other side and with several (design 6.32, 7.7): what
// the assistant couldn't place waits under Personal, and the line opens one question for each side ("These 3 items might be
// <side>'s. Move them there?") with Move, which says what it changes and has Undo, and Keep under Personal. Items filed
// under no project at all are still sorted by choosing a side.

type Line = S["QueueLineView"];

const PERSONAL = project("PRJ-personal", "Personal");
const FIRST: S["SideView"] = { project: "PRJ-first", kind: "business", name: "Orchard Press", removable: false };
const SECOND: S["SideView"] = { project: "PRJ-second", kind: "job", name: "Lantern Works", removable: false };

const items = [unfiledItem("note", "N-1", "Printer prefers PDF/X files."), unfiledItem("action", "A-1", "Send the proof to the printer"), unfiledItem("question", "Q-1", "Which week suits the printer?")];

function sortLine(count: number, subject: string | null): Line {
  return { key: "unfiled", group: "review", kind: "unfiled", state: "which_side", subject, count, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {} };
}

function show(line: Line, sides: S["SideView"][], extra: Routes = {}) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  const calls = fakeApi({
    "GET today/queue": () => [line],
    "GET changes": () => [],
    "GET followups": () => [],
    "GET plugin-today": () => [],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET stages/requests": () => [],
    "GET today/agenda": () => [],
    "GET today/todo": () => [],
    "GET today/arrived": () => ({ items: [], left_out: 0, set_aside: 0 }),
    "GET watch": () => [],
    "GET status": () => statusFixture(),
    "GET runtime-config": () => ({ instance: null }),
    "GET setup/business": () => ({ business: true, name: sides[0].name, personal: PERSONAL.id, sides, chosen: "work" }),
    "GET unfiled": () => unfiledView(...items),
    "GET projects": () => [PERSONAL, ...sides.map((s) => project(s.project, s.name))],
    "GET filing/questions": () => ({ questions: [] }),
    "POST unfiled/file": () => ({ changeset: "CS-1" }),
    "POST changesets/CS-1/undo": () => ({ restored: [0], skipped: [] }),
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
  forgetMoves();
  window.localStorage.clear();
});

const waiting = (side: S["SideView"]): S["FilingQuestion"] => ({
  side: side.project,
  name: side.name,
  items: items.map((i) => ({ kind: i.kind, id: i.id, version: i.version, text: i.text })),
});

const row = async (title: string) => (await screen.findByRole("group", { name: title })) as HTMLElement;

test("with several sides the line asks which side, and its primary opens Personal and each side as a list to pick from", async () => {
  const user = userEvent.setup();
  show(sortLine(3, null), [FIRST, SECOND]);
  const line = await row("These 3 items could belong to one of your sides. Move them?");
  expect(line).toHaveTextContent("The assistant couldn't tell, so these wait under Personal until you say.");
  // One primary on the row: it opens the choice, and "File them" is not offered beside it.
  expect(within(line).getByRole("button", { name: "Look" })).toBeInTheDocument();
  expect(within(line).queryByRole("button", { name: "File them" })).toBeNull();
  await user.click(within(line).getByRole("button", { name: "Look" }));
  const sides = await screen.findByRole("list", { name: "Sides" });
  expect(within(sides).getAllByRole("button").map((b) => b.textContent)).toEqual(["Personal", FIRST.name, SECOND.name]);
  expect(screen.getByText("Which side do these belong to? All 3 go there.")).toBeInTheDocument();
});

test("choosing a side files everything the line stands for under that side's top project, and Undo takes it back", async () => {
  const user = userEvent.setup();
  const calls = show(sortLine(3, null), [FIRST, SECOND]);
  await user.click(within(await row("These 3 items could belong to one of your sides. Move them?")).getByRole("button", { name: "Look" }));
  await user.click(await screen.findByRole("button", { name: SECOND.name }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST unfiled/file")?.body).toMatchObject({ project: SECOND.project }));
  const body = calls.find((c) => c.route === "POST unfiled/file")?.body as S["UnfiledFile"];
  expect(body.items.map((i) => i.id)).toEqual(["N-1", "A-1", "Q-1"]);
  expect(await screen.findByText(`Filed 3 items under ${SECOND.name}.`)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-1/undo")).toBe(true));
});

test("with one other side the line still names it, and Move and Keep are what the question offers", async () => {
  const user = userEvent.setup();
  show(sortLine(3, FIRST.name), [FIRST], { "GET unfiled": () => unfiledView(), "GET filing/questions": () => ({ questions: [waiting(FIRST)] }) });
  const line = await row(`These 3 items might be ${FIRST.name}'s. Move them there?`);
  await user.click(within(line).getByRole("button", { name: "Look" }));
  const question = await screen.findByLabelText(`These 3 items might be ${FIRST.name}'s. Move them there?`, { selector: "section" });
  expect(within(question).getAllByRole("listitem").map((li) => li.textContent)).toEqual(items.map((i) => i.text));
  // Move says what it changes before it is pressed.
  expect(within(question).getByText(`These 3 items will be visible with ${FIRST.name}'s work.`)).toBeInTheDocument();
  expect(within(question).getAllByRole("button").map((b) => b.textContent)).toEqual(["Move", "Keep under Personal"]);
});

test("Move is the person's own change with Undo, and its toast says what it changed", async () => {
  const user = userEvent.setup();
  const calls = show(sortLine(3, FIRST.name), [FIRST], {
    "GET unfiled": () => unfiledView(),
    "GET filing/questions": () => ({ questions: [waiting(FIRST)] }),
    "POST filing/move": () => ({ changeset: "CS-2", count: 3, rule: null }),
    "POST changesets/CS-2/undo": () => ({ restored: [0], skipped: [] }),
  });
  await user.click(within(await row(`These 3 items might be ${FIRST.name}'s. Move them there?`)).getByRole("button", { name: "Look" }));
  const question = await screen.findByLabelText(`These 3 items might be ${FIRST.name}'s. Move them there?`, { selector: "section" });
  await user.click(within(question).getByRole("button", { name: "Move" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST filing/move")?.body).toEqual({ side: FIRST.project, items: items.map((i) => ({ kind: i.kind, id: i.id, read_version: 1 })) }));
  expect(await screen.findByText(`Moved 3 items to ${FIRST.name}. They are now visible with ${FIRST.name}'s work.`)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-2/undo")).toBe(true));
});

test("a rule proposed by a second move is said in the toast", async () => {
  const user = userEvent.setup();
  show(sortLine(3, FIRST.name), [FIRST], {
    "GET unfiled": () => unfiledView(),
    "GET filing/questions": () => ({ questions: [waiting(FIRST)] }),
    "POST filing/move": () => ({ changeset: "CS-2", count: 3, rule: "RULE-1" }),
  });
  await user.click(within(await row(`These 3 items might be ${FIRST.name}'s. Move them there?`)).getByRole("button", { name: "Look" }));
  const question = await screen.findByLabelText(`These 3 items might be ${FIRST.name}'s. Move them there?`, { selector: "section" });
  await user.click(within(question).getByRole("button", { name: "Move" }));
  expect(await screen.findByText(/a rule is waiting for you to keep or drop/)).toBeInTheDocument();
});

test("Keep leaves the items under Personal and changes nothing", async () => {
  const user = userEvent.setup();
  const calls = show(sortLine(3, FIRST.name), [FIRST], {
    "GET unfiled": () => unfiledView(),
    "GET filing/questions": () => ({ questions: [waiting(FIRST)] }),
    "POST filing/move": () => ({ changeset: "CS-2", count: 3, rule: "RULE-1" }),
    "POST filing/keep": () => ({ signal: "SIG-1" }),
  });
  await user.click(within(await row(`These 3 items might be ${FIRST.name}'s. Move them there?`)).getByRole("button", { name: "Look" }));
  const question = await screen.findByLabelText(`These 3 items might be ${FIRST.name}'s. Move them there?`, { selector: "section" });
  await user.click(within(question).getByRole("button", { name: "Keep under Personal" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST filing/keep")?.body).toMatchObject({ side: FIRST.project }));
  expect(calls.some((c) => c.route === "POST filing/move")).toBe(false);
  expect(await screen.findByText("Kept under Personal.")).toBeInTheDocument();
});
