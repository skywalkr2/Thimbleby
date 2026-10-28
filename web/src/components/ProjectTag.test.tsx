import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { ProjectTag } from "./ProjectTag";

// An item's place as a tag (design 6.32): its project, or the side it is filed on directly as "<side>: not in a project".

function show(justMe = false) {
  const personal = project("PRJ-me", "Personal", { side: true });
  fakeApi({
    "GET setup/business": () => ({ business: !justMe, name: null, personal: "PRJ-me", sides: justMe ? [] : [{ project: "PRJ-firm", kind: "business", name: "Orchard Press" }], chosen: null }),
    "GET projects": () => (justMe ? [personal] : [personal, project("PRJ-firm", "Orchard Press", { side: true })]),
  });
}

test("a project shows its name, and its parent before it", () => {
  show();
  renderApp(
    <>
      <ProjectTag name="Spring catalog" parent={null} />
      <ProjectTag name="Cover art" parent="Spring catalog" />
    </>,
  );
  expect(screen.getByText("Spring catalog")).toBeInTheDocument();
  expect(screen.getByText("Spring catalog › Cover art")).toBeInTheDocument();
});

test("an item filed on a side and in no project shows the side as not in a project, never as a project", async () => {
  show();
  renderApp(<ProjectTag name="" side="Orchard Press" parent={null} />);
  expect(await screen.findByText("Orchard Press: not in a project")).toBeInTheDocument();
  expect(screen.queryByText("Orchard Press")).toBeNull();
});

test("nothing is shown when the item has neither a project nor a side", () => {
  show();
  const { container } = renderApp(<ProjectTag name={null} parent={null} side={null} />);
  expect(container.textContent).toBe("");
});

test("with nothing beside Personal, what is on Personal alone has no tag", async () => {
  show(true);
  const { container, client } = renderApp(<ProjectTag name="" side="Personal" parent={null} />);
  // Once the sides are known the tag stays away.
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(client.getQueryData(["business"])).toBeDefined();
  expect(container.textContent).toBe("");
});
