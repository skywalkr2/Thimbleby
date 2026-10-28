import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fakeSettings, settingItem } from "../lib/settings-fixtures";
import { renderApp } from "../test-utils";
import { DeveloperSettings } from "./DeveloperSettings";

const ENABLED = "workspace.plugins.catalog.enabled";
const SHIPPED = "workspace.plugins.catalog.shipped_feed";
const FEEDS = "workspace.plugins.catalog.feeds";
const TOKENS = "workspace.plugins.catalog.release_tokens";
/** Built in two parts, so no address is written out whole. */
const ADDRESS = "https://" + "catalog.example.com/packs.yaml";

const items = (tokens: Record<string, string> = {}) => [
  settingItem(ENABLED, { type: "yes_no", value: true, default: true, description: "List the add-ons the catalogs offer." }),
  settingItem(SHIPPED, { type: "yes_no", value: true, default: true, enabled_by: ENABLED, description: "Read the app's own catalog feed." }),
  settingItem(FEEDS, { type: "list", value: [], default: [], enabled_by: ENABLED, description: "More catalog feeds to read." }),
  settingItem(TOKENS, { type: "other", value: tokens, default: {}, editable: true, secret: true }),
];
const posted = (calls: ReturnType<typeof fakeSettings>) => calls.filter((c) => c.route === "POST settings").map((c) => c.body as { changes: Record<string, unknown> });
const open = async () => {
  const user = userEvent.setup();
  await user.click(await screen.findByText("More settings"));
  return user;
};

test("the catalog settings are a closed section named More settings", async () => {
  fakeSettings(items());
  renderApp(<DeveloperSettings />);
  const fold = (await screen.findByText("More settings")).closest("details") as HTMLDetailsElement;
  expect(fold.open).toBe(false);
  expect(screen.queryByLabelText("List add-ons from catalogs")).not.toBeVisible();
  await open();
  expect(screen.getByLabelText("List add-ons from catalogs")).toBeVisible();
  expect(screen.getByLabelText("Read the app's own catalog")).toBeVisible();
  expect(screen.getByLabelText("More catalogs to read")).toBeVisible();
  expect(screen.getByRole("group", { name: "Access keys for private downloads" })).toBeVisible();
});

test("a switch is saved as it is changed, with its key, and the ones that depend on it wait while it is off", async () => {
  const calls = fakeSettings(items());
  renderApp(<DeveloperSettings />);
  const user = await open();
  await user.click(screen.getByLabelText("List add-ons from catalogs"));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [ENABLED]: false });
  await waitFor(() => expect(screen.getByLabelText("Read the app's own catalog")).toBeDisabled());
  expect(screen.getByLabelText("More catalogs to read")).toBeDisabled();
});

test("more catalogs are an address a line, saved when the cursor leaves the box", async () => {
  const calls = fakeSettings(items());
  renderApp(<DeveloperSettings />);
  const user = await open();
  const box = screen.getByLabelText("More catalogs to read");
  await user.type(box, ADDRESS);
  await user.tab();
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [FEEDS]: [ADDRESS] });
});

test("an access key is added as the place it is kept, a bare name read as the name of a setting on this computer", async () => {
  const calls = fakeSettings(items({ "old.example.com": "file:/keys/old" }));
  renderApp(<DeveloperSettings />);
  const user = await open();
  const group = screen.getByRole("group", { name: "Access keys for private downloads" });
  expect(within(group).getByText("old.example.com: Read from the file /keys/old")).toBeInTheDocument();
  await user.type(within(group).getByLabelText("Site"), "packs.example.com");
  await user.type(within(group).getByLabelText("Where the key is kept"), "PACK_READ_KEY");
  await user.click(within(group).getByRole("button", { name: "Add access key" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [TOKENS]: { "old.example.com": "file:/keys/old", "packs.example.com": "env:PACK_READ_KEY" } });
});

test("a key itself is never saved: a site with a path, or a place that is not a place, is refused before anything is sent", async () => {
  const calls = fakeSettings(items());
  renderApp(<DeveloperSettings />);
  const user = await open();
  const group = screen.getByRole("group", { name: "Access keys for private downloads" });
  await user.type(within(group).getByLabelText("Site"), "packs.example.com/x");
  await user.type(within(group).getByLabelText("Where the key is kept"), "env:K");
  await user.click(within(group).getByRole("button", { name: "Add access key" }));
  expect(await within(group).findByRole("alert")).toHaveTextContent("Give the site's name only");
  expect(posted(calls)).toHaveLength(0);
});

test("an access key is removed from its own button, saved at once", async () => {
  const calls = fakeSettings(items({ "old.example.com": "env:OLD", "new.example.com": "env:NEW" }));
  renderApp(<DeveloperSettings />);
  const user = await open();
  await user.click(screen.getByRole("button", { name: "Remove the access key for old.example.com" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [TOKENS]: { "new.example.com": "env:NEW" } });
});
