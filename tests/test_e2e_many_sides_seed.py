"""`tests.e2e_server --many-sides` seeds four or more sides, three of them with long business names, through the setup
route as setup adds them. The names are made up and come from here, never from a real business."""

from __future__ import annotations

from starlette.testclient import TestClient

from api.app import create_app
from engine import sides
from engine.workspace import init_workspace
from tests import e2e_many_sides
from tests.e2e_just_me import the_person

TOKEN = "t"


def test_the_names_are_made_up_distinct_and_long_enough_to_truncate():
    names = e2e_many_sides.business_names()
    assert len(set(names)) == len(names) >= 4
    assert sum(len(n) >= 50 for n in names) >= 3


def test_the_seed_adds_four_or_more_sides_beside_personal(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={})
    app = create_app(ws, cfg, TOKEN, start_worker=False)
    try:
        client = TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"})
        seeded = e2e_many_sides.seed_many_sides(client)
        view = app.state.store.read()
        listed = {s.name if hasattr(s, "name") else s["name"] for s in sides.side_list(view, cfg)}
        assert set(seeded["names"]) <= listed
        assert len(sides.side_list(view, cfg)) >= 4
    finally:
        app.state.store.close()
