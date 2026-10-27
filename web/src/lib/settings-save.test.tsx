// What a saved settings change says back (design 7.8, check U13): plain words, never a record's fields or its ids, and
// nothing at all when a setup step asks for quiet.
import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "./api";
import { holdsRawData, leaksInternals } from "./raw-data";
import { useAfterSave } from "./settings-save";
import { fakeApi, renderApp } from "../test-utils";

const source = (id: string, label: string, side: string) => ({
  id,
  connector: "demo/mail",
  label,
  enabled: true,
  every_minutes: 15,
  project: null,
  sides: [side],
  first_run: "intake",
  account: "avery@example.com",
  settings: {},
});

const saved = (changes: S["SettingsSaved"]["changes"]): S["SettingsSaved"] => ({ changes, fingerprint: "f2", needs_restart: false });

function Saver(props: { saved: S["SettingsSaved"]; quiet?: boolean }) {
  const afterSave = useAfterSave();
  return (
    <button type="button" onClick={() => void afterSave(props.saved, props.quiet ? { quiet: true } : {})}>
      save
    </button>
  );
}

const region = () => screen.getByRole("region", { name: "Notifications" });

test("a saved list of records is read back by their names, never as their fields or ids", async () => {
  fakeApi({ "GET settings": () => ({ items: [], fingerprint: "f1" }) });
  const user = userEvent.setup();
  const after = [source("your-inbox", "Your inbox", "PRJ-1"), source("your-calendar", "Your calendar", "PER-2")];
  renderApp(<Saver saved={saved([{ key: "watch.sources", before: [], after, was_default: true, is_default: false }])} />);
  await user.click(screen.getByRole("button", { name: "save" }));
  const text = (await within(region()).findByText(/^Saved\./)).textContent ?? "";
  expect(text).toContain("Your inbox, Your calendar");
  expect(holdsRawData(text)).toBe(false);
  expect(leaksInternals(text)).toBe(false);
  expect(text).not.toMatch(/PRJ-|PER-|[{}"]/);
});

test("a saved single record and a list with no names are read back without data too", async () => {
  fakeApi({ "GET settings": () => ({ items: [], fingerprint: "f1" }) });
  const user = userEvent.setup();
  renderApp(
    <Saver
      saved={saved([
        { key: "a.record", before: null, after: { id: "ACT-4", level: 3 }, was_default: true, is_default: false },
        { key: "a.list", before: [], after: [{ id: "ACT-5" }, { id: "ACT-6" }], was_default: true, is_default: false },
      ])}
    />,
  );
  await user.click(screen.getByRole("button", { name: "save" }));
  const text = (await within(region()).findByText(/^Saved\./)).textContent ?? "";
  expect(text).not.toMatch(/ACT-|[{}"]/);
});

test("a setting that holds an id of the app's own is said as changed, never as the id", async () => {
  fakeApi({ "GET settings": () => ({ items: [], fingerprint: "f1" }) });
  const user = userEvent.setup();
  renderApp(<Saver saved={saved([{ key: "workspace.user.person", before: null, after: "PER-7", was_default: true, is_default: false }])} />);
  await user.click(screen.getByRole("button", { name: "save" }));
  const text = (await within(region()).findByText(/^Saved\./)).textContent ?? "";
  expect(text).not.toMatch(/PER-/);
  expect(text).toContain("changed");
});

test("a quiet save raises no message, and the screen still refreshes what it shows", async () => {
  fakeApi({ "GET settings": () => ({ items: [], fingerprint: "f1" }) });
  const user = userEvent.setup();
  const view = renderApp(<Saver quiet saved={saved([{ key: "watch.sorting", before: "ai", after: "rules", was_default: true, is_default: false }])} />);
  const refresh = vi.spyOn(view.client, "invalidateQueries");
  await user.click(screen.getByRole("button", { name: "save" }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(within(region()).queryByText(/^Saved/)).toBeNull();
  expect(within(region()).queryByRole("button", { name: "Undo" })).toBeNull();
});
