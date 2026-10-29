// What happened to a record (design 7.14, 7.12): a timeline grouped by day, each entry a plain sentence with its time, the
// latest few first and "Show all activity" for the rest. The entries come newest first, and stay in that order. A day is
// "Today", "Yesterday" or its month and day. A day is a heading over its own list, so the list items are the entries and
// nothing else: a count of them is a count of what happened. `shown` is how many show before the rest is asked for.
import { useState, type ReactNode } from "react";
import { addDays, monthDay, todayOn, wallTime } from "../lib/dates";
import { useWords } from "../lib/wording";
import { Button } from "./Button";
import styles from "./ActivityList.module.css";

export interface ActivityEntry {
  key: string;
  /** When it happened, as the server wrote it on the person's own clock. */
  at: string;
  body: ReactNode;
}

export function ActivityList(props: { entries: ActivityEntry[]; shown?: number; label?: string }) {
  const { t } = useWords();
  const limit = props.shown ?? 5;
  const [all, setAll] = useState(false);
  const entries = all ? props.entries : props.entries.slice(0, limit);
  const today = todayOn(new Date());
  const dayName = (at: string) => {
    const d = at.slice(0, 10);
    return d === today ? t("activity.today") : d === addDays(today, -1) ? t("activity.yesterday") : monthDay(at);
  };
  const days: Array<{ day: string; name: string; entries: ActivityEntry[] }> = [];
  for (const entry of entries) {
    const d = entry.at.slice(0, 10);
    const last = days[days.length - 1];
    if (last && last.day === d) last.entries.push(entry);
    else days.push({ day: d, name: dayName(entry.at), entries: [entry] });
  }
  return (
    <div className={styles.activity} data-activity="">
      <div className={styles.days} role="group" aria-label={props.label}>
        {days.map((group) => (
          <div key={group.day} className={styles.day}>
            <h4 className={styles.dayName}>{group.name}</h4>
            <ol className={styles.entries}>
              {group.entries.map((entry) => (
                <li key={entry.key} className={styles.entry} data-activity-entry="">
                  <span className={styles.time}>{wallTime(entry.at)}</span>
                  <span className={styles.body}>{entry.body}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {props.entries.length > limit && (
        <Button variant="quiet" size="sm" aria-expanded={all} onClick={() => setAll(!all)}>
          {t(all ? "activity.show_fewer" : "activity.show_all")}
        </Button>
      )}
    </div>
  );
}
