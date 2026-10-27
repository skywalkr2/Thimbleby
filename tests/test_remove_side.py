"""Removing a business after setup (the UI/UX review, design 7.8 and 6.32): the business page offers
Remove, and each time it asks whether the business's projects and to-dos move to Personal or end with it. Either way it
is one changeset through the applier, so it is in the ledger and one Undo brings the business back; no new op is used
(`record.set` of a project's parent or status, with the ending's own drops). A removal that touches many records makes a
backup first."""

from __future__ import annotations

from engine import sides
from engine.storage import WriteContext
from tests.test_backup_before_changes import backups_to, copies, gone
from tests.test_walkthrough import FIRST_BUSINESS, JOB_NAME, WORKS_ON, _add_side, _fresh

_PM = WriteContext(actor="pm", trust="trusted", op="test.remove-side")


def _world(tmp_path):
    """A business with two projects inside it and a to-do in each place: on the business, and on each project."""
    ws, c = _fresh(tmp_path)
    side = _add_side(c, FIRST_BUSINESS, "business")
    inside = [c.post("/api/projects", json={"name": n, "parent": side}).json()["id"] for n in WORKS_ON[:2]]
    store = c.app.state.store
    with store.transaction() as tx:
        who = tx.create("person", {"full_name": "Pat Doe"}, _PM).id
        todos = [
            tx.create("action", {"text": text, "project": where, "owners": [{"person": who}], "status": "open"}, _PM).id
            for text, where in (
                ("Call the supplier", side),
                ("Order the cloth", inside[0]),
                ("Send the quote", inside[1]),
            )
        ]
    return ws, c, side, inside, todos


def _remove(c, side, where):
    return c.post(f"/api/sides/{side}/remove", json={"where": where})


def _side_ids(c):
    return [s["project"] for s in c.get("/api/setup/business").json()["sides"]]


def _changesets(c):
    return {cs.id for cs in c.app.state.store.read().list("changeset")}


def test_moving_to_personal_is_one_changeset_that_keeps_every_project_and_to_do_under_personal_and_undo_brings_it_back(
    tmp_path,
):
    ws, c, side, inside, todos = _world(tmp_path)
    personal = ws.config(env={}).workspace.project.personal
    before = _changesets(c)
    done = _remove(c, side, "personal")
    assert done.status_code == 200, done.text
    cs = done.json()["changeset"]
    assert _changesets(c) - before == {cs}  # one changeset, in the ledger
    assert all(o["status"] == "applied" for o in c.app.state.store.read().get("changeset", cs).data["ops"])
    assert side not in _side_ids(c)
    view, cfg = c.app.state.store.read(), ws.config(env={})
    # What was inside it is inside Personal now, and every to-do is still open.
    assert all(sides.side_of_project(view, cfg, p) == personal for p in [side, *inside])
    assert all(view.get("action", t).data["status"] == "open" for t in todos)
    assert all(sides.side_of_item(view, cfg, view.get("action", t)) == personal for t in todos)
    undone = c.post(f"/api/changesets/{cs}/undo", json={"ops": None})
    assert undone.status_code == 200, undone.text
    assert _side_ids(c) == [side]
    view = c.app.state.store.read()
    assert sides.side_of_project(view, ws.config(env={}), inside[0]) == side
    assert view.get("project", side).data.get("parent") is None


def test_ending_with_the_business_ends_its_projects_and_drops_its_open_to_dos_in_one_changeset_with_undo(tmp_path):
    ws, c, side, inside, todos = _world(tmp_path)
    before = _changesets(c)
    done = _remove(c, side, "end")
    assert done.status_code == 200, done.text
    cs = done.json()["changeset"]
    assert _changesets(c) - before == {cs}
    store = c.app.state.store
    assert all(o["status"] == "applied" for o in store.read().get("changeset", cs).data["ops"])
    assert side not in _side_ids(c)
    view = store.read()
    completed = ws.config(env={}).workspace.project.completed_status
    assert [view.get("project", p).data["status"] for p in [side, *inside]] == [completed] * 3
    assert [view.get("action", t).data["status"] for t in todos] == ["dropped"] * 3
    c.post(f"/api/changesets/{cs}/undo", json={"ops": None})
    view = store.read()
    assert _side_ids(c) == [side]
    assert [view.get("action", t).data["status"] for t in todos] == ["open"] * 3
    assert view.get("project", side).data.get("status") != completed


def test_ending_with_the_business_drafts_one_note_to_each_person_told_and_undo_takes_it_back(tmp_path):
    ws, c, side, inside, todos = _world(tmp_path)
    store = c.app.state.store
    told = todos[:2]
    with store.transaction() as tx:
        who = next(o["person"] for o in tx.get("action", told[0]).data["owners"])
        found = tx.get("person", who)
        tx.update(
            "person", who, {"how_to_reach": {"email": "told.person@example.com"}}, _PM, read_version=found.version
        )
        for action in told:
            found = tx.get("action", action)
            tx.update("action", action, {"told": {who: "2026-10-01"}}, _PM, read_version=found.version)
    questions = {q.id for q in store.read().list("question")}
    done = _remove(c, side, "end")
    assert done.status_code == 200, done.text
    body = done.json()
    (act_id,) = body["acts"]
    assert len(body["drafts"]) == 1 and len(body["names"]) == 1, "one note to the one person, however many to-dos"
    assert {q.id for q in store.read().list("question")} == questions, "no copyable line"
    shown = c.get(f"/api/acts/{act_id}").json()
    assert shown["status"] == "draft"
    lines = shown["parts"]["body"].splitlines()
    assert len(lines) == 2
    for action in told:
        assert " ".join(store.read().get("action", action).data["text"].split()) in shown["parts"]["body"]
    assert c.post(f"/api/changesets/{body['changeset']}/undo", json={"ops": None}).status_code == 200
    view = store.read()
    assert view.get("act", act_id) is None
    assert [view.get("action", t).data["status"] for t in todos] == ["open"] * 3
    assert _side_ids(c) == [side]


def test_moving_to_personal_drafts_no_note_even_for_a_told_to_do(tmp_path):
    ws, c, side, inside, todos = _world(tmp_path)
    store = c.app.state.store
    with store.transaction() as tx:
        who = next(o["person"] for o in tx.get("action", todos[0]).data["owners"])
        found = tx.get("action", todos[0])
        tx.update("action", todos[0], {"told": {who: "2026-10-01"}}, _PM, read_version=found.version)
    body = _remove(c, side, "personal").json()
    assert body["drafts"] == [] and body["acts"] == [] and body["names"] == []


def test_a_job_is_removed_the_same_way_and_the_other_sides_stay_in_order(tmp_path):
    ws, c = _fresh(tmp_path)
    job = _add_side(c, JOB_NAME, "job")
    shop = _add_side(c, FIRST_BUSINESS, "business")
    assert _remove(c, job, "personal").status_code == 200
    assert _side_ids(c) == [shop]


def test_something_that_is_not_a_side_or_not_a_choice_is_refused_in_words(tmp_path):
    ws, c, side, inside, _ = _world(tmp_path)
    assert _remove(c, inside[0], "personal").status_code == 409  # a project inside a side is not a side
    assert _remove(c, side, "nowhere").status_code == 422
    assert c.get("/api/setup/business").json()["sides"] and _side_ids(c) == [side]


def test_a_removal_that_touches_many_records_makes_a_backup_first_and_stops_when_it_cannot(tmp_path):
    ws, c, side, inside, todos = _world(tmp_path)
    drive = tmp_path / "drive"
    backups_to(ws, drive, bulk_change_records=1)
    gone(drive)
    refused = _remove(c, side, "end")
    assert refused.status_code == 409 and "Nothing was changed" in refused.json()["detail"]
    assert _side_ids(c) == [side]
    assert c.app.state.store.read().get("action", todos[0]).data["status"] == "open"
    backups_to(ws, drive, bulk_change_records=1)
    assert _remove(c, side, "end").status_code == 200
    assert len(copies(drive)) == 1


def test_a_small_removal_makes_no_backup(tmp_path):
    ws, c = _fresh(tmp_path)
    side = _add_side(c, FIRST_BUSINESS, "business")
    drive = tmp_path / "drive"
    backups_to(ws, drive, bulk_change_records=50)
    assert _remove(c, side, "personal").status_code == 200
    assert copies(drive) == []
