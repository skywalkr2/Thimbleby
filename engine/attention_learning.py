"""What the person's dismissals teach the attention budget (design 6.32, 6.22), by rules and never by AI.

Each "Not now" and each "Leave it" on a suggestion line is a signal that names the kind of suggestion. When the same
kind is put off `steward.attention.quiet_after_dismissals` times within `steward.attention.learn_days` days, the
assistant stops interrupting with that kind on Today and keeps it for the morning brief; when it is put off
`steward.attention.stop_after_dismissals` times, that kind is not offered at all (zero leaves either step off). A
dismissal that was taken back, and a snooze, count for nothing, so Undo teaches nothing. The counts are read from the
signals every time, so raising a setting or taking dismissals back changes what shows at once, and a window that has
passed forgets old dismissals."""

from __future__ import annotations

import json
from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Any

from engine import patterns

QUIET = "quiet"
STOPPED = "stopped"
TAKEN_BACK = "taken back"


def _kind_of(signal: Any) -> str | None:
    """The kind of suggestion a dismissal or a "Leave it" choice is about, or None for any other signal, one taken
    back, and a snooze."""
    data = signal.data
    note = data.get("note")
    if data["kind"] not in ("suggestion_dismissed", "suggestion_chosen") or note in (None, TAKEN_BACK):
        return None
    try:
        said = json.loads(note)
    except (ValueError, TypeError):
        return None
    if not isinstance(said, dict) or said.get("until") or said.get("kind") in (None, "snooze", "clash"):
        return None
    if data["kind"] == "suggestion_chosen" and said.get("choice") not in patterns.STAYS_OFF:
        return None
    return str(said["kind"])


def counts(view: Any, cfg: Any, now: datetime) -> Counter[str]:
    """How many times each kind of suggestion was put off within the days looked back."""
    since = now - timedelta(days=cfg.steward.attention.learn_days)
    found: Counter[str] = Counter()
    for signal in view.list("signal"):
        kind = _kind_of(signal)
        if kind is None:
            continue
        try:
            at = datetime.fromisoformat(str(signal.data["at"]))
        except (ValueError, KeyError, TypeError):
            continue
        at = at if at.tzinfo else at.replace(tzinfo=UTC)
        if since < at <= now:
            found[kind] += 1
    return found


def verdicts(view: Any, cfg: Any, now: datetime) -> dict[str, str]:
    """The kinds of suggestion the person's dismissals have taught the assistant to quiet (`quiet`: kept for the
    morning brief) or stop (`stopped`: not offered)."""
    rules = cfg.steward.attention
    if not rules.quiet_after_dismissals and not rules.stop_after_dismissals:
        return {}
    found: dict[str, str] = {}
    for kind, count in counts(view, cfg, now).items():
        if rules.stop_after_dismissals and count >= rules.stop_after_dismissals:
            found[kind] = STOPPED
        elif rules.quiet_after_dismissals and count >= rules.quiet_after_dismissals:
            found[kind] = QUIET
    return found
