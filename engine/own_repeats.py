"""The dates of the person's own repeating calendar entry (design 5.1, 7.7).

An entry with a `repeat` stands for many dates. They are worked out when they are shown, by the same expansion a
connected calendar's repeating events get (`engine/recurrence.py`), from the entry's start, how often it repeats, the
day it stops and the dates that are moved or called off (`exceptions`). Nothing is stored for each date, so the entry
is one record: moving or cancelling one date adds an exception, and moving or cancelling the entry moves or removes
them all.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from engine import recurrence
from engine.records import entry_time

#: The repeat rule of each way of repeating.
RULES = {
    "day": "FREQ=DAILY",
    "week": "FREQ=WEEKLY",
    "two_weeks": "FREQ=WEEKLY;INTERVAL=2",
    "month": "FREQ=MONTHLY",
}


def rule_of(repeat: dict[str, Any], all_day: bool) -> str:
    """The repeat rule text: how often, and the day it stops (that whole day included) when it has one."""
    text = RULES[repeat["every"]]
    if repeat.get("until"):
        stop = date.fromisoformat(repeat["until"])
        text += f";UNTIL={stop:%Y%m%d}" + ("" if all_day else "T235959")
    return text


def dates(
    data: dict[str, Any], here: ZoneInfo, first: date, last: date
) -> list[tuple[date | datetime, date | datetime | None, date | datetime]]:
    """The dates of a repeating entry that overlap the days from `first` through `last`, called off ones left out, each
    as (start, end, was): when it starts, when it ends (the last day or moment, none when the entry has no end) and when
    the rule had it. Raises ValueError for an entry whose times can't be read."""
    start = entry_time(data["start"])
    all_day = not isinstance(start, datetime)
    end = entry_time(data["end"]) if data.get("end") else None
    if end is not None and isinstance(end, datetime) == all_day:
        raise ValueError("the start and the end are not the same kind of time")
    # A day's end is its last day, included; the expansion counts a day's end as the first day after it.
    stop = end + timedelta(days=1) if all_day and end is not None else end

    def read(text: str | None) -> date | datetime | None:
        found = entry_time(text) if text else None
        return found if found is None or isinstance(found, datetime) != all_day else None

    changes = {}
    for e in data.get("exceptions") or []:
        was = read(e.get("was"))
        if was is None:
            continue
        moved_end = read(e.get("end"))
        changes[was] = recurrence.Override(
            start=read(e.get("start")),
            end=(moved_end + timedelta(days=1) if all_day and moved_end is not None else moved_end),
            cancelled=bool(e.get("cancelled")),
        )
    found = recurrence.occurrences(
        start,
        stop,
        rule_of(data["repeat"], all_day),
        [],
        [],
        changes,
        datetime.combine(first, time.min, here),
        datetime.combine(last + timedelta(days=1), time.min, here),
        here,
    )
    out = []
    for item in found:
        if item.cancelled:
            continue
        ends: date | datetime | None = item.end
        if all_day and isinstance(ends, date):
            ends = ends - timedelta(days=1)
        out.append((item.start, ends if end is not None else None, item.override_id or item.start))
    return out
