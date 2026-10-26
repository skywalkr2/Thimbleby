"""The new-start walkthrough (design 7.8): the server keeps where it stands (the screen the person is on, closed,
finished). It opens by itself on every visit while naming yourself or choosing an AI account is missing, otherwise only
on the first visit, and resumes at the kept screen. The setup steps it is a view
of are grouped by screen: an add-on that reads mail or a calendar has its sign-in and steps under mail and calendar, and
the optional extras never count toward finishing."""

from __future__ import annotations

import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine import setup
from engine.connectors import reads
from engine.packs import summary
from engine.workspace import init_workspace
from tests.conftest import DEMO_B
from tests.test_sign_in import signing as signing  # noqa: F401 - the fixture
from tests.test_sign_in_sources import _app, _with_sources, sign_in

TOKEN = "t"
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


def test_finish_later_keeps_its_screen_and_it_opens_again_next_visit_while_you_or_an_ai_account_is_missing(tmp_path):
    ws, c = _fresh(tmp_path)
    c.post("/api/setup/walkthrough", json={"step": "ai"})
    closed = c.post("/api/setup/walkthrough", json={"closed": True}).json()
    assert closed["closed"] and closed["step"] == "ai"
    again = _view(_open(ws))  # the next visit, after a restart
    assert again["walkthrough"]["open"] and again["walkthrough"]["step"] == "ai"
    assert not again["finished"]  # Today's setup line still has work to show


def _found(named=True):
    """Setup steps as the walkthrough sees them: You done or not, People not done."""
    return [setup.Step(i, d, False, group=i, counted=True) for i, d in {"workspace": named, "people": False}.items()]


def test_once_you_and_an_ai_account_are_set_it_opens_by_itself_only_on_the_first_visit(tmp_path):
    """The person's path: they don't add people yet. The walkthrough doesn't come back on later visits; People waits on
    Today's setup line. Without their name or any AI account chosen, it comes back on every visit."""
    ws, c = _fresh(tmp_path)
    from types import SimpleNamespace

    def settings(use):
        tiers = {"routine": SimpleNamespace(use=use)}
        return SimpleNamespace(workspace=SimpleNamespace(demo=False), ai=SimpleNamespace(tiers=tiers))

    cfg, no_account = settings("an-account/a-model"), settings(None)
    assert setup.walkthrough(ws, cfg, _found()).open  # the first visit
    c.post("/api/setup/walkthrough", json={"step": "people"})  # it was shown
    assert not setup.walkthrough(ws, cfg, _found()).open
    c.post("/api/setup/walkthrough", json={"closed": True})
    assert not setup.walkthrough(ws, cfg, _found()).open
    assert setup.walkthrough(ws, cfg, _found(named=False)).open
    assert setup.walkthrough(ws, no_account, _found()).open
    c.post("/api/setup/walkthrough", json={"finished": True})
    assert setup.walkthrough(ws, no_account, _found()).open
    assert not setup.walkthrough(ws, cfg, _found()).open


def test_an_unknown_screen_is_refused_and_nothing_is_kept(tmp_path):
    _, c = _fresh(tmp_path)
    assert c.post("/api/setup/walkthrough", json={"step": "nowhere"}).status_code == 422
    assert _view(c)["walkthrough"]["step"] == "welcome"


def test_the_sandbox_workspaces_do_not_open_it_by_themselves(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    assert not _view(_open(ws))["walkthrough"]["open"]


def test_skipping_every_step_still_brings_it_back_while_you_and_an_ai_account_are_missing(tmp_path):
    ws, c = _fresh(tmp_path)
    for step in COUNTED:
        c.post(f"/api/setup/{step}/skip")
    view = _view(c)
    assert view["finished"] and view["walkthrough"]["open"]


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
