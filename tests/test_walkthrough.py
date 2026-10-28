"""The new-start walkthrough (design 7.8): the server keeps where it stands (the screen the person is on, closed,
finished). It opens by itself while the person is partway through it (never after Finish later, its last button, or once
every step is done or skipped: what is left waits on Today's setup line), and resumes at the kept screen. The setup
steps it is a view of are grouped by screen: an add-on that reads mail or a calendar has its sign-in and steps under
mail and calendar, and the optional extras never count toward finishing."""

from __future__ import annotations

import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine import setup, sides
from engine.connectors import reads
from engine.names import People
from engine.packs import summary
from engine.storage import WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.test_many_sides import THIRD_NAME, a_watched_source
from tests.test_sides import BUSINESS_NAME, OTHER_BUSINESS_NAME, new_op
from tests.test_sign_in import signing as signing  # noqa: F401 - the fixture
from tests.test_sign_in_sources import _app, _with_sources, sign_in

TOKEN = "t"
_PM = WriteContext(actor="pm", trust="trusted", op="test.walkthrough")
#: The steps that count, in the order a person meets them.
COUNTED = ("workspace", "work", "ai", "mail", "promises", "backup", "people")


def _fresh(tmp_path):
    """A workspace as `cockpit init` makes it with no template, and the app on it."""
    ws = init_workspace(tmp_path / "ws", git=False)
    return ws, _open(ws)


def _open(ws):
    """The app on a workspace, started again from its files as a restart does."""
    cfg = ws.config(env={})
    c = TestClient(create_app(ws, cfg, TOKEN, start_worker=False, ui_dist=ws.root / "no-ui"))
    c.headers["Authorization"] = f"Bearer {TOKEN}"
    return c


def _view(c):
    return c.get("/api/setup").json()


def _steps(c):
    return {s["id"]: s for s in _view(c)["steps"]}


def test_the_walkthrough_opens_by_itself_on_a_new_workspace_on_welcome(tmp_path):
    _, c = _fresh(tmp_path)
    walk = _view(c)["walkthrough"]
    assert walk == {"open": True, "step": "welcome", "closed": False, "finished": False, "promises_done": False}


def test_welcome_is_shown_once_pressing_start_keeps_the_next_screen_for_a_resume(tmp_path):
    ws, c = _fresh(tmp_path)
    assert c.post("/api/setup/walkthrough", json={"step": "welcome"}).json()["step"] == "welcome"
    assert c.post("/api/setup/walkthrough", json={"step": "you"}).json()["step"] == "you"
    assert _view(_open(ws))["walkthrough"]["step"] == "you"  # after a restart: not Welcome again


def test_the_screen_the_person_is_on_is_kept_and_is_where_it_resumes_after_a_restart(tmp_path):
    ws, c = _fresh(tmp_path)
    assert c.post("/api/setup/walkthrough", json={"step": "mail"}).json()["step"] == "mail"
    again = _open(ws)  # the app started again from the same workspace
    walk = _view(again)["walkthrough"]
    assert walk["open"] and walk["step"] == "mail" and not walk["closed"]


def test_finish_later_keeps_its_screen_and_it_stays_closed_on_every_later_visit_whatever_is_missing(tmp_path):
    ws, c = _fresh(tmp_path)
    c.post("/api/setup/walkthrough", json={"step": "ai"})
    closed = c.post("/api/setup/walkthrough", json={"closed": True}).json()
    assert closed["closed"] and closed["step"] == "ai"
    for _ in range(3):  # the next visits, after a restart each: neither the name nor an AI account is set
        again = _view(_open(ws))
        assert not again["walkthrough"]["open"] and again["walkthrough"]["closed"]
    assert not again["finished"]  # Today's setup line still has work to show


def _found(named=True):
    """Setup steps as the walkthrough sees them: You done or not, People not done."""
    return [setup.Step(i, d, False, group=i, counted=True) for i, d in {"workspace": named, "people": False}.items()]


def test_it_opens_by_itself_only_while_the_person_is_partway_through_it(tmp_path):
    """The person's path: a new start opens it; leaving it by closing the window resumes it; Finish later, the last
    button and having done or skipped every step each end it, with the name and an AI account still missing."""
    ws, c = _fresh(tmp_path)
    from types import SimpleNamespace

    cfg = SimpleNamespace(workspace=SimpleNamespace(demo=False))
    assert setup.walkthrough(ws, cfg, _found()).open  # a new start
    c.post("/api/setup/walkthrough", json={"step": "people"})  # it was shown, then the window was closed
    assert setup.walkthrough(ws, cfg, _found()).open  # the next visit resumes it
    assert setup.walkthrough(ws, cfg, _found(named=False)).open
    done = [setup.Step(i, True, False, group=i, counted=True) for i in ("workspace", "people")]
    assert not setup.walkthrough(ws, cfg, done).open  # every step that counts is done
    c.post("/api/setup/walkthrough", json={"closed": True})
    assert not setup.walkthrough(ws, cfg, _found()).open
    assert not setup.walkthrough(ws, cfg, _found(named=False)).open
    c.post("/api/setup/walkthrough", json={"closed": False, "finished": True})
    assert not setup.walkthrough(ws, cfg, _found(named=False)).open


def test_a_screen_not_reached_is_known_only_partway_through_it(tmp_path):
    ws, c = _fresh(tmp_path)
    assert not setup.not_reached(ws, "backup")  # never shown
    c.post("/api/setup/walkthrough", json={"step": "ai"})
    assert setup.not_reached(ws, "backup") and setup.not_reached(ws, "mail") and not setup.not_reached(ws, "ai")
    c.post("/api/setup/walkthrough", json={"step": "people"})
    assert not setup.not_reached(ws, "backup")
    c.post("/api/setup/walkthrough", json={"step": "you"})
    c.post("/api/setup/walkthrough", json={"closed": True})
    assert not setup.not_reached(ws, "backup")


def test_an_unknown_screen_is_refused_and_nothing_is_kept(tmp_path):
    _, c = _fresh(tmp_path)
    assert c.post("/api/setup/walkthrough", json={"step": "nowhere"}).status_code == 422
    assert _view(c)["walkthrough"]["step"] == "welcome"


def test_the_sandbox_workspaces_do_not_open_it_by_themselves(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    assert not _view(_open(ws))["walkthrough"]["open"]


def test_skipping_every_step_and_going_to_today_stays_on_today_across_reloads(tmp_path):
    """The person's path: they skip everything (the name and the AI account too), press Go to Today, and the app is
    loaded again three times. Setup never reopens by itself; Today's setup line is where it waits."""
    ws, c = _fresh(tmp_path)
    for step in COUNTED:
        c.post(f"/api/setup/{step}/skip")
    assert _view(c)["finished"] and not _view(c)["walkthrough"]["open"]  # every step is settled
    c.post("/api/setup/walkthrough", json={"finished": True})
    for _ in range(3):
        view = _view(_open(ws))
        assert not view["walkthrough"]["open"] and view["walkthrough"]["finished"]


def test_the_screen_to_open_at_is_the_first_with_something_left_when_none_was_kept(tmp_path):
    ws, c = _fresh(tmp_path)
    for step in ("workspace", "work", "ai"):
        c.post(f"/api/setup/{step}/skip")
    assert _view(c)["walkthrough"]["step"] == "mail"


def test_the_first_result_is_shown_before_the_screens_after_it_when_none_was_kept(tmp_path):
    _, c = _fresh(tmp_path)
    for step in ("workspace", "work", "ai", "mail"):
        c.post(f"/api/setup/{step}/skip")
    walk = _view(c)["walkthrough"]
    assert walk["step"] == "promises" and not walk["promises_done"]  # not passed over to Backups


def test_moving_past_the_first_result_marks_it_done_and_resume_goes_on_from_there(tmp_path):
    _, c = _fresh(tmp_path)
    for step in ("workspace", "work", "ai", "mail"):
        c.post(f"/api/setup/{step}/skip")
    assert c.post("/api/setup/walkthrough", json={"step": "promises"}).json()["promises_done"] is False
    done = c.post("/api/setup/walkthrough", json={"step": "backup"}).json()
    assert done["promises_done"] is True
    c.post("/api/setup/walkthrough", json={"step": "mail"})  # going back keeps it done
    assert _view(c)["walkthrough"]["promises_done"] is True


def test_steps_belong_to_a_screen_and_seven_of_them_count_in_the_order_the_person_meets_them(tmp_path):
    _, c = _fresh(tmp_path)
    steps = _steps(c)
    on = {s: (steps[s]["group"], steps[s]["counted"]) for s in setup.CORE_STEPS}
    assert on == {
        "workspace": ("you", True),
        "work": ("work", True),
        "ai": ("ai", True),
        "mail": ("mail", True),
        "promises": ("promises", True),
        "backup": ("backup", True),
        "people": ("people", True),
        "template": ("done", False),
        "first_note": ("done", False),
        "addons": ("done", False),
    }


def test_finishing_does_not_need_the_optional_extras(tmp_path):
    _, c = _fresh(tmp_path)
    assert not _view(c)["finished"]
    for step in COUNTED:
        c.post(f"/api/setup/{step}/skip")
    view = _view(c)
    # The extras stay undone, the add-ons one too: with nothing installed it isn't offered, and never reads as done.
    extras = [s for s in view["steps"] if s["group"] == "done"]
    assert view["finished"] and extras and not any(s["done"] or s["skipped"] for s in extras)


def test_mail_counts_as_set_up_when_a_mail_or_calendar_source_is_read(tmp_path):
    ws, c = _fresh(tmp_path)
    assert not _steps(c)["mail"]["done"]
    path = ws.config_dir / "watch.yaml"
    config = yaml.safe_load(path.read_text()) or {}
    config["sources"] = [
        {
            "id": "mine",
            "label": "My mail",
            "connector": "mailbox",
            "settings": {"host": "mail.example.com", "user": "me@example.com", "password": "env:MAIL_PASSWORD"},
        }
    ]
    path.write_text(yaml.safe_dump(config))
    assert _steps(_open(ws))["mail"]["done"]


def test_what_a_connector_reads_comes_from_its_name():
    assert reads("mailbox") == ["mail"] and reads("calendar") == ["calendar"]
    assert reads("p18/inbox") == ["mail"] and reads("google/mail") == ["mail"] and reads("x/calendar") == ["calendar"]
    assert reads("folder") == [] and reads("feed") == [] and reads("p18/goals") == []
    provides = {"connectors": ["p18/mail", "p18/calendar", "p18/files"], "sign_ins": ["p18/account"]}
    assert summary(provides, {})["reads"] == ["mail", "calendar"]
    assert summary({"connectors": ["p18/files"]}, {})["reads"] == []


def test_a_sign_in_of_an_add_on_that_reads_mail_is_under_mail_and_calendar_and_is_not_counted(signing):  # noqa: F811
    ws, cfg, store, _ = signing
    store.close()
    _with_sources(ws)
    c, api = _app(ws, cfg)
    found = next(s for s in c.get(f"{api}/setup").json()["steps"] if s["sign_in"] == "p18/service")
    assert found["group"] == "mail" and not found["counted"] and not found["done"]
    assert not {s["id"]: s for s in c.get(f"{api}/setup").json()["steps"]}["mail"]["done"]
    sign_in(c, api)
    steps = {s["id"]: s for s in c.get(f"{api}/setup").json()["steps"]}
    assert steps["p18/service"]["done"] and steps["mail"]["done"]


def test_a_sign_in_of_an_add_on_that_reads_no_mail_is_an_optional_extra(signing):  # noqa: F811
    ws, cfg, store, _ = signing
    found = next(s for s in setup.steps(ws, cfg, store) if s.sign_in == "p18/service")
    assert found.group == "done" and not found.counted
    assert not {s.id: s for s in setup.steps(ws, cfg, store)}["mail"].done


def test_the_add_ons_that_come_with_the_app_are_not_listed_to_turn_on_and_not_on_the_add_ons_screen_while_off(tmp_path):
    """The person's path: a new workspace never asks about the app's own samples and kits, and the Add-ons screen only
    shows them once turned on, or in a sandbox workspace."""
    from engine.plugin_manifest import shipped_plugins

    ws, c = _fresh(tmp_path)
    shipped = shipped_plugins()
    assert shipped and not shipped & set(setup.addons_off(ws, ws.config(env={})))
    listed = {p["name"] for p in c.get("/api/packs").json()["installed"]}
    assert not shipped & listed
    sandbox = init_workspace(tmp_path / "sandbox", template=DEMO_B, git=False)
    assert shipped <= {p["name"] for p in _open(sandbox).get("/api/packs").json()["installed"]}


# ---- the work question: Just me, or Me and my work ---------------------------------------------------------------


def test_the_screens_run_in_the_one_order_the_design_gives():
    assert setup.WALKTHROUGH_STEPS == ("welcome", "you", "work", "ai", "mail", "promises", "backup", "people", "done")


def test_the_work_question_is_a_counted_step_that_reads_as_skipped_when_left_for_later(tmp_path):
    _, c = _fresh(tmp_path)
    assert _steps(c)["work"]["done"] is False and _steps(c)["work"]["counted"] is True
    assert c.get("/api/setup/business").json()["chosen"] is None
    for step in COUNTED:
        c.post(f"/api/setup/{step}/skip")
    work = _steps(c)["work"]
    assert work["skipped"] and not work["done"], "I'll do this later is Skipped, never Done"
    assert _view(c)["finished"]


def test_just_me_is_an_answer_that_keeps_no_work_side(tmp_path):
    ws, c = _fresh(tmp_path)
    answered = c.post("/api/setup/work", json={"choice": "me"})
    assert answered.status_code == 200 and answered.json()["chosen"] == "me"
    assert answered.json()["business"] is False and answered.json()["name"] is None and answered.json()["sides"] == []
    assert _steps(c)["work"]["done"] is True
    assert ws.config(env={}).workspace.project.sides == []
    assert _steps(_open(ws))["work"]["done"] is True  # kept on this computer, so it survives a restart


def test_me_and_my_work_names_the_work_side_and_it_stays(tmp_path):
    ws, c = _fresh(tmp_path)
    assert c.post("/api/setup/work", json={"choice": "work"}).status_code == 422  # a name is needed
    assert c.post("/api/setup/work", json={"choice": "work", "name": "  "}).status_code == 422
    named = c.post("/api/setup/work", json={"choice": "work", "name": "Harbor  Goods"})
    assert named.status_code == 200 and named.json()["chosen"] == "work" and named.json()["name"] == "Harbor Goods"
    cfg = ws.config(env={})
    assert len(cfg.workspace.project.sides) == 1
    assert _steps(c)["work"]["done"] is True
    # Saying another name adds a second side beside the first.
    again = c.post("/api/setup/work", json={"choice": "work", "name": "Harbor Supply"}).json()
    assert [s["name"] for s in again["sides"]] == ["Harbor Goods", "Harbor Supply"] and again["name"] == "Harbor Goods"
    assert len(ws.config(env={}).workspace.project.sides) == 2
    # Once a work side exists, Just me can't quietly pretend there is none.
    refused = c.post("/api/setup/work", json={"choice": "me"})
    assert refused.status_code == 409 and "stays" in refused.json()["detail"]
    assert c.get("/api/setup/business").json()["chosen"] == "work"


def test_the_business_route_is_also_an_answer_to_the_work_question(tmp_path):
    _, c = _fresh(tmp_path)
    c.post("/api/setup/business", json={"name": "Harbor Goods"})
    assert c.get("/api/setup/business").json()["chosen"] == "work" and _steps(c)["work"]["done"]


def test_the_workspace_and_the_assistant_names_are_basic_settings_where_they_are_changed(tmp_path):
    _, c = _fresh(tmp_path)
    items = {i["key"]: i for i in c.get("/api/settings").json()["items"]}
    assert items["workspace.name"]["basic"] and items["workspace.assistant_name"]["basic"]
    assert items["workspace.assistant_name"]["value"] == "Reginald"
    assert items["workspace.name"]["editable"] and items["workspace.assistant_name"]["editable"]


# ---- one list of seven counted steps, and ticks that are true ----------------------------------------------------


def test_the_list_has_seven_counted_steps_in_order_each_with_its_place_and_the_total_is_served(tmp_path):
    _, c = _fresh(tmp_path)
    view = _view(c)
    counted = [s for s in view["steps"] if s["counted"]]
    assert [s["id"] for s in counted] == list(COUNTED)
    assert [s["place"] for s in counted] == [1, 2, 3, 4, 5, 6, 7]
    assert view["total"] == 7 and view["settled"] == 0
    assert all(s["place"] is None for s in view["steps"] if not s["counted"])


def test_skipping_mail_makes_your_promises_skipped_with_the_needs_mail_reason(tmp_path):
    _, c = _fresh(tmp_path)
    assert _steps(c)["promises"]["skipped"] is False and _steps(c)["promises"]["reason"] is None
    c.post("/api/setup/mail/skip")
    promises = _steps(c)["promises"]
    assert promises["skipped"] and not promises["done"] and promises["reason"] == "needs_mail"


def test_moving_on_from_the_first_result_without_it_having_happened_is_skipped_without_a_reason(tmp_path):
    _, c = _fresh(tmp_path)
    c.post("/api/setup/walkthrough", json={"step": "backup"})
    promises = _steps(c)["promises"]
    assert promises["skipped"] and not promises["done"] and promises["reason"] is None


def test_handing_something_in_makes_your_promises_done_even_with_mail_skipped(tmp_path):
    _, c = _fresh(tmp_path)
    c.post("/api/setup/mail/skip")
    assert c.post("/api/handin", json={"note": "Remember to call the plumber on Friday"}).status_code == 200
    promises = _steps(c)["promises"]
    assert promises["done"] and not promises["skipped"] and promises["reason"] is None


def test_a_folder_chosen_is_not_a_backup_made_and_a_backup_made_is(tmp_path):
    from engine.backup import run_backup

    ws, c = _fresh(tmp_path)
    drive = tmp_path / "drive"
    drive.mkdir()
    fingerprint = c.get("/api/settings").json()["fingerprint"]
    chosen = {"storage.backups.targets": [{"path": str(drive), "label": "drive"}]}
    added = c.post("/api/settings", json={"changes": chosen, "reset": [], "fingerprint": fingerprint})
    assert added.status_code == 200, added.text
    assert _steps(c)["backup"]["done"] is False, "choosing where is not a backup"
    run_backup(ws, ws.config(env={}))
    assert _steps(c)["backup"]["done"] is True


def test_todays_setup_count_equals_the_walkthroughs(tmp_path):
    _, c = _fresh(tmp_path)
    c.post("/api/setup/mail/skip")  # also skips Your promises: two of seven
    c.post("/api/setup/work/skip")
    view = _view(c)
    counted = [s for s in view["steps"] if s["counted"]]
    assert view["settled"] == sum(1 for s in counted if s["done"] or s["skipped"]) == 3
    assert view["total"] == len(counted) == 7


def test_saving_the_persons_name_names_a_default_named_workspace_after_them_and_leaves_a_renamed_one_alone(tmp_path):
    ws, c = _fresh(tmp_path)
    assert ws.config(env={}).workspace.name == "Workspace"
    saved = c.post("/api/me", json={"full_name": "Avery Stone", "workspace_name": "Avery's"})
    assert saved.status_code == 200
    assert ws.config(env={}).workspace.name == "Avery's"
    # The person renamed it themselves: a later name save never overwrites that.
    fingerprint = c.get("/api/settings").json()["fingerprint"]
    assert (
        c.post(
            "/api/settings",
            json={"changes": {"workspace.name": "Harbor Goods"}, "reset": [], "fingerprint": fingerprint},
        ).status_code
        == 200
    )
    c.post("/api/me", json={"full_name": "Avery Stone-Hale", "workspace_name": "Avery's"})
    assert ws.config(env={}).workspace.name == "Harbor Goods"


def test_a_name_saved_without_a_workspace_name_leaves_the_default_alone(tmp_path):
    ws, c = _fresh(tmp_path)
    c.post("/api/me", json={"full_name": "Avery Stone"})
    assert ws.config(env={}).workspace.name == "Workspace"


# ---- the Work step with several sides: a job and any number of businesses ----------------------------

JOB_NAME = BUSINESS_NAME
FIRST_BUSINESS = OTHER_BUSINESS_NAME
SECOND_BUSINESS = THIRD_NAME
WORKS_ON = [p["name"] for p in fixture_records(DEMO_B, "project")[:3]]


def _add_side(c, name, kind):
    made = c.post("/api/setup/business", json={"name": name, "kind": kind})
    assert made.status_code == 200, made.text
    return made.json()["project"]


def test_a_job_and_two_businesses_make_three_sides_in_order_with_their_kinds(tmp_path):
    ws, c = _fresh(tmp_path)
    job = _add_side(c, JOB_NAME, "job")
    first = _add_side(c, FIRST_BUSINESS, "business")
    second = _add_side(c, SECOND_BUSINESS, "business")
    state = c.get("/api/setup/business").json()
    assert [(s["project"], s["kind"], s["name"]) for s in state["sides"]] == [
        (job, "job", JOB_NAME),
        (first, "business", FIRST_BUSINESS),
        (second, "business", SECOND_BUSINESS),
    ]
    assert state["chosen"] == "work" and _steps(c)["work"]["done"] is True
    cfg = ws.config(env={})
    assert [(e.project, e.kind) for e in cfg.workspace.project.sides] == [
        (job, "job"),
        (first, "business"),
        (second, "business"),
    ]
    # The workspace keeps the person's name: no business renames it.
    assert cfg.workspace.name == "Workspace"


def test_what_a_business_works_on_becomes_projects_under_it_through_the_project_route(tmp_path):
    ws, c = _fresh(tmp_path)
    business = _add_side(c, FIRST_BUSINESS, "business")
    ids = []
    for line in WORKS_ON:
        made = c.post("/api/projects", json={"name": line, "parent": business})
        assert made.status_code == 200, made.text
        ids.append(made.json()["id"])
    app_store = c.app.state.store
    view, cfg = app_store.read(), ws.config(env={})
    assert [view.get("project", i).data["parent"] for i in ids] == [business] * len(ids)
    assert all(sides.side_of_project(view, cfg, i) == business for i in ids)
    # A name another project has is refused in words, and nothing is made.
    again = c.post("/api/projects", json={"name": WORKS_ON[0], "parent": business})
    assert again.status_code == 409
    assert len(app_store.read().list("project")) == 2 + len(WORKS_ON)  # Personal, the business and its projects


def test_renaming_a_side_edits_its_project_and_keeps_its_id_and_its_place_in_the_sides(tmp_path):
    ws, c = _fresh(tmp_path)
    job = _add_side(c, JOB_NAME, "job")
    first = _add_side(c, FIRST_BUSINESS, "business")
    second = _add_side(c, SECOND_BUSINESS, "business")
    renamed = c.post(f"/api/projects/{first}", json={"name": f"{FIRST_BUSINESS} Renamed"})
    assert renamed.status_code == 200, renamed.text
    state = c.get("/api/setup/business").json()
    assert [(s["project"], s["name"]) for s in state["sides"]] == [
        (job, JOB_NAME),
        (first, f"{FIRST_BUSINESS} Renamed"),
        (second, SECOND_BUSINESS),
    ]
    assert [e.project for e in ws.config(env={}).workspace.project.sides] == [job, first, second]
    assert len(c.app.state.store.read().list("project")) == 4  # nothing was added by the rename


def test_a_side_made_in_setup_is_removable_until_something_is_filed_under_it_or_setup_ends(tmp_path):
    ws, c = _fresh(tmp_path)
    keep = _add_side(c, FIRST_BUSINESS, "business")
    drop = _add_side(c, SECOND_BUSINESS, "business")
    child = c.post("/api/projects", json={"name": WORKS_ON[0], "parent": drop}).json()["id"]
    state = c.get("/api/setup/business").json()
    assert [s["removable"] for s in state["sides"]] == [True, True]
    store = c.app.state.store
    with store.transaction() as tx:
        owner = tx.create("person", {"full_name": "Casey Example"}, _PM).id
        tx.create("action", {"text": "Order the thread", "project": keep, "owners": [{"person": owner}]}, _PM)
    state = c.get("/api/setup/business").json()
    assert [(s["project"], s["removable"]) for s in state["sides"]] == [(keep, False), (drop, True)]
    refused = c.post(f"/api/setup/sides/{keep}/remove")
    assert refused.status_code == 409 and "filed" in refused.json()["detail"]
    gone = c.post(f"/api/setup/sides/{drop}/remove")
    assert gone.status_code == 200, gone.text
    assert [s["project"] for s in gone.json()["sides"]] == [keep]
    view = store.read()
    assert view.get("project", drop) is None and view.get("project", child) is None
    assert [e.project for e in ws.config(env={}).workspace.project.sides] == [keep]
    assert c.post(f"/api/setup/sides/{drop}/remove").status_code == 409  # no longer a side
    # Once setup is finished nothing is offered or accepted.
    c.post("/api/setup/walkthrough", json={"finished": True})
    assert [s["removable"] for s in c.get("/api/setup/business").json()["sides"]] == [False]
    assert c.post(f"/api/setup/sides/{keep}/remove").status_code == 409


def test_taking_back_the_last_side_leaves_the_work_question_unanswered(tmp_path):
    _, c = _fresh(tmp_path)
    only = _add_side(c, JOB_NAME, "job")
    assert c.get("/api/setup/business").json()["chosen"] == "work"
    state = c.post(f"/api/setup/sides/{only}/remove").json()
    assert state["sides"] == [] and state["business"] is False and state["chosen"] is None
    assert _steps(c)["work"]["done"] is False


def test_the_sides_a_mailbox_serves_are_saved_through_settings_and_file_what_nothing_else_places(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you="Pat Example")
    cfg = ws.config(env={}, flags={"server.base_path": "/", "storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as c:
        first = _add_side(c, FIRST_BUSINESS, "business")
        second = _add_side(c, SECOND_BUSINESS, "business")
        folder = tmp_path / "inbox"
        folder.mkdir()
        fingerprint = c.get("/api/settings").json()["fingerprint"]
        added = c.post(
            "/api/watch/sources",
            json={
                "connector": "folder",
                "label": "Shared inbox",
                "settings": {"path": str(folder)},
                "fingerprint": fingerprint,
            },
        )
        assert added.status_code == 200, added.text
        shown = c.get("/api/settings").json()
        stored = next(i["value"] for i in shown["items"] if i["key"] == "watch.sources")
        assert [s["id"] for s in stored] == ["shared-inbox"] and not stored[0].get("sides")
        # The mail step ticks the second side for this source, as the settings save does for any list of sources.
        changed = [{**stored[0], "sides": [second]}]
        saved = c.post(
            "/api/settings",
            json={"changes": {"watch.sources": changed}, "reset": [], "fingerprint": shown["fingerprint"]},
        )
        assert saved.status_code == 200, saved.text
        assert saved.json()["changes"][0]["key"] == "watch.sources"
        assert [s.sides for s in ws.config(env={}).watch.sources] == [[second]]
        store, now = app.state.store, ws.config(env={})
        env = (ws, now, store)
        source = a_watched_source(env, "shared-inbox")
        placed = sides.file_by_people(
            [new_op(text="Call about it")], store.read(), now, People(store, now), None, None, source=source
        )
        assert placed[0].project == second and placed[0].filed_by.by == "source"
        # Two sides ticked narrow the choice to them and decide nothing alone; nothing ticked is "not said".
        both = [{**stored[0], "sides": [first, second]}]
        fingerprint = c.get("/api/settings").json()["fingerprint"]
        assert (
            c.post(
                "/api/settings", json={"changes": {"watch.sources": both}, "reset": [], "fingerprint": fingerprint}
            ).status_code
            == 200
        )
        now = ws.config(env={})
        placed = sides.file_by_people(
            [new_op(text="Call about it")], store.read(), now, People(store, now), None, None, source=source
        )
        assert placed[0].filed_by is None and placed[0].project == ws.config(env={}).workspace.project.personal
        none = [{**stored[0], "sides": []}]
        fingerprint = c.get("/api/settings").json()["fingerprint"]
        assert (
            c.post(
                "/api/settings", json={"changes": {"watch.sources": none}, "reset": [], "fingerprint": fingerprint}
            ).status_code
            == 200
        )
        assert [s.sides for s in ws.config(env={}).watch.sources] == [[]]


def test_removing_a_side_and_undoing_it_gives_back_the_same_projects_order_kind_and_answer(tmp_path):
    ws, c = _fresh(tmp_path)
    job = _add_side(c, JOB_NAME, "job")
    middle = _add_side(c, FIRST_BUSINESS, "business")
    last = _add_side(c, SECOND_BUSINESS, "business")
    children = [c.post("/api/projects", json={"name": n, "parent": middle}).json()["id"] for n in WORKS_ON[:2]]
    before = [(e.project, e.kind) for e in ws.config(env={}).workspace.project.sides]
    removed = c.post(f"/api/setup/sides/{middle}/remove")
    assert removed.status_code == 200, removed.text
    assert [s["project"] for s in removed.json()["sides"]] == [job, last]
    # What Undo needs is what the screen read before: the side's kind and its place in the list.
    restored = c.post(f"/api/setup/sides/{middle}/restore", json={"kind": "business", "position": 1})
    assert restored.status_code == 200, restored.text
    assert [(s["project"], s["kind"], s["name"]) for s in restored.json()["sides"]] == [
        (job, "job", JOB_NAME),
        (middle, "business", FIRST_BUSINESS),
        (last, "business", SECOND_BUSINESS),
    ]
    assert [(e.project, e.kind) for e in ws.config(env={}).workspace.project.sides] == before
    view = c.app.state.store.read()
    assert [view.get("project", i).data["parent"] for i in children] == [middle, middle]
    # A project that isn't a removed side is refused in words, and so is a kind that isn't one.
    assert c.post(f"/api/setup/sides/{middle}/restore", json={"kind": "business", "position": 0}).status_code == 409
    assert (
        c.post(f"/api/setup/sides/{children[0]}/restore", json={"kind": "business", "position": 0}).status_code == 409
    )
    assert c.post(f"/api/setup/sides/{middle}/restore", json={"kind": "hobby", "position": 0}).status_code == 422


def test_undoing_the_removal_of_the_last_side_brings_back_the_work_answer(tmp_path):
    _, c = _fresh(tmp_path)
    only = _add_side(c, JOB_NAME, "job")
    assert c.post(f"/api/setup/sides/{only}/remove").json()["chosen"] is None
    state = c.post(f"/api/setup/sides/{only}/restore", json={"kind": "job", "position": 0}).json()
    assert state["chosen"] == "work" and [s["kind"] for s in state["sides"]] == ["job"]
    assert _steps(c)["work"]["done"] is True


# ---- ticks come from records (the reviewer's G8, check U16) ---------------------------------------------------------


def _screen_request(c) -> None:
    """What any change the person makes on a screen leaves behind: a request of theirs that holds no hand-in."""
    with c.app.state.store.transaction() as tx:
        tx.create(
            "request",
            {
                "task": "notes",
                "origin": "pm",
                "state": "done",
                "note": "Changed a to-do",
                "created_at": "2026-10-20T09:00:00",
            },
            _PM,
        )


def test_a_first_note_is_ticked_only_when_something_was_handed_in_not_for_any_change_made_on_a_screen(tmp_path):
    _, c = _fresh(tmp_path)
    _screen_request(c)
    assert not _steps(c)["first_note"]["done"] and not _steps(c)["promises"]["done"]
    assert c.post("/api/handin", json={"note": "Remember to call the plumber on Friday"}).status_code == 200
    assert _steps(c)["first_note"]["done"] and _steps(c)["promises"]["done"]


def test_a_question_typed_to_the_assistant_is_no_first_note_and_ticks_nothing(tmp_path):
    """The person's path: they only asked the assistant something (Ask). That is not a note handed in, so neither the
    first note nor the first result is ticked, and the last screen has no Done for them."""
    _, c = _fresh(tmp_path)
    assert c.post("/api/ask", json={"question": "What can you do for me?"}).status_code == 200
    steps = _steps(c)
    assert not steps["first_note"]["done"] and not steps["promises"]["done"]


def test_your_promises_is_not_ticked_before_its_screen_was_reached_even_when_the_look_back_ran(tmp_path, monkeypatch):
    _, c = _fresh(tmp_path)
    monkeypatch.setattr(setup, "_looked_back", lambda requests: True)
    c.post("/api/setup/walkthrough", json={"step": "mail"})
    assert not _steps(c)["promises"]["done"], "the look back ran while the person was still on the mail step"
    c.post("/api/setup/walkthrough", json={"step": "promises"})
    assert _steps(c)["promises"]["done"], "the first result is on the screen, so its own thing happened"


def test_the_add_ons_step_is_dropped_once_mail_is_connected_and_offered_only_while_something_is_off(
    tmp_path, monkeypatch
):
    ws, c = _fresh(tmp_path)
    monkeypatch.setattr(setup, "addons_off", lambda ws_, cfg: ["some-addon"])
    assert _steps(c)["addons"]["applies"] is True
    path = ws.config_dir / "watch.yaml"
    config = yaml.safe_load(path.read_text()) or {}
    config["sources"] = [
        {
            "id": "mine",
            "label": "My mail",
            "connector": "mailbox",
            "settings": {"host": "mail.example.com", "user": "me@example.com", "password": "env:MAIL_PASSWORD"},
        }
    ]
    path.write_text(yaml.safe_dump(config))
    assert _steps(_open(ws))["mail"]["done"]
    assert _steps(_open(ws))["addons"]["applies"] is False


def test_the_work_templates_are_offered_only_when_no_jobs_were_given_in_setup(tmp_path):
    _, c = _fresh(tmp_path)
    business = _add_side(c, FIRST_BUSINESS, "business")
    assert _steps(c)["template"]["applies"] is True, "a business with nothing under it has given no jobs"
    assert c.post("/api/projects", json={"name": WORKS_ON[0], "parent": business}).status_code == 200
    assert _steps(c)["template"]["applies"] is False


def test_every_counted_tick_is_computed_from_its_own_record_and_no_screen_state_ticks_one(tmp_path):
    """Moving through the screens, skipping or finishing the walkthrough ticks nothing: each step's `done` follows a
    record of its own thing (a name, an account, a connection, a hand-in or the first result, a backup, people)."""
    ws, c = _fresh(tmp_path)
    for screen in setup.WALKTHROUGH_STEPS:
        c.post("/api/setup/walkthrough", json={"step": screen})
    c.post("/api/setup/walkthrough", json={"finished": True})
    _screen_request(c)
    ticked = [s for s, v in _steps(c).items() if v["counted"] and v["done"]]
    assert ticked == [], f"ticked with no record behind it: {ticked}"
    assert not _steps(c)["first_note"]["done"]


def test_moving_on_from_people_with_nobody_added_passes_the_step_and_says_so(tmp_path):
    _, c = _fresh(tmp_path)
    assert not _steps(c)["people"]["skipped"]
    c.post("/api/setup/walkthrough", json={"step": "done"})
    people = _steps(c)["people"]
    assert people["skipped"] and not people["done"] and people["reason"] == "none_added"
    c.post("/api/setup/walkthrough", json={"step": "people"})
    assert _steps(c)["people"]["skipped"], "going back to look does not make it a to-do again"
