"""Views (design 6.32, "Views: one project under several roles"): a named list of projects inside one side, so one
project can show under two roles. A view only changes what a screen shows: filing, a project's side and data levels
never read one. Only the person's own ops write one. Names come from the fixtures."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import sides, views
from engine.applier import apply_as_person
from engine.dispatcher import undo_changeset
from engine.storage import StoreError, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.e2e_just_me import the_person

TOKEN = "views-token"
CTX = WriteContext(actor="pm", trust="trusted", op="test.views")


class Env:
    """A workspace with Personal and a job. The job holds a project in two views ("both"), one in only the first
    ("first"), one in no view ("rest"), a sub-project of the first, and a view for each role."""

    def __init__(self, client: TestClient, store, cfg, app) -> None:
        self.client, self.store, self.cfg, self.app = client, store, cfg, app
        names = [p["name"] for p in fixture_records(DEMO_B, "project")]
        self.me = cfg.workspace.user.person
        self.personal = cfg.workspace.project.personal
        job_name = fixture_records(DEMO_B, "organization")[0]["name"]
        made = client.post("/api/setup/business", json={"name": job_name, "kind": "job"})
        assert made.status_code == 200, made.text
        self.job = made.json()["project"]
        app.state.worker.apply_live()
        with store.transaction() as tx:
            self.both = tx.create("project", {"name": names[0], "parent": self.job}, CTX).id
            self.first = tx.create("project", {"name": names[1], "parent": self.job}, CTX).id
            self.rest = tx.create("project", {"name": names[2], "parent": self.job}, CTX).id
            self.sub = tx.create("project", {"name": f"{names[0]} part", "parent": self.both}, CTX).id
            self.home = tx.create("project", {"name": f"{names[1]} at home", "parent": self.personal}, CTX).id
        self.managing = self.add_view("Manager's portfolio", "Portfolio", [self.both, self.first])
        self.own = self.add_view("My projects", None, [self.both])

    def add_view(self, name: str, label: str | None, projects: list[str], side: str | None = None) -> str:
        op = {"op": "view.add", "name": name, "side": side or self.job, "projects": projects}
        if label:
            op["label"] = label
        apply_as_person(self.store, self.cfg, [op], "Added a view")
        return next(v.id for v in views.view_records(self.store.read()) if v.data["name"] == name)

    def todo(self, text: str, project: str | None) -> str:
        data = {"text": text, "owners": [{"person": self.me}]}
        if project:
            data["project"] = project
        with self.store.transaction() as tx:
            return tx.create("action", data, CTX).id

    def question(self, title: str, project: str) -> str:
        data = {"to": self.me, "title": title, "kind": "decision", "projects": [project]}
        with self.store.transaction() as tx:
            return tx.create("question", data, CTX).id


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield Env(client, app.state.store, cfg, app)


def test_a_project_in_two_views_shows_under_each_and_its_sub_project_comes_with_it(env):
    read = env.store.read()
    assert views.views_of_project(read, env.both) == [env.managing, env.own]
    assert views.views_of_project(read, env.sub) == [env.managing, env.own]
    assert views.views_of_project(read, env.first) == [env.managing]
    assert views.views_of_project(read, env.rest) == []
    assert views.views_of_project(read, None) == []
    assert views.views_of_project(read, "PRJ-999") == []


def test_a_label_is_the_first_word_of_the_name_unless_one_is_given(env):
    read = env.store.read()
    assert read.get("view", env.own).data["label"] == "My"
    assert read.get("view", env.managing).data["label"] == "Portfolio"


def test_open_items_carry_the_views_of_their_project_and_the_project_of_a_question(env):
    in_both, in_first, in_rest = (env.todo("Plan the move", p) for p in (env.both, env.first, env.rest))
    under_sub = env.todo("Check the permit", env.sub)
    asked = env.question("Which supplier first?", env.both)
    found = env.client.get("/api/open-items").json()
    by_id = {a["id"]: a["views"] for a in found["actions"]}
    assert by_id[in_both] == by_id[under_sub] == [env.managing, env.own]
    assert by_id[in_first] == [env.managing]
    assert by_id[in_rest] == []
    assert {q["id"]: q["views"] for q in found["questions"]}[asked] == [env.managing, env.own]


def test_a_project_shows_under_each_view_and_none_disappear_when_the_choice_changes(env):
    """What a screen shows under a view is what carries the view; every item shows under at least the view of its
    project, and switching to the other view never drops the project's items."""
    both = env.todo("Plan the move", env.both)
    first = env.todo("Book the venue", env.first)
    found = {a["id"]: set(a["views"]) for a in env.client.get("/api/open-items").json()["actions"]}
    for view_id in (env.managing, env.own):
        assert both in {i for i, held in found.items() if view_id in held}
    assert first in {i for i, held in found.items() if env.managing in held}
    assert first not in {i for i, held in found.items() if env.own in held}


def test_filing_a_project_s_side_and_data_levels_are_the_same_with_and_without_views(env):
    read = env.store.read()
    cfg = env.cfg
    sides_with = {p: sides.side_of_project(read, cfg, p) for p in (env.both, env.first, env.rest, env.sub, env.home)}
    item = env.todo("Plan the move", env.both)
    on_side_with = sides.side_of_item(read, cfg, read.get("action", item))
    for record in views.view_records(read):
        apply_as_person(env.store, cfg, [{"op": "view.remove", "id": record.id}], "Removed a view")
    read = env.store.read()
    assert views.view_records(read) == []
    assert {p: sides.side_of_project(read, cfg, p) for p in sides_with} == sides_with
    assert sides.side_of_item(read, cfg, read.get("action", item)) == on_side_with == env.job
    source = Path(sides.__file__).read_text(encoding="utf-8")
    assert "engine.views" not in source and '"view"' not in source  # engine.sides never reads views


def test_the_assistant_and_an_input_cannot_write_a_view(env):
    from engine.applier import apply_changeset
    from engine.ops import CHANGESET

    op = {"op": "view.add", "name": "Sneaky", "side": env.job, "projects": [env.first]}
    changeset = CHANGESET.validate_python({"summary": "From an input", "ops": [op]})
    from engine.applier import Context, Inputs
    from engine.names import People

    with env.store.transaction() as tx:
        request = tx.create(
            "request",
            {"task": "notes", "origin": "input", "state": "done", "note": "x", "created_at": env.store.clock()},
            CTX,
        )
    ctx = Context(
        env.store,
        env.cfg,
        People(env.store, env.cfg),
        tuple(env.store.plugins.ops),
        Inputs(request.id, None, "", "", "untrusted"),
    )
    cs_id = apply_changeset(changeset, [], ctx, run=None)
    outcome = env.store.read().get("changeset", cs_id).data["ops"][0]
    assert outcome["status"] == "refused" and "only the person" in outcome["reason"]
    assert [v.data["name"] for v in views.view_records(env.store.read())] == [
        "Manager's portfolio",
        "My projects",
    ]


def test_the_ops_are_the_persons_alone_and_never_offered_to_the_assistant(env):
    from engine.ops import PERSON_ONLY_OPS, TIERS
    from engine.tasks import NOT_FROM_NOTES

    for name in ("view.add", "view.set", "view.remove"):
        assert name in PERSON_ONLY_OPS and name in NOT_FROM_NOTES and TIERS[name] == "data"


def test_undo_of_a_change_puts_the_view_back_as_it_was(env):
    cs_id = apply_as_person(
        env.store,
        env.cfg,
        [{"op": "view.set", "id": env.own, "name": "My own work", "projects": [env.first, env.rest]}],
        "Changed a view",
    )
    record = env.store.read().get("view", env.own).data
    assert (record["name"], record["label"], record["projects"]) == ("My own work", "My", [env.first, env.rest])
    assert undo_changeset(env.store, cs_id).restored
    record = env.store.read().get("view", env.own).data
    assert (record["name"], record["label"], record["projects"]) == ("My projects", "My", [env.both])


def test_undo_of_a_removal_brings_the_view_back_and_undo_of_an_add_removes_it(env):
    removed = apply_as_person(env.store, env.cfg, [{"op": "view.remove", "id": env.own}], "Removed a view")
    assert env.store.read().get("view", env.own) is None
    undo_changeset(env.store, removed)
    assert env.store.read().get("view", env.own).data["name"] == "My projects"
    added = apply_as_person(env.store, env.cfg, [{"op": "view.add", "name": "Extra", "side": env.job}], "Added a view")
    assert len(views.view_records(env.store.read())) == 3
    undo_changeset(env.store, added)
    assert len(views.view_records(env.store.read())) == 2


def test_a_deleted_project_in_a_view_is_skipped_and_the_project_can_still_be_deleted(env):
    with env.store.transaction() as tx:
        current = tx.get("project", env.first)
        tx.delete("project", env.first, CTX, read_version=current.version)
    read = env.store.read()
    assert env.first in read.get("view", env.managing).data["projects"]
    assert views.live_projects(read, read.get("view", env.managing)) == [env.both]
    assert views.views_of_project(read, env.first) == []
    shown = {v["id"]: [p["id"] for p in v["projects"]] for v in env.client.get("/api/views").json()}
    assert shown[env.managing] == [env.both]


def test_a_view_holds_only_projects_inside_its_own_side(env):
    for projects, why in (
        ([env.home], "inside its own side"),
        ([env.job], "isn't a project"),
        (["PRJ-999"], "there is no project"),
    ):
        with pytest.raises(StoreError, match=why):
            apply_as_person(
                env.store,
                env.cfg,
                [{"op": "view.add", "name": "Bad", "side": env.job, "projects": projects}],
                "Added a view",
            )
    with pytest.raises(StoreError, match="one of your sides"):
        apply_as_person(
            env.store,
            env.cfg,
            [{"op": "view.add", "name": "Bad", "side": env.both, "projects": []}],
            "Added a view",
        )
    with pytest.raises(StoreError, match="already a view called"):
        apply_as_person(
            env.store, env.cfg, [{"op": "view.add", "name": "my PROJECTS", "side": env.job}], "Added a view"
        )


def test_the_views_routes_list_add_rename_set_projects_and_remove(env):
    c = env.client
    listed = {v["id"]: v for v in c.get("/api/views").json()}
    assert listed[env.managing]["side"] == env.job and listed[env.managing]["side_name"]
    assert [p["id"] for p in listed[env.managing]["projects"]] == [env.both, env.first]
    made = c.post("/api/views", json={"name": "Side work", "side": env.job, "projects": [env.rest]})
    assert made.status_code == 200 and made.json()["view"]
    new = made.json()["view"]
    assert c.post(f"/api/views/{new}/rename", json={"name": "Side jobs", "label": "Jobs"}).status_code == 200
    assert c.post(f"/api/views/{new}/projects", json={"projects": [env.rest, env.first]}).status_code == 200
    again = {v["id"]: v for v in c.get("/api/views").json()}[new]
    assert (again["name"], again["label"], [p["id"] for p in again["projects"]]) == (
        "Side jobs",
        "Jobs",
        [env.rest, env.first],
    )
    assert c.post(f"/api/views/{new}/projects", json={"projects": [env.home]}).status_code == 409
    removed = c.delete(f"/api/views/{new}")
    assert removed.status_code == 200 and new not in {v["id"] for v in c.get("/api/views").json()}
    assert c.delete("/api/views/VIEW-999").status_code == 404
    assert c.post("/api/views", json={"name": "Nowhere", "side": env.both}).status_code == 409


def test_waiting_counts_per_view_beside_the_counts_per_side(env):
    env.todo("In both views", env.both)
    env.todo("In the first view only", env.first)
    env.todo("In a project no view holds", env.rest)
    env.todo("In no project at all", None)
    env.todo("Directly on the side", env.job)
    counts = env.client.get("/api/waiting").json()["open"]
    by_view = {v["view"]: v["count"] for v in counts["views"]}
    by_side = {s["side"]: s["count"] for s in counts["sides"]}
    # A view counts what is in it, what is on no project in its side and what is on no side.
    assert by_view[env.own] == 1 + 1 + 1  # in both views, in no project at all, directly on the side
    assert by_view[env.managing] == 2 + 1 + 1
    assert by_side[env.job] == 5
    assert counts["total"] == 5
    assert [v["view"] for v in env.client.get("/api/waiting").json()["changed"]["views"]] == [env.managing, env.own]


def test_today_lines_and_the_week_carry_the_views_of_their_project(env):
    from datetime import UTC, datetime, timedelta

    due = (datetime.now(UTC) - timedelta(days=3)).date().isoformat()
    with env.store.transaction() as tx:
        tx.create(
            "action",
            {"text": "Send the report", "owners": [{"person": env.me}], "project": env.both, "due": due},
            CTX,
        )
        today = datetime.now(UTC).date().isoformat()
        action = tx.create(
            "action",
            {"text": "Send the summary", "owners": [{"person": env.me}], "project": env.both, "due": today},
            CTX,
        ).id
    queue = env.client.get("/api/today/queue").json()
    overdue = next(line for line in queue if line["kind"] == "overdue")
    assert overdue["views"] == [env.managing, env.own]  # a line about to-dos takes the views of what it covers
    assert next(line for line in queue if line["kind"] == "backup")["views"] == []
    assert all(isinstance(line["views"], list) for line in queue)
    week = env.client.get("/api/today/week").json()
    assert {d["action"]: d["views"] for d in week["due"]}[action] == [env.managing, env.own]
    assert all("views" in entry for entry in week["meetings"])
    assert all("views" in w for w in week["waiting"])


def test_followup_rows_and_the_schedule_carry_views(env):
    other = env.store.transaction
    with other() as tx:
        who = tx.create("person", {"full_name": "Casey Example"}, CTX).id
        tx.create(
            "action",
            {"text": "Send the quote", "owners": [{"person": who}], "project": env.both},
            CTX,
        )
        tx.create(
            "question",
            {"to": who, "title": "Which date works?", "kind": "decision", "projects": [env.first]},
            CTX,
        )
    sections = {s["person"]: s for s in env.client.get("/api/followups").json()}
    assert [a["views"] for a in sections[who]["actions"]] == [[env.managing, env.own]]
    assert [q["views"] for q in sections[who]["questions"]] == [[env.managing]]
    from datetime import UTC, datetime, timedelta

    tomorrow = (datetime.now(UTC) + timedelta(days=1)).date().isoformat()
    with env.store.transaction() as tx:
        tx.create("event", {"title": "Review the plan", "start": tomorrow, "project": env.both}, CTX)
        tx.create("event", {"title": "Dentist", "start": tomorrow, "project": env.rest}, CTX)
    schedule = env.client.get("/api/schedule").json()
    entries = {e["title"]: e["views"] for day in schedule["days"] for e in (*day["all_day"], *day["timed"])}
    assert entries["Review the plan"] == [env.managing, env.own]
    assert entries["Dentist"] == []
    assert all("views" in e for e in schedule["on_its_way"])
