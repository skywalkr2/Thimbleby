import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { setTimePrefs } from "../lib/dates";
import { renderApp } from "../test-utils";
import { TimeField } from "./TimeField";

// The time list's step and the clock it is written on are settings (ui.time_step, ui.time_format), read by the box itself.

afterEach(() => setTimePrefs({ format: "auto", step: 15 }));

async function options(props: { step?: number } = {}) {
  const user = userEvent.setup();
  renderApp(<TimeField aria-label="Start" defaultValue="09:30" {...props} />);
  await user.click(screen.getByRole("combobox", { name: "Start" }));
  return within(await screen.findByRole("listbox")).getAllByRole("option");
}

test("the list offers a time every 15 minutes by default", async () => {
  expect(await options()).toHaveLength(96);
});

test("the list offers a time every ui.time_step minutes", async () => {
  setTimePrefs({ step: 30 });
  const list = await options();
  expect(list).toHaveLength(48);
  expect(list[1]).toHaveAttribute("data-value", "00:30");
});

test("a field that names its own step keeps it over the setting", async () => {
  setTimePrefs({ step: 60 });
  expect(await options({ step: 30 })).toHaveLength(48);
});

test("ui.time_format 24h writes the list and the box on the 24-hour clock", async () => {
  setTimePrefs({ format: "24h" });
  const list = await options();
  expect(list[38]).toHaveTextContent("09:30");
  expect(screen.getByRole("combobox", { name: "Start" })).toHaveValue("09:30");
});

test("ui.time_format 12h writes them on the 12-hour clock", async () => {
  setTimePrefs({ format: "12h" });
  const list = await options();
  expect(list[38]).toHaveTextContent(/^9:30\s?AM$/);
  expect((screen.getByRole("combobox", { name: "Start" }) as HTMLInputElement).value).toMatch(/^9:30\s?AM$/);
});
