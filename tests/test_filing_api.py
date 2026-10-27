"""The routes behind the grouped question of which side unsure items belong to (design 6.32): what is asked, Move as the
person's own change with Undo, Keep, and the rule a second move proposes. Names come from the fixtures."""

from __future__ import annotations

import pytest

from engine.storage import WriteContext
from tests.test_many_sides import BUSINESS_NAME
from tests.test_sides import _PM, TOKEN  # noqa: F401
from tests.test_sides import anytime as anytime  # noqa: F401

ASSISTANT = WriteContext(actor="assistant", trust="untrusted", op="test.filing")


@pytest.fixture
def app(anytime):  # noqa: F811
    client, ws, store = anytime
    cfg = ws.config(env={})
    side = client.post("/api/setup/business", json={"name": BUSINESS_NAME}).json()["project"]
    personal = cfg.workspace.project.personal
    me = cfg.workspace.user.person
    with store.transaction() as tx:
        ids = [
            tx.create(
                "action", {"text": f"Do thing {n}", "owners": [{"person": me}], "project": personal}, ASSISTANT
            ).id
            for n in range(2)
        ]
    return client, store, side, personal, ids


def refs(ids, store):
    return [{"kind": "action", "id": i, "read_version": store.read().get("action", i).version} for i in ids]


def test_the_questions_name_each_side_and_what_could_be_its_own(app):
    client, store, side, personal, ids = app
    found = client.get("/api/filing/questions").json()["questions"]
    assert [(q["side"], q["name"]) for q in found] == [(side, BUSINESS_NAME)]
    assert sorted(i["id"] for i in found[0]["items"]) == sorted(ids)
    assert all(i["kind"] == "action" and i["text"] for i in found[0]["items"])


def test_move_changes_the_project_with_undo_and_the_question_goes_for_the_day(app):
    client, store, side, personal, ids = app
    done = client.post("/api/filing/move", json={"side": side, "items": refs(ids[:1], store)})
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["count"] == 1 and body["rule"] is None
    assert store.read().get("action", ids[0]).data["project"] == side
    # answered today: the other item waits until tomorrow
    assert client.get("/api/filing/questions").json()["questions"] == []
    undone = client.post(f"/api/changesets/{body['changeset']}/undo", json={"ops": None})
    assert undone.status_code == 200 and store.read().get("action", ids[0]).data["project"] == personal


def test_keep_leaves_them_under_personal_and_changes_nothing(app):
    client, store, side, personal, ids = app
    done = client.post("/api/filing/keep", json={"side": side, "items": refs(ids, store)})
    assert done.status_code == 200, done.text
    assert all(store.read().get("action", i).data["project"] == personal for i in ids)
    assert client.get("/api/filing/questions").json()["questions"] == []


def test_a_move_of_something_already_moved_or_to_a_place_that_is_no_side_is_refused_in_words(app):
    client, store, side, personal, ids = app
    stale = refs(ids[:1], store)
    assert client.post("/api/filing/move", json={"side": side, "items": stale}).status_code == 200
    again = client.post("/api/filing/move", json={"side": side, "items": stale})
    assert again.status_code == 409 and "meanwhile" in again.json()["detail"]
    nowhere = client.post("/api/filing/move", json={"side": "PRJ-999", "items": refs(ids[1:], store)})
    assert nowhere.status_code == 409
