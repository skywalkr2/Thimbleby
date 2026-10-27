import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { project } from "./records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { useFieldLabel } from "./records";

// A record's page words its fields for the person who has it: with nothing beside Personal it says area and who does it where
// others read project and owners, and no draft is called "Work" (design 7.8, 7.14).

function Labels() {
  const labelOf = useFieldLabel();
  return (
    <ul>
      {["project", "projects", "owners", "owner", "work", "due"].map((name) => (
        <li key={name} data-name={name}>
          {labelOf(name)}
        </li>
      ))}
    </ul>
  );
}

const personal = project("PRJ-personal", "Personal");
const text = (name: string) => document.querySelector(`[data-name="${name}"]`)?.textContent;

test("with nothing beside Personal the fields read area and who does it, and a draft is not Work", async () => {
  fakeApi({
    "GET setup/business": () => ({ business: false, name: null, personal: "PRJ-personal", sides: [], chosen: "me" }),
    "GET projects": () => [personal],
  });
  renderApp(<Labels />);
  await waitFor(() => expect(text("project")).toBe("Area"));
  expect(["projects", "owners", "owner", "work", "due"].map(text)).toEqual(["Areas", "Who does it", "Who runs it", "Draft", "Due date"]);
});

test("with a side beside Personal the fields keep their ordinary words", async () => {
  fakeApi({
    "GET setup/business": () => ({ business: true, name: "Shop", personal: "PRJ-personal", sides: [{ project: "PRJ-shop", kind: "business", name: "Shop", removable: false }], chosen: "work" }),
    "GET projects": () => [personal, project("PRJ-shop", "Shop")],
  });
  renderApp(<Labels />);
  await screen.findByText("Project");
  expect(["projects", "owners", "owner", "work"].map(text)).toEqual(["Projects", "Owners", "Owner", "Draft"]);
});
