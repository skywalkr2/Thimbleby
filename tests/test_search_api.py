"""The header search finds what the person typed among people, projects and to-dos, with no AI call (X27)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

NOW = datetime(2026, 10, 9, 14, 0, tzinfo=UTC)
TOKEN = "search-token"
PEOPLE = fixture_records(DEMO_B, "person")
PROJECTS = fixture_records(DEMO_B, "project")
ACTIONS = [a for a in fixture_records(DEMO_B, "action") if a.get("status", "open") in ("open", "held")]


FILE_NAME = "quarterly-handover-notes.pdf"
LESSON_TEXT = "Always confirm the venue capacity before sending the invitations"
_PM = WriteContext("pm", "trusted", "test")


@pytest.fixture
def api(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"server.base_path": "/", "storage.backups.automatic": False})
    store = Store(ws.db_path)
    with store.transaction() as tx:
        tx.create(
            "file",
            {"name": FILE_NAME, "media_type": "application/pdf", "size": 10, "sha256": "a" * 64, "added_at": NOW},
            _PM,
        )
        tx.create(
            "lesson",
            {
                "text": LESSON_TEXT,
                "origin": "person",
                "learned_at": NOW,
                "status": "active",
                "kept_by": PEOPLE[0]["id"],
                "kept_at": NOW,
            },
            _PM,
        )
    store.close()
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client


def found(client, q):
    r = client.get("/api/search", params={"q": q})
    assert r.status_code == 200
    return r.json()["results"]


def test_a_person_is_found_by_part_of_their_name(api):
    name = PEOPLE[1]["full_name"]
    rows = found(api, name.split()[0].lower())
    assert any(r["kind"] == "person" and r["id"] == PEOPLE[1]["id"] and r["title"] == name for r in rows)


def test_a_project_and_a_todo_are_found_by_their_words(api):
    rows = found(api, PROJECTS[0]["name"][:6])
    assert any(r["kind"] == "project" and r["id"] == PROJECTS[0]["id"] for r in rows)
    word = max(ACTIONS[0]["text"].split(), key=len)
    rows = found(api, word)
    assert any(r["kind"] == "action" and r["id"] == ACTIONS[0]["id"] for r in rows)


def test_nothing_typed_or_nothing_matching_returns_nothing(api):
    assert found(api, "") == []
    assert found(api, "zzqxj-no-such-thing") == []


def test_a_file_is_found_by_its_name(api):
    rows = found(api, "handover notes")
    assert any(r["kind"] == "file" and r["title"] == FILE_NAME for r in rows)


def test_a_kept_piece_of_knowledge_is_found_by_its_words(api):
    rows = found(api, "venue capacity")
    assert any(r["kind"] == "lesson" and r["title"] == LESSON_TEXT for r in rows)
