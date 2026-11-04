import "@testing-library/jest-dom/vitest";
import { act, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderApp } from "../test-utils";
import { MoneyField } from "./MoneyField";

// A value put back from outside while the cursor is in the box (Reset moves the cursor into the box it has just reset) is
// what leaving the box writes: an older value kept from entering it would be saved again, undoing the Reset.
test("an amount put back while the cursor is in the box is what leaving it commits, never the one shown before", async () => {
  const user = userEvent.setup();
  const commit = vi.fn();
  let putBack: () => void = () => {};
  function Held() {
    const [value, setValue] = useState("571");
    putBack = () => setValue("2");
    return <MoneyField id="m" value={value} disabled={false} onChange={() => {}} onCommit={commit} />;
  }
  renderApp(<Held />);
  const box = screen.getByRole("textbox");
  await user.click(box);
  expect(box).toHaveFocus();
  act(() => putBack());
  await user.tab();
  expect(commit).toHaveBeenCalledTimes(1);
  expect(commit).toHaveBeenCalledWith("2");
});
