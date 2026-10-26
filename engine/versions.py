"""Versions of one document in a watched folder (design 6.2, "Versions of one document").

Files whose names differ only by version marks (v3, v3_1, v2.0), dates (2026-10-21, 20261021) and the configured words
(FOR REVIEW, DRAFT, FINAL) are one family within the same top folder; an archive folder doesn't make a new family. The
current copy is the highest date, then version, then modified time, among the family's files outside an archive folder.
A bare number of three or more digits is an id, never a version, so two documents that differ only by an id stay apart.
Nothing here writes or reads a file: it works on the keys (paths) and modified times a read gave.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from pathlib import PurePosixPath
from typing import Any

#: Connectors whose item keys are paths in a folder, so their files can be families.
FOLDER_CONNECTORS = frozenset({"folder"})

_DATE = re.compile(r"(?<!\d)(\d{4})([-_.]?)(\d{2})\2(\d{2})(?!\d)")
_VERSION = re.compile(r"(?<![a-z0-9])v(\d+(?:[._]\d+)*)(?![a-z0-9])", re.IGNORECASE)
_SEPARATORS = re.compile(r"[\s_\-.]+")


@dataclass(frozen=True)
class Copy:
    """One file: its key (path inside the watched folder), family, rank marks and whether it sits in an archive."""

    key: str
    title: str
    family: tuple[str, str]
    archived: bool
    rank: tuple[str, tuple[int, ...], str]


def _valid_date(match: re.Match[str]) -> str | None:
    year, month, day = int(match[1]), int(match[3]), int(match[4])
    try:
        return date(year, month, day).isoformat() if 1900 <= year <= 2200 else None
    except ValueError:
        return None


def marks_of(stem: str, ignore: Iterable[str] = ()) -> tuple[str, str, tuple[int, ...]]:
    """(the name with the marks taken out, the date or "", the version): `Deck_v3_1` gives ("deck", "", (3, 1))."""
    found_date = ""

    def take_date(match: re.Match[str]) -> str:
        nonlocal found_date
        valid = _valid_date(match)
        if valid is None:
            return match[0]
        found_date = max(found_date, valid)
        return " "

    text = _DATE.sub(take_date, stem)
    versions = [tuple(int(n) for n in re.split(r"[._]", m[1])) for m in _VERSION.finditer(text)]
    text = _VERSION.sub(" ", text)
    for word in sorted((w for w in ignore if w.strip()), key=len, reverse=True):
        pattern = (
            r"(?<![a-z0-9])" + r"[\s_\-.]+".join(re.escape(p) for p in re.split(r"\s+", word.strip())) + r"(?![a-z0-9])"
        )
        text = re.sub(pattern, " ", text, flags=re.IGNORECASE)
    name = _SEPARATORS.sub(" ", text).strip().casefold()
    return name, found_date, max(versions, default=())


def copy_of(key: str, modified: str | None, ignore: Iterable[str], archives: Iterable[str]) -> Copy:
    """Read a file's key into its family and rank."""
    path = PurePosixPath(key)
    archive_names = {a.casefold() for a in archives}
    folders = [p for p in path.parent.parts if p not in ("", ".")]
    archived = any(p.casefold() in archive_names for p in folders)
    kept = [p for p in folders if p.casefold() not in archive_names]
    name, stamp, version = marks_of(path.stem, ignore)
    top = kept[0].casefold() if kept else ""
    return Copy(key, path.name, (top, name or path.stem.casefold()), archived, (stamp, version, modified or ""))


def current_of(copies: Iterable[Copy]) -> Copy | None:
    """The current copy: the highest date, then version, then modified time, outside an archive folder."""
    live = [c for c in copies if not c.archived]
    return max(live, key=lambda c: (c.rank, c.key)) if live else None


def replaced_by(copies: Iterable[Copy], current: Copy) -> Copy | None:
    """The copy the current one replaces: the best-ranked other copy of the family."""
    others = [c for c in copies if c.key != current.key]
    return max(others, key=lambda c: (not c.archived, c.rank, c.key)) if others else None


class Families:
    """The files a read found, grouped into families."""

    def __init__(self, items: Iterable[Any], settings: Any) -> None:
        self.copies = [copy_of(i.key, i.changed_at, settings.ignore_words, settings.archive_folders) for i in items]
        self.by_key = {c.key: c for c in self.copies}
        self._settings = settings

    def family(self, key: str, modified: str | None = None) -> list[Copy]:
        mine = self.by_key.get(key) or copy_of(
            key, modified, self._settings.ignore_words, self._settings.archive_folders
        )
        return [c for c in self.copies if c.family == mine.family]

    def older_than_current(self, key: str, modified: str | None = None, gone: bool = False) -> str | None:
        """Why this file's change closes itself, or None when it is the current copy (or the family has none and the
        file isn't in an archive folder)."""
        mine = self.by_key.get(key) or copy_of(
            key, modified, self._settings.ignore_words, self._settings.archive_folders
        )
        current = current_of(self.family(key, modified))
        if current is not None and current.key != key and (not gone or mine.rank < current.rank):
            return f"an older version; the current one is {current.title}"
        if current is None and mine.archived and not gone:
            return "an older version, kept in an archive folder"
        return None

    def replaces(self, key: str) -> str | None:
        """For the current copy: the title of the version it replaces, if the family has another."""
        family = self.family(key)
        current = current_of(family)
        if current is None or current.key != key:
            return None
        older = replaced_by(family, current)
        return older.title if older else None
