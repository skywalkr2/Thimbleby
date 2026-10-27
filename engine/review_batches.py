"""The review of the assistant's work, as batches on Today (design 7.7, 6.32).

One input (or one read of a source) is one batch. Only what needs a look is in it: a page draft, a question, a decision
and a new to-do, and what is held for the person's yes or was refused. Facts, sources, notes and the rest are filed
quietly: a batch with nothing to check has no line on Today and reads "Filed" in What changed.

**Confirming** a batch is the person's "All looks good": each of its changesets is marked reviewed, one `confirmed`
signal is recorded for each request (a measure of how often a look found nothing wrong, never a correction), and Undo
reopens them and marks those signals as taken back.

**Folding** keeps batches left unopened from piling up on Today: when two or more have waited the configured number of
days, they are one line, oldest first.

Nothing here calls AI or reaches a service.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from engine.storage import Store, WriteContext

#: What needs a look when the assistant did it: the op's name, the word Today counts it under and the kind of item it is
#: in a batch.
LOOK_AT: dict[str, tuple[str, str]] = {
    "action.add": ("actions_added", "action"),
    "question.add": ("questions", "question"),
    "text.draft": ("drafts", "draft"),
    "report.draft": ("drafts", "draft"),
    "text.propose": ("drafts", "draft"),
}

#: The mark on a `confirmed` signal whose confirmation was undone: it stays on record and counts for nothing.
TAKEN_BACK = "taken back"

_PM = WriteContext(actor="pm", trust="trusted", op="review")


def look_word(outcome: dict[str, Any]) -> str | None:
    """The word an op's outcome is counted under when it needs a look, or None when it is filed quietly. A held op needs
    the person's yes and a refused one says that work didn't happen, so both always count; an answer changed nothing, so
    reading it is enough."""
    op = (outcome.get("op") or {}).get("op", "")
    if op == "answer":
        return None
    status = outcome.get("status")
    if status in ("held", "refused"):
        return status
    if status == "applied" and op in LOOK_AT:
        return LOOK_AT[op][0]
    return None


def item_kind(outcome: dict[str, Any]) -> str:
    """What kind of thing a batch item is: action, question or draft, and held for one waiting for the person's yes."""
    if outcome.get("status") == "held":
        return "held"
    return LOOK_AT.get((outcome.get("op") or {}).get("op", ""), ("", "other"))[1]


def review_of(changeset: dict[str, Any]) -> str | None:
    """How a change reads in What changed once the assistant has finished it: `filed` (nothing in it needed a look),
    `checked` (the person confirmed what did) or `unchecked`. None for a change that isn't standing as done (undone,
    rejected) or that did nothing."""
    if changeset.get("status") not in ("applied", "held", "partly_undone"):
        return None
    ops = changeset.get("ops") or []
    if any(look_word(o) for o in ops):
        return "checked" if changeset.get("reviewed") else "unchecked"
    return "filed" if any(o.get("status") == "applied" for o in ops) else None


@dataclass
class Confirmed:
    """What confirming a batch did, for Undo: the changesets marked reviewed and the signals recorded."""

    changesets: list[str]
    signals: list[str]


def confirm(store: Store, changeset_ids: list[str], now: datetime | None = None) -> Confirmed:
    """The person's "All looks good" for a batch: each changeset not yet reviewed is marked reviewed (its request done)
    and one `confirmed` signal is recorded for its request. A changeset that doesn't exist or is already reviewed is
    left as it is, so pressing it twice does nothing the second time."""
    from engine.dispatcher import looks_good, signal

    now = now or datetime.now(UTC)
    done: list[str] = []
    signals: list[str] = []
    for changeset_id in dict.fromkeys(changeset_ids):
        found = store.read().get("changeset", changeset_id)
        if found is None or found.data.get("reviewed"):
            continue
        looks_good(store, changeset_id)
        signals.append(signal(store, "confirmed", [found.data["request"]], now=now, changeset=changeset_id))
        done.append(changeset_id)
    return Confirmed(done, signals)


def unconfirm(store: Store, changeset_ids: list[str], signal_ids: list[str]) -> int:
    """Undo `confirm`: the changesets are to be looked over again, and the signals stay on record marked as taken back.
    Returns how many changesets were reopened."""
    reopened = 0
    for changeset_id in dict.fromkeys(changeset_ids):
        with store.transaction() as tx:
            cs = tx.get("changeset", changeset_id)
            if cs is None or not cs.data.get("reviewed"):
                continue
            tx.update("changeset", changeset_id, {"reviewed": False}, _PM, read_version=cs.version)
            req = tx.get("request", cs.data["request"])
            if req is not None:
                tx.update("request", req.id, {"state": "review"}, _PM, read_version=req.version)
            reopened += 1
    for signal_id in dict.fromkeys(signal_ids):
        found = store.read().get("signal", signal_id)
        if found is None or found.data["kind"] != "confirmed" or found.data.get("note") == TAKEN_BACK:
            continue
        with store.transaction() as tx:
            tx.update(
                "signal",
                signal_id,
                {"note": TAKEN_BACK},
                WriteContext(actor="pm", trust="trusted", op="review.take_back"),
                read_version=found.version,
            )
    return reopened


def fold(lines: list[Any], now: datetime, after_days: int, make: Any) -> list[Any]:
    """Batches left unopened fold into one line: when at least two `review` or `intake_review` lines have waited
    `after_days` days, they become one line (`batches`, `count` of them, `parts` the lines, oldest first, `at` when the
    oldest came in), put where the oldest was. Zero turns folding off."""
    if after_days <= 0:
        return lines
    old = [
        line
        for line in lines
        if line.kind in ("review", "intake_review") and line.since and _age_days(now, line.since) >= after_days
    ]
    if len(old) < 2:
        return lines
    old.sort(key=lambda line: (line.since, line.key))
    total: dict[str, int] = {}
    for line in old:
        for word, n in line.outcome.items():
            total[word] = total.get(word, 0) + n
    folded = make(
        key="batches",
        group="review",
        kind="batches",
        count=len(old),
        outcome=total,
        parts=old,
        changesets=[c for line in old for c in line.changesets],
        at=old[0].since,
        since=old[0].since,
    )
    out: list[Any] = []
    placed = False
    for line in lines:
        if any(line is each for each in old):
            if not placed:
                out.append(folded)
                placed = True
            continue
        out.append(line)
    return out


def _age_days(now: datetime, stamp: str) -> int:
    at = datetime.fromisoformat(stamp)
    at = at if at.tzinfo else at.replace(tzinfo=UTC)
    return (now - at).days
