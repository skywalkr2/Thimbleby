"""A to-do for someone else has one state (design 6.9, 6.33; sweep X06): until the person marks it sent it is to send
and nothing else, so Today has the one line to send it and no follow-up line that says it went out; once it is marked
sent it is waiting on them, and the follow-up line follows the follow-up rule. A promise someone made themselves is
never to send. Marking one never settles another. Names, ids and texts come from the fixtures."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from engine import promises
from engine.followups import mark_followed_up, mark_sent, sections
from engine.storage import Store, WriteContext
from engine.today_queue import queue
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

NOW = datetime(2026, 10, 28, 14, 0, tzinfo=UTC)
TODAY = NOW.date()
_TEST = WriteContext(actor="pm", trust="trusted", op="test.one-state")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"})
    store = Store(ws.db_path, cfg=cfg, clock=lambda: NOW.isoformat(timespec="seconds"))
    yield ws, cfg, store
    store.close()


def me(cfg) -> str:
    return cfg.workspace.user.person


def them(cfg) -> str:
    return next(p["id"] for p in fixture_records(DEMO_B, "person") if p["id"] != me(cfg))


def todo(store, cfg, **more) -> str:
    data = {"text": "Send the revised floor plan", "owners": [{"person": them(cfg)}], **more}
    with store.transaction() as tx:
        return tx.create("action", data, _TEST).id


def mine(env, action: str) -> list:
    """The lines on Today that carry the action, as (kind, key)."""
    ws, cfg, store = env
    return [(x.kind, x.key) for x in queue(ws, store, cfg, NOW) if action in x.actions]


def test_a_dated_to_do_for_someone_else_never_sent_is_to_send_and_not_also_followed_up(env):
    ws, cfg, store = env
    action = todo(store, cfg, due=(TODAY + timedelta(days=3)).isoformat())
    # Nothing has gone out, so nothing is waited on: the one line is the one that sends it.
    assert mine(env, action) == [("send", f"send:{them(cfg)}")]
    assert promises.waiting_on(store, cfg, TODAY) == []
    section = next(s for s in sections(store, cfg, TODAY) if s.person == them(cfg))
    row = next(a for a in section.actions if a["id"] == action)
    assert row["told"] is None and row["chase_due"] is False and section.nudge is None


def test_an_overdue_to_do_never_sent_is_still_only_to_send(env):
    ws, cfg, store = env
    action = todo(store, cfg, due=(TODAY - timedelta(days=4)).isoformat())
    assert mine(env, action) == [("send", f"send:{them(cfg)}")]


def test_marking_it_sent_moves_it_to_waiting_and_the_follow_up_follows_the_rule(env):
    ws, cfg, store = env
    action = todo(store, cfg, due=(TODAY + timedelta(days=3)).isoformat())
    mark_sent(store, cfg, them(cfg), now=NOW)
    # Sent today: the follow-up rule waits `question_after_days` before it chases, so there is no line yet.
    assert mine(env, action) == []
    later = NOW + timedelta(days=cfg.ui.followups.question_after_days)
    assert [x.kind for x in queue(ws, store, cfg, later) if action in x.actions] == ["nudge"]


def test_a_follow_up_never_settles_the_sending_of_another_to_do(env):
    ws, cfg, store = env
    sent = todo(store, cfg, text="Send the signed contract", due=(TODAY + timedelta(days=3)).isoformat())
    mark_sent(store, cfg, them(cfg), now=NOW)
    unsent = todo(store, cfg, text="Book the venue", due=(TODAY + timedelta(days=2)).isoformat())
    later = NOW + timedelta(days=cfg.ui.followups.question_after_days)
    kinds = lambda action: sorted(x.kind for x in queue(ws, store, cfg, later) if action in x.actions)  # noqa: E731
    assert kinds(sent) == ["nudge"] and kinds(unsent) == ["send"]
    mark_followed_up(store, cfg, them(cfg), [], [sent], now=later)
    # The chase went to what was sent; what was never sent is still to send.
    assert kinds(unsent) == ["send"]
    record = store.read().get("action", unsent)
    assert record.data["status"] == "open" and not (record.data.get("told") or {})


def test_a_promise_someone_made_themselves_is_never_to_send_only_waited_on_when_late(env):
    ws, cfg, store = env
    promise = todo(
        store,
        cfg,
        text="Send the budget",
        due=(TODAY - timedelta(days=2)).isoformat(),
        promised_to=[me(cfg)],
        basis="said",
    )
    plain = todo(store, cfg, text="Book the venue", due=(TODAY - timedelta(days=2)).isoformat())
    section = next(s for s in sections(store, cfg, TODAY) if s.person == them(cfg))
    rows = {a["id"]: a for a in section.actions}
    assert rows[promise]["to_send"] is False and rows[plain]["to_send"] is True
    # One state each: the promise is on the follow-up line only, the plain to-do on the send line only.
    assert mine(env, promise) == [("nudge", f"nudge:{them(cfg)}")]
    assert mine(env, plain) == [("send", f"send:{them(cfg)}")]
    # Mark sent tells the plain to-do and leaves the promise alone.
    mark_sent(store, cfg, them(cfg), now=NOW)
    assert (store.read().get("action", plain).data.get("told") or {}).get(them(cfg))
    assert not (store.read().get("action", promise).data.get("told") or {})
