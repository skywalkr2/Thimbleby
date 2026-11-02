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

const asked = line("attention", { key: "attention:stale", group: "decide", text: "stale", state: "quiet", count: 3 });

test("a kind put off enough times is one question with the person's own count, Quiet them as the one main button", async () => {
  show([asked]);
  expect(await screen.findByText("You've set aside to-dos nobody has touched 3 times lately. Quiet them into the morning brief?")).toBeInTheDocument();
  const found = row("attention");
  expect(within(found).getByRole("button", { name: "Keep showing" })).toBeInTheDocument();
  expect(within(found).getAllByRole("button").filter((b) => b.getAttribute("data-variant") === "primary")).toHaveLength(1);
});

test("Quiet them keeps the kind for the brief, at once, and Undo shows it again", async () => {
  const user = userEvent.setup();
  const { calls } = show([asked], { "POST attention/stale/quiet": () => ({ kind: "stale", state: "quiet" }), "POST attention/stale/show": () => ({ kind: "stale", state: "shown" }) });
  await user.click(await screen.findByRole("button", { name: "Quiet them" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST attention/stale/quiet")).toBe(true));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST attention/stale/show")).toBe(true));
});

test("Keep showing puts the question off, and Undo gives it back", async () => {
  const user = userEvent.setup();
  const { calls } = show([asked], { "POST attention/stale/keep": () => ({ signal: "SIG-1" }) });
  await user.click(await screen.findByRole("button", { name: "Keep showing" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST attention/stale/keep")).toBe(true));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST suggestions/not-now/SIG-1/undo")).toBe(true));
});

test("when stopping is the question, its main button stops the kind", async () => {
  const user = userEvent.setup();
  const { calls } = show([{ ...asked, state: "stopped", count: 5 }], { "POST attention/stale/stop": () => ({ kind: "stale", state: "stopped" }) });
  expect(await screen.findByText(/Stop offering them\?$/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Stop them" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST attention/stale/stop")).toBe(true));
});
