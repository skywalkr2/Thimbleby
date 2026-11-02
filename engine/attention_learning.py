"""What the person's dismissals show about the attention budget (design 6.32, 6.22), by rules and never by AI.

Each "Not now" and each "Leave it" on a suggestion line is a signal that names the kind of suggestion. When the same
kind is put off `steward.attention.quiet_after_dismissals` times within `steward.attention.learn_days` days (or
`stop_after_dismissals`, when that is set), nothing changes by itself: Today asks one question about the kind, with the
person's own taps as its reason, "Quiet them into the morning brief?" ("Stop offering them?"). Only the person's yes
changes what shows: it is kept in `steward.attention.quieted_kinds` (the brief) or `stopped_kinds` (not offered),
settings the person can read and edit, and "Keep showing" snoozes the question for `keep_showing_days`. A dismissal that
was taken back, and a snooze, count for nothing, so Undo teaches nothing. The counts are read from the signals every
time, so taking dismissals back removes the question at once, and a window that has passed forgets old dismissals. A
workspace from before the question keeps what the counts had quieted for it, once, as the person's earlier choice
(`keep_earlier_choices`)."""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from engine import patterns
from engine.config.yaml_edit import has_key, set_key
from engine.yaml_load import load_yaml

QUIET = "quiet"
STOPPED = "stopped"
TAKEN_BACK = "taken back"
#: What the question's own signals name as their kind, so they are never counted as a kind of suggestion put off.
ASKED = "attention"


def line_key(kind: str) -> str:
    """The key of the Today line asking about a kind of suggestion; its "Keep showing" snoozes this key."""
    return f"{ASKED}:{kind}"


@dataclass(frozen=True)
class Proposal:
    """A question to put to the person: `state` is `quiet` or `stopped`, `count` how many times the kind was put off."""

    kind: str
    state: str
    count: int


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
    if not isinstance(said, dict) or said.get("until") or said.get("kind") in (None, "snooze", "clash", "tie", ASKED):
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


def _taught(counted: Counter[str], cfg: Any) -> dict[str, str]:
    rules = cfg.steward.attention
    found: dict[str, str] = {}
    for kind, count in counted.items():
        if rules.stop_after_dismissals and count >= rules.stop_after_dismissals:
            found[kind] = STOPPED
        elif rules.quiet_after_dismissals and count >= rules.quiet_after_dismissals:
            found[kind] = QUIET
    return found


def verdicts(cfg: Any) -> dict[str, str]:
    """The kinds of suggestion the person chose to quiet (`quiet`: kept for the morning brief) or stop (`stopped`: not
    offered), as their settings hold them. The counts of dismissals never decide this."""
    rules = cfg.steward.attention
    return {
        **{kind: QUIET for kind in rules.quieted_kinds},
        **{kind: STOPPED for kind in rules.stopped_kinds},
    }


def proposals(view: Any, cfg: Any, now: datetime, known: tuple[str, ...], snoozed: dict[str, Any]) -> list[Proposal]:
    """The kinds the person's dismissals reach a threshold for that they haven't chosen yet, in the order of `known`,
    except those whose question they put off with Keep showing (`snoozed`: line key to the day it comes back)."""
    rules = cfg.steward.attention
    if not rules.quiet_after_dismissals and not rules.stop_after_dismissals:
        return []
    chosen = verdicts(cfg)
    counted = counts(view, cfg, now)
    reached = _taught(counted, cfg)
    found: list[Proposal] = []
    for kind in known:
        state = reached.get(kind)
        if state is None or chosen.get(kind) == STOPPED or (state == QUIET and kind in chosen):
            continue
        if line_key(kind) in snoozed:
            continue
        found.append(Proposal(kind, state, counted[kind]))
    return found


def choose(ws: Any, cfg: Any, store: Any, kind: str, state: str | None) -> None:
    """Keep the person's answer in their settings: `quiet`, `stopped`, or None to show the kind again."""
    from engine import settings as config_screens

    rules = cfg.steward.attention
    quiet = [k for k in rules.quieted_kinds if k != kind]
    stop = [k for k in rules.stopped_kinds if k != kind]
    if state == QUIET:
        quiet.append(kind)
    elif state == STOPPED:
        stop.append(kind)
    config_screens.save(
        ws,
        cfg,
        store,
        changes={"steward.attention.quieted_kinds": quiet, "steward.attention.stopped_kinds": stop},
        reset=[],
        read_fingerprint=config_screens.fingerprint(ws.config_dir),
        allow=("steward.attention.quieted_kinds", "steward.attention.stopped_kinds"),
    )


def keep_earlier_choices(ws: Any, view: Any, cfg: Any, now: datetime) -> None:
    """Once, for a workspace from before the question: the kinds the counts had already quieted or stopped for the
    person stay so, kept as their own choice in their settings. The settings key itself is the mark that this was done,
    so later dismissals only ever raise the question."""
    path: Path = ws.config_dir / "steward.yaml"
    text = path.read_text(encoding="utf-8") if path.exists() else "version: 1\n"
    if has_key(load_yaml(text) or {}, ["attention", "quieted_kinds"]):
        return
    taught = _taught(counts(view, cfg, now), cfg)
    quiet = sorted({*cfg.steward.attention.quieted_kinds, *(k for k, v in taught.items() if v == QUIET)})
    stop = sorted({*cfg.steward.attention.stopped_kinds, *(k for k, v in taught.items() if v == STOPPED)})
    quiet = [k for k in quiet if k not in stop]
    text = set_key(text, ["attention", "quieted_kinds"], quiet)
    text = set_key(text, ["attention", "stopped_kinds"], stop)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    cfg.steward.attention.quieted_kinds = quiet
    cfg.steward.attention.stopped_kinds = stop
