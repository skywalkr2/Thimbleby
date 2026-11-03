"""Restoring a backup copy over the workspace from the screen (design 5.0): the restore is staged without touching the
workspace, a wrong key stages nothing, the swap at the next start sets what the workspace holds aside and puts the
copy's files in with renames only, a swap that fails puts everything back, "Put back what was there before" goes the
other way, and Cancel and a second Restore leave one staged restore."""

import hashlib
import sqlite3
import sys
from pathlib import Path

import pytest

from engine import backup_crypto, cli, restore_in_app
from engine.backup import KeyNeeded, RestoreError, run_backup
from engine.restore_in_app import (
    DONE,
    KEPT,
    NOT_RESTORED,
    PENDING,
    READY,
    RESTORED,
    cancel,
    kept_folders,
    note,
    pending,
    stage,
    stage_put_back,
    swap_pending,
)
from engine.storage import Store, WriteContext
from engine.workspace import Workspace, init_workspace
from tests.conftest import DEMO_A
from tests.test_backup_encryption import SECRET, make_backup
from tests.test_setup import client
from tests.test_update_restore import NOW, counts

_PM = WriteContext("pm", "trusted", "test.restore")


@pytest.fixture(autouse=True)
def cheap_key_derivation(monkeypatch):
    monkeypatch.setattr(backup_crypto, "KDF", {"n": 2**4, "r": 1, "p": 1})


def snapshot(root: Path) -> dict[str, str]:
    """Every file of the workspace outside its private folder, by content, with the database through its records."""
    found = {}
    for path in sorted(root.rglob("*")):
        rel = path.relative_to(root).as_posix()
        if path.is_file() and not rel.startswith(".cockpit/") and ".git/" not in rel and not rel.endswith("-wal"):
            found[rel] = hashlib.sha256(path.read_bytes()).hexdigest()
    return found


def add_person(ws: Workspace, name: str = "Added After The Copy") -> None:
    store = Store(ws.db_path)
    try:
        with store.transaction() as tx:
            tx.create("person", {"full_name": name}, _PM)
    finally:
        store.close()


@pytest.fixture
def made(tmp_path):
    """A workspace with one dated backup copy, then a change and a saved text made after the copy was taken."""
    ws = init_workspace(tmp_path / "ws", template=DEMO_A, git=False)
    offsite = tmp_path / "offsite"
    offsite.mkdir()
    cfg = ws.config(env={}, flags={"storage.backups.targets": [{"path": str(offsite), "label": "test"}]})
    (ws.root / "texts").mkdir()
    (ws.root / "texts" / "note.md").write_text("as it was\n", encoding="utf-8")
    run_backup(ws, cfg, NOW)
    (copy,) = list(offsite.iterdir())
    at_copy = counts(ws.db_path)
    add_person(ws)
    (ws.root / "texts" / "note.md").write_text("changed later\n", encoding="utf-8")
    (ws.root / "texts" / "later.md").write_text("only later\n", encoding="utf-8")
    return ws, cfg, copy, at_copy


# ---- staging ---------------------------------------------------------------------------------------------------------


def test_staging_makes_the_restored_workspace_and_the_marker_and_changes_nothing_else(made):
    ws, _, copy, at_copy = made
    before = snapshot(ws.root)
    staged = stage(ws, copy, made_at="2026-10-09T14:00:00+00:00")
    ready = ws.private_dir / PENDING
    assert (ready / READY).is_file() and (ready / "cockpit.db").is_file() and (ready / "config").is_dir()
    assert counts(ready / "cockpit.db") == at_copy
    assert (ready / "texts" / "note.md").read_text() == "as it was\n"
    assert pending(ws) == staged and staged.made_at == "2026-10-09T14:00:00+00:00" and staged.kind == "backup"
    assert staged.records == sum(at_copy[0].values())
    assert snapshot(ws.root) == before  # the workspace itself is as it was until the next start
    assert not (ws.private_dir / "restore-staging").exists()


def test_a_wrong_or_missing_key_stages_nothing(tmp_path, monkeypatch):
    key_file = tmp_path / "key.txt"
    key_file.write_text(SECRET + "\n", encoding="utf-8")
    ws, _, copy = make_backup(tmp_path, f"file:{key_file}")
    with pytest.raises(KeyNeeded):
        stage(ws, copy, None)
    with pytest.raises(RestoreError, match="doesn't open"):
        stage(ws, copy, "not the key at all, but long enough")
    assert not (ws.private_dir / PENDING).exists() and not (ws.private_dir / "restore-staging").exists()
    assert pending(ws) is None
    # The right key stages it.
    assert stage(ws, copy, SECRET).records > 0


def test_a_failed_second_restore_keeps_the_first(made, tmp_path):
    ws, _, copy, _ = made
    first = stage(ws, copy)
    with pytest.raises(RestoreError):
        stage(ws, tmp_path / "not-a-backup")
    assert pending(ws) == first and (ws.private_dir / PENDING / "cockpit.db").is_file()


def test_cancel_removes_the_staged_restore_and_a_second_restore_replaces_the_first(made):
    ws, _, copy, _ = made
    first = stage(ws, copy, made_at="first")
    (ws.private_dir / PENDING / "marker-of-the-first").write_text("x")
    second = stage(ws, copy, made_at="second")
    assert pending(ws) == second and second.made_at == "second"
    assert not (ws.private_dir / PENDING / "marker-of-the-first").exists()
    assert first != second
    assert cancel(ws) is True and not (ws.private_dir / PENDING).exists() and pending(ws) is None
    assert cancel(ws) is False


def test_a_synced_folder_blocks_a_restore_because_the_next_start_would_undo_it(made, tmp_path):
    ws, cfg, _, _ = made
    assert restore_in_app.blocked(cfg) is None
    synced = ws.config(env={}, flags={"storage.sync.folder": str(tmp_path / "sync")})
    assert "synced folder" in restore_in_app.blocked(synced)


# ---- the swap at the next start --------------------------------------------------------------------------------------


def test_the_swap_sets_the_current_files_aside_and_puts_the_copy_in_and_the_workspace_opens_on_it(made):
    ws, _, copy, at_copy = made
    now_counts = counts(ws.db_path)
    assert now_counts != at_copy
    stage(ws, copy, made_at="2026-10-09T14:00:00+00:00")
    assert swap_pending(ws.root) == RESTORED
    # The workspace is the copy's, and opens with its records.
    assert counts(ws.db_path) == at_copy
    assert (ws.root / "texts" / "note.md").read_text() == "as it was\n" and not (
        ws.root / "texts" / "later.md"
    ).exists()
    store = Store(ws.db_path, cfg=ws.config())
    try:
        assert len(store.read().list("person")) == at_copy[0]["person"]
    finally:
        store.close()
    # What was there is kept, whole, and the staged restore is gone.
    (kept,) = kept_folders(ws)
    assert counts(kept / "cockpit.db") == now_counts
    assert (kept / "texts" / "later.md").read_text() == "only later\n" and (kept / "config").is_dir()
    assert (kept / DONE).is_file() and not (ws.private_dir / PENDING).exists()
    done = note(ws)
    assert done.state == RESTORED and done.made_at == "2026-10-09T14:00:00+00:00" and done.kept == str(kept)
    # Nothing is left to swap at the start after.
    assert swap_pending(ws.root) is None


def test_the_swap_with_a_history_of_its_own_sets_it_aside_and_keeps_the_new_one(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_A, git=True)
    offsite = tmp_path / "offsite"
    offsite.mkdir()
    cfg = ws.config(env={}, flags={"storage.backups.targets": [{"path": str(offsite)}]})
    run_backup(ws, cfg, NOW)
    (copy,) = list(offsite.iterdir())
    if not (ws.root / ".git").is_dir():
        pytest.skip("git isn't installed here")
    stage(ws, copy)
    assert swap_pending(ws.root) == RESTORED
    (kept,) = kept_folders(ws)
    assert (ws.root / ".git").is_dir() and (kept / ".git").is_dir() and (ws.root / ".gitignore").is_file()


def test_the_swap_uses_renames_only(made, monkeypatch):
    ws, _, copy, _ = made
    stage(ws, copy)
    import shutil

    def no_copy(*args, **kwargs):
        raise AssertionError("the swap copied something")

    monkeypatch.setattr(shutil, "copy2", no_copy)
    monkeypatch.setattr(shutil, "copytree", no_copy)
    monkeypatch.setattr(shutil, "copyfile", no_copy)
    assert swap_pending(ws.root) == RESTORED


def test_a_swap_that_fails_midway_puts_everything_back_keeps_the_staged_restore_and_says_why(made):
    ws, _, copy, _ = made
    stage(ws, copy, made_at="2026-10-09T14:00:00+00:00")
    before = snapshot(ws.root)
    before_counts = counts(ws.db_path)
    calls = []

    def failing(source: Path, target: Path) -> None:
        calls.append((source, target))
        if len(calls) == 6:
            raise PermissionError(13, "Permission denied", str(source))
        source.rename(target)

    assert swap_pending(ws.root, move=failing) == NOT_RESTORED
    assert len(calls) >= 6
    assert snapshot(ws.root) == before and counts(ws.db_path) == before_counts
    # The staged restore is as it was, ready to be tried again; nothing was set aside for good.
    assert (ws.private_dir / PENDING / READY).is_file() and (ws.private_dir / PENDING / "cockpit.db").is_file()
    assert kept_folders(ws) == [] and not any((ws.private_dir / KEPT).glob("*"))
    failed = note(ws)
    assert failed.state == NOT_RESTORED and "didn't happen" in failed.reason and "permission denied" in failed.reason
    # The next start tries again and, with nothing in the way, swaps it in.
    assert swap_pending(ws.root) == RESTORED
    assert counts(ws.db_path)[0]["person"] == counts(kept_folders(ws)[0] / "cockpit.db")[0]["person"] - 1


def test_a_computer_that_stopped_in_the_middle_finishes_the_same_plan_at_the_next_start(made):
    ws, _, copy, at_copy = made
    before_counts = counts(ws.db_path)
    stage(ws, copy)
    calls = []

    def stops(source: Path, target: Path) -> None:
        calls.append(source)
        if len(calls) == 7:
            raise SystemExit("the computer stopped")  # not an error the swap handles: as if the power went
        source.rename(target)

    with pytest.raises(SystemExit):
        swap_pending(ws.root, move=stops)
    assert (ws.private_dir / PENDING / READY).is_file()
    assert swap_pending(ws.root) == RESTORED
    assert counts(ws.db_path) == at_copy
    (kept,) = kept_folders(ws)  # one folder holds all that was set aside
    assert counts(kept / "cockpit.db") == before_counts and (kept / "texts" / "later.md").is_file()
    assert (ws.root / "texts" / "note.md").read_text() == "as it was\n"


def test_an_incomplete_staged_restore_is_not_swapped_and_the_workspace_stays(made):
    ws, _, copy, _ = made
    stage(ws, copy)
    (ws.private_dir / PENDING / "cockpit.db").unlink()
    before = snapshot(ws.root)
    assert swap_pending(ws.root) == NOT_RESTORED
    assert snapshot(ws.root) == before and "incomplete" in note(ws).reason


def test_with_nothing_staged_the_start_changes_nothing(made):
    ws, _, _, _ = made
    before = snapshot(ws.root)
    assert swap_pending(ws.root) is None and snapshot(ws.root) == before
    (ws.private_dir / PENDING).mkdir()  # a half-made folder with no marker is not a restore
    assert swap_pending(ws.root) is None and snapshot(ws.root) == before


def test_serving_swaps_before_anything_reads_the_workspace(made, monkeypatch):
    ws, _, copy, at_copy = made
    stage(ws, copy)
    seen = []
    real_swap, real_config = restore_in_app.swap_pending, Workspace.config
    monkeypatch.setattr(restore_in_app, "swap_pending", lambda *a, **k: seen.append("swap") or real_swap(*a, **k))
    monkeypatch.setattr(Workspace, "config", lambda self, **k: seen.append("config") or real_config(self, **k))
    from engine import handover

    monkeypatch.setattr(handover, "open_or_hold", lambda *a, **k: (_ for _ in ()).throw(handover.Refused("stop")))
    assert cli.main(["serve", "-w", str(ws.root)]) == 1
    assert seen[0] == "swap" and "config" in seen
    assert counts(ws.db_path) == at_copy


# ---- putting back what was there before ------------------------------------------------------------------------------


def test_put_back_stages_the_kept_files_and_a_second_swap_restores_what_changed_after_the_copy(made):
    ws, _, copy, at_copy = made
    after_copy = counts(ws.db_path)
    stage(ws, copy)
    swap_pending(ws.root)
    assert counts(ws.db_path) == at_copy
    staged = stage_put_back(ws)
    assert staged.kind == "put_back" and staged.made_at  # the moment the first swap was made
    assert counts(ws.private_dir / PENDING / "cockpit.db") == after_copy
    assert swap_pending(ws.root) == RESTORED
    assert counts(ws.db_path) == after_copy
    assert (ws.root / "texts" / "later.md").read_text() == "only later\n"
    assert (ws.root / "texts" / "note.md").read_text() == "changed later\n"
    # What the first restore left is kept in turn, so each way is reversible and nothing was deleted.
    assert len(kept_folders(ws)) == 2
    assert counts(kept_folders(ws)[-1] / "cockpit.db") == at_copy


def test_put_back_reads_a_log_the_old_process_left_unfolded(made):
    ws, _, copy, _ = made
    stage(ws, copy)
    swap_pending(ws.root)
    (kept,) = kept_folders(ws)
    # A set-aside database whose write-ahead log still holds a change, as after a stop that skipped the checkpoint:
    # the files are copied while another connection keeps the log from being folded in.
    holder = sqlite3.connect(kept / "cockpit.db")
    holder.execute("PRAGMA wal_autocheckpoint=0")
    holder.execute("SELECT COUNT(*) FROM records").fetchone()
    add_person(Workspace(kept), "Only In The Log")
    main, log = (kept / "cockpit.db").read_bytes(), Path(f"{kept / 'cockpit.db'}-wal").read_bytes()
    holder.close()
    (kept / "cockpit.db").write_bytes(main)
    Path(f"{kept / 'cockpit.db'}-wal").write_bytes(log)
    Path(f"{kept / 'cockpit.db'}-shm").unlink(missing_ok=True)
    assert len(log) > 0
    # Counted on a copy, since reading it in place would fold the log in.
    beside = ws.root.parent / "counted"
    beside.mkdir()
    (beside / "cockpit.db").write_bytes(main)
    (beside / "cockpit.db-wal").write_bytes(log)
    expected = counts(beside / "cockpit.db")[0]["person"]
    assert expected == counts(ws.db_path)[0]["person"] + 2
    stage_put_back(ws)
    assert counts(ws.private_dir / PENDING / "cockpit.db")[0]["person"] == expected


def test_put_back_with_nothing_set_aside_says_so(made):
    ws, _, _, _ = made
    with pytest.raises(RestoreError, match="Nothing was set aside"):
        stage_put_back(ws)


# ---- the routes and Today ---------------------------------------------------------------------------------------


def app(ws, cfg):
    store = Store(ws.db_path, cfg=cfg)
    c, api = client(ws, cfg, store)
    return c, api, c.app.state.worker


def test_the_route_stages_a_copy_and_asks_for_a_restart_without_restarting(made):
    ws, cfg, copy, at_copy = made
    c, api, worker = app(ws, cfg)
    listed = c.get(f"{api}/backups").json()
    assert listed["pending"] is None and listed["restore_blocked"] is None
    response = c.post(f"{api}/backups/restore", json={"path": str(copy)})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["pending"]["kind"] == "backup" and body["pending"]["made_at"] == listed["copies"][0]["made_at"]
    # Asked for in the usual way: new work waits and the restart is named, but the app doesn't restart itself.
    assert worker.restart_needed and worker.restart_for == ["restore"]
    assert worker.restart_requested is False and worker.restart_due() is False
    assert c.get(f"{api}/status").json()["restart_for"] == ["restore"]
    assert c.get(f"{api}/backups").json()["pending"]["records"] == sum(at_copy[0].values())
    # Today says so, with the restart as the line's action.
    [line] = [x for x in c.get(f"{api}/today/queue").json() if x["kind"] == "restore"]
    assert line["state"] == "pending" and line["at"].startswith("2026-10-09")
    # The workspace itself is still as it was.
    assert (ws.root / "texts" / "later.md").is_file()


def test_the_route_refuses_a_path_that_is_not_one_of_the_copies(made, tmp_path):
    ws, cfg, _, _ = made
    c, api, worker = app(ws, cfg)
    other = tmp_path / "elsewhere"
    other.mkdir()
    response = c.post(f"{api}/backups/restore", json={"path": str(other)})
    assert response.status_code == 404 and pending(ws) is None and not worker.restart_for


def test_the_route_refuses_a_wrong_or_missing_key_with_the_reason_and_stages_nothing(tmp_path):
    key_file = tmp_path / "key.txt"
    key_file.write_text(SECRET + "\n", encoding="utf-8")
    ws, cfg, copy = make_backup(tmp_path, f"file:{key_file}")
    c, api, worker = app(ws, cfg)
    assert c.get(f"{api}/backups").json()["copies"][0]["encrypted"] is True
    missing = c.post(f"{api}/backups/restore", json={"path": str(copy)})
    assert missing.status_code == 409 and missing.headers["X-Cockpit-Needs"] == "key"
    wrong = c.post(f"{api}/backups/restore", json={"path": str(copy), "key": "a wrong key that is long enough"})
    assert wrong.status_code == 409 and "doesn't open this backup" in wrong.json()["detail"]
    assert pending(ws) is None and not worker.restart_for and worker.restart_needed is None
    assert SECRET not in wrong.text and SECRET not in missing.text
    ok = c.post(f"{api}/backups/restore", json={"path": str(copy), "key": SECRET})
    assert ok.status_code == 200 and worker.restart_for == ["restore"]


def test_cancel_lifts_the_hold_and_removes_the_pending_restore(made):
    ws, cfg, copy, _ = made
    c, api, worker = app(ws, cfg)
    c.post(f"{api}/backups/restore", json={"path": str(copy)})
    assert worker.restart_needed
    assert c.post(f"{api}/backups/restore/cancel").json() == {"ok": "restore"}
    assert pending(ws) is None and not (ws.private_dir / PENDING).exists()
    assert worker.restart_needed is None and worker.restart_for == []
    assert c.get(f"{api}/backups").json()["pending"] is None
    assert not [x for x in c.get(f"{api}/today/queue").json() if x["kind"] == "restore"]


def test_a_second_restore_through_the_route_replaces_the_first(made):
    ws, cfg, copy, _ = made
    c, api, _ = app(ws, cfg)
    c.post(f"{api}/backups/restore", json={"path": str(copy)})
    first = pending(ws)
    again = c.post(f"{api}/backups/restore", json={"path": str(copy)})
    assert again.status_code == 200 and pending(ws).staged_at >= first.staged_at
    assert len([p for p in ws.private_dir.glob("restore-*")]) == 1


def test_a_synced_folder_refuses_the_route_and_says_why(made, tmp_path):
    ws, _, copy, _ = made
    cfg = ws.config(
        env={},
        flags={"storage.backups.targets": [{"path": str(copy.parent)}], "storage.sync.folder": str(tmp_path / "sync")},
    )
    c, api, worker = app(ws, cfg)
    assert "synced folder" in c.get(f"{api}/backups").json()["restore_blocked"]
    response = c.post(f"{api}/backups/restore", json={"path": str(copy)})
    assert response.status_code == 409 and "synced folder" in response.json()["detail"]
    assert pending(ws) is None and not worker.restart_for


def test_after_the_swap_today_has_one_line_that_goes_when_dismissed_and_put_back_goes_through_the_route(made):
    ws, cfg, copy, at_copy = made
    after_copy = counts(ws.db_path)
    stage(ws, copy, made_at="2026-10-09T14:00:00+00:00")
    swap_pending(ws.root)
    c, api, worker = app(ws, cfg)
    [line] = [x for x in c.get(f"{api}/today/queue").json() if x["kind"] == "restore"]
    assert line["state"] == "restored" and line["at"].startswith("2026-10-09") and "before-restore" in line["text"]
    put_back = c.post(f"{api}/restore/put-back")
    assert put_back.status_code == 200 and put_back.json()["pending"]["kind"] == "put_back"
    assert worker.restart_for == ["restore"]
    c.close()
    assert swap_pending(ws.root) == RESTORED and counts(ws.db_path) == after_copy
    c, api, _ = app(ws, cfg)
    assert c.post(f"{api}/restore/dismiss").json() == {"ok": "restore"}
    assert not [x for x in c.get(f"{api}/today/queue").json() if x["kind"] == "restore"]
    assert at_copy != after_copy


def test_a_failed_swap_shows_a_line_that_says_it_didnt_happen_and_why(made):
    ws, cfg, copy, _ = made
    stage(ws, copy)

    def failing(source: Path, target: Path) -> None:
        raise OSError(5, "Input/output error", str(source))

    assert swap_pending(ws.root, move=failing) == NOT_RESTORED
    c, api, _ = app(ws, cfg)
    lines = {x["state"]: x for x in c.get(f"{api}/today/queue").json() if x["kind"] == "restore"}
    assert set(lines) == {"not_restored", "pending"}  # the restore is still waiting for another try
    assert "didn't happen" in lines["not_restored"]["text"] and "input/output error" in lines["not_restored"]["text"]
    # Cancelling the one that failed takes its note away too.
    c.post(f"{api}/backups/restore/cancel")
    assert not [x for x in c.get(f"{api}/today/queue").json() if x["kind"] == "restore"]


def test_the_module_says_what_it_replaces_in_the_order_the_swap_uses():
    # Whatever a restore writes into its target is listed, so the swap sets all of it aside.
    from engine.backup import BACKUP_FOLDERS

    assert set(BACKUP_FOLDERS) <= set(restore_in_app.REPLACED) and "data" in restore_in_app.REPLACED
    assert {"cockpit.db", "cockpit.db-wal", "cockpit.db-shm"} <= set(restore_in_app.REPLACED)
    assert set(restore_in_app.REPLACED_WHEN_RESTORED) == {".gitignore", ".git"}
    assert sys.version_info >= (3, 12)


def test_this_computers_own_settings_stay_after_the_swap_and_the_kept_folder_keeps_its_copy(made):
    ws, _, copy, _ = made
    stage(ws, copy, made_at="2026-10-09T14:00:00+00:00")
    mine = "# this computer's own\nbackups: {}\n"
    for name in ("storage.yaml", "server.yaml"):
        (ws.config_dir / name).write_text(mine, encoding="utf-8")
    assert swap_pending(ws.root) == RESTORED
    (kept,) = kept_folders(ws)
    for name in ("storage.yaml", "server.yaml"):
        assert (ws.config_dir / name).read_text(encoding="utf-8") == mine
        assert (kept / "config" / name).read_text(encoding="utf-8") == mine


def test_a_failed_swap_never_removes_anything_but_its_plan_from_the_kept_folder(made):
    ws, _, copy, _ = made
    stage(ws, copy, made_at="2026-10-09T14:00:00+00:00")
    calls = []

    def failing(source: Path, target: Path) -> None:
        calls.append((source, target))
        if len(calls) == 2:
            (target.parent / "left-by-the-person.txt").write_text("keep me\n", encoding="utf-8")
            raise PermissionError(13, "Permission denied", str(source))
        source.rename(target)

    assert swap_pending(ws.root, move=failing) == NOT_RESTORED
    (kept,) = [p for p in (ws.private_dir / KEPT).glob("*")]
    assert (kept / "left-by-the-person.txt").read_text(encoding="utf-8") == "keep me\n"
