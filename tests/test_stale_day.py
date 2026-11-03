"""Moving a to-do's due date takes the old day out of its words when the words end in it, so the title never
contradicts the date (sweep X71). Names and ids come from the fixtures."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.stale_day import without_day
from engine.storage import WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

TOKEN = "stale-day-token"
_TEST = WriteContext(actor="pm", trust="trusted", op="test.stale-day")
PERSON = fixture_records(DEMO_B, "person")[0]["id"]


@pytest.mark.parametrize(
    ("text", "day", "expected"),
    [
        ("Send the headcount by 2026-11-04.", "2026-11-04", "Send the headcount."),
        ("Lend us the trailer on 2026-11-05", "2026-11-05", "Lend us the trailer"),
        ("Send the headcount by 2026-11-04.", "2026-11-09", "Send the headcount by 2026-11-04."),
        ("Contract runs to 2026-12-01 and then renews", "2026-12-01", "Contract runs to 2026-12-01 and then renews"),
        ("Send the headcount", "2026-11-04", "Send the headcount"),
        ("2026-11-04", "2026-11-04", "2026-11-04"),
        ("Send the headcount by 2026-11-04.", None, "Send the headcount by 2026-11-04."),
    ],
)
def test_only_a_trailing_phrase_naming_the_replaced_day_is_taken_out(text, day, expected):
    assert without_day(text, day) == expected


@pytest.fixture
def api(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"server.base_path": "/", "storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(
        app, headers={"Authorization": f"Bearer {TOKEN}"}, base_url=f"http://127.0.0.1:{cfg.server.port}"
    ) as client:
        client.store = app.state.store
        yield client


def make(store, text, due):
    with store.transaction() as tx:
        return tx.create(
            "action",
            {"text": text, "owners": [{"person": PERSON}], "due": due, "status": "open"},
            _TEST,
        ).id


def edit(client, record, fields):
    version = client.store.read().get("action", record).version
    done = client.post(
        "/api/records/edit", json={"kind": "action", "id": record, "fields": fields, "read_version": version}
    )
    assert done.status_code == 200, done.text
    return done.json()["changeset"]


def test_a_new_due_date_takes_the_old_day_out_of_the_words_and_undo_puts_both_back(api):
    record = make(api.store, "Send the headcount by 2026-11-04.", "2026-11-04")
    changeset = edit(api, record, {"due": "2026-11-09"})
    now = api.store.read().get("action", record).data
    assert (now["text"], now["due"]) == ("Send the headcount.", "2026-11-09")
    assert api.post(f"/api/changesets/{changeset}/undo", json={}).status_code == 200
    back = api.store.read().get("action", record).data
    assert (back["text"], str(back["due"])) == ("Send the headcount by 2026-11-04.", "2026-11-04")


def test_words_the_person_sends_with_the_date_are_kept_as_they_sent_them(api):
    record = make(api.store, "Send the headcount by 2026-11-04.", "2026-11-04")
    edit(api, record, {"due": "2026-11-09", "text": "Send the headcount by Monday"})
    assert api.store.read().get("action", record).data["text"] == "Send the headcount by Monday"


def test_a_save_that_leaves_the_date_alone_leaves_the_words_alone(api):
    record = make(api.store, "Send the headcount by 2026-11-04.", "2026-11-04")
    edit(api, record, {"effort_minutes": 30})
    assert api.store.read().get("action", record).data["text"] == "Send the headcount by 2026-11-04."


def test_taking_the_old_day_out_is_not_a_correction_of_the_assistant(api):
    record = make(api.store, "Send the headcount by 2026-11-04.", "2026-11-04")
    edit(api, record, {"due": "2026-11-09"})
    ledger = api.store.read().ledger(kind="action", record_id=record)
    tidy = [row for row in ledger if row["field"] == "text" and row["op"].split("#", 1)[0] == "record.tidy"]
    assert len(tidy) == 1
