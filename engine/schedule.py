"""The schedule (design 7.7, the schedule screen): a run of days, each with its all-day entries apart and its timed
entries in time order. It reads the same agenda as Today's card (`engine/today.py`), so a booking already on a calendar
is one entry here too, and adds only the part of each entry that falls on each day: when it begins and ends there. Days
are the person's days, in `workspace.user.timezone`. Nothing here reaches a service or calls AI."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Any, Literal
from zoneinfo import ZoneInfo

from engine.connectors import moment
from engine.today import AgendaItem, agenda, zone

#: The most days one request may ask for.
MOST_DAYS = 14


@dataclass
class Entry:
    """One agenda item on one day. `begins` is when it starts if that is on this day (a time on the person's clock);
    `ends` is when it ends if that is on this day. An item that neither begins nor ends on the day, or has no time of
    day, is an all-day entry there."""

    item: AgendaItem
    slot: Literal["all_day", "timed"]
    begins: str | None = None
    ends: str | None = None


@dataclass
class Day:
    date: date
    all_day: list[Entry] = field(default_factory=list)
    timed: list[Entry] = field(default_factory=list)


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
    out = []
    for n in range(count):
        day = Day(first + timedelta(days=n))
        for item in items:
            if day.date in item.days:
                entry = _entry(item, day.date, here)
                (day.all_day if entry.slot == "all_day" else day.timed).append(entry)
        # Connected calendars' all-day entries come before the app's own; each group keeps the agenda's order.
        day.all_day.sort(key=lambda e: e.item.own)
        day.timed.sort(key=lambda e: (_at(e, day.date, here), e.item.title.casefold()))
        out.append(day)
    return out
