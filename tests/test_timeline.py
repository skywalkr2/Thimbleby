"""The schedule's timeline (design 7.7, "Timeline"): one lane for each project that has something in the range, the
calendar entries, to-dos, promises, target days and dated facts on a lane told apart by kind, the days people don't
work, and the side and views each lane carries so the side filter narrows it. Names come from the fixtures."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.timeline import RANGES, timeline
from engine.workspace import init_workspace
from tests.e2e_just_me import the_person
from tests.test_views import CTX, TOKEN, Env

NOW = datetime(2026, 10, 14, 14, 0, tzinfo=UTC)  # a Wednesday; the week starts on Monday the 12th
MONDAY = date(2026, 10, 12)


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield Env(client, app.state.store, cfg, app)


def add(env, kind, data):
    with env.store.transaction() as tx:
        return tx.create(kind, data, CTX).id


def lanes(env, range_name="ten_weeks", start=None):
    return {lane.project: lane for lane in timeline(env.store, env.cfg, NOW, start, range_name).lanes}


def todo(env, text, project, due, **more):
    return add(env, "action", {"text": text, "owners": [{"person": env.me}], "project": project, "due": due, **more})


def test_a_range_starts_on_the_first_day_of_the_week_and_is_a_whole_number_of_weeks(env):
    for name, days in RANGES.items():
        found = timeline(env.store, env.cfg, NOW, None, name)
        assert found.first == MONDAY and (found.last - found.first).days + 1 == days and found.range == name
    assert timeline(env.store, env.cfg, NOW, None, None).range == env.cfg.ui.schedule.timeline_range
    assert timeline(env.store, env.cfg, NOW, None, "nonsense").range == env.cfg.ui.schedule.timeline_range
    assert timeline(env.store, env.cfg, NOW, date(2026, 11, 2), "two_weeks").first == date(2026, 11, 2)


def test_only_a_project_with_something_in_the_range_has_a_lane(env):
    todo(env, "Send the quote", env.both, "2026-10-20")
    todo(env, "Too far off", env.first, "2027-03-01")
    add(env, "action", {"text": "No date", "owners": [{"person": env.me}], "project": env.rest})
    found = lanes(env)
    assert set(found) == {env.both}
    assert [i.title for i in found[env.both].items] == ["Send the quote"]
    assert set(lanes(env, "two_weeks")) == {env.both}
    assert lanes(env, "two_weeks", date(2026, 11, 2)) == {}


def test_each_kind_of_item_lands_on_its_lane_with_its_kind(env):
    me = env.me
    entry = add(env, "event", {"title": "Review the plan", "start": "2026-10-15T10:00:00+00:00", "project": env.both})
    trip = add(env, "event", {"title": "Site visit", "start": "2026-10-19", "end": "2026-10-21", "project": env.both})
    plain = todo(env, "Send the quote", env.both, "2026-10-16")
    promise = todo(env, "Share the draft", env.both, "2026-10-17", promised_to=[me])
    fact = add(
        env, "fact", {"text": "The licence renews", "project": env.both, "on": "2026-10-22", "on_kind": "renewal"}
    )
    with env.store.transaction() as tx:
        found = tx.get("project", env.both)
        tx.update("project", env.both, {"target": "2026-10-30"}, CTX, read_version=found.version)
    items = {(i.kind, i.id): i for i in lanes(env)[env.both].items}
    assert set(items) == {
        ("entry", entry),
        ("entry", trip),
        ("todo", plain),
        ("promise", promise),
        ("fact", fact),
        ("target", env.both),
    }
    assert items[("entry", entry)].start == items[("entry", entry)].end == date(2026, 10, 15)
    assert items[("entry", entry)].entry is not None and items[("entry", entry)].entry.begins.startswith(
        "2026-10-15T10"
    )
    # An entry on several days is a bar: its end is a later day than its start.
    assert (items[("entry", trip)].start, items[("entry", trip)].end) == (date(2026, 10, 19), date(2026, 10, 21))
    assert items[("fact", fact)].detail == "renewal"
    assert items[("target", env.both)].start == date(2026, 10, 30) and items[("target", env.both)].title
    # Items are in day order.
    days = [i.start for i in lanes(env)[env.both].items]
    assert days == sorted(days)


def test_a_to_do_is_overdue_open_or_done_and_a_date_still_to_be_checked_is_not_a_deadline(env):
    late = todo(env, "Send the invoice", env.both, "2026-10-13")
    ahead = todo(env, "Send the quote", env.both, "2026-10-16")
    paused = todo(
        env,
        "Wait for the printer",
        env.both,
        "2026-10-13",
        on_hold={"waiting_for": "the printer", "since": "2026-10-01"},
    )
    closed = todo(env, "Pay the deposit", env.both, "2026-10-13", status="done")
    todo(env, "Maybe the 14th", env.both, "2026-10-14", due_check=True)
    todo(env, "Dropped", env.both, "2026-10-14", status="dropped")
    state = {i.id: i.state for i in lanes(env)[env.both].items}
    assert state == {late: "overdue", ahead: "open", paused: "open", closed: "done"}


def test_a_fact_that_was_replaced_is_left_out(env):
    old = add(env, "fact", {"text": "Due on the 20th", "project": env.both, "on": "2026-10-20", "on_kind": "deadline"})
    new = add(
        env,
        "fact",
        {"text": "Due on the 22nd", "project": env.both, "on": "2026-10-22", "on_kind": "deadline", "supersedes": old},
    )
    assert [i.id for i in lanes(env)[env.both].items] == [new]


def test_a_sub_project_has_its_own_lane_indented_under_its_parent(env):
    todo(env, "Plan the part", env.sub, "2026-10-16")
    todo(env, "Plan the whole", env.both, "2026-10-16")
    todo(env, "Plan the other", env.first, "2026-10-16")
    found = timeline(env.store, env.cfg, NOW, None, "ten_weeks").lanes
    order = [lane.project for lane in found]
    assert order.index(env.both) + 1 == order.index(env.sub)
    by = {lane.project: lane for lane in found}
    assert (by[env.both].depth, by[env.sub].depth, by[env.first].depth) == (0, 1, 0)
    assert by[env.sub].parent == env.both and by[env.sub].parent_name is None
    # A sub-project whose parent has nothing of its own in the range is its own lane and names its parent.
    with env.store.transaction() as tx:
        gone = [a for a in tx.list("action") if a.data.get("project") == env.both]
        for a in gone:
            tx.delete("action", a.id, CTX, read_version=a.version)
    by = {lane.project: lane for lane in timeline(env.store, env.cfg, NOW, None, "ten_weeks").lanes}
    assert env.both not in by and by[env.sub].depth == 0 and by[env.sub].parent_name


def test_lanes_are_grouped_under_their_side_with_the_side_and_views_the_filter_reads(env):
    todo(env, "At work", env.both, "2026-10-16")
    todo(env, "At home", env.home, "2026-10-16")
    add(
        env,
        "action",
        {"text": "On the side itself", "owners": [{"person": env.me}], "project": env.personal, "due": "2026-10-16"},
    )
    found = timeline(env.store, env.cfg, NOW, None, "ten_weeks").lanes
    # Personal first, then the job; Personal's own lane before the project inside it.
    assert [lane.project for lane in found] == [env.personal, env.home, env.both]
    by = {lane.project: lane for lane in found}
    assert by[env.both].side == env.job and by[env.home].side == env.personal and by[env.personal].side == env.personal
    assert by[env.both].in_project and by[env.home].in_project and not by[env.personal].in_project
    assert by[env.both].views == [env.managing, env.own] and by[env.home].views == []
    assert by[env.personal].name


def test_a_calendar_entry_on_no_project_is_on_the_lane_of_no_project(env):
    add(env, "event", {"title": "Dentist", "start": "2026-10-15T09:00:00+00:00"})
    found = timeline(env.store, env.cfg, NOW, None, "ten_weeks").lanes
    assert [lane.project for lane in found] == [None]
    assert found[0].side is None and not found[0].in_project and found[0].items[0].title == "Dentist"


def test_the_workspace_s_rest_days_and_holidays_are_shared_and_a_team_s_and_a_person_s_days_only_on_their_lanes(env):
    owner = add(env, "person", {"full_name": "Casey Example"})
    other = add(env, "person", {"full_name": "Robin Example"})
    team = add(
        env,
        "team",
        {
            "name": "Closing crew",
            "members": [owner],
            "days_off": [{"start": "2026-11-23", "end": "2026-11-24", "label": "closed for the move"}],
        },
    )
    for project, who in ((env.both, owner), (env.first, other)):
        with env.store.transaction() as tx:
            found = tx.get("project", project)
            tx.update("project", project, {"owner": who}, CTX, read_version=found.version)
    with env.store.transaction() as tx:
        found = tx.get("person", other)
        tx.update(
            "person", other, {"away": [{"start": "2026-11-17", "label": "vacation"}]}, CTX, read_version=found.version
        )
    todo(env, "A", env.both, "2026-11-20")
    todo(env, "B", env.first, "2026-11-20")
    todo(env, "C", env.rest, "2026-11-20")
    found = timeline(env.store, env.cfg, NOW, None, "quarter")
    shared = {(o.day, o.kind): o.reason for o in found.off_days}
    assert (date(2026, 10, 17), "weekend") in shared and (date(2026, 10, 18), "weekend") in shared
    assert (date(2026, 10, 19), "weekend") not in shared
    assert shared[(date(2026, 11, 26), "holiday")] == "Thanksgiving"
    by = {lane.project: lane for lane in found.lanes}
    assert by[env.both].team == team
    assert {(o.day, o.kind, o.reason) for o in by[env.both].days_off} == {
        (date(2026, 11, 23), "team", "closed for the move"),
        (date(2026, 11, 24), "team", "closed for the move"),
    }
    # The holiday the team shares with the workspace is not listed again on the lane.
    assert all(o.day != date(2026, 11, 26) for o in by[env.both].days_off)
    assert [(o.day, o.kind, o.reason) for o in by[env.first].days_off] == [(date(2026, 11, 17), "away", "vacation")]
    assert by[env.rest].days_off == [] and by[env.rest].owner is None


def test_a_sub_project_with_no_owner_takes_its_parent_s_owner_for_days_off(env):
    owner = add(env, "person", {"full_name": "Casey Example", "away": [{"start": "2026-10-20", "label": "away"}]})
    with env.store.transaction() as tx:
        found = tx.get("project", env.both)
        tx.update("project", env.both, {"owner": owner}, CTX, read_version=found.version)
    todo(env, "Plan the part", env.sub, "2026-10-16")
    lane = lanes(env)[env.sub]
    assert lane.owner == owner and [(o.day, o.kind) for o in lane.days_off] == [(date(2026, 10, 20), "away")]


def test_the_route_answers_with_lanes_and_refuses_a_range_that_is_not_one(env):
    today = datetime.now(UTC).date()
    day = (today + timedelta(days=2)).isoformat()
    todo(env, "Send the quote", env.both, day)
    page = env.client.get("/api/schedule/timeline", params={"range": "quarter"})
    assert page.status_code == 200, page.text
    body = page.json()
    assert (
        body["range"] == "quarter"
        and body["days"] == 91
        and body["default_range"] == env.cfg.ui.schedule.timeline_range
    )
    lane = next(x for x in body["lanes"] if x["project"] == env.both)
    assert lane["side"] == env.job and lane["views"] == [env.managing, env.own]
    item = lane["items"][0]
    assert (item["kind"], item["title"], item["start"], item["end"], item["state"]) == (
        "todo",
        "Send the quote",
        day,
        day,
        "open",
    )
    assert item["owners"][0]["person"] == env.me
    assert body["off_days"] and body["work_days"] == [0, 1, 2, 3, 4]
    assert env.client.get("/api/schedule/timeline", params={"range": "decade"}).status_code == 422
    assert env.client.get("/api/schedule/timeline", params={"from": "2026-11-02"}).json()["first"] == "2026-11-02"


def test_the_same_thing_on_consecutive_days_is_one_band_over_those_days(env):
    for day in ("2026-10-19", "2026-10-20", "2026-10-21"):
        todo(env, "Pay the deposit", env.both, day)
    todo(env, "Pay the deposit", env.both, "2026-10-26")  # after a gap: its own mark
    todo(env, "Send the quote", env.both, "2026-10-20")  # another title: apart
    items = sorted(lanes(env)[env.both].items, key=lambda i: (i.title, i.start))
    assert [(i.title, i.start, i.end) for i in items] == [
        ("Pay the deposit", date(2026, 10, 19), date(2026, 10, 21)),
        ("Pay the deposit", date(2026, 10, 26), date(2026, 10, 26)),
        ("Send the quote", date(2026, 10, 20), date(2026, 10, 20)),
    ]


def test_a_to_do_that_is_overdue_is_not_folded_into_one_that_is_open(env):
    todo(env, "Pay the deposit", env.both, "2026-10-12")  # before today: overdue
    todo(env, "Pay the deposit", env.both, "2026-10-13")
    todo(env, "Pay the deposit", env.both, "2026-10-14")
    states = [(i.start, i.end, i.state) for i in sorted(lanes(env)[env.both].items, key=lambda i: i.start)]
    assert len(states) == 2 and states[0][2] == "overdue" and states[1][2] != "overdue"


def test_a_daily_repeat_is_one_band_not_a_mark_for_each_day(env):
    add(
        env,
        "event",
        {
            "title": "Stand-up",
            "start": "2026-10-19T09:00:00+00:00",
            "repeat": {"every": "day", "until": "2026-10-23"},
            "project": env.both,
        },
    )
    items = [i for i in lanes(env)[env.both].items if i.title == "Stand-up"]
    assert len(items) == 1 and items[0].start == date(2026, 10, 19) and items[0].end == date(2026, 10, 23)
