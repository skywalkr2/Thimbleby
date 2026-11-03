"""The folder chooser and where backups go (X97, X100, X58): a folder the computer keeps for itself is never browsed or
accepted, the way down is a trail the screen shows as a breadcrumb, a new folder is made through the app, choosing a
backup place replaces the old one, and a place can be taken out."""

from pathlib import Path

from engine import folder_rules
from engine.backup import overview, run_backup
from engine.config import load_config
from engine.storage import Store
from engine.workspace import init_workspace
from tests.test_cloud_folders import with_home
from tests.test_setup import client


def make(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False)
    cfg = load_config(ws.config_dir, env={})
    return ws, cfg, Store(ws.db_path, cfg=cfg)


def test_the_computer_s_own_folders_are_named_by_one_rule_and_a_home_folder_is_never_one(tmp_path, monkeypatch):
    with_home(monkeypatch, tmp_path / "home")
    for system in ("/", "/etc", "/usr/share", "/proc/1"):
        assert folder_rules.is_system_folder(Path(system)), system
        assert folder_rules.system_folder_problem(Path(system))
    assert not folder_rules.is_system_folder((tmp_path / "home").resolve())
    assert not folder_rules.is_system_folder((tmp_path / "home" / "etc").resolve())
    assert not folder_rules.is_system_folder(Path("/mnt/drive"))


def test_the_chooser_starts_at_home_refuses_system_folders_and_gives_a_trail(tmp_path, monkeypatch):
    home = tmp_path / "home"
    with_home(monkeypatch, home)
    (home / "Documents" / "Backups").mkdir(parents=True)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    start = c.get(f"{api}/setup/folders").json()
    assert start["home"] is True and start["path"] == str(home.resolve())
    deep = c.get(f"{api}/setup/folders", params={"path": str(home / "Documents" / "Backups")}).json()
    assert [(s["name"], s["home"]) for s in deep["trail"]] == [
        (home.name, True),
        ("Documents", False),
        ("Backups", False),
    ]
    assert deep["parent"] == str((home / "Documents").resolve())
    # Up from home leaves nothing to go up to the computer's own folders: it stops at the way's first step.
    assert start["parent"] is None
    for system in ("/", "/etc", "/usr"):
        refused = c.get(f"{api}/setup/folders", params={"path": system})
        assert refused.status_code == 400 and "belongs to the computer" in refused.json()["detail"], system


def test_a_backup_folder_in_a_system_folder_is_refused_with_a_plain_reason(tmp_path, monkeypatch):
    with_home(monkeypatch, tmp_path / "home")
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    for system in ("/etc", "/usr/lib"):
        check = c.get(f"{api}/setup/folder-check", params={"path": system}).json()
        assert check["ok"] is False and "belongs to the computer" in check["problem"], system
        fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
        refused = c.post(f"{api}/setup/backup-folder", json={"path": system, "label": "", "fingerprint": fingerprint})
        assert refused.status_code == 400


def test_a_new_folder_is_made_inside_the_one_shown_and_only_there(tmp_path, monkeypatch):
    home = tmp_path / "home"
    with_home(monkeypatch, home)
    (home / "Documents").mkdir()
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    made = c.post(f"{api}/setup/folders/new", json={"inside": str(home / "Documents"), "name": "My backups"})
    assert made.status_code == 200 and (home / "Documents" / "My backups").is_dir()
    assert made.json()["path"] == str((home / "Documents" / "My backups").resolve())
    again = c.post(f"{api}/setup/folders/new", json={"inside": str(home / "Documents"), "name": "My backups"})
    assert again.status_code == 400 and "already" in again.json()["detail"]
    for bad in ("", "  ", "..", "a/b", ".hidden", "x" * 101):
        refused = c.post(f"{api}/setup/folders/new", json={"inside": str(home / "Documents"), "name": bad})
        assert refused.status_code == 400, bad
    system = c.post(f"{api}/setup/folders/new", json={"inside": "/etc", "name": "mine"})
    assert system.status_code == 400 and not Path("/etc/mine").exists()


def test_choosing_a_backup_folder_replaces_the_old_one_and_a_place_can_be_removed(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    first, second = tmp_path / "first", tmp_path / "second"
    first.mkdir()
    second.mkdir()

    def choose(folder):
        fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
        return c.post(f"{api}/setup/backup-folder", json={"path": str(folder), "label": "", "fingerprint": fingerprint})

    def places():
        return [t["path"] for t in c.get(f"{api}/backups").json()["targets"]]

    assert choose(first).status_code == 200
    assert choose(second).status_code == 200
    assert places() == [str(second.resolve())]
    # Choosing the same place again changes nothing and is not an error.
    assert choose(second).status_code == 200 and places() == [str(second.resolve())]
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    gone = c.request(
        "DELETE", f"{api}/setup/backup-folder", json={"path": str(second.resolve()), "fingerprint": fingerprint}
    )
    assert gone.status_code == 200 and places() == []
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    missing = c.request("DELETE", f"{api}/setup/backup-folder", json={"path": str(second), "fingerprint": fingerprint})
    assert missing.status_code == 404


def test_a_copy_reached_through_two_places_is_listed_once(tmp_path):
    ws, cfg, store = make(tmp_path)
    outer = tmp_path / "outer"
    inner = outer / "inner"
    inner.mkdir(parents=True)
    from engine.config.yaml_edit import set_key

    path = ws.config_dir / "storage.yaml"
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    targets = [{"path": str(inner), "label": "one"}, {"path": str(inner / "."), "label": "two"}]
    path.write_text(set_key(text, ["backups", "targets"], targets) if text else f"backups:\n  targets: {targets}\n")
    cfg = load_config(ws.config_dir, env={})
    run_backup(ws, cfg)
    found = overview(ws, cfg)
    assert len(found.copies) == len({c.path for c in found.copies}) == 1
    assert len([p for p in inner.iterdir() if p.is_dir()]) == 1


def test_a_typed_backup_key_has_a_most_as_well_as_a_least(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    most = cfg.storage.backups.key_max_chars
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    long = c.post(f"{api}/backup-key", json={"value": "k" * (most + 1), "fingerprint": fingerprint})
    assert long.status_code == 400 and f"at most {most} characters" in long.json()["detail"]
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    assert c.post(f"{api}/backup-key", json={"value": "k" * most, "fingerprint": fingerprint}).status_code == 200
