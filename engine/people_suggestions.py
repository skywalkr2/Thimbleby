"""People the person writes to most, suggested in the walkthrough's people step (design 7.8): taken from the mail the
sources already read, never asked of a service. When the person's own sent mail is read, the people it was sent to
count; otherwise the people the mail came from. Anyone already on file, the person themselves, automated senders and
bulk mail are left out. Reads only: adding someone is the People route's own add.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from email.utils import getaddresses
from typing import Any

from engine.connectors import CORE, declared_reads, reads


@dataclass(frozen=True)
class Suggestion:
    """One person worth adding: `name` as the mail shows it (made from the address when it shows none), their
    `address`, and in how many messages they appear (`count`)."""

    name: str
    address: str
    count: int
    from_sent: bool


def _name_of(display: str, address: str) -> str:
    """The name a mail header shows for someone, else one made from the words of the address before the @."""
    shown = re.sub(r"\s+", " ", display.replace('"', "")).strip()
    if shown and "@" not in shown:
        return shown
    return " ".join(w.capitalize() for w in re.split(r"[._+-]+", address.split("@", 1)[0]) if w)


def _mail_sources(store: Any, cfg: Any) -> list[Any]:
    said = declared_reads({**CORE, **store.plugins.connectors()})
    return [s for s in cfg.watch.sources if s.enabled and "mail" in (reads(s.connector, said) or [])]


def _own_addresses(store: Any, cfg: Any, sources: list[Any]) -> set[str]:
    """The addresses that are the person's own: those on their record and the accounts the mail sources read as."""
    own: set[str] = set()
    person = cfg.workspace.user.person
    record = store.read().get("person", person) if person else None
    own.update(str(v).lower() for v in ((record.data.get("how_to_reach") or {}).values() if record else []))
    for s in sources:
        for value in (s.account, s.settings.get("user")):
            if value:
                own.add(str(value).lower())
    return own


def _known(store: Any) -> tuple[set[str], set[str]]:
    """The addresses and the names (full names and aliases, lower case) of the people already on file."""
    addresses: set[str] = set()
    names: set[str] = set()
    for p in store.read().list("person"):
        addresses.update(str(v).lower() for v in (p.data.get("how_to_reach") or {}).values())
        names.update(n.lower() for n in [p.data["full_name"], *p.data.get("aliases", [])] if n)
    return addresses, names


def suggest(store: Any, cfg: Any, limit: int) -> list[Suggestion]:
    """The people the person's mail shows most, most first, at most `limit`. Reads only."""
    sources = _mail_sources(store, cfg)
    person = cfg.workspace.user.person
    sent_ids = {s.id for s in sources if person and s.author == person}
    own = _own_addresses(store, cfg, sources)
    known_addresses, known_names = _known(store)
    automated = tuple(w.lower() for w in cfg.watch.automated_mail.senders)
    view = store.read()
    counts: Counter[str] = Counter()
    names: dict[str, str] = {}

    def note(entries: list[str]) -> None:
        seen: set[str] = set()
        for display, address in getaddresses(entries):
            address = address.strip().lower()
            if "@" not in address or address in seen or address in own or address in known_addresses:
                continue
            if address.split("@", 1)[0].startswith(automated):
                continue
            name = _name_of(display, address)
            if not name or name.lower() in known_names:
                continue
            seen.add(address)
            counts[address] += 1
            names.setdefault(address, name)

    def usable(snap: Any) -> bool:
        data = snap.data
        return bool(data.get("message")) and not (data.get("gone") or data.get("deleted") or data.get("set_aside"))

    for s in sources:
        if s.id in sent_ids:
            for snap in view.find("snapshot", {"source": s.id}):
                if usable(snap):
                    note(list(snap.data["message"].get("participants") or []))
    from_sent = bool(counts)
    if not from_sent:
        for s in sources:
            for snap in view.find("snapshot", {"source": s.id}):
                message = snap.data.get("message") or {}
                if usable(snap) and not message.get("bulk") and message.get("sender"):
                    note([message["sender"]])
    ranked = sorted(counts, key=lambda a: (-counts[a], names[a].lower(), a))
    return [Suggestion(names[a], a, counts[a], from_sent) for a in ranked[: max(0, limit)]]


#: The most names one pasted list adds.
_PASTE_LIMIT = 200


@dataclass(frozen=True)
class Pasted:
    """One line of a pasted list: the `name`, and the `address` when the line gave one."""

    name: str
    address: str | None = None


def parse_pasted(text: str) -> list[Pasted]:
    """The people in a pasted list, one per line: a name, or `Name <address>` (both kept), with any list mark (a dash,
    bullet or number) and trailing commas dropped. A line that is only an address gives the name its words make. Blank
    lines and repeats of a name (ignoring capitals) are left out; at most `_PASTE_LIMIT` people."""
    found: list[Pasted] = []
    seen: set[str] = set()
    for line in text.splitlines():
        line = re.sub(r"^\s*(?:[-*\u2022]|\d+[.)])\s*", "", line).strip().rstrip(",;").strip()
        if not line:
            continue
        display, address = next(iter(getaddresses([line])), ("", "")) if "@" in line else ("", "")
        has_address = "@" in address
        name = _name_of(display, address) if has_address else re.sub(r"\s+", " ", line)
        if name and name.lower() not in seen:
            seen.add(name.lower())
            found.append(Pasted(name, address.strip().lower() if has_address else None))
    return found[:_PASTE_LIMIT]
