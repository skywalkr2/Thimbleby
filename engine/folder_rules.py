"""Folders the app never browses into or keeps anything in: the ones the computer uses for itself.

The rule is fixed (it does not depend on how the app is deployed) and it is the one place that names those folders, so
the folder chooser, the backup folder check and the synced folder check refuse the same ones. Anything inside the
person's own home folder is always allowed."""

from __future__ import annotations

import os
from pathlib import Path

#: Folders whose whole tree belongs to the computer, on the systems that have them (the first part of each is the root).
_TREES = (
    "/bin",
    "/boot",
    "/dev",
    "/etc",
    "/lib",
    "/lib32",
    "/lib64",
    "/proc",
    "/run",
    "/sbin",
    "/sys",
    "/usr",
    "/var/lib",
    "/var/log",
    "/var/run",
    "/var/spool",
    "/System",
    "/Library",
    "/Applications",
    "/private/etc",
    "/private/var/db",
)

#: The plain reason shown where one of these was chosen.
SYSTEM_FOLDER_PROBLEM = "That folder belongs to the computer itself. Choose one of your own folders."


def _windows_trees() -> tuple[Path, ...]:
    names = ("SystemRoot", "ProgramFiles", "ProgramFiles(x86)", "ProgramData")
    return tuple(Path(v) for v in (os.environ.get(n) for n in names) if v)


def _home() -> Path | None:
    try:
        return Path.home().resolve()
    except (OSError, RuntimeError):
        return None


def is_system_folder(folder: Path) -> bool:
    """Whether a folder (already resolved) is the top of a drive or inside one the computer keeps for itself. A folder
    inside the person's home is never one."""
    home = _home()
    if home is not None and (folder == home or folder.is_relative_to(home)):
        return False
    if folder == Path(folder.anchor):
        # The top of the computer's own drive; the top of another drive (a USB drive, say) is the person's to use.
        drive = os.environ.get("SYSTEMDRIVE", "C:").upper()
        return os.name != "nt" or folder.drive.upper() == drive
    if os.name == "nt":
        return any(folder == tree or folder.is_relative_to(tree) for tree in _windows_trees())
    return any(folder == Path(tree) or folder.is_relative_to(tree) for tree in _TREES)


def system_folder_problem(folder: Path) -> str | None:
    """Why a folder can't be browsed or used, in plain words, or None."""
    return SYSTEM_FOLDER_PROBLEM if is_system_folder(folder) else None


def trail(folder: Path) -> list[tuple[str, str, bool]]:
    """The folders from where the person can start down to this one, each as (name, path, is the home folder): inside
    the home folder it starts there, and elsewhere below the parts the computer keeps for itself, so a breadcrumb never
    offers one."""
    home = _home()
    steps = [*reversed(folder.parents), folder]
    if home is not None and folder.is_relative_to(home):
        steps = [s for s in steps if s == home or s.is_relative_to(home)]
    found: list[tuple[str, str, bool]] = []
    for step in steps:
        if not found and is_system_folder(step):
            continue
        found.append((step.name or str(step), str(step), step == home))
    return found
