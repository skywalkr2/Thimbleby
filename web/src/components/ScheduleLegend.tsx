// The Schedule's calendar toggles (design 7.7): each calendar the person reads, by name, with a tick box in its color, as a
// button that shows or hides its entries. Hidden is said in words as well as by the mark, so nothing is told by color alone. Shown only with more
// than one calendar; the choice is remembered on this browser, as the view is.
import { useEffect, useRef, useState } from "react";
import { useWords } from "../lib/wording";
import { Icon } from "../ui/Icon";
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

export function ScheduleLegend(props: { calendars: Calendars; hidden: Set<string>; onToggle: (id: string) => void }) {
  const { t } = useWords();
  const list = props.calendars.list ?? [];
  const row = useRef<HTMLUListElement>(null);
  // The row of calendars is one line that scrolls inside itself; an edge fades where more is out of sight.
  const [fade, setFade] = useState<"" | "end" | "start" | "both">("");
  const measure = () => {
    const el = row.current;
    if (!el) return;
    const room = el.scrollWidth - el.clientWidth;
    setFade(room <= 1 ? "" : el.scrollLeft <= 1 ? "end" : el.scrollLeft >= room - 1 ? "start" : "both");
  };
  useEffect(() => {
    measure();
    const el = row.current;
    const watch = typeof ResizeObserver === "function" && el ? new ResizeObserver(measure) : null;
    if (el && watch) watch.observe(el);
    return () => watch?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);
  if (list.length < 2) return null;
  return (
    <div className={styles.toggles} data-schedule-legend="">
      <span className={styles.togglesLabel} id="schedule-calendars-label">
        {t("schedule.legend.label")}
      </span>
      <ul ref={row} className={styles.legend} data-fade={fade || undefined} onScroll={measure} aria-labelledby="schedule-calendars-label">
        {list.map((calendar) => {
          const off = props.hidden.has(calendar.id);
          return (
            <li key={calendar.id}>
              <button type="button" className={styles.legendButton} aria-pressed={!off} data-calendar={calendar.id} onClick={() => props.onToggle(calendar.id)} title={calendar.name}>
                <span className={styles.tick} data-color={calendar.color ?? undefined} data-hidden={off ? "" : undefined} aria-hidden="true">
                  {!off && <Icon name="check" size={12} />}
                </span>
                <span className={styles.legendName}>{calendar.name}</span>
                {off && <span className={styles.legendHidden}>{t("schedule.legend.hidden")}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
