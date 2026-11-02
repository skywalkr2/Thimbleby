"""Who is on a plain calendar entry, proposed from its title and confirmed by the person (design 6.2, 6.32).

A plain entry whose title names known people only makes a proposal (`proposed_guests` on the entry, written by
`engine.entry_rules.link`): a name in a title may be the person's lunch partner or only a topic, and a plain function
narrows what the person looks at without deciding. The person's yes ("Yes") makes them guests (the entry's `people`), as
their own change with Undo; "Not them" records that this set is not the one, so it is never proposed again. The
assistant confirms them itself with `event.guests` and the words that say so. Nothing that reads who is on an entry
(meeting preparation, who the person last met, the brief) counts a proposal."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime
from typing import Any

from engine.applier import apply_as_person
from engine.storage import StoreError

KIND = "guests"


def subject(entry_id: str, people: list[str]) -> str:
    return f"guests:{entry_id}:{'+'.join(sorted(people))}"


def declined(view: Any) -> set[str]:
    """The sets of guests the person said are not the ones and hasn't taken back, as `subject` names them."""
    found: set[str] = set()
    for signal in view.list("signal"):
        note = signal.data.get("note")
        if signal.data["kind"] != "suggestion_dismissed" or note in (None, "taken back"):
            continue
        try:
            said = json.loads(note)
        except ValueError:
            continue
        if isinstance(said, dict) and said.get("kind") == KIND:
            found.add(str(said["subject"]))
    return found


def named(view: Any, entry: Any) -> list[str]:
    """The people proposed for an entry that still need a yes: known, and not already confirmed as on it."""
    have = set(entry.data.get("people") or [])
    return [p for p in entry.data.get("proposed_guests") or [] if p not in have and view.get("person", p) is not None]


def pending(view: Any, entry: Any, refused: set[str] | None = None) -> list[str]:
    """The people proposed for an entry, or none: the proposal stands while the entry is kept and not called off, and
    the person hasn't said this set isn't the one."""
    if entry.data.get("cancelled"):
        return []
    people = named(view, entry)
    if not people:
        return []
    refused = declined(view) if refused is None else refused
    return [] if subject(entry.id, people) in refused else people


def proposals(view: Any, today: date, zone: Any) -> list[tuple[Any, list[str]]]:
    """Every open proposal, as (entry, people), the earliest first. An entry on a day already gone has none to ask."""
    from engine import series as series_module

    refused = declined(view)
    found = []
    for entry in view.list("event"):
        span = series_module.span(entry.data, zone)
        if span is None or span[1] < today:
            continue
        if people := pending(view, entry, refused):
            found.append((entry, people))
    return sorted(found, key=lambda pair: (str(pair[0].data["start"]), pair[0].id))


def confirm(store: Any, cfg: Any, entry_id: str) -> str:
    """Record the people proposed for the entry as on it, as the person's own change. Returns the changeset's id, which
    Undo takes. Raises `StoreError` saying why when nobody is proposed."""
    view = store.read()
    entry = view.get("event", entry_id)
    people = pending(view, entry) if entry is not None else []
    if entry is None or not people:
        raise StoreError("Nobody is proposed as on that entry now.")
    have = list(entry.data.get("people") or [])
    op = {
        "op": "record.edit",
        "record": {"kind": "event", "id": entry_id},
        "fields": {"people": [*have, *(p for p in people if p not in have)], "proposed_guests": []},
        "read_version": entry.version,
    }
    return apply_as_person(
        store, cfg, [op], f"Confirmed who is on {entry.data['title']}", note=str(entry.data["title"])
    )


def decline(store: Any, cfg: Any, entry_id: str, now: datetime | None = None) -> str:
    """Record that the people proposed for the entry are not the ones on it: that set is never proposed again. Returns
    the signal's id, which `engine.suggestions.take_back` undoes. Raises `StoreError` when nobody is proposed."""
    from engine.dispatcher import signal

    view = store.read()
    entry = view.get("event", entry_id)
    people = pending(view, entry) if entry is not None else []
    if entry is None or not people:
        raise StoreError("Nobody is proposed as on that entry now.")
    note = json.dumps({"kind": KIND, "subject": subject(entry_id, people), "change": ""})
    return signal(store, "suggestion_dismissed", [entry_id, *people], note=note, now=now or datetime.now(UTC))
