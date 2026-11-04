import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "../test-utils";
import { RecordsTable } from "./RecordsTable";

// A table draws what its rows hold: a column that is empty for every row is not drawn, and a heading with nothing under it says no number.

interface Row {
  id: string;
  name: string;
  status: string;
  owner: string;
}

const rows: Row[] = [
  { id: "1", name: "Harbor", status: "On track", owner: "" },
  { id: "2", name: "Lantern", status: "", owner: "" },
];

function table(groups = [{ id: "all", title: "All", rows }]) {
  return renderApp(
    <RecordsTable<Row>
      label="Things"
      name={{ header: "Name", cell: (r) => r.name }}
      columns={[
        { id: "status", header: "Status", cell: (r) => r.status },
        { id: "owner", header: "Owner", cell: (r) => r.owner },
      ]}
      groups={groups}
      rowKey={(r) => r.id}
    />,
  );
}

test("a column that is empty for every row is not drawn, and one with a value in any row is", () => {
  table();
  expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: "Owner" })).toBeNull();
});

test("a table with no rows (only group headings) draws its name column alone, since no column has anything to say", () => {
  table([{ id: "all", title: "All", rows: [] }]);
  expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: "Owner" })).toBeNull();
  expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull();
});

test("a group heading with nothing under it shows no number", () => {
  table([
    { id: "a", title: "Has rows", rows },
    { id: "b", title: "Has none", rows: [] },
  ]);
  expect(screen.getByRole("rowgroup", { name: "Has rows" })).toHaveTextContent("Has rows · 2");
  expect(screen.getByRole("rowgroup", { name: "Has none" })).toHaveTextContent(/^Has none$/);
});

test("the column picker sits in the head row's last cell, never in a band of its own above the table", () => {
  const { container } = renderApp(
    <RecordsTable<Row>
      label="Things"
      name={{ header: "Name", cell: (r) => r.name }}
      columns={[
        { id: "status", header: "Status", cell: (r) => r.status, core: true },
        { id: "owner", header: "Owner", cell: (r) => r.owner },
      ]}
      groups={[{ id: "all", title: "All", rows }]}
      rowKey={(r) => r.id}
      actions={() => <span>menu</span>}
      actionsHeader="Actions"
    />,
  );
  const picker = screen.getByRole("button", { name: "Choose columns" });
  expect(picker.closest("th")).not.toBeNull();
  expect(picker.closest("thead")).not.toBeNull();
  expect(container.querySelector("[class*='tools']")).toBeNull();
});

test("a table of names alone has no picker, no band, and a head that stays for a screen reader only", () => {
  const { container } = renderApp(
    <RecordsTable<Row>
      label="Things"
      name={{ header: "Name", cell: (r) => r.name }}
      columns={[{ id: "owner", header: "Owner", cell: (r) => r.owner, core: true }]}
      groups={[{ id: "all", title: "All", rows }]}
      rowKey={(r) => r.id}
      actions={() => <span>menu</span>}
    />,
  );
  expect(screen.queryByRole("button", { name: "Choose columns" })).toBeNull();
  expect(container.querySelector("[class*='tools']")).toBeNull();
  expect(container.querySelector("thead")!.className).toMatch(/headHidden/);
  expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
});
