// The calendar page (design 7.7): Day, Work week, Week and Month views of everything the app knows is on a day (the person's
// calendars, the app's own entries, deliveries and due dates), each entry a button that opens its details beside the calendar.
// The arrows and the Today button move by the view's unit, the keys 1 to 4 pick the view (which is remembered on this
// browser), the side filter narrows the entries, and Escape closes the details and returns the cursor to the entry. Week and
// Work week fall back to Day in a space too narrow for their columns. Read and open only: nothing here changes a calendar.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { api, type S } from "../lib/api";
import { moveBy, rangeOf, rememberView, storedView, VIEWS, type CalendarView } from "../lib/calendar";
import { fullDay, localDate, monthDayLong, monthDayYear, monthYear } from "../lib/dates";
import { typing } from "../lib/keys";
import { useMediaQuery, useWidth } from "../lib/media";
import { onSide, useSideFilter } from "../lib/sides";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { ListDetail } from "../ui/ListDetail";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Skeleton } from "../ui/Skeleton";
import { restoreFocus } from "./ModalPanel";
import { SideFilter } from "./SideFilter";
import { useNow } from "./RailSources";
import { AddMeeting } from "./ScheduleCard";
import { NewEvent } from "./NewEvent";
import { EntryButton, entryKey, entryTitle, type Calendars, type Entry } from "./ScheduleEntry";
import { EntryDetails } from "./ScheduleEntryPane";
import { TimeGrid, type DayEntries } from "./ScheduleGrid";
import { MonthGrid } from "./ScheduleMonth";
import styles from "./Schedule.module.css";

/** How far, in pixels, a touch must travel sideways to count as a swipe. */
const SWIPE_MIN = 60;
/** The room, in pixels, the Week and Work week columns need (an hour column and about 96px for each day); in less the
 * calendar shows Day. */
const WEEK_MIN = 736;
const WORK_WEEK_MIN = 544;
/** The room the calendar needs beside the details pane before the pane covers its edge instead of squeezing it. */
const PANE_FIT = 520;

type Page = S["ScheduleView"];
/** What the server says about the person's week and hours, kept from the last answer so the next request can be made at once. */
const FIRST_MEANS: Pick<Page, "week_starts_on" | "work_days"> = { week_starts_on: 0, work_days: [0, 1, 2, 3, 4] };
/** The keys that pick a view, in the order of the view switch. */
const VIEW_KEYS: Record<string, CalendarView> = { "1": "day", "2": "work_week", "3": "week", "4": "month" };

function findEntry(entries: DayEntries[], rest: Entry[], key: string): { entry: Entry; date: string | null } | null {
  for (const d of entries) {
    for (const entry of [...d.all_day, ...d.timed]) if (entryKey(entry, d.date) === key) return { entry, date: d.date };
  }
  const entry = rest.find((e) => entryKey(e, null) === key);
  return entry ? { entry, date: null } : null;
}

export function Schedule() {
  const { t } = useWords();
  const filter = useSideFilter();
  const [pick, setPick] = useState<CalendarView>(storedView);
  // The day being looked at; none means today, wherever the server says today is.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [means, setMeans] = useState<Pick<Page, "week_starts_on" | "work_days"> & { today: string | null }>({ ...FIRST_MEANS, today: null });
  const region = useRef<HTMLDivElement>(null);
  const width = useWidth(region);
  const beside = useMediaQuery("(min-width: 1024px)");
  const now = useNow();

  // Week and Work week need room for their columns; without it the calendar shows Day. A width not yet known counts as enough.
  const room = width ?? Number.POSITIVE_INFINITY;
  const fits = (v: CalendarView) => (v === "week" ? room >= WEEK_MIN : v === "work_week" ? room >= WORK_WEEK_MIN : true);
  const view: CalendarView = fits(pick) ? pick : "day";

  const today = means.today ?? localDate(now);
  const date = anchor ?? today;
  const range = useMemo(() => rangeOf(view, date, means.week_starts_on, means.work_days), [view, date, means.week_starts_on, means.work_days]);
  const page = useQuery({ queryKey: ["today", "schedule", range.first, range.days], queryFn: () => api.schedule(range.first, range.days), placeholderData: keepPreviousData });
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const data = page.data;
  useEffect(() => {
    if (data) setMeans((m) => (m.today === data.today && m.week_starts_on === data.week_starts_on && m.work_days.join() === data.work_days.join() ? m : { today: data.today, week_starts_on: data.week_starts_on, work_days: data.work_days }));
  }, [data]);

  const calendars: Calendars = useMemo(() => {
    const names = new Map((watch.data ?? []).map((s) => [s.id, s.label]));
    const colors = new Map((watch.data ?? []).flatMap((s) => (s.color ? [[s.id, s.color] as const] : [])));
    return { name: (id) => names.get(id), color: (id) => colors.get(id) };
  }, [watch.data]);

  // What each shown day holds under the side filter: an entry on no side shows under every choice.
  const days: DayEntries[] = useMemo(() => {
    const byDate = new Map((data?.days ?? []).map((d) => [d.date, d]));
    return range.shown.map((d) => {
      const found = byDate.get(d);
      return { date: d, all_day: (found?.all_day ?? []).filter((e) => onSide(e.side, filter.choice)), timed: (found?.timed ?? []).filter((e) => onSide(e.side, filter.choice)) };
    });
  }, [data, range, filter.choice]);
  const onItsWay = useMemo(() => (data?.on_its_way ?? []).filter((e) => onSide(e.side, filter.choice)), [data, filter.choice]);

  // The entry whose details are open.
  const [picked, setPicked] = useState<string | null>(null);
  const found = picked ? findEntry(days, onItsWay, picked) : null;
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  useEffect(() => {
    if (picked && data && !found) setPicked(null);
  }, [picked, data, found]);
  const open = (entry: Entry, on: string | null) => setPicked(entryKey(entry, on));
  const close = () => {
    const key = pickedRef.current;
    if (!key) return;
    setPicked(null);
    restoreFocus(() => Array.from(document.querySelectorAll<HTMLElement>("[data-entry-key]")).find((el) => el.getAttribute("data-entry-key") === key));
  };

  const go = (n: number) => {
    const next = moveBy(view, date, n);
    setAnchor(next === today ? null : next);
  };
  const choose = (next: CalendarView) => {
    setPick(next);
    rememberView(next);
  };
  const openDay = (on: string) => {
    setAnchor(on === today ? null : on);
    choose("day");
  };
  // Keys are read from refs so one listener serves every render.
  const viewRef = useRef(view);
  viewRef.current = view;
  const keys = useRef({ go, choose, close, fits });
  keys.current = { go, choose, close, fits };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (document.querySelector("[data-modal-open]")) return;
      if (event.key === "Escape") {
        if (pickedRef.current) {
          event.preventDefault();
          keys.current.close();
        }
        return;
      }
      const arrow = event.key === "ArrowLeft" || event.key === "ArrowRight";
      const picks = VIEW_KEYS[event.key];
      if (!arrow && !picks) return;
      if (picks) {
        event.preventDefault();
        if (keys.current.fits(picks)) keys.current.choose(picks);
        return;
      }
      // The arrows only with the cursor on the screen's own content or on no control at all: a menu or a group of options
      // keeps its arrows.
      const target = event.target instanceof Node ? event.target : null;
      if (target !== document.body && !(region.current && target && region.current.contains(target))) return;
      event.preventDefault();
      // Shift moves a week in Day view; the other views already move by that much or more.
      keys.current.go((event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey && viewRef.current === "day" ? 7 : 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // On the phone layout a sideways swipe moves by the view's unit, as the arrows do (they stay, so nobody is left without a way
  // to move). A swipe is mostly sideways and long enough; one that is mostly up or down is the page scrolling and moves nothing.
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
    keys.current.go(across < 0 ? 1 : -1);
  };

  const unit = view === "month" ? "month" : view === "day" ? "day" : "week";
  const back = { day: t("schedule.back.day"), week: t("schedule.back.week"), month: t("schedule.back.month") }[unit];
  const forward = { day: t("schedule.forward.day"), week: t("schedule.forward.week"), month: t("schedule.forward.month") }[unit];
  const heading =
    view === "day" ? fullDay(date) : view === "month" ? monthYear(date) : t("schedule.range", { start: monthDayLong(range.shown[0]), end: monthDayYear(range.shown[range.shown.length - 1]) });
  const sideName = found?.entry.side ? (filter.options.find((o) => o.id === found.entry.side)?.name ?? null) : null;
  const viewNames: Record<CalendarView, string> = { day: t("schedule.view.day"), work_week: t("schedule.view.work_week"), week: t("schedule.view.week"), month: t("schedule.view.month") };
  const options = VIEWS.filter(fits).map((v) => ({ value: v, label: viewNames[v] }));
  const empty = days.every((d) => d.all_day.length === 0 && d.timed.length === 0);

  return (
    <section className="panel-section" aria-labelledby="schedule-title" ref={region}>
      <div className="heading">
        <h1 id="schedule-title">{t("schedule.title")}</h1>
        <div className={styles.tools}>
          {/* Today draws no Schedule card on a day with nothing in it, so adding a meeting is also offered here. */}
          {data && <AddMeeting today={data.today} />}
          {/* A connected calendar that can add events after the person's yes offers a new event on it. */}
          {data && <NewEvent today={data.today} />}
        </div>
      </div>
      <div className={styles.bar}>
        <div className={styles.nav} role="group" aria-label={t("schedule.nav")}>
          <IconButton icon="chevron" label={back} className={styles.back} variant="secondary" onPress={() => go(-1)} />
          <Button onClick={() => setAnchor(null)}>{t("schedule.today")}</Button>
          <IconButton icon="chevron" label={forward} variant="secondary" onPress={() => go(1)} />
        </div>
        <h2 className={styles.range} aria-live="polite">
          {heading}
        </h2>
        <SegmentedControl<CalendarView> label={t("schedule.views")} value={view} onChange={choose} options={options} className={styles.views} />
        <SideFilter />
      </div>
      <ListDetail
        title={found ? entryTitle(found.entry, t) : ""}
        onClose={close}
        fit={PANE_FIT}
        detail={found ? <EntryDetails entry={found.entry} date={found.date} calendars={calendars} sideName={sideName} onBack={beside ? undefined : close} /> : null}
      >
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
          <div className={styles.frame} data-swipe="" data-view={view} onTouchStart={swipeStart} onTouchEnd={swipeEnd} onTouchCancel={() => (touch.current = null)}>
            {view === "month" ? (
              <MonthGrid days={days} today={data.today} month={date} limit={data.month_entries} calendars={calendars} selected={picked} onOpen={open} onOpenDay={openDay} />
            ) : (
              <TimeGrid days={days} today={data.today} startsAt={data.grid_starts} endsAt={data.grid_ends} now={now} calendars={calendars} selected={picked} onOpen={open} />
            )}
            {view === "day" && empty && <p className={styles.none}>{t("schedule.empty_day")}</p>}
          </div>
        )}
        {data && onItsWay.length > 0 && (
          <section className={styles.waiting} aria-labelledby="schedule-on-its-way">
            <h2 id="schedule-on-its-way" className={styles.caption}>
              {t("today.agenda.on_its_way")}
            </h2>
            <ul className={styles.waitList}>
              {onItsWay.map((e, i) => (
                <li key={`${entryKey(e, null)}:${i}`}>
                  <EntryButton entry={e} date={null} calendars={calendars} time={false} selected={picked === entryKey(e, null)} onOpen={open} t={t} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </ListDetail>
      <p className="hint">{t("schedule.hint")}</p>
    </section>
  );
}
