"""How a person's dates are written in running text, by language: the month names, the words that make a fact a date
that comes round every year, and the endings and joining words around a day.

These are data, one file for each language (`engine/defaults/date_names/<primary language tag>.yaml`). The language is
the one the setting names; it is never guessed from the words, and a language with no file reads no date written in
words (an ISO date has no language and is always read)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import cache
from pathlib import Path

from engine.yaml_load import load_yaml

SHIPPED_DIR = Path(__file__).parent / "defaults" / "date_names"
_TAG = re.compile(r"^[A-Za-z]{2,3}(?:-|$)")


@dataclass(frozen=True)
class DateNames:
    months: dict[str, int]
    yearly_words: tuple[str, ...]
    patterns: tuple[tuple[re.Pattern[str], int, int], ...]
    """Each pattern with the group of its month name and the group of its day; the year is the third group."""


def _alternation(words: list[str]) -> str:
    return "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True))


@cache
def _load(primary: str) -> DateNames | None:
    path = SHIPPED_DIR / f"{primary}.yaml"
    if not path.is_file():
        return None
    data = load_yaml(path.read_text(encoding="utf-8")) or {}
    months = {
        str(name).casefold(): number for number, names in enumerate(data.get("months") or [], start=1) for name in names
    }
    endings = _alternation([str(e) for e in data.get("day_endings") or []])
    joining = _alternation([str(j) for j in data.get("joining_words") or []])
    ending = f"(?:{endings})?" if endings else ""
    joined = rf"(?:(?:{joining})\s+)?" if joining else ""
    name = rf"({_alternation(list(months))})"
    year = rf"(?:,?\s+{joined}(\d{{4}}))?(?!\w)"
    built = {
        "month_first": (rf"(?<!\w){name}\.?\s+(\d{{1,2}}){ending}{year}", 1, 2),
        "day_first": (rf"(?<!\w)(\d{{1,2}}){ending}\s+{joined}{name}(?!\w)\.?{year}", 2, 1),
    }
    patterns = tuple(
        (re.compile(built[order][0], re.IGNORECASE), built[order][1], built[order][2])
        for order in data.get("orders") or []
        if order in built
    )
    return DateNames(months, tuple(str(w).casefold() for w in data.get("yearly_words") or []), patterns)


def date_names(language: str) -> DateNames | None:
    """The names a language writes dates with, or none when the app has no file for the language."""
    return _load(language.split("-", 1)[0].lower()) if _TAG.match(language) else None
