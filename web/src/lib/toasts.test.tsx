import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToasts } from "./toasts";

function Pusher(props: { undo?: () => void }) {
  const { push, undoLast } = useToasts();
  return (
    <>
      <button type="button" onClick={() => push({ message: `Message ${Math.random()}`, undo: props.undo })}>
        push
      </button>
      <button type="button" onClick={() => push({ message: "Fixed", action: { label: "Start", run: () => undefined } })}>
        fixed
      </button>
      <button type="button" onClick={() => push({ message: "Plain" })}>
        plain
      </button>
      <button type="button" onClick={undoLast}>
        undo last
      </button>
    </>
  );
}

const region = () => screen.getByRole("region", { name: "Notifications" });

test("a toast shows in the notifications region, which announces politely, and can be dismissed", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider seconds={0}>
      <Pusher />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "fixed" }));
  expect(within(region()).getByText("Fixed")).toBeInTheDocument();
  expect(region().querySelector('[aria-live="polite"]')).not.toBeNull();
  expect(within(region()).getByRole("button", { name: "Start" })).toBeInTheDocument();
  await user.click(within(region()).getByRole("button", { name: "Dismiss" }));
  expect(within(region()).queryByText("Fixed")).toBeNull();
});

test("one toast shows at a time: the newest replaces the one before it, and it has an icon", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider seconds={0}>
      <Pusher />
    </ToastProvider>,
  );
  for (let i = 0; i < 5; i++) await user.click(screen.getByRole("button", { name: "push" }));
  expect(within(region()).getAllByRole("button", { name: "Dismiss" })).toHaveLength(1);
  expect(region().querySelector("[data-tone]")).not.toBeNull();
});

test("Undo runs the undo and says so, and the last undo is reachable by keyboard", async () => {
  const user = userEvent.setup();
  const undo = vi.fn();
  render(
    <ToastProvider seconds={0}>
      <Pusher undo={undo} />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "push" }));
  await user.click(within(region()).getByRole("button", { name: "Undo" }));
  expect(undo).toHaveBeenCalledTimes(1);
  expect(await within(region()).findByText(/Undone/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "push" }));
  await user.click(screen.getByRole("button", { name: "undo last" }));
  await waitFor(() => expect(undo).toHaveBeenCalledTimes(2));
});

test("with nothing to undo, it says so", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider seconds={0}>
      <Pusher />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "undo last" }));
  expect(within(region()).getByText("Nothing to undo.")).toBeInTheDocument();
});

test("a toast goes by itself after its time, unless the pointer is on it", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  render(
    <ToastProvider seconds={2}>
      <Pusher />
    </ToastProvider>,
  );
  act(() => screen.getByRole("button", { name: "plain" }).click());
  expect(within(region()).getByText("Plain")).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(2100);
  });
  expect(within(region()).queryByText("Plain")).toBeNull();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("dismissAll takes every toast off the screen, and the page is told how many show while any do", async () => {
  const user = userEvent.setup();
  function Clearer() {
    const { dismissAll } = useToasts();
    return (
      <button type="button" onClick={dismissAll}>
        clear all
      </button>
    );
  }
  render(
    <ToastProvider seconds={0}>
      <Pusher />
      <Clearer />
    </ToastProvider>,
  );
  expect(document.documentElement).not.toHaveAttribute("data-toasts");
  await user.click(screen.getByRole("button", { name: "push" }));
  await user.click(screen.getByRole("button", { name: "push" }));
  expect(document.documentElement).toHaveAttribute("data-toasts");
  expect(document.documentElement.style.getPropertyValue("--toasts")).toBe("1");
  await user.click(screen.getByRole("button", { name: "clear all" }));
  expect(within(region()).queryAllByRole("button", { name: "Dismiss" })).toHaveLength(0);
  expect(document.documentElement).not.toHaveAttribute("data-toasts");
  expect(document.documentElement.style.getPropertyValue("--toasts")).toBe("");
});

function Same(props: { undo?: () => void; many?: (n: number) => string }) {
  const { push } = useToasts();
  return (
    <button type="button" onClick={() => push({ message: "Reviewed and filed.", undo: props.undo, many: props.many })}>
      same
    </button>
  );
}

test("the same message pushed again is one toast with a count, and its Undo takes back the newest one", async () => {
  const user = userEvent.setup();
  const undo = vi.fn();
  render(
    <ToastProvider seconds={0}>
      <Same undo={undo} many={(n) => `Filed ${n} reviews`} />
    </ToastProvider>,
  );
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "same" }));
  expect(within(region()).getAllByRole("button", { name: "Dismiss" })).toHaveLength(1);
  expect(within(region()).getByText("Filed 3 reviews")).toBeInTheDocument();
  await user.click(within(region()).getByRole("button", { name: "Undo last" }));
  expect(undo).toHaveBeenCalledTimes(1);
  // The note that it was undone replaces the toast; the two reviews still filed can be undone from the keyboard.
  expect(within(region()).getByText("Undone.")).toBeInTheDocument();
});

test("a repeated message without its own wording says how many times", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider seconds={0}>
      <Same />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "same" }));
  await user.click(screen.getByRole("button", { name: "same" }));
  expect(within(region()).getByText("Reviewed and filed. (2 times)")).toBeInTheDocument();
});

test("a toast with Undo or another action stays past its time until it is dismissed, and a note with no action still goes", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  render(
    <ToastProvider seconds={2}>
      <Pusher undo={() => undefined} />
    </ToastProvider>,
  );
  act(() => screen.getByRole("button", { name: "fixed" }).click());
  act(() => {
    vi.advanceTimersByTime(60000);
  });
  expect(within(region()).getByText("Fixed")).toBeInTheDocument();
  act(() => screen.getByRole("button", { name: "push" }).click());
  act(() => {
    vi.advanceTimersByTime(60000);
  });
  expect(within(region()).getByRole("button", { name: "Undo" })).toBeInTheDocument();
  act(() => within(region()).getByRole("button", { name: "Dismiss" }).click());
  expect(within(region()).queryAllByRole("button", { name: "Dismiss" })).toHaveLength(0);
  act(() => screen.getByRole("button", { name: "plain" }).click());
  expect(within(region()).getByText("Plain")).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(60000);
  });
  expect(within(region()).queryByText("Plain")).toBeNull();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("toasts that stay do not pile up: a newer one replaces the one showing", async () => {
  vi.useFakeTimers();
  render(
    <ToastProvider seconds={2}>
      <Pusher undo={() => undefined} />
    </ToastProvider>,
  );
  for (let i = 0; i < 5; i++) act(() => screen.getByRole("button", { name: "push" }).click());
  act(() => {
    vi.advanceTimersByTime(60000);
  });
  expect(within(region()).getAllByRole("button", { name: "Undo" })).toHaveLength(1);
  vi.useRealTimers();
});

test("reduced motion does not keep a toast longer: it goes after its time like any other", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => undefined, removeEventListener: () => undefined }));
  render(
    <ToastProvider seconds={2}>
      <Pusher />
    </ToastProvider>,
  );
  act(() => screen.getByRole("button", { name: "plain" }).click());
  act(() => {
    vi.advanceTimersByTime(2100);
  });
  expect(within(region()).queryByText("Plain")).toBeNull();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("a toast waits while the pointer or the cursor is on it, and goes once both have left", async () => {
  vi.useFakeTimers();
  render(
    <ToastProvider seconds={2}>
      <Pusher />
    </ToastProvider>,
  );
  act(() => screen.getByRole("button", { name: "plain" }).click());
  const toast = within(region()).getByText("Plain").parentElement!;
  act(() => {
    toast.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(within(region()).getByText("Plain")).toBeInTheDocument();
  act(() => {
    toast.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(2100);
  });
  expect(within(region()).queryByText("Plain")).toBeNull();
  vi.useRealTimers();
});

test("F6 moves the cursor to the newest toast, and Escape puts it away and gives the cursor back", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider seconds={0}>
      <Pusher />
    </ToastProvider>,
  );
  const opener = screen.getByRole("button", { name: "fixed" });
  await user.click(opener);
  opener.focus();
  await user.keyboard("{F6}");
  expect(region().contains(document.activeElement)).toBe(true);
  await user.keyboard("{Escape}");
  expect(within(region()).queryByText("Fixed")).toBeNull();
  expect(opener).toHaveFocus();
});

test("a newer toast with the same key replaces the one showing, and that one's Undo goes with it", async () => {
  const first = vi.fn();
  const second = vi.fn();
  function Push() {
    const { push, undoLast } = useToasts();
    return (
      <>
        <button type="button" onClick={() => push({ key: "thing", message: "Drafted it", undo: first })}>one</button>
        <button type="button" onClick={() => push({ key: "thing", message: "Sent it", undo: second })}>two</button>
        <button type="button" onClick={undoLast}>last</button>
      </>
    );
  }
  render(
    <ToastProvider seconds={0}>
      <Push />
    </ToastProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "one" }));
  await userEvent.click(screen.getByRole("button", { name: "two" }));
  expect(within(region()).queryByText("Drafted it")).toBeNull();
  expect(within(region()).getAllByRole("button", { name: "Undo" })).toHaveLength(1);
  await userEvent.click(screen.getByRole("button", { name: "last" }));
  expect(second).toHaveBeenCalledTimes(1);
  expect(first).not.toHaveBeenCalled();
});

test("an Undo that says what it did itself is not followed by the general word, which would replace it", async () => {
  const user = userEvent.setup();
  function Says() {
    const { push } = useToasts();
    return (
      <button type="button" onClick={() => push({ message: "Sent", undo: () => push({ message: "Took back the change to your mail." }) })}>
        say
      </button>
    );
  }
  render(
    <ToastProvider seconds={0}>
      <Says />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "say" }));
  await user.click(within(region()).getByRole("button", { name: "Undo" }));
  expect(await within(region()).findByText("Took back the change to your mail.")).toBeInTheDocument();
  expect(within(region()).queryByText("Undone.")).toBeNull();
});

test("an Undo that fails without saying so shows a warning", async () => {
  const user = userEvent.setup();
  function Fails() {
    const { push } = useToasts();
    return (
      <button type="button" onClick={() => push({ message: "Sent", undo: () => Promise.reject(new Error("no")) })}>
        fail
      </button>
    );
  }
  render(
    <ToastProvider seconds={0}>
      <Fails />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "fail" }));
  await user.click(within(region()).getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(region().querySelector('[data-tone="warn"]')).not.toBeNull());
});

function Notice() {
  const { push } = useToasts();
  return (
    <>
      <button type="button" onClick={() => push({ message: "Saved the name.", undo: () => undefined })}>
        save
      </button>
      <button type="button" onClick={() => push({ message: "A notice of the app's own.", action: { label: "Act", run: () => undefined }, yields: true })}>
        notice
      </button>
    </>
  );
}

test("a notice of the app's own never takes the place of the message about what the person just did", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider seconds={0}>
      <Notice />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "save" }));
  await user.click(screen.getByRole("button", { name: "notice" }));
  expect(region()).toHaveTextContent("Saved the name.");
  expect(within(region()).getByRole("button", { name: "Undo" })).toBeInTheDocument();
  expect(region()).not.toHaveTextContent("A notice of the app's own.");
  await user.click(within(region()).getByRole("button", { name: "Dismiss" }));
  await user.click(screen.getByRole("button", { name: "notice" }));
  expect(region()).toHaveTextContent("A notice of the app's own.");
});
