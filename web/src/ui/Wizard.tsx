// The wizard's frame (design 7.8, 7.12, VC12): the whole window with a header (the title, how long it takes and the way to finish
// later), a rail of the steps at the left, and one centred column 680px wide for the open step. Under the step's title is its
// explanation, never a column of its own. The footer is fixed at the bottom of the window: Back, then "I'll do this later", then
// the one primary button; on a phone it is a bar across the bottom. The rail marks a finished step with a check in a circle and a
// skipped one with its words, and says which step is open by its bar and weight, not by a fill.
import type { ReactNode, Ref } from "react";
import { Icon } from "./Icon";
import styles from "./Wizard.module.css";

export function WizardShell(props: { title: ReactNode; titleId?: string; intro?: ReactNode; headAction?: ReactNode; rail?: ReactNode; children: ReactNode; "data-walkthrough"?: string }) {
  return (
    <div className={styles.root} data-wizard="" data-walkthrough={props["data-walkthrough"]}>
      <header className={styles.head}>
        <div className={styles.title}>
          <h1 id={props.titleId}>{props.title}</h1>
          {props.intro && <p className={styles.intro}>{props.intro}</p>}
        </div>
        {props.headAction}
      </header>
      <div className={styles.layout} data-no-rail={props.rail ? undefined : ""}>
        {props.rail}
        {props.children}
      </div>
    </div>
  );
}

export interface RailStep {
  id: string;
  label: string;
  state: "done" | "skipped" | "todo" | null;
  /** The words for a step that is not simply done or to do: "Skipped", "Waiting for mail". */
  stateWords?: string;
  /** What a done step says to a screen reader: "Done". */
  doneWords: string;
  current: boolean;
  /** "You are here", said to a screen reader on the open step. */
  hereWords: string;
}

/** The steps as a rail: a circle for each (a check once done), its name, and the exception in words. */
export function WizardRail(props: { label: string; place: ReactNode; stepsLabel: ReactNode; open: boolean; onToggle: () => void; listId: string; steps: RailStep[]; onGo: (id: string) => void; toggle: ReactNode }) {
  return (
    <nav aria-label={props.label} className={styles.rail}>
      <div className={styles.place}>
        <p data-place="">{props.place}</p>
        {props.toggle}
      </div>
      <ol className={styles.steps} id={props.listId} data-open={props.open}>
        {props.steps.map((step) => (
          <li key={step.id}>
            <button type="button" className={styles.stepButton} data-screen={step.id} data-state={step.state ?? undefined} aria-current={step.current ? "step" : undefined} onClick={() => props.onGo(step.id)}>
              <span className={styles.circle} data-state={step.state ?? undefined} aria-hidden="true">
                {step.state === "done" ? <Icon name="check" size={12} /> : step.state === "skipped" ? <Icon name="minus" size={12} /> : null}
              </span>
              <span className={styles.label}>
                <span>{step.label}</span>
                {step.current && <span className="sr">{step.hereWords}</span>}
              </span>
              {step.state === "done" && <span className="sr">{step.doneWords}</span>}
              {step.state === "skipped" && step.stateWords && <span className={styles.exception}>{step.stateWords}</span>}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The open step: "Step 3 of 7", its title, its explanation under the title, its body, and the footer. */
export function WizardStep(props: {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId: string;
  titleRef?: Ref<HTMLHeadingElement>;
  explanation: ReactNode;
  screen: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main id="main" className={styles.step} tabIndex={-1} aria-labelledby={props.titleId} data-screen={props.screen}>
      {props.eyebrow && <p className={styles.eyebrow}>{props.eyebrow}</p>}
      <h2 id={props.titleId} ref={props.titleRef} tabIndex={-1} className={styles.stepTitle}>
        {props.title}
      </h2>
      <p className={styles.explanation}>{props.explanation}</p>
      <div className={styles.body}>{props.children}</div>
      {props.footer}
    </main>
  );
}

/**
 * The buttons of a step, fixed at the bottom: Back at the left, then "I'll do this later" and the one primary at the right.
 * `inFlow` shows them where they stand in the page instead (a sample of the footer): it covers nothing, so a toast does
 * not move out of its way.
 */
export function StepFooter(props: { back?: ReactNode; later?: ReactNode; primary?: ReactNode; footRef?: Ref<HTMLDivElement>; inFlow?: boolean }) {
  return (
    <div className={props.inFlow ? `${styles.footer} ${styles.footerInFlow}` : styles.footer} ref={props.footRef} data-step-footer={props.inFlow ? "inline" : ""}>
      <div className={styles.footerInner}>
        {props.back}
        <span className={styles.grow} />
        {props.later}
        {props.primary}
      </div>
    </div>
  );
}
