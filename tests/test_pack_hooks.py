"""A pack follows a project's ending and a dropped action (design 3.5, 6.7): `registrar.project_ending` and
`registrar.on_drop` return the pack's own ops, which join the core's op group, so there is one Undo, one held proposal
when the change came from an input, and one keep list. A hook that fails or hangs adds nothing and leaves the pack's
records listed as left open; a hook may return only its own pack's ops. The pack is a fixture written here; names and
ids come from the workspace's fixtures."""

from __future__ import annotations

import pytest
import yaml

from engine.plugin_api import DROP_HOOK_KINDS, Registrar, Settings
from engine.plugin_api.testing import PluginDidNotStart, plugin_workspace
from tests.conftest import DEMO_B, fixture_records

FIRST = next(p for p in fixture_records(DEMO_B, "project") if p.get("status"))
PROJECT = FIRST["id"]
OTHER = next(p["id"] for p in fixture_records(DEMO_B, "project") if p["id"] != PROJECT)

PACK = """
import threading
from typing import Annotated, ClassVar, Literal
from pydantic import Field
from engine.plugin_api import OpModel, Record, RefTo, Settings

class Config(Settings):
    mode: Literal["ok", "raise", "hang", "core", "other"] = Field("ok", description="What the hooks do.")

class Risk(Record):
    record_kind: ClassVar[str] = "pk/risk"
    prefix: ClassVar[str] = "RSK"
    title: str
    status: Literal["open", "closed"] = "open"
    project: Annotated[str | None, RefTo("project")] = None
    action: Annotated[str | None, RefTo("action")] = None

class AddRisk(OpModel):
    op: Literal["pk/add-risk"] = "pk/add-risk"
    writes: ClassVar[dict] = {"pk/risk": ("*",)}
    title: str
    project: str | None = None
    action: str | None = None

class CloseRisk(OpModel):
    op: Literal["pk/close-risk"] = "pk/close-risk"
    writes: ClassVar[dict] = {"pk/risk": ("status",)}
    id: str

    def describe(self, view):
        found = view.get("pk/risk", self.id)
        return "Close the risk '%s'" % found.data["title"] if found else None

def add_risk(op, writer, cfg):
    writer.create("pk/risk", {"title": op.title, "project": op.project, "action": op.action})

def close_risk(op, writer, cfg):
    found = writer.get("pk/risk", op.id)
    writer.update("pk/risk", op.id, {"status": "closed"}, read_version=found.version)

def misbehave(settings, target):
    if settings.mode == "raise":
        raise RuntimeError("broken on purpose")
    if settings.mode == "hang":
        threading.Event().wait(3)
    if settings.mode == "core":
        return [{"op": "record.set", "kind": "project", "id": target, "field": "name", "value": "Taken over"}]
    if settings.mode == "other":
        return [{"op": "qk/add-note", "title": "Not mine"}]
    return None

def ending(project_id, view, settings):
    odd = misbehave(settings, project_id)
    if odd is not None:
        return odd
    return [CloseRisk(id=r.id) for r in view.list("pk/risk", project=project_id) if r.data["status"] == "open"]

def dropped(action_id, view, settings):
    odd = misbehave(settings, action_id)
    if odd is not None:
        return odd
    return [
        {"op": "pk/close-risk", "id": r.id}
        for r in view.list("pk/risk", action=action_id)
        if r.data["status"] == "open"
    ]

def register(registrar):
    registrar.record_type(Risk)
    registrar.op(AddRisk, "data", add_risk)
    registrar.op(CloseRisk, "data", close_risk)
    registrar.project_ending(ending)
    registrar.on_drop("action", dropped)
"""

OTHER_PACK = """
from typing import ClassVar, Literal
from engine.plugin_api import OpModel, Record, Settings

class Config(Settings):
    pass

class Note(Record):
    record_kind: ClassVar[str] = "qk/note"
    prefix: ClassVar[str] = "QNT"
    title: str

class AddNote(OpModel):
    op: Literal["qk/add-note"] = "qk/add-note"
    writes: ClassVar[dict] = {"qk/note": ("*",)}
    title: str

def add_note(op, writer, cfg):
    writer.create("qk/note", {"title": op.title})

def register(registrar):
    registrar.record_type(Note)
    registrar.op(AddNote, "data", add_note)
"""


def folder(tmp_path, name, code, provides):
    path = tmp_path / name
    path.mkdir()
    (path / "fixture.py").write_text(code)
    manifest = {
        "name": name,
        "version": "0.1.0",
        "plugin_api": ">=0.3,<0.4",
        "description": "A fixture pack",
        "entry": "fixture:register",
        "config_schema": "fixture:Config",
        "provides": provides,
    }
    (path / "plugin.yaml").write_text(yaml.safe_dump(manifest))
    return path


@pytest.fixture
def packs(tmp_path):
    return [
        folder(tmp_path, "pk", PACK, {"record_types": ["pk/risk"], "ops": ["pk/add-risk", "pk/close-risk"]}),
        folder(tmp_path, "qk", OTHER_PACK, {"record_types": ["qk/note"], "ops": ["qk/add-note"]}),
    ]


def workspace(tmp_path, packs, mode="ok"):
    return plugin_workspace(*packs, root=tmp_path / "ws", settings={"pk": {"mode": mode}})


def open_actions(ws, project=PROJECT):
    return sorted(
        a.id
        for a in ws.store.read().list("action")
        if a.data.get("project") == project and a.data["status"] in ("open", "held")
    )


def risk(ws, title, **fields):
    ws.apply([{"op": "pk/add-risk", "title": title, **fields}])
    return ws.view().find("pk/risk", title=title)


def status_of(ws, record):
    return ws.store.read().get("pk/risk", record.id).data["status"]


def test_ending_a_project_closes_the_packs_records_in_the_same_group_and_one_undo_restores_all(tmp_path, packs):
    with workspace(tmp_path, packs) as ws:
        ended, kept = risk(ws, "Ended risk", project=PROJECT), risk(ws, "Other risk", project=OTHER)
        before = open_actions(ws)
        assert before
        done = ws.end_project(PROJECT)
        assert done.status == "applied"
        assert status_of(ws, ended) == "closed" and status_of(ws, kept) == "open"
        assert open_actions(ws) == []
        pack_ops = [o for o in done.ops if o["op"]["op"] == "pk/close-risk"]
        ending_op = next(o for o in done.ops if o["op"]["op"] == "record.set")
        assert len(pack_ops) == 1 and pack_ops[0]["op"]["id"] == ended.id
        assert {o["group"] for o in done.ops} == {
            ending_op["group"]
        }  # one group: the ending, the drops and the pack's op
        ws.undo(done)
        assert status_of(ws, ended) == "open" and open_actions(ws) == before
        assert ws.view().get("project", PROJECT).data["status"] == FIRST["status"]


def test_an_ending_read_from_an_input_holds_the_packs_items_with_the_rest_and_the_keep_list_keeps_one(tmp_path, packs):
    with workspace(tmp_path, packs) as ws:
        first, second = risk(ws, "First risk", project=PROJECT), risk(ws, "Second risk", project=PROJECT)
        actions = open_actions(ws)
        held = ws.end_project(PROJECT, as_person=False)
        assert held.status == "held" and {o["status"] for o in held.ops} == {"held"}
        assert status_of(ws, first) == "open" and open_actions(ws) == actions  # nothing applied yet
        (waiting,) = ws.ending_items(held)
        others = [i for i in waiting["items"] if i["kind"] == "other"]
        assert {i["text"] for i in others} == {"Close the risk 'First risk'", "Close the risk 'Second risk'"}
        assert len([i for i in waiting["items"] if i["kind"] == "action"]) == len(actions)
        # The records an item closes are not also listed as left open.
        assert ws.left_open(PROJECT, [i["id"] for i in others]) == []
        assert {each["id"] for each in ws.left_open(PROJECT)} == {first.id, second.id}
        keep = next(i["index"] for i in others if i["id"] == first.id)
        before = len(ws.store.read().list("signal"))
        ws.finish_ending(held, keep=[keep])
        assert status_of(ws, first) == "open" and status_of(ws, second) == "closed"
        assert open_actions(ws) == []
        assert len(ws.store.read().list("signal")) == before + 1  # one signal for the item kept


def test_keeping_the_project_declines_the_packs_items_with_the_rest(tmp_path, packs):
    with workspace(tmp_path, packs) as ws:
        ended = risk(ws, "Ended risk", project=PROJECT)
        actions = open_actions(ws)
        held = ws.end_project(PROJECT, as_person=False)
        ws.decline_ending(held)
        assert status_of(ws, ended) == "open" and open_actions(ws) == actions
        assert ws.view().get("project", PROJECT).data["status"] == FIRST["status"]


@pytest.mark.parametrize("mode", ["raise", "hang"])
def test_a_hook_that_fails_or_hangs_leaves_the_records_listed_as_left_open_and_the_ending_still_applies(
    tmp_path, packs, mode
):
    with workspace(tmp_path, packs, mode) as ws:
        ws.store.plugins.pack_calls._limit = lambda: 0.05
        ended = risk(ws, "Ended risk", project=PROJECT)
        done = ws.end_project(PROJECT)
        assert done.status == "applied"
        assert not [o for o in done.ops if o["op"]["op"] == "pk/close-risk"]
        assert open_actions(ws) == [] and status_of(ws, ended) == "open"  # the core's part went ahead
        assert [(each["kind"], each["id"]) for each in ws.left_open(PROJECT)] == [("pk/risk", ended.id)]
        assert any("project-ending hook failed" in note for note in ws.status("pk").notes)


def test_a_hook_that_fails_leaves_a_waiting_ending_with_the_record_listed_as_left_open(tmp_path, packs):
    with workspace(tmp_path, packs, "raise") as ws:
        ended = risk(ws, "Ended risk", project=PROJECT)
        held = ws.end_project(PROJECT, as_person=False)
        (waiting,) = ws.ending_items(held)
        assert not [i for i in waiting["items"] if i["kind"] == "other"]
        assert [each["id"] for each in ws.left_open(PROJECT)] == [ended.id]


@pytest.mark.parametrize("mode", ["core", "other"])
def test_a_hook_returning_a_core_record_or_another_packs_op_is_refused_and_touches_nothing(tmp_path, packs, mode):
    with workspace(tmp_path, packs, mode) as ws:
        name = ws.view().get("project", PROJECT).data["name"]
        done = ws.end_project(PROJECT)
        assert ws.view().get("project", PROJECT).data["name"] == name
        assert not [o for o in done.ops if o["op"]["op"] in ("qk/add-note",)]
        assert not ws.view("qk").list("qk/note")
        assert ws.status("pk").state == "disabled" and "own ops" in (ws.status("pk").reason or "")
        assert open_actions(ws) == []  # the core's own drops were not held back by the pack's mistake


def test_dropping_an_action_closes_the_paired_record_and_one_undo_brings_both_back(tmp_path, packs):
    with workspace(tmp_path, packs) as ws:
        action = open_actions(ws)[0]
        paired, unpaired = risk(ws, "Paired risk", action=action), risk(ws, "Unpaired risk")
        done = ws.drop_action(action)
        assert done.status == "applied"
        assert status_of(ws, paired) == "closed" and status_of(ws, unpaired) == "open"
        assert ws.store.read().get("action", action).data["status"] == "dropped"
        assert len({o["group"] for o in done.ops}) == 1
        ws.undo(done)
        assert status_of(ws, paired) == "open"
        assert ws.store.read().get("action", action).data["status"] == "open"


def test_a_drop_read_from_an_input_holds_the_paired_record_with_it(tmp_path, packs):
    with workspace(tmp_path, packs) as ws:
        action = open_actions(ws)[0]
        paired = risk(ws, "Paired risk", action=action)
        held = ws.drop_action(action, as_person=False)
        assert [o["op"]["op"] for o in held.ops if o["status"] == "held"].count("pk/close-risk") == 1
        assert status_of(ws, paired) == "open" and ws.store.read().get("action", action).data["status"] == "open"


def test_a_drop_that_is_part_of_an_ending_is_the_project_ending_hooks_to_follow_not_the_drop_hooks(tmp_path, packs):
    with workspace(tmp_path, packs) as ws:
        action = open_actions(ws)[0]
        paired = risk(ws, "Paired risk", action=action, project=PROJECT)
        done = ws.end_project(PROJECT)
        closes = [o for o in done.ops if o["op"]["op"] == "pk/close-risk"]
        assert len(closes) == 1 and status_of(ws, paired) == "closed"  # once, by the ending's own hook


def test_a_hook_is_asked_once_for_one_change_so_one_failure_is_one_failure(tmp_path, packs):
    with workspace(tmp_path, packs, "raise") as ws:
        ws.end_project(PROJECT)
        assert ws.store.plugins.failures[("pk", "project-ending hook")] == 1
        assert ws.status("pk").state == "enabled"


def test_the_kit_lists_the_hooks_a_pack_registered(tmp_path, packs):
    with workspace(tmp_path, packs) as ws:
        found = ws.registered("pk")
        assert callable(found["project_ending"]) and set(found["drop_hooks"]) == {"action"}
        assert "project_ending" not in ws.registered("qk")


def test_registering_a_hook_checks_its_kind_and_that_there_is_only_one():
    registrar = Registrar("pk", Settings())
    registrar.project_ending(lambda project, view: [])
    with pytest.raises(ValueError, match="one project-ending hook"):
        registrar.project_ending(lambda project, view: [])
    with pytest.raises(ValueError, match="follows one of"):
        registrar.on_drop("question", lambda record, view: [])
    registrar.on_drop(DROP_HOOK_KINDS[0], lambda record, view: [])
    with pytest.raises(ValueError, match="one drop hook per kind"):
        registrar.on_drop(DROP_HOOK_KINDS[0], lambda record, view: [])


def test_a_pack_that_does_not_register_a_hook_costs_nothing(tmp_path):
    other = folder(tmp_path, "qk", OTHER_PACK, {"record_types": ["qk/note"], "ops": ["qk/add-note"]})
    with plugin_workspace(other, root=tmp_path / "ws") as ws:
        assert ws.end_project(PROJECT).status == "applied"
        assert "project_ending" not in ws.registered("qk")


def test_a_pack_that_does_not_start_is_reported_as_before(tmp_path, packs):
    (packs[0] / "fixture.py").write_text(
        PACK.replace('registrar.on_drop("action", dropped)', 'registrar.on_drop("x", dropped)')
    )
    with pytest.raises(PluginDidNotStart, match="follows one of"), workspace(tmp_path, packs):
        pass


def test_the_screen_lists_the_packs_items_with_the_cores_and_keeps_them_the_same_way(tmp_path, packs):
    from fastapi.testclient import TestClient

    from api.app import create_app

    with workspace(tmp_path, packs) as ws:
        first, second = risk(ws, "First risk", project=PROJECT), risk(ws, "Second risk", project=PROJECT)
        held = ws.end_project(PROJECT, as_person=False)
        (waiting,) = ws.ending_items(held)
        ws.store.close()
        app = create_app(ws.ws, ws.cfg, "t", ui_dist=tmp_path / "no-ui")
        with TestClient(app, headers={"Authorization": "Bearer t"}) as client:
            path = f"/api/changesets/{held.changeset}/ops/{waiting['index']}/project-ending"
            view = client.get(path).json()
            other = [i for i in view["items"] if i["kind"] == "other"]
            assert {i["text"] for i in other} == {"Close the risk 'First risk'", "Close the risk 'Second risk'"}
            assert view["left_open"] == []  # both records are items of the ending, so none is left open
            keep = [i["index"] for i in other if i["id"] == first.id]
            assert client.post(path, json={"end": True, "keep": keep}).status_code == 200
            now = app.state.store.read()
            assert now.get("pk/risk", first.id).data["status"] == "open"
            assert now.get("pk/risk", second.id).data["status"] == "closed"
