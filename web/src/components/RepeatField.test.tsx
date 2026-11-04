import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { fakeApi, renderApp, snapshotOf } from "../test-utils";
import { REPEAT_CHOICES, RepeatField } from "./RepeatField";

// How a to-do repeats is a list of the usual ways, "Doesn't repeat" first; any other way is "Something else", which brings up a
// words box. What a choice stands for is the phrase the server reads, and the line under the field says it back.

function Harness(props: { start?: string; onValue?: (v: string) => void }) {
  const [value, setValue] = useState(props.start ?? "");
  return (
    <RepeatField
      id="t"
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onValue?.(v);
      }}
    >
      Said back
    </RepeatField>
  );
}

test("the list starts at Doesn't repeat, names the usual ways, and ends with Something else", async () => {
  fakeApi({});
  renderApp(<Harness />);
  const list = screen.getByRole("combobox", { name: "Repeats" });
  expect(list).toHaveValue("");
  expect(within(await snapshotOf(list)).getAllByRole("option").map((o) => o.textContent)).toEqual([
    "Doesn't repeat",
    "Every day",
    "Every weekday",
    "Every week",
    "Every other week",
    "Every month",
    "Something else",
  ]);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.getByText("Said back")).toBeInTheDocument();
});

test("a usual way gives its phrase without any typing", async () => {
  const user = userEvent.setup();
  const seen: string[] = [];
  fakeApi({});
  renderApp(<Harness onValue={(v) => seen.push(v)} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Repeats" }), "Every week");
  expect(seen).toEqual([REPEAT_CHOICES.find((c) => c.key === "weekly")!.phrase]);
  expect(screen.queryByRole("textbox")).toBeNull();
  await user.selectOptions(screen.getByRole("combobox", { name: "Repeats" }), "Doesn't repeat");
  expect(seen.at(-1)).toBe("");
});

test("Something else shows the words box, with the cursor in it, and a phrase not on the list opens that way", async () => {
  const user = userEvent.setup();
  fakeApi({});
  const first = renderApp(<Harness />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Repeats" }), "Something else");
  expect(await screen.findByRole("textbox", { name: "How it repeats, in words" })).toHaveFocus();
  first.unmount();
  renderApp(<Harness start="every Friday" />);
  expect(screen.getByRole("combobox", { name: "Repeats" })).toHaveValue("other");
  expect(screen.getByRole("textbox", { name: "How it repeats, in words" })).toHaveValue("every Friday");
});
