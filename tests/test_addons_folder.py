"""Add-ons installed from the app live in their own folder on this computer, outside the Python environment: rebuilding
the environment (a checkout's `uv sync`) leaves them, they load from there at start, ones installed the earlier way
are moved there once, and removing one takes it out of that folder."""

import os
import subprocess
import sys
import sysconfig
from pathlib import Path

from engine import addons, pack_install
from tests.test_pack_install import wheel

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = {"pack_demo/plugin.yaml": "name: packdemo\n"}


def purelib() -> Path:
    return Path(sysconfig.get_paths()["purelib"])


#: The app's own default, kept before each test gives itself an empty folder in its place.
REAL_DEFAULT = addons.default_folder


def listing(folder: Path) -> set[str]:
    return {p.name for p in folder.iterdir()}


def test_the_folder_is_the_one_the_setting_names_else_the_apps_data_place(tmp_path, monkeypatch):
    assert addons.resolve(str(tmp_path / "named")) == tmp_path / "named"
    monkeypatch.setenv(addons.ENV_ADDONS_DIR, str(tmp_path / "from-env"))
    assert addons.resolve() == tmp_path / "from-env"
    monkeypatch.delenv(addons.ENV_ADDONS_DIR)
    monkeypatch.setattr(addons, "default_folder", REAL_DEFAULT)
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "share"))
    monkeypatch.setattr("platform.system", lambda: "Linux")
    assert addons.resolve() == tmp_path / "share" / addons.APP_NAME / "addons"


def test_an_add_on_installs_into_the_add_ons_folder_and_nothing_goes_to_the_environment(tmp_path):
    before = listing(purelib())
    place = addons.activate()
    done = pack_install.install(wheel(extra=MANIFEST))
    assert place == addons.default_folder() / addons.SITE
    assert (place / "pack_demo" / "__init__.py").is_file() and pack_install.installed_here(done.name)
    assert listing(purelib()) == before
    assert str(place) in sys.path


def test_uninstalling_takes_the_add_on_out_of_the_folder():
    place = addons.activate()
    pack_install.install(wheel())
    pack_install.remove("pack-demo")
    assert not (place / "pack_demo").exists() and not list(place.glob("*.dist-info"))


def test_an_add_on_is_found_and_loads_in_a_fresh_start_after_the_environment_is_rebuilt(tmp_path):
    """The person's path: install from the app, rebuild the environment as `uv sync` does (nothing of the add-on is
    in it), start again."""
    before = listing(purelib())
    addons.activate()
    pack_install.install(wheel(extra=MANIFEST))
    assert listing(purelib()) == before  # a rebuilt environment loses nothing: the add-on was never in it
    from engine.workspace import init_workspace

    ws = init_workspace(tmp_path / "ws", git=False)
    script = (
        "import sys\n"
        "from engine.storage import Store\n"
        "store = Store(__import__('pathlib').Path(sys.argv[1]))\n"
        "print('found', 'packdemo' in store.plugins.candidates)\n"
        "from importlib.metadata import entry_points\n"
        "found = [e for e in entry_points(group='pm_cockpit.plugins') if e.name == 'packdemo']\n"
        "print('loads', [e.load().__name__ for e in found])\n"
        "store.close()\n"
    )
    env = {**os.environ, "PYTHONPATH": str(ROOT), addons.ENV_ADDONS_DIR: str(addons.default_folder())}
    run = subprocess.run(
        [sys.executable, "-c", script, str(ws.db_path)],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert run.returncode == 0, run.stderr
    assert "found True" in run.stdout and "loads ['register']" in run.stdout


def test_an_add_on_installed_the_old_way_is_moved_once_and_still_loads(tmp_path):
    old = tmp_path / "environment"
    old.mkdir()
    pack_install.install(wheel(extra=MANIFEST), old)
    (old / "pack_demo" / "__pycache__").mkdir()
    (old / "pack_demo" / "__pycache__" / "x.pyc").write_bytes(b"c")
    (old / "other_pkg").mkdir()
    (old / "other_pkg" / "__init__.py").write_text("")
    (old / "other-1.0.dist-info").mkdir()
    (old / "other-1.0.dist-info" / "INSTALLER").write_text("uv\n")
    (old / "other-1.0.dist-info" / "RECORD").write_text("other_pkg/__init__.py,,\n")
    place = tmp_path / "new"
    moved = pack_install.move_old_installs(place, [old])
    assert moved == ["pack_demo 0.1.0"]
    assert (place / "pack_demo" / "__init__.py").is_file() and (place / "pack_demo" / "plugin.yaml").is_file()
    assert pack_install.installed_here("pack-demo", place)
    assert not (old / "pack_demo").exists() and not (old / "pack_demo-0.1.0.dist-info").exists()
    assert (old / "other_pkg" / "__init__.py").is_file() and (old / "other-1.0.dist-info").is_dir()  # not ours
    assert pack_install.move_old_installs(place, [old]) == []  # once


def test_start_moves_an_add_on_installed_the_old_way_and_it_loads_from_the_folder(tmp_path, monkeypatch):
    old = tmp_path / "environment"
    old.mkdir()
    pack_install.install(wheel(extra=MANIFEST), old)
    monkeypatch.setattr(pack_install, "environment_places", lambda: [old])
    place = addons.activate()
    assert (place / "pack_demo" / "plugin.yaml").is_file() and not (old / "pack_demo").exists()
    from importlib.metadata import entry_points

    assert [e.name for e in entry_points(group="pm_cockpit.plugins") if e.name == "packdemo"] == ["packdemo"]
    assert addons.activate() == place  # starting again changes nothing
