"""Tying a to-do to the calendar entry it is due at (design 6.32).

A plain entry whose title and an open to-do's words contain one another, on the to-do's day, only makes a proposal
(`proposed_event` on the to-do, written by `engine.entry_rules.link`): word overlap narrows what the person looks at
and decides nothing. The person's yes ("Tie it") makes the tie, the to-do's `due_event`, as their own change with Undo;
"Not this" records that the pair is not the one, so it is never proposed again. Only a tie moves the to-do's date when
the entry moves, or tells it the entry was called off (`engine.applier.follow_event`, `engine.source_entries`). A to-do
the assistant makes at an entry by its own op is tied from the start, and the assistant can tie one itself with
`action.tie` (the applier uses `tied_fields`), as a run that sees the proposal or the words that show it."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from engine.applier import apply_as_person
from engine.storage import StoreError

KIND = "tie"
TAKEN_BACK = "taken back"


def subject(action_id: str, event_id: str) -> str:
    return f"tie:{action_id}:{event_id}"


def declined(view: Any) -> set[str]:
    """The pairs the person said are not the one and hasn't taken back, as `subject` names them."""
    found: set[str] = set()
    for signal in view.list("signal"):
        note = signal.data.get("note")
        if signal.data["kind"] != "suggestion_dismissed" or note in (None, TAKEN_BACK):
            continue
        try:
            said = json.loads(note)
        except ValueError:
            continue
        if isinstance(said, dict) and said.get("kind") == KIND:
            found.add(str(said["subject"]))
    return found


def pending(view: Any, action: Any, refused: set[str] | None = None) -> Any | None:
    """The calendar entry a to-do is proposed to be tied to, or None: the proposal stands while the to-do is open and
    untied, the entry is kept, not called off and on the to-do's day, and the person hasn't said it isn't this one."""
    d = action.data
    entry_id = d.get("proposed_event")
    if not entry_id or d.get("status") != "open" or d.get("due_event"):
        return None
    entry = view.get("event", entry_id)
    if entry is None or entry.data.get("cancelled") or str(entry.data["start"])[:10] != str(d.get("due") or ""):
        return None
    refused = declined(view) if refused is None else refused
    return None if subject(action.id, entry_id) in refused else entry


def proposals(view: Any) -> list[tuple[Any, Any]]:
    """Every open proposal, as (to-do, entry), the earliest day first."""
    refused = declined(view)
    found = [(a, e) for a in view.list("action") if (e := pending(view, a, refused)) is not None]
    return sorted(found, key=lambda pair: (str(pair[1].data["start"]), pair[0].id))


def view_of(view: Any, action: Any) -> dict[str, Any] | None:
    """The proposal as the to-do's page shows it: the entry, its title and its day; None when there is none."""
    entry = pending(view, action)
    if entry is None:
        return None
    return {"entry": entry.id, "title": entry.data["title"], "day": str(entry.data["start"])[:10]}


def tied_fields(entry: Any) -> dict[str, Any]:
    """What tying a to-do to an entry sets, for the person's tie and the assistant's `action.tie` alike: the entry it is
    due at, its day as the to-do's date (no longer a date to check) and no proposal left."""
    return {
        "due_event": entry.id,
        "due": str(entry.data["start"])[:10],
        "due_check": False,
        "proposed_event": None,
    }


def tie(store: Any, cfg: Any, action_id: str) -> str:
    """Tie the to-do to the entry proposed for it, as the person's own change: its `due_event` set and its date the
    entry's. Returns the changeset's id, which Undo takes. Raises `StoreError` saying why when nothing is proposed."""
    view = store.read()
    action = view.get("action", action_id)
    entry = pending(view, action) if action is not None else None
    if action is None or entry is None:
        raise StoreError("There is no calendar entry proposed for that to-do now.")
    op = {
        "op": "record.edit",
        "record": {"kind": "action", "id": action_id},
        "fields": tied_fields(entry),
        "read_version": action.version,
    }
    return apply_as_person(store, cfg, [op], f"Tied a to-do to {entry.data['title']}", note=str(action.data["text"]))


def decline(store: Any, cfg: Any, action_id: str, now: datetime | None = None) -> str:
    """Record that the entry proposed for the to-do is not its one: it is never proposed for it again. Returns the
    signal's id, which `engine.suggestions.take_back` undoes. Raises `StoreError` when nothing is proposed."""
    from engine.dispatcher import signal

    view = store.read()
    action = view.get("action", action_id)
    entry = pending(view, action) if action is not None else None
    if action is None or entry is None:
        raise StoreError("There is no calendar entry proposed for that to-do now.")
    note = json.dumps({"kind": KIND, "subject": subject(action_id, entry.id), "change": ""})
    return signal(store, "suggestion_dismissed", [action_id, entry.id], note=note, now=now or datetime.now(UTC))
