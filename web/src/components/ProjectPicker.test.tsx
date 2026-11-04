import { useState } from "react";
import "@testing-library/jest-dom/vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp, snapshotOf, groupNames } from "../test-utils";
import { ProjectPicker } from "./ProjectPicker";

// Where something belongs (design 6.32): each side is a group, its own first choice is the side's name, then
// its projects. A side is never a plain project choice.

const PERSONAL = project("PRJ-personal", "Personal", { side: true, no_end: true });
const HOME = project("PRJ-home", "Home", { parent: "PRJ-personal", no_end: true });
const FIRM = project("PRJ-firm", "Orchard Press", { side: true });
const BOOK = project("PRJ-book", "The spring catalog", { parent: "PRJ-firm" });
const PART = project("PRJ-part", "Cover art", { parent: "PRJ-book" });
const LOOSE = project("PRJ-loose", "Left over");

function show(onChange: (v: string) => void = () => {}) {
  fakeApi({ "GET projects": () => [PERSONAL, HOME, FIRM, BOOK, PART, LOOSE] });
  renderApp(<ProjectPicker label="Where does it belong?" value="" onChange={onChange} />);
}

test("the choices are grouped by side, each side's own choice first, then its projects", async () => {
  show();
  const select = await screen.findByRole("combobox", { name: "Where does it belong?" });
  await waitFor(async () => expect(groupNames(await snapshotOf(select))).toEqual(["Orchard Press", "Personal"]));
  const list = within(await snapshotOf(select));
  expect(within(list.getByRole("group", { name: "Orchard Press" })).getAllByRole("option").map((o) => o.textContent)).toEqual(["Orchard Press", "The spring catalog", "The spring catalog › Cover art"]);
  expect(within(list.getByRole("group", { name: "Personal" })).getAllByRole("option").map((o) => o.textContent)).toEqual(["Personal", "Home"]);
});

test("a side is only ever its own first choice, named plainly and once, never a project choice", async () => {
  show();
  const select = await screen.findByRole("combobox", { name: "Where does it belong?" });
  await waitFor(async () => expect(groupNames(await snapshotOf(select)).length).toBeGreaterThan(0));
  const names = within(await snapshotOf(select)).getAllByRole("option").map((o) => o.textContent);
  // The side's own choice is its name, once; it is not offered a second time as a project.
  expect(names.filter((n) => n === "Orchard Press")).toHaveLength(1);
  expect(names.filter((n) => n === "Personal")).toHaveLength(1);
  expect(names).not.toContain("In Orchard Press, not in a project");
  expect(names).toContain("Left over");
});

test("choosing a side's own choice hands back the side's id; choosing a project hands back the project's", async () => {
  const user = userEvent.setup();
  const picked: string[] = [];
  show((v) => picked.push(v));
  const select = await screen.findByRole("combobox", { name: "Where does it belong?" });
  await waitFor(async () => expect(groupNames(await snapshotOf(select)).length).toBeGreaterThan(0));
  await user.selectOptions(select, "Orchard Press");
  await user.selectOptions(select, "The spring catalog");
  expect(picked).toEqual(["PRJ-firm", "PRJ-book"]);
});

// Moving something into a side's work says what that changes, the same warning as every other way of moving (design 6.32).
function showMoving(started: string) {
  const sides = [{ project: "PRJ-firm", kind: "business", name: "Orchard Press", removable: false, filed: 0 }];
  fakeApi({
    "GET projects": () => [PERSONAL, HOME, FIRM, BOOK, PART, LOOSE],
    "GET setup/business": () => ({ business: true, name: "Orchard Press", personal: PERSONAL.id, sides, chosen: "work" }),
  });
  function Moving() {
    const [value, setValue] = useState(started);
    return <ProjectPicker label="Where does it belong?" value={value} onChange={setValue} />;
  }
  renderApp(<Moving />);
}

test("moving an item from Personal into a side says it will be visible with that side's work, and moving back says nothing", async () => {
  const user = userEvent.setup();
  showMoving("PRJ-home");
  const select = await screen.findByRole("combobox", { name: "Where does it belong?" });
  await waitFor(async () => expect(groupNames(await snapshotOf(select)).length).toBeGreaterThan(0));
  expect(screen.queryByText(/visible with/)).not.toBeInTheDocument();
  await user.selectOptions(select, "The spring catalog");
  expect(await screen.findByText("This item will be visible with Orchard Press's work.")).toBeInTheDocument();
  await user.selectOptions(select, "Home");
  expect(screen.queryByText(/visible with/)).not.toBeInTheDocument();
});

test("a new item, which starts nowhere, is not warned about where it is put", async () => {
  const user = userEvent.setup();
  showMoving("");
  const select = await screen.findByRole("combobox", { name: "Where does it belong?" });
  await waitFor(async () => expect(groupNames(await snapshotOf(select)).length).toBeGreaterThan(0));
  await user.selectOptions(select, "The spring catalog");
  expect(screen.queryByText(/visible with/)).not.toBeInTheDocument();
});
