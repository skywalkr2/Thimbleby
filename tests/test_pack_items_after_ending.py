"""A pack's records after the project they belong to ends (design 6.7, project endings): the pack's Today lines (and so
the notices counted from them) skip records of an ended project, a project ending waiting for the person is one line
with its drops inside it and the pack's records listed as left open, and "Keep these" keeps every ticked item in one
action. Uses a fixture add-on; names and ids come from the fixtures.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine import endings, notifications
from engine.applier import apply_as_person
from engine.config import load_config
from engine.dispatcher import undo_changeset
from engine.storage import Store, WriteContext
from engine.today_queue import queue
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.test_knowledge_records import apply, source
from tests.test_project_ending import PROJECT, QUOTE, RAW, ending, open_of, set_status

FIXTURE = """
from typing import Annotated, ClassVar
from engine.plugin_api import OpModel, Record, RefTo, Settings, TodayLine
from typing import Literal

class Config(Settings):
    pass

class Risk(Record):
    record_kind: ClassVar[str] = "pk/risk"
    prefix: ClassVar[str] = "RSK"
    title: str
    project: Annotated[str | None, RefTo("project")] = None

class AddRisk(OpModel):
    op: Literal["pk/add-risk"] = "pk/add-risk"
    writes: ClassVar[dict] = {"pk/risk": ("*",)}
    title: str
    project: str | None = None

def add_risk(op, writer, cfg):
    writer.create("pk/risk", {"title": op.title, "project": op.project})

def lines(view, settings):
    found = [
        TodayLine("risk-" + r.id, "Chase " + r.data["title"], about=("pk/risk", r.id), group="decide")
        for r in view.list("pk/risk")
    ]
    return found + [TodayLine("general", "Look at the weekly summary", group="decide")]

def register(registrar):
    registrar.record_type(Risk)
    registrar.op(AddRisk, "data", add_risk)
    registrar.today("pk/open", lines=lines)
"""

MANIFEST = {
    "name": "pk",
    "version": "0.1.0",
    "plugin_api": ">=0.3,<0.4",
    "description": "A pack whose records refer to a project",
    "entry": "fixture:register",
    "config_schema": "fixture:Config",
    "provides": {"record_types": ["pk/risk"], "ops": ["pk/add-risk"], "today": ["pk/open"]},
}
_TEST = WriteContext(actor="pm", trust="trusted", op="test.pack-items")
OTHER = next(p["id"] for p in fixture_records(DEMO_B, "project") if p["id"] != PROJECT["id"])
NOW = datetime(2026, 10, 14, 9, 0, tzinfo=UTC)


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    plugin = ws.root / "plugins" / "pk"
    plugin.mkdir(parents=True)
    (plugin / "fixture.py").write_text(FIXTURE)
    (plugin / "plugin.yaml").write_text(yaml.safe_dump(MANIFEST))
    settings = yaml.safe_load((ws.config_dir / "workspace.yaml").read_text())
    settings["plugins"]["enabled"] = [*settings["plugins"]["enabled"], "pk"]
    (ws.config_dir / "workspace.yaml").write_text(yaml.safe_dump(settings))
    storage = yaml.safe_load((ws.config_dir / "storage.yaml").read_text())
    storage["backups"]["automatic"] = False
    (ws.config_dir / "storage.yaml").write_text(yaml.safe_dump(storage))
    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    assert store.plugins.active("pk"), store.plugins.status["pk"].reason
    yield ws, cfg, store
    store.close()


def risks(cfg, store, **by_project):
    """One risk of the pack for each (title, project) given, in order."""
    for title, project in by_project.items():
        apply_as_person(store, cfg, [{"op": "pk/add-risk", "title": title, "project": project}], "Add a risk")


def held_ending(cfg, store):
    """The project's ending read from an input, waiting whole, with its request linked so Today shows it."""
    cs_id, result = apply(
        store,
        cfg,
        [set_status(ending(cfg, store), quote=QUOTE)],
        origin="input",
        trust="untrusted",
        source_id=source(store),
        raw=RAW,
    )
    assert set(result) == {"held"}
    view = store.read()
    request = next(r for r in view.list("request") if r.data.get("origin") == "input" and not r.data.get("changeset"))
    with store.transaction() as tx:
        tx.update(
            "request",
            request.id,
            {"changeset": cs_id, "state": "review"},
            _TEST,
            read_version=request.version,
        )
    return cs_id


def today_texts(store):
    return [line.text for _, line in store.plugins.today()]


def test_a_packs_lines_skip_records_of_an_ended_project_and_keep_the_rest(env):
    _, cfg, store = env
    risks(cfg, store, **{"Kept chase": OTHER, "Ended chase": PROJECT["id"]})
    assert today_texts(store) == ["Chase Kept chase", "Chase Ended chase", "Look at the weekly summary"]
    apply(store, cfg, [set_status(ending(cfg, store))], actor="pm")
    # The line about a record of the ended project is gone; one about another project's record, and one about no
    # record, stay.
    assert today_texts(store) == ["Chase Kept chase", "Look at the weekly summary"]
    # The records themselves are untouched: only the add-on knows whether they are closed.
    assert {r.data["title"] for r in store.read().list("pk/risk")} == {"Kept chase", "Ended chase"}


def test_a_paused_project_keeps_its_packs_lines(env):
    _, cfg, store = env
    risks(cfg, store, **{"Chase": PROJECT["id"]})
    from tests.test_project_ending import statuses

    apply(store, cfg, [set_status(statuses(cfg, store)["blocked"])], actor="pm")
    assert "Chase Chase" in today_texts(store)


def test_the_notices_counted_from_todays_decide_lines_leave_out_the_ended_projects_records(env):
    ws, cfg, store = env
    risks(cfg, store, **{"Kept chase": OTHER, "Ended chase": PROJECT["id"]})
    before = [k for k in notifications.decide_keys(ws, store, cfg, NOW) if k.startswith("plugin:pk:")]
    apply(store, cfg, [set_status(ending(cfg, store))], actor="pm")
    after = [k for k in notifications.decide_keys(ws, store, cfg, NOW) if k.startswith("plugin:pk:")]
    assert len(before) == 3 and len(after) == 2
    assert not [k for k in after if "risk-" in k and PROJECT["id"] in k]


def test_the_ending_waiting_for_the_person_is_one_line_with_its_drops_inside_it(env):
    ws, cfg, store = env
    cs_id = held_ending(cfg, store)
    actions, questions = open_of(store)
    lines = queue(ws, store, cfg, NOW)
    (line,) = [each for each in lines if each.kind == "project_ending"]
    assert (line.group, line.changeset, line.count) == ("decide", cs_id, len(actions) + len(questions))
    assert set(line.actions) == set(actions) and set(line.questions) == set(questions)
    assert line.subject == PROJECT["name"]
    # None of its items is a line of its own.
    held = [each for each in lines if each.kind == "held" and each.changeset == cs_id]
    assert held == []


def test_the_pack_items_left_behind_are_listed_and_never_called_closed(env):
    _, cfg, store = env
    risks(cfg, store, **{"Ended chase": PROJECT["id"], "Other chase": OTHER})
    left = endings.left_behind(store, PROJECT["id"])
    assert [(each.kind, each.title) for each in left] == [("pk/risk", "Ended chase")]


def test_keep_these_keeps_every_ticked_item_in_one_action_and_the_rest_drop_with_the_ending(env):
    _, cfg, store = env
    cs_id = held_ending(cfg, store)
    actions, questions = open_of(store)
    (held,) = endings.held_endings(store.read(), cs_id, store.read().get("changeset", cs_id).data["ops"])
    keep = [item.index for item in held.items if item.id in actions[:2]]
    assert len(keep) == 2
    before = len(store.read().list("signal"))
    endings.finish_ending(store, cfg, cs_id, held.index, keep)
    view = store.read()
    assert all(view.get("action", a).data["status"] in ("open", "held") for a in actions[:2])
    assert all(view.get("action", a).data["status"] == "dropped" for a in actions[2:])
    assert all(view.get("question", q).data["status"] == "dropped" for q in questions)
    assert view.get("project", PROJECT["id"]).data["status"] == ending(cfg, store)
    assert len(view.list("signal")) == before + 2  # one signal for each item the person kept
    # One Undo of the change takes the ending and the drops back; what was kept was never dropped.
    undo_changeset(store, cs_id)
    assert open_of(store) == (actions, questions)
    assert store.read().get("project", PROJECT["id"]).data["status"] == PROJECT["status"]


def test_keep_these_refuses_an_index_that_is_not_one_of_the_endings_items(env):
    _, cfg, store = env
    cs_id = held_ending(cfg, store)
    (held,) = endings.held_endings(store.read(), cs_id, store.read().get("changeset", cs_id).data["ops"])
    with pytest.raises(Exception, match="isn't an item"):
        endings.finish_ending(store, cfg, cs_id, held.index, [held.index])
    assert store.read().get("project", PROJECT["id"]).data["status"] == PROJECT["status"]


def test_keeping_the_project_declines_the_ending_and_every_drop_together(env):
    ws, cfg, store = env
    cs_id = held_ending(cfg, store)
    actions, questions = open_of(store)
    (held,) = endings.held_endings(store.read(), cs_id, store.read().get("changeset", cs_id).data["ops"])
    endings.decline_ending(store, cs_id, held.index)
    assert open_of(store) == (actions, questions)
    assert store.read().get("project", PROJECT["id"]).data["status"] == PROJECT["status"]
    assert not [each for each in queue(ws, store, cfg, NOW) if each.kind == "project_ending"]
    ops = store.read().get("changeset", cs_id).data["ops"]
    assert {o["status"] for o in ops} == {"undone"}


def test_the_screen_reads_and_settles_the_waiting_ending_through_the_api(env, tmp_path):
    ws, cfg, store = env
    risks(cfg, store, **{"Ended chase": PROJECT["id"]})
    cs_id = held_ending(cfg, store)
    actions, questions = open_of(store)
    store.close()
    token = "test-token"
    app = create_app(ws, cfg, token, ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        lines = client.get("/api/today/queue").json()
        (line,) = [each for each in lines if each["kind"] == "project_ending"]
        path = f"/api/changesets/{cs_id}/ops/{line['op']}/project-ending"
        view = client.get(path).json()
        assert view["project_name"] == PROJECT["name"]
        assert {item["id"] for item in view["items"]} == set(actions) | set(questions)
        assert [(each["kind"], each["title"]) for each in view["left_open"]] == [("pk/risk", "Ended chase")]
        keep = [item["index"] for item in view["items"] if item["id"] == actions[0]]
        done = client.post(path, json={"end": True, "keep": keep})
        assert done.status_code == 200, done.text
        assert not [each for each in client.get("/api/today/queue").json() if each["kind"] == "project_ending"]
        assert client.get(path).status_code == 404  # nothing waits any more
        now = app.state.store.read()
        assert now.get("action", actions[0]).data["status"] in ("open", "held")
        assert all(now.get("action", a).data["status"] == "dropped" for a in actions[1:])
