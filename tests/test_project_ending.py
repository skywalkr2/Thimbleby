"""Ending a project winds down what is open on it (design 6.7, project endings).

A status whose meaning is done drops, in the same changeset and op group, every open action and every open or sent
question filed about the project: dropped, never done, nobody credited. From the person it applies at once with Undo;
read from an input, the ending and its drops wait together, and the person keeps an item by declining its drop. A
status that only pauses leaves everything open. Names and ids come from the fixtures.
"""

from __future__ import annotations

import pytest

from engine.applier import decline_held, release
from engine.dispatcher import undo_changeset
from engine.endings import PROJECT_ENDED
from engine.lists import DEFAULTS
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from engine.yaml_load import load_yaml
from tests.conftest import DEMO_B, fixture_records
from tests.test_knowledge_records import apply, source

_TEST = WriteContext(actor="pm", trust="trusted", op="test.project-ending")
PROJECT = next(p for p in fixture_records(DEMO_B, "project") if p.get("status"))
RAW = "Good news: the whole project is complete, the direction is chosen."
QUOTE = "the whole project is complete"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield cfg, store
    store.close()


def statuses(cfg, store):
    """A value of the shipped project status list for each meaning, read from the list, never written out."""
    shipped = load_yaml(DEFAULTS.read_text(encoding="utf-8"))["lists"]["project-status"]
    return {meaning: value for value, meaning in shipped["meanings"].items()}


def open_of(store):
    view = store.read()
    actions = [
        a.id for a in view.list("action") if a.data.get("project") == PROJECT["id"] and a.data["status"] == "open"
    ]
    questions = [
        q.id
        for q in view.list("question")
        if PROJECT["id"] in (q.data.get("projects") or []) and q.data["status"] in ("open", "sent")
    ]
    return actions, questions


def set_status(value, *, quote=None):
    op = {"op": "record.set", "kind": "project", "id": PROJECT["id"], "field": "status", "value": value}
    if quote:
        op["evidence"] = {"quote": quote}
    return op


def ending(cfg, store, which="done"):
    return statuses(cfg, store)[which]


def test_the_person_completing_a_project_drops_everything_open_with_nobody_credited(env):
    cfg, store = env
    actions, questions = open_of(store)
    assert actions and questions
    cs_id, result = apply(store, cfg, [set_status(ending(cfg, store))], actor="pm")
    assert set(result) == {"applied"}
    assert open_of(store) == ([], [])
    view = store.read()
    for a in actions:
        data = view.get("action", a).data
        assert data["status"] == "dropped" and data["dropped_reason"] == PROJECT_ENDED
        assert not data.get("done_by") and not data.get("done_at")
    assert all(view.get("question", q).data["status"] == "dropped" for q in questions)
    groups = {o["group"] for o in view.get("changeset", cs_id).data["ops"]}
    assert len(groups) == 1


def test_one_undo_brings_the_ending_and_every_drop_back(env):
    cfg, store = env
    before = open_of(store)
    cs_id, _ = apply(store, cfg, [set_status(ending(cfg, store))], actor="pm")
    report = undo_changeset(store, cs_id)
    assert not report.skipped if hasattr(report, "skipped") else True
    assert open_of(store) == before
    assert store.read().get("project", PROJECT["id"]).data["status"] == PROJECT["status"]


def test_an_action_told_to_someone_gets_a_called_off_note_drafted_not_sent(env):
    cfg, store = env
    actions, _ = open_of(store)
    other = next(p["id"] for p in fixture_records(DEMO_B, "person") if p["id"] != PROJECT.get("owner"))
    with store.transaction() as tx:
        cur = tx.get("action", actions[0])
        tx.update("action", actions[0], {"told": {other: "2026-10-01"}}, _TEST, read_version=cur.version)
    before = {q.id for q in store.read().list("question")}
    apply(store, cfg, [set_status(ending(cfg, store))], actor="pm")
    new = [q for q in store.read().list("question") if q.id not in before]
    assert any(q.data["kind"] == "action-notice" and q.data["to"] == other and q.data["status"] == "open" for q in new)


def test_a_paused_project_keeps_its_items_open(env):
    cfg, store = env
    before = open_of(store)
    paused = statuses(cfg, store)["blocked"]
    _, result = apply(store, cfg, [set_status(paused)], actor="pm")
    assert set(result) == {"applied"}
    assert open_of(store) == before
    assert store.read().get("project", PROJECT["id"]).data["status"] == paused


def test_an_ending_read_from_an_input_waits_whole_and_nothing_is_dropped(env):
    cfg, store = env
    before = open_of(store)
    cs_id, result = apply(
        store,
        cfg,
        [set_status(ending(cfg, store), quote=QUOTE)],
        origin="input",
        trust="untrusted",
        source_id=source(store),
        raw=RAW,
    )
    assert set(result) == {"held"} and len(result) == 1 + len(before[0]) + len(before[1])
    assert open_of(store) == before
    assert store.read().get("project", PROJECT["id"]).data["status"] == PROJECT["status"]


def test_the_person_keeps_an_item_by_declining_its_drop_and_releases_the_rest(env):
    cfg, store = env
    actions, questions = open_of(store)
    cs_id, _ = apply(
        store,
        cfg,
        [set_status(ending(cfg, store), quote=QUOTE)],
        origin="input",
        trust="untrusted",
        source_id=source(store),
        raw=RAW,
    )
    ops = store.read().get("changeset", cs_id).data["ops"]
    keep = next(o["index"] for o in ops if o["op"]["op"] == "action.drop" and o["op"]["id"] == actions[0])
    decline_held(store, cs_id, keep)
    for o in ops:
        if o["index"] != keep:
            release(store, cfg, cs_id, o["index"])
    view = store.read()
    assert view.get("action", actions[0]).data["status"] == "open"
    assert all(view.get("action", a).data["status"] == "dropped" for a in actions[1:])
    assert all(view.get("question", q).data["status"] == "dropped" for q in questions)
    assert view.get("project", PROJECT["id"]).data["status"] == ending(cfg, store)
