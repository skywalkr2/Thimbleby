"""A fact can be about any record (plugin API 0.3.90): a to-do, a question, a person, an organization or a pack's own
record, not only a project, a calendar entry or a series. The record's page shows its facts, a run working on the
record reads them, and an id that names no record is refused. Ids and words come from the fixtures."""

from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient

from engine.applier import apply_as_person
from engine.knowledge_section import per_input_section
from engine.record_page import page
from engine.storage import Store, StoreError, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B
from tests.roundtrip import round_trip
from tests.test_today_panels_jobs import goals, workspace

_TEST = WriteContext(actor="pm", trust="trusted", op="test.facts-about")
QUOTE = "The board wants the pack in two parts"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def make(store, kind, **data) -> str:
    with store.transaction() as tx:
        return tx.create(kind, data, _TEST).id


def record_fact(store, cfg, about, text=QUOTE, **more):
    op = {"op": "fact", "text": text, "about": about, "evidence": {"quote": text}, **more}
    made = apply_as_person(store, cfg, [op], "Recorded a fact", note=text)
    outcome = store.read().get("changeset", made).data["ops"][0]
    return made, outcome


def page_of(store, cfg, kind, record_id):
    return page(store, kind, record_id, pm=cfg.workspace.user.person, cfg=cfg)


def a_todo(store, cfg):
    return make(store, "action", text="Prepare the board pack", owners=[{"person": cfg.workspace.user.person}])


def test_a_fact_about_a_to_do_is_kept_with_it_and_shown_on_its_page(env):
    _, cfg, store = env
    todo = a_todo(store, cfg)
    _, outcome = record_fact(store, cfg, todo)
    assert outcome["status"] == "applied", outcome
    fact = next(f for f in store.read().list("fact") if f.data["text"] == QUOTE)
    assert fact.data["about"] == todo
    shown = page_of(store, cfg, "action", todo)["facts"]
    assert [f["text"] for f in shown] == [QUOTE] and shown[0]["id"] == fact.id


@pytest.mark.parametrize("kind", ["person", "question", "organization"])
def test_a_fact_about_a_person_a_question_or_an_organization_shows_on_their_page(env, kind):
    _, cfg, store = env
    target = next(iter(store.read().list(kind)), None)
    if target is None:
        data = {"question": {"title": "Which printer?", "text": "Which printer do we use?"}}.get(
            kind, {"name": "Fictional Org"}
        )
        target_id = make(store, kind, **data)
    else:
        target_id = target.id
    _, outcome = record_fact(store, cfg, target_id)
    assert outcome["status"] == "applied", outcome
    assert [f["text"] for f in page_of(store, cfg, kind, target_id)["facts"]] == [QUOTE]


def test_a_fact_about_a_packs_own_record_shows_on_its_page(tmp_path):
    ws, cfg, store = workspace(tmp_path)
    try:
        goals(cfg, store, "Print the launch book")
        goal = store.read().list("p18/goal")[0]
        _, outcome = record_fact(store, cfg, goal.id)
        assert outcome["status"] == "applied", outcome
        shown = page(store, "p18/goal", goal.id, pm=cfg.workspace.user.person, cfg=cfg)["facts"]
        assert [f["text"] for f in shown] == [QUOTE]
    finally:
        store.close()


def test_a_fact_about_an_id_that_names_no_record_is_refused(env):
    _, cfg, store = env
    for named in ("ACT-9999", "nonsense"):
        with pytest.raises(StoreError, match="isn't the id of a record"):
            record_fact(store, cfg, named)
    assert not [f for f in store.read().list("fact") if f.data.get("about")]


def test_a_newer_fact_replaces_an_older_one_on_the_page_and_the_key_fact_comes_first(env):
    _, cfg, store = env
    todo = a_todo(store, cfg)
    old = make(store, "fact", text="Old words", about=todo, as_of="2026-10-01")
    new = make(store, "fact", text="Newer words", about=todo, as_of="2026-10-10", supersedes=old)
    key = make(store, "fact", text="Key words", about=todo, as_of="2026-09-01", key=True)
    make(store, "fact", text="Another to-do's words", about=a_todo(store, cfg))
    shown = page_of(store, cfg, "action", todo)["facts"]
    assert [f["id"] for f in shown] == [key, new]


def test_the_page_route_lists_the_facts(env, tmp_path):
    ws, cfg, store = env
    todo = a_todo(store, cfg)
    make(store, "fact", text=QUOTE, about=todo, as_of="2026-10-10")
    store.close()
    from api.app import create_app

    application = create_app(ws, cfg, "t", ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(application, headers={"Authorization": "Bearer t"}) as client:
        found = client.get(f"/api/record-pages/{todo}", params={"kind": "action"}).json()
        assert found["facts"] == [{"id": found["facts"][0]["id"], "text": QUOTE, "as_of": "2026-10-10", "key": False}]


def test_a_run_working_on_a_record_reads_the_facts_about_it_and_no_others(env):
    _, cfg, store = env
    todo, other = a_todo(store, cfg), a_todo(store, cfg)
    make(store, "fact", text=QUOTE, about=todo)
    make(store, "fact", text="Words about another to-do", about=other)
    view = store.read()
    settings = cfg.dispatch.knowledge
    mine = per_input_section(view, "notes", [], [], "", date(2026, 10, 26), settings, about=[todo])
    assert QUOTE in mine.text and "another to-do" not in mine.text
    plain = per_input_section(view, "notes", [], [], "", date(2026, 10, 26), settings)
    assert QUOTE not in plain.text


def test_a_run_working_on_a_record_has_the_facts_about_it_in_its_knowledge(env):
    from engine import packet
    from engine.names import People
    from engine.tasks import TASKS

    _, cfg, store = env
    todo = a_todo(store, cfg)
    make(store, "fact", text=QUOTE, about=todo)
    learned = packet._learned(
        store, cfg, TASKS["ask"], People(store, cfg), projects=[], source=None, text="", today=date(2026, 10, 26),
        about=(todo,),
    )  # fmt: skip
    assert QUOTE in learned.per_input and todo not in learned.stable


def test_the_fields_the_person_and_the_fact_added_survive_the_export_round_trip(env, tmp_path):
    _, cfg, store = env
    todo = a_todo(store, cfg)
    edit = {
        "op": "record.edit",
        "record": {"kind": "action", "id": todo},
        "fields": {"lead_days": 3},
        "read_version": store.read().get("action", todo).version,
    }
    apply_as_person(store, cfg, [edit], "Set how early to start")
    record_fact(store, cfg, todo)
    report = round_trip(store, cfg, tmp_path / "work")
    assert report["differences"] == []
    exported = (tmp_path / "work" / "export-1" / "action.json").read_text()
    assert '"lead_days": 3' in exported
    assert todo in (tmp_path / "work" / "export-1" / "fact.json").read_text()
