import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test-utils";
import { NotAvailable } from "./NotAvailable";

test("a page this copy doesn't have says so, with the cursor on its heading and a way back", async () => {
  const back = vi.fn();
  renderApp(<NotAvailable title="Style guide" onBack={back} />);
  const heading = await screen.findByRole("heading", { level: 1, name: "Style guide" });
  expect(heading).toHaveFocus();
  expect(screen.getByText("This page isn't available here.")).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "Back to Today" }));
  expect(back).toHaveBeenCalledTimes(1);
});
