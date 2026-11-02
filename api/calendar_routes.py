"""A meeting added in a short form (design 7.7): `POST /api/calendar/meetings` takes what, the day, the time, an end and
a side, and makes the person's own calendar entry, or says it merged the meeting into one already there. Undo is the
usual changeset undo."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException

from api.schemas import EventCancelIn, EventChanged, EventMoveIn, MeetingAdded, MeetingIn
from engine import add_meeting
from engine.applier import apply_as_person
from engine.config import Config
from engine.records import canonical_time, entry_time
from engine.storage import Store, StoreError
from engine.worker import Events, Worker
from engine.workspace import Workspace


def _same_moment(a: str, b: object) -> bool:
    """Whether a stored time is the moment `b` (a day or a date-time), whatever offset it is written with."""
    try:
        x = entry_time(a)
    except ValueError:
        return False
    if isinstance(x, datetime) and isinstance(b, datetime):
        if x.tzinfo is None or b.tzinfo is None:
            return x.replace(tzinfo=None) == b.replace(tzinfo=None)
        return x == b
    return x == b


def build_calendar_router(ws: Workspace, cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    @r.post("/calendar/meetings")
    def add(body: MeetingIn) -> MeetingAdded:
        """Add a meeting, or merge it into the one that is already on the calendar. The person's own act, with Undo."""
        try:
            added = add_meeting.add_meeting(
                store,
                cfg,
                body.what,
                body.day,
                body.time,
                body.until,
                body.side,
                where=body.where,
                repeat=body.repeat,
                repeat_until=body.repeat_until,
            )
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        if not added.merged:
            events.changed()
            worker.poke()
        return MeetingAdded(**vars(added))  # type: ignore[arg-type]

    def own_entry(event_id: str) -> object:
        """The calendar entry the app keeps itself; one read from a connected calendar is changed through its
        account's acts, never here."""
        found = store.read().get("event", event_id)
        if found is None:
            raise HTTPException(status_code=404, detail="There is no such calendar entry.")
        if found.data.get("source") or found.data.get("key"):
            raise HTTPException(status_code=409, detail="That entry is on a connected calendar.")
        return found

    def moment(text: str) -> datetime:
        try:
            return datetime.fromisoformat(text)
        except ValueError:
            raise HTTPException(status_code=409, detail="That isn't a time.") from None

    def applied(ops: list[dict], summary: str, note: str) -> EventChanged:
        try:
            cs_id = apply_as_person(store, cfg, ops, summary, note=note)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        worker.poke()
        return EventChanged(changeset=cs_id)

    def one_date(event_id: str, found: object, occurrence: str, change: dict, note: str) -> EventChanged:
        """Move or call off one date of an entry that repeats, with Undo: an exception on the entry for the date its
        rule had at `occurrence`, which replaces one already there for that date. The other dates stay as they are."""
        data = found.data  # type: ignore[attr-defined]
        if not data.get("repeat"):
            raise HTTPException(status_code=409, detail="That entry doesn't repeat.")
        try:
            was = canonical_time(occurrence)
        except ValueError:
            raise HTTPException(status_code=409, detail="That isn't a date of the entry.") from None
        wanted = entry_time(was)
        kept = [e for e in data.get("exceptions") or [] if _same_moment(e["was"], wanted) is False]
        exception = {
            "was": was,
            "start": change.get("start"),
            "end": change.get("end"),
            "cancelled": bool(change.get("cancelled")),
        }
        op = {
            "op": "record.edit",
            "record": {"kind": "event", "id": event_id},
            "fields": {"exceptions": [*kept, exception]},
            "read_version": found.version,  # type: ignore[attr-defined]
        }
        return applied([op], "Changed one date of a calendar entry", note)

    @r.post("/events/{event_id}/move")
    def move(event_id: str, body: EventMoveIn) -> EventChanged:
        """Move the person's own entry to another time, with Undo. Entries from a connected calendar are moved
        through an act the person approves, not here."""
        found = own_entry(event_id)
        if found.version != body.read_version:  # type: ignore[attr-defined]
            return EventChanged(refused="changed")
        start = moment(body.start)
        if body.end is not None and moment(body.end) <= start:
            raise HTTPException(status_code=409, detail="It has to end after it starts.")
        note = f"Moved to {body.start}" + (f" until {body.end}" if body.end else "")
        if body.occurrence is not None:
            return one_date(event_id, found, body.occurrence, {"start": body.start, "end": body.end}, note)
        op = {"op": "event.set", "id": event_id, "start": body.start, "evidence": {"quote": note}}
        if body.end is not None:
            op["end"] = body.end
        return applied([op], "Moved a calendar entry", note)

    @r.post("/events/{event_id}/cancel")
    def cancel(event_id: str, body: EventCancelIn) -> EventChanged:
        """Remove the person's own entry, with Undo bringing it back. Refused in a kind when it changed since it was
        read or another record still refers to it."""
        found = own_entry(event_id)
        if found.version != body.read_version:  # type: ignore[attr-defined]
            return EventChanged(refused="changed")
        if body.occurrence is not None:
            return one_date(event_id, found, body.occurrence, {"cancelled": True}, "Called off this date")
        if store.plugins._referrers(store.read())("event", event_id):
            return EventChanged(refused="referred_to")
        op = {"op": "record.delete", "record": {"kind": "event", "id": event_id}, "read_version": body.read_version}
        return applied([op], "Cancelled a calendar entry", "Cancelled by you")

    return r
