// The Schedule's calendar toggles (design 7.7): each calendar the person reads, by name, with a tick box in its color, as a
// button that shows or hides its entries. Hidden is said in words as well as by the mark, so nothing is told by color alone. Shown only with more
// than one calendar; the choice is remembered on this browser, as the view is. A row of calendars that does not fit its line becomes
// one "Calendars (3)" button that opens the same list, never a row cut at the edge; in the phone's Filter sheet the list is the rows.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button as AriaButton, DialogTrigger } from "react-aria-components";
import { useWords } from "../lib/wording";
import { useInFilterSheet } from "../ui/inFilterSheet";
import { Icon } from "../ui/Icon";
import { Popover } from "../ui/Popover";
import type { Calendars } from "./ScheduleEntry";
import styles from "./Schedule.module.css";

const KEY = "cockpit:schedule:hidden-calendars";

function stored(): Set<string> {
  try {
    const found: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return new Set(Array.isArray(found) ? found.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

/** The calendars the person hid on this screen, remembered on this browser. */
export function useHiddenCalendars(): [Set<string>, (id: string) => void] {
  const [hidden, setHidden] = useState<Set<string>>(stored);
  const toggle = (id: string) =>
    setHidden((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        // Storage can be blocked; the choice then lasts until the page is closed.
      }
      return next;
    });
  return [hidden, toggle];
}

function Toggle(props: { calendar: NonNullable<Calendars["list"]>[number]; off: boolean; onToggle: (id: string) => void }) {
  const { t } = useWords();
  const { calendar, off } = props;
  return (
    <button type="button" className={styles.legendButton} aria-pressed={!off} data-calendar={calendar.id} onClick={() => props.onToggle(calendar.id)} title={calendar.name}>
      <span className={styles.tick} data-color={calendar.color ?? undefined} data-hidden={off ? "" : undefined} aria-hidden="true">
        {!off && <Icon name="check" size={12} />}
      </span>
      <span className={styles.legendName}>{calendar.name}</span>
      {off && <span className={styles.legendHidden}>{t("schedule.legend.hidden")}</span>}
    </button>
  );
}

export function ScheduleLegend(props: { calendars: Calendars; hidden: Set<string>; onToggle: (id: string) => void }) {
  const { t } = useWords();
  const list = props.calendars.list ?? [];
  const inSheet = useInFilterSheet();
  const wrap = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLUListElement>(null);
  // Whether the calendars, side by side, would be wider than their line: then they are one button that opens the list. A change of the
  // row's width (or of the calendars) draws them side by side once, measures them, and settles on one or the other before the paint.
  const [collapsed, setCollapsed] = useState(false);
  // `asked` counts the requests to measure; `answered` is the last one settled.
  const [asked, setAsked] = useState(0);
  const [answered, setAnswered] = useState(-1);
  const names = list.map((c) => c.name).join("|");
  useEffect(() => {
    if (inSheet) return;
    setAsked((n) => n + 1);
    const parent = wrap.current?.parentElement;
    const watch = typeof ResizeObserver === "function" && parent ? new ResizeObserver(() => setAsked((n) => n + 1)) : null;
    if (parent && watch) watch.observe(parent);
    return () => watch?.disconnect();
  }, [names, inSheet]);
  useLayoutEffect(() => {
    if (inSheet) return;
    const el = row.current;
    if (el && el.scrollWidth > 0 && el.clientWidth > 0) setCollapsed(el.scrollWidth > el.clientWidth + 1);
    setAnswered(asked);
  }, [asked, inSheet]);
  const folded = collapsed && answered === asked;
  if (list.length < 2) return null;
  const items = (
    <>
      {list.map((calendar) => (
        <li key={calendar.id}>
          <Toggle calendar={calendar} off={props.hidden.has(calendar.id)} onToggle={props.onToggle} />
        </li>
      ))}
    </>
  );
  if (inSheet) {
    return (
      <div className={styles.legendSheet} data-schedule-legend="">
        <p className={styles.sheetCaption} id="schedule-calendars-label">
          {t("schedule.legend.label")}
        </p>
        <ul className={styles.legendRows} aria-labelledby="schedule-calendars-label">
          {items}
        </ul>
      </div>
    );
  }
  return (
    <div className={styles.toggles} data-schedule-legend="" data-collapsed={folded ? "" : undefined} ref={wrap}>
      <span className={styles.togglesLabel} id="schedule-calendars-label">
        {t("schedule.legend.label")}
      </span>
      <ul ref={row} className={styles.legend} aria-labelledby="schedule-calendars-label" aria-hidden={folded || undefined} {...(folded ? { inert: true } : {})}>
        {items}
      </ul>
      {folded && (
        <DialogTrigger>
          <AriaButton className={styles.legendButton} data-calendars-open="">
            {t("schedule.legend.collapsed", { n: list.length })}
            <Icon name="chevron-down" size={14} />
          </AriaButton>
          <Popover label={t("schedule.legend.label")} size="sm" placement="bottom start">
            <ul className={styles.legendRows} aria-label={t("schedule.legend.label")}>
              {items}
            </ul>
          </Popover>
        </DialogTrigger>
      )}
    </div>
  );
}
