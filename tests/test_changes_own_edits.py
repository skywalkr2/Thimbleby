"""What changed folds the person's own edits of one item on one day into one row (design 7.13, sweep X29): five edits
are one row that holds the five, two days are two rows, and what the assistant changed stays a row each. Names come from
the people made here."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.today import zone
from engine.workspace import init_workspace
from tests.e2e_just_me import the_person
from tests.test_knowledge_records import apply, source

TOKEN = "own-edits-token"
ROLES = ["Designer", "Editor", "Printer", "Proofreader", "Publisher"]


@pytest.fixture
def served(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client, app.state.store, cfg


def _person(client, name: str) -> str:
    made = client.post("/api/people", json={"full_name": name})
    assert made.status_code == 200, made.text
    return made.json()["id"]


def _edit(client, person: str, role: str) -> None:
    assert client.post(f"/api/people/{person}", json={"role": role}).status_code == 200


def _rows(client) -> list[dict]:
    return client.get("/api/changes").json()


def _on(store, day: str) -> None:
    """The store's clock, so the next changes are made on that day (the person's own day, at midday)."""
    store.clock = lambda: f"{day}T12:00:00Z"


def test_five_own_edits_to_one_item_in_a_day_are_one_row_with_five_inside(served):
    client, store, _cfg = served
    _on(store, "2026-11-02")
    who = _person(client, "Dana Lark")
    for role in ROLES:
        _edit(client, who, role)
    rows = _rows(client)
    assert len(rows) == 1
    (row,) = rows
    assert row["edited"] == "Dana Lark"
    assert len(row["edits"]) == 5
    assert len({e["changeset"]["id"] for e in row["edits"]}) == 5, "each edit is its own change, undone on its own"
    assert row["edits"][0]["id"] == row["id"], "the row is the newest edit; the list is newest first"
    assert [e["id"] for e in row["edits"]] == sorted(
        (e["id"] for e in row["edits"]), key=lambda i: -int(i.split("-")[1])
    )
    assert all(e["edits"] == [] for e in row["edits"]), "an edit inside the row folds nothing further"


def test_one_edit_is_a_row_as_before_and_two_items_are_two_rows(served):
    client, store, _cfg = served
    _on(store, "2026-11-02")
    first, second = _person(client, "Dana Lark"), _person(client, "Sam Reed")
    _edit(client, first, ROLES[0])
    _edit(client, second, ROLES[1])
    rows = _rows(client)
    assert len(rows) == 2 and all(r["edits"] == [] and r["edited"] is None for r in rows)
    _edit(client, first, ROLES[2])
    rows = _rows(client)
    assert len(rows) == 2, "the second edit of the first joins its row"
    folded = next(r for r in rows if r["edits"])
    assert folded["edited"] == "Dana Lark" and len(folded["edits"]) == 2


def test_edits_on_two_days_are_two_rows(served):
    client, store, cfg = served
    who = _person(client, "Dana Lark")
    _on(store, "2026-11-02")
    for role in ROLES[:3]:
        _edit(client, who, role)
    _on(store, "2026-11-03")
    for role in ROLES[3:]:
        _edit(client, who, role)
    rows = _rows(client)
    assert [len(r["edits"]) for r in rows] == [2, 3], "newest day first, each with its own edits"
    assert zone(cfg) is not None


def test_what_the_assistant_changed_is_not_folded(served):
    client, store, cfg = served
    _on(store, "2026-11-02")
    who = _person(client, "Dana Lark")
    _edit(client, who, ROLES[0])
    _edit(client, who, ROLES[1])
    sid = source(store)
    for role in ROLES[2:]:
        op = {"op": "record.set", "kind": "person", "id": who, "field": "role", "value": role}
        apply(store, cfg, [op], origin="input", trust="untrusted", source_id=sid, raw="x")
    rows = _rows(client)
    assistant = [r for r in rows if not r["edits"]]
    folded = [r for r in rows if r["edits"]]
    assert len(assistant) == 3, "each of the assistant's changes is a row of its own"
    assert len(folded) == 1 and len(folded[0]["edits"]) == 2, "only the person's own two edits fold"
