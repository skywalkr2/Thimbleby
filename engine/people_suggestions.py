"""People the person writes to, suggested in the walkthrough's people step (design 7.8): taken from the mail the
sources already read, never asked of a service. When the person's own sent mail is read, the people it was sent to
count; otherwise the people the mail came from, and only senders who look like people. Anyone already on file, the
person themselves, automated, role and company senders, bulk mail, set-aside senders and the mail kinds the app tracks
are left out. Reads only: adding someone is the People route's own add.
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


_WORD = re.compile(r"[a-z]+")
_PERSON_WORD = re.compile(r"^[^\W\d_][^\W\d_'\u2019.-]*(?:['\u2019.-][^\W\d_]+)*\.?$")


def _parsed(entry: str) -> tuple[str, str]:
    """The shown name and the lower-case address of one header entry; the address is empty when it holds none."""
    found = getaddresses([entry])
    display, address = found[0] if found else ("", "")
    address = address.strip().lower()
    return display, address if "@" in address else ""


def _blocked(store: Any, cfg: Any, sources: list[Any]) -> tuple[set[str], set[str]]:
    """The addresses and domains that are never someone to add: senders whose mail is bulk, set aside or of a tracked
    kind (a bill, an order, a delivery), and the senders and domains of the person's own set-aside rules."""
    from engine.mail_kinds import kind_of

    addresses: set[str] = set()
    domains: set[str] = set()
    for rule in cfg.watch.triage:
        if rule.kind == "sender-rule" and rule.set_aside in ("sales", "notices"):
            addresses.update(str(a).strip().lower() for a in rule.params.get("senders") or [])
            domains.update(str(d).strip().lower().removeprefix("@") for d in rule.params.get("domains") or [])
    view = store.read()
    for s in sources:
        for snap in view.find("snapshot", {"source": s.id}):
            message = snap.data.get("message") or {}
            _, sender = _parsed(str(message.get("sender") or ""))
            if not sender:
                continue
            kept_apart = snap.data.get("set_aside") or snap.data.get("deleted") or message.get("bulk")
            if kept_apart or kind_of(cfg.watch.mail_kinds, sender, str(snap.data.get("title") or ""), ""):
                addresses.add(sender)
    return addresses, domains


def _first_word(local: str) -> str:
    found = _WORD.match(local.lower())
    return found.group(0) if found else ""


def _names_a_company(display: str, words: set[str]) -> bool:
    return any(w in words for w in _WORD.findall(display.lower()))


def _looks_like_a_person(display: str) -> bool:
    """A shown name of a person's form: two to four words that are names (letters, with a hyphen, apostrophe or full
    stop inside), each starting with a capital, none written in capitals only."""
    parts = display.split()
    return 2 <= len(parts) <= 4 and all(
        _PERSON_WORD.match(w) and w[0].isupper() and not (len(w) > 3 and w.isupper()) for w in parts
    )


def suggest(store: Any, cfg: Any, limit: int) -> list[Suggestion]:
    """The real people the person writes to, the ones they wrote to most first, at most `limit`. Sent mail is read
    first (who it went to). When none is read, who wrote to the person counts, but only a sender whose shown name
    is a person's. Left out always: the person themselves, anyone on file, automated and role addresses, senders
    whose names say a company or a service, bulk mail, mail the person set aside and the kinds of mail the app tracks.
    Reads only."""
    settings = cfg.ui.walkthrough
    sources = _mail_sources(store, cfg)
    person = cfg.workspace.user.person
    sent_ids = {s.id for s in sources if person and s.author == person}
    own = _own_addresses(store, cfg, sources)
    known_addresses, known_names = _known(store)
    automated = tuple(w.lower() for w in cfg.watch.automated_mail.senders)
    roles = {w.strip().lower() for w in settings.not_people_addresses if w.strip()}
    companies = {w.strip().lower() for w in settings.not_people_names if w.strip()}
    blocked_addresses, blocked_domains = _blocked(store, cfg, sources)
    view = store.read()
    counts: Counter[str] = Counter()
    names: dict[str, str] = {}

    def note(entries: list[str], *, strict: bool) -> None:
        seen: set[str] = set()
        for entry in entries:
            display, address = _parsed(entry)
            display = re.sub(r"\s+", " ", display.replace('"', "")).strip()
            if not address or address in seen or address in own or address in known_addresses:
                continue
            local, _, domain = address.partition("@")
            if (
                address in blocked_addresses
                or domain in blocked_domains
                or local.startswith(automated)
                or _first_word(local) in roles
                or (display and _names_a_company(display, companies))
            ):
                continue
            if strict and not (display and "@" not in display and _looks_like_a_person(display)):
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
                    note(list(snap.data["message"].get("participants") or []), strict=False)
    from_sent = bool(counts)
    if not from_sent:
        for s in sources:
            for snap in view.find("snapshot", {"source": s.id}):
                message = snap.data.get("message") or {}
                if usable(snap) and not message.get("bulk") and message.get("sender"):
                    note([message["sender"]], strict=True)
    ranked = sorted(counts, key=lambda a: (-counts[a], names[a].lower(), a))
    return [Suggestion(names[a], a, counts[a], from_sent) for a in ranked[: max(0, limit)]]


#: The most names one pasted list adds.
_PASTE_LIMIT = 200
#: The longest relation or part a pasted line may give after the name.
_RELATION_LIMIT = 60
#: A name followed by an address in angle brackets, then optionally how they relate (after a comma, semicolon or dash).
_ANGLE_FORM = re.compile(
    r"^(?P<name>[^<>]*?)\s*<(?P<address>[^<>@\s]+@[^<>@\s]+)>\s*(?:[,;]|\s[-\u2013\u2014]\s)?\s*(?P<relation>.*)$"
)
#: The mark between a name and how they relate: a comma, a semicolon, or a spaced dash.
_RELATION_MARK = re.compile(r"\s*(?:[,;]|\s[-\u2013\u2014]\s)\s*")
_BARE_ADDRESS = re.compile(r"^[^\s@<>,;]+@[^\s@<>,;]+$")


def reads_as_a_person(name: str) -> bool:
    """Whether typed words read as a person's name: one to four words made of letters (a hyphen, apostrophe or full stop
    inside is fine). Numbers, marks and web addresses don't. The one rule for a name typed or pasted into a list."""
    parts = name.split()
    return 1 <= len(parts) <= 4 and all(_PERSON_WORD.match(w) for w in parts)


@dataclass(frozen=True)
class Pasted:
    """One line of a pasted list: the `name`, the `address` when the line gave one, and how they relate (or their part)
    when it said."""

    name: str
    address: str | None = None
    relation: str | None = None


@dataclass(frozen=True)
class PastedList:
    """What a pasted list holds: the people it reads as, and the lines left out because they don't read as a person."""

    people: list[Pasted]
    left_out: list[str]


def _relation_of(words: str) -> str | None:
    said = re.sub(r"\s+", " ", words).strip().strip(",;").strip()
    return said[:_RELATION_LIMIT].strip() if re.search(r"[^\W\d_]", said) else None


def _pasted_line(line: str) -> Pasted | None:
    """The person one cleaned line reads as, or None when it doesn't read as one."""
    angled = _ANGLE_FORM.match(line)
    if angled:
        display, address, rest = angled["name"], angled["address"].strip().lower(), angled["relation"]
    else:
        head, rest = (_RELATION_MARK.split(line, maxsplit=1) + [""])[:2]
        head = head.strip()
        display, address = ("", head.lower()) if _BARE_ADDRESS.match(head) else (head, "")
    name = _name_of(display.replace('"', ""), address) if address else display
    name = re.sub(r"\s+", " ", name).strip()
    if not reads_as_a_person(name):
        return None
    return Pasted(name, address or None, _relation_of(rest))


def parse_list(text: str) -> PastedList:
    """The people in a pasted list, one per line: a name, `Name <address>` or a bare address (the name its words make),
    each optionally followed by how they relate (`Name, my sister`, `Name - my sister`, `Name; my sister`). Any list
    mark (a dash, bullet or number) is dropped. A line that doesn't read as a person (numbers, marks, a web address) is
    left out and listed. Blank lines and repeats of a name or an address (ignoring capitals) are merged; at most
    `_PASTE_LIMIT` people."""
    found: list[Pasted] = []
    left_out: list[str] = []
    seen: dict[str, int] = {}  # a name or address (lower case) -> where its person is in `found`
    for raw in text.splitlines():
        line = re.sub(r"^\s*(?:[-*\u2022]|\d+[.)])\s*", "", raw).strip().rstrip(",;").strip()
        if not line:
            continue
        person = _pasted_line(line)
        if person is None:
            left_out.append(re.sub(r"\s+", " ", line))
            continue
        keys = {person.name.lower(), *([person.address] if person.address else [])}
        earlier = next((k for k in keys if k in seen), None)
        if earlier is not None:
            # A repeat is the same person: what it adds (an address, how they relate) is kept on the first.
            at = seen[earlier]
            first = found[at]
            found[at] = Pasted(first.name, first.address or person.address, first.relation or person.relation)
            seen.update({k: at for k in keys})
            continue
        seen.update({k: len(found) for k in keys})
        found.append(person)
    return PastedList(found[:_PASTE_LIMIT], left_out)


def on_file(store: Any, pasted: list[Pasted]) -> dict[str, bool]:
    """For each pasted name, whether someone of that name or address is on file already."""
    addresses, names = _known(store)
    return {p.name: p.name.lower() in names or bool(p.address and p.address in addresses) for p in pasted}


def parse_pasted(text: str) -> list[Pasted]:
    """The people in a pasted list (see `parse_list`), without the lines left out."""
    return parse_list(text).people
