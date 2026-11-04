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
