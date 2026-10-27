"""A connection's data level follows the side it serves (the UI/UX review; design 6.32, 7.15): it is not asked
in setup. A connection that serves only the person's own life takes the most private level; one that serves a business
takes that business's level; one that serves several takes the most private of them; a level the connection sets for
itself wins, and clearing it goes back to following its sides. The level and where it comes from are on the
connection's row, and the person changes it there."""

from __future__ import annotations

import yaml

from engine import sides, watch
from engine.config import load_config
from tests.test_sign_in import signing as signing  # noqa: F401 - the fixture
from tests.test_sign_in_sources import _app, _with_sources, sign_in, sources
from tests.test_walkthrough import FIRST_BUSINESS, _add_side, _fresh


def _sources_file(ws, entries):
    path = ws.config_dir / "watch.yaml"
    config = yaml.safe_load(path.read_text()) or {"version": 1}
    config["sources"] = entries
    path.write_text(yaml.safe_dump(config))
    return load_config(ws.config_dir, env={})


def _mailbox(source_id, **more):
    return {"id": source_id, "connector": "mailbox", "label": source_id, "settings": {}, **more}


def test_a_connection_serving_only_the_personal_side_takes_the_most_private_level(tmp_path):
    ws, _ = _fresh(tmp_path)
    cfg = _sources_file(ws, [_mailbox("mine", sides=[ws.config(env={}).workspace.project.personal])])
    level, origin, followed = watch.data_level_source(cfg, cfg.watch.sources[0])
    assert (level, origin) == ("restricted", "side") and followed == [cfg.workspace.project.personal]
    assert watch.data_level_of(cfg, cfg.watch.sources[0]) == "restricted"


def test_a_connection_serving_a_business_takes_that_businesss_level_and_several_take_the_most_private(tmp_path):
    ws, c = _fresh(tmp_path)
    business = _add_side(c, FIRST_BUSINESS, "business")
    cfg = ws.config(env={})
    personal = cfg.workspace.project.personal
    assert cfg.workspace.project.sides[0].data_level == "internal"  # a business's level starts as internal
    cfg = _sources_file(ws, [_mailbox("shop", sides=[business]), _mailbox("both", sides=[business, personal])])
    shop, both = cfg.watch.sources
    assert watch.data_level_source(cfg, shop)[:2] == ("internal", "side")
    level, origin, followed = watch.data_level_source(cfg, both)
    assert (level, origin) == ("restricted", "side") and followed == [personal]
    # The business's own setting is what its connections follow.
    side = cfg.workspace.project.sides[0].model_copy(update={"data_level": "open"})
    cfg.workspace.project.sides[0] = side
    assert watch.data_level_of(cfg, shop) == "open"


def test_a_level_the_connection_sets_wins_and_one_that_serves_no_side_keeps_the_older_order(tmp_path):
    ws, _ = _fresh(tmp_path)
    personal = ws.config(env={}).workspace.project.personal
    cfg = _sources_file(
        ws,
        [
            _mailbox("own", sides=[personal], data_level="open"),
            _mailbox("plain"),
            _mailbox("kind"),
        ],
    )
    own, plain, kind = cfg.watch.sources
    assert watch.data_level_source(cfg, own) == ("open", "source", [])
    assert watch.data_level_source(cfg, plain) == (cfg.watch.default_data_level, "default", [])
    cfg.watch.connector_data_levels["mailbox"] = "open"
    assert watch.data_level_source(cfg, kind) == ("open", "kind", [])


def test_a_connection_added_with_nothing_beside_personal_serves_it_and_one_added_with_a_side_says_nothing(tmp_path):
    ws, c = _fresh(tmp_path)
    personal = ws.config(env={}).workspace.project.personal
    assert sides.alone_with_personal(ws.config(env={})) == personal
    fingerprint = c.get("/api/settings").json()["fingerprint"]
    body = {"connector": "folder", "label": "Notes", "settings": {"path": str(tmp_path)}, "fingerprint": fingerprint}
    assert c.post("/api/watch/sources", json=body).status_code == 200
    first = load_config(ws.config_dir, env={}).watch.sources[0]
    assert first.sides == [personal]
    # Once a side exists a new connection says nothing: the mail step asks which side it serves.
    _add_side(c, FIRST_BUSINESS, "business")
    fingerprint = c.get("/api/settings").json()["fingerprint"]
    body = {"connector": "folder", "label": "Orders", "settings": {"path": str(tmp_path)}, "fingerprint": fingerprint}
    assert c.post("/api/watch/sources", json=body).status_code == 200
    assert load_config(ws.config_dir, env={}).watch.sources[1].sides == []


def test_the_row_says_the_level_and_what_it_follows_and_changing_it_sets_the_connections_own(tmp_path):
    ws, c = _fresh(tmp_path)
    personal = ws.config(env={}).workspace.project.personal
    fingerprint = c.get("/api/settings").json()["fingerprint"]
    body = {"connector": "folder", "label": "Notes", "settings": {"path": str(tmp_path)}, "fingerprint": fingerprint}
    assert c.post("/api/watch/sources", json=body).status_code == 200
    row = c.get("/api/watch").json()[0]
    assert (row["data_level"], row["data_level_from"], row["data_level_own"]) == ("restricted", "side", None)
    assert row["data_level_sides"] == [c.app.state.store.read().get("project", personal).data["name"]]
    assert row["data_level_side_level"] == "restricted"
    fingerprint = c.get("/api/settings").json()["fingerprint"]
    changed = c.post(f"/api/watch/sources/{row['id']}", json={"data_level": "internal", "fingerprint": fingerprint})
    assert changed.status_code == 200, changed.text
    row = c.get("/api/watch").json()[0]
    assert (row["data_level"], row["data_level_from"], row["data_level_own"]) == ("internal", "source", "internal")
    assert row["data_level_side_level"] == "restricted"  # what following its side would give, for the choice
    # Clearing it goes back to following its sides.
    fingerprint = c.get("/api/settings").json()["fingerprint"]
    cleared = c.post(f"/api/watch/sources/{row['id']}", json={"data_level": None, "fingerprint": fingerprint})
    assert cleared.status_code == 200, cleared.text
    row = c.get("/api/watch").json()[0]
    assert (row["data_level"], row["data_level_from"], row["data_level_own"]) == ("restricted", "side", None)
    # A change that names no level leaves it alone.
    fingerprint = c.get("/api/settings").json()["fingerprint"]
    assert (
        c.post(f"/api/watch/sources/{row['id']}", json={"label": "Notes 2", "fingerprint": fingerprint}).status_code
        == 200
    )
    assert c.get("/api/watch").json()[0]["data_level_from"] == "side"


def test_a_connection_started_by_a_sign_in_serves_the_personal_side_when_there_is_nothing_beside_it(signing):  # noqa: F811
    ws, cfg, store, _ = signing
    store.close()
    _with_sources(ws)
    config = yaml.safe_load((ws.config_dir / "workspace.yaml").read_text())
    config.setdefault("project", {})["personal"] = "PRJ-1"
    (ws.config_dir / "workspace.yaml").write_text(yaml.safe_dump(config))
    c, api = _app(ws, load_config(ws.config_dir, env={}))
    sign_in(c, api)
    added = [s for s in sources(ws) if s["connector"] == "p18/inbox"]
    assert added[0]["sides"] == ["PRJ-1"]
