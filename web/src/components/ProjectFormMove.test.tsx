import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { ProjectDrawer } from "./ProjectForm";

// Moving a project into a side's work with Edit's "Inside" says what that changes, the same warning as every other way of
// moving something (design 6.32).

const PERSONAL = project("PRJ-personal", "Personal", { no_end: true, side: true });
const HOME = project("PRJ-home", "Home", { parent: "PRJ-personal", no_end: true });
const FIRM = project("PRJ-firm", "Orchard Press", { side: true });
const MINE = project("PRJ-mine", "Garden plan", { parent: "PRJ-personal" });
const SIDES = [{ project: "PRJ-firm", kind: "business" as const, name: "Orchard Press", removable: false, filed: 0 }];

test("choosing a place inside a side says the project will be visible with that side's work, and going back says nothing", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET projects": () => [PERSONAL, HOME, FIRM, MINE],
    "GET people": () => [],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET setup/business": () => ({ business: true, name: "Orchard Press", personal: PERSONAL.id, sides: SIDES, chosen: null }),
  });
  renderApp(<ProjectDrawer project={MINE} onClose={() => {}} />);
  const inside = await screen.findByRole("combobox", { name: "Inside" });
  expect(screen.queryByText(/visible with/)).not.toBeInTheDocument();
  await user.selectOptions(inside, await within(inside).findByRole("option", { name: /Orchard Press/ }));
  expect(await screen.findByText("This item will be visible with Orchard Press's work.")).toBeInTheDocument();
  await user.selectOptions(inside, within(inside).getByRole("option", { name: "Home" }));
  expect(screen.queryByText(/visible with/)).not.toBeInTheDocument();
});
