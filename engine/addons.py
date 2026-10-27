"""Where add-ons installed from the app are kept on this computer, and putting them on the import path at start.

The folder is outside the Python environment the app runs in, so rebuilding that environment (a source checkout's
`uv sync`, a reinstall of the app) never removes an add-on. It is in the app's own data place for the system
(`engine/app_dirs.py`) unless `server.addons_dir` (or `COCKPIT__SERVER__ADDONS_DIR`) names another folder."""

from __future__ import annotations

import logging
import os
import platform
import site
import sys
from collections.abc import Mapping
from pathlib import Path

#: The environment variable that names the folder, the same name every setting has (`server.addons_dir`).
ENV_ADDONS_DIR = "COCKPIT__SERVER__ADDONS_DIR"
#: The folder the app's data place is named by.
APP_NAME = "cockpit"
#: Inside the add-ons folder: the packages themselves, one folder for pure Python and compiled libraries alike.
SITE = "site"

log = logging.getLogger(__name__)

_active: Path | None = None


def default_folder(env: Mapping[str, str] | None = None) -> Path:
    """The add-ons folder in this computer's app data place, by the system's own convention."""
    from engine.app_dirs import app_dirs

    env = os.environ if env is None else env
    args = (platform.system() or "Linux", env, Path.home(), APP_NAME)
    try:
        return Path(app_dirs(*args, install_dir=Path(__file__).resolve().parents[1]).addons)
    except ValueError:
        # No place outside the app's own folder was found (a home folder inside it): use the plain place.
        return Path(app_dirs(*args).addons)


def resolve(configured: str | None = None) -> Path:
    """The add-ons folder by the settings: the one given, else the environment's, else the app data place."""
    if configured:
        return Path(configured).expanduser()
    named = os.environ.get(ENV_ADDONS_DIR, "").strip()
    return Path(named).expanduser() if named else default_folder()


def folder() -> Path:
    """The add-ons folder in use: the one activated at start, or the one the settings name before that."""
    return _active if _active is not None else resolve()


def site_folder() -> Path:
    """The folder packages are unpacked into, and the one put on the import path."""
    return folder() / SITE


def activate(configured: str | None = None) -> Path:
    """Put the add-ons folder on the import path (and so on the path add-on entry points are found on), and move any
    add-on installed the old way, into the Python environment, here. Called once at start before add-ons are
    discovered; calling it again with the same folder changes nothing. Returns the folder holding the packages."""
    global _active
    root = resolve(configured)
    _active = root
    place = root / SITE
    try:
        place.mkdir(parents=True, exist_ok=True)
    except OSError as err:
        log.warning("The add-ons folder %s can't be made (%s); add-ons installed from the app won't load.", place, err)
        return place
    if str(place) not in sys.path:
        site.addsitedir(str(place))  # appends, so the app's own packages win, and reads any .pth files
    import importlib

    importlib.invalidate_caches()
    from engine import pack_install

    try:
        moved = pack_install.move_old_installs(place)
    except OSError as err:
        log.warning("Add-ons installed in the app's own folders couldn't be moved to %s: %s", place, err)
        moved = []
    for line in moved:
        log.info("Moved the add-on %s from the app's own packages to %s.", line, place)
    if moved:
        importlib.invalidate_caches()
    return place
