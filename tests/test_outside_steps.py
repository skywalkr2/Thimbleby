"""Where an outward step came from an email (design 7.7, "The second pass's rules"): a record made from an input that
was not the person's own words is marked as from outside, so a link to open and a payment say so where they are acted
on. The queue's reminder for a dated fact carries the mark, and a question's view says whether its links came from
outside. Ids come from the fixtures."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from engine import today_queue
from engine.origin import from_outside
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

NOW = datetime(2026, 12, 2, 9, 0, tzinfo=UTC)
_TEST = WriteContext(actor="pm", trust="trusted", op="test.outside")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def make(store, record_kind, **data) -> str:
    with store.transaction() as tx:
        return tx.create(record_kind, data, _TEST).id


def source(store, trust) -> str:
    with store.transaction() as tx:
        data = {"received_at": NOW.isoformat(), "kind": "pasted", "title": "A message", "content_hash": "0" * 64}
        return tx.create("source", {**data, "trust": trust}, _TEST).id


def bill(store, source_id=None) -> str:
    return make(
        store,
        "fact",
        text="The invoice is due",
        on="2026-12-15",
        on_kind="bill",
        remind_at=datetime(2026, 12, 1, 9, 0, tzinfo=UTC).isoformat(),
        source=source_id,
    )


def test_a_record_is_from_outside_when_its_input_was_not_the_persons_own_words(env):
    _, _, store = env
    outside, own = source(store, "untrusted"), source(store, "trusted")
    assert from_outside(store.read(), store.read().get("fact", bill(store, outside)))
    assert not from_outside(store.read(), store.read().get("fact", bill(store, own)))
    assert not from_outside(store.read(), store.read().get("fact", bill(store)))


def test_a_bill_reminder_from_outside_carries_the_mark_and_one_from_the_person_does_not(env):
    ws, cfg, store = env
    outside = bill(store, source(store, "untrusted"))
    own = bill(store, source(store, "trusted"))
    lines = {x.fact: x for x in today_queue.queue(ws, store, cfg, NOW) if x.kind == "date_reminder"}
    assert lines[outside].untrusted is True
    assert lines[own].untrusted is False


def test_a_question_whose_input_was_outside_says_so_in_the_followups_route(env, tmp_path):
    from starlette.testclient import TestClient

    from api.app import create_app
    from tests.conftest import fixture_records

    ws, cfg, store = env
    asked = next(q for q in fixture_records(DEMO_B, "question") if q["to"] != "")["to"]
    link = {"label": "The portal", "url": "https" + "://portal.example.com/pay"}
    from_mail = source(store, "untrusted")
    with store.transaction() as tx:
        outside = tx.create("question", {"to": asked, "title": "Pay now?", "links": [link], "source": from_mail}, _TEST)
        own = tx.create("question", {"to": asked, "title": "Pay later?", "links": [link]}, _TEST)
    store.close()
    app = create_app(ws, ws.config(env={}), "t", ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": "Bearer t"}) as client:
        section = next(s for s in client.get("/api/followups").json() if s["person"] == asked)
    marked = {q["id"]: q["from_outside"] for q in section["questions"]}
    assert marked[outside.id] is True and marked[own.id] is False
