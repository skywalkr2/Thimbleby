import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { RowMenu } from "../components/RowMenu";
import { WordingProvider, format } from "./wording";
import { day } from "./dates";

// A sentence the wording sheet fills in with a title writes the title's dates as days, so the label of a button that is
// built from a to-do's words reads as the to-do does.

test("a value put into a sentence has its dates written as days", () => {
  const words = { "menu.more": "More actions for {what}" };
  expect(format(words, "menu.more", { what: "Send the headcount by 2026-11-04." })).toBe(`More actions for Send the headcount by ${day("2026-11-04")}.`);
  expect(format(words, "menu.more", { what: 12 })).toBe("More actions for 12");
});

test("a row's menu is named by the row's words in words", () => {
  render(
    <WordingProvider>
      <RowMenu label="Lend us the trailer on 2026-11-07" actions={[{ id: "a", label: "Edit", run: () => undefined }]} />
    </WordingProvider>,
  );
  expect(screen.getByRole("button", { name: `More actions for Lend us the trailer on ${day("2026-11-07")}` })).toBeInTheDocument();
});
