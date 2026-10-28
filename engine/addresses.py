"""Postal addresses found in text (design 6.22): where a street, a city, a region code and a postal code stand, so the
words inside them (a street direction, a state code) are read as part of an address and never as a term.

The formats are data, in the language lists (`language.address_patterns`, `address_regions`, `address_postal_codes`,
`address_countries`): another country's formats are added there, with no change to code. A finder is a plain function
over text; it asks nobody and changes nothing.
"""

from __future__ import annotations

import re
from typing import Any

from engine.language_words import language_words

_HOLES = {
    "{region}": ("address_regions", True),
    "{postal}": ("address_postal_codes", False),
    "{country}": ("address_countries", True),
}


def _alternatives(words: list[str], literal: bool) -> str:
    """Words as the alternatives of one pattern, the longest first so a longer name is never cut short by a shorter
    one it starts with; a literal word is written as it is, with any run of spaces in it matching any spacing."""
    chosen = sorted(set(words), key=lambda w: (-len(w), w))
    return "|".join(re.sub(r"(?:\\ )+", r"[ \\t]+", re.escape(w)) if literal else w for w in chosen)


def address_patterns(language: Any) -> list[str]:
    """The address patterns of the language settings with their `{region}`, `{postal}` and `{country}` filled in. A
    pattern naming a list with nothing in it is left out."""
    lists = {
        hole: [str(w) for w in language_words(language, name) if str(w).strip()] for hole, (name, _) in _HOLES.items()
    }
    found: list[str] = []
    for pattern in language_words(language, "address_patterns"):
        if any(hole in pattern and not lists[hole] for hole in _HOLES):
            continue
        for hole, (_, literal) in _HOLES.items():
            if hole in pattern:
                pattern = pattern.replace(hole, _alternatives(lists[hole], literal))
        found.append(pattern)
    return found


def spans(text: str, patterns: list[str]) -> list[tuple[int, int]]:
    """Where each address in the text starts and ends, in the order they begin."""
    found: list[tuple[int, int]] = []
    for pattern in patterns:
        found.extend((m.start(), m.end()) for m in re.finditer(pattern, text))
    return sorted(found)


def blank(text: str, patterns: list[str]) -> str:
    """The text with every address found in it replaced by spaces, line breaks kept, so a position in the result is
    the same position in the text."""
    if not patterns:
        return text
    marks = list(text)
    for start, end in spans(text, patterns):
        for i in range(start, end):
            if not marks[i].isspace():
                marks[i] = " "
    return "".join(marks)
