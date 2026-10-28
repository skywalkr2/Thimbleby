import "@testing-library/jest-dom/vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { forgetMoves } from "../lib/moves";
import { forgetLine } from "../lib/today";
import { fakeApi, renderApp, statusFixture, type Routes } from "../test-utils";
import { Today } from "./Today";

// Day mode (UI/UX review F7): a row's action is tonal, so on Today the only filled buttons are the selected line's and the
// page's own main action (Hand something in, which the header holds). Styles are not computed under jsdom: a row's action
// is tonal by the shared row style (checked in theme/dayMode.test.ts), so the filled ones are the primary buttons that are
// outside a row or inside the selected one.

type Line = S["QueueLineView"];

const line = (over: Partial<Line>): Line => ({ key: "x", group: "decide", kind: "held", count: 1, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {}, ...over });
const TITLE: S["ItemTitle"] = { kind: "email", person: "PER-2", person_name: "Pat Example", sender: null, topic: "Send two spine options" };
const ASK: S["HeldAsk"] = { ask: "close", item: "Send two spine options", record: "ACT-1", owners: ["Robin Sample"], told: [], quote: "both spines are in the shared folder", reporter: "Robin Sample" };
const held = (n: number) => line({ key: `held:CS-${n}:1`, changeset: `CS-${n}`, request: `REQ-${n}`, op: 1, text: `Close 'Send spine option ${n}'`, waiting: "Rests on something worked out.", held: { ...ASK, item: `Send spine option ${n}` }, title: TITLE });

function show(lines: () => Line[], extra: Routes = {}) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  fakeApi({
    "GET today/queue": lines,
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
    "GET status": () => statusFixture(),
    "GET runtime-config": () => ({ instance: null }),
    ...extra,
  });
  const { client } = renderApp(
    <RestartProvider hellos={1}>
      <Today workspace="Workspace" onView={vi.fn()} onAddSource={vi.fn()} onOpenGuide={vi.fn()} onOpenRecord={vi.fn()} onOpenAnswer={vi.fn()} onHandIn={vi.fn()} shortcuts={{ next: "j", previous: "k" }} />
    </RestartProvider>,
  );
  return { refresh: () => act(() => client.invalidateQueries()) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgetLine();
  forgetMoves();
});

/** The buttons drawn solid: primary ones outside a row. A row's own actions are never solid (ui/Row draws its primary as the outline). */
const filled = (main: HTMLElement) => [...main.querySelectorAll<HTMLElement>('button[data-variant="primary"]')].filter((button) => !button.closest("[data-row]"));

test("with several lines and none selected, no line's action is filled", async () => {
  show(() => [held(1), held(2), held(3)]);
  await screen.findByRole("group", { name: "Close 'Send spine option 1'?" });
  const main = document.body;
  expect(main.querySelectorAll('[data-row] button[data-variant="primary"]').length).toBeGreaterThanOrEqual(3);
  expect(filled(main)).toHaveLength(0);
});

test("selecting a line fills no button: its action is the same weight as every other line's", async () => {
  const user = userEvent.setup();
  show(() => [held(1), held(2), held(3)]);
  const second = await screen.findByRole("group", { name: "Close 'Send spine option 2'?" });
  await user.click(within(second).getByRole("button", { name: "Close it" }));
  const marked = [...document.body.querySelectorAll("[data-row][data-selected]")];
  expect(marked.length).toBeLessThanOrEqual(1);
  expect(filled(document.body)).toHaveLength(0);
});

test("the empty Today with a setup line has no filled button: Continue setup is a secondary action", async () => {
  show(() => [], { "GET status": () => statusFixture({}, { ai: { state: "not_set_up", detail: null } }) });
  const setup = await screen.findByRole("button", { name: "Continue setup" });
  expect(setup).toHaveAttribute("data-variant", "secondary");
  expect(filled(document.body)).toHaveLength(0);
});

test("the 'N new · Show' bar's button is a secondary action, so a screen waiting on new lines still has no extra filled button", async () => {
  const user = userEvent.setup();
  let lines = [held(1), held(2)];
  const { refresh } = show(() => lines);
  const first = await screen.findByRole("group", { name: "Close 'Send spine option 1'?" });
  (document.activeElement as HTMLElement | null)?.blur();
  await user.hover(first);
  lines = [held(1), held(2), held(3)];
  await refresh();
  const bar = await screen.findByRole("button", { name: "Show 1 new item" });
  expect(bar).toHaveAttribute("data-variant", "secondary");
  expect(filled(document.body)).toHaveLength(0);
});
