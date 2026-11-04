import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, Refuse, renderApp, statusFixture } from "../test-utils";
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
  pending: null,
  restore_blocked: null,
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

test("it shows where backups go, the last backup and the copies, each with Restore, and no command", async () => {
  api(() => view());
  open();
  const where = await screen.findByRole("region", { name: "Where backups go" });
  // A folder is shown by its name, with the whole path on hover.
  const place = await within(where).findByText("Drive");
  expect(place).toHaveAttribute("title", "/mnt/drive");
  expect(where).not.toHaveTextContent("/mnt/drive");
  expect(await within(where).findByText(/Backed up/)).toBeInTheDocument();
  expect(within(where).getByRole("button", { name: "Back up now" })).toBeEnabled();
  const copies = within(where).getByRole("list", { name: "Copies you can restore from" });
  expect(copies).toHaveTextContent("Drive");
  expect(within(copies).getByRole("button", { name: /^Restore the copy from / })).toBeEnabled();
  const restore = within(where).getByRole("group", { name: "Restore from a backup" });
  // The words say what restoring does; nothing says it isn't a button, and no command shows on screen.
  expect(restore).toHaveTextContent("set aside, not deleted");
  expect(restore).not.toHaveTextContent(/isn't a button|cockpit|--backup/);
  expect(restore.querySelector("details")).toBeNull();
  expect(restore).not.toHaveTextContent("isn't available yet");
});

test("Restore this copy asks first, in plain words, and a plain copy has no key field", async () => {
  const user = userEvent.setup();
  const calls = api(() => view(), [{ path: "/mnt/drive", label: "Drive" }], {
    "POST backups/restore": () => ({ pending: { made_at: "2026-10-28T09:00:00+00:00", kind: "backup", records: 3 }, can_restart: true }),
  });
  open();
  await user.click(await screen.findByRole("button", { name: /^Restore the copy from / }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("heading", { name: /^Restore your workspace from .+\?$/ })).toBeInTheDocument();
  expect(dialog).toHaveTextContent(/Your workspace goes back to how it was on .+\./);
  expect(dialog).toHaveTextContent("Changes made since then are set aside, not deleted.");
  expect(dialog).toHaveTextContent("Thimbleby needs to restart to do this, and you choose when. Nothing changes until then.");
  expect(within(dialog).queryByLabelText("Key for this copy")).toBeNull();
  // Nothing was asked of the app until the person confirms.
  expect(calls.some((c) => c.route === "POST backups/restore")).toBe(false);
  await user.click(within(dialog).getByRole("button", { name: "Restore this copy" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST backups/restore")?.body).toEqual({ path: "/mnt/drive/ws-20261028-090000", key: null }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(await screen.findByText("Ready. Restart Thimbleby to finish the restore.")).toBeInTheDocument();
  // The restart is asked for, never made: only the person's own Restart now sends it.
  expect(calls.some((c) => c.route === "POST restart")).toBe(false);
});

test("an encrypted copy asks for its key in the same dialog, with the cursor in that field, and a refused key is said there", async () => {
  const user = userEvent.setup();
  const copy = { target: "Drive", path: "/mnt/drive/ws-20261028-090000", name: "ws-20261028-090000", made_at: "2026-10-28T09:00:00+00:00", encrypted: true };
  let refuse = true;
  const calls = api(() => view({ copies: [copy] }), [{ path: "/mnt/drive", label: "Drive" }], {
    "POST backups/restore": () =>
      refuse
        ? new Refuse(409, "That key doesn't open this backup. Use the key the backup was made with; nothing was restored.")
        : { pending: { made_at: copy.made_at, kind: "backup", records: 3 }, can_restart: true },
  });
  open();
  await user.click(await screen.findByRole("button", { name: /^Restore the copy from / }));
  const dialog = await screen.findByRole("dialog");
  const field = within(dialog).getByLabelText("Key for this copy");
  await waitFor(() => expect(field).toHaveFocus());
  // Nothing goes on without a key.
  const go = within(dialog).getByRole("button", { name: "Restore this copy" });
  expect(go).toBeDisabled();
  await user.type(field, "a wrong key");
  await user.click(go);
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("This copy can't be restored: That key doesn't open this backup.");
  expect(calls.filter((c) => c.route === "POST backups/restore")[0].body).toEqual({ path: copy.path, key: "a wrong key" });
  // The dialog stays open, and a right key goes through.
  refuse = false;
  await user.clear(field);
  await user.type(field, "the right key");
  await user.click(within(dialog).getByRole("button", { name: "Restore this copy" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("a restore waiting for the restart shows on the page with Restart now and Cancel, which cancels it", async () => {
  const user = userEvent.setup();
  let pending: S["BackupsView"]["pending"] = { made_at: "2026-10-28T09:00:00+00:00", kind: "backup", records: 3 };
  const calls = fakeApi({
    "GET backups": () => view({ pending }),
    "GET settings": () => ({ fingerprint: "fp-1", items: [TARGETS([{ path: "/mnt/drive", label: "Drive" }])] }),
    "GET status": () => statusFixture({ can_restart: true }),
    "GET setup/backup-folders": () => ({ folders: [], names: [], shown: "" }),
    "POST backups/restore/cancel": () => {
      pending = null;
      return { ok: "restore" };
    },
  });
  open();
  const line = await screen.findByText(/^Restores .+ at the next restart$/);
  const box = line.closest("[data-restore-pending]") as HTMLElement;
  expect(within(box).getByRole("button", { name: "Restart now" })).toBeEnabled();
  await user.click(within(box).getByRole("button", { name: "Cancel the restore" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST backups/restore/cancel")).toBe(true));
  expect(await screen.findByText("Okay. Nothing will be restored.")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText(/at the next restart$/)).toBeNull());
});

test("a copy can't be restored while something stops it, and the page says why", async () => {
  api(() => view({ restore_blocked: "This workspace is kept in a synced folder, which would bring back the newer copy." }));
  open();
  const button = await screen.findByRole("button", { name: /^Restore the copy from / });
  expect(button).toBeDisabled();
  expect(await screen.findByText(/kept in a synced folder/)).toBeInTheDocument();
});

test("with no folder it says automatic backups are off and Back up now waits for one", async () => {
  api(() => view({ state: state({ configured: false, last_success: null, age_hours: null, needs_attention: true }), targets: [], copies: [], schedule: false }), []);
  open();
  const where = await screen.findByRole("region", { name: "Where backups go" });
  expect(within(where).getByText("Choose where backups go first.")).toBeInTheDocument();
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
