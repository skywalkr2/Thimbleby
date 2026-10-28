"""The schedule: a run of days, each with its all-day entries apart and its timed entries in time order, from the
connected calendars and the app's own entries, each told apart by where it comes from. A booking already on a
calendar is one entry, not two. Names come from the fixtures' own helpers; the calendar is the fake connector."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from fastapi.testclient import TestClient

from api.app import create_app
from engine import booking_entries
from engine.config.schema import WEEKDAYS
from engine.ops import CHANGESET
from engine.schedule import MOST_DAYS, schedule
from engine.storage import WriteContext
from engine.today import zone
from engine.watch import refresh
from tests.test_same_appointment import BOOKING, DINNER, calendar
from tests.test_today_dashboard import event, make
from tests.test_watch import NOW

_PM = WriteContext("pm", "trusted", "test")
DAY = NOW.date()


def own(store, title, start, **more):
    with store.transaction() as tx:
        return tx.create("event", {"trust": "trusted", "title": title, "start": start, **more}, _PM).id


def titles(entries):
    return [e.item.title for e in entries]


def test_each_day_has_its_all_day_entries_apart_and_its_timed_entries_in_time_order(tmp_path):
    items = [
        event("late", "2030-03-04T15:00:00+00:00", "2030-03-04T16:00:00+00:00"),
        event("early", "2030-03-04T08:00:00+00:00", "2030-03-04T09:00:00+00:00", where="Room 2"),
        event("all", "2030-03-04", "2030-03-05", all_day=True),
        event("next", "2030-03-05T10:00:00+00:00"),
    ]
    ws, cfg, store = make(tmp_path, items)
    try:
        refresh(ws, store, cfg, "s", NOW)
        own(store, "Own midday", "2030-03-04T12:00:00")
        own(store, "Own all day", "2030-03-04")
        today, tomorrow, after = schedule(store, cfg, NOW, days=3)
        assert [d.date for d in (today, tomorrow, after)] == [DAY + timedelta(days=n) for n in range(3)]
        assert titles(today.all_day) == ["Event all", "Own all day"]
        assert titles(today.timed) == ["Event early", "Own midday", "Event late"]
        assert today.timed[0].item.where == "Room 2"
        assert titles(tomorrow.timed) == ["Event next"] and tomorrow.all_day == [] and after.timed == []
    finally:
        store.close()


def test_an_entry_that_crosses_midnight_is_on_both_days_with_the_part_that_falls_on_each(tmp_path):
    items = [
        event("night", "2030-03-04T23:30:00+00:00", "2030-03-05T00:30:00+00:00"),
        event("trip", "2030-03-04T09:00:00+00:00", "2030-03-06T17:00:00+00:00"),
    ]
    ws, cfg, store = make(tmp_path, items)
    try:
        refresh(ws, store, cfg, "s", NOW)
        first, second, third = schedule(store, cfg, NOW, days=3)
        night = {
            d.date: next(e for e in [*d.timed, *d.all_day] if e.item.title == "Event night") for d in (first, second)
        }
        assert night[DAY].begins.startswith("2030-03-04T23:30") and night[DAY].ends is None
        assert night[DAY + timedelta(days=1)].begins is None
        assert night[DAY + timedelta(days=1)].ends.startswith("2030-03-05T00:30")
        # A trip that goes on through the whole middle day is an all-day entry there, and ends on its last day.
        assert titles(second.all_day) == ["Event trip"] and second.all_day[0].begins is None
        assert third.timed[0].ends.startswith("2030-03-06T17:00") and third.timed[0].begins is None
    finally:
        store.close()


def test_a_run_can_start_on_any_day_and_the_setting_says_how_many_days_it_is(tmp_path):
    items = [
        event("past", "2030-03-02T10:00:00+00:00", "2030-03-02T11:00:00+00:00"),
        event("far", "2030-03-12T10:00:00+00:00"),
    ]
    ws, cfg, store = make(tmp_path, items)
    try:
        refresh(ws, store, cfg, "s", NOW)
        back = schedule(store, cfg, NOW, start=DAY - timedelta(days=2), days=2)
        assert [d.date for d in back] == [DAY - timedelta(days=2), DAY - timedelta(days=1)]
        assert titles(back[0].timed) == ["Event past"] and back[1].timed == []
        assert len(schedule(store, cfg, NOW)) == cfg.ui.today.schedule_days
        assert len(schedule(store, cfg, NOW, days=500)) == MOST_DAYS
        assert titles(schedule(store, cfg, NOW, start=date(2030, 3, 12), days=1)[0].timed) == ["Event far"]
    finally:
        store.close()


def test_entries_say_where_they_come_from_and_a_called_off_one_says_so(tmp_path):
    items = [event("a", "2030-03-04T10:00:00+00:00"), event("b", "2030-03-04T11:00:00+00:00", cancelled=True)]
    ws, cfg, store = make(tmp_path, items)
    try:
        refresh(ws, store, cfg, "s", NOW)
        own(store, "Own one", "2030-03-04T12:00:00")
        [day] = schedule(store, cfg, NOW, days=1)
        by_title = {e.item.title: e.item for e in day.timed}
        assert (by_title["Event a"].own, by_title["Event a"].source) == (False, "s")
        assert by_title["Own one"].own is True
        assert by_title["Event b"].cancelled and not by_title["Event a"].cancelled
    finally:
        store.close()


def test_a_booking_already_on_a_calendar_is_one_entry_on_its_day(tmp_path):
    ws, cfg, store = make(tmp_path, [calendar("table", DINNER, "Table")])
    try:
        refresh(ws, store, cfg, "s", NOW)
        empty = CHANGESET.validate_python({"ops": []}, context={"op_models": store.plugins.ops})
        assert booking_entries.add_to(empty, cfg, store.read(), BOOKING).ops == []
        before = datetime.fromisoformat(DINNER).astimezone(zone(cfg)) - timedelta(days=1)
        found = schedule(store, cfg, before, days=3)
        assert [titles(d.timed) for d in found] == [[], ["Table"], []]
    finally:
        store.close()


def test_the_route_answers_for_the_screen(tmp_path):
    here_now = datetime.now(UTC).replace(microsecond=0)
    ws, cfg, store = make(tmp_path, [])
    today = here_now.astimezone(zone(cfg)).date()
    own(store, "Own tomorrow", f"{(today + timedelta(days=1)).isoformat()}T09:30:00")
    own(store, "Own all day", today.isoformat())
    store.close()
    client = TestClient(create_app(ws, cfg, "t", start_worker=False))
    client.headers["Authorization"] = "Bearer t"
    api = cfg.server.base_path.rstrip("/") + "/api"
    page = client.get(f"{api}/schedule").json()
    assert page["today"] == page["first"] == today.isoformat()
    assert len(page["days"]) == cfg.ui.today.schedule_days
    assert [e["title"] for e in page["days"][0]["all_day"]] == ["Own all day"]
    [tomorrow] = page["days"][1]["timed"]
    assert tomorrow["title"] == "Own tomorrow" and tomorrow["own"] is True and tomorrow["slot"] == "timed"
    assert tomorrow["begins"].startswith(f"{(today + timedelta(days=1)).isoformat()}T09:30")
    later = client.get(f"{api}/schedule", params={"from": (today + timedelta(days=1)).isoformat(), "days": 1}).json()
    assert (later["first"], later["today"], len(later["days"])) == (
        (today + timedelta(days=1)).isoformat(),
        today.isoformat(),
        1,
    )
    assert [e["title"] for e in later["days"][0]["timed"]] == ["Own tomorrow"]
    assert client.get(f"{api}/schedule", params={"days": 0}).status_code == 422
    assert client.get(f"{api}/schedule", params={"from": "not a day"}).status_code == 422


# ---- the calendar page: sides, due dates, kinds, six weeks ----------------------------------------------------------


def _serving(ws, side):
    """The workspace's one watched source, now serving the given side; the settings read again."""
    import yaml

    from engine.config import load_config

    path = ws.config_dir / "watch.yaml"
    data = yaml.safe_load(path.read_text())
    data["sources"][0]["sides"] = [side]
    path.write_text(yaml.safe_dump(data))
    return load_config(ws.config_dir, env={})


def _to_do(store, cfg, text, due, **more):
    with store.transaction() as tx:
        return tx.create(
            "action",
            {
                "text": text,
                "owners": [{"person": cfg.workspace.user.person}],
                "status": "open",
                "due": due,
                **more,
            },
            _PM,
        ).id


def test_an_entry_carries_the_side_of_its_project_and_an_event_the_side_its_calendar_serves(tmp_path):
    from engine import sides

    ws, cfg, store = make(tmp_path, [event("a", "2030-03-04T10:00:00+00:00"), event("b", "2030-03-04T11:00:00+00:00")])
    try:
        side = sides.personal_project(store.read(), cfg)
        cfg = _serving(ws, side)
        refresh(ws, store, cfg, "s", NOW)
        own(store, "Own filed", "2030-03-04T12:00:00", project=side)
        own(store, "Own loose", "2030-03-04T13:00:00")
        [day] = schedule(store, cfg, NOW, days=1)
        found = {e.item.title: e for e in day.timed}
        assert found["Own filed"].side == side and found["Own loose"].side is None
        assert found["Event a"].side == side and found["Event b"].side == side
        assert [e.kind for e in (found["Event a"], found["Own filed"])] == ["event", "own"]
    finally:
        store.close()


def test_a_calendar_that_serves_no_one_side_leaves_its_events_on_none(tmp_path):
    ws, cfg, store = make(tmp_path, [event("a", "2030-03-04T10:00:00+00:00")])
    try:
        refresh(ws, store, cfg, "s", NOW)
        [day] = schedule(store, cfg, NOW, days=1)
        assert [e.side for e in day.timed] == [None]
    finally:
        store.close()


def test_a_due_date_is_an_all_day_entry_on_its_day_linking_to_its_to_do(tmp_path):
    ws, cfg, store = make(tmp_path, [])
    try:
        on = (DAY + timedelta(days=1)).isoformat()
        mine = _to_do(store, cfg, "Send the figures", on)
        _to_do(store, cfg, "Date to check", on, due_check=True)
        _to_do(store, cfg, "Done already", on, status="done")
        _to_do(store, cfg, "Far off", (DAY + timedelta(days=30)).isoformat())
        other = next(p.id for p in store.read().list("person") if p.id != cfg.workspace.user.person)
        with store.transaction() as tx:
            tx.create("action", {"text": "Not mine", "owners": [{"person": other}], "status": "open", "due": on}, _PM)
        first, second, third = schedule(store, cfg, NOW, days=3)
        assert first.all_day == [] and third.all_day == []
        [due] = second.all_day
        assert (due.kind, due.action, due.item.title, due.slot) == ("due", mine, "Send the figures", "all_day")
        assert due.item.snapshot == mine and due.item.days == [DAY + timedelta(days=1)]
        assert len(schedule(store, cfg, NOW, days=MOST_DAYS)[30].all_day) == 1
    finally:
        store.close()


def test_a_parcel_is_a_delivery_and_an_undated_one_is_listed_apart(tmp_path):
    from engine.schedule import on_its_way

    ws, cfg, store = make(tmp_path, [])
    try:
        own(store, "Parcel", "2030-03-04", delivery={"order": "O-1", "dated": True})
        own(store, "Order", "2030-03-04", delivery={"order": "O-2", "dated": False})
        [day] = schedule(store, cfg, NOW, days=1)
        assert [(e.item.title, e.kind) for e in day.all_day] == [("Parcel", "delivery")]
        assert [(e.item.title, e.kind) for e in on_its_way(store, cfg, NOW)] == [("Order", "delivery")]
    finally:
        store.close()


def test_the_route_gives_six_weeks_the_kinds_the_settings_and_refuses_more(tmp_path):
    here_now = datetime.now(UTC).replace(microsecond=0)
    ws, cfg, store = make(tmp_path, [])
    today = here_now.astimezone(zone(cfg)).date()
    to_do = _to_do(store, cfg, "Send the figures", today.isoformat())
    own(store, "Order", today.isoformat(), delivery={"order": "O-2", "dated": False})
    store.close()
    client = TestClient(create_app(ws, cfg, "t", start_worker=False))
    client.headers["Authorization"] = "Bearer t"
    api = cfg.server.base_path.rstrip("/") + "/api"
    assert MOST_DAYS == 42
    page = client.get(f"{api}/schedule", params={"days": 42}).json()
    assert len(page["days"]) == 42
    assert client.get(f"{api}/schedule", params={"days": 43}).status_code == 422
    [due] = page["days"][0]["all_day"]
    assert (due["kind"], due["action"], due["snapshot"], due["side"]) == ("due", to_do, to_do, None)
    assert [e["title"] for e in page["on_its_way"]] == ["Order"]
    assert page["work_days"] == [0, 1, 2, 3, 4]
    assert page["week_starts_on"] == WEEKDAYS.index(cfg.ui.schedule.week_starts_on)
    assert (page["grid_starts"], page["grid_ends"], page["month_entries"]) == (
        cfg.ui.schedule.day_starts,
        cfg.ui.schedule.day_ends,
        cfg.ui.schedule.month_entries,
    )
