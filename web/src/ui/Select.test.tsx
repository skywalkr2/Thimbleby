import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderApp } from "../test-utils";
import { FormField } from "./FormField";
import { LONG_LIST, Select } from "./Select";

function Pick(props: { onChange?: (v: string) => void; value?: string; many?: number }) {
  const [value, setValue] = useState(props.value ?? "b");
  const names = props.many ? Array.from({ length: props.many }, (_, i) => `Place ${String(i + 1).padStart(2, "0")}`) : ["Apple", "Banana", "Cherry", "Blueberry"];
  return (
    <FormField id="pick" label="Fruit">
      <Select
        id="pick"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange?.(e.target.value);
        }}
      >
        {props.many ? names.map((n) => <option key={n} value={n}>{n}</option>) : (
          <>
            <option value="a">Apple</option>
            <option value="b">Banana</option>
            <option value="c">Cherry</option>
            <option value="d" disabled>
              Date
            </option>
            <option value="e">Blueberry</option>
          </>
        )}
      </Select>
    </FormField>
  );
}

test("it is the app's own list: a button that shows the choice, with no native select behind it", () => {
  const { container } = renderApp(<Pick />);
  const box = screen.getByRole("combobox", { name: "Fruit" });
  expect(box.tagName).toBe("BUTTON");
  expect(box).toHaveTextContent("Banana");
  expect(box).toHaveValue("b");
  expect(box).toHaveAttribute("aria-haspopup", "listbox");
  expect(box).toHaveAttribute("aria-expanded", "false");
  expect(container.querySelector("select")).toBeNull();
  expect(document.querySelector("select")).toBeNull();
});

test("it opens with the arrows, moves with the arrows, Home and End, and Enter picks", async () => {
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Pick onChange={(v) => seen.push(v)} />);
  const box = screen.getByRole("combobox", { name: "Fruit" });
  box.focus();
  await user.keyboard("{ArrowDown}");
  expect(box).toHaveAttribute("aria-expanded", "true");
  const list = screen.getByRole("listbox", { name: "Fruit" });
  expect(list).toHaveFocus();
  // The chosen one is where the cursor starts.
  expect(list).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Banana" }).id);
  await user.keyboard("{ArrowDown}");
  expect(list).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Cherry" }).id);
  // A choice that can't be made is skipped.
  await user.keyboard("{ArrowDown}");
  expect(list).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Blueberry" }).id);
  await user.keyboard("{Home}");
  expect(list).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Apple" }).id);
  await user.keyboard("{End}{Enter}");
  expect(seen).toEqual(["e"]);
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(box).toHaveFocus();
  expect(box).toHaveTextContent("Blueberry");
});

test("typing letters jumps to the choice that starts with them, and Escape closes with the cursor back on the button", async () => {
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Pick onChange={(v) => seen.push(v)} />);
  const box = screen.getByRole("combobox", { name: "Fruit" });
  await user.click(box);
  await user.keyboard("bl");
  expect(screen.getByRole("listbox")).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Blueberry" }).id);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(box).toHaveFocus();
  expect(seen).toEqual([]);
  expect(box).toHaveTextContent("Banana");
  // Typing on the closed button opens the list at the match.
  box.focus();
  await user.keyboard("c");
  expect(screen.getByRole("listbox")).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Cherry" }).id);
});

test("a click opens the list and picks; a second click on the button closes it; selectOptions drives it", async () => {
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Pick onChange={(v) => seen.push(v)} />);
  const box = screen.getByRole("combobox", { name: "Fruit" });
  await user.click(box);
  expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute("aria-selected", "true");
  await user.click(screen.getByRole("option", { name: "Apple" }));
  expect(seen).toEqual(["a"]);
  await user.selectOptions(box, "Cherry");
  expect(seen).toEqual(["a", "c"]);
  expect(box).toHaveValue("c");
});

test("a list longer than the limit has a filter box that narrows it and Enter picks the first match", async () => {
  const seen: string[] = [];
  const user = userEvent.setup();
  renderApp(<Pick many={LONG_LIST + 8} value="Place 01" onChange={(v) => seen.push(v)} />);
  await user.click(screen.getByRole("combobox", { name: "Fruit" }));
  const filter = screen.getByRole("combobox", { name: "Search this list" });
  expect(filter).toHaveFocus();
  await user.keyboard("place 1");
  const shown = screen.getAllByRole("option").map((o) => o.textContent?.trim());
  expect(shown.length).toBeGreaterThan(0);
  expect(shown.every((n) => n?.includes("1"))).toBe(true);
  expect(shown.length).toBeLessThan(LONG_LIST + 8);
  await user.keyboard("{ArrowDown}{Enter}");
  expect(seen.length).toBe(1);
  expect(seen[0]).toContain("1");
  await user.click(screen.getByRole("combobox", { name: "Fruit" }));
  await user.keyboard("zzz");
  expect(screen.getByRole("status")).toHaveTextContent("Nothing matches");
});

test("a short list has no filter box", async () => {
  const user = userEvent.setup();
  renderApp(<Pick />);
  await user.click(screen.getByRole("combobox", { name: "Fruit" }));
  expect(screen.queryByRole("combobox", { name: "Search this list" })).toBeNull();
});

test("a disabled list does not open, and an unmatched value shows the first choice", async () => {
  const user = userEvent.setup();
  renderApp(
    <>
      <Select aria-label="Off" value="x" disabled>
        <option value="a">Alpha</option>
      </Select>
    </>,
  );
  const box = screen.getByRole("combobox", { name: "Off" });
  expect(box).toBeDisabled();
  expect(box).toHaveTextContent("Alpha");
  await user.click(box);
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("the cursor going into the list is not the control losing it", async () => {
  const left: string[] = [];
  const user = userEvent.setup();
  renderApp(
    <Select aria-label="Who" value="a" onBlur={() => left.push("blur")} onChange={() => undefined}>
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
    </Select>,
  );
  await user.click(screen.getByRole("combobox", { name: "Who" }));
  expect(left).toEqual([]);
  await user.keyboard("{Escape}");
  expect(left).toEqual([]);
  await user.tab();
  expect(left).toEqual(["blur"]);
});

test("the shown choice carries its whole text as a title, since a long one is cut with an ellipsis", () => {
  renderApp(<Pick />);
  const box = screen.getByRole("combobox", { name: "Fruit" });
  expect(box.querySelector("span[title]")).toHaveAttribute("title", "Banana");
});

test("a choice that opens a field of its own leaves the cursor in that field, not back on the button", async () => {
  const user = userEvent.setup();
  function Adds() {
    const [adding, setAdding] = useState(false);
    return (
      <FormField id="org" label="Organization">
        <Select id="org" value="" onChange={(e) => setAdding(e.target.value === "add")}>
          <option value="">Not set</option>
          <option value="add">Add one…</option>
        </Select>
        {adding && <input aria-label="Name of the new one" autoFocus />}
      </FormField>
    );
  }
  renderApp(<Adds />);
  await user.click(screen.getByRole("combobox", { name: "Organization" }));
  await user.click(screen.getByRole("option", { name: "Add one…" }));
  expect(await screen.findByRole("textbox", { name: "Name of the new one" })).toHaveFocus();
});
