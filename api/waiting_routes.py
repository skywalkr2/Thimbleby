"""API routes for what waits on each screen (design 7.1, 7.8): the counts the side menu and each screen's side tabs
show, and marking a screen opened so what is new there is counted from then."""

from __future__ import annotations

from fastapi import APIRouter

from api.schemas import LookedAt, Ok, SideCount, WaitingCount, WaitingCounts
from engine import sides, waiting
from engine.config import Config
from engine.storage import Store
from engine.today import zone
from engine.worker import Events, Worker
from engine.workspace import Workspace


def counted(found: list[str | None], held: list[str]) -> WaitingCount:
    """The total, and for each side its own things plus those on no side (they show under every side)."""
    loose = sum(1 for side in found if side is None)
    return WaitingCount(
        total=len(found),
        sides=[SideCount(side=side, count=loose + sum(1 for s in found if s == side)) for side in held],
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
        return WaitingCounts(
            changed=counted(found.changed, held),
            followups=counted(found.followups, held),
            open=counted(found.open, held),
            handled=counted(found.handled, held),
        )

    @r.post("/waiting/looked")
    def looked(body: LookedAt) -> Ok:
        """The person opened a screen: what came before now stops counting as new there."""
        waiting.mark_looked(store, cfg, body.screen, worker.now())
        events.changed()
        return Ok(ok=body.screen)

    return r
