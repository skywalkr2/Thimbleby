"""Amounts of money in words: the one place the server writes or reads an amount for a screen.

Every amount is in US dollars (a setting that holds one is named `..._usd` and marked `money` in its schema). It is
written with the currency sign and two decimals; the screens write the same amounts in the person's own number format.
"""

from __future__ import annotations

import re

_SIGNS = re.compile(r"[\s$]")
_NUMBER = re.compile(r"^-?(\d+\.?\d*|\.\d+)$")


def usd(amount: float) -> str:
    """An amount of US dollars as the sign and two decimals: 1.5 is "$1.50"."""
    return f"${amount:.2f}"


def parse_usd(text: str, decimal: str = ".") -> float:
    """The amount someone typed, with or without the sign: "1.5" and "$1.50" are the same amount. `decimal` is the mark
    their number format puts before the cents. The other mark ("," or ".") before three digits, or repeated, groups
    thousands; a lone other mark before one or two digits is read as the decimal mark too, so "1,5" is a dollar fifty.
    Raises ValueError for anything that is not an amount."""
    group = "," if decimal == "." else "."
    cleaned = _SIGNS.sub("", str(text))
    if decimal in cleaned:
        head, _, tail = cleaned.rpartition(decimal)
        cleaned = head.replace(group, "") + "." + tail
    elif group in cleaned:
        head, _, tail = cleaned.rpartition(group)
        lone = cleaned.count(group) == 1 and 1 <= len(tail) <= 2
        cleaned = head + "." + tail if lone else cleaned.replace(group, "")
    if not _NUMBER.match(cleaned):
        raise ValueError(f"not an amount: {text!r}")
    return float(cleaned)
