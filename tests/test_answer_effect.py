"""An answer or a correction to a question must change something: a run that changed nothing goes back to the assistant
once, told so, and a second one stops with a Today line that quotes the person's words (design 6.32, 6.8)."""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from engine import answer_effect
from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.corrections import request_change
from engine.dispatcher import dismiss, process
from engine.intake import note_as_input
from engine.lists import ensure as ensure_lists
from engine.storage import Store, WriteContext
from engine.today_queue import queue
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

_PERSON = WriteContext(actor="pm", trust="trusted", op="test.answer_effect")
NOW = datetime.now(UTC).replace(microsecond=0)
WORDS = "Yes, but only after the other date is fixed"
EMPTY = json.dumps({"summary": "Noted that the date should move.", "ops": []})


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    ensure_lists(store)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def ask(store, cfg, **more) -> str:
    with store.transaction() as tx:
        return tx.create(
            "question", {"to": cfg.workspace.user.person, "title": "Which day suits the handover?", **more}, _PERSON
        ).id


def answer(ws, store, cfg, qid, text=WORDS) -> str:
    """The person answers: the question closes and the words go in as a note about it, as the Answer route does."""
    with store.transaction() as tx:
        cur = tx.get("question", qid)
        tx.update("question", qid, {"status": "answered", "answer": text}, _PERSON, read_version=cur.version)
    return note_as_input(ws, store, cfg, item=("question", qid), text=text, route="answered", now=NOW)


def run(env, request_id, responder, seen=None):
    ws, cfg, store = env

    def respond(task):
        if seen is not None:
            seen.append(task.request)
        return responder

    set_responder(respond)
    return process(ws, store, cfg, Router(cfg, store, env={}), request_id, now=NOW)


def redone(store, request_id):
    return next((r for r in store.read().list("request") if r.data.get("returned_from") == request_id), None)


def lines(env, kind="no_effect"):
    ws, cfg, store = env
    return [line for line in queue(ws, store, cfg, NOW) if line.kind == kind]


def adds_a_question(cfg):
    op = {"op": "question.add", "to": cfg.workspace.user.person, "title": "Which Friday did you mean?"}
    return json.dumps({"summary": "Asked.", "ops": [op]})


def test_a_run_that_applies_an_op_is_not_returned(env):
    ws, cfg, store = env
    request = answer(ws, store, cfg, ask(store, cfg))
    assert run(env, request, adds_a_question(cfg)) is not None
    assert redone(store, request) is None and lines(env) == []
    assert store.read().get("request", request).data["state"] == "review"


def test_a_run_with_no_applied_op_goes_back_once_with_the_line_and_never_to_a_stronger_tier(env):
    ws, cfg, store = env
    qid = ask(store, cfg)
    request = answer(ws, store, cfg, qid)
    seen: list[str] = []
    run(env, request, EMPTY, seen)
    first = store.read().get("request", request).data
    assert first["state"] == "done" and first["superseded_by"]
    back = redone(store, request)
    assert back is not None and first["superseded_by"] == back.id and back.data["state"] == "queued"
    assert back.data["source"] == first["source"] and back.data["about"] == {"kind": "question", "id": qid}
    assert lines(env) == []
    run(env, back.id, adds_a_question(cfg), seen)
    assert "The person's answer to “Which day suits the handover?” changed nothing" in seen[1]
    assert "make the change it asks for" in seen[1] and WORDS in seen[1]
    assert "changed nothing" not in seen[0]
    assert redone(store, back.id) is None and lines(env) == []


def test_a_second_empty_run_makes_the_line_with_the_persons_own_words_and_leave_it_ends_it(env):
    ws, cfg, store = env
    qid = ask(store, cfg)
    request = answer(ws, store, cfg, qid)
    run(env, request, EMPTY)
    back = redone(store, request)
    run(env, back.id, EMPTY)
    assert redone(store, back.id) is None  # never more than once
    stopped = store.read().get("request", back.id).data
    assert stopped["state"] == "needs_you" and stopped["no_effect"] is True
    (line,) = lines(env)
    assert line.text == WORDS and line.subject == "Which day suits the handover?"
    assert line.question == qid and line.request == back.id and line.group == "decide"
    version = store.read().get("request", back.id).version
    dismiss(store, back.id, version)  # "Leave it"
    assert lines(env) == []
    assert lines(env, "refused") == [] and lines(env, "failed") == []


def test_a_correction_to_a_question_behaves_the_same(env):
    ws, cfg, store = env
    qid = ask(store, cfg)
    request, _ = request_change(ws, store, cfg, "question", qid, "Ask it of someone else instead")
    run(env, request, EMPTY)
    back = redone(store, request)
    assert back is not None and back.data["returned_from"] == request
    run(env, back.id, EMPTY)
    (line,) = lines(env)
    assert line.text == "Ask it of someone else instead" and line.question == qid


def test_a_question_that_acts_by_itself_when_answered_is_left_alone(env):
    ws, cfg, store = env
    request = answer(ws, store, cfg, ask(store, cfg, resolves={"kind": "owner", "action": "ACT-0"}))
    assert answer_effect.question_of(store, store.read().get("request", request).data) is None
    run(env, request, EMPTY)
    assert redone(store, request) is None
    plain = answer(ws, store, cfg, ask(store, cfg))
    assert answer_effect.question_of(store, store.read().get("request", plain).data) is not None
