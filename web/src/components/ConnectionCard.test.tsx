import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { announceSignIn } from "../lib/sign-in-window";
import { fakeApi, renderApp } from "../test-utils";
import { Sources } from "./Sources";

// One account's card on Connections (design 7.9): who it is, how it stands, the sides it is for with Change, its one button when
// it needs the person, a sign-in that came back as another account refused in words, and its connections as rows.

type Source = S["WatchSourceView"];
const ALEX = "alex@example.com";
const BLAKE = "blake@example.com";
const run = (outcome: "ok" | "failed", extra: Record<string, unknown> = {}) => ({ outcome, started_at: "2026-11-03T10:00:00Z", new: 0, changed: 0, removed: 0, ...extra });
const part = (id: string, account: string, over: Partial<Source> = {}): Source =>
  ({ id, label: `Inbox, ${account}`, connector: "pack/inbox", connector_label: "Example mail", enabled: true, every_minutes: 15, items: 2, failures: 0, problem: null, account, account_state: "signed_in", last: run("ok"), read_at: new Date(Date.now() - 120_000).toISOString(), reads: ["mail"], sides: [], data_level: "restricted", ...over }) as Source;
const signIn = (accounts: Array<{ address: string; status: "signed_in" | "expired" }>): S["SignInView"] =>
  ({
    name: "pack/account",
    label: "Example mail",
    status: "signed_in",
    ready: true,
    several: true,
    accounts: accounts.map((a, n) => ({ key: `k${n}`, address: a.address, status: a.status, missing: [], acting: false })),
    callback: "http://127.0.0.1/api/sign-ins/callback",
    allows: [],
  }) as unknown as S["SignInView"];
const SIDES = [{ project: "PRJ-2", kind: "business", name: "Northwind Clinic", removable: false, filed: 0 }];

const failing = [
  part("a", ALEX),
  part("b1", BLAKE, { last: run("failed", { error_kind: "auth" }), account_state: "expired", read_at: "2026-11-03T08:00:00Z" }),
  part("b2", BLAKE, { label: `Calendar, ${BLAKE}`, reads: ["calendar"], last: run("failed", { error_kind: "auth" }), account_state: "expired", read_at: "2026-11-03T08:00:00Z" }),
];

function open(sources: Source[], extra: Record<string, (b: unknown) => unknown> = {}) {
  const calls = fakeApi({
    "GET watch": () => sources,
    "GET watch/kinds": () => [],
    "GET settings": () => ({ fingerprint: "fp-1", items: [{ key: "watch.sources", file: "watch", group: "", description: "", type: "other", options: [], value: sources.map((s) => ({ id: s.id, settings: {}, sides: s.sides ?? [] })), default: [], source: "default", locked: false, basic: false, editable: false }] }),
    "GET projects": () => [],
    "GET watch/authors": () => [],
    "GET sign-ins": () => [signIn([{ address: ALEX, status: "signed_in" }, { address: BLAKE, status: "expired" }])],
    "GET setup/business": () => ({ business: true, name: "Northwind", personal: "PRJ-1", sides: SIDES, chosen: null }),
    "POST sign-ins/pack/account/start": () => ({ url: "http://localhost:9090/login" }),
    ...extra,
  });
  renderApp(<Sources onAsk={vi.fn()} />);
  return calls;
}

beforeEach(() => {
  vi.stubGlobal("open", () => ({ closed: false, close: () => undefined, location: { set href(_: string) {} } }));
});
afterEach(() => vi.unstubAllGlobals());

test("an account that needs the person is a card with its edge, its state in words and the one button, and it comes first", async () => {
  open(failing);
  const cards = await screen.findAllByRole("region", { name: new RegExp(`${ALEX}|${BLAKE}`) });
  expect(cards.map((c) => c.getAttribute("data-connection-card"))).toEqual([BLAKE, ALEX]);
  const card = cards[0];
  expect(card).toHaveAttribute("data-need", "again");
  expect(within(card).getByText(/Needs sign-in since/)).toBeInTheDocument();
  expect(within(card).getByRole("button", { name: `Sign in again as ${BLAKE}` })).toBeInTheDocument();
  // The healthy one has no button of that name, and says Connected.
  expect(within(cards[1]).queryByRole("button", { name: /^Sign in again as/ })).toBeNull();
  expect(within(cards[1]).getByText("Connected")).toBeInTheDocument();
});

test("a connection is a row of its card named by what it is, with a status in words", async () => {
  open(failing);
  const card = await screen.findByRole("region", { name: BLAKE });
  const inbox = within(card).getByRole("listitem", { name: `Inbox, ${BLAKE}` });
  expect(within(inbox).getByText("Inbox")).toBeInTheDocument();
  expect(within(inbox).getByText(/Mail sent to you/)).toBeInTheDocument();
  expect(inbox.querySelector("[data-state-mark]")).toHaveTextContent(/^Not read since /);
  const calendar = within(card).getByRole("listitem", { name: `Calendar, ${BLAKE}` });
  expect(within(calendar).getByText("Calendar")).toBeInTheDocument();
  const healthy = within(await screen.findByRole("region", { name: ALEX })).getByRole("listitem");
  expect(healthy.querySelector("[data-state-mark]")).toHaveTextContent("Read 2 min ago");
});

test("the privacy is said once in the header when the account's connections share it", async () => {
  open([part("a", ALEX), part("b", ALEX, { reads: ["calendar"], label: `Calendar, ${ALEX}` })]);
  const card = await screen.findByRole("region", { name: ALEX });
  expect(card.querySelectorAll("[data-pill]")).toHaveLength(1);
});

test("connections that differ in privacy each say their own", async () => {
  open([part("c", BLAKE), part("d", BLAKE, { reads: ["calendar"], label: `Calendar, ${BLAKE}`, data_level: "open" })]);
  const card = await screen.findByRole("region", { name: BLAKE });
  expect(card.querySelectorAll("[data-pill]")).toHaveLength(2);
});

test("the sides it is for are chips, and Change opens the boxes to pick them again, with Done to close", async () => {
  const user = userEvent.setup();
  open([part("a", ALEX, { sides: ["PRJ-2"] })]);
  const card = await screen.findByRole("region", { name: ALEX });
  await waitFor(() => expect(card.querySelector("[data-side-chip]")).not.toBeNull());
  expect(card.querySelector("[data-side-chip]")).toHaveTextContent("Northwind Clinic");
  const change = within(card).getByRole("button", { name: `Change the sides ${ALEX} is for` });
  expect(change).toHaveAttribute("aria-expanded", "false");
  await user.click(change);
  const editor = card.querySelector("[data-card-sides-editor]") as HTMLElement;
  expect(within(editor).getByRole("checkbox", { name: "Northwind Clinic" })).toBeChecked();
  await user.click(within(editor).getByRole("button", { name: "Done" }));
  expect(card.querySelector("[data-card-sides-editor]")).toBeNull();
});

test("Sign in again opens the service's window for that account's address, and waits with a way to cancel", async () => {
  const user = userEvent.setup();
  const calls = open(failing);
  const card = await screen.findByRole("region", { name: BLAKE });
  await user.click(within(card).getByRole("button", { name: `Sign in again as ${BLAKE}` }));
  await waitFor(() => expect(calls.some((c) => c.route.startsWith("POST sign-ins/pack/account/start"))).toBe(true));
  expect(calls.find((c) => c.route.startsWith("POST sign-ins/pack/account/start"))?.route).toBe(`POST sign-ins/pack/account/start?account=${encodeURIComponent(BLAKE)}`);
  expect(await within(card).findByText("Waiting for you to sign in, in the window that opened.")).toBeInTheDocument();
  await user.click(within(card).getByRole("button", { name: `Cancel signing in as ${BLAKE}` }));
  await waitFor(() => expect(within(card).queryByText(/Waiting for you to sign in/)).toBeNull());
});

test("a sign-in that came back as another account is refused in words naming both, with Try again, and nothing is added", async () => {
  const user = userEvent.setup();
  open(failing);
  const card = await screen.findByRole("region", { name: BLAKE });
  await user.click(within(card).getByRole("button", { name: `Sign in again as ${BLAKE}` }));
  await within(card).findByText(/Waiting for you to sign in/);
  announceSignIn({ outcome: "different", name: "pack/account", error: "", detail: "", address: ALEX, expected: BLAKE });
  const refused = await within(card).findByRole("alert");
  expect(refused).toHaveTextContent(`That was a different account: ${ALEX}. Sign in as ${BLAKE}.`);
  expect(refused).toHaveAttribute("data-sign-in-refused");
  expect(within(refused).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.getAllByRole("region", { name: new RegExp(`${ALEX}|${BLAKE}`) })).toHaveLength(2);
});

test("signing an account out is in its menu and asks first", async () => {
  const user = userEvent.setup();
  const calls = open([part("a", ALEX)], { "DELETE sign-ins/pack/account?account=k0": () => ({ ok: "signed_out" }) });
  const card = await screen.findByRole("region", { name: ALEX });
  await user.click(within(card).getByRole("button", { name: `More actions for ${ALEX}` }));
  await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));
  const dialog = await screen.findByRole("dialog");
  expect(calls.some((c) => c.route.startsWith("DELETE sign-ins"))).toBe(false);
  await user.click(within(dialog).getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(calls.some((c) => c.route.startsWith("DELETE sign-ins/pack/account"))).toBe(true));
});
