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
    "GET changes": () => [{ id: "REQ-9", version: 4 } as S["ChangeItem"]],
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

const said = line("no_effect", {
  key: "no_effect:REQ-9",
  request: "REQ-9",
  question: "Q-3",
  subject: "Which day suits the handover?",
  text: "Yes, but only after the other date is fixed",
});

test("an answer that changed nothing is a line that starts with a verb and quotes the person's own words", async () => {
  show([said]);
  expect(await screen.findByText("Check what your answer changed: Which day suits the handover?")).toBeInTheDocument();
  expect(screen.getByText("You said: “Yes, but only after the other date is fixed”")).toBeInTheDocument();
});

test("Open the question opens the question, and Leave it dismisses the request with an Undo", async () => {
  const user = userEvent.setup();
  const { calls, onOpenRecord } = show([said], {
    "POST requests/REQ-9/dismiss": () => ({ ok: "REQ-9", version: 5 }),
    "POST requests/REQ-9/undismiss": () => ({ ok: "REQ-9", version: 6 }),
  });
  await screen.findByText("Check what your answer changed: Which day suits the handover?");
  const found = row("no_effect");
  await user.click(within(found).getByRole("button", { name: "Open the question" }));
  expect(onOpenRecord).toHaveBeenCalledWith("question", "Q-3");
  await user.click(await within(found).findByRole("button", { name: "Leave it" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST requests/REQ-9/dismiss")).toBe(true));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST requests/REQ-9/undismiss")).toBe(true));
});
