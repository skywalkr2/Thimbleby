"""Deliveries on the app's own calendar: one entry for a parcel or order, kept up to date by every mail about it.

An `event.add` with a `delivery` finds the entry for that order or tracking number and updates it, never adding a
second one. Matching is exact on the order number or the tracking number (trimmed, capitals ignored), never on wording.
These are plain functions: the applier passes the records in and writes what they return.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from engine.records import DELIVERY_STATUSES, Delivery


def _key(value: str | None) -> str | None:
    """A number as compared: trimmed, capitals ignored; None for nothing."""
    text = (value or "").strip().casefold()
    return text or None


def _rank(status: str) -> int:
    return DELIVERY_STATUSES.index(status)


def match(entries: list[Any], order: str | None, tracking: str | None) -> Any | None:
    """The entry for the delivery with this order number or tracking number, among `entries` (records of the calendar):
    one that has a delivery and isn't called off, with the same tracking number, else the same order number. An order
    number match counts only when at least one side has no tracking number: two different tracking numbers are two
    parcels, even in one order. None when neither number is given or none matches."""
    wanted_order, wanted_tracking = _key(order), _key(tracking)
    if wanted_order is None and wanted_tracking is None:
        return None
    live = [e for e in entries if e.data.get("delivery") and not e.data.get("cancelled")]
    if wanted_tracking is not None:
        for entry in live:
            if _key(entry.data["delivery"].get("tracking")) == wanted_tracking:
                return entry
    if wanted_order is not None:
        for entry in live:
            kept = _key(entry.data["delivery"].get("tracking"))
            if _key(entry.data["delivery"].get("order")) == wanted_order and (kept is None or wanted_tracking is None):
                return entry
    return None


def new_entry(op: Any, received: date) -> dict[str, Any]:
    """The start, end and delivery a new delivery entry holds. With no date given it sits on the day the mail came,
    marked as not dated; a mail that says it arrived is dated by that day."""
    given = op.start is not None
    arrived = op.delivery.status == "arrived"
    delivery = Delivery(**op.delivery.model_dump(), dated=given or arrived)
    return {
        "start": op.start if given else received.isoformat(),
        "end": op.end if given else None,
        "delivery": delivery.model_dump(),
    }


def merged(entry: Any, op: Any, received: date) -> dict[str, Any]:
    """The fields of `entry` that the mail changes, and none that stay as they are:

    - the order, tracking number and carrier the mail gives replace the ones kept; those it leaves out stay;
    - the status only moves forward, and a mail that is behind the entry's status (an older mail read late) leaves the
      dates alone as well;
    - a start the mail gives replaces the start and the end together (no end then means one day), and the entry is
      dated; an arrival with no date puts an undated entry on the day the mail came."""
    kept = Delivery.model_validate(entry.data["delivery"])
    new = op.delivery
    delivery = kept.model_copy()
    for field in ("order", "tracking", "carrier"):
        if getattr(new, field) is not None:
            setattr(delivery, field, getattr(new, field))
    ahead = _rank(new.status) >= _rank(kept.status)
    if ahead:
        delivery.status = new.status
    changes: dict[str, Any] = {}
    if ahead and op.start is not None:
        changes |= {"start": op.start, "end": op.end}
        delivery.dated = True
    elif ahead and new.status == "arrived" and not kept.dated:
        changes |= {"start": received.isoformat(), "end": None}
        delivery.dated = True
    if delivery != kept:
        changes["delivery"] = delivery.model_dump()
    return {k: v for k, v in changes.items() if v != entry.data.get(k)}
