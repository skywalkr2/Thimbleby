"""A job's question is asked once, whatever became of it, and the core's own sign-in question is asked again only after
the sign-in has worked and failed again (design 6.32, add-on questions)."""

import json
import time
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from engine.plugin_host import question_subject
from engine.storage import WriteContext
from tests.test_plugin_api_0336 import sign_in, signing  # noqa: F401  (the fixture)
from tests.test_today_panels_jobs import FIXTURE, goals, workspace

_PERSON = WriteContext(actor="pm", trust="trusted", op="test.asked_once")

#: A job whose question names how many goals are open, so it is a different question when that changes.
COUNTING = FIXTURE.replace(
    'context.file_question("Tidy the open goals?")',
    "context.file_question(f\"Tidy {len(context.list('p18/goal', status='open'))} open goals?\")",
)


@pytest.fixture
def env(tmp_path):
    ws, cfg, store = workspace(tmp_path, COUNTING)
    assert store.plugins.active("p18"), store.plugins.status["p18"].reason
    yield ws, cfg, store
    store.close()


def asked(store):
    return [q for q in store.read().list("question") if q.data.get("raised_by")]


def close(store, question, **changes):
    with store.transaction() as tx:
        tx.update("question", question.id, changes, _PERSON, read_version=question.version)


def test_a_job_that_files_the_same_question_on_two_runs_files_one_and_notes_it(env):
    _, cfg, store = env
    goals(cfg, store, "Finish the map")
    assert store.plugins.run_job("p18/tidy", datetime.now(UTC)) == "ok"
    assert store.plugins.run_job("p18/tidy", datetime.now(UTC)) == "ok"
    (found,) = asked(store)
    assert found.data["raised_by"]["plugin"] == "p18"
    first, second = store.read().list("job_run")
    assert first.data["notes"] == [] and second.data["notes"] == ["already asked: Tidy 1 open goals?"]


@pytest.mark.parametrize("how", [{"status": "answered", "answer": "Yes"}, {"status": "dropped"}, {"status": "sent"}])
def test_after_the_person_answers_or_drops_it_the_next_run_files_nothing(env, how):
    _, cfg, store = env
    goals(cfg, store, "Finish the map")
    store.plugins.run_job("p18/tidy")
    close(store, asked(store)[0], **how)
    store.plugins.run_job("p18/tidy")
    assert len(asked(store)) == 1 and store.read().list("job_run")[-1].data["notes"]


def test_a_job_that_files_a_different_question_has_it_filed(env):
    _, cfg, store = env
    goals(cfg, store, "Finish the map")
    store.plugins.run_job("p18/tidy")
    goals(cfg, store, "Call the harbor office")
    store.plugins.run_job("p18/tidy")
    assert [q.data["title"] for q in asked(store)] == ["Tidy 1 open goals?", "Tidy 2 open goals?"]
    assert store.read().list("job_run")[-1].data["notes"] == []


def test_the_key_folds_whitespace_and_case_and_names_the_add_on():
    assert question_subject("p18", "Tidy  the goals?", "A\nB") == question_subject("p18", "tidy the GOALS?", "a b")
    assert question_subject("p18", "Tidy the goals?", "") != question_subject("p19", "Tidy the goals?", "")
    assert question_subject("p18", "Tidy the goals?", "") != question_subject("p18", "Tidy the goals?", "More")


def refuse(ws, cfg, store, c, api):
    """Sign in, let the service refuse the renewal, and read once more: the question the refusal files."""
    from engine.connectors import ConnectorError

    kept = next((ws.root / ".cockpit" / "keys" / "p18").glob("sign-in-service--*.json"))
    kept.write_text(json.dumps({**json.loads(kept.read_text()), "expires_at": time.time() - 1}))
    context = store.plugins.connector_context("p18", ws.root)
    with pytest.raises(ConnectorError):
        context.access_token("p18/service")
    return [q for q in store.read().list("question") if (q.data.get("resolves") or {}).get("kind") == "sign_in"]


def test_the_sign_in_question_is_not_asked_again_after_a_drop_until_it_worked_and_failed_again(signing):  # noqa: F811
    from api.app import create_app

    ws, cfg, store, _ = signing
    c = TestClient(create_app(ws, cfg, "t", start_worker=False), follow_redirects=False)
    c.headers["Authorization"] = "Bearer t"
    api = cfg.server.base_path.rstrip("/") + "/api"
    sign_in(c, api)
    (first,) = refuse(ws, cfg, store, c, api)
    close(store, first, status="dropped")  # the person drops it without signing in
    sign_in_def = store.plugins.sign_ins()["p18/service"]
    store.plugins.tell_sign_in_refused(sign_in_def, first.data["resolves"].get("account"))
    store.plugins.tell_sign_in_refused(sign_in_def, first.data["resolves"].get("account"))
    assert len([q for q in store.read().list("question") if q.data.get("resolves")]) == 1
    sign_in(c, api)  # the sign-in works again ...
    assert store.read().get("question", first.id).data["resolves"]["worked_since"] is True
    both = refuse(ws, cfg, store, c, api)  # ... and fails again: asked again
    assert len(both) == 2 and both[-1].data["status"] == "open"
