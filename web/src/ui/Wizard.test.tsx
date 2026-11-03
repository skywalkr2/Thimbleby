import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { StepFooter, WizardRail, WizardShell, WizardStep, type RailStep } from "./Wizard";

// The wizard's frame to the 4.6 mockups: a numeral in the display face in each circle of the rail (a check once a step is done),
// the step's eyebrow, and a footer whose buttons stand in the step's own column.

const steps: RailStep[] = [
  { id: "you", label: "You", state: "done", doneWords: "Done", current: false, hereWords: "You are here" },
  { id: "ai", label: "Your AI account", state: null, doneWords: "Done", current: true, hereWords: "You are here" },
  { id: "mail", label: "Mail and calendar", state: "todo", doneWords: "Done", current: false, hereWords: "You are here" },
  { id: "late", label: "Backups", state: "skipped", stateWords: "Skipped", doneWords: "Done", current: false, hereWords: "You are here" },
];

function frame() {
  return render(
    <WizardShell
      title="Getting started"
      rail={<WizardRail label="Steps" place="Step 2" stepsLabel="Steps" open onToggle={() => undefined} listId="steps" steps={steps} onGo={() => undefined} toggle={null} />}
    >
      <WizardStep
        eyebrow="Step 2 of 4"
        title="Your AI account"
        titleId="t"
        explanation="Connect one."
        screen="ai"
        footer={<StepFooter back={<button>Back</button>} later={<button>I'll do this later</button>} primary={<button>Continue</button>} />}
      >
        <p>body</p>
      </WizardStep>
    </WizardShell>,
  );
}

test("each circle of the rail holds its step's number in the display face, a check once done, and a minus when skipped", () => {
  frame();
  const buttons = screen.getAllByRole("button").filter((b) => b.hasAttribute("data-screen"));
  expect(buttons).toHaveLength(4);
  // Done: a check and no number.
  expect(buttons[0].querySelector("svg")).not.toBeNull();
  expect(within(buttons[0]).queryByText("1")).toBeNull();
  // The open step and one still to do show their place in the list.
  expect(within(buttons[1]).getByText("2").className).toMatch(/numeral/);
  expect(within(buttons[2]).getByText("3")).toBeInTheDocument();
  // Skipped: a mark and its words.
  expect(buttons[3].querySelector("svg")).not.toBeNull();
  expect(within(buttons[3]).getByText("Skipped")).toBeInTheDocument();
  // The circle is for the eye: its number is not read, the step's name is.
  expect(buttons[2].querySelector("[aria-hidden=true]")).not.toBeNull();
});

test("the footer's buttons stand together in one block, Back first and the one primary last, so they can sit in the step's column", () => {
  frame();
  const footer = document.querySelector<HTMLElement>("[data-step-footer]")!;
  const buttons = within(footer).getAllByRole("button").map((b) => b.textContent);
  expect(buttons).toEqual(["Back", "I'll do this later", "Continue"]);
  expect(within(footer).getByText("Back").parentElement).toBe(within(footer).getByText("Continue").parentElement);
});

test("the eyebrow says where the step is", () => {
  frame();
  expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
});
