"""A backup is made before a change that is hard to take back (the UI/UX review, design 5.0): before
a copy is loaded from the synced folder (a restore over this computer's data), before an add-on is installed or updated,
and before a bulk change: releasing everything an answer holds, loading data from files, or a removal that touches many
records (the threshold is `storage.backups.bulk_change_records`). It is made with the function the schedule uses, and a
copy that can't be made stops the change with a plain message. Nothing is made when backups aren't set up or when the
setting is off."""

from __future__ import annotations

import pytest

from engine import answer_groups, backup, endings, pack_install
from engine.cli import main as cockpit
from engine.config import load_config
from engine.config.yaml_edit import set_key
from engine.storage import Store
from engine.storage.export import export_data
from engine.workspace import init_workspace
from tests.conftest import DEMO_B
from tests.test_catalog_screen import CATALOG, TOKEN, fingerprint, screen, start  # noqa: F401 - the fixture
from tests.test_handover import change, projects, two, write  # noqa: F401 - the fixture
from tests.test_knowledge_records import apply, source
from tests.test_pack_install import wheel
from tests.test_pipeline import answers, env, run  # noqa: F401 - the fixture
from tests.test_project_ending import PROJECT, QUOTE, RAW, ending, set_status


def backups_to(ws, folder, **more):
    """Name a folder for backups in the workspace's files; `more` sets other backup settings."""
    folder.mkdir(exist_ok=True)
    path = ws.config_dir / "storage.yaml"
    text = set_key(path.read_text(), ["backups", "targets"], [{"path": str(folder), "label": ""}])
    # The sandbox workspaces switch backups before changes off (their folder is made up): these tests want it on.
    for key, value in {"before_changes": True, **more}.items():
        text = set_key(text, ["backups", key], value)
    path.write_text(text)
    return load_config(ws.config_dir, env={})


def copies(folder):
    return [p for p in folder.iterdir() if p.is_dir()]


def gone(folder):
    """The folder is taken away, as a drive that was unplugged is."""
    folder.rmdir()


@pytest.fixture
def home(tmp_path):
    return init_workspace(tmp_path / "ws", template=DEMO_B, git=False)


def test_one_copy_is_made_with_the_schedules_own_function_and_nothing_when_it_is_not_set_up_or_off(home, tmp_path):
    drive = tmp_path / "drive"
    cfg = backups_to(home, drive)
    assert backup.backup_before(home, cfg) is True
    [made] = copies(drive)
    assert (made / "cockpit.db").is_file() and backup.state(home, cfg).last_success is not None
    off = backups_to(home, drive, before_changes=False)
    assert backup.backup_before(home, off) is False and len(copies(drive)) == 1


def test_nothing_is_made_when_no_place_to_back_up_to_is_set_up(tmp_path):
    bare = init_workspace(tmp_path / "bare", git=False)
    assert backup.backup_before(bare, bare.config(env={})) is False


def test_a_copy_that_cannot_be_made_stops_the_change_in_plain_words(home, tmp_path):
    drive = tmp_path / "drive"
    cfg = backups_to(home, drive)
    gone(drive)
    with pytest.raises(backup.BackupFirstFailed) as err:
        backup.backup_before(home, cfg)
    assert "Nothing was changed" in str(err.value) and "isn't there" in str(err.value)


def test_a_removal_makes_a_backup_only_from_the_configured_number_of_records(home, tmp_path):
    drive = tmp_path / "drive"
    cfg = backups_to(home, drive, bulk_change_records=5)
    assert backup.backup_before_many(home, cfg, 4) is False and copies(drive) == []
    assert backup.backup_before_many(home, cfg, 5) is True and len(copies(drive)) == 1


def test_releasing_everything_an_answer_holds_makes_one_backup_first(env, tmp_path):  # noqa: F811
    ws, _, store = env
    drive = tmp_path / "drive"
    cfg = backups_to(ws, drive)
    answers({"ops": [{"op": "project.add", "name": "A new project"}]})
    _, cs_id = run(env, "Start a project called A new project.")
    assert [o["status"] for o in store.read().get("changeset", cs_id).data["ops"]] == ["held"]
    done = answer_groups.release_all(store, cfg, cs_id, ws=ws)
    assert done.released == [0] and len(copies(drive)) == 1


def test_a_release_all_is_not_made_when_the_backup_before_it_fails(env, tmp_path):  # noqa: F811
    ws, _, store = env
    drive = tmp_path / "drive"
    cfg = backups_to(ws, drive)
    gone(drive)
    answers({"ops": [{"op": "project.add", "name": "A new project"}]})
    _, cs_id = run(env, "Start a project called A new project.")
    with pytest.raises(backup.BackupFirstFailed):
        answer_groups.release_all(store, cfg, cs_id, ws=ws)
    assert [o["status"] for o in store.read().get("changeset", cs_id).data["ops"]] == ["held"]


def _held_ending(home):
    cfg = home.config(env={})
    store = Store(home.db_path, cfg=cfg)
    cs_id, result = apply(
        store,
        cfg,
        [set_status(ending(cfg, store), quote=QUOTE)],
        origin="input",
        trust="untrusted",
        source_id=source(store),
        raw=RAW,
    )
    assert set(result) == {"held"} and len(result) > 2
    return store, cs_id, len(result)


def test_an_ending_that_drops_few_records_makes_no_backup_and_one_that_drops_many_makes_one(home, tmp_path):
    drive = tmp_path / "drive"
    store, cs_id, records = _held_ending(home)
    try:
        cfg = backups_to(home, drive, bulk_change_records=records + 1)
        endings.finish_ending(store, cfg, cs_id, 0, [], ws=home)
        assert copies(drive) == [] and store.read().get("project", PROJECT["id"]).data["status"]
    finally:
        store.close()
    drive2 = tmp_path / "drive2"
    ws2 = init_workspace(tmp_path / "ws2", template=DEMO_B, git=False)
    store, cs_id, records = _held_ending(ws2)
    try:
        cfg = backups_to(ws2, drive2, bulk_change_records=records)
        endings.finish_ending(store, cfg, cs_id, 0, [], ws=ws2)
        assert len(copies(drive2)) == 1
    finally:
        store.close()


def test_an_ending_that_drops_many_records_does_not_happen_when_its_backup_fails(home, tmp_path):
    drive = tmp_path / "drive"
    store, cs_id, _ = _held_ending(home)
    try:
        cfg = backups_to(home, drive, bulk_change_records=1)
        before = store.read().get("project", PROJECT["id"]).data["status"]
        gone(drive)
        with pytest.raises(backup.BackupFirstFailed):
            endings.finish_ending(store, cfg, cs_id, 0, [], ws=home)
        assert store.read().get("project", PROJECT["id"]).data["status"] == before
    finally:
        store.close()


def test_loading_the_synced_folders_copy_makes_a_backup_first_and_stops_without_one(two, tmp_path):  # noqa: F811
    from engine.handover import open_workspace, release

    a, cfg_a, b, cfg_b, _ = two
    open_workspace(a, cfg_a)
    change(a, cfg_a, "Harbor Survey")
    write(a, cfg_a)
    release(a, cfg_a)
    drive = tmp_path / "drive"
    cfg_b = backups_to(b, drive)
    gone(drive)
    with pytest.raises(backup.BackupFirstFailed):
        open_workspace(b, cfg_b)
    assert "Harbor Survey" not in projects(b, cfg_b)  # nothing was loaded
    cfg_b = backups_to(b, drive)
    assert open_workspace(b, cfg_b).action == "loaded"
    assert len(copies(drive)) == 1 and "Harbor Survey" in projects(b, cfg_b)


def test_loading_data_from_files_makes_a_backup_first_and_stops_without_one(home, tmp_path, capsys):
    cfg = home.config(env={})
    store = Store(home.db_path, cfg=cfg)
    try:
        export_data(store, home.data_dir)
    finally:
        store.close()
    # An import loads into an empty database: this one is emptied, as for a computer set up again from the files.
    for leftover in (home.db_path, *(home.db_path.with_name(home.db_path.name + s) for s in ("-wal", "-shm"))):
        leftover.unlink(missing_ok=True)
    drive = tmp_path / "drive"
    backups_to(home, drive)
    gone(drive)
    assert cockpit(["import", "-w", str(home.root)]) == 1
    assert "Nothing was changed" in capsys.readouterr().err
    backups_to(home, drive)
    assert cockpit(["import", "-w", str(home.root)]) == 0
    assert len(copies(drive)) == 1


def test_installing_an_add_on_from_the_screen_makes_a_backup_first_and_stops_without_one(screen, tmp_path):  # noqa: F811
    ws, cfg, _ = screen
    c, api = start(ws, cfg)
    c.post(f"{api}/packs/catalogs", json={"address": CATALOG, "fingerprint": fingerprint(c, api)})
    c.post(f"{api}/packs/packdemo/token", json={"token": TOKEN, "fingerprint": fingerprint(c, api)})
    drive = tmp_path / "drive"
    backups_to(ws, drive)
    gone(drive)
    refused = c.post(f"{api}/packs/packdemo/install")
    assert refused.status_code == 409 and "Nothing was changed" in refused.json()["detail"]
    assert not pack_install.installed_here("packdemo") and list(pack_install.target().iterdir()) == []
    backups_to(ws, drive)
    done = c.post(f"{api}/packs/packdemo/install")
    assert done.status_code == 200, done.text
    assert len(copies(drive)) == 1 and list(pack_install.target().iterdir())


def test_installing_an_add_on_from_the_command_line_makes_a_backup_first_for_the_workspace_it_is_for(
    home, tmp_path, monkeypatch, capsys
):
    place = tmp_path / "site"
    place.mkdir()
    monkeypatch.setattr(pack_install, "target", lambda: place)
    file = tmp_path / "pack.whl"
    file.write_bytes(wheel())
    drive = tmp_path / "drive"
    backups_to(home, drive)
    gone(drive)
    assert cockpit(["install", "-w", str(home.root), str(file)]) == 1
    assert "Nothing was changed" in capsys.readouterr().err and list(place.iterdir()) == []
    backups_to(home, drive)
    assert cockpit(["install", "-w", str(home.root), str(file)]) == 0
    assert len(copies(drive)) == 1 and list(place.iterdir())
