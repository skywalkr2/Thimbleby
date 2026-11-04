// The new-start walkthrough (design 7.8): the setup as one guided path, full window, one screen at a time in the order a
// person needs them: Welcome (which is no step), then seven counted steps, You, Work, Your AI account, Mail and calendar,
// Your promises (the first result: the look back and what it found), Backups, People, and Done. The server decides each
// step's standing and its place ("You · 1 of 8", counting every row of the rail); this only draws them. Every screen says why it matters and
// can be skipped now and done later. The server keeps the screen the person is on, so it resumes where they left it,
// also after a restart; "Finish later" closes it for good, and it opens again only when the person asks. The core's own
// step forms are the ones the setup list uses.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { problemText } from "../lib/problem";
import { useIsNarrow } from "../lib/media";
import { useSides } from "../lib/sides";
import { useToastCount, useToasts } from "../lib/toasts";
import { after, before, counted, SCREENS, standing, STEP_OF, stepOf, type Screen } from "../lib/walkthrough";
import { ContinueSlotProvider, type ContinueSlot, type ContinueSpec } from "../lib/walkthrough-continue";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { OfflineBanner } from "../ui/OfflineBanner";
import { Skeleton } from "../ui/Skeleton";
import { FirstPromises } from "./FirstPromises";
import { RenameName } from "./RenameName";
import { StepList, WorkspaceStep } from "./Welcome";
import { WalkthroughWelcome } from "./WalkthroughWelcome";
import { WalkthroughPeople } from "./WalkthroughPeople";
import { WorkStep } from "./WalkthroughWork";
import { AddConnection } from "./Sources";
import { WalkthroughMail } from "./WalkthroughMail";
import { WelcomeAi } from "./WelcomeAi";
import { WelcomeBackup } from "./WelcomeBackup";
import { StepFooter, WizardRail, WizardShell, WizardStep, type RailStep } from "../ui/Wizard";
import styles from "./Walkthrough.module.css";
import { Icon } from "../ui/Icon";
import { StateMark } from "../ui/StateMark";
import { SetupBrand } from "./SetupBrand";

import { LoadFailed } from "../ui/LoadFailed";
export interface Handlers {
  onOpenPeople: () => void;
  onOpenAddons: () => void;
  onHandIn: () => void;
  onChooseSource: (plugin: string | null, kind?: string) => void;
}

/** What the screen is given: adding a connection happens inside the step itself, so it asks for no way to leave. */
type Given = Omit<Handlers, "onChooseSource">;

export function Walkthrough(
  props: Given & {
    /** Open at this screen, when a line elsewhere sent the person to a step; `n` tells one request from the next. */
    at?: { screen: Screen; n: number } | null;
    /** Finish later was chosen, and kept. */
    onFinishLater: () => void;
    /** The last button was pressed, and kept. */
    onDone: () => void;
  },
) {
  const { t } = useWords();
  const client = useQueryClient();
  const { dismissAll } = useToasts();
  const shownToasts = useToastCount();
  const foot = useRef<HTMLDivElement>(null);
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  const [chosen, setChosen] = useState<Screen | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reopened = useRef(false);
  const requested = useRef(0);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  // The form that adds a connection, shown in the step's own place while it is open, then back to the step.
  const [adding, setAdding] = useState<{ plugin: string | null; kind?: string } | null>(null);
  // On a phone the list of steps is behind a Steps button; this is whether it is showing.
  const [listOpen, setListOpen] = useState(false);
  const narrow = useIsNarrow();
  // What Continue does on this screen, as the screen says (see `useContinue`): kept in a ref and only drawn again when what
  // shows of it changes.
  const slot = useRef<ContinueSpec | null>(null);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const register: ContinueSlot = useCallback((spec) => {
    const before = slot.current;
    slot.current = spec;
    if (!before !== !spec || before?.disabled !== spec?.disabled || before?.why !== spec?.why || before?.label !== spec?.label || before?.inline !== spec?.inline || before?.quiet !== spec?.quiet) redraw();
  }, []);
  const data = setup.data;
  // The screen the server named when this opened stays until the person moves: finishing a step must not move them on.
  const first = useRef<Screen | null>(null);
  if (data && first.current === null) first.current = data.walkthrough.step;
  const current: Screen | null = data ? (chosen ?? props.at?.screen ?? first.current) : null;

  // The request being sent, so the next waits for it: requests sent together can be handled in either order, and an
  // earlier screen arriving after a later one would be the one remembered.
  const sending = useRef<Promise<void>>(Promise.resolve());

  /** Keep where the walkthrough stands on the server, and in the list the other screens read. One request at a time,
   * in the order they were made. */
  const keep = (body: S["WalkthroughIn"]): Promise<void> => {
    const send = async () => {
      try {
        const view = await api.keepWalkthrough(body);
        client.setQueryData<S["SetupView"]>(["setup"], (old) => (old ? { ...old, walkthrough: view } : old));
      } catch {
        // The screen still works; it just won't be remembered.
      }
    };
    sending.current = sending.current.then(send);
    return sending.current;
  };

  // Opening it is the person's choice, so a walkthrough closed or finished before is open again from here. Keeping its
  // screen also records that it was shown, so it opens by itself again only while something it needs is missing.
  useEffect(() => {
    if (!data || !current || reopened.current) return;
    reopened.current = true;
    const again = data.walkthrough.closed || data.walkthrough.finished ? { closed: false, finished: false } : {};
    void keep({ step: current, ...again });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // A later request to open at a screen (the setup line, a status line) moves to it.
  useEffect(() => {
    if (!props.at || props.at.n === requested.current) return;
    requested.current = props.at.n;
    setChosen(props.at.screen);
    void keep({ step: props.at.screen, closed: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.at?.n]);

  // On opening and on every move, the cursor goes to the screen's heading, never into a field or onto a button (design 7.0:
  // a person who opens a form puts the cursor in its first field; a step that opens by itself starts at its heading).
  useEffect(() => {
    if (current) heading.current?.focus();
  }, [current]);

  // What a screen said in a toast is about that screen: moving to another one clears it.
  const shownScreen = useRef<Screen | null>(null);
  useEffect(() => {
    if (current && shownScreen.current && shownScreen.current !== current) dismissAll();
    if (current) shownScreen.current = current;
  }, [current, dismissAll]);

  // A toast that appears over the screen's own buttons, or over the group of controls the person is working in, moves them
  // clear of it: the page has made room under its last row (the stack's height), and it scrolls by what is covered. Controls
  // that are off the screen stay put.
  useEffect(() => {
    if (!shownToasts) return;
    // After the page has made room for them.
    const frame = window.requestAnimationFrame(() => {
      const toasts = document.querySelector("[data-toast-region]")?.getBoundingClientRect();
      if (!toasts) return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement.closest("fieldset, .field, form") : null;
      const covered = [foot.current, active]
        .map((el) => el?.getBoundingClientRect())
        .filter((box): box is DOMRect => !!box && box.top < window.innerHeight && box.bottom > toasts.top);
      if (covered.length === 0) return;
      window.scrollBy?.({ top: Math.max(...covered.map((box) => box.bottom - toasts.top + 8)) });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shownToasts]);

  if (!data || !current) {
    return (
      <div className={styles.root}>
        <div className={styles.layout}>{setup.isError ? <LoadFailed message={t("welcome.failed")} onRetry={() => void setup.refetch()} /> : <Skeleton />}</div>
      </div>
    );
  }

  const steps = data.steps;
  const go = (screen: Screen) => {
    setChosen(screen);
    setListOpen(false);
    void keep({ step: screen });
  };
  const here = standing(steps, current);
  // With nothing connected the mail step has one way on, "I'll do this later"; a Continue beside it would do the same thing.
  // Continue comes once something is connected (the step is done), or once the step was left for later.
  const next = after(current);
  const previous = before(current);

  const skip = async () => {
    const id = STEP_OF[current];
    if (!id) return;
    setBusy(true);
    setProblem("");
    try {
      await api.skipStep(id);
      await client.invalidateQueries({ queryKey: ["setup"] });
      if (next) go(next);
    } catch (err) {
      setProblem(problemText(err, t));
    } finally {
      setBusy(false);
    }
  };

  /** Continue: what the screen saves (when it has something), then the next screen. A screen that says it couldn't save
   * keeps the person where they are. */
  const carryOn = async () => {
    const spec = slot.current;
    if (spec) {
      setBusy(true);
      setProblem("");
      try {
        if ((await spec.run()) === false) return;
      } catch (err) {
        setProblem(problemText(err, t));
        return;
      } finally {
        setBusy(false);
      }
    }
    // What the screen saved is what the list of steps and Today's line read, so they are read again now.
    await client.invalidateQueries({ queryKey: ["setup"] });
    if (next) go(next);
  };

  const finishLater = async () => {
    await keep({ closed: true });
    props.onFinishLater();
  };
  const finish = async () => {
    await keep({ finished: true });
    props.onDone();
  };

  // The last screen says what is so from the records: its heading and what it promises of Today follow what is set up and
  // what waits for the person's first go, never a fixed sentence.
  const left = steps.some((s) => s.counted && !s.done);
  const waitingGo = data.first_go_waiting > 0;
  const screenName = (screen: Screen) => t(screen === "done" && left ? "walkthrough.screen.done_left" : `walkthrough.screen.${screen}`);
  // The last screen's own heading says how it ended: "You're set." when nothing is left (the rail keeps the step's own name).
  const stepTitle = current === "done" && !left ? t("walkthrough.done.title_all") : screenName(current);
  const brand = current === "welcome" || current === "done";
  const why = current === "done" ? t(waitingGo ? "walkthrough.why.done" : left ? "walkthrough.why.done_left" : "walkthrough.why.done_all") : t(`walkthrough.why.${current}`);
  const stepData = (id: string) => steps.find((s) => s.id === id);
  const aiDone = !!stepData("ai")?.done;
  const hasMailSteps = steps.some((s) => s.group === "mail" && !!s.plugin && !s.sign_in);
  const handlers = {
    onOpenPeople: props.onOpenPeople,
    onOpenAddons: props.onOpenAddons,
    onHandIn: props.onHandIn,
    onChooseSource: (plugin: string | null, kind?: string) => setAdding({ plugin, kind }),
  };

  const railSteps: RailStep[] = SCREENS.filter((screen) => screen !== "welcome").map((screen) => {
    const state = standing(steps, screen);
    const reason = stepOf(steps, screen)?.reason;
    return {
      id: screen,
      label: screenName(screen),
      state,
      stateWords: state === "skipped" ? t(reason ? `walkthrough.state.skipped_${reason}` : "walkthrough.state.skipped") : undefined,
      doneWords: t("walkthrough.state.done"),
      current: screen === current,
      hereWords: t("walkthrough.here"),
      numbered: screen !== "done",
    };
  });
  // The steps are numbered as Today's setup line counts them (the seven that count); the last row, where things stand, is
  // the summary of them and has no number, so "Step 7 of 7" and "6 of 7 done" are the same seven.
  const numbered = railSteps.filter((step) => step.id !== "done");
  const railAt = numbered.findIndex((step) => step.id === current);
  const position = railAt >= 0 ? { n: railAt + 1, total: numbered.length } : null;
  const stepsToggle = (
    <Button size="sm" aria-expanded={listOpen} aria-controls="walkthrough-steps" onClick={() => setListOpen((open) => !open)}>
      {t("walkthrough.steps")}
    </Button>
  );
  return (
    <ContinueSlotProvider value={register}>
      <WizardShell
        data-walkthrough=""
        titleId="walkthrough-title"
        title={t("walkthrough.title")}
        intro={t("walkthrough.intro")}
        banner={<OfflineBanner words={{ title: "walkthrough.offline.title", text: "walkthrough.offline.text" }} />}
        headAction={
          <>
            {/* On a phone the Steps button sits in the header bar beside Finish later, not on a bar of its own. */}
            {narrow && current !== "welcome" && stepsToggle}
            <Button variant="quiet" onClick={() => void finishLater()}>
              {t("walkthrough.later")}
            </Button>
          </>
        }
        rail={
          current !== "welcome" ? (
            <WizardRail
              label={t("walkthrough.screens")}
              place={position ? t("walkthrough.place", { label: screenName(current), ...position }) : screenName(current)}
              stepsLabel={t("walkthrough.steps")}
              open={listOpen}
              onToggle={() => setListOpen((open) => !open)}
              listId="walkthrough-steps"
              steps={railSteps}
              onGo={(id) => go(id as Screen)}
              toggle={narrow ? null : stepsToggle}
            />
          ) : undefined
        }
      >
        <WizardStep
          brand={brand ? <SetupBrand /> : undefined}
          eyebrow={position ? t("walkthrough.step_of", position) : current === "done" && left ? t("walkthrough.done.eyebrow") : undefined}
          title={stepTitle}
          titleId="walkthrough-screen-title"
          titleRef={heading}
          explanation={current === "welcome" ? undefined : why}
          screen={current}
          footer={
            current === "welcome" ? undefined : (
            <StepFooter
              footRef={foot}
              back={previous ? <Button onClick={() => go(previous)}>{t("walkthrough.back")}</Button> : undefined}
              later={
                current !== "done" && here === "todo" && STEP_OF[current] ? (
                  <Button variant="quiet" disabled={busy} onClick={() => void skip()}>
                    {t("walkthrough.skip")}
                  </Button>
                ) : undefined
              }
              primary={
                current === "done" ? (
                  <Button variant={left ? "secondary" : "primary"} onClick={() => void finish()}>
                    {t("walkthrough.finish")}
                  </Button>
                ) : next && !(current === "mail" && here === "todo" && !slot.current) && !slot.current?.inline ? (
                  <Button
                    variant={slot.current?.quiet ? "secondary" : "primary"}
                    loading={busy}
                    disabled={!!slot.current?.disabled}
                    reason={slot.current?.disabled ? slot.current.why : undefined}
                    onClick={() => void carryOn()}
                  >
                    {slot.current?.label ?? t("walkthrough.next")}
                  </Button>
                ) : undefined
              }
            />
            )
          }
        >
          {adding && <AddConnection plugin={adding.plugin} kind={adding.kind} onClose={() => setAdding(null)} />}
          {!adding && (
          <>
          {current === "welcome" && <WalkthroughWelcome onStart={() => next && go(next)} />}
          {current === "you" && <WorkspaceStep done={here !== "todo"} onContinue={next ? () => go(next) : undefined} />}
          {current === "work" && <WorkStep done={here !== "todo"} onContinue={next ? () => go(next) : undefined} />}
          {current === "ai" && <WelcomeAi local={data.local} done={aiDone} />}
          {current === "mail" && (
            <>
              <WalkthroughMail
                onChooseSource={handlers.onChooseSource}
                onOpenAddons={props.onOpenAddons}
              />
              {hasMailSteps && <StepList include={(s) => s.group === "mail" && !!s.plugin && !s.sign_in} {...handlers} />}
            </>
          )}
          {current === "promises" && <FirstPromises go={go} onHandIn={props.onHandIn} />}
          {current === "backup" && <WelcomeBackup local={data.local} />}
          {current === "people" && <WalkthroughPeople done={here !== "todo"} />}
          {current === "done" && <DoneScreen go={go} finished={!left} {...handlers} />}
          </>
          )}
          {problem && (
            <p className="problem-note" role="alert">
              {problem}
            </p>
          )}
        </WizardStep>
      </WizardShell>
    </ContinueSlotProvider>
  );
}

/** The last screen: what was set up and what was skipped (each with a way back to it), then the optional extras. */
function DoneScreen(props: Handlers & { go: (screen: Screen) => void; finished: boolean }) {
  const { t } = useWords();
  // A person with no side beside Personal is never offered the starting template for work.
  const { justMe } = useSides();
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  if (!setup.data) return <Skeleton />;
  const steps = counted(setup.data.steps);
  // The one filled button of the rows is the first thing still to do; the others are quiet, and a finished step has none.
  const firstOpen = steps.find((step) => !step.done)?.id;
  return (
    <>
      {props.finished && (
        <p className={styles.brandLine} data-brand-line="">
          {t("walkthrough.welcome.brand_line")}
        </p>
      )}
      <ul className={styles.recap} aria-label={t("walkthrough.done.recap")}>
        {steps.map((step) => {
          const screen = step.group;
          const state = step.done ? "done" : step.skipped ? "skipped" : "todo";
          const label = t(`walkthrough.screen.${screen}`);
          const said = state === "skipped" && step.reason ? `walkthrough.done.skipped_${step.reason}` : `walkthrough.done.${state}`;
          return (
            <li key={step.id} data-step={step.id} data-state={state}>
              <span className={`what ${styles.what}`}>{label}</span>
              {/* One status pattern: a check for a finished step (said to a screen reader as a word), a dot and the word for the rest. */}
              <span className={styles.state}>
                {state === "done" ? (
                  <>
                    <Icon name="check" size={16} />
                    <span className="sr">{t(said)}</span>
                  </>
                ) : (
                  <StateMark tone="neutral">{t(said)}</StateMark>
                )}
              </span>
              <span className={styles.act}>
                {state !== "done" && (
                  <Button
                    variant={step.id === firstOpen ? "primary" : "quiet"}
                    aria-label={t("walkthrough.done.set_up_named", { label })}
                    onClick={() => props.go(screen)}
                  >
                    {t("walkthrough.done.set_up")}
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <RenameName
        settingKey="workspace.name"
        sentence={(name) => t("walkthrough.done.name", { name })}
        label={t("walkthrough.done.name_label")}
        rename={t("walkthrough.done.name_rename")}
        save={t("walkthrough.done.name_save")}
        cancel={t("walkthrough.done.name_cancel")}
        blank={t("walkthrough.assistant.blank")}
        sentenceOnly
      />
      <details className={styles.fold} data-extras-fold="">
      <summary>{t("walkthrough.extras.title")}</summary>
      <section className={styles.extras} aria-labelledby="walkthrough-extras">
        <h3 id="walkthrough-extras" className="sr">{t("walkthrough.extras.title")}</h3>
        <p className={styles.aside}>{t("walkthrough.extras.why")}</p>
        <StepList
          include={(s) => s.group === "done" && !(justMe && s.id === "template")}
          onOpenPeople={props.onOpenPeople}
          onOpenAddons={props.onOpenAddons}
          onHandIn={props.onHandIn}
          onChooseSource={props.onChooseSource}
        />
      </section>
      </details>
      <p className={styles.aside}>{t(setup.data.first_go_waiting > 0 ? "walkthrough.done.next" : steps.some((s) => s.id === "ai" && s.done) ? "walkthrough.done.next_hand_in" : "walkthrough.done.next_no_ai")}</p>
    </>
  );
}
