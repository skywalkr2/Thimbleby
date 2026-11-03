"""Restoring a backup copy over this workspace from the screen (design 5.0).

A restore happens in two steps, so the running app never has its own files replaced under it:

1. Staging. `stage` makes the workspace as it was in the chosen copy with `restore_backup` (the one function that
   reads a backup), into the workspace's private folder (`restore-pending/`), and writes a marker file last. Nothing in
   the workspace changes, and the app asks for a restart, which the person starts.
2. The swap, at the next start, before anything opens the workspace (`swap_pending`). What the workspace holds that a
   restore writes (`REPLACED`) is renamed into `before-restore/<time>/`, then the restored files are renamed into place.
   Only renames, on the same disk, so nothing is copied and nothing is deleted; `before-restore/` is never removed. A
   step that fails is undone, the staged restore stays as it was, and the workspace starts as it was, with a note that
   Today shows. The plan is written before the first rename, so a start after the computer stopped midway finishes the
   same plan rather than making a new one.

`stage_put_back` stages the newest `before-restore/` folder the same way, so the person can go back. A short note in
the private folder (`restore-note.json`) says how the last swap went; Today shows it until the person dismisses it.
"""

from __future__ import annotations

import contextlib
import json
import os
import shutil
import sqlite3
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from engine.backup import BACKUP_FOLDERS, KeyNeeded, RestoreError, restore_backup
from engine.state_file import write_whole
from engine.workspace import Workspace

PENDING = "restore-pending"
STAGING = "restore-staging"
READY = "READY"
KEPT = "before-restore"
NOTE = "restore-note.json"
PLAN = "PLAN.json"
DONE = "DONE"
#: Kinds of staged restore: a backup copy, or the files kept aside by an earlier restore.
BACKUP = "backup"
PUT_BACK = "put_back"
#: The states a note can be in.
RESTORED = "restored"
NOT_RESTORED = "not_restored"

#: What `restore_backup` writes into its target and the workspace holds too: the database with its side files, the
#: folders a backup holds, and the readable export it regenerates. All of it is set aside at the swap, so the workspace
#: is the copy's and nothing of the later one is mixed in. A name the copy lacks (a copy made before any file was added)
#: is set aside too: the workspace had none then.
REPLACED = ("cockpit.db", "cockpit.db-wal", "cockpit.db-shm", *BACKUP_FOLDERS, "data")
#: What it writes for the workspace's own history. These are replaced only when the restored workspace has them (it has
#: no history of its own where git isn't installed), so a workspace is never left without one.
REPLACED_WHEN_RESTORED = (".gitignore", ".git")

Move = Callable[[Path, Path], None]


def _move(source: Path, target: Path) -> None:
    os.replace(source, target)


@dataclass(frozen=True)
class Pending:
    """A staged restore: where it came from, the moment the workspace goes back to, and what it holds."""

    source: str
    made_at: str | None
    staged_at: str
    kind: str
    records: int
    ledger: int


def _stamp(now: datetime) -> str:
    return now.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def blocked(cfg: Any) -> str | None:
    """Why a restore can't be made from the screen now, or None. With a synced folder set up, the next start compares
    this computer's history with the folder's, finds the restored one older, and loads the folder's over it, so the
    restore would be undone without a word."""
    if str(cfg.storage.sync.folder).strip():
        return (
            "This workspace is kept in a synced folder, which would bring back the newer copy at the next start and "
            "undo the restore. Turn the synced folder off first, or restore into a new workspace."
        )
    return None


def pending(ws: Workspace) -> Pending | None:
    """The staged restore waiting for the next start, or None."""
    return _read_ready(ws.private_dir / PENDING / READY)


def _read_ready(path: Path) -> Pending | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return Pending(**{k: data[k] for k in Pending.__dataclass_fields__})
    except (OSError, ValueError, TypeError, KeyError):
        return None


def stage(
    ws: Workspace,
    source: Path,
    key: str | None = None,
    *,
    made_at: str | None = None,
    kind: str = BACKUP,
    now: datetime | None = None,
) -> Pending:
    """Make the workspace as it was in `source` (a dated backup folder, or a folder kept aside) ready to be swapped in
    at the next start. Raises `RestoreError` (`KeyNeeded` for a missing key) with the plain reason, and leaves nothing
    behind. An earlier staged restore is replaced only once this one is made."""
    now = now or datetime.now(UTC)
    private = ws.private_dir
    staging, ready = private / STAGING, private / PENDING
    shutil.rmtree(staging, ignore_errors=True)
    try:
        private.mkdir(parents=True, exist_ok=True)
        restored = restore_backup(source, staging, key)
        (ready / READY).unlink(missing_ok=True)  # an earlier one stops being ready before it goes
        if ready.exists():
            shutil.rmtree(ready)
        os.replace(staging, ready)
        found = Pending(str(source), made_at, now.astimezone(UTC).isoformat(), kind, restored.records, restored.ledger)
        write_whole(ready / READY, json.dumps(asdict(found), indent=2) + "\n")
    except RestoreError:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    except OSError as err:
        shutil.rmtree(staging, ignore_errors=True)
        raise RestoreError(f"The restore couldn't be made ready: {err.strerror or err}.") from None
    _clear_failure(private)
    return found


def cancel(ws: Workspace) -> bool:
    """Remove a staged restore. Returns whether there was one."""
    ready = ws.private_dir / PENDING
    found = ready.exists()
    (ready / READY).unlink(missing_ok=True)
    shutil.rmtree(ready, ignore_errors=True)
    shutil.rmtree(ws.private_dir / STAGING, ignore_errors=True)
    _clear_failure(ws.private_dir)
    return found


def kept_folders(ws: Workspace) -> list[Path]:
    """The folders of files set aside by earlier restores whose swap finished, oldest first."""
    base = ws.private_dir / KEPT
    return sorted(p for p in base.glob("*") if (p / DONE).is_file()) if base.is_dir() else []


def stage_put_back(ws: Workspace, now: datetime | None = None) -> Pending:
    """Stage the newest set-aside folder as the next restore, so the workspace goes back to how it was before the last
    one. Raises `RestoreError` when nothing was set aside."""
    kept = kept_folders(ws)
    if not kept:
        raise RestoreError("Nothing was set aside by an earlier restore, so there is nothing to put back.")
    newest = kept[-1]
    _settle(newest / "cockpit.db")
    return stage(
        ws, newest, made_at=json.loads((newest / DONE).read_text(encoding="utf-8")).get("at"), kind=PUT_BACK, now=now
    )


def _settle(database: Path) -> None:
    """Fold a database's write-ahead log into the file, so a copy that reads the file alone has everything. The folder
    it is in was set aside by a swap, so nothing else is using it."""
    wal = Path(f"{database}-wal")
    try:
        if wal.is_file() and wal.stat().st_size > 0:
            conn = sqlite3.connect(database)
            try:
                conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            finally:
                conn.close()
    except (OSError, sqlite3.Error):
        pass  # the copy is checked as it is made, and refused if it is damaged


# ---- the swap, at the start ------------------------------------------------------------------------------------------


def swap_pending(root: Path, now: datetime | None = None, move: Move = _move) -> str | None:
    """Before anything opens the workspace at `root`: put a staged restore in place. Returns None when none is staged,
    `RESTORED` when it was swapped in, `NOT_RESTORED` when a step failed (everything is back as it was, the staged
    restore stays, and the note says why). Never raises."""
    private = root / ".cockpit"
    staged = private / PENDING
    ready = staged / READY
    if not ready.is_file():
        return None
    found = _read_ready(ready)
    made_at = found.made_at if found else None
    now = now or datetime.now(UTC)
    kept, plan = _unfinished(root)
    try:
        if kept is None:
            if found is None or not (staged / "cockpit.db").is_file():
                raise RestoreError("The restored copy is incomplete.")
            kept, plan = _plan(root, staged, now)
        for source, target in plan:
            _step(source, target, move)
        _keep_this_computers(root, kept)
        write_whole(kept / DONE, json.dumps({"at": now.astimezone(UTC).isoformat(), "made_at": made_at}) + "\n")
        ready.unlink()  # last, so a start after this never swaps the restored workspace aside again
    except Exception as err:
        undone = _undo(plan, move)
        if kept is not None and undone:
            _drop_if_only_plan(kept)
        _note(private, NOT_RESTORED, made_at, reason=_reason(err, None if undone else kept))
        return NOT_RESTORED
    shutil.rmtree(staged, ignore_errors=True)
    _note(private, RESTORED, made_at, kept=str(kept), kind=found.kind if found else None)
    return RESTORED


def _keep_this_computers(root: Path, kept: Path) -> None:
    """The settings that belong to this computer (where its backups go, how it serves) stay as they were: the restored
    copy's own are replaced by the ones set aside, as the synced folder's handover keeps them (`handover.PER_COMPUTER`).
    The set-aside folder keeps its copy."""
    from engine.handover import PER_COMPUTER

    for name in sorted(PER_COMPUTER):
        mine = kept / "config" / name
        if mine.is_file() and (root / "config").is_dir():
            write_whole(root / "config" / name, mine.read_text(encoding="utf-8"))  # two small settings files, rewritten


def _drop_if_only_plan(kept: Path) -> None:
    """After every rename was taken back, the set-aside folder holds only the plan: remove that. Anything else in it is
    the person's and stays."""
    with contextlib.suppress(OSError):
        if {p.name for p in kept.iterdir()} <= {PLAN}:
            (kept / PLAN).unlink(missing_ok=True)
            kept.rmdir()


def _unfinished(root: Path) -> tuple[Path | None, list[tuple[Path, Path]]]:
    """The plan of a swap the computer stopped in the middle of, with its folder, or None. It is carried on rather than
    planned again: what is already moved is skipped."""
    base = root / ".cockpit" / KEPT
    for folder in sorted(base.glob("*")) if base.is_dir() else []:
        if (folder / PLAN).is_file() and not (folder / DONE).is_file():
            try:
                return folder, [(Path(a), Path(b)) for a, b in json.loads((folder / PLAN).read_text(encoding="utf-8"))]
            except (OSError, ValueError, TypeError):
                break
    return None, []


def _plan(root: Path, staged: Path, now: datetime) -> tuple[Path, list[tuple[Path, Path]]]:
    """The renames of one swap, in order: what the workspace holds aside first, then the restored files in. The plan is
    written before the first one is made."""
    base = root / ".cockpit" / KEPT
    kept = base / _stamp(now)
    n = 2
    while kept.exists():
        kept = base / f"{_stamp(now)}-{n}"
        n += 1
    names = [n for n in REPLACED if (root / n).exists() or (root / n).is_symlink()]
    names += [n for n in REPLACED_WHEN_RESTORED if (staged / n).exists() and (root / n).exists()]
    plan = [(root / n, kept / n) for n in names]
    plan += [(staged / n, root / n) for n in (*REPLACED, *REPLACED_WHEN_RESTORED) if (staged / n).exists()]
    kept.mkdir(parents=True)
    write_whole(kept / PLAN, json.dumps([[str(a), str(b)] for a, b in plan], indent=1) + "\n")
    return kept, plan


def _step(source: Path, target: Path, move: Move) -> None:
    """One rename of the plan. A step already made (the target is there and the source isn't) is skipped; both being
    there is a conflict nothing may be moved over."""
    here = source.exists() or source.is_symlink()
    if target.exists() or target.is_symlink():
        if here:
            raise RestoreError(f"{target.name} is already in the way.")
        return
    if here:
        move(source, target)


def _undo(plan: list[tuple[Path, Path]], move: Move) -> bool:
    """Take the renames made so far back, last first. Returns whether every one went back."""
    clean = True
    for source, target in reversed(plan):
        try:
            if (target.exists() or target.is_symlink()) and not (source.exists() or source.is_symlink()):
                move(target, source)
        except OSError:
            clean = False
    return clean


def _reason(err: Exception, stranded: Path | None) -> str:
    what = (err.strerror if isinstance(err, OSError) and err.strerror else str(err)).rstrip(".")
    what = what[:1].lower() + what[1:]
    text = f"The restore didn't happen, and your workspace is as it was: {what}."
    if stranded is not None:
        text = f"The restore stopped part way and some files couldn't be put back. Everything is kept in {stranded}."
    return text


# ---- the note Today shows -------------------------------------------------------------------------------------------


@dataclass(frozen=True)
class Note:
    state: str
    made_at: str | None
    kept: str | None
    reason: str | None
    kind: str | None


def _note(
    private: Path,
    state: str,
    made_at: str | None,
    *,
    kept: str | None = None,
    reason: str | None = None,
    kind: str | None = None,
) -> None:
    body: dict[str, Any] = {"state": state, "made_at": made_at, "kept": kept, "reason": reason, "kind": kind}
    with contextlib.suppress(OSError):  # a missing note never undoes a swap
        write_whole(private / NOTE, json.dumps(body, indent=2) + "\n")


def note(ws: Workspace) -> Note | None:
    """How the last start's swap went, until the person dismisses it."""
    try:
        data = json.loads((ws.private_dir / NOTE).read_text(encoding="utf-8"))
        state = data["state"]
    except (OSError, ValueError, TypeError, KeyError):
        return None
    if state not in (RESTORED, NOT_RESTORED):
        return None
    return Note(state, data.get("made_at"), data.get("kept"), data.get("reason"), data.get("kind"))


def dismiss(ws: Workspace) -> None:
    (ws.private_dir / NOTE).unlink(missing_ok=True)


def _clear_failure(private: Path) -> None:
    """A failed swap's note goes when the person stages another restore or cancels the one that failed."""
    try:
        if json.loads((private / NOTE).read_text(encoding="utf-8")).get("state") == NOT_RESTORED:
            (private / NOTE).unlink(missing_ok=True)
    except (OSError, ValueError, AttributeError):
        pass


__all__ = [
    "KeyNeeded",
    "RestoreError",
    "Pending",
    "Note",
    "stage",
    "stage_put_back",
    "cancel",
    "pending",
    "note",
    "dismiss",
    "swap_pending",
    "kept_folders",
]
