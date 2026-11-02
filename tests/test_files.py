"""Files people add (design 5.3): limits, kinds, storage by content, reading back, and safe downloads."""

import pytest
from fastapi.testclient import TestClient

from engine.files import FileKind, add_file, blob_path, read_bytes
from engine.storage import StoreError
from tests.conftest import fixture_records

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


@pytest.fixture
def env(workspace):
    from engine.storage import Store

    cfg = workspace.config(env={})
    store = Store(workspace.db_path, cfg=cfg)
    yield workspace, cfg, store
    store.close()


def test_a_file_is_stored_once_by_content_and_read_back(env, demo):
    _, cfg, store = env
    project = fixture_records(demo, "project")[0]["id"]
    first = add_file(store, cfg, PNG, name="cover.png", media_type="image/png", project=project)
    second = add_file(store, cfg, PNG, name="cover copy.png", media_type="image/png")
    assert first.data["sha256"] == second.data["sha256"] and first.id != second.id
    assert blob_path(store, first.data["sha256"]).read_bytes() == PNG
    record, data = read_bytes(store, first.id)
    assert data == PNG and record.data["project"] == project and record.data["origin"] == "upload"


def test_limits_types_and_kinds_are_checked(env):
    _, cfg, store = env
    with pytest.raises(StoreError, match="can't be added"):
        add_file(store, cfg, b"<html>", name="page.html", media_type="text/html")
    cfg.storage.files.max_file_mb = 0.00001
    with pytest.raises(StoreError, match="larger than"):
        add_file(store, cfg, PNG, name="big.png", media_type="image/png")
    cfg.storage.files.max_file_mb = 50
    with pytest.raises(StoreError, match="no file kind"):
        add_file(store, cfg, PNG, name="x.png", media_type="image/png", file_kind="nobody/thing")
    with pytest.raises(StoreError, match="no project"):
        add_file(store, cfg, PNG, name="x.png", media_type="image/png", project="PRJ-999")
    with pytest.raises(StoreError, match="surprise"):
        add_file(store, cfg, PNG, name="x.png", media_type="image/png", meta={"surprise": 1})


def test_a_file_sent_with_no_type_or_a_generic_one_takes_the_type_its_name_gives(env):
    _, cfg, store = env
    for sent in ("", "application/octet-stream"):
        record = add_file(store, cfg, b"# Notes\n\nPlain words.", name="notes.md", media_type=sent)
        assert record.data["media_type"] == "text/markdown"
    # A name that says text but bytes that aren't text keep the generic type, which the workspace doesn't accept.
    with pytest.raises(StoreError, match="can't be added"):
        add_file(store, cfg, b"\xff\xfe\x00\x01binary", name="notes.md", media_type="application/octet-stream")
    # A type the browser did send is kept as sent.
    record = add_file(store, cfg, PNG, name="picture.md", media_type="image/png")
    assert record.data["media_type"] == "image/png"


def test_an_unreadable_upload_can_be_kept_as_an_opaque_download(env):
    _, cfg, store = env
    with pytest.raises(StoreError, match="can't be added"):
        add_file(store, cfg, b"\x00binary", name="archive.zip", media_type="application/zip")
    record = add_file(
        store,
        cfg,
        b"\x00binary",
        name="archive.zip",
        media_type="application/octet-stream",
        preserve_generic=True,
    )
    assert record.data["name"] == "archive.zip"
    assert record.data["media_type"] == "application/octet-stream"


def test_changed_bytes_on_disk_are_caught(env):
    _, cfg, store = env
    record = add_file(store, cfg, PNG, name="cover.png", media_type="image/png")
    blob_path(store, record.data["sha256"]).write_bytes(b"tampered")
    with pytest.raises(StoreError, match="don't match"):
        read_bytes(store, record.id)


def test_adding_a_file_publishes_file_added(env):
    _, cfg, store = env
    seen = []
    original = store.plugins.publish
    store.plugins.publish = lambda event, data, **kw: (seen.append((event, data)), original(event, data, **kw))
    record = add_file(store, cfg, PNG, name="cover.png", media_type="image/png")
    assert ("file.added", {"id": record.id, "kind": "attachment"}) in seen


def test_upload_and_download_through_the_api(env):
    from api.app import create_app

    ws, cfg, store = env
    store.close()
    token = "test-token"
    client = TestClient(create_app(ws, cfg, token, start_worker=False))
    client.headers["Authorization"] = f"Bearer {token}"
    api = cfg.server.base_path.rstrip("/") + "/api"
    added = client.post(
        f"{api}/files?name=cover.png&meta=" + '{"description": "Front cover"}',
        content=PNG,
        headers={"Content-Type": "image/png"},
    )
    assert added.status_code == 200, added.text
    file_id = added.json()["id"]
    assert added.json()["meta"] == {"description": "Front cover"}
    shown = client.get(f"{api}/files/{file_id}/content")
    assert shown.content == PNG and shown.headers["content-disposition"].startswith("inline")
    assert shown.headers["x-content-type-options"] == "nosniff"
    text = client.post(f"{api}/files?name=notes.txt", content=b"plain words", headers={"Content-Type": "text/plain"})
    download = client.get(f"{api}/files/{text.json()['id']}/content")
    assert download.headers["content-disposition"].startswith("attachment")
    assert download.headers["content-type"] == "application/octet-stream"
    refused = client.post(f"{api}/files?name=page.html", content=b"<html>", headers={"Content-Type": "text/html"})
    assert refused.status_code == 409
    assert [f["name"] for f in client.get(f"{api}/files").json()] == ["notes.txt", "cover.png"]
    assert any(k["name"] == "attachment" for k in client.get(f"{api}/file-kinds").json())


def test_a_file_says_what_refers_to_it(env):
    from api.app import create_app

    ws, cfg, store = env
    store.close()
    client = TestClient(create_app(ws, cfg, "test-token", start_worker=False))
    client.headers["Authorization"] = "Bearer test-token"
    api = cfg.server.base_path.rstrip("/") + "/api"
    first = client.post(f"{api}/files?name=cover.png", content=PNG, headers={"Content-Type": "image/png"}).json()["id"]
    assert client.get(f"{api}/files/{first}/used-by").json() == {"items": []}
    newer = client.post(
        f"{api}/files?name=cover-2.png&replaces={first}", content=PNG + b"\x01", headers={"Content-Type": "image/png"}
    ).json()["id"]
    used = client.get(f"{api}/files/{first}/used-by").json()["items"]
    assert [(u["kind"], u["id"], u["label"]) for u in used] == [("file", newer, "cover-2.png")]
    assert used[0]["kind_label"]
    assert client.get(f"{api}/files/{newer}/used-by").json() == {"items": []}
    assert client.get(f"{api}/files/FILE-404/used-by").status_code == 404


def test_a_kind_never_widens_the_accepted_types(env):
    _, cfg, store = env
    store.plugins.file_kinds = lambda: {"narrow": FileKind("narrow", accept=("image/svg+xml", "image/png"))}
    with pytest.raises(StoreError, match="can't be added"):
        add_file(store, cfg, b"<svg/>", name="x.svg", media_type="image/svg+xml", file_kind="narrow")
    assert add_file(store, cfg, PNG, name="x.png", media_type="image/png", file_kind="narrow").data["size"] == len(PNG)


@pytest.mark.parametrize(
    "name, fallback",
    [
        ("notes.txt", "notes.txt"),
        ("日本語の名前.txt", ".txt"),
        ("日本語", "file"),
        ('a"b\\c;d\x01e\x7ff.txt', "abcdef.txt"),
        ("café menu.txt", "caf menu.txt"),
    ],
)
def test_download_names_make_a_valid_header_for_any_letters(env, name, fallback):
    from urllib.parse import quote

    from api.app import create_app

    ws, cfg, store = env
    store.close()
    token = "test-token"
    client = TestClient(create_app(ws, cfg, token, start_worker=False))
    client.headers["Authorization"] = f"Bearer {token}"
    api = cfg.server.base_path.rstrip("/") + "/api"
    body = b"plain words"
    added = client.post(f"{api}/files", params={"name": name}, content=body, headers={"Content-Type": "text/plain"})
    assert added.status_code == 200, added.text
    stored = added.json()["name"]
    download = client.get(f"{api}/files/{added.json()['id']}/content")
    assert download.status_code == 200
    assert download.content == body
    header = download.headers["content-disposition"]
    assert header == f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quote(stored, safe='')}"
    header.encode("ascii")


def _client(env):
    from api.app import create_app

    ws, cfg, store = env
    store.close()
    client = TestClient(create_app(ws, cfg, "test-token", start_worker=False))
    client.headers["Authorization"] = "Bearer test-token"
    return client, cfg.server.base_path.rstrip("/") + "/api", ws


def _upload(client, api, name="cover.png", description="Front cover", content=PNG, extra=""):
    made = client.post(
        f"{api}/files?name={name}&meta=" + '{"description": "' + description + '"}' + extra,
        content=content,
        headers={"Content-Type": "image/png"},
    )
    assert made.status_code == 200, made.text
    return made.json()


def test_a_file_shows_its_description(env):
    client, api, _ = _client(env)
    made = _upload(client, api)
    assert made["description"] == "Front cover"
    assert [f["description"] for f in client.get(f"{api}/files").json()] == ["Front cover"]
    assert _upload(client, api, "plain.png", "", PNG + b"\x02")["description"] == ""


def test_a_file_is_renamed_and_its_description_edited_at_once_with_undo(env):
    client, api, ws = _client(env)
    made = _upload(client, api)
    edited = client.post(f"{api}/files/{made['id']}/edit", json={"read_version": made["version"], "name": "front.png"})
    assert edited.status_code == 200 and edited.json()["refused"] is None, edited.text
    now = client.get(f"{api}/files").json()[0]
    assert (now["name"], now["description"]) == ("front.png", "Front cover")
    assert client.post(f"{api}/changesets/{edited.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    assert client.get(f"{api}/files").json()[0]["name"] == "cover.png"
    again = client.get(f"{api}/files").json()[0]
    both = client.post(
        f"{api}/files/{made['id']}/edit",
        json={"read_version": again["version"], "name": "../sneaky/back.png", "description": "  Back cover "},
    )
    assert both.status_code == 200, both.text
    now = client.get(f"{api}/files").json()[0]
    assert (now["name"], now["description"], now["meta"]) == ("back.png", "Back cover", {"description": "Back cover"})
    assert client.post(f"{api}/changesets/{both.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    back = client.get(f"{api}/files").json()[0]
    assert (back["name"], back["description"]) == ("cover.png", "Front cover")
    assert client.get(f"{api}/files/{made['id']}/content").content == PNG


def test_an_edit_that_changes_nothing_or_names_nothing_is_refused_in_words(env):
    client, api, _ = _client(env)
    made = _upload(client, api)
    url, version = f"{api}/files/{made['id']}/edit", made["version"]
    assert client.post(url, json={"read_version": version, "name": "  "}).status_code == 409
    assert "nothing to change" in client.post(url, json={"read_version": version, "name": "cover.png"}).text
    assert client.post(f"{api}/files/FILE-404/edit", json={"read_version": 1, "name": "x"}).status_code == 404
    # A newer version of the file than the one read is a refusal the screen words, not a silent overwrite.
    assert client.post(url, json={"read_version": version, "name": "one.png"}).json()["refused"] is None
    stale = client.post(url, json={"read_version": version, "name": "two.png"})
    assert stale.json() == {"changeset": None, "refused": "changed"}
    assert client.get(f"{api}/files").json()[0]["name"] == "one.png"


def test_a_file_is_removed_at_once_and_undo_brings_it_back_with_its_bytes(env):
    client, api, ws = _client(env)
    made = _upload(client, api)
    gone = client.post(f"{api}/files/{made['id']}/remove", json={"read_version": made["version"]})
    assert gone.status_code == 200 and gone.json()["refused"] is None, gone.text
    assert client.get(f"{api}/files").json() == []
    assert client.get(f"{api}/files/{made['id']}/content").status_code == 404
    # The bytes stay while the record is gone, so Undo has them.
    assert [p for p in (ws.root / "files").rglob("*") if p.is_file()]
    assert client.post(f"{api}/changesets/{gone.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    assert [f["id"] for f in client.get(f"{api}/files").json()] == [made["id"]]
    assert client.get(f"{api}/files/{made['id']}/content").content == PNG


def test_a_file_something_still_refers_to_is_not_removed(env):
    client, api, _ = _client(env)
    first = _upload(client, api)
    newer = _upload(client, api, "cover-2.png", "Second", PNG + b"\x01", f"&replaces={first['id']}")
    refused = client.post(f"{api}/files/{first['id']}/remove", json={"read_version": first["version"]})
    assert refused.json() == {"changeset": None, "refused": "referred_to"}
    assert len(client.get(f"{api}/files").json()) == 2
    stale = client.post(f"{api}/files/{newer['id']}/remove", json={"read_version": newer["version"] + 1})
    assert stale.json() == {"changeset": None, "refused": "changed"}
