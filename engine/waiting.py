"""What waits for the person on each screen that lists it, counted for the side menu and each screen's side tabs
(design 7.1, 7.8). Each count is a list of the side every waiting thing is on, so a screen's tab for one side counts the
things on it and the things on no side, the same rule the screens' lists follow.

- What changed: finished work the person has not yet checked.
- Follow-ups: what is ready to send.
- To-dos and questions: what waits on the person themselves: their own to-dos (and any with no owner yet) and the
  questions put to them.
- Handled for you: what was handled since the person last opened that screen.

Counting changes nothing. The one write is `mark_looked`, when the person opens a screen whose count is "new since".
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from typing import Any

from engine import catch_up, handled, open_items, review_batches, sides, source_intake
from engine.followups import sections
from engine.names import People
from engine.storage import Store, WriteContext
from engine.today_queue import request_project
from engine.workspace import Workspace

#: The screens whose count is "new since the person last opened it".
LOOKED_SCREENS = ("handled",)

_LOOK = WriteContext(actor="pm", trust="trusted", op="waiting.look")


@dataclass
class Waiting:
    """For each screen, the side (or none) of each thing waiting on it."""

    changed: list[str | None] = field(default_factory=list)
    followups: list[str | None] = field(default_factory=list)
    open: list[str | None] = field(default_factory=list)
    handled: list[str | None] = field(default_factory=list)


def _moment(stamp: Any) -> datetime | None:
    try:
        at = datetime.fromisoformat(str(stamp))
    except (TypeError, ValueError):
        return None
    return at if at.tzinfo else at.replace(tzinfo=UTC)


def looked_at(view: Any, person: str | None, screen: str) -> datetime | None:
    """When the person last opened a screen, or None if they never have."""
    for record in view.list("screen_look"):
        if record.data.get("person") == person and record.data.get("screen") == screen:
            return _moment(record.data["at"])
    return None


def mark_looked(store: Store, cfg: Any, screen: str, now: datetime) -> None:
    """The person opened a screen: what came before now is no longer new there. The mark only moves forward."""
    if screen not in LOOKED_SCREENS:
        raise ValueError(f"{screen} has no count of what is new")
    person = People(store, cfg).pm
    stamp = (now if now.tzinfo else now.replace(tzinfo=UTC)).astimezone(UTC)
    with store.transaction() as tx:
        current = next(
            (r for r in tx.list("screen_look") if r.data.get("person") == person and r.data.get("screen") == screen),
            None,
        )
        if current is None:
            tx.create("screen_look", {"person": person, "screen": screen, "at": stamp.isoformat()}, _LOOK)
            return
        before = _moment(current.data["at"])
        if before is None or stamp > before:
            tx.update("screen_look", current.id, {"at": stamp.isoformat()}, _LOOK, read_version=current.version)


def _unchecked(view: Any, cfg: Any) -> list[str | None]:
    """The side of each finished change the person has not yet checked, as What changed lists them."""
    found: list[str | None] = []
    for req in view.list("request"):
        d = req.data
        if d.get("set_aside") or d.get("dismissed") or d["state"] not in ("review", "done") or not d.get("changeset"):
            continue
        if catch_up.waits_on_go(d) or source_intake.waits_on_go(d):
            continue
        cs = view.get("changeset", d["changeset"])
        if cs is None or review_batches.review_of(cs.data) != "unchecked":
            continue
        found.append(sides.side_of_project(view, cfg, request_project(view, req, cs.data)))
    return found


def _to_send(store: Store, cfg: Any, today: date) -> list[str | None]:
    """The side of each question and to-do ready to send to someone else, as Follow-ups counts them in To send."""
    found: list[str | None] = []
    for section in sections(store, cfg, today):
        if section.is_pm:
            continue
        found += [q["side"] for q in section.questions if q["status"] == "open"]
        found += [a["side"] for a in section.actions if a["to_send"]]
    return found


def _on_the_person(store: Store, cfg: Any, today: date) -> list[str | None]:
    """The side of each to-do that waits on the person (theirs, or with no owner yet, and not on hold) and of each
    question put to them."""
    view = store.read()
    me = cfg.workspace.user.person
    found: list[str | None] = []
    for a in open_items.open_actions(store, cfg, today, light=True):
        if a.state == "on_hold":
            continue
        if a.state == "no_owner" or (me and any(o.person == me for o in a.owners)):
            found.append(sides.side_of_project(view, cfg, a.project))
    for q in open_items.open_questions(store, cfg, today):
        if q.state == "yours":
            found.append(sides.side_of_project(view, cfg, q.projects[0] if q.projects else None))
    return found


def _new_handled(ws: Workspace, store: Store, cfg: Any, now: datetime, since: datetime | None) -> list[str | None]:
    """The side of each handled item that came after `since` (all of them when the person never looked)."""
    found: list[str | None] = []
    for tab in handled.TABS:
        for row in handled.rows(ws, store, cfg, tab, now):
            at = _moment(row.get("handled_at"))
            if since is None or at is None or at > since:
                found.append(row.get("side"))
    return found


def count(ws: Workspace, store: Store, cfg: Any, today: date, now: datetime) -> Waiting:
    """What waits on each screen."""
    view = store.read()
    person = People(store, cfg).pm
    return Waiting(
        changed=_unchecked(view, cfg),
        followups=_to_send(store, cfg, today),
        open=_on_the_person(store, cfg, today),
        handled=_new_handled(ws, store, cfg, now, looked_at(view, person, "handled")),
    )
