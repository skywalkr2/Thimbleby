"""Whether an answer from Ask helped (design 6.20, 6.22): one click on an answer records one `answer_helpful` or
`answer_not_helpful` signal naming the answer, the change and the run that made it. They are a measure counted on
Quality with the other signals, not a correction: neither says what to change, so neither queues learning (the
correction box beside them is how the person says what was wrong).

An answer has at most one standing verdict. Clicking the other one replaces it, clicking the same one again changes
nothing, and Undo takes a verdict back: the signal stays, marked as taken back, and is no longer counted.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from engine.storage import Store, StoreError, WriteContext

HELPFUL = "answer_helpful"
NOT_HELPFUL = "answer_not_helpful"
KINDS = (HELPFUL, NOT_HELPFUL)
TAKEN_BACK = "taken back"


def standing(view: Any, answer_id: str) -> Any | None:
    """The signal that is the verdict now standing on an answer, or None."""
    found = [
        s
        for s in view.list("signal")
        if s.data["kind"] in KINDS and s.data.get("refs") == [answer_id] and s.data.get("note") != TAKEN_BACK
    ]
    return max(found, key=lambda s: str(s.data["at"])) if found else None


def give(store: Store, request_id: str, helpful: bool, now: datetime) -> str:
    """Record that the answer to an ask helped or didn't; returns the id of the signal that stands. An earlier opposite
    verdict is taken back; the same one again is the one already there."""
    from engine.dispatcher import signal

    view = store.read()
    asked = view.get("request", request_id)
    answers = view.find("answer", {"request": request_id}) if asked is not None else []
    if asked is None or asked.data["task"] != "ask" or not answers:
        raise StoreError("there is no answer to give a verdict on")
    answer = answers[-1]
    kind = HELPFUL if helpful else NOT_HELPFUL
    earlier = standing(view, answer.id)
    if earlier is not None:
        if earlier.data["kind"] == kind:
            return earlier.id
        take_back(store, earlier.id)
    return signal(store, kind, [answer.id], now=now, changeset=asked.data.get("changeset"))


def take_back(store: Store, signal_id: str) -> bool:
    """Undo a verdict: it stays on record, marked as taken back, and stops counting. Returns whether there was one."""
    found = store.read().get("signal", signal_id)
    if found is None or found.data["kind"] not in KINDS or found.data.get("note") == TAKEN_BACK:
        return False
    with store.transaction() as tx:
        tx.update(
            "signal",
            signal_id,
            {"note": TAKEN_BACK},
            WriteContext(actor="pm", trust="trusted", op="answer.take_back"),
            read_version=found.version,
        )
    return True
