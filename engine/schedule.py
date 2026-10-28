"""The schedule (design 7.7, the schedule screen): a run of days, each with its all-day entries apart and its timed
entries in time order. It reads the same agenda as Today's card (`engine/today.py`), so a booking already on a calendar
is one entry here too, and adds only the part of each entry that falls on each day: when it begins and ends there. Days
are the person's days, in `workspace.user.timezone`. Nothing here reaches a service or calls AI."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Any, Literal
from zoneinfo import ZoneInfo

from engine.config.schema import WEEKDAYS
from engine.connectors import moment
from engine.sides import side_of_item, watch_source_side
from engine.today import AgendaItem, agenda, event_dates, todo, zone

#: The most days one request may ask for: six weeks, what a month view needs.
MOST_DAYS = 42

Kind = Literal["event", "own", "delivery", "due"]


@dataclass
class Entry:
    """One agenda item on one day. `begins` is when it starts if that is on this day (a time on the person's clock);
    `ends` is when it ends if that is on this day. An item that neither begins nor ends on the day, or has no time of
    day, is an all-day entry there."""

    item: AgendaItem
    slot: Literal["all_day", "timed"]
    begins: str | None = None
    ends: str | None = None
    kind: Kind = "event"
    side: str | None = None
    action: str | None = None  # for a due date: the to-do it is the date of


@dataclass
class Day:
    date: date
    all_day: list[Entry] = field(default_factory=list)
    timed: list[Entry] = field(default_factory=list)


def _kind(item: AgendaItem) -> Kind:
    if item.delivery is not None:
        return "delivery"
    return "own" if item.own else "event"


def _side(view: Any, cfg: Any, item: AgendaItem) -> str | None:
    """The side an entry is on: that of the project of the entry the app keeps for it, else, for an event of a connected
    calendar, the one side its watched source serves. None when it is on no side (shown under every choice)."""
    kept = item.snapshot if item.own else item.entry
    record = view.get("event", kept) if kept else None
    if record is not None and (side := side_of_item(view, cfg, record)):
        return side
    return watch_source_side(view, cfg, item.source) if item.source else None


def _due_items(store: Any, cfg: Any, now: datetime, first: date, through: date) -> list[tuple[AgendaItem, str]]:
    """The open to-dos the person owns that fall due from `first` through `through`, each as an all-day agenda item on
    its day with the to-do's id. A to-do on hold, or one whose date is still to be checked, is not a deadline yet."""
    found = []
    for t in todo(store, cfg, now):
        if t.due is None or t.due_check or t.on_hold or not first <= t.due <= through:
            continue
        item = AgendaItem(t.action, "", t.text, t.due.isoformat(), None, True, None, None, False, days=[t.due])
        found.append((item, t.action))
    return found


def _local(value: str, here: ZoneInfo) -> datetime | None:
    try:
        found = moment(value)
    except (TypeError, ValueError):
        return None
    return found.astimezone(here) if isinstance(found, datetime) else None


def _entry(item: AgendaItem, day: date, here: ZoneInfo) -> Entry:
    if item.all_day:
        return Entry(item, "all_day")
    start = _local(item.start, here)
    if start is None:
        return Entry(item, "all_day")
    end = _local(item.end, here) if item.end else None
    day_start = datetime.combine(day, time.min, here)
    day_end = day_start + timedelta(days=1)
    begins = start if start >= day_start else None
    ends = end if end is not None and end > start and end <= day_end else None
    if begins is None and ends is None:
        return Entry(item, "all_day")
    return Entry(item, "timed", begins.isoformat() if begins else None, ends.isoformat() if ends else None)


def _at(entry: Entry, day: date, here: ZoneInfo) -> datetime:
    """Where a timed entry sorts: its start, or the start of the day for one that came in from the day before."""
    return datetime.fromisoformat(entry.begins) if entry.begins else datetime.combine(day, time.min, here)


def schedule(store: Any, cfg: Any, now: datetime, start: date | None = None, days: int | None = None) -> list[Day]:
    """The days from `start` (today when none) for `days` days (`ui.today.schedule_days` when none), in order. Timed
    entries sort by when they begin on the day, the connected calendars' and the app's own together; an entry that goes
    on over several days is on each of them."""
    here = zone(cfg)
    first = start or now.astimezone(here).date()
    count = max(1, min(MOST_DAYS, days if days is not None else cfg.ui.today.schedule_days))
    through = first + timedelta(days=count - 1)
    items = agenda(store, cfg, now, through=through, start=first)
    view = store.read()
    sides = {id(item): _side(view, cfg, item) for item in items}
    due = _due_items(store, cfg, now, first, through)
    for item, action in due:
        record = view.get("action", action)
        sides[id(item)] = side_of_item(view, cfg, record) if record is not None else None
    actions = {id(item): action for item, action in due}
    out = []
    for n in range(count):
        day = Day(first + timedelta(days=n))
        for item in [*items, *(i for i, _ in due)]:
            if day.date in item.days:
                entry = _entry(item, day.date, here)
                entry.side = sides[id(item)]
                if id(item) in actions:
                    entry.kind, entry.action = "due", actions[id(item)]
                else:
                    entry.kind = _kind(item)
                (day.all_day if entry.slot == "all_day" else day.timed).append(entry)
        # Connected calendars' all-day entries come before the app's own, and due dates last; each group keeps the
        # agenda's order.
        day.all_day.sort(key=lambda e: (e.kind == "due", e.item.own))
        day.timed.sort(key=lambda e: (_at(e, day.date, here), e.item.title.casefold()))
        out.append(day)
    return out


def work_days(cfg: Any) -> list[int]:
    """The days of the working week, Monday as 0, from the configured first day through the last (a week that runs past
    Sunday wraps round to Monday)."""
    rules = cfg.steward.reminders
    first, last = WEEKDAYS.index(rules.working_first_day), WEEKDAYS.index(rules.working_last_day)
    return [d % 7 for d in range(first, last + 1 + (7 if last < first else 0))]


def on_its_way(store: Any, cfg: Any, now: datetime) -> list[Entry]:
    """The deliveries with no date yet: on no day, so the schedule lists them apart."""
    view = store.read()
    return [
        Entry(item, "all_day", kind="delivery", side=_side(view, cfg, item))
        for item in agenda(store, cfg, now, undated=True)
        if item.delivery is not None and not item.days
    ]


@dataclass
class Someone:
    """A person on a connected event, as its calendar names them."""

    address: str | None = None
    name: str | None = None
    response: str | None = None


@dataclass
class ConnectedEvent:
    """What a connected calendar says about one date of an event the app keeps no entry for. Times are on the person's
    clock; an all-day event has days, its end the last day included."""

    snapshot: str
    source: str
    title: str
    start: str
    end: str | None
    all_day: bool
    where: str | None
    cancelled: bool
    link: str | None
    repeats: str | None
    organizer: Someone | None
    attendees: list[Someone]


def _someone(raw: Any) -> Someone | None:
    if not isinstance(raw, dict):
        return None
    return Someone(raw.get("address"), raw.get("name"), raw.get("response"))


def connected_event(store: Any, cfg: Any, snapshot: str, start: str | None = None) -> ConnectedEvent | None:
    """The page of a connected calendar's event: the date of it that begins at `start` (the first date when none, or
    when none begins there), or None when there is no such event, it is gone from its calendar, or the item is not a
    calendar event. Nothing here reaches the service."""
    snap = store.read().get("snapshot", snapshot)
    if snap is None or snap.data.get("gone") or not snap.data.get("event"):
        return None
    data, event = snap.data, snap.data["event"]
    dates = event_dates(event, data["title"], data["key"])
    picked = next((d for d in dates if d["start"] == start), dates[0])
    here = zone(cfg)
    all_day = bool(event.get("all_day"))
    try:
        if all_day:
            first = moment(picked["start"], all_day=True)
            last = moment(picked["end"], all_day=True) - timedelta(days=1) if picked["end"] else None
            begins = first.isoformat()
            ends = last.isoformat() if last is not None and last > first else None
        else:
            found = _local(picked["start"], here)
            finish = _local(picked["end"], here) if picked["end"] else None
            if found is None:
                return None
            begins = found.isoformat()
            ends = finish.isoformat() if finish is not None and finish > found else None
    except (TypeError, ValueError):
        return None
    return ConnectedEvent(
        snapshot=snap.id,
        source=data["source"],
        title=picked["title"],
        start=begins,
        end=ends,
        all_day=all_day,
        where=picked["where"],
        cancelled=picked["cancelled"],
        link=data.get("link"),
        repeats=event.get("repeats"),
        organizer=_someone(event.get("organizer")),
        attendees=[p for p in (_someone(a) for a in event.get("attendees") or []) if p is not None],
    )
