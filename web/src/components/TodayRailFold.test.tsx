// A rail panel the person opened on the phone stays open while Today's data refreshes (design 7.7, check U20): the live
// stream asks every screen again, and the answers settle at different times, so a card can be left out of the page for a
// moment and drawn again. Its fold is kept above that.
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { fakeApi, renderApp, statusFixture } from "../test-utils";
import { Today } from "./Today";

const failing = [{ id: "mail-1", label: "Your inbox", enabled: true, reads: ["mail"], last: { outcome: "failed", error: "The sign-in ended." } }] as unknown as S["WatchSourceView"][];

const item = { snapshot: "SNAP-1", source: "mail-1", title: "Proof is ready", sender: "Robin Sample", received: new Date().toISOString(), unread: true };

function show(routes: Record<string, () => unknown>) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.length < 0, addEventListener: () => undefined, removeEventListener: () => undefined }));
  document.documentElement.setAttribute("data-narrow", "");
  fakeApi({
    "GET today/queue": () => [],
    "GET changes": () => [],
    "GET followups": () => [],
    "GET plugin-today": () => [],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET stages/requests": () => [],
    "GET today/agenda": () => [],
    "GET today/week": () => ({ first: "2026-10-19", last: "2026-10-23", due: [], waiting: [], meetings: [] }),
    "GET setup": () => ({ finished: true, steps: [], settled: 3, total: 3 }),
    "GET projects": () => [],
    "GET status": () => statusFixture({}, { assistant: { last_run_at: "2026-10-20T08:00:00Z" } }),
    "GET runtime-config": () => ({ instance: null }),
    ...routes,
  } as never);
  const { client } = renderApp(<Today workspace="Workspace" onView={vi.fn()} onAddSource={vi.fn()} onOpenGuide={vi.fn()} onOpenRecord={vi.fn()} />);
  return { refresh: () => act(() => client.invalidateQueries()) };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-narrow");
});

test("an opened panel stays open when Today's data refreshes", async () => {
  const user = userEvent.setup();
  const { refresh } = show({ "GET watch": () => failing, "GET today/arrived": () => ({ items: [], left_out: 0, set_aside: 0 }) });
  await user.click(await screen.findByRole("button", { name: /Came in/ }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  await refresh();
  await refresh();
  expect(screen.getByRole("button", { name: /Came in/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

test("an opened panel stays open when the card leaves the page for a moment and is drawn again", async () => {
  const user = userEvent.setup();
  let answers: unknown[] = [{ items: [item], left_out: 0, set_aside: 0 }];
  const { refresh } = show({
    "GET watch": () => [],
    "GET setup": () => ({ finished: false, steps: [], settled: 0, total: 3 }),
    // With nothing in it, and nothing to connect while setup is open, the card is not drawn.
    "GET today/arrived": () => answers[0],
  });
  await user.click(await screen.findByRole("button", { name: /Came in/ }));
  expect(await screen.findByText("Proof is ready")).toBeInTheDocument();
  answers = [{ items: [], left_out: 0, set_aside: 0 }];
  await refresh();
  await waitFor(() => expect(screen.queryByRole("button", { name: /Came in/ })).toBeNull());
  answers = [{ items: [item], left_out: 0, set_aside: 0 }];
  await refresh();
  expect(await screen.findByRole("button", { name: /Came in/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("Proof is ready")).toBeInTheDocument();
});
