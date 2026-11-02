import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { forgetLine } from "../lib/today";
import { fakeApi, renderApp, statusFixture, type Routes } from "../test-utils";
import { Today } from "./Today";

type Line = S["QueueLineView"];

const line = (kind: Line["kind"], over: Partial<Line> = {}): Line => ({
  key: kind,
  group: kind === "stale" || kind === "learned" ? "review" : "risk",
  kind,
  count: 1,
  untrusted: false,
  unpriced: 0,
  actions: [],
  questions: [],
  outcome: {},
  ...over,
});

function show(lines: Line[], extra: Routes = {}) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  const calls = fakeApi({
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
    "GET status": () => statusFixture({}, { assistant: { last_run_at: "2026-10-20T08:00:00Z" } }),
    "GET runtime-config": () => ({ instance: null }),
    "POST changesets/CS-1/undo": () => ({ restored: [0], skipped: [] }),
    "POST suggestions/not-now/SIG-1/undo": () => ({ ok: "SIG-1" }),
    ...extra,
  });
  const onOpenRecord = vi.fn();
  renderApp(
    <RestartProvider hellos={1}>
      <Today workspace="Workspace" onView={vi.fn()} onAddSource={vi.fn()} onOpenGuide={vi.fn()} onOpenRecord={onOpenRecord} shortcuts={{ next: "j", previous: "k" }} />
    </RestartProvider>,
  );
  return { calls, onOpenRecord };
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgetLine();
});

const row = (kind: string) => document.querySelector<HTMLElement>(`[data-queue-line="${kind}"]`)!;

const tie = line("tie", {
  key: "tie:ACT-2",
  group: "decide",
  text: "Return the signed contract to the printer",
  other: "Return the signed contract",
  entry: "EVT-3",
  actions: ["ACT-2"],
  due: "2026-10-27",
});

test("a calendar entry proposed for a to-do is one line asking to tie them, with Tie it as the one main button", async () => {
  show([tie]);
  expect(await screen.findByText(/^Tie Return the signed contract to the printer to Return the signed contract on [^?]*\?$/)).toBeInTheDocument();
  const found = row("tie");
  expect(within(found).getByRole("button", { name: "Not this" })).toBeInTheDocument();
  expect(within(found).getAllByRole("button").filter((b) => b.getAttribute("data-variant") === "primary")).toHaveLength(1);
});

test("Tie it ties the to-do, at once, and Undo takes the tie back", async () => {
  const user = userEvent.setup();
  const { calls } = show([tie], { "POST actions/ACT-2/tie": () => ({ changeset: "CS-1" }) });
  await user.click(await screen.findByRole("button", { name: "Tie it" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST actions/ACT-2/tie")).toBe(true));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-1/undo")).toBe(true));
});

test("Not this says it isn't the one, and Undo gives the line back", async () => {
  const user = userEvent.setup();
  const { calls } = show([tie], { "POST actions/ACT-2/not-this": () => ({ signal: "SIG-1" }) });
  await user.click(await screen.findByRole("button", { name: "Not this" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST actions/ACT-2/not-this")).toBe(true));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST suggestions/not-now/SIG-1/undo")).toBe(true));
});
