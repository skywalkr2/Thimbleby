import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { fakeApi, renderApp } from "../test-utils";
import { DateField } from "./DateField";
import { Drawer } from "./Drawer";
import { FormField } from "./FormField";
import { Select } from "./Select";

// A list, a date and a time are opened over a drawer: each opens in a layer of its own that a screen reader can reach, takes its
// keys and clicks itself (the drawer's own keys and its outside click never see them), and leaves the drawer open.
function Form(props: { onClose: () => void; onRow: () => void }) {
  const [who, setWho] = useState("a");
  const [day, setDay] = useState("2026-10-28");
  const [at, setAt] = useState("09:00");
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={props.onRow} onKeyDown={(e) => e.key === "Enter" && props.onRow()}>
      <Drawer open title="Plan" onClose={props.onClose}>
        <FormField id="who" label="Who">
          <Select id="who" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="a">Alpha</option>
            <option value="b">Beta</option>
          </Select>
        </FormField>
        <FormField id="day" label="Day">
          <DateField id="day" value={day} onChange={(e) => setDay(e.target.value)} />
        </FormField>
        <FormField id="at" label="At">
          <DateField id="at" kind="time" value={at} onChange={(e) => setAt(e.target.value)} />
        </FormField>
      </Drawer>
    </div>
  );
}

test("a list picked over a drawer is reachable, picks, and leaves the drawer and the row behind it alone", async () => {
  fakeApi({});
  const closed: string[] = [];
  const row: string[] = [];
  const user = userEvent.setup();
  renderApp(<Form onClose={() => closed.push("closed")} onRow={() => row.push("row")} />);
  const drawer = await screen.findByRole("dialog", { name: "Plan" });
  await user.click(within(drawer).getByRole("combobox", { name: "Who" }));
  const list = await screen.findByRole("listbox", { name: "Who" });
  // The click that opened it is the drawer's own; from here on what happens in the list stays in the list.
  row.length = 0;
  await user.keyboard("{ArrowDown}{Enter}");
  expect(within(drawer).getByRole("combobox", { name: "Who" })).toHaveTextContent("Beta");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(list).not.toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "Plan" })).toBeInTheDocument();
  expect(closed).toEqual([]);
  expect(row).toEqual([]);
  expect(within(drawer).getByRole("combobox", { name: "Who" })).toHaveFocus();
});

test("the calendar over a drawer is reachable, picks with Enter, and leaves the drawer open", async () => {
  fakeApi({});
  const closed: string[] = [];
  const row: string[] = [];
  const user = userEvent.setup();
  renderApp(<Form onClose={() => closed.push("closed")} onRow={() => row.push("row")} />);
  const drawer = await screen.findByRole("dialog", { name: "Plan" });
  await user.click(within(drawer).getByRole("button", { name: "Choose a date: Day" }));
  const calendar = await screen.findByRole("dialog", { name: "Calendar" });
  row.length = 0;
  await waitFor(() => expect(within(calendar).getByRole("button", { name: /October 28, 2026/ })).toHaveFocus());
  await user.keyboard("{ArrowRight}{Enter}");
  expect(within(drawer).getByRole("textbox", { name: "Day" })).toHaveValue("Oct 29, 2026");
  expect(screen.queryByRole("dialog", { name: "Calendar" })).toBeNull();
  expect(screen.getByRole("dialog", { name: "Plan" })).toBeInTheDocument();
  expect(closed).toEqual([]);
  expect(row).toEqual([]);
});

test("the list of times over a drawer is reachable and a click on a time picks it", async () => {
  fakeApi({});
  const closed: string[] = [];
  const user = userEvent.setup();
  renderApp(<Form onClose={() => closed.push("closed")} onRow={() => undefined} />);
  const drawer = await screen.findByRole("dialog", { name: "Plan" });
  await user.click(within(drawer).getByRole("combobox", { name: "At" }));
  const list = await screen.findByRole("listbox", { name: "Times" });
  await user.click(within(list).getAllByRole("option")[40]);
  expect(within(drawer).getByRole("combobox", { name: "At" })).toHaveValue(new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, 10, 0)));
  expect(screen.getByRole("dialog", { name: "Plan" })).toBeInTheDocument();
  expect(closed).toEqual([]);
});
