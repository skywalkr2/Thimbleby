"""What waits for the person on each screen that lists it (design 7.1, 7.8): finished work not yet checked, what is
ready to send, what waits on the person, and what was handled since they last opened Handled for you. Each count
names the side of every thing, so a side's tab counts its own things and those on no side. A stopped connection is a
line on Today, never a follow-up. Names and ids come from the fixtures."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from engine import review_batches, waiting
from engine.followups import sections
from engine.names import People
from engine.records import REGISTRY
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.test_handled import SHOP_LIST, code_mail, promo
from tests.test_handled import start as start_handled
from tests.test_review_batches import batch, finish, with_changeset
from tests.test_source_intake import NOW as INTAKE_NOW
from tests.test_source_intake import item, mail, make

_TEST = WriteContext(actor="pm", trust="trusted", op="test.waiting")
NOW = datetime(2026, 10, 14, 14, 0, tzinfo=UTC)
PEOPLE = fixture_records(DEMO_B, "person")
ME = next(p for p in PEOPLE if p["id"] == "PER-1")
OTHER = next(p for p in PEOPLE if p["id"] != ME["id"])


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def counted(env, screen: str) -> int:
    ws, cfg, store = env
    return len(getattr(waiting.count(ws, store, cfg, NOW.date(), NOW), screen))


def test_a_question_about_a_stopped_connection_is_never_a_follow_up(env):
    ws, cfg, store = env
    asked = ME["id"]
    with store.transaction() as tx:
        stopped = tx.create(
            "question",
            {
                "to": asked,
                "title": "A connection can't be read",
                "kind": "decision",
                "resolves": {"kind": "watch", "source": "gone"},
            },
            _TEST,
        ).id
        plain = tx.create("question", {"to": asked, "title": "Which paper?", "kind": "decision"}, _TEST).id
    ids = {q["id"] for s in sections(store, cfg, NOW.date()) for q in s.questions}
    assert plain in ids and stopped not in ids


def test_what_is_ready_to_send_counts_with_its_side(env):
    ws, cfg, store = env
    start = counted(env, "followups")
    with store.transaction() as tx:
        tx.create("question", {"to": OTHER["id"], "title": "Which paper?", "kind": "question"}, _TEST)
    assert counted(env, "followups") == start + 1
    # A question to the person themselves is a decision for them, not something to send.
    with store.transaction() as tx:
        tx.create("question", {"to": ME["id"], "title": "Which date?", "kind": "decision"}, _TEST)
    assert counted(env, "followups") == start + 1


def test_what_waits_on_the_person_counts_their_to_dos_and_questions_not_other_peoples(env):
    ws, cfg, store = env
    start = counted(env, "open")
    with store.transaction() as tx:
        tx.create("action", {"text": "Mine to do", "owners": [{"person": ME["id"]}]}, _TEST)
        tx.create("action", {"text": "Theirs to do", "owners": [{"person": OTHER["id"]}]}, _TEST)
        tx.create("question", {"to": ME["id"], "title": "Which date?", "kind": "decision"}, _TEST)
        tx.create("question", {"to": OTHER["id"], "title": "Which paper?", "kind": "question"}, _TEST)
    assert counted(env, "open") == start + 2


def test_finished_work_counts_until_the_person_checks_it(tmp_path):
    ws, cfg, store = make(tmp_path, [mail("new", 2), mail("mid", 3), mail("old", 4), item("page")])
    try:
        env = (ws, cfg, store)
        first, second, third, *rest = batch(env)
        made = [
            with_changeset(store, first.id, [("action.add", "applied")]),
            with_changeset(store, second.id, [("question.add", "applied")]),
            with_changeset(store, third.id, [("note", "applied")]),
        ]
        finish(store, [first, second, third, *rest])
        found = waiting.count(ws, store, cfg, INTAKE_NOW.date(), INTAKE_NOW)
        assert len(found.changed) == 2, "filed quietly is nothing to check"
        review_batches.confirm(store, made[:1], INTAKE_NOW)
        assert len(waiting.count(ws, store, cfg, INTAKE_NOW.date(), INTAKE_NOW).changed) == 1
    finally:
        store.close()


def test_the_look_is_one_record_for_a_person_and_screen_that_only_moves_forward(env):
    ws, cfg, store = env
    waiting.mark_looked(store, cfg, "handled", NOW)
    waiting.mark_looked(store, cfg, "handled", NOW + timedelta(hours=2))
    waiting.mark_looked(store, cfg, "handled", NOW + timedelta(hours=1))
    (found,) = store.read().list("screen_look")
    assert (found.data["person"], found.data["screen"]) == (People(store, cfg).pm, "handled")
    assert datetime.fromisoformat(str(found.data["at"])) == NOW + timedelta(hours=2)
    assert waiting.looked_at(store.read(), People(store, cfg).pm, "handled") == NOW + timedelta(hours=2)
    assert "screen_look" in REGISTRY
    with pytest.raises(ValueError):
        waiting.mark_looked(store, cfg, "open", NOW)


def test_handled_counts_what_is_new_since_the_person_opened_it_and_the_route_marks_it(tmp_path):
    ws, cfg, store, client, base = start_handled(tmp_path, [code_mail(1), promo("sale-a", SHOP_LIST, 2)])
    try:
        shown = client.get(f"{base}/waiting")
        assert shown.status_code == 200, shown.text
        first = shown.json()
        assert first["handled"] == {"total": 2, "sides": []}
        assert set(first) == {"changed", "followups", "open", "handled"}
        marked = client.post(f"{base}/waiting/looked", json={"screen": "handled"})
        assert marked.status_code == 200, marked.text
        assert client.get(f"{base}/waiting").json()["handled"]["total"] == 0
        assert client.post(f"{base}/waiting/looked", json={"screen": "open"}).status_code == 422
    finally:
        store.close()


def test_a_sides_count_is_its_own_things_and_those_on_no_side():
    from api.waiting_routes import counted

    found = counted(["PRJ-a", "PRJ-a", "PRJ-b", None], ["PRJ-a", "PRJ-b", "PRJ-c"])
    assert found.total == 4
    assert [(s.side, s.count) for s in found.sides] == [("PRJ-a", 3), ("PRJ-b", 2), ("PRJ-c", 1)]
    # With no side beside Personal there is nothing to count by.
    assert counted(["PRJ-a", None], []).sides == []
