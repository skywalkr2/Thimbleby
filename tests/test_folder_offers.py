"""Two one-time offers about folders on Today (design 7.7): a folder made under the product's earlier name is offered a
rename once (never moved without the person's yes; Keep ends the offer for good), and a connected mailbox that reads no
sent folder is offered one (Dismiss ends it for good; it goes once a sent folder is read). Folder names come from the
settings and the fixtures; nothing reaches a network."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine import cli, cloud_folders, folder_names, folder_rename, sent_folders
from engine.config import load_config
from engine.config.schema import BackupSettings
from engine.storage import Store
from engine.today_queue import queue
from engine.workspace import init_workspace
from tests.conftest import DEMO_B


@pytest.fixture
def home(tmp_path, monkeypatch):
    place = tmp_path / "home"
    place.mkdir()
    monkeypatch.setenv("HOME", str(place))
    monkeypatch.setenv("USERPROFILE", str(place))
    return place


def build(tmp_path, *, root: Path | None = None, sources=(), storage=None):
    ws = init_workspace(root or tmp_path / "ws", template=DEMO_B, git=False)
    if sources:
        path = ws.config_dir / "watch.yaml"
        raw = yaml.safe_load(path.read_text())
        raw["sources"] = [*raw.get("sources", []), *sources]
        path.write_text(yaml.safe_dump(raw, sort_keys=False))
    if storage:
        path = ws.config_dir / "storage.yaml"
        raw = yaml.safe_load(path.read_text())
        raw["backups"].update(storage)
        path.write_text(yaml.safe_dump(raw, sort_keys=False))
    cfg = ws.config(env={})
    Store(ws.db_path, cfg=cfg).close()
    client = TestClient(create_app(ws, cfg, "t", start_worker=False))
    client.headers["Authorization"] = "Bearer t"
    return ws, client


def api(client, ws):
    return load_config(ws.config_dir, env={}).server.base_path.rstrip("/") + "/api"


def lines(ws, kind):
    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    try:
        return [x for x in queue(ws, store, cfg, datetime.now(UTC)) if x.kind == kind]
    finally:
        store.close()


def drive_root(ws, home: Path) -> Path:
    """The folder of the first cloud drive the settings look for, made inside the home folder."""
    cfg = load_config(ws.config_dir, env={})
    drive = cfg.storage.backups.cloud_folders[0]
    root = home / getattr(drive, cloud_folders.system_name())[0]
    root.mkdir(parents=True, exist_ok=True)
    return root


def mailbox(source_id, user, folder="INBOX", **more):
    return {
        "id": source_id,
        "connector": "mailbox",
        "label": f"Mail {source_id}",
        "settings": {"host": "mail.example.com", "user": user, "password": "env:UNUSED", "folder": folder},
        **more,
    }


# ---- the new names are the defaults ---------------------------------------------------------------------------------


def test_the_defaults_for_the_folders_the_person_keeps_are_the_new_name_and_the_old_one_is_kept_for_the_offer():
    assert folder_names.DEFAULT_FOLDER == cli.DEFAULT_FOLDER == "Thimbleby"
    assert folder_names.FORMER_FOLDER == "Cockpit"
    backups = BackupSettings()
    assert backups.cloud_path[-1] == "Thimbleby" and backups.former_cloud_path[-1] != backups.cloud_path[-1]
    assert backups.former_cloud_path[:-1] == backups.cloud_path[:-1]


# ---- the backup folder ----------------------------------------------------------------------------------------------


def test_an_old_backup_folder_is_offered_a_rename_once_and_keep_ends_the_offer(tmp_path, home):
    ws, client = build(tmp_path)
    cfg = load_config(ws.config_dir, env={})
    old = drive_root(ws, home).joinpath(*cfg.storage.backups.former_cloud_path)
    old.mkdir(parents=True)
    found = lines(ws, "folder_rename")
    assert [(x.state, x.group, x.subject, x.text) for x in found] == [
        (
            "backups",
            "decide",
            folder_rename.shown(cfg.storage.backups.former_cloud_path),
            folder_rename.shown(cfg.storage.backups.cloud_path),
        )
    ]
    assert old.is_dir()  # an offer moves nothing
    kept = client.post(f"{api(client, ws)}/folder-offers/backups/keep")
    assert kept.status_code == 200, kept.text
    assert lines(ws, "folder_rename") == [] and old.is_dir()
    client.post(f"{api(client, ws)}/folder-offers/backups/keep/undo")
    assert [x.state for x in lines(ws, "folder_rename")] == ["backups"]


def test_renaming_the_backup_folder_moves_it_and_the_backup_target_in_it_follows(tmp_path, home):
    ws, client = build(tmp_path)
    cfg = load_config(ws.config_dir, env={})
    old = drive_root(ws, home).joinpath(*cfg.storage.backups.former_cloud_path)
    old.mkdir(parents=True)
    new = drive_root(ws, home).joinpath(*cfg.storage.backups.cloud_path)
    # Added through the app, as setup does, so the target is the folder's real path.
    fingerprint = client.get(f"{api(client, ws)}/settings").json()["fingerprint"]
    added = client.post(
        f"{api(client, ws)}/setup/backup-folder", json={"path": str(old), "label": "drive", "fingerprint": fingerprint}
    )
    assert added.status_code == 200, added.text
    fingerprint = client.get(f"{api(client, ws)}/settings").json()["fingerprint"]
    done = client.post(f"{api(client, ws)}/folder-offers/backups/rename", json={"fingerprint": fingerprint})
    assert done.status_code == 200, done.text
    assert new.is_dir() and not old.exists()
    paths = [t.path for t in load_config(ws.config_dir, env={}).storage.backups.targets]
    assert str(new.resolve()) in paths and str(old.resolve()) not in paths
    assert lines(ws, "folder_rename") == []


def test_no_offer_when_the_settings_name_the_folder_or_the_new_one_is_there(tmp_path, home):
    ws, _client = build(tmp_path)
    cfg = load_config(ws.config_dir, env={})
    root = drive_root(ws, home)
    root.joinpath(*cfg.storage.backups.former_cloud_path).mkdir(parents=True)
    root.joinpath(*cfg.storage.backups.cloud_path).mkdir(parents=True)
    assert lines(ws, "folder_rename") == []  # both are there: nothing to rename to
    ws2, _ = build(tmp_path / "two", storage={"cloud_path": ["Mine", "Backups"]})
    other = drive_root(ws2, home)
    other.joinpath(*load_config(ws2.config_dir, env={}).storage.backups.former_cloud_path).mkdir(
        parents=True, exist_ok=True
    )
    assert lines(ws2, "folder_rename") == []  # the person named a folder of their own


# ---- the workspace folder -------------------------------------------------------------------------------------------


def test_a_workspace_in_the_old_default_folder_is_offered_a_rename_that_waits_for_the_next_start(tmp_path, home):
    root = home / folder_names.FORMER_FOLDER
    ws, client = build(tmp_path, root=root)
    assert [(x.state, x.subject, x.text) for x in lines(ws, "folder_rename")] == [
        ("workspace", folder_names.FORMER_FOLDER, folder_names.DEFAULT_FOLDER)
    ]
    assert cli.default_workspace(home) == root  # it is opened, never left behind or made over
    said = client.post(f"{api(client, ws)}/folder-offers/workspace/rename", json={"fingerprint": ""})
    assert said.status_code == 200, said.text
    assert root.is_dir() and not (home / folder_names.DEFAULT_FOLDER).exists()  # nothing moves while it is open
    assert lines(ws, "folder_rename") == []  # asked once
    assert folder_rename.apply_agreed(root, home) == home / folder_names.DEFAULT_FOLDER
    assert (home / folder_names.DEFAULT_FOLDER / "config").is_dir() and not root.exists()


def test_a_workspace_the_environment_names_is_never_offered_a_rename(tmp_path, home, monkeypatch):
    """Starting with the environment naming the folder is the person's own choice: the start never renames it, so
    the offer would be a yes that does nothing."""
    root = home / folder_names.FORMER_FOLDER
    ws, _ = build(tmp_path, root=root)
    monkeypatch.setenv("COCKPIT_WORKSPACE", str(root))
    assert lines(ws, "folder_rename") == []


def test_a_workspace_that_is_kept_or_whose_yes_was_taken_back_is_not_renamed(tmp_path, home):
    root = home / folder_names.FORMER_FOLDER
    ws, client = build(tmp_path, root=root)
    client.post(f"{api(client, ws)}/folder-offers/workspace/rename", json={"fingerprint": ""})
    client.post(f"{api(client, ws)}/folder-offers/workspace/rename/undo")
    assert folder_rename.apply_agreed(root, home) == root
    assert [x.state for x in lines(ws, "folder_rename")] == ["workspace"]
    client.post(f"{api(client, ws)}/folder-offers/workspace/keep")
    assert lines(ws, "folder_rename") == [] and folder_rename.apply_agreed(root, home) == root


def test_a_workspace_elsewhere_is_never_offered_and_the_new_default_wins_when_both_exist(tmp_path, home):
    ws, _client = build(tmp_path)
    assert lines(ws, "folder_rename") == []
    (home / folder_names.FORMER_FOLDER / "config").mkdir(parents=True)
    assert cli.default_workspace(home) == home / folder_names.FORMER_FOLDER
    (home / folder_names.DEFAULT_FOLDER).mkdir()
    assert cli.default_workspace(home) == home / folder_names.DEFAULT_FOLDER


# ---- the sent folder ------------------------------------------------------------------------------------------------


def test_a_mailbox_that_reads_no_sent_folder_gets_one_line_and_one_that_does_not_gets_none(tmp_path):
    names = load_config(DEMO_B / "config", env={}).watch.sent_folder_names
    ws, _client = build(
        tmp_path,
        sources=[
            mailbox("alone", "one@example.com"),
            mailbox("both", "two@example.com"),
            mailbox("both-sent", "two@example.com", folder=names[1]),
        ],
    )
    found = lines(ws, "sent_folder")
    assert [(x.source, x.group, x.subject) for x in found] == [("alone", "decide", "Mail alone")]


def test_a_sent_folder_named_by_its_path_or_read_as_the_persons_own_mail_counts(tmp_path):
    names = load_config(DEMO_B / "config", env={}).watch.sent_folder_names
    ws, _client = build(
        tmp_path,
        sources=[
            mailbox("a", "a@example.com"),
            mailbox("a-sent", "a@example.com", folder=f"[Provider]/{names[2]}"),
            mailbox("b", "b@example.com"),
            mailbox("b-own", "b@example.com", folder="Elsewhere", author="someone"),
            mailbox("c", "c@example.com"),
            mailbox("c-off", "c@example.com", folder=names[0], enabled=False),
        ],
    )
    assert [x.source for x in lines(ws, "sent_folder")] == ["c"]  # a disabled sent source reads nothing


def test_dismissing_the_line_ends_it_for_good_and_undo_brings_it_back(tmp_path):
    ws, client = build(tmp_path, sources=[mailbox("alone", "one@example.com")])
    assert [x.source for x in lines(ws, "sent_folder")] == ["alone"]
    done = client.post(f"{api(client, ws)}/watch/alone/sent-folder/dismiss")
    assert done.status_code == 200, done.text
    assert lines(ws, "sent_folder") == [] and sent_folders.dismissed(ws.private_dir) == {"alone"}
    client.post(f"{api(client, ws)}/watch/alone/sent-folder/dismiss/undo")
    assert [x.source for x in lines(ws, "sent_folder")] == ["alone"]
    assert client.post(f"{api(client, ws)}/watch/nothing/sent-folder/dismiss").status_code == 404


def test_the_line_goes_once_the_sent_folder_is_added_as_a_source(tmp_path):
    names = load_config(DEMO_B / "config", env={}).watch.sent_folder_names
    ws, client = build(tmp_path, sources=[mailbox("alone", "one@example.com")])
    assert [x.source for x in lines(ws, "sent_folder")] == ["alone"]
    fingerprint = client.get(f"{api(client, ws)}/settings").json()["fingerprint"]
    added = client.post(
        f"{api(client, ws)}/watch/sources",
        json={
            "connector": "mailbox",
            "label": "Mail alone, sent",
            "every_minutes": 15,
            "settings": {
                "host": "mail.example.com",
                "user": "one@example.com",
                "password": "env:UNUSED",
                "folder": names[0],
            },
            "fingerprint": fingerprint,
        },
    )
    assert added.status_code == 200, added.text
    assert lines(ws, "sent_folder") == []
