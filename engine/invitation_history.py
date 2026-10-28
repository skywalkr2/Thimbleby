"""What changed in a calendar entry that came as an invitation, read from the entry's own history (design 6.32).

The calendar keeps an entry through the `calendar.keep` rule, so each update to it is a row in the ledger with the value
before. Undoing the rows since a moment gives the entry as it was then, and `invitation_changes.describe_change` names
what differs. The brief and the entry's page read the same history; the page also says who was added, removed or
replied, which the brief leaves out. Reads only; nothing here calls AI."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta, tzinfo
from typing import Any

from engine import invitation_changes
from engine.records import entry_time
from engine.since_yesterday import CALENDAR_RULE


def stamp(value: Any) -> datetime | None:
    try:
        found = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    return found if found.tzinfo else found.replace(tzinfo=UTC)


def event_state(data: dict[str, Any], here: tzinfo, *, attendees: bool = False) -> invitation_changes.Invitation:
    """An event record as an invitation. Who replied is left out unless `attendees` asks for it."""

    def when(value: Any, *, end: bool = False, all_day: bool = False) -> date | datetime | None:
        if not value:
            return None
        found = entry_time(str(value))
        if isinstance(found, datetime):
            return found if found.tzinfo else found.replace(tzinfo=here)
        return found + timedelta(days=1) if end and all_day else found

    start = entry_time(str(data["start"])) if data.get("start") else None
    all_day = start is not None and not isinstance(start, datetime)
    organizer = data.get("organizer") or {}
    asked: list[invitation_changes.Attendee] = []
    for guest in (data.get("attendees") or []) if attendees else []:
        status = guest.get("response")
        asked.append(
            invitation_changes.Attendee(
                guest.get("address") or "",
                guest.get("name"),
                str(status).strip().upper().replace("_", "-") if status else None,
            )
        )
    return invitation_changes.Invitation(
        summary=data.get("title"),
        start=when(data.get("start")),
        end=when(data.get("end"), end=True, all_day=all_day),
        location=data.get("where"),
        organizer=invitation_changes.Person(organizer["address"], organizer.get("name"))
        if organizer.get("address")
        else None,
        attendees=tuple(asked),
        cancelled=bool(data.get("cancelled")),
    )


def calendar_rows(view: Any) -> dict[str, list[dict[str, Any]]]:
    """The ledger rows the calendar rule wrote, by entry."""
    rows: dict[str, list[dict[str, Any]]] = {}
    for row in view.ledger(kind="event"):
        if row["op"] == CALENDAR_RULE:
            rows.setdefault(row["record_id"], []).append(row)
    return rows


def before_state(data: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    """The entry's data as it was before `rows` (the calendar rule's later rows, in any order), newest undone first."""
    before = dict(data)
    for row in sorted(rows, key=lambda r: r["seq"], reverse=True):
        if row["field"] is not None:
            before[row["field"]] = row["before"]
    return before


def changes_since(
    view: Any, event: Any, here: tzinfo, since: datetime, rows: list[dict[str, Any]] | None = None
) -> tuple[datetime, list[invitation_changes.Change]] | None:
    """What changed in an entry that came as an invitation since `since`, with when it last changed, who replied
    included. None when nothing was kept after `since`, or the entry has no readable start. An entry first kept after
    `since` is compared with how it was first kept (the first version's rows are never undone)."""
    if rows is None:
        rows = calendar_rows(view).get(event.id, [])
    data = event.data
    if not data.get("invitation") or not data.get("start"):
        return None
    recent = [r for r in rows if r["field"] is not None and r["version"] > 1 and (stamp(r["at"]) or since) > since]
    if not recent:
        return None
    when = max(stamp(r["at"]) for r in recent)  # type: ignore[type-var]
    try:
        old = event_state(before_state(data, recent), here, attendees=True)
        new = event_state(data, here, attendees=True)
    except (ValueError, KeyError, TypeError, OverflowError):
        return None
    found = invitation_changes.describe_change(old, new, here)
    return (when, found) if found else None


def local_parts(value: Any) -> tuple[str | None, str | None]:
    """A change's time as a day and a clock time (none for an all-day date)."""
    if isinstance(value, dict) and value.get("at") is not None:
        return value["at"].date().isoformat(), value["at"].strftime("%H:%M")
    if isinstance(value, dict) and value.get("date") is not None:
        return value["date"].isoformat(), None
    return None, None


def describe(change: invitation_changes.Change) -> dict[str, Any]:
    """A change as plain values for the screen to word: its kind, the words it names (`text`, `name`, `status`,
    `reason`) and the new and old time as a day and a clock time."""
    values = change.values
    after = values.get("after") or values.get("start")
    day, at = local_parts(after)
    from_day, from_at = local_parts(values.get("before"))
    return {
        "kind": change.kind,
        "text": values.get("title") or values.get("location"),
        "name": values.get("name") or values.get("email"),
        "status": values.get("status"),
        "reason": values.get("reason"),
        "day": day,
        "at": at,
        "from_day": from_day,
        "from_at": from_at,
    }
