// The schedule (design 7.7): the days from the first one shown, each with its heading, its all-day entries apart at the
// top and its timed entries in time order. Three days sit side by side on a wide window and stack on a narrow one. The
// arrows, the keyboard and the Today button move through the days; every entry opens its page, and says which calendar
// it comes from in words (the app's own entries say so too), so nothing is told apart by color alone.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { api, type S } from "../lib/api";
import { addDays, day, wallTime } from "../lib/dates";
import { deliveryDetails, deliveryRange, deliveryStatusWord } from "../lib/deliveries";
import { typing } from "../lib/keys";
import { eventPageView, recordView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Pill } from "../ui/Pill";
import { Skeleton } from "../ui/Skeleton";
import { AddMeeting } from "./ScheduleCard";
import { SafeLink } from "./SafeText";
import styles from "./Schedule.module.css";

type Entry = S["ScheduleEntryView"];
type T = ReturnType<typeof useWords>["t"];

/** How many days a Shift press moves. */
const WEEK = 7;
/** How far, in pixels, a touch must travel sideways to count as a swipe. */
const SWIPE_MIN = 60;

/** When an entry is on its day: the start, the start and end, "Until" the end for one that began earlier, or nothing for an
 * all-day entry (its place is the all-day list). */
function whenText(entry: Entry, t: T): string {
  if (entry.slot === "all_day") return t("schedule.all_day");
  if (entry.begins && entry.ends) return t("today.agenda.range", { start: wallTime(entry.begins), end: wallTime(entry.ends) });
  if (entry.begins) return wallTime(entry.begins);
  return entry.ends ? t("today.agenda.until", { time: wallTime(entry.ends) }) : t("schedule.all_day");
}

/** One entry. Its title always opens a page in the app: the calendar entry the app keeps for an event, the app's own entry,
 * or, for a connected event the app keeps no entry for, a read-only page of what its calendar says. An event that has an
 * address in its calendar also links there, with the domain shown. Where it comes from is a word on the row, with the
 * calendar's color as a small mark beside it when one is set: the word is never left out. */
function EntryRow(props: { entry: Entry; source: string | undefined; color: string | undefined; timed: boolean }) {
  const { t } = useWords();
  const { entry } = props;
  const href = viewHref(entry.own ? recordView("event", entry.snapshot) : entry.entry ? recordView("event", entry.entry) : eventPageView(entry.snapshot, entry.start));
  const status = deliveryStatusWord(entry, t);
  const from = entry.own ? t("today.agenda.own") : props.source ? t("schedule.from_source", { source: props.source }) : t("schedule.from_source_unknown");
  return (
    <li className={entry.own ? `${styles.entry} ${styles.own}` : styles.entry} data-source={entry.own ? "own" : entry.source}>
      {props.timed && <span className={styles.when}>{whenText(entry, t)}</span>}
      <div className={styles.what}>
        <div className={styles.title}>
          {entry.cancelled && <Pill tone="warn">{t("today.agenda.called_off")}</Pill>}
          <span className={entry.cancelled ? styles.struck : undefined}>
            <a href={href}>{entry.title}</a>
          </span>
          {status && (
            <Pill tone={entry.delivery?.status === "arrived" ? "ok" : "neutral"} className={styles.status}>
              {status}
            </Pill>
          )}
        </div>
        {entry.where && <div className={styles.meta}>{entry.where}</div>}
        {entry.delivery && (
          <div className={styles.meta}>{[deliveryRange(entry, t), ...deliveryDetails(entry, t)].filter(Boolean).join(" · ")}</div>
        )}
        <div className={styles.meta}>
          {!entry.own && props.color && <span className={styles.mark} data-color={props.color} aria-hidden="true" />}
          <span className={styles.from}>{from}</span>
          {entry.link && (
            <>
              {" · "}
              <SafeLink label={t("schedule.open_calendar")} url={entry.link} />
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function DayColumn(props: { view: S["ScheduleDayView"]; today: string; source: (id: string) => string | undefined; color: (id: string) => string | undefined }) {
  const { t } = useWords();
  const { view } = props;
  const headId = `schedule-day-${view.date}`;
  const date = day(view.date);
  const label =
    view.date === props.today
      ? t("schedule.day_today", { date })
      : view.date === addDays(props.today, 1)
        ? t("schedule.day_tomorrow", { date })
        : t("schedule.day_plain", { date });
  const empty = view.all_day.length === 0 && view.timed.length === 0;
  return (
    <section className={styles.day} aria-labelledby={headId} data-day={view.date} data-today={view.date === props.today ? "" : undefined}>
      <h2 id={headId} className={styles.dayHead}>
        {label}
      </h2>
      {empty && <p className={styles.none}>{t("schedule.empty_day")}</p>}
      {view.all_day.length > 0 && (
        <div className={styles.allDay}>
          <h3 className={styles.caption} id={`${headId}-all`}>
            {t("schedule.all_day")}
          </h3>
          <ul className={styles.list} aria-labelledby={`${headId}-all`}>
            {view.all_day.map((entry, i) => (
              <EntryRow key={`${entry.snapshot}:${i}`} entry={entry} source={props.source(entry.source)} color={props.color(entry.source)} timed={false} />
            ))}
          </ul>
        </div>
      )}
      {view.timed.length > 0 && (
        <ul className={styles.list} aria-labelledby={headId}>
          {view.timed.map((entry, i) => (
            <EntryRow key={`${entry.snapshot}:${i}`} entry={entry} source={props.source(entry.source)} color={props.color(entry.source)} timed />
          ))}
        </ul>
      )}
    </section>
  );
}

export function Schedule() {
  const { t } = useWords();
  // The first day shown; none means today, wherever the server says today is.
  const [from, setFrom] = useState<string | null>(null);
  const page = useQuery({ queryKey: ["today", "schedule", from], queryFn: () => api.schedule(from), placeholderData: keepPreviousData });
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const names = new Map((watch.data ?? []).map((s) => [s.id, s.label]));
  const colors = new Map((watch.data ?? []).flatMap((s) => (s.color ? [[s.id, s.color] as const] : [])));
  const region = useRef<HTMLDivElement>(null);
  const data = page.data;
  const first = data?.first;

  const go = (n: number) => {
    if (!first) return;
    const next = addDays(first, n);
    setFrom(data && next === data.today ? null : next);
  };
  // Keys are read from a ref so one listener serves every render.
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (document.querySelector("[data-modal-open]")) return;
      // Only with the cursor on the screen's own content or on no control at all: a menu or a group of options keeps its arrows.
      const target = event.target instanceof Node ? event.target : null;
      if (target !== document.body && !(region.current && target && region.current.contains(target))) return;
      event.preventDefault();
      goRef.current((event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? WEEK : 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // On the phone layout a sideways swipe moves a day, as the arrows do (they stay, so nobody is left without a way to move).
  // A swipe is mostly sideways and long enough; one that is mostly up or down is the page scrolling and moves nothing.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swipeStart = (event: TouchEvent) => {
    const [first] = Array.from(event.touches);
    touch.current = event.touches.length === 1 && first && document.documentElement.hasAttribute("data-narrow") && !typing(event.target) ? { x: first.clientX, y: first.clientY } : null;
  };
  const swipeEnd = (event: TouchEvent) => {
    const from = touch.current;
    touch.current = null;
    const [end] = Array.from(event.changedTouches);
    if (!from || !end) return;
    const across = end.clientX - from.x;
    const down = end.clientY - from.y;
    if (Math.abs(across) < SWIPE_MIN || Math.abs(across) < Math.abs(down) * 1.5) return;
    goRef.current(across < 0 ? 1 : -1);
  };

  const last = data && data.days.length > 0 ? data.days[data.days.length - 1].date : undefined;
  const shown =
    first && last
      ? first === last
        ? t("schedule.shown_one", { start: day(first) })
        : t("schedule.shown", { start: day(first), end: day(last) })
      : "";
  return (
    <section className="panel-section" aria-labelledby="schedule-title" ref={region}>
      <div className="heading">
        <h1 id="schedule-title">{t("schedule.title")}</h1>
        <div className={styles.tools}>
          {/* Today draws no Schedule card on a day with nothing in it, so adding a meeting is also offered here. */}
          {data && <AddMeeting today={data.today} />}
          <div className={styles.nav} role="group" aria-label={t("schedule.nav")}>
            <IconButton icon="chevron" label={t("schedule.back")} className={styles.back} variant="secondary" isDisabled={!first} onPress={() => go(-1)} />
            <Button onClick={() => setFrom(null)}>{t("schedule.today")}</Button>
            <IconButton icon="chevron" label={t("schedule.forward")} variant="secondary" isDisabled={!first} onPress={() => go(1)} />
          </div>
        </div>
      </div>
      <p className="hint" aria-live="polite">
        {shown}
      </p>
      {page.isPending ? (
        <Skeleton />
      ) : page.isError || !data ? (
        <p className="empty">
          {t("schedule.load_failed")}{" "}
          <button type="button" className="btn" onClick={() => void page.refetch()}>
            {t("action.try_again")}
          </button>
        </p>
      ) : (
        <div className={styles.frame} onTouchStart={swipeStart} onTouchEnd={swipeEnd} onTouchCancel={() => (touch.current = null)}>
          <div className={styles.days} style={{ ["--days" as string]: data.days.length }}>
            {data.days.map((view) => (
              <DayColumn key={view.date} view={view} today={data.today} source={(id) => names.get(id)} color={(id) => colors.get(id)} />
            ))}
          </div>
        </div>
      )}
      <p className="hint">{t("schedule.hint")}</p>
    </section>
  );
}
