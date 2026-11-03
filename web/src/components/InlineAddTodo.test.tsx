import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { person } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { InlineAddTodo } from "./InlineAddTodo";

function api(extra = {}) {
  return fakeApi({
    "GET people": () => [{ ...person("P-1", "Quinn Sample"), is_pm: true }],
    "GET setup/business": () => ({ business: false, personal: null, sides: [] }),
    "POST todos": () => ({ action: "A-9", changesets: ["CS-9"] }),
    "POST changesets/CS-9/undo": () => ({ restored: [0], skipped: [] }),
    ...extra,
  });
}

const row = (onDetails: (words: string) => void = () => undefined) => renderApp(<ul><InlineAddTodo onDetails={onDetails} /></ul>);

test("typing a title and pressing Enter adds the to-do as the person's own, with Undo, and the cursor stays in the row for the next one", async () => {
  const user = userEvent.setup();
  const calls = api();
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET people")).toBe(true));
  await user.type(field, "Call the printer{Enter}");
  await waitFor(() => expect(calls.find((c) => c.route === "POST todos")?.body).toEqual({ text: "Call the printer", owners: ["P-1"] }));
  await waitFor(() => expect(field).toHaveValue(""));
  expect(field).toHaveFocus();
  expect(await screen.findByRole("button", { name: "Undo" })).toBeVisible();
  // The next one goes the same way.
  await user.type(field, "Send the proof{Enter}");
  await waitFor(() => expect(calls.filter((c) => c.route === "POST todos")).toHaveLength(2));
});

test("nothing is added for an empty title or for words past the limit, which are said in words", async () => {
  const user = userEvent.setup();
  const calls = api();
  row();
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await user.type(field, "{Enter}");
  await user.click(field);
  await user.paste("x".repeat(320));
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("status")).toHaveTextContent(/20/);
  expect(field).toHaveAttribute("aria-invalid", "true");
  expect(calls.some((c) => c.route === "POST todos")).toBe(false);
});

test("with several sides and none picked the form opens with the words typed, since it asks where the to-do belongs", async () => {
  const user = userEvent.setup();
  let words = "";
  const calls = api({
    "GET setup/business": () => ({ business: true, personal: "PRJ-0", sides: [{ project: "PRJ-1", name: "Harbor" }] }),
  });
  row((w: string) => {
    words = w;
  });
  const field = await screen.findByRole("textbox", { name: "Add a to-do" });
  await waitFor(() => expect(calls.some((c) => c.route === "GET setup/business")).toBe(true));
  await user.type(field, "Call the printer");
  await waitFor(() => expect(calls.filter((c) => c.route === "GET setup/business").length).toBeGreaterThan(0));
  await user.keyboard("{Enter}");
  await waitFor(() => expect(words).toBe("Call the printer"));
  expect(calls.some((c) => c.route === "POST todos")).toBe(false);
  expect(field).toHaveValue("");
});
