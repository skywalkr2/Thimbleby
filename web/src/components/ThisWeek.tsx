// This week (design 7.7): what is due by the end of the week, who is waiting on the person and which meetings to hold,
// across projects. Its due and waiting groups are the second half of Today's Schedule card, and the whole of it is what the
// inspector shows when no line is selected. It is never counted in Today's heading or the menu.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "../lib/api";
import { day, wallTime } from "../lib/dates";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import { Empty, Failed } from "./RailPanel";
import styles from "./Today.module.css";

type Week = S["ThisWeekView"];
type T = ReturnType<typeof useWords>["t"];
type Tn = ReturnType<typeof useWords>["tn"];

export function useThisWeek() {
  return useQuery({ queryKey: ["today", "week"], queryFn: api.thisWeek });
}

/** "3 due · 2 waiting on you · 4 meetings": the one line a folded week says; the meetings in `listed` are left out (the
 * schedule above already lists them, by their snapshot). */
export function weekSummary(week: Week, tn: Tn, listed: ReadonlySet<string> = new Set()): string {
  const meetings = week.meetings.filter((m) => !listed.has(m.snapshot));
  const setUp = week.due.filter((d) => d.kind === "setup");
  const started = week.due.filter((d) => d.kind === "lead");
  const counted = week.due.length - setUp.length - started.length;
  return [
    counted > 0 ? tn("today.week.due", counted) : "",
    setUp.length > 0 ? tn("today.week.setup", setUp.length, { date: day(setUp.map((d) => d.due).sort()[0]) }) : "",
    started.length > 0 ? tn("today.week.lead", started.length, { date: day(started.map((d) => d.due).sort()[0]) }) : "",
    week.waiting.length > 0 ? tn("today.week.waiting", week.waiting.length) : "",
    meetings.length > 0 ? tn("today.week.meetings", meetings.length) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function whenOf(m: Week["meetings"][number], t: T): string {
  const first = m.days[0] ?? m.start.slice(0, 10);
  return [day(first), m.all_day ? t("today.agenda.all_day") : wallTime(m.start)].join(" ");
}

/** The three groups of the week; a group with nothing in it is left out. The meetings in `listed` (by snapshot) are left out
 * too, for where the schedule above already lists them. */
export function WeekBody(props: { week: Week; listed?: ReadonlySet<string> }) {
  const { t, tn } = useWords();
  const { week } = props;
  const meetings = week.meetings.filter((m) => !props.listed?.has(m.snapshot));
  if (week.due.length === 0 && week.waiting.length === 0 && meetings.length === 0) return <Empty text={t("today.week.empty", { date: day(week.last) })} />;
  return (
    <div className={styles.weekBody}>
      <p className="hint">{t("today.week.through", { date: day(week.last) })}</p>
      {week.due.length > 0 && (
        <div className="tb-group" data-group="due">
          <h3 className="tb-group-head">{t("today.week.due_head")}</h3>
          <ul className="tb-list">
            {week.due.map((item) => (
              <li key={item.action} className="tb-row">
                <span className="tb-when">{day(item.due)}</span>
                <div className="tb-what">
                  <div className="tb-title">{item.text}</div>
                  <div className="tb-meta">
                    {[item.kind === "hold" ? t("today.week.hold") : null, item.project_name, item.mine ? t("today.priorities.yours") : (item.owners ?? []).map((o) => o.name).join(", ")].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {week.waiting.length > 0 && (
        <div className="tb-group" data-group="waiting">
          <h3 className="tb-group-head">{t("today.week.waiting_head")}</h3>
          <ul className="tb-list">
            {week.waiting.map((w) => (
              <li key={w.person} className="tb-row">
                <div className="tb-what">
                  <div className="tb-title">{tn("today.week.waiting_row", w.count, { name: w.person_name })}</div>
                  {w.due && <div className="tb-meta">{t("today.week.waiting_since", { date: day(w.due) })}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {meetings.length > 0 && (
        <div className="tb-group" data-group="meetings">
          <h3 className="tb-group-head">{t("today.week.meetings_head")}</h3>
          <ul className="tb-list">
            {meetings.map((m, i) => (
              <li key={`${m.snapshot}:${i}`} className="tb-row">
                <span className="tb-when">{whenOf(m, t)}</span>
                <div className="tb-what">
                  <div className="tb-title">{m.title}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** What the inspector shows when no line is selected: the week, with its summary as the lead. */
export function ThisWeekInspector() {
  const { t, tn } = useWords();
  const week = useThisWeek();
  if (week.isPending) return <Skeleton />;
  if (week.isError || !week.data) return <Failed text={t("today.week.load_failed")} retry={() => void week.refetch()} />;
  const summary = weekSummary(week.data, tn);
  return (
    <div data-week="inspector">
      <h3 className={styles.weekInspectorHead}>
        {t("today.week.title")}
        {summary && <span className={styles.foldSummary}>{summary}</span>}
      </h3>
      <WeekBody week={week.data} />
    </div>
  );
}
