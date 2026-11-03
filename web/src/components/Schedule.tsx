// The calendar page (design 7.7): Day, Work week, Week and Month views of everything the app knows is on a day (the person's
// calendars, the app's own entries, deliveries and due dates), each entry a button that opens its details beside the calendar,
// and the Timeline, where each piece of work stands over the coming weeks (ScheduleTimeline). The arrows and the Today button
// move by the view's unit (a range, in the Timeline), the keys 1 to 5 pick the view (which is remembered on this
// browser), the side filter narrows the entries, and Escape closes the details and returns the cursor to the entry (the keys are listed in the shortcuts menu). Week and
// Work week fall back to Day in a space too narrow for their columns. Read and open only: nothing here changes a calendar.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { api, type S } from "../lib/api";
import { minutesOf, moveBy, rangeOf, rememberView, SHORT, startOfWeek, storedView, VIEWS, type CalendarView } from "../lib/calendar";
import { RANGE_DAYS, RANGES, rememberRange, storedRange, type TimelineRange } from "../lib/timeline";
import { addDays, fullDay, todayOn, monthDayLong, monthDayYear, monthYear, weekdayLong } from "../lib/dates";
import { typing } from "../lib/keys";
import { useIsNarrow, useMediaQuery, useWidth } from "../lib/media";
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
import { ScheduleLegend, useHiddenCalendars } from "./ScheduleLegend";
import { EntryDetails } from "./ScheduleEntryPane";
import { clashCards, TimeGrid, type DayEntries } from "./ScheduleGrid";
import { ScheduleList } from "./ScheduleList";
import { ScheduleStale } from "./ScheduleStale";
import { MonthGrid } from "./ScheduleMonth";
import { NeedsADate } from "./NeedsADate";
import { Timeline, type Lane } from "./ScheduleTimeline";
import styles from "./Schedule.module.css";

import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
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
const VIEW_KEYS: Record<string, CalendarView> = { "1": "day", "2": "work_week", "3": "week", "4": "month", "5": "timeline" };
/** The room the Timeline needs beside the details pane before the pane covers its edge: enough for the weeks beside the names. */
const TIMELINE_FIT = 760;

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
  // The Timeline's range: the person's last pick on this browser, else what the workspace's setting says (read with the answer).
  const [rangePick, setRangePick] = useState<TimelineRange | null>(storedRange);
  // The day being looked at; none means today, wherever the server says today is.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [means, setMeans] = useState<Pick<Page, "week_starts_on" | "work_days"> & { today: string | null }>({ ...FIRST_MEANS, today: null });
  const region = useRef<HTMLDivElement>(null);
  const width = useWidth(region);
  const beside = useMediaQuery("(min-width: 1024px)");
  // Below this the week has no room for seven days: it shows the working days, and says so. On a phone it is a list by day.
  const weekdaysOnly = useMediaQuery("(max-width: 1099.98px)");
  const phone = useIsNarrow();
  const now = useNow();

  // Week and Work week need room for their columns; without it the calendar shows Day. A width not yet known counts as enough.
  const room = width ?? Number.POSITIVE_INFINITY;
  const fits = (v: CalendarView) => (phone && (v === "week" || v === "work_week") ? true : v === "week" ? room >= WEEK_MIN : v === "work_week" ? room >= WORK_WEEK_MIN : true);
  const view: CalendarView = fits(pick) ? pick : "day";
  // The week with seven days needs the room of a wide window; with less it is the working days.
  const shown: CalendarView = view === "week" && weekdaysOnly ? "work_week" : view;
  const asList = phone && (view === "week" || view === "work_week");

  const today = means.today ?? todayOn(now);
  const date = anchor ?? today;
  const range = useMemo(() => rangeOf(shown, date, means.week_starts_on, means.work_days), [shown, date, means.week_starts_on, means.work_days]);
  const isTimeline = view === "timeline";
  const page = useQuery({ queryKey: ["today", "schedule", range.first, range.days], queryFn: () => api.schedule(range.first, range.days), placeholderData: keepPreviousData, enabled: !isTimeline });
  // The Timeline starts on the first day of the week of the day being looked at, or of this week when none is.
  const timelineFrom = anchor === null ? null : startOfWeek(anchor, means.week_starts_on);
  const timeline = useQuery({ queryKey: ["today", "schedule", "timeline", timelineFrom, rangePick], queryFn: () => api.scheduleTimeline(timelineFrom, rangePick), placeholderData: keepPreviousData, enabled: isTimeline });
  const needs = useQuery({ queryKey: ["open-items"], queryFn: api.openItems, enabled: isTimeline });
  const rangeName: TimelineRange = rangePick ?? timeline.data?.default_range ?? "ten_weeks";
  const tl = timeline.data;
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const data = page.data;
  useEffect(() => {
    const known = data ?? tl;
    if (known) setMeans((m) => (m.today === known.today && m.week_starts_on === known.week_starts_on && m.work_days.join() === known.work_days.join() ? m : { today: known.today, week_starts_on: known.week_starts_on, work_days: known.work_days }));
  }, [data, tl]);

  const calendars: Calendars = useMemo(() => {
    const found = watch.data ?? [];
    const names = new Map(found.map((s) => [s.id, s.label]));
    // Each calendar has a color: the one the person picked, else one the app gave it, so two calendars are told apart.
    const colors = new Map(found.flatMap((s) => (s.shown_color || s.color ? [[s.id, (s.shown_color ?? s.color) as string] as const] : [])));
    const list = found.filter((s) => s.enabled && (s.reads ?? []).includes("calendar")).map((s) => ({ id: s.id, name: s.label, color: s.shown_color ?? s.color ?? null }));
    return { name: (id) => names.get(id), color: (id) => colors.get(id), list };
  }, [watch.data]);
  // The calendars the person hid with the legend: an entry shows unless every calendar that holds it is hidden.
  const [hidden, toggleCalendar] = useHiddenCalendars();
  const visible = (e: Entry) => e.own || e.kind === "due" || !hidden.has(e.source) || ((e.also_in ?? []).length > 0 && (e.also_in ?? []).some((id) => !hidden.has(id)));

  // What each shown day holds under the side filter: an entry on no side shows under every choice.
  const days: DayEntries[] = useMemo(() => {
    const byDate = new Map((data?.days ?? []).map((d) => [d.date, d]));
    return range.shown.map((d) => {
      const found = byDate.get(d);
      return {
        date: d,
        all_day: (found?.all_day ?? []).filter((e) => filter.shows(e.side, e.views) && visible(e)),
        timed: (found?.timed ?? []).filter((e) => filter.shows(e.side, e.views) && visible(e)),
        clashes: (data?.clashes ?? []).filter((c) => c.day === d),
      };
    });
  }, [data, range, filter.picked, hidden]);
  const onItsWay = useMemo(() => (data?.on_its_way ?? []).filter((e) => filter.shows(e.side, e.views)), [data, filter.picked]);

  // What the Timeline holds under the side filter: a lane shows under the side it is on and the views of its project.
  const lanes: Lane[] = useMemo(() => (tl?.lanes ?? []).filter((l) => onSide(l.side, filter.picked, l.views, l.in_project)), [tl, filter.picked]);
  const timelineEntries = useMemo(() => new Map(lanes.flatMap((l) => l.items.flatMap((i) => (i.entry ? [[entryKey(i.entry, i.start), { entry: i.entry, date: i.start }] as const] : [])))), [lanes]);

  // The entry whose details are open.
  const [picked, setPicked] = useState<string | null>(null);
  const found = picked ? (isTimeline ? (timelineEntries.get(picked) ?? null) : findEntry(days, onItsWay, picked)) : null;
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  useEffect(() => {
    if (picked && (isTimeline ? tl : data) && !found) setPicked(null);
  }, [picked, data, tl, isTimeline, found]);
  const open = (entry: Entry, on: string | null) => setPicked(entryKey(entry, on));
  const close = () => {
    const key = pickedRef.current;
    if (!key) return;
    setPicked(null);
    restoreFocus(() => Array.from(document.querySelectorAll<HTMLElement>("[data-entry-key]")).find((el) => el.getAttribute("data-entry-key") === key));
  };

  const go = (n: number) => {
    // The Timeline moves by the range it shows, from its own first day.
    const next = isTimeline ? addDays(tl?.first ?? startOfWeek(date, means.week_starts_on), n * RANGE_DAYS[tl?.range ?? rangeName]) : moveBy(view, date, n);
    setAnchor(next === today ? null : next);
  };
  const choose = (next: CalendarView) => {
    setPick(next);
    rememberView(next);
  };
  const chooseRange = (next: TimelineRange) => {
    setRangePick(next);
    rememberRange(next);
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

  const unit = view === "month" ? "month" : view === "day" ? "day" : isTimeline ? "timeline" : "week";
  // How many clashes the days shown hold, and the first day one is on.
  const clashes = days.flatMap((d) => clashCards(d, d.timed.map((e) => ({ item: e, start: minutesOf(e.begins) ?? 0, end: Math.max(minutesOf(e.ends) ?? (minutesOf(e.begins) ?? 0) + SHORT, (minutesOf(e.begins) ?? 0) + 1) }))).map(() => d.date));
  const subtitle = isTimeline || view === "month" || clashes.length === 0 ? undefined : t(clashes.length === 1 ? "schedule.clash.sub.one" : "schedule.clash.sub.other", { n: clashes.length, day: weekdayLong(clashes[0]) });
  const back = { day: t("schedule.back.day"), week: t("schedule.back.week"), month: t("schedule.back.month"), timeline: t("schedule.back.timeline") }[unit];
  const forward = { day: t("schedule.forward.day"), week: t("schedule.forward.week"), month: t("schedule.forward.month"), timeline: t("schedule.forward.timeline") }[unit];
  const heading = isTimeline
    ? tl
      ? t("schedule.range", { start: monthDayLong(tl.first), end: monthDayYear(tl.last) })
      : t("schedule.view.timeline")
    : view === "day"
      ? fullDay(date)
      : view === "month"
        ? monthYear(date)
        : t("schedule.range", { start: monthDayLong(range.shown[0]), end: monthDayYear(range.shown[range.shown.length - 1]) });
  const sideName = found?.entry.side ? (filter.options.find((o) => o.id === found.entry.side)?.name ?? null) : null;
  const viewNames: Record<CalendarView, string> = { day: t("schedule.view.day"), work_week: t("schedule.view.work_week"), week: t("schedule.view.week"), month: t("schedule.view.month"), timeline: t("schedule.view.timeline") };
  const rangeOptions = RANGES.map((r) => ({ value: r, label: t(`schedule.timeline.range.${r}`) }));
  const needDate = (needs.data?.actions ?? []).filter((a) => a.needs_date && onSide(a.side, filter.picked, a.views, !!a.project_name));
  const options = VIEWS.filter(fits).map((v) => ({ value: v, label: viewNames[v] }));
  const empty = days.every((d) => d.all_day.length === 0 && d.timed.length === 0);

  return (
    <section className="panel-section" aria-labelledby="schedule-title" ref={region}>
      <PageHeader
        id="schedule-title"
        title={t("schedule.title")}
        subtitle={subtitle}
        primary={
          // Today draws no Schedule card on a day with nothing in it, so adding a meeting is also offered here.
          data ? <AddMeeting today={data.today} primary /> : undefined
        }
        // A connected calendar that can add events after the person's yes offers a new event on it.
        actions={data ? <NewEvent today={data.today} /> : undefined}
      />
      <div className={styles.bar}>
        <div className={styles.row} data-bar-row="">
          <div className={styles.nav} role="group" aria-label={t("schedule.nav")}>
            <IconButton icon="chevron" label={back} className={styles.back} variant="secondary" onPress={() => go(-1)} />
            <Button onClick={() => setAnchor(null)}>{t("schedule.today")}</Button>
            <IconButton icon="chevron" label={forward} variant="secondary" onPress={() => go(1)} />
          </div>
          <h2 className={styles.range} aria-live="polite">
            {heading}
          </h2>
        </div>
        <div className={styles.row} data-bar-row="">
          <SegmentedControl<CalendarView> label={t("schedule.views")} value={view} onChange={choose} options={options} className={styles.views} />
          {isTimeline && <SegmentedControl<TimelineRange> label={t("schedule.timeline.range")} value={tl?.range ?? rangeName} onChange={chooseRange} options={rangeOptions} className={styles.views} />}
          <SideFilter />
        </div>
        <ScheduleLegend calendars={calendars} hidden={hidden} onToggle={toggleCalendar} />
        <ScheduleStale />
      </div>
      <ListDetail
        title={found ? entryTitle(found.entry, t) : ""}
        onClose={close}
        fit={isTimeline ? TIMELINE_FIT : PANE_FIT}
        detail={found ? <EntryDetails entry={found.entry} date={found.date} calendars={calendars} sideName={sideName} onBack={beside ? undefined : close} /> : null}
      >
        {isTimeline ? (
          timeline.isPending ? (
            <Skeleton />
          ) : timeline.isError || !tl ? (
            <EmptyState icon="alert" text={t("schedule.timeline.load_failed")} action={{ label: t("action.try_again"), onClick: () => void timeline.refetch() }} />
          ) : (
            <div className={styles.frame} data-swipe="" data-view={view} data-shown={shown} onTouchStart={swipeStart} onTouchEnd={swipeEnd} onTouchCancel={() => (touch.current = null)}>
              <Timeline data={tl} lanes={lanes} sideName={(side) => filter.options.find((o) => o.id === side)?.name} selected={picked} onOpen={open} colorOf={(e) => calendars.color(e.source)} />
            </div>
          )
        ) : page.isPending ? (
          <Skeleton />
        ) : page.isError || !data ? (
          <EmptyState icon="alert" text={t("schedule.load_failed")} action={{ label: t("action.try_again"), onClick: () => void page.refetch() }} />
        ) : (
          <div className={styles.frame} data-swipe="" data-view={view} data-shown={shown} onTouchStart={swipeStart} onTouchEnd={swipeEnd} onTouchCancel={() => (touch.current = null)}>
            {view === "month" ? (
              <MonthGrid days={days} today={data.today} month={date} limit={data.month_entries} calendars={calendars} selected={picked} onOpen={open} onOpenDay={openDay} />
            ) : asList ? (
              <ScheduleList days={days} today={data.today} calendars={calendars} selected={picked} onOpen={open} />
            ) : (
              <TimeGrid days={days} today={data.today} startsAt={data.grid_starts} endsAt={data.grid_ends} now={now} calendars={calendars} selected={picked} onOpen={open} />
            )}
            {view === "week" && weekdaysOnly && !asList && <p className={styles.none} data-weekdays-only="">{t("schedule.weekdays_only")}</p>}
            {empty && <p className={styles.none}>{view === "day" ? t("schedule.empty_day") : t("schedule.empty_range")}</p>}
          </div>
        )}
        {isTimeline && <NeedsADate rows={needDate} hint="schedule.timeline.needs_hint" />}
        {!isTimeline && data && onItsWay.length > 0 && (
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
    </section>
  );
}
