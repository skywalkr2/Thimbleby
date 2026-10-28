import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { WordingProvider } from "../lib/wording";
import { ChipList } from "./ChipList";

function Harness(props: { start?: string; disabled?: boolean; onChange?: (draft: string) => void }) {
  const [value, setValue] = useState(props.start ?? "alpha\nbeta");
  return (
    <WordingProvider>
      <label htmlFor="words">Words that mean work</label>
      <ChipList
        id="words"
        label="Words that mean work"
        value={value}
        disabled={props.disabled ?? false}
        onChange={(next) => {
          setValue(next);
          props.onChange?.(next);
        }}
      />
    </WordingProvider>
  );
}

const chips = () => within(screen.getByRole("list", { name: "Words in Words that mean work" })).getAllByRole("listitem");

test("each word is a chip in a list, and the box to type the next one is labelled like the setting", () => {
  render(<Harness />);
  expect(chips().map((c) => c.textContent)).toEqual(["alpha×", "beta×"]);
  expect(screen.getByLabelText("Words that mean work")).toHaveValue("");
});

test("Enter adds the typed word as a chip and empties the box, without submitting a form around it", async () => {
  const user = userEvent.setup();
  const submit = vi.fn((e: React.FormEvent) => e.preventDefault());
  const onChange = vi.fn();
  render(
    <form onSubmit={submit}>
      <Harness onChange={onChange} />
    </form>,
  );
  const box = screen.getByLabelText("Words that mean work");
  await user.type(box, "out of office{Enter}");
  expect(submit).not.toHaveBeenCalled();
  expect(onChange).toHaveBeenLastCalledWith("alpha\nbeta\nout of office");
  expect(chips().map((c) => c.textContent)).toEqual(["alpha×", "beta×", "out of office×"]);
  expect(box).toHaveValue("");
  expect(box).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("Added out of office");
});

test("a word that is already there is not added twice, and the person is told", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  await user.type(screen.getByLabelText("Words that mean work"), "alpha{Enter}");
  expect(onChange).not.toHaveBeenCalled();
  expect(chips()).toHaveLength(2);
  expect(screen.getByRole("status")).toHaveTextContent("alpha is already in the list");
});

test("a blank word adds nothing", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  await user.type(screen.getByLabelText("Words that mean work"), "   {Enter}");
  expect(onChange).not.toHaveBeenCalled();
});

test("a word left in the box when the cursor leaves it is added, not lost", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.type(screen.getByLabelText("Words that mean work"), "gamma");
  await user.tab();
  expect(chips().map((c) => c.textContent)).toEqual(["alpha×", "beta×", "gamma×"]);
});

test("each chip has its own Remove button named for its word, reached and pressed from the keyboard, and says so", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  const remove = screen.getByRole("button", { name: "Remove alpha" });
  await user.tab();
  expect(remove).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onChange).toHaveBeenLastCalledWith("beta");
  expect(chips().map((c) => c.textContent)).toEqual(["beta×"]);
  expect(screen.getByRole("status")).toHaveTextContent("Removed alpha");
  // The cursor goes to the box, so the keyboard is not left on a button that is gone.
  expect(screen.getByLabelText("Words that mean work")).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Remove beta" }));
  expect(onChange).toHaveBeenLastCalledWith("");
  expect(screen.queryByRole("list", { name: "Words in Words that mean work" })).toBeNull();
});

test("pasted lines become one word a line", () => {
  const onChange = vi.fn();
  render(<Harness start="" onChange={onChange} />);
  const box = screen.getByLabelText("Words that mean work");
  fireEvent.paste(box, { clipboardData: { getData: () => "one\ntwo\n\none\nthree" } });
  expect(onChange).toHaveBeenLastCalledWith("one\ntwo\nthree");
});

test("a list that can't be changed has no way to add or remove", () => {
  render(<Harness disabled />);
  expect(screen.getByLabelText("Words that mean work")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Remove alpha" })).toBeDisabled();
});
