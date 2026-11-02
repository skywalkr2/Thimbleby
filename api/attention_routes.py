"""The person's answer to "Quiet them into the morning brief?" (design 6.32).

Counting dismissals only raises the question (`engine.attention_learning`). Quiet them and Stop them keep the person's
yes in their settings, as their own change; Keep showing snoozes the question for `steward.attention.keep_showing_days`,
and `POST /api/suggestions/not-now/{signal}/undo` takes that back. Show again undoes a yes."""

from __future__ import annotations

import os
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, HTTPException

from api.schemas import AttentionChosen, NotNowDone
from engine import attention_learning, suggestions
from engine import settings as config_screens
from engine.config import Config, ConfigError, load_config
from engine.storage import Store, StoreError
from engine.today import zone
from engine.worker import Events, Worker
from engine.workspace import Workspace


def build_attention_router(ws: Workspace, cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    def current() -> Config:
        try:
            return load_config(ws.config_dir, env=dict(os.environ))
        except ConfigError:
            return cfg

    def known(kind: str) -> None:
        if kind not in suggestions.KINDS:
            raise HTTPException(status_code=404, detail=f"{kind} isn't a kind of suggestion")

    def keep(kind: str, state: str | None) -> AttentionChosen:
        known(kind)
        try:
            attention_learning.choose(ws, current(), store, kind, state)
        except (StoreError, config_screens.SettingsError) as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        worker.apply_live()  # the kinds are a live setting: Today and the brief read them at once
        events.changed()
        return AttentionChosen(kind=kind, state=state or "shown")  # type: ignore[arg-type]

    @r.post("/attention/{kind}/quiet")
    def quiet(kind: str) -> AttentionChosen:
        """Keep this kind of suggestion for the morning brief instead of Today: the person's own yes, kept in their
        settings. Undo is POST /api/attention/{kind}/show."""
        return keep(kind, attention_learning.QUIET)

    @r.post("/attention/{kind}/stop")
    def stop(kind: str) -> AttentionChosen:
        """Stop offering this kind of suggestion, on Today and in the brief."""
        return keep(kind, attention_learning.STOPPED)

    @r.post("/attention/{kind}/show")
    def show(kind: str) -> AttentionChosen:
        """Offer this kind of suggestion on Today again (the undo of a yes)."""
        return keep(kind, None)

    @r.post("/attention/{kind}/keep")
    def keep_showing(kind: str) -> NotNowDone:
        """Say to keep showing this kind: the question isn't raised again for `steward.attention.keep_showing_days`.
        Nothing else changes."""
        known(kind)
        rules = current()
        now = worker.now()
        until = now.astimezone(zone(rules)).date() + timedelta(days=rules.steward.attention.keep_showing_days)
        signal: Any = suggestions.snooze(store, rules, attention_learning.line_key(kind), [], until, now)
        events.changed()
        return NotNowDone(signal=signal)

    return r
