"""A side is a group that holds projects, never a project (design 6.32, "A side is a group, never a project"): Personal
and each job or business keep a name, other names and a description and nothing else a project has; every view names an
item filed directly on one as "in the side", apart from its project; and setup keeps a business's description apart
from its projects. Names and ids come from the fixtures."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import packet, sides
from engine.applier import apply_as_person
from engine.lists import projects_at_risk
from engine.storage import StoreError, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

TOKEN = "side-group-token"
_PM = WriteContext(actor="pm", trust="trusted", op="test.side-group")
BUSINESS_NAME = fixture_records(DEMO_B, "organization")[0]["name"]
OTHER_NAME = fixture_records(DEMO_B, "organization")[1]["name"]
SUMMARY = fixture_records(DEMO_B, "project")[0]["name"] + " and its customers"
SIDE_IS_SETTINGS = "That's one of your sides: change it in Settings."


@pytest.fixture
def app(tmp_path):
    """The app with no hours held back (so a line is on Today whenever the test runs) and one business side."""
    ws = init_workspace(tmp_path / "ws", git=False, you="Pat Example")
    flags = {
        "server.base_path": "/",
        "storage.backups.automatic": False,
        "steward.hold_outside_hours": False,
        "steward.attention.quiet": False,
    }
    api = create_app(ws, ws.config(env={}, flags=flags), TOKEN, ui_dist=tmp_path / "no-ui")
    with TestClient(api, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client, ws, api.state.store


def business_of(client) -> str:
    return client.post("/api/setup/business", json={"name": BUSINESS_NAME}).json()["project"]


def edit(store, cfg, project, fields):
    version = store.read().get("project", project).version
    op = {"op": "record.edit", "record": {"kind": "project", "id": project}, "fields": fields, "read_version": version}
    return apply_as_person(store, cfg, [op], "Changed on screen", all_or_nothing=True)


# ---- (a) a side keeps a name, other names and a description, and nothing else ---------------------------------------


def test_a_business_sides_target_day_status_role_and_ending_are_refused_in_plain_words(app):
    client, ws, store = app
    side = business_of(client)
    cfg = ws.config(env={})
    for body in ({"target": "2027-01-01"}, {"status": "Done"}, {"phase": "x"}, {"owner": "x"}, {"priority": "x"}):
        refused = client.post(f"/api/projects/{side}", json=body)
        assert refused.status_code in (404, 409), (body, refused.text)
    refused = client.post(f"/api/projects/{side}", json={"target": "2027-01-01"})
    assert refused.status_code == 409 and refused.json()["detail"] == (
        "A side is a group, not a project, so it has no target day."
    )
    assert store.read().get("project", side).data.get("target") is None
    # The applier says the same for an edit or a set from anywhere, an ending included.
    with pytest.raises(StoreError, match="a side is a group|A side is a group"):
        edit(store, cfg, side, {"target": "2027-01-01"})
    ending = [
        {
            "op": "record.set",
            "kind": "project",
            "id": side,
            "field": "status",
            "value": cfg.workspace.project.completed_status,
        }
    ]
    with pytest.raises(StoreError, match="no status"):
        apply_as_person(store, cfg, ending, "Ended", all_or_nothing=True)
    assert sides.side_name_of(store.read(), cfg, side) == BUSINESS_NAME  # still a side: nothing ended it
    role = client.post(f"/api/projects/{side}/role", json={"role": "watch"})
    assert role.status_code == 409 and role.json()["detail"] == SIDE_IS_SETTINGS
    role_op = [{"op": "project.role", "project": side, "person": cfg.workspace.user.person, "role": "watch"}]
    with pytest.raises(StoreError, match="change it in Settings"):
        apply_as_person(store, cfg, role_op, "Role", all_or_nothing=True)
    gone = client.post(f"/api/projects/{side}/remove")
    assert gone.status_code == 409 and gone.json()["detail"] == SIDE_IS_SETTINGS
    assert store.read().get("project", side) is not None
    # Personal is a side too.
    personal = cfg.workspace.project.personal
    assert client.post(f"/api/projects/{personal}/role", json={"role": "watch"}).status_code == 409
    assert client.post(f"/api/projects/{personal}/remove").json()["detail"] == SIDE_IS_SETTINGS
    assert client.post(f"/api/projects/{personal}", json={"status": "Done"}).status_code == 409


def test_a_side_can_still_be_renamed_and_described_and_a_project_inside_it_keeps_every_field(app):
    client, ws, store = app
    side = business_of(client)
    ok = client.post(f"/api/projects/{side}", json={"name": OTHER_NAME, "summary": SUMMARY, "aliases": ["biz"]})
    assert ok.status_code == 200, ok.text
    held = store.read().get("project", side).data
    assert held["name"] == OTHER_NAME and held["summary"] == SUMMARY and held["aliases"] == ["biz"]
    made = client.post("/api/projects", json={"name": BUSINESS_NAME, "parent": side}).json()["id"]
    assert client.post(f"/api/projects/{made}", json={"target": "2027-01-01", "status": "On track"}).status_code == 200
    assert client.post(f"/api/projects/{made}/role", json={"role": "watch"}).status_code == 200


def test_what_an_anchor_already_holds_stays_and_an_edit_that_leaves_it_alone_or_clears_it_passes(app):
    client, ws, store = app
    side = business_of(client)
    with store.transaction() as tx:  # an anchor stored before a side was a group
        tx.update("project", side, {"target": "2027-03-01"}, _PM, read_version=tx.get("project", side).version)
    same = client.post(f"/api/projects/{side}", json={"name": OTHER_NAME, "target": "2027-03-01"})
    assert same.status_code == 200, same.text
    assert str(store.read().get("project", side).data["target"]) == "2027-03-01"
    moved = client.post(f"/api/projects/{side}", json={"target": "2027-04-01"})
    assert moved.status_code == 409
    assert client.post(f"/api/projects/{side}", json={"target": None}).status_code == 200
    assert store.read().get("project", side).data.get("target") is None


def test_removing_a_side_after_setup_still_moves_or_ends_its_anchor(app):
    client, ws, store = app
    side = business_of(client)
    cfg = ws.config(env={})
    removed = client.post(f"/api/sides/{side}/remove", json={"where": "personal"})
    assert removed.status_code == 200, removed.text
    assert store.read().get("project", side).data["parent"] == cfg.workspace.project.personal
    assert sides.side_name_of(store.read(), ws.config(env={}), side) is None


def test_a_new_project_cannot_take_a_side_inside_it(app):
    client, ws, store = app
    side = business_of(client)
    cfg = ws.config(env={})
    op = [{"op": "project.add", "name": OTHER_NAME, "children": [side]}]
    with pytest.raises(StoreError, match="change it in Settings"):
        apply_as_person(store, cfg, op, "Added", all_or_nothing=True)


# ---- (b) setup keeps a description apart from the projects ---------------------------------------------------------


def test_the_business_route_keeps_a_description_on_the_side_and_makes_no_project_from_it(app):
    client, ws, store = app
    before = {p.id for p in store.read().list("project")}
    made = client.post("/api/setup/business", json={"name": BUSINESS_NAME, "summary": SUMMARY})
    assert made.status_code == 200, made.text
    side = made.json()["project"]
    after = {p.id for p in store.read().list("project")}
    assert after - before == {side}
    assert store.read().get("project", side).data["summary"] == SUMMARY
    shown = client.get("/api/setup/business").json()
    assert [(s["project"], s["summary"]) for s in shown["sides"]] == [(side, SUMMARY)]
    # The same name again with a new description changes the description only.
    again = client.post("/api/setup/business", json={"name": BUSINESS_NAME, "summary": OTHER_NAME}).json()
    assert again["project"] == side and again["created"] is False and again["changeset"]
    assert store.read().get("project", side).data["summary"] == OTHER_NAME
    assert {p.id for p in store.read().list("project")} == after
    # The walkthrough's route takes it too.
    work = client.post("/api/setup/work", json={"choice": "work", "name": BUSINESS_NAME, "summary": SUMMARY})
    assert work.status_code == 200 and work.json()["sides"][0]["summary"] == SUMMARY


# ---- (c) the project list marks sides ------------------------------------------------------------------------------


def test_the_project_list_marks_each_side_and_no_project(app):
    client, ws, store = app
    side = business_of(client)
    personal = ws.config(env={}).workspace.project.personal
    inside = client.post("/api/projects", json={"name": OTHER_NAME, "parent": side}).json()["id"]
    marked = {p["id"]: p["side"] for p in client.get("/api/projects").json()}
    assert marked == {personal: True, side: True, inside: False}


# ---- (d) an item filed directly on a side is in the side, in no project --------------------------------------------


def test_an_action_and_a_question_filed_on_a_side_say_so_in_every_view(app):
    client, ws, store = app
    side = business_of(client)
    cfg = ws.config(env={})
    me = cfg.workspace.user.person
    with store.transaction() as tx:
        other = tx.create("person", {"full_name": "Casey Example"}, _PM).id
        project = tx.create("project", {"name": OTHER_NAME, "parent": side}, _PM).id
        loose = tx.create("action", {"text": "Do the side thing", "owners": [{"person": other}], "project": side}, _PM)
        inside = tx.create(
            "action", {"text": "Do the project thing", "owners": [{"person": other}], "project": project}, _PM
        )
        mine = tx.create("action", {"text": "Do my own thing", "owners": [{"person": me}], "project": side}, _PM)
        ask = tx.create("question", {"to": other, "title": "Ask about the side?", "projects": [side]}, _PM)
        note = tx.create("note", {"text": "A note on the side", "project": side}, _PM)
    # Follow-ups.
    rows = {}
    for section in client.get("/api/followups").json():
        for row in [*section["questions"], *section["actions"]]:
            rows[row["id"]] = row
    assert rows[loose.id]["project_name"] == "" and rows[loose.id]["side_name"] == BUSINESS_NAME
    assert rows[inside.id]["project_name"] == OTHER_NAME and rows[inside.id]["side_name"] is None
    assert rows[inside.id]["parent_name"] is None  # a side is no parent project
    assert rows[ask.id]["project_name"] == "" and rows[ask.id]["side_name"] == BUSINESS_NAME
    # Open items.
    open_items = client.get("/api/open-items").json()
    actions = {a["id"]: a for a in open_items["actions"]}
    assert actions[mine.id]["project_name"] == "" and actions[mine.id]["side_name"] == BUSINESS_NAME
    assert actions[inside.id]["project_name"] == OTHER_NAME and actions[inside.id]["parent_name"] is None
    questions = {q["id"]: q for q in open_items["questions"]}
    assert questions[ask.id]["project_name"] == "" and questions[ask.id]["side_name"] == BUSINESS_NAME
    assert questions[ask.id]["projects"] == []
    # Notes.
    shown = {n["id"]: n for n in client.get("/api/notes").json()}
    assert shown[note.id]["project_name"] is None and shown[note.id]["side_name"] == BUSINESS_NAME
    # Today: a question for the person on the side is a line naming the side and no project.
    with store.transaction() as tx:
        decide = tx.create("question", {"to": me, "title": "Decide the side thing?", "projects": [side]}, _PM)
    lines = {line["key"]: line for line in client.get("/api/today/queue").json()}
    line = lines[f"question:{decide.id}"]
    assert line["project_name"] is None and line["side_name"] == BUSINESS_NAME


def test_the_filing_of_an_item_on_a_side_reads_in_the_side_and_not_in_a_project(app):
    client, ws, store = app
    side = business_of(client)
    cfg = ws.config(env={})
    project = client.post("/api/projects", json={"name": OTHER_NAME, "parent": side}).json()["id"]
    cfg = ws.config(env={})
    stamp = {"by": "word", "word": "salt", "project": side}
    with store.transaction() as tx:
        on_side = tx.create("note", {"text": "salt", "project": side, "filed_by": stamp}, _PM)
        in_project = tx.create(
            "note", {"text": "salt", "project": project, "filed_by": {**stamp, "project": project}}, _PM
        )
    view = store.read()
    assert sides.filed_view(view, cfg, "note", on_side)["side_name"] == BUSINESS_NAME
    assert sides.filed_view(view, cfg, "note", in_project)["side_name"] is None


def test_the_stage_board_never_lists_a_side_as_a_project_card(app):
    client, ws, store = app
    side = business_of(client)
    cards = [c for c in client.get("/api/stages/records").json() if c["record"]["kind"] == "project"]
    assert side not in {c["record"]["id"] for c in cards}


# ---- (e) a side is no project in the lists and the packet ----------------------------------------------------------


def test_a_side_is_never_a_project_at_risk_and_the_packet_lists_sides_apart(app):
    client, ws, store = app
    side = business_of(client)
    cfg = ws.config(env={})
    cfg = ws.config(env={})
    project = client.post("/api/projects", json={"name": OTHER_NAME, "parent": side}).json()["id"]
    with store.transaction() as tx:  # an anchor stored with a status, and a project at risk
        for pid in (side, project):
            tx.update("project", pid, {"status": "At risk"}, _PM, read_version=tx.get("project", pid).version)
    view = store.read()
    assert projects_at_risk(view, cfg) == [project]
    text = packet._projects(store, cfg)
    projects_part, _, sides_part = text.partition(packet.SIDES_HEADING)
    assert f"- {project} | {OTHER_NAME}" in projects_part and f"- {side} |" not in projects_part
    assert f"- {side} | {BUSINESS_NAME}" in sides_part and f"- {project} |" not in sides_part
    assert sides.project_names(view, cfg) == {project: OTHER_NAME}
    assert sides.side_names(view, cfg)[side] == BUSINESS_NAME


def test_the_settings_that_name_sides_pick_from_the_sides_only(app):
    client, ws, store = app
    side = business_of(client)
    personal = ws.config(env={}).workspace.project.personal
    project = client.post("/api/projects", json={"name": OTHER_NAME, "parent": side}).json()["id"]
    shown = {s["key"]: s for s in client.get("/api/settings").json()["items"]}
    business = shown["workspace.project.business"]
    assert business["choices"] == "sides" and set(business["options"]) == {personal, side}
    assert project not in business["options"]
