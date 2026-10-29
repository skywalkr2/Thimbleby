import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { RadioCard } from "./RadioCard";

test("a tag and a title are two words apart, so a card never reads as one run-together word", () => {
  render(<RadioCard name="kind" value="a" title="Service A" tag="Recommended" description="Pay as you go." onChange={() => undefined} />);
  expect(screen.getByRole("radio").closest("label")?.textContent).toBe("Recommended Service A Pay as you go.");
});
