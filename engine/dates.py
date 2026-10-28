"""A date written without a year, and the one rule that gives it one.

An input often names a day with no year ("Oct 30-Nov 5", "Jan 3"). An op carries such a day as a month and day written
`--MM-DD` (the ISO 8601 form), and the applier turns it into a full date before anything is checked or stored, the same
way every time, from the day the message came:

- the next such day on or after that day, or the latest on or before it when the input says it already happened;
- a range's end is the first such day on or after its start, so a range across the new year ends in the next year.

Plain functions: they take days and return days, and read no records, settings or clock.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from pydantic import GetCoreSchemaHandler, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema

_MONTH_DAY = re.compile(r"--(\d{2})-(\d{2})")
#: How many years the search for a day goes (a 29 February can be up to eight years away).
_REACH = 9


@dataclass(frozen=True)
class MonthDay:
    """A month and a day with no year, written `--MM-DD`."""

    month: int
    day: int

    def __post_init__(self) -> None:
        try:
            date(2000, self.month, self.day)  # 2000 is a leap year, so 29 February is a real day
        except ValueError:
            raise ValueError(f"{self} isn't a real day of a year") from None

    def __str__(self) -> str:
        return f"--{self.month:02d}-{self.day:02d}"


def parse_month_day(text: str) -> MonthDay | None:
    """The month and day of text written `--MM-DD`; None when it is written any other way. Raises ValueError when it is
    written so but is not a real day (`--02-30`)."""
    found = _MONTH_DAY.fullmatch(text.strip())
    return MonthDay(int(found[1]), int(found[2])) if found else None


def is_month_day(text: str) -> bool:
    """Whether text is a month and day with no year, a real one."""
    try:
        return parse_month_day(text) is not None
    except ValueError:
        return False


def _read(value: Any) -> Any:
    if isinstance(value, str):
        found = parse_month_day(value)
        if found is not None:
            return found
    return value


def _write(value: Any, info: core_schema.SerializationInfo) -> Any:
    if isinstance(value, MonthDay):
        return str(value)
    return value.isoformat() if info.mode == "json" else value


class DayOrMonthDay:
    """The type of a field that takes a day (YYYY-MM-DD) or a month and day with no year (--MM-DD). It holds a `date` or
    a `MonthDay`; the applier replaces the second with a day before the record is written."""

    @classmethod
    def __get_pydantic_core_schema__(cls, source: Any, handler: GetCoreSchemaHandler) -> core_schema.CoreSchema:
        inner = core_schema.union_schema([core_schema.date_schema(), handler(MonthDay)])
        return core_schema.no_info_before_validator_function(
            _read,
            inner,
            serialization=core_schema.plain_serializer_function_ser_schema(_write, info_arg=True),
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls, schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {
            "type": "string",
            "pattern": r"^(\d{4}-\d{2}-\d{2}|--\d{2}-\d{2})$",
            "description": "A day, YYYY-MM-DD; or a month and day with no year, --MM-DD, when the input gives no year.",
        }


if TYPE_CHECKING:
    DayOrMonthDay = date | MonthDay  # noqa: F811


def _on(md: MonthDay, year: int) -> date | None:
    try:
        return date(year, md.month, md.day)
    except ValueError:  # 29 February in a year with none
        return None


def next_on_or_after(md: MonthDay, anchor: date) -> date:
    """The first day that is this month and day on or after `anchor`."""
    for year in range(anchor.year, anchor.year + _REACH):
        found = _on(md, year)
        if found is not None and found >= anchor:
            return found
    raise ValueError(f"no {md} within {_REACH} years of {anchor}")  # unreachable: every month and day recurs


def latest_on_or_before(md: MonthDay, anchor: date) -> date:
    """The latest day that is this month and day on or before `anchor`."""
    for year in range(anchor.year, anchor.year - _REACH, -1):
        found = _on(md, year)
        if found is not None and found <= anchor:
            return found
    raise ValueError(f"no {md} within {_REACH} years before {anchor}")


def with_year(value: date | MonthDay, received: date, *, past: bool = False) -> date:
    """A day for `value`: itself when it has a year, else the next such day on or after the day the message came, or
    the latest on or before it when the input says it already happened (`past`)."""
    if isinstance(value, date):
        return value
    return latest_on_or_before(value, received) if past else next_on_or_after(value, received)


def _day_of(value: str) -> date | None:
    """The day a stored day or date-time text falls on (as written); None when it can't be read."""
    text = value.strip().replace("Z", "+00:00")
    try:
        return date.fromisoformat(text) if len(text) == 10 else datetime.fromisoformat(text).date()
    except ValueError:
        return None


def resolve_range(
    start: str | None, end: str | None, received: date, *, past: bool = False
) -> tuple[str | None, str | None]:
    """A start and an end as the texts an entry holds (a day, a date-time, or `--MM-DD`), each month and day given the
    year the rule above gives it: a start from the day the message came; an end from its start, so it is the first such
    day on or after it ("Dec 28-Jan 3" ends in the next year). A month and day beside a full end takes the latest such
    day on or before that end. What already has a year is returned as written."""
    first = parse_month_day(start) if start else None
    last = parse_month_day(end) if end else None
    if first is None and last is None:
        return start, end
    if first is not None and last is not None:
        begun = with_year(first, received, past=past)
        return begun.isoformat(), next_on_or_after(last, begun).isoformat()
    if first is not None:
        finish = _day_of(end) if end else None
        begun = latest_on_or_before(first, finish) if finish is not None else with_year(first, received, past=past)
        return begun.isoformat(), end
    begun_day = _day_of(start) if start else None
    anchor = begun_day if begun_day is not None else received
    return start, next_on_or_after(last, anchor).isoformat()
