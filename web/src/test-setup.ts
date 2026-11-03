import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { configure, waitFor } from "@testing-library/react";
import { closeEveryEditor } from "./lib/one-editor";

// A loaded machine can take longer than the default second to render a screen's first data; waiting longer costs
// nothing when it renders sooner.
configure({ asyncUtilTimeout: 4000 });
window.scrollTo = () => undefined;

// What a screen keeps as a draft in the tab never carries from one test to the next.
beforeEach(() => window.sessionStorage.clear());

// And an editor one test left open is not open in the next.
beforeEach(() => closeEveryEditor());

// The app's list to pick from (ui/Select) is a button that opens a listbox, not the browser's select, so the browser-select
// helper of user-event can't drive it. Where it is given one of ours, `selectOptions` opens the list and clicks each choice
// asked for, by its value or its words; any other element is left to user-event as before.
type User = ReturnType<typeof userEvent.setup>;
async function chooseIn(user: User, select: Element, wanted: unknown): Promise<void> {
  if (select.getAttribute("aria-expanded") !== "true") await user.click(select);
  const list = document.getElementById(select.getAttribute("aria-controls") ?? "");
  if (!list) throw new Error("The list did not open. " + document.body.innerHTML.slice(0, 1500));
  for (const want of Array.isArray(wanted) ? wanted : [wanted]) {
    const text = want instanceof HTMLElement ? (want.getAttribute("data-value") ?? want.textContent?.trim()) : String(want);
    // The choices of a list that loads are there a moment after the list is: wait for the one asked for, as a person would.
    let option: HTMLElement | undefined;
    const seen = () => Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));
    await waitFor(
      () => {
        option = seen().find((o) => o.dataset.value === text) ?? seen().find((o) => o.textContent?.trim() === text);
        if (!option) throw new Error(`No choice "${text}" in the list: ${seen().map((o) => o.textContent?.trim()).join(" | ")}`);
      },
      { timeout: 2500 },
    );
    await user.click(option!);
  }
}
const isOurs = (el: unknown): el is Element => el instanceof Element && el.getAttribute("data-ui") === "select";
const makeSetup = userEvent.setup.bind(userEvent);
const patch = userEvent as unknown as Record<string, unknown>;
patch.setup = (...args: Parameters<typeof userEvent.setup>) => {
  const user = makeSetup(...args);
  const original = user.selectOptions.bind(user);
  (user as unknown as Record<string, unknown>).selectOptions = (el: Element, values: unknown) => (isOurs(el) ? chooseIn(user, el, values) : original(el, values as string));
  return user;
};
const direct = userEvent.selectOptions.bind(userEvent);
patch.selectOptions = (el: Element, values: unknown) => (isOurs(el) ? chooseIn(userEvent.setup(), el, values) : direct(el, values as string));
