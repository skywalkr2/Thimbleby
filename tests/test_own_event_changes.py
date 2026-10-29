"""The person's own calendar entries, those the app keeps itself, can be moved and cancelled from the entry's page and
the Schedule: each acts at once as the person's own change with Undo, a cancel that another record still needs is
refused in a kind the screen words, and a connected calendar's event is never changed here. The options say why a
connected event can't be changed through its account (acting is off, or the service doesn't do it) from the declared
acts and settings. Built on the calendar tests' workspace."""

from __future__ import annotations

from engine.channels import ChannelRegistration
from engine.storage import WriteContext
from tests.test_act_calendar import (  # noqa: F401, F811  (fixtures and helpers)
    CALENDAR,
    END,
    NEW_END,
    NEW_START,
    SIGNED_IN,
    START,
    calendar,
    own_entry,
)
from tests.test_act_draft_api import client  # noqa: F401
from tests.test_publisher import api  # noqa: F401

_ENGINE = WriteContext(actor="engine", trust="trusted", op="test.own_event")


def local_entry(client, **more) -> str:  # noqa: F811
    with client.store.transaction() as tx:
        return tx.create(
            "event", {"title": "Own note", "start": START, "end": END, "trust": "trusted", **more}, _ENGINE
        ).id


def version(client, record: str) -> int:  # noqa: F811
    return client.store.read().get("event", record).version


def test_an_own_entry_moves_at_once_and_undo_puts_the_old_time_back(calendar):  # noqa: F811
    entry = local_entry(calendar)
    body = {"start": NEW_START, "end": NEW_END, "read_version": version(calendar, entry)}
    moved = calendar.post(f"/api/events/{entry}/move", json=body)
    assert moved.status_code == 200, moved.text
    assert moved.json()["refused"] is None
    now = calendar.store.read().get("event", entry).data
    assert (now["start"], now["end"]) == (NEW_START, NEW_END)
    assert calendar.post(f"/api/changesets/{moved.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    back = calendar.store.read().get("event", entry).data
    assert (back["start"], back["end"]) == (START, END)


def test_an_own_entry_cancels_at_once_and_undo_brings_it_back(calendar):  # noqa: F811
    entry = local_entry(calendar)
    done = calendar.post(f"/api/events/{entry}/cancel", json={"read_version": version(calendar, entry)})
    assert done.status_code == 200, done.text
    assert done.json()["refused"] is None
    assert calendar.store.read().get("event", entry) is None
    assert calendar.post(f"/api/changesets/{done.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    assert calendar.store.read().get("event", entry) is not None


def test_a_cancel_another_record_needs_is_refused_with_a_kind_not_a_raw_error(calendar):  # noqa: F811
    entry = local_entry(calendar)
    with calendar.store.transaction() as tx:
        tx.create(
            "action", {"text": "Bring the proofs", "owners": [{"person": calendar.person}], "due_event": entry}, _ENGINE
        )
    done = calendar.post(f"/api/events/{entry}/cancel", json={"read_version": version(calendar, entry)})
    assert done.status_code == 200, done.text
    assert done.json() == {"changeset": None, "refused": "referred_to"}
    assert calendar.store.read().get("event", entry) is not None


def test_a_change_made_since_the_page_was_read_is_refused_as_changed(calendar):  # noqa: F811
    entry = local_entry(calendar)
    stale = version(calendar, entry)
    with calendar.store.transaction() as tx:
        tx.update("event", entry, {"where": "Room 2"}, _ENGINE, read_version=stale)
    moved = calendar.post(f"/api/events/{entry}/move", json={"start": NEW_START, "end": NEW_END, "read_version": stale})
    assert moved.json() == {"changeset": None, "refused": "changed"}
    cancelled = calendar.post(f"/api/events/{entry}/cancel", json={"read_version": stale})
    assert cancelled.json() == {"changeset": None, "refused": "changed"}


def test_a_connected_calendars_event_is_never_changed_through_these_routes(calendar):  # noqa: F811
    connected = own_entry(calendar)
    body = {"start": NEW_START, "end": NEW_END, "read_version": version(calendar, connected)}
    assert calendar.post(f"/api/events/{connected}/move", json=body).status_code == 409
    assert (
        calendar.post(f"/api/events/{connected}/cancel", json={"read_version": body["read_version"]}).status_code == 409
    )
    assert calendar.store.read().get("event", connected) is not None
    assert calendar.post("/api/events/EVT-999/cancel", json={"read_version": 1}).status_code == 404


def test_a_move_needs_a_time_and_an_end_after_the_start(calendar):  # noqa: F811
    entry = local_entry(calendar)
    v = version(calendar, entry)
    assert calendar.post(f"/api/events/{entry}/move", json={"read_version": v}).status_code == 422
    backwards = calendar.post(f"/api/events/{entry}/move", json={"start": NEW_END, "end": NEW_START, "read_version": v})
    assert backwards.status_code == 409


def test_the_options_say_an_entry_in_the_apps_own_calendar_can_be_changed_by_the_person(calendar):  # noqa: F811
    shown = calendar.get("/api/acts/options", params={"record": local_entry(calendar)}).json()
    assert shown["event_own"] is True and shown["event_actions"] == [] and shown["event_why"] is None
    connected = calendar.get("/api/acts/options", params={"record": own_entry(calendar)}).json()
    assert connected["event_own"] is False


def test_a_connected_event_says_why_it_cant_be_changed_there(calendar):  # noqa: F811
    def why(record: str) -> str | None:
        return calendar.get("/api/acts/options", params={"record": record}).json()["event_why"]

    connected = own_entry(calendar)
    assert why(connected) is None  # acting on and the service does it: the actions are offered
    calendar.cfg.watch.acting.remove(SIGNED_IN)
    assert why(connected) == "acting_off"
    calendar.cfg.watch.acting.append(SIGNED_IN)
    narrow = calendar.fake.registration(CALENDAR)
    calendar.store.plugins.core_channels[CALENDAR] = ChannelRegistration(
        **{**narrow.__dict__, "accounts": ("demo-service",), "actions": {"calendar": ("create", "answer")}}
    )
    assert why(connected) == "app_only"
