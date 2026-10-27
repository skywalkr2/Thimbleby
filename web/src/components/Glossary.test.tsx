import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fakeSettings, settingItem } from "../lib/settings-fixtures";
import { renderApp } from "../test-utils";
import { Glossary } from "./Glossary";

const KEY = "language.known_terms";
const items = (value: string[] = []) => [settingItem(KEY, { type: "list", value, default: [] })];
const posted = (calls: ReturnType<typeof fakeSettings>) => calls.filter((c) => c.route === "POST settings").map((c) => c.body as { changes: Record<string, unknown> });

test("the glossary lists the person's own words, and says so when there are none", async () => {
  fakeSettings(items());
  const first = renderApp(<Glossary />);
  expect(await screen.findByRole("heading", { level: 2, name: "Glossary" })).toBeInTheDocument();
  expect(screen.getByText("You have added no words yet.")).toBeInTheDocument();
  first.unmount();
  fakeSettings(items(["acme", "zed"]));
  renderApp(<Glossary />);
  expect(await screen.findByText("acme")).toBeInTheDocument();
  expect(screen.getByText("zed")).toBeInTheDocument();
});

test("a word is added at once, trimmed, and the box is emptied", async () => {
  const calls = fakeSettings(items(["acme"]));
  renderApp(<Glossary />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("A word to add"), "  zed   corp ");
  await user.click(screen.getByRole("button", { name: "Add word" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [KEY]: ["acme", "zed corp"] });
  expect(await screen.findByText("Added zed corp to your glossary.")).toBeInTheDocument();
  expect(screen.getByLabelText("A word to add")).toHaveValue("");
});

test("a word already there, in any case, is not added twice", async () => {
  const calls = fakeSettings(items(["Acme"]));
  renderApp(<Glossary />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("A word to add"), "acme");
  expect(screen.getByRole("button", { name: "Add word" })).toBeDisabled();
  expect(screen.getByText("acme is in your glossary already.")).toBeInTheDocument();
  expect(posted(calls)).toHaveLength(0);
});

test("a word is removed from its own button, with a read-back and Undo that puts it back", async () => {
  const calls = fakeSettings(items(["acme", "zed"]));
  renderApp(<Glossary />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Remove acme" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [KEY]: ["zed"] });
  expect(await screen.findByText("Took acme out of your glossary.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  expect(posted(calls)[1]).toMatchObject({ changes: { [KEY]: ["acme", "zed"] } });
});
