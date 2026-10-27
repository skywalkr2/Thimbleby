// The panels of Today's rail (design 7.7): a heading with its count, a body sized to its content, and the two one-line
// states a panel has besides its rows, empty and failed to load. On the phone, below the queue, a panel is folded to one
// line that says what is in it ("Schedule · nothing today") and a press opens it.
import { createContext, useCallback, useContext, useId, useMemo, useState, type ReactNode } from "react";
import { useIsNarrow } from "../lib/media";
import { useWords } from "../lib/wording";
import { Panel } from "../ui/Panel";
import styles from "./Today.module.css";

type Folds = { open: ReadonlySet<string>; toggle: (id: string) => void };
const FoldContext = createContext<Folds | null>(null);

/** Keeps which panels the person opened on the phone for the rail as a whole. A panel is left out of the page while what it
 * asks is on its way and drawn again after, which would fold it again if it kept its own fold. */
export function RailFolds(props: { children: ReactNode }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback(
    (id: string) =>
      setOpen((now) => {
        const next = new Set(now);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    [],
  );
  const folds = useMemo(() => ({ open, toggle }), [open, toggle]);
  return <FoldContext.Provider value={folds}>{props.children}</FoldContext.Provider>;
}

/** A rail panel: a visible heading with its count (said in words for a screen reader) and a body sized to its content. */
export function RailPanel(props: {
  id: string;
  title: string;
  count: number | null;
  countText: string;
  /** What the panel says when it is folded to one line on the phone: "nothing today", "3". Empty while it loads. */
  summary?: string;
  /** A control at the end of the heading row. */
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const narrow = useIsNarrow();
  const folds = useContext(FoldContext);
  const [own, setOwn] = useState(false);
  const open = folds ? folds.open.has(props.id) : own;
  const setOpen = () => (folds ? folds.toggle(props.id) : setOwn(!own));
  const id = useId();
  if (narrow) {
    return (
      <div data-col={props.id}>
        <section className={styles.fold} aria-labelledby={`${id}-head`} data-folded={open ? undefined : ""}>
          <h2 id={`${id}-head`} className={styles.foldHead}>
            <button type="button" className={styles.foldToggle} aria-expanded={open} aria-controls={`${id}-body`} onClick={setOpen}>
              <span>{props.title}</span>
              {props.summary ? <> <span className={styles.foldSummary}>{`· ${props.summary}`}</span></> : null}
            </button>
          </h2>
          {open && (
            <div id={`${id}-body`}>
              {props.action && <div className={styles.foldAction}>{props.action}</div>}
              <div className={styles.railBody}>{props.children}</div>
              {props.footer && <div className={styles.railFoot}>{props.footer}</div>}
            </div>
          )}
        </section>
      </div>
    );
  }
  return (
    <div data-col={props.id}>
      <Panel
        small
        flush
        title={props.title}
        count={
          // A panel with nothing in it shows no count, rather than "0".
          props.count === null || props.count === 0 ? null : (
            <>
              <span aria-hidden="true">{props.count}</span>
              <span className="sr">{props.countText}</span>
            </>
          )
        }
        actions={props.action}
      >
        <div className={styles.railBody}>{props.children}</div>
        {props.footer && <div className={styles.railFoot}>{props.footer}</div>}
      </Panel>
    </div>
  );
}

/** An empty panel's words. With `inline` they are one line: the words, then the button. */
export function Empty(props: { text: string; inline?: boolean; button?: { label: string; run: () => void } }) {
  if (props.inline) {
    return (
      <p className="tb-empty tb-empty-line">
        {props.text}
        {props.button && (
          <>
            {" "}
            <button type="button" className="btn" onClick={props.button.run}>
              {props.button.label}
            </button>
          </>
        )}
      </p>
    );
  }
  return (
    <div className="tb-empty">
      <p>{props.text}</p>
      {props.button && (
        <button type="button" className="btn" onClick={props.button.run}>
          {props.button.label}
        </button>
      )}
    </div>
  );
}

export function Failed(props: { text: string; retry: () => void }) {
  const { t } = useWords();
  return (
    <p className="empty">
      {props.text}{" "}
      <button type="button" className="btn" onClick={props.retry}>
        {t("action.try_again")}
      </button>
    </p>
  );
}
