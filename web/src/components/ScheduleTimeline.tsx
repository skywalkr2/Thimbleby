// The Timeline view of the calendar page (design 7.7): where each piece of work stands over the coming weeks. One lane for each
// project that has something in the range, grouped under its side; on a lane a circle is a calendar entry, a square a to-do or a
// promise with a day, a diamond a project's target day or a dated fact, and a bar is a thing that runs over several days. Days
// people don't work are hatched on the lanes they apply to, and each item is a button: focus or hover show its details under the
// lanes, and Enter opens a calendar entry's details or the page of anything else. In a window too narrow for the weeks the same
// items are a list by week, so nothing scrolls sideways. Shapes are drawn by the styles and every item has its kind, day and
// state in its name, so nothing is told apart by color or shape alone.
import { useRef, useState } from "react";
import type { S } from "../lib/api";
import { addDays, dayOfMonth, day, monthDay, monthDayLong, weekday } from "../lib/dates";
import { fitsTimeline, LABEL_W, packLane, PITCH_MIN, runsOf, TOUCH, weekStarts, daysBetween } from "../lib/timeline";
import { useWidth } from "../lib/media";
import { recordView, toHash } from "../lib/views";
import { useWords } from "../lib/wording";
import { Definition, DefinitionList } from "../ui/DefinitionList";
import { Icon } from "../ui/Icon";
import { entryKey, fullWhen, type Entry } from "./ScheduleEntry";
import styles from "./ScheduleTimeline.module.css";

export type TimelineData = S["TimelineView"];
export type Lane = S["TimelineLaneView"];
export type Item = S["TimelineItemView"];
type T = ReturnType<typeof useWords>["t"];

/** The shape of each kind of item. */
const SHAPE: Record<Item["kind"], "circle" | "square" | "diamond"> = { entry: "circle", todo: "square", promise: "square", target: "diamond", fact: "diamond" };
/** The row height of a lane: a button and the space around it. */
const ROW = TOUCH + 4;

/** Where an item's own page is: a to-do's, a project's, a fact's. A calendar entry opens its details instead. */
export const itemView = (item: Item) => recordView(item.kind === "target" ? "project" : item.kind === "fact" ? "fact" : "action", item.id);

const kindWord = (item: Item, t: T) => (item.kind === "fact" && item.detail ? t(`schedule.timeline.fact.${item.detail}`) : t(`schedule.timeline.kind.${item.kind}`));

/** When an item is, in words: its day, or its days, and for a calendar entry its time. */
function whenOf(item: Item, t: T): string {
  if (item.entry && item.start === item.end) return fullWhen(item.entry, item.start, t);
  return item.start === item.end ? day(item.start) : t("schedule.timeline.when_range", { start: day(item.start), end: day(item.end) });
}

/** The words that name an item for a screen reader and for its details: what it is, what it is called, when, and, for a to-do
 * or a promise, where it stands. */
export function itemName(item: Item, t: T): string {
  const vars = { kind: kindWord(item, t), title: item.title, when: whenOf(item, t), state: t(`schedule.timeline.state.${item.state}`) };
  return item.kind === "todo" || item.kind === "promise" ? t("schedule.timeline.item", vars) : t("schedule.timeline.item_plain", vars);
}

/** The key of an item among the others on the page (a calendar entry shares the key its details open under). */
export const itemKey = (lane: Lane, item: Item): string => (item.entry ? entryKey(item.entry, item.start) : `${item.kind}|${item.id}|${item.start}|${lane.project ?? ""}`);

function Shape(props: { item: Item }) {
  const { item } = props;
  return (
    <span className={styles.shape} data-shape={SHAPE[item.kind]} data-state={item.state} aria-hidden="true">
      {item.state === "overdue" && <Icon name="alert" size={12} />}
      {item.state === "done" && <Icon name="check" size={12} />}
    </span>
  );
}

function open(item: Item, onOpen: (entry: Entry, date: string) => void) {
  if (item.entry) onOpen(item.entry, item.start);
  else window.location.hash = toHash(itemView(item));
}

/** What a lane is called, with the project it is inside when that has no lane of its own. */
function laneTitle(lane: Lane, other: string, t: T): string {
  const name = lane.name || other;
  return lane.parent_name ? `${name}, ${t("schedule.timeline.under", { parent: lane.parent_name })}` : name;
}

function Details(props: { active: { item: Item; lane: Lane } | null; off: TimelineData["off_days"]; other: string; owners: (item: Item) => string }) {
  const { t } = useWords();
  const { active } = props;
  if (!active) return <p className="sr">{t("schedule.timeline.hint")}</p>;
  const { item, lane } = active;
  // The days off that fall on the item's days, from the workspace's and from its lane.
  const offs = [...props.off, ...lane.days_off].filter((o) => o.day >= item.start && o.day <= item.end);
  const owners = props.owners(item);
  const rows: [string, string][] = [
    [t("schedule.timeline.detail.kind"), kindWord(item, t)],
    [t("schedule.timeline.detail.when"), whenOf(item, t)],
    [t("schedule.timeline.detail.project"), lane.name || props.other],
    ...(owners ? [[t("schedule.timeline.detail.owner"), owners] as [string, string]] : []),
    ...(item.kind === "todo" || item.kind === "promise" ? [[t("schedule.timeline.detail.state"), t(`schedule.timeline.state.${item.state}`)] as [string, string]] : []),
    ...(offs.length > 0
      ? [[t("schedule.timeline.detail.off"), offs.map((o) => t("schedule.timeline.off_on", { day: day(o.day), reason: o.reason || t(`schedule.timeline.off.${o.kind}`) })).join("; ")] as [string, string]]
      : []),
  ];
  return (
    <section className={styles.details} aria-label={item.title} data-timeline-details="">
      <h3 className={styles.detailTitle}>{item.title}</h3>
      <DefinitionList>
        {rows.map(([name, value]) => (
          <Definition key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </Definition>
        ))}
      </DefinitionList>
    </section>
  );
}

function Legend(props: { lanes: Lane[]; offDays: boolean; colorOf?: (entry: Entry) => string | undefined }) {
  const { t } = useWords();
  const items = props.lanes.flatMap((l) => l.items);
  const has = (test: (i: Item) => boolean) => items.some(test);
  const shown: Record<string, boolean> = {
    [t("schedule.timeline.legend.entry")]: has((i) => i.kind === "entry"),
    [t("schedule.timeline.legend.todo")]: has((i) => i.kind === "todo" || i.kind === "promise"),
    [t("schedule.timeline.legend.target")]: has((i) => i.kind === "target" || i.kind === "fact"),
    [t("schedule.timeline.legend.bar")]: has((i) => i.start !== i.end),
    [t("schedule.timeline.legend.overdue")]: has((i) => i.state === "overdue"),
    [t("schedule.timeline.legend.done")]: has((i) => i.state === "done"),
    [t("schedule.timeline.legend.off")]: props.offDays,
  };
  const colors = [...new Set(items.flatMap((i) => (i.entry && !i.entry.own && i.entry.kind !== "due" ? [props.colorOf?.(i.entry)] : [])).filter((c): c is string => !!c))].slice(0, 3);
  const entries: [string, string, string?][] = ([
    ["circle", t("schedule.timeline.legend.entry")],
    ["square", t("schedule.timeline.legend.todo")],
    ["diamond", t("schedule.timeline.legend.target")],
    ["bar", t("schedule.timeline.legend.bar")],
    ["square", t("schedule.timeline.legend.overdue"), "overdue"],
    ["square", t("schedule.timeline.legend.done"), "done"],
    ["off", t("schedule.timeline.legend.off")],
  ] as [string, string, string?][]).filter(([, label]) => shown[label]);
  if (entries.length === 0) return null;
  return (
    <ul className={styles.legend} aria-label={t("schedule.timeline.legend")}>
      {entries.map(([shape, label, state]) => (
        <li key={label}>
          {shape === "circle" && colors.length > 0 ? (
            <span className={styles.keyColors} aria-hidden="true">
              {colors.map((c) => (
                <span key={c} className={styles.key} data-shape="circle" data-color={c} data-state="open" />
              ))}
            </span>
          ) : (
            <span className={styles.key} data-shape={shape} data-state={state ?? "open"} aria-hidden="true">
              {state === "overdue" && <Icon name="alert" size={12} />}
              {state === "done" && <Icon name="check" size={12} />}
            </span>
          )}
          {label}
        </li>
      ))}
    </ul>
  );
}

/** A group of lanes under one side: lanes grouped by the side they are on, in the order the server gave, with no heading
 * when there is only one group. */
function groupsOf(lanes: Lane[]): { side: string | null; lanes: Lane[] }[] {
  const groups: { side: string | null; lanes: Lane[] }[] = [];
  for (const lane of lanes) {
    const last = groups[groups.length - 1];
    if (last && last.side === lane.side) last.lanes.push(lane);
    else groups.push({ side: lane.side ?? null, lanes: [lane] });
  }
  return groups;
}

export function Timeline(props: {
  data: TimelineData;
  /** The lanes the side filter leaves. */
  lanes: Lane[];
  sideName: (side: string) => string | undefined;
  selected: string | null;
  onOpen: (entry: Entry, date: string) => void;
  /** The color of the calendar an entry is on, so a calendar entry has its calendar's color as it has on every other view. */
  colorOf?: (entry: Entry) => string | undefined;
}) {
  const { t } = useWords();
  const { data } = props;
  const frame = useRef<HTMLDivElement>(null);
  const width = useWidth(frame);
  const wide = fitsTimeline(width, data.days);
  const [active, setActive] = useState<{ item: Item; lane: Lane } | null>(null);
  const other = t("schedule.timeline.lane_other");
  const ownersOf = (item: Item) => item.owners.map((o) => o.name).join(", ");
  const groups = groupsOf(props.lanes);
  const empty = props.lanes.length === 0;
  // A lane's track is what is left of the frame beside the names; unknown while nothing is measured, so a day gets its least.
  const pitch = width === null ? PITCH_MIN * 2 : Math.max(PITCH_MIN, (width - LABEL_W) / data.days);
  const trackW = pitch * data.days;
  const todayX = data.today >= data.first && data.today <= data.last ? (daysBetween(data.first, data.today) + 0.5) * pitch : null;
  const heading = groups.length > 1 ? "h4" : "h3";
  const Head = heading;

  return (
    <div className={styles.frame} ref={frame} data-timeline="" data-mode={wide ? "wide" : "list"}>
      {empty && <p className={styles.none}>{t("schedule.timeline.empty")}</p>}
      {!empty && wide && (
        <div className={styles.lanes} style={{ ["--label" as string]: `${LABEL_W}px` }} role="group" aria-label={t("schedule.timeline.lanes")}>
          <div className={styles.head} aria-hidden="true">
            <div className={styles.headName} />
            <div className={styles.headTrack} style={{ width: trackW }}>
              {data.days <= 14
                ? Array.from({ length: data.days }, (_, n) => {
                    const d = addDays(data.first, n);
                    return (
                      <span key={d} className={styles.dayCell} style={{ left: n * pitch, width: pitch }} data-today={d === data.today ? "" : undefined}>
                        {weekday(d)} {dayOfMonth(d)}
                      </span>
                    );
                  })
                : weekStarts(data.first, data.days).map((d, n) => (
                    <span key={d} className={styles.weekCell} style={{ left: n * 7 * pitch, width: Math.min(7, data.days - n * 7) * pitch }}>
                      {monthDay(d)}
                    </span>
                  ))}
              {todayX !== null && (
                <span className={styles.todayLabel} style={{ left: todayX }}>
                  {t("schedule.timeline.today")}
                </span>
              )}
            </div>
          </div>
          <p className="sr">{t("schedule.timeline.today_on", { date: day(data.today) })}</p>
          {groups.map((group) => (
            <section key={group.side ?? ""} className={styles.group} aria-label={group.side && groups.length > 1 ? t("schedule.timeline.side", { side: props.sideName(group.side) ?? "" }) : undefined}>
              {groups.length > 1 && (
                <h3 className={styles.side}>{group.side ? (props.sideName(group.side) ?? "") : other}</h3>
              )}
              {group.lanes.map((lane) => {
                const { placed, rows } = packLane(lane.items, data.first, data.days, pitch, (i) => `${monthDay(i.start)} ${i.title}`);
                const off = runsOf([...data.off_days, ...lane.days_off]);
                const own = lane.days_off.map((o) => t("schedule.timeline.off_on", { day: day(o.day), reason: o.reason || t(`schedule.timeline.off.${o.kind}`) }));
                const id = `timeline-lane-${lane.project ?? "none"}`;
                return (
                  <div key={lane.project ?? "none"} className={styles.lane} data-lane={lane.project ?? ""} data-depth={lane.depth}>
                    <Head className={styles.laneName} id={id} style={{ paddingLeft: `calc(var(--space-2) + ${lane.depth} * var(--space-3))` }}>
                      {laneTitle(lane, other, t)}
                    </Head>
                    {own.length > 0 && <p className="sr">{t("schedule.timeline.off_lane", { days: own.join("; ") })}</p>}
                    <div className={styles.track} style={{ width: trackW, height: rows * ROW + 8 }}>
                      {off.map((r) => (
                        <span
                          key={`${r.kind}-${r.from}`}
                          className={styles.off}
                          data-off={r.kind}
                          aria-hidden="true"
                          title={r.reason || t(`schedule.timeline.off.${r.kind}`)}
                          style={{ left: daysBetween(data.first, r.from) * pitch, width: (daysBetween(r.from, r.to) + 1) * pitch }}
                        />
                      ))}
                      {todayX !== null && <span className={styles.todayLine} style={{ left: todayX }} aria-hidden="true" />}
                      <ul className={styles.items} aria-label={t("schedule.timeline.items", { lane: lane.name || other })}>
                        {placed.map(({ item, x, w, row, point, flip }) => {
                          const key = itemKey(lane, item);
                          return (
                            <li key={key + item.title} className={styles.slot} style={{ left: x, width: w, top: 4 + row * ROW, height: TOUCH }} onMouseEnter={() => setActive({ item, lane })} onMouseLeave={() => setActive(null)}>
                              <button
                                type="button"
                                className={styles.mark}
                                data-kind={item.kind}
                                data-state={item.state}
                                data-bar={point ? undefined : w > TOUCH ? "" : undefined}
                                data-flip={flip ? "" : undefined}
                                data-entry-key={item.entry ? key : undefined}
                                data-color={item.entry && !item.entry.own && item.entry.kind !== "due" ? props.colorOf?.(item.entry) : undefined}
                                data-selected={props.selected === key ? "" : undefined}
                                aria-label={itemName(item, t)}
                                onFocus={() => setActive({ item, lane })}
                                onBlur={() => setActive(null)}
                                onClick={() => open(item, props.onOpen)}
                              >
                                <Shape item={item} />
                                {point && (
                                  <>
                                    <span className={styles.pointDate} aria-hidden="true">
                                      {monthDay(item.start)}
                                    </span>
                                    <span className={styles.pointTitle}>{item.title}</span>
                                  </>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
      {!empty && !wide && <WeekList data={data} lanes={props.lanes} other={other} selected={props.selected} onOpen={props.onOpen} />}
      {wide && !empty && <Details active={active} off={data.off_days} other={other} owners={ownersOf} />}
      <Legend colorOf={props.colorOf} lanes={props.lanes} offDays={data.off_days.length > 0 || props.lanes.some((l) => l.days_off.length > 0)} />
    </div>
  );
}

/** The same items as a list by week, for a window too narrow for the weeks: a heading for each week that has something, then a
 * row for each item with its shape, its day and its lane. */
function WeekList(props: { data: TimelineData; lanes: Lane[]; other: string; selected: string | null; onOpen: (entry: Entry, date: string) => void }) {
  const { t } = useWords();
  const { data } = props;
  const all = props.lanes.flatMap((lane) => lane.items.map((item) => ({ item, lane })));
  all.sort((a, b) => a.item.start.localeCompare(b.item.start) || a.item.title.localeCompare(b.item.title));
  const weeks = weekStarts(data.first, data.days)
    .map((first) => ({ first, rows: all.filter((r) => r.item.start >= first && r.item.start < addDays(first, 7)) }))
    .filter((w) => w.rows.length > 0);
  return (
    <div className={styles.weeks} data-week-list="">
      {weeks.map((w) => (
        <section key={w.first} aria-label={t("schedule.timeline.week_of", { date: monthDayLong(w.first) })} className={styles.week}>
          <h3 className={styles.weekHead}>{t("schedule.timeline.week_of", { date: monthDayLong(w.first) })}</h3>
          <ul className={styles.rows} aria-label={t("schedule.timeline.week_list")}>
            {w.rows.map(({ item, lane }) => {
              const key = itemKey(lane, item);
              return (
                <li key={key + item.title}>
                  <button type="button" className={styles.row} data-kind={item.kind} data-state={item.state} data-entry-key={item.entry ? key : undefined} data-selected={props.selected === key ? "" : undefined} onClick={() => open(item, props.onOpen)}>
                    <Shape item={item} />
                    <span className="sr">{kindWord(item, t)}: </span>
                    <span className={styles.rowTitle}>{item.title}</span>
                    <span className={styles.rowDay}>
                      {weekday(item.start)} {monthDay(item.start)}
                    </span>
                    <span className={styles.rowLane}>{laneTitle(lane, props.other, t)}</span>
                    {(item.kind === "todo" || item.kind === "promise") && <span className="sr">. {t(`schedule.timeline.state.${item.state}`)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
