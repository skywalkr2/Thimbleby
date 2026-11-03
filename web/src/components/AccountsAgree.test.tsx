import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { fakeApi, renderApp, statusFixture } from "../test-utils";
import { StatusMenu } from "../shell/StatusMenu";
import { Sources } from "./Sources";

// The header's status and the Connections screen read one account state, so with one account of three failing they name the
// same account, say the same words and count the same connections.
const run = (outcome: "ok" | "failed", extra: Record<string, unknown> = {}) => ({ outcome, started_at: "2026-10-13T10:00:00Z", new: 0, changed: 0, removed: 0, ...extra });
const mailbox = (id: string, account: string, over: Partial<S["WatchSourceView"]> = {}): S["WatchSourceView"] => ({
  id, label: `Inbox, ${account}`, connector: "pack/inbox", connector_label: "Mail", enabled: true, every_minutes: 15, items: 0, failures: 0, problem: null,
  account, account_state: "signed_in", last: run("ok"), read_at: "2026-10-13T10:00:00Z", reads: ["mail"], ...over,
});
const ACCOUNTS = ["alex@example.com", "blake@example.com", "casey@example.com"];
const watch = () => [
  mailbox("a", ACCOUNTS[0]),
  mailbox("b1", ACCOUNTS[1], { last: run("failed", { error_kind: "auth" }), read_at: "2026-10-13T08:00:00Z", account_state: "expired" }),
  mailbox("b2", ACCOUNTS[1], { label: `Calendar, ${ACCOUNTS[1]}`, last: run("failed", { error_kind: "auth" }), read_at: "2026-10-13T08:00:00Z", account_state: "expired" }),
  mailbox("c", ACCOUNTS[2]),
];

test("one account of three failing: the header and Connections say the same of the same account", async () => {
  fakeApi({
    "GET status": () => statusFixture({}, { backup: { configured: true, age_hours: 0.5, needs_attention: false } }),
    "GET runtime-config": () => ({ instance: null }),
    "GET watch": watch,
    "GET watch/kinds": () => [],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET projects": () => [],
    "GET watch/authors": () => [],
    "GET sign-ins": () => [],
  });
  renderApp(
    <RestartProvider hellos={1}>
      <StatusMenu live={{ state: "live", lastUpdate: new Date(2026, 9, 13, 11, 5), refresh: () => undefined }} demo={false} onOpenGuide={() => undefined} />
      <Sources onAsk={() => undefined} />
    </RestartProvider>,
  );
  const needs = await screen.findByRole("list", { name: "Accounts that need you to sign in" });
  const onPage = within(needs).getAllByRole("listitem");
  expect(onPage).toHaveLength(1);
  // The pill counts it.
  await waitFor(() => expect(document.querySelector("[data-status]")).toHaveTextContent("1 account needs you"));
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /^App status: / }));
  const dialog = screen.getByRole("dialog", { name: "Status" });
  const inPopover = (await within(dialog).findAllByRole("listitem", { name: /@example\.com$/ })).filter((r) => r.getAttribute("data-account") === ACCOUNTS[1]);
  expect(inPopover).toHaveLength(1);
  // The same account, the same state, the same words, the same count of connections.
  expect(inPopover[0].getAttribute("data-account")).toBe(onPage[0].getAttribute("data-account"));
  expect(inPopover[0].getAttribute("data-state")).toBe(onPage[0].getAttribute("data-state"));
  expect(inPopover[0].querySelector("[data-state-mark]")?.textContent).toBe(onPage[0].querySelector("[data-state-mark]")?.textContent);
  expect(inPopover[0].textContent).toBe(onPage[0].textContent);
  expect(inPopover[0]).toHaveTextContent("2 connections");
  // And the popover lists all three accounts, each once.
  expect(within(dialog).getAllByRole("listitem", { name: /@example\.com$/ })).toHaveLength(3);
});
