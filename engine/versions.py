"""Versions of one document in a watched folder (design 6.2, "Versions of one document").

Files whose names differ only by version marks (v3, v3_1, v2.0), dates (2026-10-21, 20261021) and the configured words
(FOR REVIEW, DRAFT, FINAL) are one family within the same top folder; an archive folder doesn't make a new family. The
current copy is the highest version, then the latest date in the name, among the family's files outside an archive
folder. When the versions and dates tie, or one says a copy is newer and the other says another is, nothing is closed
as older and the person is asked once; the modified time decides only when the person gave no answer, because a sync,
a restore or a copy changes it. A bare number of three or more digits is an id, never a version, so two documents that
differ only by an id stay apart.

The person's own choices (design 6.2) are read from the settings: files said to be one document join their families
(`same_document`), a file said not to belong to its name's family stands alone (`not_same`), and a copy said to be the
current one is (`current`). Each choice names a file by its content (the hash of its text), so it survives the older
copy moving into an archive folder and the current copy being renamed; an entry written as a path (an earlier version
of the app, or a file no longer listed) still names the file at that path. Nothing here writes or reads a file: it
works on the keys (paths), hashes and modified times a read gave.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Collection, Iterable, Mapping
from dataclasses import dataclass, replace
from datetime import date
from pathlib import PurePosixPath
from typing import Any

#: Connectors whose item keys are paths in a folder, so their files can be families.
FOLDER_CONNECTORS = frozenset({"folder"})

_DATE = re.compile(r"(?<!\d)(\d{4})([-_.]?)(\d{2})\2(\d{2})(?!\d)")
_VERSION = re.compile(r"(?<![a-z0-9])v(\d+(?:[._]\d+)*)(?![a-z0-9])", re.IGNORECASE)
_SEPARATORS = re.compile(r"[\s_\-.]+")


def digest_of(text: str) -> str:
    """The hash a file's text is known by: the one the watcher keeps on its snapshot (`content_hash`)."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Listed:
    """A file a read found, for the families: its key (path), when it changed and the hash of its text."""

    key: str
    changed_at: str | None
    digest: str


@dataclass(frozen=True)
class Copy:
    """One file: its key (path inside the watched folder), family, rank marks (version, date, modified time), whether
    it sits in an archive, and the hash of its text (empty when not known)."""

    key: str
    title: str
    family: tuple[str, str]
    archived: bool
    rank: tuple[tuple[int, ...], str, str]
    digest: str = ""

    def named_in(self, names: Collection[str]) -> bool:
        """Whether a choice names this file: by its content, or (an older entry) by its path."""
        return self.key in names or bool(self.digest and self.digest in names)


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


def copy_of(key: str, modified: str | None, ignore: Iterable[str], archives: Iterable[str], digest: str = "") -> Copy:
    """Read a file's key into its family and rank."""
    path = PurePosixPath(key)
    archive_names = {a.casefold() for a in archives}
    folders = [p for p in path.parent.parts if p not in ("", ".")]
    archived = any(p.casefold() in archive_names for p in folders)
    kept = [p for p in folders if p.casefold() not in archive_names]
    name, stamp, version = marks_of(path.stem, ignore)
    top = kept[0].casefold() if kept else ""
    return Copy(key, path.name, (top, name or path.stem.casefold()), archived, (version, stamp, modified or ""), digest)


@dataclass(frozen=True)
class Decision:
    """Which copy of a family is current. `current` is None when the family has no copy outside an archive folder, or
    when the copies can't be told apart (`unclear`, with why in `why`: "tie" or "disagree")."""

    current: Copy | None
    unclear: tuple[Copy, ...] = ()
    why: str = ""


def decide(copies: Iterable[Copy], pinned: Collection[str] = (), by_time: bool = False) -> Decision:
    """The current copy of a family: a copy the person named, else the highest version, then the latest date in the
    name. The versions tying with the dates (or the dates saying another copy is newer than the version does) leaves
    it unclear. With `by_time`, an unclear family falls back to the modified time among the copies in question."""
    live = [c for c in copies if not c.archived]
    if not live:
        return Decision(None)
    named = [c for c in live if c.named_in(pinned)]
    if named:
        return Decision(max(named, key=lambda c: (c.rank, c.key)))
    if len(live) == 1:
        return Decision(live[0])
    best = max(c.rank[0] for c in live)
    top = [c for c in live if c.rank[0] == best]
    latest = max(c.rank[1] for c in top)
    top = [c for c in top if c.rank[1] == latest]
    unclear: tuple[Copy, ...] = ()
    why = ""
    if len(top) > 1:
        unclear, why = tuple(sorted(top, key=lambda c: c.key)), "tie"
    else:
        winner = top[0]
        later = [
            c
            for c in live
            if c.key != winner.key
            and c.rank[0]
            and winner.rank[0]
            and c.rank[0] < winner.rank[0]
            and c.rank[1]
            and winner.rank[1]
            and c.rank[1] > winner.rank[1]
        ]
        if later:
            unclear, why = tuple(sorted([winner, *later], key=lambda c: c.key)), "disagree"
    if not unclear:
        return Decision(top[0])
    if by_time:
        return Decision(max(unclear, key=lambda c: (c.rank[2], c.key)))
    return Decision(None, unclear, why)


def current_of(copies: Iterable[Copy]) -> Copy | None:
    """The current copy when the versions and dates tell, else None."""
    return decide(copies).current


def replaced_by(copies: Iterable[Copy], current: Copy) -> Copy | None:
    """The copy the current one replaces: the best-ranked other copy of the family."""
    others = [c for c in copies if c.key != current.key]
    return max(others, key=lambda c: (not c.archived, c.rank, c.key)) if others else None


def family_id(family: tuple[str, str]) -> str:
    """A family as one string, to name it in a question."""
    return "|".join(family)


@dataclass(frozen=True)
class Choices:
    """What the person said by hand about one watched folder's files."""

    same: tuple[tuple[str, ...], ...] = ()
    apart: frozenset[str] = frozenset()
    current: frozenset[str] = frozenset()


def choices_of(settings: Any, source: str | None, followed: Mapping[str, str] | None = None) -> Choices:
    """The person's choices for one watched folder, from `watch.versions`. `followed` maps the hash a choice names to
    the hash the file has now, for a file edited in place since the choice was made, so the choice still names it."""
    if source is None:
        return Choices()
    now = followed or {}
    return Choices(
        same=tuple(
            tuple(now.get(f, f) for f in link.files)
            for link in settings.same_document
            if link.source == source and link.files
        ),
        apart=frozenset(now.get(f, f) for f in settings.not_same.get(source, ())),
        current=frozenset(now.get(f, f) for f in settings.current.get(source, ())),
    )


class Families:
    """The files a read found, grouped into families. `source` names the watched folder, so the person's choices for
    it apply; `give_up` holds the families whose question the person set aside, which fall back to the modified time;
    with `ask` false there is nobody to ask, so every unclear family does. Each item has a `key`, a `changed_at` and,
    when known, a `digest` (the hash of its text); `followed` maps the hash a choice names to the file's hash now."""

    def __init__(
        self,
        items: Iterable[Any],
        settings: Any,
        source: str | None = None,
        *,
        give_up: Collection[str] = (),
        ask: bool = True,
        followed: Mapping[str, str] | None = None,
    ) -> None:
        self._settings = settings
        self.choices = choices_of(settings, source, followed)
        raw = [
            copy_of(
                i.key, i.changed_at, settings.ignore_words, settings.archive_folders, getattr(i, "digest", "") or ""
            )
            for i in items
        ]
        self._named = {n: c for c in raw for n in (c.key, c.digest) if n}
        self._joined = self._join()
        self.copies = [self._place(c) for c in raw]
        self.by_key = {c.key: c for c in self.copies}
        self._give_up = frozenset(give_up)
        self._ask = ask

    def _join(self) -> dict[tuple[str, str], tuple[str, str]]:
        """The family each name's family joins, from the files the person said are one document."""
        parent: dict[tuple[str, str], tuple[str, str]] = {}

        def find(x: tuple[str, str]) -> tuple[str, str]:
            while parent.setdefault(x, x) != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        for group in self.choices.same:
            names = [self._node(c) for c in (self._named_copy(k) for k in group) if c is not None]
            for other in names[1:]:
                a, b = find(names[0]), find(other)
                if a != b:
                    parent[max(a, b)] = min(a, b)
        return {x: find(x) for x in list(parent)}

    def _named_copy(self, name: str) -> Copy | None:
        """The file a choice's entry names: the one with that hash or path in this read; an entry that is a path no file
        has now still names the family its path would have; a hash no file has now names none."""
        found = self._named.get(name)
        if found is not None:
            return found
        if re.fullmatch(r"[0-9a-f]{64}", name):
            return None
        return copy_of(name, None, self._settings.ignore_words, self._settings.archive_folders)

    def _node(self, copy: Copy) -> tuple[str, str]:
        """What a file joins others as: the family its name puts it in, or, for a file the person split off, itself."""
        return ("", "apart " + (copy.digest or copy.key)) if copy.named_in(self.choices.apart) else copy.family

    def _place(self, copy: Copy) -> Copy:
        """The copy in the family the person's choices put it in."""
        node = self._node(copy)
        return replace(copy, family=self._joined.get(node, node))

    def _copy(self, key: str, modified: str | None = None) -> Copy:
        return self.by_key.get(key) or self._place(
            copy_of(key, modified, self._settings.ignore_words, self._settings.archive_folders)
        )

    def family(self, key: str, modified: str | None = None) -> list[Copy]:
        mine = self._copy(key, modified)
        return [c for c in self.copies if c.family == mine.family]

    def decision(self, key: str, modified: str | None = None) -> Decision:
        """Which copy of the file's family is current, or why that can't be told."""
        mine = self._copy(key, modified)
        by_time = not self._ask or family_id(mine.family) in self._give_up
        return decide(self.family(key, modified), self.choices.current, by_time)

    def unclear(self, key: str) -> tuple[str, tuple[Copy, ...], str] | None:
        """For a file whose family's current copy can't be told: (the family's id, the copies in question, why)."""
        mine = self._copy(key)
        found = self.decision(key)
        return (family_id(mine.family), found.unclear, found.why) if found.unclear else None

    def older_than_current(self, key: str, modified: str | None = None, gone: bool = False) -> str | None:
        """Why this file's change closes itself, or None when it is the current copy, when the family's current copy
        can't be told (nothing closes unasked), or when the family has none and the file isn't in an archive folder."""
        mine = self._copy(key, modified)
        found = self.decision(key, modified)
        current = found.current
        if current is not None and current.key != key and (not gone or mine.rank < current.rank):
            return f"an older version; the current one is {current.title}"
        if current is None and mine.archived and not gone:
            return "an older version, kept in an archive folder"
        return None

    def replaces(self, key: str) -> str | None:
        """For the current copy: the title of the version it replaces, if the family has another."""
        family = self.family(key)
        current = self.decision(key).current
        if current is None or current.key != key:
            return None
        older = replaced_by(family, current)
        return older.title if older else None
