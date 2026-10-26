// The new-start walkthrough's screens (design 7.8): their order, which setup step each one is about, and how the setup
// steps the server lists sort into them. The server keeps which screen the person is on; nothing here stores anything.
import type { S } from "./api";

export type Screen = S["WalkthroughView"]["step"];
type Step = S["SetupStepView"];

/** The screens, in the order a person needs them. Welcome opens a new start and is no step; the last one lists what was set
 * up and what was skipped, and what is optional. */
export const SCREENS: readonly Screen[] = ["welcome", "you", "work", "ai", "mail", "promises", "backup", "people", "done"];

/** The core setup step each screen is about; Welcome and the last screen have none. */
export const STEP_OF: Record<Screen, string | null> = {
  welcome: null,
  you: "workspace",
  work: "work",
  ai: "ai",
  mail: "mail",
  promises: "promises",
  backup: "backup",
  people: "people",
  done: null,
};

/** The screen a setup step is on: the one that opens when a line elsewhere sends the person to that step. */
export function screenOf(steps: Step[], id: string): Screen {
  return steps.find((s) => s.id === id)?.group ?? "done";
}

export type Standing = "done" | "skipped" | "todo";

/** Where a screen stands, as the server decided it for the core step the screen is about. Welcome and the last screen have
 * no standing of their own. */
export function standing(steps: Step[], screen: Screen): Standing | null {
  const id = STEP_OF[screen];
  const step = id ? steps.find((s) => s.id === id) : undefined;
  if (!step) return null;
  return step.done ? "done" : step.skipped ? "skipped" : "todo";
}

/** The steps that count toward finishing, in order: what the last screen reports as set up or left. */
export const counted = (steps: Step[]): Step[] => steps.filter((s) => s.counted);

/** The screen after this one, or null at the end. */
export function after(screen: Screen): Screen | null {
  const i = SCREENS.indexOf(screen);
  return i >= 0 && i < SCREENS.length - 1 ? SCREENS[i + 1] : null;
}

/** The screen before this one, or null at the start. Welcome is shown once, so no screen goes back to it. */
export function before(screen: Screen): Screen | null {
  const i = SCREENS.indexOf(screen);
  return i > 1 ? SCREENS[i - 1] : null;
}

/** The screen's own step, when it is one of the counted ones. */
export function stepOf(steps: Step[], screen: Screen): Step | undefined {
  const id = STEP_OF[screen];
  return id ? steps.find((s) => s.id === id && s.counted) : undefined;
}
