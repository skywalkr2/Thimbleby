import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { resetAccountChecks, setAccountCheck } from "../lib/account-checks";
import { fakeApi, renderApp } from "../test-utils";
import { AiAccounts } from "./AiAccounts";

// Promise P36: a saved account's test line, when the service no longer offers the model a kind of work used, says so in
// words about the work (never the model's name) and offers the next model the service's list says fits, in one click,
// saved with Undo and followed by that work's check again.

const KINDS = [{ id: "service-a", name: "Service A", adapter: "adapter-one", base_url: "", needs_key: true, note: "" }] as S["EndpointView"][];

const MAIN = {
  name: "main",
  label: "Main account",
  kind: "service-a",
  adapter: "adapter-one",
  base_url: null,
  models: { everyday: "model-a", harder: "model-b" },
  used_for: ["routine", "deep"],
  backup_for: [],
  has_key: true,
  key_state: "saved",
  key_where: null,
  key_ending: false,
  answered_at: null,
  spent_today_usd: 0,
  checked_for: [],
  check_failed_for: [],
  checked_at: null,
  paused_until: null,
  check_usd: null,
  accepted_unchecked: false,
} as S["AiAccountView"];

beforeEach(() => resetAccountChecks());

const refused = (extra: Partial<S["AiTestResult"]> = {}): S["AiTestResult"][] => [
  {
    tier: "account",
    account: "main",
    main: true,
    ok: false,
    detail: "The model this account was using for that work is no longer offered by this service.",
    reason: "model_retired",
    work: "routine",
    model_short: "everyday",
    next_model: "model-z",
    ...extra,
  },
];

const BEFORE = { adapter: "adapter-one", models: { everyday: "model-a", harder: "model-b" } };

function server(first: () => S["AiTestResult"][], again: () => S["AiTestResult"][] = () => [{ tier: "account", account: "main", main: true, ok: true, detail: "answered" }]) {
  return fakeApi({
    "GET ai/accounts": () => [MAIN],
    "GET ai/endpoints": () => KINDS,
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    "GET setup": () => ({ steps: [], finished: false, local: true }),
    "GET ai/skills": () => ({ min_score: 0.8, stale_days: 60, accounts: [] }),
    "POST ai/accounts/main/test": first,
    "POST ai/accounts/main/test?tier=routine&model=everyday": again,
    "POST ai/accounts/main": () => ({
      changes: [{ key: "ai.providers.main", before: BEFORE, after: { ...BEFORE, models: { everyday: "model-z", harder: "model-b" } }, was_default: false, is_default: false }],
      fingerprint: "fp-2",
      needs_restart: false,
    }),
    "POST settings": () => ({ changes: [], fingerprint: "fp-3", needs_restart: false }),
  });
}

const row = async () => (await screen.findByText("Main account", { selector: "li[data-row] span[id$='-title']" })).closest("li") as HTMLElement;
async function runTest(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(await row()).getByRole("button", { name: "More actions for Main account" }));
  await user.click(await screen.findByRole("menuitem", { name: "Test" }));
}

test("a refused model is said in words about the work, never by its name, with the next model offered in one button", async () => {
  const user = userEvent.setup();
  server(() => refused());
  renderApp(<AiAccounts local />);
  await runTest(user);
  const line = await within(await row()).findByText(/The model this account was using for everyday work is no longer offered by this service\./);
  expect(line).toBeInTheDocument();
  expect(within(await row()).getByRole("button", { name: /Use the next available model instead/ })).toBeInTheDocument();
  // No model's id, and none of the service's own words, is on the screen.
  expect(document.body).not.toHaveTextContent(/model-[abz]/);
  expect(document.body).not.toHaveTextContent(/deprecated/);
});

test("the button saves the next model for that work with Undo, then checks that work again", async () => {
  const user = userEvent.setup();
  const calls = server(() => refused());
  renderApp(<AiAccounts local />);
  await runTest(user);
  await user.click(await within(await row()).findByRole("button", { name: /Use the next available model instead/ }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST ai/accounts/main")?.body).toEqual({ fingerprint: "fp-1", models: { everyday: "model-z", harder: "model-b" } }));
  expect(await screen.findByText("Main account now uses the next available model for everyday work.")).toBeInTheDocument();
  // That work's check runs again with the exact settings, and its answer replaces the line.
  await waitFor(() => expect(calls.some((c) => c.route === "POST ai/accounts/main/test?tier=routine&model=everyday")).toBe(true));
  expect(await within(await row()).findByText(/Answered/)).toBeInTheDocument();
  expect(within(await row()).queryByRole("button", { name: /Use the next available model instead/ })).toBeNull();
  // Undo posts the models from before back to the settings.
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST settings")?.body).toEqual({ changes: { "ai.providers.main": BEFORE }, reset: [], fingerprint: "fp-2" }));
});

test("a replacement that is refused too offers the next one again, never the same line twice", async () => {
  const user = userEvent.setup();
  const calls = server(
    () => refused(),
    () => refused({ next_model: "model-y" }),
  );
  renderApp(<AiAccounts local />);
  await runTest(user);
  await user.click(await within(await row()).findByRole("button", { name: /Use the next available model instead/ }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST ai/accounts/main/test?tier=routine&model=everyday")).toBe(true));
  expect(await within(await row()).findAllByRole("button", { name: /Use the next available model instead/ })).toHaveLength(1);
});

test("when the service lists no other model that fits, there is no button and the line says where to choose", async () => {
  const user = userEvent.setup();
  server(() => refused({ next_model: null }));
  renderApp(<AiAccounts local />);
  await runTest(user);
  expect(await within(await row()).findByText(/The service lists no other model that fits\. Choose one under Change models\./)).toBeInTheDocument();
  expect(within(await row()).queryByRole("button", { name: /Use the next available model instead/ })).toBeNull();
});

test("a failure that is not a refused model offers no replacement", async () => {
  const user = userEvent.setup();
  server(() => [{ tier: "account", account: "main", main: true, ok: false, detail: "The key was refused." }]);
  renderApp(<AiAccounts local />);
  await runTest(user);
  expect(await within(await row()).findByText(/Didn't answer: The key was refused\./)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Use the next available model instead/ })).toBeNull();
});

test("the check that goes on after an account is saved offers the same replacement on the row", async () => {
  server(() => refused());
  setAccountCheck("main", { running: null, failed: { detail: "x", tiers: ["routine"], result: refused()[0] } });
  renderApp(<AiAccounts local />);
  const line = await within(await row()).findByText(/Its check didn't pass: The model this account was using for everyday work is no longer offered/);
  expect(line).toBeInTheDocument();
  expect(within(await row()).getByRole("button", { name: /Use the next available model instead/ })).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/model-[abz]/);
});
