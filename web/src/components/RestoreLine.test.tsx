import "@testing-library/jest-dom/vitest";
import { useQuery } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api, type S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { fakeApi, Refuse, renderApp, statusFixture } from "../test-utils";
import { isRestoreLine, RestoreLine } from "./RestoreLine";

/** The restore lines of the queue on their own, as the Today queue draws them among the others. */
function Lines() {
  const queue = useQuery({ queryKey: ["today", "queue"], queryFn: api.todayQueue });
  return (
    <div>
      {(queue.data ?? []).filter(isRestoreLine).map((line) => (
        <RestoreLine key={line.key} line={line} />
      ))}
    </div>
  );
}

function line(state: "pending" | "restored" | "not_restored", over: Partial<S["QueueLineView"]> = {}): S["QueueLineView"] {
  return { key: `restore:${state}`, group: "decide", kind: "restore", state, count: 1, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {}, at: "2026-10-28T09:00:00+00:00", ...over };
}

function show(lines: () => S["QueueLineView"][], routes: Record<string, (body: unknown) => unknown> = {}, canRestart = true) {
  const calls = fakeApi({
    "GET today/queue": lines,
    "GET status": () => statusFixture({ can_restart: canRestart }),
    "GET runtime-config": () => ({ instance: null }),
    ...routes,
  });
  renderApp(
    <RestartProvider hellos={1}>
      <Lines />
    </RestartProvider>,
  );
  return calls;
}

test("a restore waiting for the restart is a line that says what it is for, with Restart now that only the click starts", async () => {
  const user = userEvent.setup();
  const calls = show(() => [line("pending")], { "POST restart": () => ({ restarting: true }) });
  const row = await screen.findByRole("region", { name: "Restore" });
  expect(row).toHaveTextContent(/^Restore.*Restart to restore your workspace \(from .+\)/);
  expect(row).toHaveTextContent("set aside, not deleted");
  expect(calls.some((c) => c.route === "POST restart")).toBe(false);
  await user.click(await within(row).findByRole("button", { name: "Restart now" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST restart")).toHaveLength(1));
});

test("Cancel is in the waiting line's menu and removes the staged restore", async () => {
  const user = userEvent.setup();
  let lines = [line("pending")];
  const calls = show(() => lines, {
    "POST backups/restore/cancel": () => {
      lines = [];
      return { ok: "restore" };
    },
  });
  const row = await screen.findByRole("region", { name: "Restore" });
  await user.click(within(row).getByRole("button", { name: "More actions for Restore" }));
  await user.click(await screen.findByRole("menuitem", { name: "Cancel the restore" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST backups/restore/cancel")).toBe(true));
  await waitFor(() => expect(screen.queryByRole("region", { name: "Restore" })).toBeNull());
});

test("when the app can't restart itself the waiting line says to close and open it, with no button", async () => {
  show(() => [line("pending")], {}, false);
  const row = await screen.findByRole("region", { name: "Restore" });
  await waitFor(() => expect(row).toHaveTextContent("Close Thimbleby and open it again to finish."));
  expect(within(row).queryByRole("button", { name: "Restart now" })).toBeNull();
});

test("after the swap one line starts with the verb, says what was kept aside, and goes when dismissed", async () => {
  const user = userEvent.setup();
  let lines = [line("restored", { text: "/home/me/Workspace/.cockpit/before-restore/20261029T080000Z" })];
  const calls = show(() => lines, {
    "POST restore/dismiss": () => {
      lines = [];
      return { ok: "restore" };
    },
  });
  const row = await screen.findByRole("region", { name: "Restore" });
  expect(row).toHaveTextContent(/Check your restored workspace \(from .+\)/);
  expect(row).toHaveTextContent("What was there before is kept in /home/me/Workspace/.cockpit/before-restore/20261029T080000Z. Nothing was deleted.");
  await user.click(within(row).getByRole("button", { name: "Dismiss" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST restore/dismiss")).toBe(true));
  await waitFor(() => expect(screen.queryByRole("region", { name: "Restore" })).toBeNull());
});

test("Put back what was there before asks first, then stages it and asks for the restart", async () => {
  const user = userEvent.setup();
  const calls = show(() => [line("restored", { text: "/kept" })], {
    "POST restore/put-back": () => ({ pending: { made_at: "2026-10-29T08:00:00+00:00", kind: "put_back", records: 4 }, can_restart: true }),
  });
  const row = await screen.findByRole("region", { name: "Restore" });
  await user.click(within(row).getByRole("button", { name: "Put back what was there before" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("heading", { name: "Put back what was there before?" })).toBeInTheDocument();
  expect(dialog).toHaveTextContent("What is there now is set aside, not deleted, so you can go back again.");
  expect(within(dialog).queryByLabelText("Key for this copy")).toBeNull();
  expect(calls.some((c) => c.route === "POST restore/put-back")).toBe(false);
  await user.click(within(dialog).getByRole("button", { name: "Put it back" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST restore/put-back")).toBe(true));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(calls.some((c) => c.route === "POST restart")).toBe(false);
});

test("a refused put back is said in the dialog and nothing is staged", async () => {
  const user = userEvent.setup();
  show(() => [line("restored", { text: "/kept" })], { "POST restore/put-back": () => new Refuse(409, "Nothing was set aside by an earlier restore, so there is nothing to put back.") });
  const row = await screen.findByRole("region", { name: "Restore" });
  await user.click(within(row).getByRole("button", { name: "Put back what was there before" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Put it back" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Nothing was set aside by an earlier restore");
});

test("a swap that didn't happen says so and why, and Dismiss takes the line away", async () => {
  const user = userEvent.setup();
  let lines = [line("not_restored", { text: "The restore didn't happen, and your workspace is as it was: permission denied." })];
  const calls = show(() => lines, {
    "POST restore/dismiss": () => {
      lines = [];
      return { ok: "restore" };
    },
  });
  const row = await screen.findByRole("region", { name: "Restore" });
  expect(row).toHaveTextContent("The restore didn't happen");
  expect(row).toHaveTextContent("your workspace is as it was: permission denied. It is still waiting: restart to try again, or cancel it.");
  await user.click(within(row).getByRole("button", { name: "Dismiss" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST restore/dismiss")).toBe(true));
});
