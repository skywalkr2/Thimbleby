import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp, statusFixture } from "../test-utils";
import { BackupsPanel } from "./BackupsPanel";

const TARGETS = (value: unknown[]): S["SettingItem"] => ({
  key: "storage.backups.targets",
  file: "storage",
  group: "storage.backups",
  description: "Where full backups go.",
  type: "other",
  options: [],
  value,
  default: [],
  source: "file",
  locked: false,
  basic: false,
  editable: false,
});

const state = (over: Partial<S["BackupStatus"]> = {}): S["BackupStatus"] => ({
  configured: true,
  last_success: "2026-10-28T09:00:00+00:00",
  age_hours: 1,
  needs_attention: false,
  last_error: null,
  encrypted: false,
  ...over,
});

const view = (over: Partial<S["BackupsView"]> = {}): S["BackupsView"] => ({
  state: state(),
  message: "Backed up 1 h ago.",
  targets: [{ path: "/mnt/drive", label: "Drive", reachable: true, last_success: "2026-10-28T09:00:00+00:00", last_error: null }],
  copies: [{ target: "Drive", path: "/mnt/drive/ws-20261028-090000", name: "ws-20261028-090000", made_at: "2026-10-28T09:00:00+00:00", encrypted: false }],
  schedule: true,
  switch: true,
  ...over,
});

function api(backups: () => S["BackupsView"], targets: unknown[] = [{ path: "/mnt/drive", label: "Drive" }], extra: Record<string, (body: unknown) => unknown> = {}) {
  return fakeApi({
    "GET backups": backups,
    "GET settings": () => ({ fingerprint: "fp-1", items: [TARGETS(targets)] }),
    "GET status": () => statusFixture(),
    "GET setup/backup-folders": () => ({ folders: [], names: [], shown: "" }),
    ...extra,
  });
}

const open = () => renderApp(<BackupsPanel local />);

test("it shows where backups go, the last backup, the copies, and how to restore from the newest", async () => {
  api(() => view());
  open();
  const where = await screen.findByRole("region", { name: "Where backups go" });
  expect(within(where).getByText("/mnt/drive", { exact: false })).toBeInTheDocument();
  expect(await within(where).findByText(/Backed up/)).toBeInTheDocument();
  expect(within(where).getByRole("button", { name: "Back up now" })).toBeEnabled();
  expect(within(where).getByRole("list", { name: "Copies you can restore from" })).toHaveTextContent("Drive");
  const restore = within(where).getByRole("group", { name: "Restore from a backup" });
  // The command is behind a disclosure for developers, with the newest copy's folder filled in; the plain words say it isn't a button yet.
  expect(restore).toHaveTextContent("It isn't a button yet");
  expect(restore.querySelector("details")).toHaveTextContent('cockpit restore --backup "/mnt/drive/ws-20261028-090000" "a new empty folder"');
  expect(restore).toHaveTextContent("Nothing in this workspace is changed, so no backup is needed first.");
  expect(restore).toHaveTextContent("Going back to a chosen moment isn't available yet.");
});

test("with no folder it says automatic backups are off and Back up now waits for one", async () => {
  api(() => view({ state: state({ configured: false, last_success: null, age_hours: null, needs_attention: true }), targets: [], copies: [], schedule: false }), []);
  open();
  const where = await screen.findByRole("region", { name: "Where backups go" });
  expect(within(where).getAllByText("Automatic backups are off until you choose where they go.").length).toBeGreaterThan(0);
  expect(within(where).getByRole("button", { name: "Back up now" })).toBeDisabled();
  expect(within(where).getByText("No copy has been made yet.")).toBeInTheDocument();
});

test("Back up now says what it did on the page: the places it reached, or why it didn't", async () => {
  const user = userEvent.setup();
  let result = view();
  const calls = api(() => result, [{ path: "/mnt/drive", label: "Drive" }], { "POST backup": () => statusFixture() });
  open();
  await user.click(await screen.findByRole("button", { name: "Back up now" }));
  expect(await screen.findByText("Backed up to Drive.")).toBeInTheDocument();
  expect(calls.some((c) => c.route === "POST backup")).toBe(true);
  result = view({ targets: [{ path: "/mnt/drive", label: "Drive", reachable: false, last_success: null, last_error: "/mnt/drive isn't there; connect the drive or check the folder" }] });
  await user.click(screen.getByRole("button", { name: "Back up now" }));
  expect(await screen.findByText(/The backup didn't work: \/mnt\/drive isn't there/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/Not there right now: Drive/)).toBeInTheDocument());
});
