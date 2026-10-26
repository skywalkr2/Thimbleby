import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { Refuse, fakeApi, renderApp } from "../test-utils";
import { PackTiers } from "./PackTiers";

const account = (name: string, label: string, models: Record<string, string>) =>
  ({ name, label, kind: "service-a", adapter: "a", base_url: null, models, used_for: [], backup_for: [], has_key: true, key_state: "saved", key_where: null, key_ending: false, answered_at: null, spent_today_usd: 0, checked_for: [], check_failed_for: [], checked_at: null, paused_until: null, check_usd: null, accepted_unchecked: false }) as S["AiAccountView"];

const ACCOUNTS = [account("main", "Main account", { everyday: "m1" }), account("big", "Strong account", { everyday: "m2", harder: "m3" })];

const tier = (over: Partial<S["PackTierView"]> = {}): S["PackTierView"] => ({
  id: "gadget/long",
  plugin: "gadget",
  label: "Long reading",
  description: "Reads a whole chapter at once.",
  falls_back_to: "deep",
  mapped: false,
  account: null,
  model: null,
  used_by: ["Read a chapter"],
  recommended: null,
  recommended_why_not: "no_cases",
  ...over,
});

function server(tiers: S["PackTierView"][], extra: Record<string, (body: unknown) => unknown> = {}) {
  return fakeApi({
    "GET ai/pack-tiers": () => ({ tiers }),
    "GET ai/accounts": () => ACCOUNTS,
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    "GET setup": () => ({ steps: [], finished: true, local: true, walkthrough: { open: false, step: "done", closed: false, finished: true } }),
    ...extra,
  });
}

const saved = (key: string, before: unknown, after: unknown) => ({
  changes: [{ key, before, after, was_default: false, is_default: false }],
  fingerprint: "fp-2",
  needs_restart: false,
});

test("an add-on's tier is listed under the add-on with what it is for and what it uses until it is mapped", async () => {
  server([tier()]);
  renderApp(<PackTiers level={3} />);
  const part = await screen.findByRole("region", { name: "Models for Gadget" });
  expect(within(part).getByText("Long reading")).toBeInTheDocument();
  expect(within(part).getByText("Reads a whole chapter at once.")).toBeInTheDocument();
  expect(within(part).getByText("Used for: Read a chapter")).toBeInTheDocument();
  expect(within(part).getByText("Uses your Harder work model until you choose one.")).toBeInTheDocument();
  expect(part).not.toHaveTextContent(/gadget\/long|tier/i);
});

test("nothing is drawn when no add-on declares a tier, or for another add-on's step", async () => {
  server([tier()]);
  const { container } = renderApp(<PackTiers level={4} plugin="other" />);
  await waitFor(() => expect(container.querySelector("[data-pack-tiers]")).toBeNull());
});

test("choosing an account and its model maps the tier with the account's own change, read back with Undo", async () => {
  const user = userEvent.setup();
  const calls = server([tier()], {
    "POST ai/accounts/big": () => saved("ai.tiers.gadget/long.use", "", "big/harder"),
  });
  renderApp(<PackTiers level={3} />);
  const save = await screen.findByRole("button", { name: "Use for Long reading" });
  expect(save).toBeDisabled(); // nothing is chosen for the person
  await user.selectOptions(screen.getByLabelText("Account for Long reading"), "big");
  await user.selectOptions(screen.getByLabelText("Model for Long reading"), "harder");
  await user.click(save);
  await waitFor(() => expect(calls.find((c) => c.route === "POST ai/accounts/big")?.body).toEqual({ fingerprint: "fp-1", use: { "gadget/long": "harder" } }));
  expect(await screen.findByText("Long reading now uses Strong account.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
});

test("a mapped tier says what it uses and can go back to the fallback", async () => {
  const user = userEvent.setup();
  const calls = server([tier({ mapped: true, account: "main", model: "everyday" })], {
    "POST settings": () => saved("ai.tiers.gadget/long.use", "main/everyday", ""),
  });
  renderApp(<PackTiers level={3} />);
  expect(await screen.findByText("Uses Main account, everyday.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Stop using a chosen model for Long reading" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST settings")?.body).toEqual({ changes: {}, reset: ["ai.tiers.gadget/long.use"], fingerprint: "fp-1" }));
  expect(await screen.findByText("Long reading uses your Harder work model again.")).toBeInTheDocument();
});

test("what the measurements back is only offered: using the suggestion fills the choice and saves nothing", async () => {
  const user = userEvent.setup();
  const calls = server([tier({ recommended: { account: "big", model: "harder" }, recommended_why_not: null })]);
  renderApp(<PackTiers level={3} />);
  expect(await screen.findByText("Suggested from the tests: Strong account, harder.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Pick the suggested account and model for Long reading" }));
  expect(screen.getByLabelText("Account for Long reading")).toHaveValue("big");
  expect(screen.getByLabelText("Model for Long reading")).toHaveValue("harder");
  expect(calls.some((c) => c.route.startsWith("POST"))).toBe(false);
});

test("a measurement that is missing is said in words and no account is picked", async () => {
  server([tier({ recommended_why_not: "not_measured" })]);
  renderApp(<PackTiers level={3} />);
  expect(await screen.findByText("No suggestion yet: no model is fully measured for it.")).toBeInTheDocument();
  expect(screen.getByLabelText("Account for Long reading")).toHaveValue("");
});

test("a refused save is said in plain words", async () => {
  const user = userEvent.setup();
  server([tier()], { "POST ai/accounts/main": () => new Refuse(409, "The settings changed since you looked.") });
  renderApp(<PackTiers level={3} />);
  await user.selectOptions(await screen.findByLabelText("Account for Long reading"), "main");
  await user.click(screen.getByRole("button", { name: "Use for Long reading" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("The settings changed since you looked.");
});

test("with no account there is nothing to choose, and the part says so", async () => {
  fakeApi({ "GET ai/pack-tiers": () => ({ tiers: [tier()] }), "GET ai/accounts": () => [] });
  renderApp(<PackTiers level={3} />);
  expect(await screen.findByText("Add an AI account first; then you can choose one here.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Use for/ })).toBeNull();
});
