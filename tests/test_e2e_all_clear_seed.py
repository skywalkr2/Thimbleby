"""`tests.e2e_server --all-clear` seeds a workspace in which every counted setup step is done and nothing waits on
Today (`tests/e2e_all_clear.py`), made the way the app records each step and never by patching a check."""

from __future__ import annotations

from starlette.testclient import TestClient

from api.app import create_app
from engine import setup
from tests import e2e_all_clear

TOKEN = "t"


def test_the_seed_finishes_every_counted_step_and_leaves_nothing_on_todays_queue(tmp_path):
    ws = e2e_all_clear.make_workspace(tmp_path)
    cfg = ws.config(env={}, flags=e2e_all_clear.flags())
    app = create_app(ws, cfg, TOKEN, start_worker=False)
    try:
        e2e_all_clear.seed_all_clear(ws, cfg, app.state.store)
        client = TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"})
        found = {step.id: step for step in setup.steps(ws, cfg, app.state.store)}
        counted = {name: found[name] for name in setup.COUNTED_STEPS}
        assert all(step.done for step in counted.values()), {n: s.done for n, s in counted.items()}
        assert client.get("/api/today/queue").json() == []
        assert client.get("/api/status").json()["assistant"]["last_run_at"] is not None
        assert [s["read_at"] is not None for s in client.get("/api/watch").json()] == [True, True]
    finally:
        app.state.store.close()
