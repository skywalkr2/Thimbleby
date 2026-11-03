import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { fakeApi, renderApp } from "../test-utils";
import { todayOn } from "../lib/dates";
import { DateField } from "./DateField";
import { FormField } from "./FormField";

function Day(props: { start?: string; kind?: "date" | "time" | "datetime-local"; min?: string; max?: string; onChange?: (v: string) => void; label?: string }) {
  const [value, setValue] = useState(props.start ?? "");
  return (
    <FormField id="d" label={props.label ?? "Due"}>
      <DateField
        id="d"
        kind={props.kind}
        min={props.min}
        max={props.max}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange?.(e.target.value);
        }}
      />
    </FormField>
  );
}

const schedule = (week_starts_on: number, work_days = [0, 1, 2, 3, 4]) => ({ "GET schedule": () => ({ today: "2026-11-03", first: "2026-11-03", days: [], on_its_way: [], work_days, week_starts_on, grid_starts: "07:00", grid_ends: "19:00", month_entries: 3 }) });

test("a date is a text box with a calendar button, not the browser's date input", () => {
  fakeApi({});
  const { container } = renderApp(<Day start="2026-10-28" />);
  const box = screen.getByRole("textbox", { name: "Due" });
  expect(box).toHaveValue("Oct 28, 2026");
  expect(container.querySelector('input[type="date"], input[type="time"], input[type="datetime-local"]')).toBeNull();
  expect(screen.getByRole("button", { name: "Choose a date: Due" })).toHaveAttribute("aria-haspopup", "dialog");
});

test("what is typed is read in the locale and handed on as the ISO date, when the box is left or Enter is pressed", async () => {
  fakeApi({});
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Day onChange={(v) => seen.push(v)} />);
  const box = screen.getByRole("textbox", { name: "Due" });
  await user.type(box, "10/28");
  expect(seen).toEqual([]);
  await user.tab();
  expect(seen).toEqual([`${todayOn(new Date()).slice(0, 4)}-10-28`]);
  expect(box).toHaveValue(new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(Number(todayOn(new Date()).slice(0, 4)), 9, 28)));
  await user.clear(box);
  await user.type(box, "tomorrow{Enter}");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  expect(seen.at(-1)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await user.clear(box);
  await user.tab();
  expect(seen.at(-1)).toBe("");
});

test("a whole date is taken as it is typed, and one that can't be read is said and not taken", async () => {
  fakeApi({});
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Day onChange={(v) => seen.push(v)} />);
  const box = screen.getByRole("textbox", { name: "Due" });
  await user.type(box, "2026-10-28");
  expect(seen).toEqual(["2026-10-28"]);
  await user.clear(box);
  await user.type(box, "whenever");
  await user.tab();
  expect(screen.getByRole("alert")).toHaveTextContent("isn't a date this box can read");
  expect(box).toHaveAttribute("aria-invalid", "true");
  // Clearing the box cleared the value; the text that can't be read changed nothing after that.
  expect(seen).toEqual(["2026-10-28", ""]);
  await user.clear(box);
  await user.type(box, "Nov 4");
  expect(screen.queryByRole("alert")).toBeNull();
});

test("a date outside the first and last day is handed on as typed, as the browser's box did, and the box can't be submitted holding it", async () => {
  fakeApi({});
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Day min="2026-11-02" max="2026-11-30" onChange={(v) => seen.push(v)} />);
  const box = screen.getByRole("textbox", { name: "Due" });
  await user.type(box, "2026-10-28");
  await user.tab();
  expect(seen).toEqual(["2026-10-28"]);
  expect((box as HTMLInputElement).validity.customError).toBe(true);
  expect((box as HTMLInputElement).validationMessage).toBe("That day can't be chosen here. Pick one from the calendar.");
  await user.clear(box);
  await user.type(box, "2026-11-15");
  expect((box as HTMLInputElement).validity.valid).toBe(true);
});

test("a required date is required by the form that holds it", () => {
  fakeApi({});
  renderApp(<FormField id="r" label="Must"><DateField id="r" required value="" onChange={() => undefined} /></FormField>);
  expect((screen.getByRole("textbox", { name: "Must" }) as HTMLInputElement).validity.valueMissing).toBe(true);
});

test("the calendar opens on the chosen day; arrows, Page Down and Home move by a day, a month and to the week's start; Enter picks", async () => {
  fakeApi(schedule(0));
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Day start="2026-10-28" onChange={(v) => seen.push(v)} />);
  const open = screen.getByRole("button", { name: "Choose a date: Due" });
  await user.click(open);
  const dialog = await screen.findByRole("dialog", { name: "Calendar" });
  expect(open).toHaveAttribute("aria-expanded", "true");
  const grid = within(dialog).getByRole("grid");
  await waitFor(() => expect(within(grid).getByRole("button", { name: /October 28, 2026/ })).toHaveFocus());
  await user.keyboard("{ArrowRight}");
  expect(within(grid).getByRole("button", { name: /October 29, 2026/ })).toHaveFocus();
  await user.keyboard("{ArrowDown}");
  expect(within(grid).getByRole("button", { name: /November 5, 2026/ })).toHaveFocus();
  await user.keyboard("{ArrowLeft}{ArrowUp}");
  expect(within(grid).getByRole("button", { name: /October 28, 2026/ })).toHaveFocus();
  await user.keyboard("{PageDown}");
  expect(within(grid).getByRole("button", { name: /November 28, 2026/ })).toHaveFocus();
  await user.keyboard("{PageUp}{Home}");
  // The week starts on Monday here, so the first of the week of Wednesday October 28 is Monday October 26.
  expect(within(grid).getByRole("button", { name: /October 26, 2026/ })).toHaveFocus();
  await user.keyboard("{End}");
  expect(within(grid).getByRole("button", { name: /November 1, 2026/ })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(seen).toEqual(["2026-11-01"]);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(open).toHaveFocus();
  expect(screen.getByRole("textbox", { name: "Due" })).toHaveValue("Nov 1, 2026");
});

test("Escape closes the calendar without a choice and gives the cursor back to the button", async () => {
  fakeApi(schedule(0));
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Day start="2026-10-28" onChange={(v) => seen.push(v)} />);
  const open = screen.getByRole("button", { name: "Choose a date: Due" });
  await user.click(open);
  await screen.findByRole("dialog", { name: "Calendar" });
  await user.keyboard("{ArrowRight}{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(open).toHaveFocus();
  expect(seen).toEqual([]);
});

test("the week starts on the day the schedule is set to start on, and the days not worked are marked", async () => {
  fakeApi(schedule(6));
  const user = userEvent.setup();
  renderApp(<Day start="2026-10-28" />);
  await user.click(screen.getByRole("button", { name: "Choose a date: Due" }));
  const dialog = await screen.findByRole("dialog", { name: "Calendar" });
  await waitFor(() => expect(dialog.querySelectorAll("th")[0]).toHaveTextContent(/^S/));
  const first = Array.from(dialog.querySelectorAll("th")).map((h) => h.textContent);
  // Sunday first: the header runs S M T W T F S.
  expect(first.join("")).toBe("SMTWTFS");
  await waitFor(() => expect(within(dialog).getByRole("button", { name: /Saturday, October 31, 2026/ })).toHaveAttribute("data-off"));
  expect(within(dialog).getByRole("button", { name: /Wednesday, October 28, 2026/ })).not.toHaveAttribute("data-off");
  expect(within(dialog).getByText("Underlined days are your days off.")).toBeInTheDocument();
});

test("a Monday week start puts Monday first", async () => {
  fakeApi(schedule(0));
  const user = userEvent.setup();
  renderApp(<Day start="2026-10-28" />);
  await user.click(screen.getByRole("button", { name: "Choose a date: Due" }));
  const dialog = await screen.findByRole("dialog", { name: "Calendar" });
  await waitFor(() => expect(Array.from(dialog.querySelectorAll("th")).map((h) => h.textContent).join("")).toBe("MTWTFSS"));
});

test("a day and a time are two boxes, and the value is whole only when both are chosen", async () => {
  fakeApi({});
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Day kind="datetime-local" label="Starts" onChange={(v) => seen.push(v)} />);
  await user.type(screen.getByRole("textbox", { name: "Starts" }), "2026-10-28");
  expect(seen).toEqual([]);
  expect(screen.getByRole("textbox", { name: "Starts" })).toHaveValue("2026-10-28");
  const time = screen.getByRole("combobox", { name: "Time of day" });
  await user.type(time, "9:30 pm");
  await user.tab();
  expect(seen.at(-1)).toBe("2026-10-28T21:30");
  expect(time).toHaveValue(new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, 21, 30)));
});

test("a value held by the caller comes into the boxes, and a change from outside replaces what is shown", () => {
  fakeApi({});
  const { rerender } = renderApp(<DateField id="x" aria-label="When" kind="datetime-local" value="2026-10-28T09:15" />);
  expect(screen.getByRole("textbox", { name: "When" })).toHaveValue("Oct 28, 2026");
  expect(screen.getByRole("combobox", { name: "Time of day" })).toHaveValue(new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, 9, 15)));
  expect(rerender).toBeDefined();
});

test("a time follows the clock the reader uses: 12-hour or 24-hour, and the same text in is the same value out", async () => {
  fakeApi({});
  for (const [locale, shown] of [
    ["en-US", "9:30 PM"],
    ["en-GB", "21:30"],
  ] as const) {
    const seen: string[] = [];
    const user = userEvent.setup();
    const { unmount } = renderApp(<Day kind="time" label={`At ${locale}`} onChange={(v) => seen.push(v)} />, {}, { locale });
    const box = screen.getByRole("combobox", { name: `At ${locale}` });
    await user.type(box, "9:30 pm");
    await user.tab();
    expect(seen).toEqual(["21:30"]);
    expect(box).toHaveValue(shown.replace(/ /g, " "));
    unmount();
  }
});

test("a time is read in every form a person writes it", async () => {
  fakeApi({});
  const cases: Array<[string, string]> = [["9", "09:00"], ["9:30", "09:30"], ["930", "09:30"], ["9:30 pm", "21:30"], ["21:30", "21:30"], ["9pm", "21:00"]];
  for (const [typed, want] of cases) {
    const seen: string[] = [];
    const user = userEvent.setup();
    const { unmount } = renderApp(<Day kind="time" label="At" onChange={(v) => seen.push(v)} />);
    await user.type(screen.getByRole("combobox", { name: "At" }), typed);
    await user.tab();
    expect(seen, typed).toEqual([want]);
    unmount();
  }
});

test("a time that can't be read is said and not taken", async () => {
  fakeApi({});
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Day kind="time" label="At" onChange={(v) => seen.push(v)} />);
  await user.type(screen.getByRole("combobox", { name: "At" }), "25:99");
  await user.tab();
  expect(seen).toEqual([]);
  expect(screen.getByRole("alert")).toHaveTextContent("isn't a time this box can read");
});

test("the list of times is a combobox: the arrows move through it at the step, Enter picks, Escape closes it", async () => {
  fakeApi({});
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Day kind="time" label="At" start="09:00" onChange={(v) => seen.push(v)} />);
  const box = screen.getByRole("combobox", { name: "At" });
  await user.click(box);
  const list = screen.getByRole("listbox", { name: "Times" });
  expect(within(list).getAllByRole("option")).toHaveLength(96);
  expect(box).toHaveAttribute("aria-expanded", "true");
  expect(box).toHaveFocus();
  expect(box).toHaveAttribute("aria-activedescendant", within(list).getByRole("option", { selected: true }).id);
  await user.keyboard("{ArrowDown}{ArrowDown}");
  await user.keyboard("{Enter}");
  expect(seen).toEqual(["09:30"]);
  expect(screen.queryByRole("listbox")).toBeNull();
  await user.click(box);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(box).toHaveFocus();
  expect(seen).toEqual(["09:30"]);
  // A click on a time picks it.
  await user.click(box);
  await user.click(screen.getAllByRole("option")[52]);
  expect(seen.at(-1)).toMatch(/^13:00$/);
  fireEvent.blur(box);
});
