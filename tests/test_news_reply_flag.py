"""News is a non-answer only when the assistant says it is a reply that didn't answer (design 6.33): a notice or a
status change recorded as news must not restart the chase clock. Names, ids and texts come from the fixtures."""

from __future__ import annotations

from datetime import timedelta

import pytest

from engine import promises
from engine.ops import ActionNewsOp
from engine.storage import Store
from engine.workspace import init_workspace
from tests.conftest import DEMO_B
from tests.test_since_yesterday import _TEST, ADDED_AT, CLOSE_QUOTE, ENV, THEIRS, apply_at


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env=ENV)
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def news_op(**extra) -> dict:
    return {
        "op": "action.news",
        "id": THEIRS["id"],
        "text": "Heard something",
        "evidence": {"quote": CLOSE_QUOTE},
        **extra,
    }


def entries_of(store) -> list[dict]:
    return list(store.read().get("action", THEIRS["id"]).data["news"])


def test_the_news_op_says_what_a_reply_is_and_defaults_to_not_one():
    field = ActionNewsOp.model_fields["reply"]
    assert field.default is False
    assert "doesn't answer" in field.description and "acknowledgement" in field.description


def test_news_that_is_not_a_reply_is_not_a_non_answer(env):
    _, _, store = env
    apply_at(env, [news_op()], ADDED_AT, quote_in=CLOSE_QUOTE)
    (entry,) = entries_of(store)
    assert entry["non_answer"] is False


def test_news_marked_as_a_reply_is_a_non_answer(env):
    _, _, store = env
    apply_at(env, [news_op(reply=True)], ADDED_AT, quote_in=CLOSE_QUOTE)
    (entry,) = entries_of(store)
    assert entry["non_answer"] is True


def overdue(env):
    """The fixture's open action, made a late promise someone else owes the person; returns a way to ask whether the
    line is waiting on a day."""
    _, cfg, store = env
    with store.transaction() as tx:
        action = tx.get("action", THEIRS["id"])
        due = (ADDED_AT.date() - timedelta(days=3)).isoformat()
        changes = {"due": due, "promised_to": [cfg.workspace.user.person], "basis": "said"}
        tx.update("action", action.id, changes, _TEST, read_version=action.version)

    def waiting_on(day):
        return next((x for x in promises.waiting_on(store, cfg, day) if x.action == THEIRS["id"]), None)

    return waiting_on, cfg.ui.followups.action_due_within_days


def test_a_reply_that_didnt_answer_restarts_the_chase_once(env):
    waiting_on, window = overdue(env)
    today = ADDED_AT.date()
    assert waiting_on(today) is not None
    apply_at(env, [news_op(reply=True)], ADDED_AT, quote_in=CLOSE_QUOTE)
    assert waiting_on(today) is None
    assert waiting_on(today + timedelta(days=window)) is not None, "the line comes back after the window"


def test_news_that_is_not_a_reply_does_not_restart_the_chase(env):
    waiting_on, window = overdue(env)
    today = ADDED_AT.date()
    apply_at(env, [news_op()], ADDED_AT, quote_in=CLOSE_QUOTE)
    assert waiting_on(today) is None
    assert waiting_on(today + timedelta(days=window)) is None, "a notice is other news: it ends the wait, no restart"
