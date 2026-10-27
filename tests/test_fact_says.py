"""A fact that is one person's word keeps who said it in the review's rows (design 6.32, "Note titles and facts"; the
designer's answer F44): the row's view carries the speaker's name and the day the fact was true as of, for the screen to
read "Pat says the offsite is on a Friday · Oct 27". A fact stated as settled carries neither. Names come from the
fixtures."""

from __future__ import annotations

import pytest

from api.routes import _op_view
from engine.names import People
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

SAYER = fixture_records(DEMO_B, "person")[1]
_PM = WriteContext(actor="pm", trust="trusted", op="test.says")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield cfg, store
    store.close()


def outcome(op: dict, records=()) -> dict:
    return {"index": 0, "status": "applied", "group": "g", "op": op, "records": list(records)}


def test_a_said_fact_op_names_who_said_it_and_the_day(env):
    cfg, store = env
    op = {
        "op": "fact",
        "text": "The offsite is on a Friday.",
        "basis": "said",
        "said_by": SAYER["full_name"],
        "as_of": "2026-10-27",
        "evidence": {"quote": "the offsite is on a Friday"},
    }
    view = _op_view(outcome(op), store, People(store, cfg), {}, cfg)
    assert (view.meta.said_by, view.meta.as_of) == (SAYER["full_name"], "2026-10-27")


def test_a_made_fact_names_who_said_it_from_its_record_and_a_settled_fact_names_no_one(env):
    cfg, store = env
    with store.transaction() as tx:
        said = tx.create(
            "fact",
            {"text": "The offsite is on a Friday", "basis": "said", "said_by": SAYER["id"], "as_of": "2026-10-27"},
            _PM,
        )
        settled = tx.create("fact", {"text": "The offsite is on a Friday", "basis": "inferred"}, _PM)
    people = People(store, cfg)
    for fact, name in ((said, SAYER["full_name"]), (settled, None)):
        op = {"op": "fact", "text": "x", "evidence": {"quote": "the offsite"}}
        shown = _op_view(outcome(op, [{"kind": "fact", "id": fact.id}]), store, people, {}, cfg)
        assert shown.meta.said_by == name
        assert (shown.meta.as_of is not None) == (name is not None)
