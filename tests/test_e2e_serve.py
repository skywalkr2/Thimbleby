"""The browser tests' serve program: its one test-only route moves a failing account's reads back in time, so a
failure that has lasted longer than the read interval can be shown without waiting for it."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from starlette.applications import Starlette
from starlette.testclient import TestClient

from engine import watch
from engine.config import load_config
from engine.storage import Store
from engine.today_queue import queue
from tests import test_sign_in_accounts as accounts
from tests.e2e_serve import age_runs, with_routes
from tests.test_sign_in_accounts import BOB, sign_in

world = accounts.world


def unread_lines(ws, store, cfg, now):
    return [line for line in queue(ws, store, cfg, now) if line.kind == "source_unread"]


def test_aging_a_failing_accounts_reads_makes_its_failure_one_line_on_today(world):
    ws, c, api = world
    sign_in(c, api, "bob")
    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    now = datetime.now(UTC)
    try:
        ids = [s.id for s in cfg.watch.sources if s.account == BOB]
        assert ids
        for source_id in ids:
            watch._record(
                store, source_id, now - timedelta(minutes=1), 0.0, "failed", error_kind="auth", error="refused"
            )
        assert unread_lines(ws, store, cfg, now) == []
        assert age_runs(store, ids, 6 * 60) == len(ids)
        lines = unread_lines(ws, store, cfg, now)
        assert len(lines) == 1 and lines[0].count == len(ids)
        # Another account's reads are left alone.
        assert age_runs(store, ["nothing"], 60) == 0
    finally:
        store.close()


def test_the_route_asks_for_an_account_and_minutes_and_keeps_the_apps_own_routes(tmp_path):
    class Cfg:
        class watch:  # noqa: N801 - stands in for the settings group
            sources = []

    seen = []
    inner = Starlette()
    inner.state.worker = SimpleNamespace(
        cfg=SimpleNamespace(server=SimpleNamespace(mode="local", public_url=None, port=8000))
    )
    inner.state.store = inner.state.events = object()

    def create_app(ws, cfg, token, **kwargs):
        seen.append((ws, token, kwargs))
        return inner

    client = TestClient(with_routes(create_app)("workspace", Cfg, "t", start_worker=False))
    assert seen == [("workspace", "t", {"start_worker": False})]
    assert client.post("/__e2e/age-runs", json={"account": 3}).status_code == 400
    assert client.get("/anything-else").status_code == 404
