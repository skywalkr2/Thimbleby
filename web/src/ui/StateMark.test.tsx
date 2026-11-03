import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Row } from "./Row";
import { StateMark, needsYou } from "./StateMark";

test("a state that is fine is a dot and a word", () => {
  const { container } = render(<StateMark tone="ok">Read 5 min ago</StateMark>);
  const mark = container.querySelector("[data-state-mark]")!;
  expect(mark).toHaveAttribute("data-tone", "ok");
  expect(mark).toHaveTextContent("Read 5 min ago");
  // A dot, and no icon: nothing here asks for the person.
  expect(mark.querySelector("svg")).toBeNull();
  expect(mark.querySelector('[aria-hidden="true"]')).not.toBeNull();
});

test("a quiet state has the dot too, and the word carries it", () => {
  const { container } = render(<StateMark tone="neutral">Off</StateMark>);
  expect(container.querySelector("svg")).toBeNull();
  expect(screen.getByText("Off")).toBeInTheDocument();
});

test("a state that needs the person has an icon besides its word, for both a warning and a danger", () => {
  for (const tone of ["warn", "danger"] as const) {
    const { container, unmount } = render(<StateMark tone={tone}>Needs sign-in since 10:51 AM</StateMark>);
    const mark = container.querySelector("[data-state-mark]")!;
    expect(mark).toHaveAttribute("data-tone", tone);
    // The icon is decoration: the word says it, so a screen reader hears it once.
    expect(mark.querySelector("svg")).not.toBeNull();
    expect(mark.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(mark).toHaveTextContent("Needs sign-in since 10:51 AM");
    expect(needsYou(tone)).toBe(true);
    unmount();
  }
  expect(needsYou("ok")).toBe(false);
  expect(needsYou("neutral")).toBe(false);
});

test("a row that needs the person says so on the row: its state, for the edge and the tint, and the word is in its meta", () => {
  render(
    <ul>
      <Row as="li" loop={false} title="studio@example.com" state="danger" meta={<StateMark tone="danger">Needs sign-in</StateMark>} />
      <Row as="li" loop={false} title="robin@example.com" state="warn" meta={<StateMark tone="warn">Signed out</StateMark>} />
      <Row as="li" loop={false} title="alex@example.com" meta={<StateMark tone="ok">Read 2 min ago</StateMark>} />
    </ul>,
  );
  const rows = screen.getAllByRole("listitem");
  expect(rows[0]).toHaveAttribute("data-state", "danger");
  expect(rows[1]).toHaveAttribute("data-state", "warn");
  // A row that is fine has no edge and no tint.
  expect(rows[2]).not.toHaveAttribute("data-state");
  // The state's word is in the row's meta, not only drawn by the edge.
  expect(rows[0]).toHaveTextContent("Needs sign-in");
  expect(rows[0].querySelector("[data-state-mark] svg")).not.toBeNull();
});
