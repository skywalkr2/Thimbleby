"""Whether two calendar entries are one appointment (design 6.32).

The same appointment reaches the app twice when a calendar holds it and a booking confirmation for it makes the app's
own entry. Two entries are one appointment when they start at the same moment and one title, once case, spacing and
punctuation are set aside, equals or contains the other (a booking's title often adds the place to the calendar's).
Plain rules; nothing is read from outside."""

from __future__ import annotations

import re
from datetime import UTC, date, datetime, tzinfo

from engine.records import entry_time

_NOT_WORDS = re.compile(r"[\W_]+", re.UNICODE)


def normalized(title: str | None) -> str:
    """A title as lower-case words separated by single spaces."""
    return _NOT_WORDS.sub(" ", (title or "").casefold()).strip()


def _moment(value: str | date | datetime, zone: tzinfo) -> date | datetime | None:
    if isinstance(value, (date, datetime)):
        found = value
    else:
        try:
            found = entry_time(value)
        except ValueError:
            return None
    if isinstance(found, datetime) and found.tzinfo is None:
        found = found.replace(tzinfo=zone)
    return found


def same_start(a: str | date | datetime, b: str | date | datetime, zone: tzinfo = UTC) -> bool:
    """Whether two starts are the same instant (or the same day, for entries with no time). A start with no offset is
    in `zone`."""
    first, second = _moment(a, zone), _moment(b, zone)
    return first is not None and type(first) is type(second) and first == second


def same_entry(
    a_title: str | None,
    a_start: str | date | datetime,
    b_title: str | None,
    b_start: str | date | datetime,
    zone: tzinfo = UTC,
) -> bool:
    """Whether the two entries are one appointment."""
    first, second = normalized(a_title), normalized(b_title)
    if not first or not second or not same_start(a_start, b_start, zone):
        return False
    return f" {first} " in f" {second} " or f" {second} " in f" {first} "
