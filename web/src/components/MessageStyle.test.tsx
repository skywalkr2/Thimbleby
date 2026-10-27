import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fakeSettings, settingItem } from "../lib/settings-fixtures";
import { renderApp } from "../test-utils";
import { MessageStyle } from "./MessageStyle";

const GREETING = "language.messages.greeting";
const CLOSING = "language.messages.closing";
const items = () => [
  settingItem(GREETING, { value: "Hi {first_name},", default: "Hi {first_name}," }),
  settingItem(CLOSING, { value: "Thanks!", default: "Thanks!" }),
];
const posted = (calls: ReturnType<typeof fakeSettings>) => calls.filter((c) => c.route === "POST settings").map((c) => c.body as { changes: Record<string, unknown>; reset: string[] });

test("how messages start and end is a closed section with a preview for each line, with a made-up name and no marker", async () => {
  fakeSettings(items());
  renderApp(<MessageStyle />);
  const fold = (await screen.findByText("How your messages start and end")).closest("details") as HTMLDetailsElement;
  expect(fold.open).toBe(false);
  await userEvent.setup().click(screen.getByText("How your messages start and end"));
  expect(screen.getByText("Hi Ada,")).toBeVisible();
  expect(screen.getByText("Thanks!")).toBeVisible();
  expect(screen.queryByDisplayValue("Hi {first_name},")).toBeNull();
});

test("the pattern is behind Edit the pattern, the preview follows what is typed, and the line is saved when the cursor leaves", async () => {
  const calls = fakeSettings(items());
  renderApp(<MessageStyle />);
  const user = userEvent.setup();
  await user.click(await screen.findByText("How your messages start and end"));
  await user.click(screen.getByRole("button", { name: /Edit the pattern.*How your messages start/ }));
  const box = screen.getByLabelText("How your messages start, the pattern");
  expect(box).toHaveFocus();
  expect(box).toHaveValue("Hi {first_name},");
  await user.clear(box);
  await user.type(box, "Hello {{first_name},");
  expect(posted(calls)).toHaveLength(0);
  await user.tab();
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [GREETING]: "Hello {first_name}," });
  expect(await screen.findByText("Hello Ada,")).toBeVisible();
  expect(await screen.findByText("Changed")).toBeInTheDocument();
});

test("Reset puts a line back to the default in one save, with its read-back", async () => {
  const calls = fakeSettings([settingItem(GREETING, { value: "Dear {first_name},", default: "Hi {first_name}," }), settingItem(CLOSING, { value: "Thanks!", default: "Thanks!" })]);
  renderApp(<MessageStyle />);
  const user = userEvent.setup();
  await user.click(await screen.findByText("How your messages start and end"));
  await user.click(screen.getByRole("button", { name: "Reset: How your messages start" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].reset).toEqual([GREETING]);
  expect(await screen.findByText("Hi Ada,")).toBeVisible();
});

test("nothing is shown until the settings are there", async () => {
  fakeSettings([]);
  renderApp(<MessageStyle />);
  await waitFor(() => expect(screen.queryByText("How your messages start and end")).toBeNull());
});
