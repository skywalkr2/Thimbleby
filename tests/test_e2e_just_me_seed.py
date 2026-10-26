"""The "Just me" journey's seed (`tests/e2e_just_me.py`) gives a workspace made with no work an area, a person, a
to-do and a question on Personal, and leaves it with no side beside Personal. Names come from the fixtures."""

from __future__ import annotations

from engine import sides
from engine.storage import Store
from engine.workspace import init_workspace
from tests.e2e_just_me import AREA, RELATION, seed_just_me, the_person


def test_the_seed_fills_personal_and_leaves_no_other_side(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={})
    store = Store(ws.db_path)
    try:
        seeded = seed_just_me(store, cfg)
        view = store.read()
        personal = sides.personal_project(view, cfg)
        assert personal == seeded["personal"] and sides.side_list(view, cfg) == []
        assert view.get("project", seeded["area"]["id"]).data["parent"] == personal
        assert view.get("project", seeded["area"]["id"]).data["name"] == AREA
        assert view.get("person", seeded["person"]["id"]).data["relation"] == RELATION
        assert view.get("action", seeded["todo"]["id"]).data["project"] == seeded["area"]["id"]
        assert view.get("question", seeded["question"]["id"]).data["projects"] == [personal]
    finally:
        store.close()
