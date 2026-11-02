import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { ReadingOffRows } from "./ReadingOffRow";

// A connection whose add-on isn't running stops being read; Today says so with the verb first and opens Add-ons.

const source = (id: string, connector: string, over: Partial<S["WatchSourceView"]> = {}): S["WatchSourceView"] => ({
  id,
  label: `Source ${id}`,
  connector,
  connector_label: "",
  enabled: true,
  every_minutes: 15,
  items: 0,
  last: null,
  read_at: null,
  failures: 0,
  problem: null,
  ...over,
});
const packs = (installed: string[]): S["PacksView"] => ({
  enabled: true,
  feeds: [],
  available: [],
  installed: installed.map((name) => ({ name, version: "1.0.0", description: "", enabled: false, state: "off", reason: null, removable: false, what: { adds: { item_types: [], screens: 0, today: 0, ai_work: 0, actions: 0, setup_steps: 0, sources: 0 }, reaches: { sign_ins: [], hosts: [], programs: [], keys: 0 }, keeps: "open" } })),
});

test("one line for each add-on that is off while a connection needs it, saying it has stopped and opening Add-ons", async () => {
  const user = userEvent.setup();
  const opened: string[] = [];
  fakeApi({
    "GET watch": () => [source("S1", "journey-mail/inbox"), source("S2", "journey-mail/calendar"), source("S3", "folder", { connector_label: "A folder" }), source("S4", "other-pack/x", { enabled: false })],
    "GET packs": () => packs(["journey-mail"]),
  });
  renderApp(<ReadingOffRows onView={(v) => void opened.push(v)} />);
  const line = await screen.findByRole("listitem", { name: "Journey mail" });
  expect(line).toHaveTextContent("Turn on Journey mail: reading 2 connections has stopped.");
  expect(document.querySelectorAll("[data-reading-off]")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Open Add-ons" }));
  expect(opened).toEqual(["settings/addons"]);
});

test("an add-on that is not installed says Install, and nothing shows while every connection can be read", async () => {
  fakeApi({ "GET watch": () => [source("S1", "journey-mail/inbox")], "GET packs": () => packs([]) });
  const first = renderApp(<ReadingOffRows />);
  expect(await screen.findByText("Install Journey mail: reading 1 connection has stopped.")).toBeInTheDocument();
  first.unmount();
  const calls = fakeApi({ "GET watch": () => [source("S1", "journey-mail/inbox", { connector_label: "Mail" })], "GET packs": () => packs([]) });
  renderApp(<ReadingOffRows />);
  await waitFor(() => expect(calls.filter((c) => c.route === "GET watch" || c.route === "GET packs")).toHaveLength(2));
  expect(document.querySelector("[data-reading-off]")).toBeNull();
});
