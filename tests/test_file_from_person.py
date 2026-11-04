"""A file records the person it came from (design 5.3, 7.14): every way a file comes in can name them, the name is a
person's id that must exist, and the files API shows it."""

import hashlib
from datetime import date
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.applier import _apply_op
from engine.files import add_file, store_blob
from engine.ops import FileAddOp
from engine.storage import Store, StoreError, WriteContext
from tests.conftest import fixture_records

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


@pytest.fixture
def env(workspace, demo):
    cfg = workspace.config(env={})
    store = Store(workspace.db_path, cfg=cfg)
    person = fixture_records(demo, "person")[0]["id"]
    yield workspace, cfg, store, person
    store.close()


def client_for(ws, cfg, store):
    store.close()
    app = create_app(ws, cfg, "token", start_worker=False)
    client = TestClient(app)
    client.headers["Authorization"] = "Bearer token"
    return client, cfg.server.base_path.rstrip("/") + "/api"


def test_a_file_added_with_a_person_records_that_person(env):
    _, cfg, store, person = env
    made = add_file(store, cfg, PNG, name="a.png", media_type="image/png", from_person=person)
    assert store.read().get("file", made.id).data["from_person"] == person
    assert add_file(store, cfg, PNG, name="b.png", media_type="image/png").data["from_person"] is None
    with pytest.raises(StoreError, match="no person"):
        add_file(store, cfg, PNG, name="c.png", media_type="image/png", from_person="PER-9999")


def test_the_file_op_a_person_action_makes_records_the_person(env):
    _, cfg, store, person = env
    digest = store_blob(store, PNG)
    assert digest == hashlib.sha256(PNG).hexdigest()
    op = FileAddOp(
        id="FILE-901", name="p.png", media_type="image/png", size=len(PNG), sha256=digest, from_person=person
    )
    with store.transaction() as tx:
        made, _ = _apply_op(
            tx,
            op,
            SimpleNamespace(store=store, cfg=cfg),
            WriteContext(actor="pm", trust="trusted", op="t"),
            date.today(),
        )
    assert store.read().get("file", made[0]["id"]).data["from_person"] == person


def test_the_upload_route_takes_the_person_and_the_files_list_shows_it(env):
    ws, cfg, store, person = env
    client, api = client_for(ws, cfg, store)
    sent = client.post(
        f"{api}/files?name=a.png&from_person={person}", content=PNG, headers={"Content-Type": "image/png"}
    )
    assert sent.status_code == 200 and sent.json()["from_person"] == person
    assert [f["from_person"] for f in client.get(f"{api}/files").json()] == [person]
    bad = client.post(
        f"{api}/files?name=b.png&from_person=PER-9999", content=PNG, headers={"Content-Type": "image/png"}
    )
    assert bad.status_code == 409


def test_a_hand_in_that_names_a_person_keeps_the_file_from_them(env):
    ws, cfg, store, person = env
    client, api = client_for(ws, cfg, store)
    kept = client.post(
        f"{api}/handin/file?name=blob.bin&person={person}",
        content=b"\x00\x01\x02binary",
        headers={"Content-Type": "application/octet-stream"},
    )
    assert kept.status_code == 200, kept.text
    picture = client.post(
        f"{api}/handin/image?name=p.png&person={person}", content=PNG, headers={"Content-Type": "image/png"}
    )
    assert picture.status_code == 200, picture.text
    voice = client.post(
        f"{api}/handin/audio?name=m.m4a&person={person}", content=b"RIFFdata", headers={"Content-Type": "audio/mp4"}
    )
    assert voice.status_code == 200, voice.text
    files = client.get(f"{api}/files").json()
    assert len(files) == 3 and {f["from_person"] for f in files} == {person}
