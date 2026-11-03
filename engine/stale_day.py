"""A to-do's words that end in its own day ("Send the headcount by 2026-11-04.") say the day twice: in the words and
in its due date. When the person moves the due date, the old day left in the words would contradict the new one, so
the words lose that phrase and the due date alone says it. Only a day written as year-month-day, after "by", "on",
"before" or "until", at the end of the words, and equal to the day being replaced, is taken out; anything else stays
as written."""

from __future__ import annotations

import re

_DAY = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_LEAD = re.compile(r"\s*\b(?:by|on|before|until)\s*$", re.IGNORECASE)
_END = re.compile(r"^[\s.!?]*$")


def without_day(text: str, day: str | None) -> str:
    """The words without a trailing phrase that names `day`, or the words as they were."""
    if not day or not isinstance(text, str):
        return text
    found = _DAY.search(text)
    if found is None or found.group(0) != str(day)[:10] or not _END.match(text[found.end() :]):
        return text
    kept = _LEAD.sub("", text[: found.start()]).rstrip()
    return f"{kept}{text[found.end() :].strip()}" if kept else text
