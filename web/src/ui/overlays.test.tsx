import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Button as AriaButton, Dialog, DialogTrigger } from "react-aria-components";
import { DialogFooter, ModalPanel } from "../components/ModalPanel";
import { Button } from "./Button";
import { Drawer } from "./Drawer";
import { BottomSheet } from "./Overlay";
import { Popover } from "./Popover";

// The overlay family (design 7.12): one frame for the drawer, the dialog and the sheet, one popover, one menu.

test("a drawer and a dialog share one frame, marked by their kind, with the handle a phone's sheet shows", () => {
  render(
    <>
      <Drawer open title="Add a person" onClose={() => undefined}>
        <input aria-label="Name" />
      </Drawer>
    </>,
  );
  const frame = screen.getByRole("dialog", { name: "Add a person" }).closest("[data-overlay]");
  expect(frame).toHaveAttribute("data-overlay", "drawer");
  expect(frame?.querySelector("[aria-hidden=true]")).not.toBeNull();
});

test("a dialog's actions are its footer, and the dialog is named by its heading", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  function Demo() {
    const [open, setOpen] = useState(true);
    return open ? (
      <ModalPanel titleId="t" onClose={() => { setOpen(false); onClose(); }}>
        <h2 id="t">Remove this?</h2>
        <DialogFooter>
          <Button variant="quiet" onClick={() => setOpen(false)}>Keep it</Button>
          <Button variant="danger">Remove</Button>
        </DialogFooter>
      </ModalPanel>
    ) : null;
  }
  render(<Demo />);
  const dialog = await screen.findByRole("dialog", { name: "Remove this?" });
  expect(dialog.closest("[data-overlay]")).toHaveAttribute("data-overlay", "dialog");
  const footer = screen.getByRole("button", { name: "Remove" }).closest("[data-actions]");
  expect(footer).not.toBeNull();
  expect(footer?.textContent).toBe("Keep itRemove");
  await user.click(screen.getByRole("button", { name: "Keep it" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("a bottom sheet is a modal kept at the bottom edge and closes with Escape", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(
    <BottomSheet onClose={onClose}>
      <Dialog aria-label="More">
        <button type="button">One</button>
      </Dialog>
    </BottomSheet>,
  );
  expect(screen.getByRole("dialog", { name: "More" }).closest("[data-overlay]")).toHaveAttribute("data-overlay", "sheet");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

test("a popover opens from its button, is named, takes its parts in two columns on request and gives focus back", async () => {
  const user = userEvent.setup();
  render(
    <DialogTrigger>
      <AriaButton>Details</AriaButton>
      <Popover label="What is going on" columns={2}>
        {(close) => (
          <ul>
            <li>One</li>
            <li>Two</li>
            <li>
              <Button onClick={close}>Done</Button>
            </li>
          </ul>
        )}
      </Popover>
    </DialogTrigger>,
  );
  const opener = screen.getByRole("button", { name: "Details" });
  await user.click(opener);
  const dialog = await screen.findByRole("dialog", { name: "What is going on" });
  expect(dialog.closest("[data-columns]")).toHaveAttribute("data-columns", "2");
  await user.click(screen.getByRole("button", { name: "Done" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(opener).toHaveFocus());
});
