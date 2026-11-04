"""Two saves of settings that overlap never lose an edit (the quick-edits area): the files are read, changed and
written back, so a save that read them before another finished must not write them over it. One of two overlapping
saves waits for the other and is then refused as out of date; if both are accepted, both changes are in the files."""

from __future__ import annotations

import threading

import pytest

from engine import settings
from engine.settings import SettingsConflict, fingerprint
from engine.storage import Store
from engine.workspace import init_workspace
from engine.yaml_load import load_yaml
from tests.conftest import DEMO_B


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def test_two_overlapping_saves_never_lose_an_edit(env, monkeypatch):
    ws, cfg, store = env
    stale = fingerprint(ws.config_dir)
    inside, release = threading.Event(), threading.Event()
    real = settings._check_whole
    first = []

    def held_open(*args, **kwargs):
        # The first save has read the files and is about to write them: it waits here until the second has been tried.
        if not first:
            first.append(True)
            inside.set()
            release.wait(10)
        return real(*args, **kwargs)

    monkeypatch.setattr(settings, "_check_whole", held_open)
    outcome: dict[str, object] = {}

    def run(name, key, value):
        try:
            settings.save(ws, cfg, store, changes={key: value}, reset=[], read_fingerprint=stale, env={})
            outcome[name] = "saved"
        except SettingsConflict:
            outcome[name] = "refused"

    one = threading.Thread(target=run, args=("one", "workspace.name", "First Name"))
    two = threading.Thread(target=run, args=("two", "workspace.assistant_name", "Second"))
    one.start()
    assert inside.wait(10)
    two.start()
    two.join(0.5)  # unlocked, the second finishes here; locked, it is still waiting for the first
    release.set()
    one.join(10)
    two.join(10)
    held = load_yaml((ws.config_dir / "workspace.yaml").read_text(encoding="utf-8"))
    saved = {
        k: v
        for k, v in {"one": held.get("name"), "two": held.get("assistant_name")}.items()
        if v in ("First Name", "Second")
    }
    accepted = [n for n, o in outcome.items() if o == "saved"]
    assert accepted, "one of the two saves is accepted"
    assert set(saved) == set(accepted), "every accepted save is in the files"
