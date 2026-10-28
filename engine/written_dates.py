"""Dates in the words of a message: written as the workspace's date format writes a day, with no zero before the day
of the month, and never as year-month-day. Plain functions on text and days; they read no records, settings or clock."""

from __future__ import annotations

import re
from datetime import date

_ISO_DAY = re.compile(r"(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\d-])")


def day_words(day: date, fmt: str) -> str:
    """A day in a date format (strftime codes), with the day of the month written without a zero before it."""
    return day.strftime(fmt.replace("%%", "\0").replace("%d", str(day.day)).replace("\0", "%%"))


def plain_dates(text: str, fmt: str) -> str:
    """The text with each date written year-month-day written in the date format instead. A date that isn't a real
    day is left as it was written."""

    def one(found: re.Match[str]) -> str:
        try:
            return day_words(date(int(found[1]), int(found[2]), int(found[3])), fmt)
        except ValueError:
            return found[0]

    return _ISO_DAY.sub(one, text)
