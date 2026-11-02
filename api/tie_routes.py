"""Tying a to-do to the calendar entry proposed for it (design 6.32).

The rules only propose (`proposed_event`); these are the person's two answers. Tie it is their own change with Undo (the
to-do's `due_event`, so its date follows the entry); Not this records that the pair isn't the one and changes nothing
else, and `POST /api/suggestions/not-now/{signal}/undo` takes it back."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from api.schemas import NotNowDone, TieDone
from engine import entry_ties
from engine.config import Config
from engine.storage import Store, StoreError
from engine.worker import Events, Worker


def build_tie_router(cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    def guard(fn: Any) -> Any:
        try:
            return fn()
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None

    @r.post("/actions/{action_id}/tie")
    def tie(action_id: str) -> TieDone:
        """Tie the to-do to the calendar entry proposed for it, as the person's own change with Undo: its date is the
        entry's and follows it when the entry moves. Refused when no entry is proposed for it now."""
        if store.read().get("action", action_id) is None:
            raise HTTPException(status_code=404, detail=f"action {action_id} doesn't exist")
        changeset = guard(lambda: entry_ties.tie(store, cfg, action_id))
        events.changed()
        return TieDone(changeset=changeset)

    @r.post("/actions/{action_id}/not-this")
    def not_this(action_id: str) -> NotNowDone:
        """Say the entry proposed for the to-do isn't its one: it is not proposed again. Nothing else changes."""
        if store.read().get("action", action_id) is None:
            raise HTTPException(status_code=404, detail=f"action {action_id} doesn't exist")
        signal = guard(lambda: entry_ties.decline(store, cfg, action_id, worker.now()))
        events.changed()
        return NotNowDone(signal=signal)

    return r
