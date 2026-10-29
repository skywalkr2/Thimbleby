"""The header search (design 7.12): people, projects and open to-dos matching what was typed. Free: no AI call."""

from __future__ import annotations

from fastapi import APIRouter

from api.schemas import SearchHit, SearchResults
from engine.config import Config
from engine.header_search import search
from engine.storage import Store
from engine.today import zone
from engine.worker import Worker


def build_search_router(cfg: Config, store: Store, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    @r.get("/search")
    def find(q: str = "") -> SearchResults:
        """What matches the typed words, up to a few of each kind; nothing for empty words."""
        today = worker.now().astimezone(zone(cfg)).date()
        hits = search(store, cfg, q[:200], today)
        return SearchResults(
            results=[SearchHit(kind=h.kind, id=h.id, title=h.title, detail=h.detail) for h in hits]  # type: ignore[arg-type]
        )

    return r
