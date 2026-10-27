"""The independent reading of a sample of messages (design 6.32, "Measures"; the drafted pass bar, row 3). The person
allows it (`dispatch.knowledge.sample_consent`), the app draws one sample of the messages it read in the quality window,
and the person reads those messages in their own mail, writing down for each how many promises it holds and how many of
those the app didn't have. The counts are theirs: the app never works them out. They join the person's daily counts in
the figure of missed out of present.

- A *message* is a saved input with a `sent_at`: a mail message a source read (a pasted note or a file has none).
- The messages are chosen by the seed alone: each message's rank is the hash of the seed and its id, and the sample is
  the first `dispatch.knowledge.sample_size` of them. The same seed over the same messages gives the same sample, and
  the person never picks.
- One sample is drawn for a window. A second draw while one drawn inside the window exists is refused, so the person
  can't draw again until the messages suit them.
Nothing here calls AI, and the draw reads only what is already stored.
"""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from engine.gate_measures import Window, window
from engine.names import People
from engine.storage import StoreError, WriteContext
from engine.today import zone

#: Where the draw and the person's counts are written: the person's own entry on a screen.
_DRAW = WriteContext(actor="pm", trust="trusted", op="gate.sample")


def _moment(stamp: Any) -> datetime | None:
    if isinstance(stamp, datetime):
        return stamp if stamp.tzinfo else stamp.replace(tzinfo=UTC)
    try:
        moment = datetime.fromisoformat(str(stamp))
    except (TypeError, ValueError):
        return None
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def _span(cfg: Any, now: datetime) -> Window:
    return window(now, cfg.dispatch.knowledge.quality_window_days, zone(cfg))


def messages_in(view: Any, win: Window) -> list[Any]:
    """The messages received in the window, oldest first."""
    found = []
    for source in view.list("source"):
        when = _moment(source.data["received_at"])
        if source.data.get("sent_at") and when is not None and win.start <= when <= win.end:
            found.append((when, source.id, source))
    return [source for _, _, source in sorted(found, key=lambda f: (f[0], f[1]))]


def chosen(view: Any, cfg: Any, win: Window, seed: str) -> list[str]:
    """The ids of the messages the sample holds for a seed, oldest first."""
    ranked = sorted(messages_in(view, win), key=lambda s: hashlib.sha256(f"{seed}:{s.id}".encode()).hexdigest())
    picked = {s.id for s in ranked[: cfg.dispatch.knowledge.sample_size]}
    return [s.id for s in messages_in(view, win) if s.id in picked]


def draw(store: Any, cfg: Any, now: datetime, *, seed: str | None = None) -> Any:
    """Draw the sample for the quality window, as the person's own, and return its record. Refused without the person's
    consent, with no message to draw from, or when a sample was already drawn inside the window."""
    if not cfg.dispatch.knowledge.sample_consent:
        raise StoreError("Allow the independent reading in Settings first: nothing is drawn until you do.")
    win = _span(cfg, now)
    view = store.read()
    for earlier in view.list("gate_sample"):
        drawn = _moment(earlier.data["drawn_at"])
        if drawn is not None and drawn >= win.start:
            raise StoreError(
                f"A sample was already drawn on {drawn.astimezone(zone(cfg)).date().isoformat()}. Read that one: "
                "drawing again would let the messages be chosen to suit."
            )
    seed = seed or secrets.token_hex(8)
    picked = chosen(view, cfg, win, seed)
    if not picked:
        raise StoreError("There are no messages in these days to draw a sample from.")
    with store.transaction() as tx:
        return tx.create(
            "gate_sample",
            {
                "person": People(store, cfg).pm,
                "drawn_at": now.astimezone(UTC).isoformat(),
                "since": win.since.isoformat(),
                "until": win.until.isoformat(),
                "seed": seed,
                "candidates": len(messages_in(tx, win)),
                "size": cfg.dispatch.knowledge.sample_size,
                "items": [{"source": source_id} for source_id in picked],
            },
            _DRAW,
        )


def _item(sample: Any, source_id: str) -> int:
    for i, item in enumerate(sample.data["items"]):
        if item["source"] == source_id:
            return i
    raise StoreError("That message isn't in the sample.")


def _set(
    store: Any, sample_id: str, source_id: str, counts: dict[str, int] | None, now: datetime | None
) -> dict | None:
    """Put the person's counts on one message of a sample (or take them off); returns what it held before."""
    with store.transaction() as tx:
        sample = tx.get("gate_sample", sample_id)
        if sample is None:
            raise StoreError("There is no such sample.")
        items = [dict(i) for i in sample.data["items"]]
        found = items[_item(sample, source_id)]
        before = None if found.get("present") is None else {"present": found["present"], "missed": found["missed"]}
        stamp = (now or datetime.now(UTC)).astimezone(UTC).isoformat()
        found.update(
            {"present": None, "missed": None, "read_at": None} if counts is None else {**counts, "read_at": stamp}
        )
        tx.update("gate_sample", sample_id, {"items": items}, _DRAW, read_version=sample.version)
        return before


def record_reading(
    store: Any, sample_id: str, source_id: str, present: int, missed: int, *, now: datetime | None = None
) -> dict[str, int] | None:
    """Save the person's count for one message, or correct it. Returns what it held before (`present` and `missed`), or
    None when it hadn't been read, which `restore_reading` takes."""
    if present < 0 or missed < 0:
        raise StoreError("A count can't be less than zero.")
    if missed > present:
        raise StoreError("You can't have missed more than you found.")
    return _set(store, sample_id, source_id, {"present": present, "missed": missed}, now)


def restore_reading(store: Any, sample_id: str, source_id: str, previous: dict[str, int] | None) -> None:
    """Undo `record_reading`: the message holds what it held before, or is unread."""
    _set(store, sample_id, source_id, previous, None)


@dataclass(frozen=True)
class SampleItem:
    source: str
    title: str
    received_at: datetime
    present: int | None
    missed: int | None


@dataclass(frozen=True)
class SampleMeasure:
    """The latest sample drawn: how many messages it holds, how many have been read and what was found in those."""

    id: str | None
    drawn_at: datetime | None
    since: Any
    until: Any
    candidates: int
    size: int
    read: int
    present: int
    missed: int
    items: list[SampleItem] = field(default_factory=list)


def measure(view: Any) -> SampleMeasure:
    """The latest sample, read from its record; zero over zero when none was drawn."""
    samples = view.list("gate_sample")
    if not samples:
        return SampleMeasure(None, None, None, None, 0, 0, 0, 0, 0)
    latest = samples[-1]
    items = []
    for item in latest.data["items"]:
        source = view.get("source", item["source"])
        items.append(
            SampleItem(
                item["source"],
                str(source.data["title"]) if source is not None else item["source"],
                _moment(source.data["received_at"]) if source is not None else _moment(latest.data["drawn_at"]),
                item.get("present"),
                item.get("missed"),
            )
        )
    done = [i for i in items if i.present is not None]
    return SampleMeasure(
        latest.id,
        _moment(latest.data["drawn_at"]),
        latest.data["since"],
        latest.data["until"],
        latest.data["candidates"],
        len(items),
        len(done),
        sum(i.present or 0 for i in done),
        sum(i.missed or 0 for i in done),
        items,
    )
