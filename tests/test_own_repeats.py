"""The person's own calendar entry can have a place and repeat (design 5.1, 7.7; sweep X45): none, daily, weekly, every
two weeks or monthly, with an optional last day. Each date shows on Day, Week, Month and the Timeline, worked out with
the same expansion a connected calendar's repeating events get; one date can be moved or called off alone (an exception
on the entry, with Undo) or the whole entry removed. Only the person makes an entry repeat."""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import add_meeting
from engine.applier import apply_as_person, undo
from engine.schedule import schedule
from engine.storage import StoreError
from engine.timeline import timeline
from engine.today import agenda
from engine.workspace import init_workspace
from tests.e2e_just_me import the_person
from tests.test_knowledge_records import apply, source
from tests.test_views import CTX, TOKEN, Env

NOW = datetime(2026, 10, 14, 14, 0, tzinfo=UTC)  # a Wednesday
FRIDAY = "2026-10-16"
PLACE = "Room 2"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"}, flags={"storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield Env(client, app.state.store, cfg, app)


def make(env, what="Print sync", day=FRIDAY, at="15:00", until_time="16:00", **more):
    return add_meeting.add_meeting(env.store, env.cfg, what, day, at, until_time, **more)


def days_of(env, title="Print sync", count=42):
    """The days a title shows on, from Monday the 12th, as dates."""
    first = date(2026, 10, 12)
    return [
        d.date
        for d in schedule(env.store, env.cfg, NOW, first, count)
        if any(e.item.title == title for e in [*d.all_day, *d.timed])
    ]


def entry_data(env, entry):
    return env.store.read().get("event", entry).data


# ---- adding ---------------------------------------------------------------------------------------------------------


def test_a_place_and_a_repeat_are_kept_on_the_entry_and_undo_takes_it_away(env):
    made = make(env, where="  Room   2 ", repeat="week", repeat_until="2026-11-06")
    assert not made.merged and made.entry and made.changeset
    data = entry_data(env, made.entry)
    assert data["where"] == PLACE
    assert data["repeat"] == {"every": "week", "until": "2026-11-06"}
    assert "Room 2" in data["evidence"]["quote"] and "week" in data["evidence"]["quote"]
    undo(env.store, made.changeset)
    assert env.store.read().get("event", made.entry) is None


def test_no_place_and_no_repeat_leave_the_entry_as_before(env):
    made = make(env)
    data = entry_data(env, made.entry)
    assert data["where"] is None and data["repeat"] is None and data["exceptions"] == []
    assert days_of(env) == [date(2026, 10, 16)]


def test_a_repeat_that_cannot_be_read_or_stops_before_it_starts_is_refused_in_plain_words(env):
    for repeat, until, why in (
        ("yearly", None, "how often"),
        (None, "2026-12-01", "how often it repeats"),
        ("week", "2026-10-01", "before it starts"),
        ("week", "soon", "last day"),
    ):
        with pytest.raises(StoreError, match=why):
            make(env, what="Other", repeat=repeat, repeat_until=until)
    assert env.store.read().list("event") == []


def test_only_the_person_makes_an_entry_repeat(env):
    sid = source(env.store)
    op = {
        "op": "event.add",
        "title": "Standup",
        "start": "2026-10-19T09:00:00",
        "repeat": {"every": "day"},
        "evidence": {"quote": "standup every day"},
    }
    cs, statuses = apply(
        env.store, env.cfg, [op], origin="input", trust="untrusted", source_id=sid, raw="standup every day"
    )
    assert statuses == ["refused"]
    assert "only you" in env.store.read().get("changeset", cs).data["ops"][0]["reason"]
    assert env.store.read().list("event") == []
    # The same words as the person's own are fine.
    made = apply_as_person(env.store, env.cfg, [op], "Added a meeting", note="standup every day")
    assert [o["status"] for o in env.store.read().get("changeset", made).data["ops"]] == ["applied"]
    assert env.store.read().list("event")[0].data["repeat"] == {"every": "day", "until": None}


# ---- occurrences in the views ---------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("every", "until", "expected"),
    [
        ("week", "2026-11-06", ["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"]),
        ("two_weeks", None, ["2026-10-16", "2026-10-30", "2026-11-13"]),  # the screen lists up to 42 days
        ("month", None, ["2026-10-16", "2026-11-16"]),
        ("day", "2026-10-19", ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"]),
    ],
)
def test_each_date_of_a_repeat_shows_on_the_schedule_and_the_last_day_is_included(env, every, until, expected):
    make(env, repeat=every, repeat_until=until, where=PLACE)
    assert [d.isoformat() for d in days_of(env)] == expected


def test_an_all_day_entry_repeats_and_keeps_its_last_day(env):
    add_meeting.add_meeting(env.store, env.cfg, "Offsite", FRIDAY, None, repeat="week", repeat_until="2026-10-30")
    assert [d.isoformat() for d in days_of(env, "Offsite")] == ["2026-10-16", "2026-10-23", "2026-10-30"]


def test_the_agenda_says_each_date_is_one_of_a_repeat_with_its_place(env):
    env.cfg.ui.today.agenda_days_ahead = 24
    made = make(env, repeat="week", where=PLACE)
    items = [a for a in agenda(env.store, env.cfg, NOW) if a.title == "Print sync"]
    assert [a.start[:10] for a in items] == ["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"]
    assert all(a.own and a.snapshot == made.entry and a.repeats == "week" and a.where == PLACE for a in items)
    assert items[1].occurrence.startswith("2026-10-23T15:00:00")
    assert items[1].end.startswith("2026-10-23T16:00:00")


def test_the_week_and_month_views_read_the_same_days_through_the_api(env):
    make(env, repeat="week", repeat_until="2026-11-06", where=PLACE)
    shown = env.client.get("/api/schedule", params={"from": "2026-10-12", "days": 28}).json()
    days = [d["date"] for d in shown["days"] if any(e["title"] == "Print sync" for e in [*d["all_day"], *d["timed"]])]
    assert days == ["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"]
    entry = next(e for d in shown["days"] if d["date"] == "2026-10-23" for e in d["timed"])
    assert entry["repeats"] == "week" and entry["where"] == PLACE and entry["occurrence"].startswith("2026-10-23T15")


def test_the_timeline_has_an_item_for_each_date(env):
    make(env, repeat="week", repeat_until="2026-11-06")
    found = timeline(env.store, env.cfg, NOW, date(2026, 10, 12), "ten_weeks")
    starts = sorted(i.start.isoformat() for lane in found.lanes for i in lane.items if i.title == "Print sync")
    assert starts == ["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"]


# ---- one date or the series ------------------------------------------------------------------------------------------


def occurrence_of(env, day):
    entry = next(
        e
        for d in schedule(env.store, env.cfg, NOW, date(2026, 10, 12), 42)
        if d.date.isoformat() == day
        for e in d.timed
        if e.item.title == "Print sync"
    )
    return entry.item.occurrence


def test_one_date_moves_alone_with_undo_and_the_others_stay(env):
    made = make(env, repeat="week", repeat_until="2026-11-06")
    was = occurrence_of(env, "2026-10-23")
    body = {
        "start": "2026-10-24T10:00:00",
        "end": "2026-10-24T11:00:00",
        "read_version": env.store.read().get("event", made.entry).version,
        "occurrence": was,
    }
    moved = env.client.post(f"/api/events/{made.entry}/move", json=body)
    assert moved.status_code == 200 and moved.json()["refused"] is None, moved.text
    assert [d.isoformat() for d in days_of(env)] == ["2026-10-16", "2026-10-24", "2026-10-30", "2026-11-06"]
    data = entry_data(env, made.entry)
    assert data["start"] == f"{FRIDAY}T15:00:00", "the entry itself did not move"
    assert len(data["exceptions"]) == 1 and data["exceptions"][0]["cancelled"] is False
    assert env.client.post(f"/api/changesets/{moved.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    assert [d.isoformat() for d in days_of(env)] == ["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"]


def test_one_date_is_called_off_alone_with_undo_and_moving_it_again_replaces_its_exception(env):
    made = make(env, repeat="week", repeat_until="2026-11-06")
    was = occurrence_of(env, "2026-10-30")
    read = lambda: env.store.read().get("event", made.entry).version  # noqa: E731
    off = env.client.post(f"/api/events/{made.entry}/cancel", json={"read_version": read(), "occurrence": was})
    assert off.status_code == 200 and off.json()["refused"] is None, off.text
    assert [d.isoformat() for d in days_of(env)] == ["2026-10-16", "2026-10-23", "2026-11-06"]
    assert env.store.read().get("event", made.entry) is not None
    # Moving that date after it was called off puts one exception there, not two.
    again = env.client.post(
        f"/api/events/{made.entry}/move",
        json={"start": "2026-10-31T09:00:00", "read_version": read(), "occurrence": was},
    )
    assert again.status_code == 200, again.text
    assert len(entry_data(env, made.entry)["exceptions"]) == 1
    assert "2026-10-31" in [d.isoformat() for d in days_of(env)]
    assert env.client.post(f"/api/changesets/{off.json()['changeset']}/undo", json={"ops": None}).status_code == 200


def test_cancelling_without_a_date_removes_the_whole_entry_and_undo_brings_every_date_back(env):
    made = make(env, repeat="week", repeat_until="2026-11-06")
    done = env.client.post(
        f"/api/events/{made.entry}/cancel", json={"read_version": env.store.read().get("event", made.entry).version}
    )
    assert done.status_code == 200 and done.json()["refused"] is None
    assert days_of(env) == []
    assert env.client.post(f"/api/changesets/{done.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    assert len(days_of(env)) == 4


def test_a_date_of_an_entry_that_does_not_repeat_is_refused(env):
    made = make(env)
    version = env.store.read().get("event", made.entry).version
    refused = env.client.post(
        f"/api/events/{made.entry}/cancel", json={"read_version": version, "occurrence": f"{FRIDAY}T15:00:00"}
    )
    assert refused.status_code == 409


def test_the_form_route_takes_a_place_and_a_repeat(env):
    posted = env.client.post(
        "/api/calendar/meetings",
        json={
            "what": "Walk",
            "day": FRIDAY,
            "time": "08:00",
            "where": "The park",
            "repeat": "day",
            "repeat_until": "2026-10-18",
        },
    )
    assert posted.status_code == 200, posted.text
    entry = entry_data(env, posted.json()["entry"])
    assert entry["where"] == "The park" and entry["repeat"] == {"every": "day", "until": "2026-10-18"}
    bad = env.client.post("/api/calendar/meetings", json={"what": "Run", "day": FRIDAY, "repeat_until": "2026-10-18"})
    assert bad.status_code == 409 and "how often" in bad.json()["detail"]


def test_an_entry_that_does_not_repeat_still_lists_once_on_its_day(env):
    make(env, where=PLACE)
    first = date(2026, 10, 12)
    assert [d.date for d in schedule(env.store, env.cfg, NOW, first, 14) if d.timed] == [date(2026, 10, 16)]
    assert CTX is not None
