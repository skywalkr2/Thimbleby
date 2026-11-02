"""API routes for what waits on each screen (design 7.1, 7.8): the counts the side menu and each screen's side tabs
show, and marking a screen opened so what is new there is counted from then."""

from __future__ import annotations

from fastapi import APIRouter

from api.schemas import LookedAt, Ok, SideCount, ViewCount, WaitingCount, WaitingCounts
from engine import sides, waiting
from engine.config import Config
from engine.storage import Store
from engine.today import zone
from engine.views import view_records
from engine.worker import Events, Worker
from engine.workspace import Workspace


def counted(
    found: list[waiting.Thing], held: list[str], held_views: list[tuple[str, str]] | None = None
) -> WaitingCount:
    """The total, and for each side its own things plus those on no side (they show under every side). For each view
    (its id and its side): the things in it, those on no project at all in its side, and those on no side."""
    loose = sum(1 for thing in found if thing.side is None)
    return WaitingCount(
        total=len(found),
        sides=[SideCount(side=side, count=loose + sum(1 for t in found if t.side == side)) for side in held],
        views=[
            ViewCount(
                view=view_id,
                count=sum(1 for t in found if t.side is None or view_id in t.views or (t.loose and t.side == side)),
            )
            for view_id, side in held_views or []
        ],
    )


def build_waiting_router(ws: Workspace, cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    @r.get("/waiting")
    def counts() -> WaitingCounts:
        """How many things wait on each screen that lists them: What changed (finished work not yet checked),
        Follow-ups (ready to send), To-dos and questions (waiting on the person) and Handled for you (handled since the
        person last opened it). Each carries a count for every side, which includes what is on no side."""
        now = worker.now()
        found = waiting.count(ws, store, cfg, now.astimezone(zone(cfg)).date(), now)
        held = sides.side_ids(store.read(), cfg) if sides.side_list(store.read(), cfg) else []
        mine = [(v.id, v.data["side"]) for v in view_records(store.read())] if held else []
        return WaitingCounts(
            changed=counted(found.changed, held, mine),
            followups=counted(found.followups, held, mine),
            open=counted(found.open, held, mine),
            handled=counted(found.handled, held, mine),
        )

    @r.post("/waiting/looked")
    def looked(body: LookedAt) -> Ok:
        """The person opened a screen: what came before now stops counting as new there."""
        waiting.mark_looked(store, cfg, body.screen, worker.now())
        events.changed()
        return Ok(ok=body.screen)

    return r
