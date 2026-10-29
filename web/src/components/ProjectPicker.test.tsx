import { useState } from "react";
import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { ProjectPicker } from "./ProjectPicker";

// Where something belongs (design 6.32): each side is a group, its own first choice is "in the side, not in a project", then
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
  const groups = await within(select).findAllByRole("group");
  expect(groups.map((g) => g.getAttribute("label"))).toEqual(["Orchard Press", "Personal"]);
  const firm = groups.find((g) => g.getAttribute("label") === "Orchard Press")!;
  expect(within(firm).getAllByRole("option").map((o) => o.textContent)).toEqual(["In Orchard Press, not in a project", "The spring catalog", "The spring catalog › Cover art"]);
  const personal = groups.find((g) => g.getAttribute("label") === "Personal")!;
  expect(within(personal).getAllByRole("option").map((o) => o.textContent)).toEqual(["In Personal, not in a project", "Home"]);
});

test("a side is only ever the choice 'in the side, not in a project', never a project choice", async () => {
  show();
  const select = await screen.findByRole("combobox", { name: "Where does it belong?" });
  await within(select).findAllByRole("group");
  const names = within(select).getAllByRole("option").map((o) => o.textContent);
  expect(names).not.toContain("Orchard Press");
  expect(names).not.toContain("Personal");
  expect(names).toContain("Left over");
});

test("choosing a side's own choice hands back the side's id; choosing a project hands back the project's", async () => {
  const user = userEvent.setup();
  const picked: string[] = [];
  show((v) => picked.push(v));
  const select = await screen.findByRole("combobox", { name: "Where does it belong?" });
  await within(select).findAllByRole("group");
  await user.selectOptions(select, "In Orchard Press, not in a project");
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
  await within(select).findAllByRole("group");
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
  await within(select).findAllByRole("group");
  await user.selectOptions(select, "The spring catalog");
  expect(screen.queryByText(/visible with/)).not.toBeInTheDocument();
});
