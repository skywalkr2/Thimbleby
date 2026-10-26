"""The schedule's two leftovers (promise P49): a connected event the app keeps no entry for opens a read-only page with
what the source says, and a calendar source can carry a color from a small named list, which the sources list gives to
the schedule. Names come from the fixtures' own helpers; the calendar is the fake connector."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.schedule import connected_event, schedule
from engine.watch import refresh
from tests.test_today_dashboard import event, make
from tests.test_watch import NOW

#: Made-up addresses are built from this, so no address is written out whole.
WEB = "https" + "://"
LINK = f"{WEB}calendar.example.com/event/1"


def client_for(ws, cfg, store):
    store.close()
    client = TestClient(create_app(ws, cfg, "t", start_worker=False))
    client.headers["Authorization"] = "Bearer t"
    return client, cfg.server.base_path.rstrip("/") + "/api"


def with_people(key="plan"):
    found = event(
        key,
        "2030-03-04T09:00:00+00:00",
        "2030-03-04T10:30:00+00:00",
        where="Room 2",
        organizer={"name": "Organizer Name", "address": "organizer@example.com"},
        attendees=[
            {"name": "Guest One", "address": "one@example.com", "response": "accepted"},
            {"address": "two@example.com", "response": "needs-action"},
        ],
    )
    return {**found, "link": LINK}


def first_entry(store, cfg):
    [day] = schedule(store, cfg, NOW, days=1)
    return day.timed[0].item


def test_a_connected_event_with_no_entry_opens_a_page_of_what_the_source_says(tmp_path):
    ws, cfg, store = make(tmp_path, [with_people()])
    refresh(ws, store, cfg, "s", NOW)
    item = first_entry(store, cfg)
    assert item.entry is None  # the app keeps no entry of its own for it
    page = connected_event(store, cfg, item.snapshot, item.start)
    assert page is not None
    assert (page.title, page.where, page.source, page.link) == (
        "Event plan",
        "Room 2",
        "s",
        LINK,
    )
    assert page.start.startswith("2030-03-04T") and page.end and page.end.startswith("2030-03-04T")
    assert page.organizer.name == "Organizer Name" and page.organizer.address == "organizer@example.com"
    assert [(p.name, p.address, p.response) for p in page.attendees] == [
        ("Guest One", "one@example.com", "accepted"),
        (None, "two@example.com", "needs-action"),
    ]
    store.close()


def test_the_page_follows_the_date_it_was_opened_from_for_a_repeating_event(tmp_path):
    repeating = event(
        "weekly",
        "2030-03-04T09:00:00+00:00",
        "2030-03-04T10:00:00+00:00",
        repeats="FREQ=WEEKLY",
        occurrences=[
            {"start": "2030-03-04T09:00:00+00:00", "end": "2030-03-04T10:00:00+00:00"},
            {"start": "2030-03-11T11:00:00+00:00", "end": "2030-03-11T12:00:00+00:00", "where": "Other room"},
        ],
    )
    ws, cfg, store = make(tmp_path, [repeating])
    refresh(ws, store, cfg, "s", NOW)
    snapshot = store.read().list("snapshot")[0].id
    second = connected_event(store, cfg, snapshot, "2030-03-11T11:00:00+00:00")
    assert second is not None and second.start.startswith("2030-03-11T") and second.where == "Other room"
    assert connected_event(store, cfg, snapshot, "2030-03-04T09:00:00+00:00").start.startswith("2030-03-04T")
    store.close()


def test_an_all_day_event_keeps_its_days_and_a_missing_or_gone_one_is_none(tmp_path):
    ws, cfg, store = make(tmp_path, [event("away", "2030-03-04", "2030-03-05", all_day=True)])
    refresh(ws, store, cfg, "s", NOW)
    [snap] = store.read().list("snapshot")
    page = connected_event(store, cfg, snap.id, "2030-03-04")
    assert page is not None and page.all_day and page.start == "2030-03-04"
    assert connected_event(store, cfg, "SNAP-nobody", "2030-03-04") is None
    store.close()


def test_the_route_answers_with_the_page_and_refuses_what_is_not_a_connected_event(tmp_path):
    ws, cfg, store = make(tmp_path, [with_people()])
    refresh(ws, store, cfg, "s", NOW)
    item = first_entry(store, cfg)
    client, api = client_for(ws, cfg, store)
    got = client.get(f"{api}/schedule/events/{item.snapshot}", params={"start": item.start})
    assert got.status_code == 200, got.text
    body = got.json()
    assert body["title"] == "Event plan" and body["source"] == "s" and body["link"] == LINK
    assert [a["address"] for a in body["attendees"]] == ["one@example.com", "two@example.com"]
    assert client.get(f"{api}/schedule/events/SNAP-nobody").status_code == 404


def test_a_calendar_source_keeps_a_color_from_the_named_list_and_the_list_says_it(tmp_path):
    ws, cfg, store = make(tmp_path, [with_people()])
    client, api = client_for(ws, cfg, store)
    fingerprint = client.get(f"{api}/settings").json()["fingerprint"]
    assert client.get(f"{api}/watch").json()[0]["color"] is None  # none until one is picked
    saved = client.post(f"{api}/watch/sources/s", json={"color": "teal", "fingerprint": fingerprint})
    assert saved.status_code == 200, saved.text
    assert client.get(f"{api}/watch").json()[0]["color"] == "teal"
    # A color outside the list is refused, and sending none takes it away.
    bad = client.post(
        f"{api}/watch/sources/s", json={"color": "chartreuse", "fingerprint": saved.json()["fingerprint"]}
    )
    assert bad.status_code == 422
    cleared = client.post(f"{api}/watch/sources/s", json={"color": None, "fingerprint": saved.json()["fingerprint"]})
    assert cleared.status_code == 200, cleared.text
    assert client.get(f"{api}/watch").json()[0]["color"] is None


def test_a_color_changes_nothing_else_about_the_source(tmp_path):
    ws, cfg, store = make(tmp_path, [with_people()])
    client, api = client_for(ws, cfg, store)
    before = client.get(f"{api}/watch").json()[0]
    fingerprint = client.get(f"{api}/settings").json()["fingerprint"]
    client.post(f"{api}/watch/sources/s", json={"color": "pink", "fingerprint": fingerprint})
    after = client.get(f"{api}/watch").json()[0]
    assert {k: v for k, v in after.items() if k != "color"} == {k: v for k, v in before.items() if k != "color"}


@pytest.mark.parametrize("name", ["blue", "teal", "green", "orange", "red", "pink", "purple", "gray"])
def test_every_name_in_the_palette_is_accepted(name):
    from engine.config.schema import WatchSource

    assert WatchSource.model_validate({"id": "x", "connector": "calendar", "color": name}).color == name
