import "@testing-library/jest-dom/vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { forgetLine } from "../lib/today";
import { RestartProvider } from "../lib/restart";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp, statusFixture, type Routes } from "../test-utils";
import { OpenItems } from "./OpenItems";
import { Today } from "./Today";

// "Needs a date" (design 7.5): the open to-dos with no date that the person owns or has told someone about are a group at the top
// of the to-dos, each with a date picker. Picking a day is the person's own change, at once, with Undo, and the row leaves the group.
// Today has one line for the ones added lately, which opens the to-dos.

const action = (id: string, text: string, over: Partial<S["OpenActionView"]> = {}): S["OpenActionView"] => ({
  id,
  version: 4,
  text,
  state: "open",
  owners: [{ person: "P-1", name: "Quinn Sample" }],
  due: null,
  project: "PRJ-1",
  project_name: "Harbor",
  parent_name: null,
  notes: null,
  since: "2026-10-12",
  on_hold: null,
  blocker: null,
  duplicate: null,
  origin: null,
  untouched_days: null,
  owner_question: null,
  to_send: false,
  ...over,
});

const undated = action("A-1", "Tidy the style sheet", { needs_date: true });
const told = action("A-2", "Fix the cover file", { owners: [{ person: "P-2", name: "Robin Sample" }], needs_date: true });
const dated = action("A-3", "Send the proof", { due: "2026-10-30" });

function api(shown: S["OpenActionView"][], extra: Routes = {}) {
  return fakeApi({
    "GET open-items": () => ({ actions: shown, questions: [], stale_days: 21 }),
    "GET people": () => [person("P-1", "Quinn Sample"), person("P-2", "Robin Sample")],
    "GET projects": () => [project("PRJ-1", "Harbor")],
    "POST records/edit": () => ({ changeset: "CS-7" }),
    "POST changesets/CS-7/undo": () => ({ restored: [0], skipped: [] }),
    ...extra,
  });
}

test("the group is at the top with the to-dos that need a date, and they are not listed again below", async () => {
  api([dated, undated, told]);
  renderApp(<OpenItems />);
  const group = await screen.findByRole("region", { name: /Needs a date/ });
  const rows = within(group).getAllByRole("listitem").filter((row) => row.hasAttribute("data-row"));
  expect(rows).toHaveLength(2);
  expect(within(rows[0]).getByRole("link", { name: "Tidy the style sheet" })).toBeInTheDocument();
  expect(within(rows[1]).getByText(/Robin Sample/)).toBeInTheDocument();
  const list = screen.getByRole("list", { name: "Open to-dos" });
  expect(within(list).getByText("Send the proof")).toBeInTheDocument();
  expect(within(list).queryByText("Tidy the style sheet")).toBeNull();
  // The group comes before the list in the page.
  expect(group.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("with every to-do dated there is no group", async () => {
  api([dated]);
  renderApp(<OpenItems />);
  await screen.findByText("Send the proof");
  expect(screen.queryByRole("region", { name: /Needs a date/ })).toBeNull();
});

test("picking a day sets the to-do's date as the person's own change and Undo takes it back", async () => {
  const sent: unknown[] = [];
  api([undated], {
    "POST records/edit": (body) => {
      sent.push(body);
      return { changeset: "CS-7" };
    },
  });
  renderApp(<OpenItems />);
  const picker = await screen.findByLabelText("Date for Tidy the style sheet");
  fireEvent.change(picker, { target: { value: "2026-10-22" } });
  await waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0]).toEqual({ kind: "action", id: "A-1", fields: { due: "2026-10-22", due_words: null, due_check: false }, read_version: 4 });
  const toast = await screen.findByText(/Dated Tidy the style sheet/);
  expect(toast).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(screen.queryByText(/Dated Tidy the style sheet/)).toBeNull());
});

test("a year only half typed is never saved", async () => {
  const sent: unknown[] = [];
  api([undated], {
    "POST records/edit": (body) => {
      sent.push(body);
      return { changeset: "CS-7" };
    },
  });
  renderApp(<OpenItems />);
  fireEvent.change(await screen.findByLabelText("Date for Tidy the style sheet"), { target: { value: "0002-10-22" } });
  await act(async () => undefined);
  expect(sent).toEqual([]);
});

// ---- Today -------------------------------------------------------------------------------------------------------------

type Line = S["QueueLineView"];
const line = (over: Partial<Line> = {}): Line => ({ key: "needs_date", group: "review", kind: "needs_date", count: 3, untrusted: false, unpriced: 0, actions: ["A-1", "A-2", "A-4"], questions: [], outcome: {}, ...over });

function today(lines: Line[], onView = vi.fn()) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  fakeApi({
    "GET today/queue": () => lines,
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
    "GET projects": () => [],
    "GET people": () => [],
    "GET status": () => statusFixture(),
    "GET runtime-config": () => ({ instance: null }),
  });
  renderApp(
    <RestartProvider hellos={1}>
      <Today workspace="Workspace" onView={onView} onAddSource={vi.fn()} onOpenGuide={vi.fn()} onOpenRecord={vi.fn()} shortcuts={{ next: "j", previous: "k" }} />
    </RestartProvider>,
  );
  return onView;
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgetLine();
});

test("Today has one line that starts with the verb and opens the to-dos", async () => {
  const onView = today([line()]);
  const row = await screen.findByRole("group", { name: "Date 3 new to-dos" });
  fireEvent.click(within(row).getByRole("button", { name: "Give them dates" }));
  expect(onView).toHaveBeenCalledWith("work/open");
});

test("one new to-do is said in the singular", async () => {
  today([line({ count: 1, actions: ["A-1"] })]);
  expect(await screen.findByRole("group", { name: "Date 1 new to-do" })).toBeInTheDocument();
});
