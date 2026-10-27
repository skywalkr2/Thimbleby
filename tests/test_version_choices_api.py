# ruff: noqa: F811
"""The routes behind "Same document as", "Not the same document" and "Which copy is the current one?" (design 6.2,
7.20): what a file offers, each choice with its read-back, and Undo for each. Names are fictional."""

from fastapi.testclient import TestClient

from api.app import create_app
from engine.config import load_config
from engine.watch import VERSION_RULE
from tests.test_version_choices import current, digest, questions, read, saved_of, signals, start
from tests.test_versions import folder, save  # noqa: F401
from tests.test_watch import NOW


def client_of(ws, cfg):
    client = TestClient(create_app(ws, cfg, "t", start_worker=False), headers={"Authorization": "Bearer t"})
    return client, cfg.server.base_path.rstrip("/") + "/api"


def test_a_file_offers_the_others_of_its_folder_and_a_link_can_be_undone(folder):
    root, ws, cfg, store = start(folder, "Budget plan.md", "Cost sheet v2.md")
    client, api = client_of(ws, cfg)
    saved = saved_of(store, "Budget plan.md").id
    view = client.get(f"{api}/versions/{saved}").json()
    assert view["applicable"] and view["file"] == "Budget plan.md"
    assert [o["key"] for o in view["others"]] == ["Cost sheet v2.md", "First.md"] and not view["can_split"]
    made = client.post(f"{api}/versions/{saved}/same", json={"other": "Cost sheet v2.md"})
    assert made.status_code == 200 and made.json()["changes"][0]["key"] == "watch.versions.same_document"
    assert current(ws).watch.versions.same_document[0].files == sorted(
        [digest(store, "Budget plan.md"), digest(store, "Cost sheet v2.md")]
    )
    assert client.get(f"{api}/versions/{saved}").json()["can_split"] is True
    undone = client.post(f"{api}/versions/undo", json={"changes": made.json()["changes"]})
    assert undone.status_code == 200 and current(ws).watch.versions.same_document == []


def test_a_saved_copy_that_is_not_a_watched_file_offers_nothing(folder):
    root, ws, cfg, store = start(folder)
    client, api = client_of(ws, cfg)
    with store.transaction() as tx:
        from engine.storage import WriteContext

        note = tx.create(
            "source",
            {
                "received_at": NOW.isoformat(),
                "kind": "note",
                "title": "A note",
                "content_hash": "0" * 64,
                "trust": "trusted",
            },
            WriteContext(actor="pm", trust="trusted", op="test"),
        )
    assert client.get(f"{api}/versions/{note.id}").json() == {
        "applicable": False,
        "file": "",
        "others": [],
        "can_split": False,
        "family": [],
    }
    assert client.post(f"{api}/versions/{note.id}/same", json={"other": "x"}).status_code == 404
    assert client.post(f"{api}/versions/{note.id}/apart", json={}).status_code == 404


def test_not_the_same_document_on_an_older_version_row_hands_it_in_and_undo_closes_it_again(folder):
    root, ws, cfg, store = start(folder, "Agenda 2030-03-01.md", "Agenda 2030-03-08.md")
    save(root, "Agenda 2030-03-01.md", "edited", 10)
    got = read(root, ws, cfg, store, 1)
    row = store.read().get("request", got.changed[0])
    assert row.data["auto_closed"]["rule"] == VERSION_RULE
    client, api = client_of(ws, cfg)
    saved = row.data["source"]
    made = client.post(f"{api}/versions/{saved}/apart", json={"request": row.id, "read_version": row.version})
    assert made.status_code == 200
    after = store.read().get("request", row.id).data
    assert after["state"] == "queued" and after["auto_closed"] is None
    assert signals(store, "pulled_back") and current(ws).watch.versions.not_same == {
        "s": [digest(store, "Agenda 2030-03-01.md")]
    }
    undone = client.post(f"{api}/versions/undo", json={"changes": made.json()["changes"], "request": row.id})
    assert undone.status_code == 200
    assert store.read().get("request", row.id).data["auto_closed"]["rule"] == VERSION_RULE
    assert current(ws).watch.versions.not_same == {}
    stale = client.post(f"{api}/versions/{saved}/apart", json={"request": row.id, "read_version": 1})
    assert stale.status_code == 409 and current(ws).watch.versions.not_same == {}


def test_the_question_offers_the_copies_and_the_answer_can_be_undone(folder):
    root, ws, cfg, store = start(folder, "Plan.md", "Plan DRAFT.md")
    save(root, "Plan.md", "edited", 10)
    read(root, ws, cfg, store, 1)
    (asked,) = questions(store)
    client, api = client_of(ws, cfg)
    mine = [s for s in client.get(f"{api}/followups").json() if s["is_pm"]][0]
    (line,) = [q for q in mine["questions"] if q["id"] == asked.id]
    assert line["about"] == "version" and [o["id"] for o in line["options"]] == ["Plan DRAFT.md", "Plan.md"]
    refused = client.post(f"{api}/versions/answer/{asked.id}", json={"file": "Other.md"})
    assert refused.status_code == 400
    made = client.post(f"{api}/versions/answer/{asked.id}", json={"file": "Plan.md"})
    assert made.status_code == 200 and made.json()["asked"] == asked.id
    assert signals(store, "answered_assistant")
    assert store.read().get("question", asked.id).data["status"] == "answered"
    undone = client.post(f"{api}/versions/undo", json={"changes": made.json()["changes"], "asked": asked.id})
    assert undone.status_code == 200
    assert store.read().get("question", asked.id).data["status"] == "open"
    assert current(ws).watch.versions.current == {}


def test_undo_refuses_a_setting_that_is_not_about_versions(folder):
    root, ws, cfg, store = start(folder)
    client, api = client_of(ws, cfg)
    bad = {"key": "ui.theme", "before": "x", "after": "y", "was_default": False, "is_default": False}
    assert client.post(f"{api}/versions/undo", json={"changes": [bad]}).status_code == 409


def test_a_choice_made_while_the_settings_were_edited_elsewhere_still_saves(folder):
    # the routes read the settings fresh each time, so a hand edit of another key never blocks a choice
    root, ws, cfg, store = start(folder, "Budget plan.md", "Cost sheet v2.md")
    text = (ws.config_dir / "watch.yaml").read_text()
    (ws.config_dir / "watch.yaml").write_text(text + "\nhandled_keep_days: 12\n")
    client, api = client_of(ws, load_config(ws.config_dir, env={}))
    saved = saved_of(store, "Budget plan.md").id
    assert client.post(f"{api}/versions/{saved}/same", json={"other": "Cost sheet v2.md"}).status_code == 200
    assert current(ws).watch.handled_keep_days == 12
