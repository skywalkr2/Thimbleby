"""The real `cockpit serve`, with one test-only route beside the app, for browser tests that need time to have passed.

    uv run python -m tests.e2e_serve serve -w <workspace> --port 8768 --no-open

Everything is the serve command's own (a restart starts this same program again); the app is the one the command
builds. The route is added around it and exists only here, never in the app:

- `POST /__e2e/age-runs` with `{"account": <account>, "minutes": N}` moves every read the watcher recorded for the
  sources of that account back in time by N minutes, as if they had been made that long ago. A failure becomes a line
  on Today only once it has lasted longer than the source's read interval times `watch.unread_gap_factor`, which a
  browser test cannot wait for. It answers with the number of reads moved.
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any

from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

from engine.storage import WriteContext


def age_runs(store: Any, source_ids: list[str], minutes: float) -> int:
    """Move the start of every read recorded for these sources back by `minutes`; returns how many were moved."""
    moved = 0
    ctx = WriteContext(actor="watcher", trust="trusted", op="e2e.age-runs")
    with store.transaction() as tx:
        for source_id in source_ids:
            for run in tx.find("watch_run", {"source": source_id}):
                started = datetime.fromisoformat(str(run.data["started_at"])) - timedelta(minutes=minutes)
                tx.update("watch_run", run.id, {"started_at": started.isoformat()}, ctx, read_version=run.version)
                moved += 1
    return moved


def with_routes(create_app: Any) -> Any:
    """`create_app`, returning the same app with the test route in front of it (the app's own state is kept)."""

    def create(ws: Any, cfg: Any, token: str, **kwargs: Any) -> Any:
        app = create_app(ws, cfg, token, **kwargs)

        async def age(request: Any) -> JSONResponse:
            data = await request.json()
            account, minutes = data.get("account"), data.get("minutes")
            if not isinstance(account, str) or not isinstance(minutes, int | float) or isinstance(minutes, bool):
                return JSONResponse({"detail": "an account and a number of minutes are required"}, status_code=400)
            ids = [s.id for s in cfg.watch.sources if s.account == account]
            return JSONResponse({"moved": age_runs(app.state.store, ids, minutes), "sources": ids})

        @asynccontextmanager
        async def lifespan(_outer: Any) -> Any:
            async with app.router.lifespan_context(app):
                yield

        outer = Starlette(
            routes=[Route("/__e2e/age-runs", age, methods=["POST"]), Mount("/", app=app)], lifespan=lifespan
        )
        outer.state.worker = app.state.worker
        outer.state.store = app.state.store
        outer.state.events = app.state.events
        return outer

    return create


def main() -> int:
    import api.app
    from engine.cli import main as cockpit

    api.app.create_app = with_routes(api.app.create_app)
    return cockpit(sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())
