import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { localDate } from "../lib/dates";
import { RestartProvider } from "../lib/restart";
import { fakeApi, renderApp, statusFixture } from "../test-utils";
import { AssistantLine } from "./AssistantLine";

const TODAY = localDate(new Date());

function show(status: S["Status"], onOpenGuide: (step?: string) => void = () => undefined) {
  fakeApi({ "GET status": () => status, "GET runtime-config": () => ({ instance: null }) });
  renderApp(
    <RestartProvider hellos={1}>
      <AssistantLine onOpenGuide={onOpenGuide} />
    </RestartProvider>,
  );
}

const line = () => screen.findByRole("button", { name: /^Helper/ });
const lineNow = () => document.querySelector("[data-alive]") as HTMLElement;
const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await line());
  return screen.getByRole("dialog", { name: "Helper" });
};

const ran = { last_run_at: `${TODAY}T09:42:00+09:00` };

test("fine: the line is a dot and the name, and the last task is in the popover", async () => {
  const user = userEvent.setup();
  show(statusFixture({}, { assistant: ran }));
  const button = await line();
  expect(button).toHaveTextContent(/^Helper$/);
  expect(button).toHaveAccessibleName("Helper: Working");
  expect(button).toHaveAttribute("data-tone", "ok");
  expect(button.querySelector("[data-indicator]")).not.toBeNull();
  expect(button.querySelector("svg")).toBeNull();
  const dialog = await open(user);
  expect(within(dialog.querySelector("[data-section='last']") as HTMLElement).getByText(/9:42/)).toBeInTheDocument();
  expect(within(dialog).queryByText(/Needs a look/)).toBeNull();
});

test("before the first run the popover says there are no tasks yet, and the line still reads as fine", async () => {
  const user = userEvent.setup();
  show(statusFixture());
  const button = await line();
  expect(button).toHaveAttribute("data-tone", "ok");
  const dialog = await open(user);
  expect(within(dialog.querySelector("[data-section='last']") as HTMLElement).getByText("No tasks yet.")).toBeInTheDocument();
});

test("amber: work waiting for an internet connection has its own icon, and the popover says it in words", async () => {
  const user = userEvent.setup();
  show(statusFixture({ network_wait: { count: 2, since: `${TODAY}T09:00:00+00:00` } }, { assistant: ran }));
  await waitFor(() => expect(lineNow()).toHaveAttribute("data-alive", "network"));
  expect(lineNow()).toHaveAttribute("data-tone", "warn");
  expect(lineNow()).toHaveTextContent(/^Helper$/);
  expect(lineNow()).toHaveAccessibleName("Helper: Needs a look");
  expect(lineNow().querySelector("[data-icon='alert']")).not.toBeNull();
  const dialog = await open(user);
  expect(within(dialog.querySelector("[data-section='problem']") as HTMLElement).getByText(/Waiting for an internet connection/)).toBeInTheDocument();
});

test("amber: a paused account names itself and when its limit resets, in the popover", async () => {
  const user = userEvent.setup();
  show(statusFixture({}, { assistant: { ...ran, paused: [{ account: "main-account", until: `${TODAY}T11:30:00+09:00` }] } }));
  await waitFor(() => expect(lineNow()).toHaveAttribute("data-alive", "paused"));
  expect(lineNow()).toHaveAttribute("data-tone", "warn");
  const dialog = await open(user);
  expect(within(dialog.querySelector("[data-section='problem']") as HTMLElement).getByText(/main-account paused until 11:30/)).toBeInTheDocument();
});

test("amber: a restart waiting to be done shows as waiting for a restart, in the popover", async () => {
  const user = userEvent.setup();
  show(statusFixture({ restart_needed: "A change needs the app to restart." }, { assistant: ran }));
  await waitFor(() => expect(lineNow()).toHaveAttribute("data-alive", "restart"));
  const dialog = await open(user);
  expect(within(dialog.querySelector("[data-section='problem']") as HTMLElement).getByText("Waiting for a restart")).toBeInTheDocument();
});

test("red: a failed last run has a different icon, and the popover says so with its time", async () => {
  const user = userEvent.setup();
  show(statusFixture({}, { assistant: { ...ran, last_run_failed: true } }));
  await waitFor(() => expect(lineNow()).toHaveAttribute("data-alive", "run_failed"));
  expect(lineNow()).toHaveAttribute("data-tone", "bad");
  expect(lineNow()).toHaveAccessibleName("Helper: Not working");
  expect(lineNow().querySelector("[data-icon='close']")).not.toBeNull();
  const dialog = await open(user);
  expect(within(dialog.querySelector("[data-section='problem']") as HTMLElement).getByText(/Last task failed 9:42/)).toBeInTheDocument();
});

test("red: an account that can't be used beats the amber states, and the popover offers the AI step", async () => {
  const user = userEvent.setup();
  const onOpenGuide = vi.fn();
  show(
    statusFixture({ network_wait: { count: 1, since: `${TODAY}T09:00:00+00:00` } }, { ai: { state: "failing", detail: "The account said no." }, assistant: ran }),
    onOpenGuide,
  );
  await waitFor(() => expect(lineNow()).toHaveAttribute("data-alive", "failing"));
  const dialog = await open(user);
  expect(within(dialog.querySelector("[data-section='problem']") as HTMLElement).getByText("Can't use its AI account")).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Open AI account setup" }));
  await waitFor(() => expect(onOpenGuide).toHaveBeenCalledWith("ai"));
});

test("the popover shows today's runs by account with failures, what waits and since when, and each tier's fallback order", async () => {
  const user = userEvent.setup();
  show(
    statusFixture(
      {},
      {
        assistant: {
          ...ran,
          runs_today: [
            { account: "main-account", count: 5, failed: 1 },
            { account: "backup-account", count: 1, failed: 0 },
          ],
          queued: 3,
          oldest_queued_since: `${TODAY}T08:15:00+09:00`,
          chains: [
            { tier: "routine", accounts: ["main-account", "backup-account"] },
            { tier: "custom-tier", accounts: ["backup-account"] },
          ],
        },
      },
    ),
  );
  const dialog = await open(user);
  const runs = within(dialog).getByText("AI tasks today").closest("li")!;
  expect(runs).toHaveTextContent("main-account: 5 tasks, 1 failed");
  expect(runs).toHaveTextContent("backup-account: 1 task");
  expect(runs).not.toHaveTextContent("backup-account: 1 task, ");
  const queue = within(dialog).getByText("Waiting for the assistant").closest("li")!;
  expect(queue).toHaveTextContent(/3 requests, the oldest waiting since 8:15/);
  const chains = within(dialog).getByText(/^If an account can't respond/).closest("li")!;
  expect(chains).toHaveTextContent("Everyday work: main-account then backup-account");
  expect(chains).toHaveTextContent("custom-tier: backup-account");
});

test("the popover with nothing to show says so in words, and has no problem row when all is fine", async () => {
  const user = userEvent.setup();
  show(statusFixture());
  const dialog = await open(user);
  expect(within(dialog).getByText("No AI tasks today.")).toBeInTheDocument();
  expect(within(dialog).getByText("Nothing is waiting.")).toBeInTheDocument();
  expect(within(dialog).getByText("No account is set up yet.")).toBeInTheDocument();
  expect(dialog.querySelector("[data-section='problem']")).toBeNull();
});

test("accounts are called by the names the person gave them, in the details, never by their ids", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET status": () =>
      statusFixture(
        {},
        {
          assistant: {
            ...ran,
            runs_today: [{ account: "acct-1", count: 3, failed: 0 }],
            chains: [{ tier: "routine", accounts: ["acct-1", "acct-2"] }],
            paused: [{ account: "acct-1", until: `${TODAY}T14:20:00+09:00` }],
          },
        },
      ),
    "GET runtime-config": () => ({ instance: null }),
    "GET ai/accounts": () => [
      { name: "acct-1", label: "Main account", kind: null, adapter: "x", models: {}, used_for: ["routine"], backup_for: [], has_key: true, key_state: "saved", key_ending: false, spent_today_usd: 0 },
      { name: "acct-2", label: "", kind: "svc", adapter: "x", models: {}, used_for: [], backup_for: ["routine"], has_key: true, key_state: "saved", key_ending: false, spent_today_usd: 0 },
    ],
    "GET ai/endpoints": () => [{ id: "svc", name: "Service A", adapter: "x", base_url: "", needs_key: true }],
  });
  renderApp(
    <RestartProvider hellos={1}>
      <AssistantLine onOpenGuide={() => undefined} />
    </RestartProvider>,
  );
  const button = await line();
  await user.click(button);
  const dialog = screen.getByRole("dialog", { name: "Helper" });
  await waitFor(() => expect(dialog).toHaveTextContent("Main account"));
  expect(dialog).toHaveTextContent("paused until 2:20");
  expect(dialog).toHaveTextContent("Service A account");
  expect(dialog).not.toHaveTextContent(/acct-/);
});

test("an account with no runs today is not listed as \"0 tasks\"", async () => {
  const user = userEvent.setup();
  show(statusFixture({}, { assistant: { ...ran, runs_today: [{ account: "acct-1", count: 0, failed: 0 }, { account: "acct-2", count: 2, failed: 0 }] } }));
  const dialog = await open(user);
  expect(dialog).toHaveTextContent("acct-2: 2 tasks");
  expect(dialog).not.toHaveTextContent(/\b0 tasks?\b/);
});

test("amber: background work that stopped and was started again says so and when", async () => {
  const user = userEvent.setup();
  show(statusFixture({}, { assistant: { ...ran, loop_restarted_at: `${TODAY}T10:05:00+09:00` } }));
  await waitFor(() => expect(lineNow()).toHaveAttribute("data-alive", "loop_restarted"));
  expect(lineNow()).toHaveAttribute("data-tone", "warn");
  expect(await open(user)).toHaveTextContent(/Background work stopped and was started again 10:05/);
});

test("red: stuck background work says since when and the card offers Restart now", async () => {
  const user = userEvent.setup();
  show(statusFixture({ can_restart: true }, { assistant: { ...ran, loop_stuck_since: `${TODAY}T10:05:00+09:00` } }));
  await waitFor(() => expect(lineNow()).toHaveAttribute("data-alive", "stuck"));
  expect(lineNow()).toHaveAttribute("data-tone", "bad");
  const card = await open(user);
  expect(card).toHaveTextContent(/Background work stuck since 10:05/);
  expect(within(card).getByRole("button", { name: "Restart now" })).toBeInTheDocument();
});

test("the words after the icon start with a capital and no stray space, so no AI account reads as a sentence", async () => {
  const user = userEvent.setup();
  show(statusFixture({ ai: { state: "not_set_up", detail: null } }, { assistant: ran }));
  await waitFor(() => expect(lineNow()).toHaveAttribute("data-alive", "not_set_up"));
  const dialog = await open(user);
  const text = within(dialog.querySelector("[data-section='problem']") as HTMLElement).getByText("No AI account yet");
  expect(text.textContent).toBe("No AI account yet");
});
