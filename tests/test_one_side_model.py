"""One side model for every record and source (design 6.32): what is on a side is decided in `engine/sides.py`, so every
screen's side filter reads the same answer. A line that names no project takes the side of its source (a clash of one
calendar's meetings, a watched calendar's entries), an item filed directly on a side keeps it, a to-do the person types
belongs to their only side, and one person waited on from several sides is one row for each. Names come from the
fixtures."""

from __future__ import annotations

import pytest
import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine import sides
from engine.workspace import init_workspace
from tests.e2e_just_me import the_person
from tests.e2e_sides import (
    BUSINESS_CALENDAR,
    JOB_CALENDAR,
    MEETINGS,
    PROMISES,
    QUESTIONS,
    TODOS,
    calendar_sources,
    seed_sides,
)

TOKEN = "one-side-token"


def _workspace(tmp_path, *, with_calendars: bool):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    if with_calendars:
        path = ws.config_dir / "watch.yaml"
        watch = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        watch["sources"] = calendar_sources()
        path.write_text(yaml.safe_dump(watch, sort_keys=False), encoding="utf-8")
    return ws


@pytest.fixture
def sided(tmp_path):
    """A workspace with Personal, a job and a business, each with a to-do, a question and a promise, a calendar for each
    side and two meetings of the business calendar that clash."""
    ws = _workspace(tmp_path, with_calendars=True)
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        seeded = seed_sides(client, app.state.store, cfg)
        # The sides are a live setting: the running app takes them in as the app's own loop does.
        app.state.worker.apply_live()
        yield client, app.state.store, cfg, seeded


@pytest.fixture
def alone(tmp_path):
    """A workspace made as a person with no work makes it: Personal and nothing beside it."""
    ws = _workspace(tmp_path, with_calendars=False)
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client, app.state.store, cfg


def test_a_clash_between_one_calendars_meetings_is_on_the_side_that_calendar_serves(sided):
    client, _store, _cfg, seeded = sided
    lines = client.get("/api/today/queue").json()
    clash = next(line for line in lines if line["kind"] == "clash")
    assert clash["side"] == seeded["sides"]["business"]["id"]
    # The app's own lines are on no side, so the filter shows them under every choice.
    assert next(line for line in lines if line["kind"] == "backup")["side"] is None


def test_a_clash_between_meetings_of_calendars_serving_different_sides_is_on_no_side(sided):
    client, store, cfg, seeded = sided
    from datetime import UTC, datetime, timedelta

    from engine.storage import WriteContext

    noon = (datetime.now(UTC) + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0)
    ctx = WriteContext(actor="pm", trust="trusted", op="test.clash")
    with store.transaction() as tx:
        for source, key, start in ((BUSINESS_CALENDAR, "a", noon), (JOB_CALENDAR, "b", noon + timedelta(minutes=15))):
            tx.create(
                "snapshot",
                {
                    "source": source,
                    "key": key,
                    "title": f"Both {key}",
                    "content_hash": key,
                    "seen_at": datetime.now(UTC).isoformat(),
                    "event": {"start": start.isoformat(), "end": (start + timedelta(hours=1)).isoformat()},
                },
                ctx,
            )
    lines = client.get("/api/today/queue").json()
    across = next(line for line in lines if line["kind"] == "clash" and line["text"] == "Both a")
    assert across["side"] is None


def test_the_agenda_and_the_week_name_the_side_each_meeting_is_on(sided):
    client, _store, _cfg, seeded = sided
    by_title = {m["title"]: m["side"] for m in client.get("/api/today/agenda").json()}
    assert by_title[MEETINGS["job"][0]] == seeded["sides"]["job"]["id"]
    assert {by_title[t] for t in MEETINGS["business"]} == {seeded["sides"]["business"]["id"]}
    week = client.get("/api/today/week").json()
    assert {m["title"]: m["side"] for m in week["meetings"]} == by_title


def test_each_person_waited_on_from_two_sides_is_a_row_for_each(sided):
    client, store, cfg, seeded = sided
    from engine.storage import WriteContext

    view = store.read()
    me = cfg.workspace.user.person
    # The person who owes the job's promise owes one on the business side too.
    owed = next(a for a in view.list("action") if a.data["text"] == PROMISES["job"])
    who = owed.data["owners"][0]["person"]
    ctx = WriteContext(actor="pm", trust="trusted", op="test.waiting")
    with store.transaction() as tx:
        tx.create(
            "action",
            {
                "text": "Send the invoice",
                "owners": [{"person": me}],
                "promised_to": [who],
                "project": seeded["sides"]["business"]["id"],
            },
            ctx,
        )
    waiting = client.get("/api/today/week").json()["waiting"]
    rows = {(w["person"], w["side"]): w["count"] for w in waiting}
    assert rows[(who, seeded["sides"]["business"]["id"])] == 1


def test_a_question_and_a_to_do_filed_on_a_side_itself_name_that_side(sided):
    client, _store, _cfg, seeded = sided
    items = client.get("/api/open-items").json()
    questions = {q["title"]: q["side"] for q in items["questions"]}
    todos = {a["text"]: a["side"] for a in items["actions"]}
    for side in ("personal", "job", "business"):
        assert questions[QUESTIONS[side]] == seeded["sides"][side]["id"]
        assert todos[TODOS[side]] == seeded["sides"][side]["id"]
    assert todos[TODOS["none"]] is None


def test_a_to_do_typed_with_one_side_belongs_to_it(alone):
    client, store, cfg = alone
    me = cfg.workspace.user.person
    made = client.post("/api/todos", json={"text": "Book the dentist", "owners": [me]})
    assert made.status_code == 200, made.text
    action = store.read().get("action", made.json()["action"])
    assert action.data["project"] == sides.personal_project(store.read(), cfg)
    assert sides.side_of_item(store.read(), cfg, action) == sides.personal_project(store.read(), cfg)


def test_a_to_do_typed_with_several_sides_is_filed_where_it_says(sided):
    client, store, cfg, seeded = sided
    me = cfg.workspace.user.person
    job = seeded["sides"]["job"]["id"]
    made = client.post("/api/todos", json={"text": "Phone the landlord", "owners": [me], "project": job})
    assert made.status_code == 200, made.text
    assert store.read().get("action", made.json()["action"]).data["project"] == job
