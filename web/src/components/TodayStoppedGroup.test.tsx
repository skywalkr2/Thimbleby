import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
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
  group: "decide",
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
  const onOpenGuide = vi.fn();
  renderApp(
    <RestartProvider hellos={1}>
      <Today workspace="Workspace" onView={vi.fn()} onAddSource={vi.fn()} onOpenGuide={onOpenGuide} onOpenRecord={onOpenRecord} shortcuts={{ next: "j", previous: "k" }} />
    </RestartProvider>,
  );
  return { calls, onOpenRecord, onOpenGuide };
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgetLine();
});


const row = (kind: string) => document.querySelector<HTMLElement>(`[data-queue-line="${kind}"]`)!;

const member = (n: number): Line =>
  line("refused", { key: `refused:REQ-${n}`, request: `REQ-${n}`, waiting: "Say who you are first", title: { kind: "email", sender: `Sender ${n}`, topic: "" } });

test("thirteen stopped requests with one cause are one line that names the count and says who to ask", async () => {
  const user = userEvent.setup();
  const members = Array.from({ length: 13 }, (_, i) => member(i + 1));
  const { onOpenGuide } = show([line("refused", { key: "refused:all:no_person", count: 13, state: "no_person", waiting: "Say who you are first", items: members })]);
  expect(await screen.findByText("Say who you are: 13 items wait for it")).toBeInTheDocument();
  expect(document.querySelectorAll('[data-queue-line="refused"]')).toHaveLength(1);
  expect(screen.queryByText(/Choose another account/)).toBeNull();
  await user.click(within(row("refused")).getByRole("button", { name: "Say who you are" }));
  expect(onOpenGuide).toHaveBeenCalledWith("workspace");
});
