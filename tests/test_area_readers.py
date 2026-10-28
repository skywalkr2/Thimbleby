"""Which AI accounts may read an area (design 6.32, S4): the picker on an area's page is content levels seen from the
accounts. Ticking an account makes it take the area's own level and unticking one makes it stop; an area everyone reads
needs no level, and a level the project above carries is never changed. Built on the areas tests' workspace: a local
server that takes the private level, a hosted service and a stand-in that take the other."""

from __future__ import annotations

import pytest
import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine import area_readers, areas
from engine.ai.router import accounts
from engine.config import load_config
from engine.storage import Store
from tests.test_areas import _with_accounts, make, personal_of

TOKEN = "readers-token"


@pytest.fixture
def world(tmp_path):
    ws, cfg = _with_accounts(tmp_path)
    store = Store(ws.db_path)
    yield ws, cfg, store
    store.close()


def new_area(store, cfg, name="Health", **more) -> str:
    return make(store, "project", name=name, area=True, parent=personal_of(cfg), **more)


def refs_for(cfg, area_id, store) -> list[str]:
    """What routing offers a request about the area: the accounts that take its levels."""
    return [r.partition("/")[0] for r in accounts(cfg, "internal", frozenset(areas.levels_of(store.read(), area_id)))]


def test_an_area_with_no_level_of_its_own_is_read_by_every_account_and_each_can_be_ticked(world):
    _, cfg, store = world
    area = new_area(store, cfg)
    found = area_readers.choices(store.read(), cfg, area)
    assert [(c.account, c.reads, c.locked) for c in found] == [
        ("stub", True, None),
        ("localbox", True, None),
        ("hosted", True, None),
    ]
    assert area_readers.plan(store.read(), cfg, area, ["stub", "localbox", "hosted"]).changes is False


def test_leaving_an_account_out_gives_the_area_a_level_of_its_own_that_only_the_ticked_accounts_take(world):
    _, cfg, store = world
    area = new_area(store, cfg, name="Health & fitness")
    made = area_readers.plan(store.read(), cfg, area, ["localbox"])
    assert made.new_level == ("area-health-fitness", "Health & fitness")
    assert made.project_levels == ["area-health-fitness"]
    # the ticked account takes the level; the others list their own levels, so they already don't
    assert made.provider_levels == {"localbox": ["private", "area-health-fitness"]}


def test_an_account_that_takes_every_level_stops_taking_this_one_when_unticked(world):
    ws, cfg, store = world
    path = ws.config_dir / "ai.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    data["providers"]["stub"].pop("content_levels", None)
    path.write_text(yaml.safe_dump(data), encoding="utf-8")
    cfg = ws.config(env={})
    area = new_area(store, cfg)
    made = area_readers.plan(store.read(), cfg, area, ["localbox", "hosted"])
    assert sorted(made.provider_levels["stub"]) == ["other", "private"]  # every other level it took before
    assert made.provider_levels["localbox"] == ["private", made.level]
    assert made.provider_levels["hosted"] == ["other", made.level]


def test_an_account_a_level_above_the_area_keeps_out_is_locked_and_cannot_be_ticked(world):
    _, cfg, store = world
    personal = personal_of(cfg)
    with store.transaction() as tx:
        cur = tx.get("project", personal)
        from tests.test_areas import _TEST

        tx.update("project", personal, {"content_levels": ["private"]}, _TEST, read_version=cur.version)
    area = new_area(store, cfg)
    found = {c.account: (c.reads, c.locked) for c in area_readers.choices(store.read(), cfg, area)}
    assert found == {"stub": (False, "parent"), "localbox": (True, None), "hosted": (False, "parent")}
    with pytest.raises(ValueError, match="keeps it out"):
        area_readers.plan(store.read(), cfg, area, ["localbox", "hosted"])
    with pytest.raises(ValueError, match="isn't an account"):
        area_readers.plan(store.read(), cfg, area, ["nobody"])


@pytest.fixture
def api(world):
    ws, cfg, store = world
    store.close()
    app = create_app(ws, cfg, TOKEN, ui_dist=ws.root / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        client.ws, client.cfg, client.store = ws, cfg, app.state.store
        yield client


def knows(client, area):
    return client.get(f"/api/projects/{area}/knows").json()["reading"]


def test_the_page_picks_the_accounts_and_the_choice_is_saved_as_content_levels_with_the_area_edited(api):
    area = new_area(api.store, api.cfg, name="Health")
    assert {c["account"] for c in knows(api, area)["choices"] if c["reads"]} == {"stub", "localbox", "hosted"}
    picked = api.post(f"/api/projects/{area}/readers", json={"accounts": ["localbox"]})
    assert picked.status_code == 200, picked.text
    reading = picked.json()
    assert reading["state"] == "local" and [r["account"] for r in reading["readers"]] == ["localbox"]
    assert {c["account"]: c["reads"] for c in reading["choices"]} == {"stub": False, "localbox": True, "hosted": False}
    assert reading["levels"] == ["area-health"]
    # the settings files and the area's record say it, and routing offers only that account
    saved = load_config(api.ws.config_dir, env={})
    assert saved.ai.content_levels["area-health"] == "Health"
    assert saved.ai.providers["localbox"].content_levels == ["private", "area-health"]
    assert api.store.read().get("project", area).data["content_levels"] == ["area-health"]
    assert refs_for(saved, area, api.store) == ["localbox"]
    # the page reads the same afterwards
    assert knows(api, area) == reading


def test_ticking_the_same_accounts_back_undoes_it_and_the_area_keeps_its_level(api):
    area = new_area(api.store, api.cfg, name="Health")
    api.post(f"/api/projects/{area}/readers", json={"accounts": ["localbox"]})
    back = api.post(f"/api/projects/{area}/readers", json={"accounts": ["stub", "localbox", "hosted"]}).json()
    assert {c["account"]: c["reads"] for c in back["choices"]} == {"stub": True, "localbox": True, "hosted": True}
    assert back["state"] == "away"
    saved = load_config(api.ws.config_dir, env={})
    assert refs_for(saved, area, api.store) == ["stub", "localbox", "hosted"]
    # asking for what is already so changes nothing: no new level, no new setting change
    before = len(api.store.read().list("setting_change"))
    api.post(f"/api/projects/{area}/readers", json={"accounts": ["stub", "localbox", "hosted"]})
    assert len(api.store.read().list("setting_change")) == before


def test_the_choice_is_refused_for_what_is_not_an_area_an_unknown_account_or_one_kept_out_above(api):
    plain = make(api.store, "project", name="Spring trip", parent=personal_of(api.cfg))
    refused = api.post(f"/api/projects/{plain}/readers", json={"accounts": ["localbox"]})
    assert refused.status_code == 409 and "area" in refused.json()["detail"]
    assert api.post("/api/projects/PRJ-999/readers", json={"accounts": []}).status_code == 404
    area = new_area(api.store, api.cfg)
    assert api.post(f"/api/projects/{area}/readers", json={"accounts": ["nobody"]}).status_code == 409
    assert api.post(f"/api/projects/{area}/readers", json={"accounts": [], "extra": 1}).status_code == 422
    # nobody may read it: the page says so
    none = api.post(f"/api/projects/{area}/readers", json={"accounts": []}).json()
    assert none["state"] == "none" and none["readers"] == []


def test_a_project_that_is_not_an_area_has_no_picker(api):
    plain = make(api.store, "project", name="Spring trip", parent=personal_of(api.cfg))
    assert knows(api, plain)["choices"] == []
