"""A one-time offer to rename a folder the app made under its earlier name (design 7.7).

Two folders the person keeps were made under the product's earlier name: the folder for backups inside a cloud drive
(`storage.backups.former_cloud_path`) and the workspace folder in the home folder (`folder_names.FORMER_FOLDER`). When
one is found where the new default would be, Today offers once to rename it. Nothing is moved without the person's yes:
Rename is their own change, and Keep stops the offer for good. A workspace's own folder can't be renamed while it is
open, so its yes is remembered and the rename is made the next time the app starts, before anything opens. A backups
folder named by the workspace's own settings (a `cloud_path` that isn't the shipped default) is the person's choice and
is never offered.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.config.schema import BackupSettings
from engine.folder_names import DEFAULT_FOLDER, FORMER_FOLDER
from engine.state_file import changing, write_whole

STATE_FILE = "folder-offers.json"
BACKUPS = "backups"
WORKSPACE = "workspace"
#: What joins the folders of a path shown to the person.
ARROW = " › "


def state_path(private_dir: Path) -> Path:
    return Path(private_dir) / STATE_FILE


def _read(private_dir: Path) -> dict[str, Any]:
    try:
        data = json.loads(state_path(private_dir).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _names(data: dict[str, Any], key: str) -> set[str]:
    value = data.get(key)
    return {v for v in value if isinstance(v, str)} if isinstance(value, list) else set()


def kept(private_dir: Path) -> set[str]:
    """The offers the person answered Keep to: each is never made again."""
    return _names(_read(private_dir), "kept")


def agreed(private_dir: Path) -> bool:
    """Whether the person said yes to renaming the workspace folder, to be done at the next start."""
    return WORKSPACE in _names(_read(private_dir), "agreed")


def _change(private_dir: Path, key: str, which: str, on: bool) -> None:
    path = state_path(private_dir)
    with changing(path):
        data = _read(private_dir)
        names = _names(data, key)
        names = names | {which} if on else names - {which}
        data[key] = sorted(names)
        write_whole(path, json.dumps(data, indent=2) + "\n")


def keep(private_dir: Path, which: str) -> None:
    """Keep the old name: the offer never comes back."""
    _change(private_dir, "kept", which, True)


def unkeep(private_dir: Path, which: str) -> None:
    """Take Keep back: the offer may be made again."""
    _change(private_dir, "kept", which, False)


def agree(private_dir: Path, on: bool = True) -> None:
    """Remember the yes to renaming the workspace folder at the next start (or take it back)."""
    _change(private_dir, "agreed", WORKSPACE, on)


@dataclass(frozen=True)
class Pair:
    old: Path
    new: Path


def shown(parts: list[str]) -> str:
    """A path of folders as the person reads it: plain names joined with arrows."""
    return ARROW.join(parts)


def backups_pending(cfg: Any, home: Path) -> list[Pair]:
    """The backup folders inside cloud drives found on this computer that sit under the earlier path where the new one
    isn't yet. None when the workspace's own settings name the folder, or when the app is hosted."""
    from engine import cloud_folders

    backups = cfg.storage.backups
    former = list(backups.former_cloud_path)
    default = BackupSettings.model_fields["cloud_path"].get_default(call_default_factory=True)
    if cfg.server.mode == "hosted" or not former or list(backups.cloud_path) != default or former == default:
        return []
    found: list[Pair] = []
    for drive in cloud_folders.found(backups.cloud_folders, home):
        old, new = drive.root.joinpath(*former), drive.root.joinpath(*backups.cloud_path)
        if old.is_dir() and not new.exists():
            found.append(Pair(old, new))
    return found


def workspace_pending(root: Path, home: Path) -> Pair | None:
    """The workspace folder when it is the earlier default one and the new default isn't there yet."""
    old, new = home / FORMER_FOLDER, home / DEFAULT_FOLDER
    if not old.is_dir() or new.exists():
        return None
    try:
        same = root.resolve() == old.resolve()
    except OSError:
        return None
    return Pair(old, new) if same else None


def offers(cfg: Any, private_dir: Path, root: Path, home: Path) -> list[str]:
    """The offers to make now, each once: `backups`, `workspace`. A workspace the environment names is the person's
    own choice of folder, and `apply_agreed` never renames it at start, so it is never offered."""
    from engine.workspace import ENV_WORKSPACE

    held = kept(private_dir)
    found: list[str] = []
    if BACKUPS not in held and backups_pending(cfg, home):
        found.append(BACKUPS)
    named = bool(os.environ.get(ENV_WORKSPACE))
    if WORKSPACE not in held and not named and not agreed(private_dir) and workspace_pending(root, home):
        found.append(WORKSPACE)
    return found


def rename_backups(cfg: Any, home: Path) -> list[Pair]:
    """Rename each pending backup folder. Returns what was renamed; the caller points the backup targets at the new
    folders (and `undo_backups` puts the folders back if that fails)."""
    done: list[Pair] = []
    for pair in backups_pending(cfg, home):
        pair.new.parent.mkdir(parents=True, exist_ok=True)
        os.rename(pair.old, pair.new)
        done.append(pair)
    return done


def undo_backups(done: list[Pair]) -> None:
    for pair in done:
        if pair.new.is_dir() and not pair.old.exists():
            os.rename(pair.new, pair.old)


def retarget(targets: list[dict[str, Any]], done: list[Pair]) -> list[dict[str, Any]]:
    """The backup targets with each one that sat in a renamed folder pointing at the new one."""
    by_old = {os.path.realpath(p.old): str(p.new) for p in done}
    out: list[dict[str, Any]] = []
    for target in targets:
        path = os.path.realpath(os.path.expanduser(str(target["path"])))
        out.append({**target, "path": by_old[path]} if path in by_old else target)
    return out


def apply_agreed(root: Path, home: Path) -> Path:
    """At start: rename the workspace folder when the person said yes to it, and return the folder to open. A folder
    that can't be renamed (the new name appeared, or the move failed) is opened as it is."""
    pair = workspace_pending(root, home)
    if pair is None or not agreed(root / ".cockpit"):
        return root
    try:
        os.rename(pair.old, pair.new)
    except OSError:
        return root
    return pair.new
