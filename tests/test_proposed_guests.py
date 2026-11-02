"""Who is on a plain calendar entry is a proposal, never a fact the rules write (design 6.2, 6.32; P110 J8 follow-up).

A plain entry whose title names known people has them in `proposed_guests`; Today asks "Is <entry> with <names>?" and
only the person's yes (or the assistant's `event.guests` with the words that say so) records them in `people`, which
is all that meeting preparation, who the person last met and the brief read. Names, addresses and ids come from the
fixtures; the calendar is a file."""

from __future__ import annotations

from datetime import timedelta

from engine import entry_guests
from engine.applier import Context, Inputs, apply_changeset, check
from engine.dispatcher import undo_changeset
from engine.meeting_guests import guests
from engine.names import People
from engine.ops import CHANGESET, OP_MODELS, TIERS
from engine.packet import _calendar_section
from engine.storage import WriteContext
from engine.tasks import TASKS
from engine.today_queue import queue
from tests import test_plain_calendar_entries as base
from tests.test_knowledge_records import request as make_request
from tests.test_plain_calendar_entries import (
    FIRST_NAME,
    KNOWN,
    ME,
    NOW,
    PEOPLE,
    SHARED,
    calendar,
    entry_of,
    vevent,
)

# The calendar fixtures of the plain-entries tests: a workspace with a calendar file, and the same behind the API.
cal = base.cal
api = base.api

_TEST = WriteContext("pm", "trusted", "test")
TITLE = f"Lunch with {KNOWN['full_name']}"
OTHER = next(p for p in PEOPLE[1:] if p["id"] != KNOWN["id"] and p["full_name"].split()[0] != SHARED)


def lines(ws, store, cfg):
    return [x for x in queue(ws, store, cfg, NOW) if x.kind == "guests"]


def who_is_on(store, cfg, entry):
    return [g.person for g in guests(store.read(), cfg, store.read().get("event", entry.id).data)]


def test_a_title_naming_a_person_asks_whether_they_are_on_it_and_until_then_they_are_not(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", TITLE, day="20300307")))
    found = entry_of(store, TITLE)
    assert (found.data["people"], found.data["proposed_guests"]) == ([], [KNOWN["id"]])
    assert who_is_on(store, cfg, found) == []
    (line,) = lines(ws, store, cfg)
    assert (line.key, line.entry, line.text, line.names, line.due) == (
        f"guests:{found.id}",
        found.id,
        TITLE,
        [KNOWN["full_name"]],
        "2030-03-07",
    )


def test_yes_records_them_as_on_it_with_undo_and_a_later_read_proposes_nothing(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", TITLE, day="20300307")))
    found = entry_of(store, TITLE)
    changeset = entry_guests.confirm(store, cfg, found.id)
    again = store.read().get("event", found.id).data
    assert (again["people"], again["proposed_guests"]) == ([KNOWN["id"]], [])
    assert who_is_on(store, cfg, found) == [KNOWN["id"]]
    assert lines(ws, store, cfg) == []
    put(calendar(vevent("a", TITLE, day="20300307", hour="16")), NOW + timedelta(hours=1))
    again = store.read().get("event", found.id).data
    assert (again["people"], again["proposed_guests"]) == ([KNOWN["id"]], [])
    undo_changeset(store, changeset)
    back = store.read().get("event", found.id).data
    assert (back["people"], back["proposed_guests"]) == ([], [KNOWN["id"]])
    assert [x.kind for x in lines(ws, store, cfg)] == ["guests"]


def test_not_them_is_never_proposed_again_taking_it_back_asks_again_and_another_name_asks_anew(cal):
    from engine import suggestions

    ws, cfg, store, put = cal
    put(calendar(vevent("a", TITLE, day="20300307")))
    found = entry_of(store, TITLE)
    signal = entry_guests.decline(store, cfg, found.id, NOW)
    assert lines(ws, store, cfg) == []
    put(calendar(vevent("a", TITLE, day="20300307", hour="16")), NOW + timedelta(hours=1))
    assert store.read().get("event", found.id).data["proposed_guests"] == []
    assert lines(ws, store, cfg) == []
    assert suggestions.take_back(store, signal)
    put(calendar(vevent("a", TITLE, day="20300307", hour="17")), NOW + timedelta(hours=2))
    assert [x.kind for x in lines(ws, store, cfg)] == ["guests"]
    entry_guests.decline(store, cfg, found.id, NOW)
    both = f"{TITLE} and {OTHER['full_name']}"
    put(calendar(vevent("a", both, day="20300307", hour="17")), NOW + timedelta(hours=3))
    (line,) = lines(ws, store, cfg)
    assert sorted(line.names) == sorted([KNOWN["full_name"], OTHER["full_name"]])


def test_a_confirmed_guest_stays_when_the_title_changes_and_only_the_new_name_is_proposed(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", TITLE, day="20300307")))
    found = entry_of(store, TITLE)
    entry_guests.confirm(store, cfg, found.id)
    put(calendar(vevent("a", f"Coffee with {OTHER['full_name']}", day="20300307")), NOW + timedelta(hours=1))
    again = store.read().get("event", found.id).data
    assert (again["people"], again["proposed_guests"]) == ([KNOWN["id"]], [OTHER["id"]])


def test_an_entry_called_off_or_already_past_asks_nothing(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", TITLE, day="20300307"), vevent("b", f"Dinner with {FIRST_NAME}", day="20300301")))
    assert [x.entry for x in lines(ws, store, cfg)] == [entry_of(store, TITLE).id]
    put(calendar(vevent("a", TITLE, day="20300307", status="CANCELLED")), NOW + timedelta(hours=1))
    assert lines(ws, store, cfg) == []


def test_the_assistant_sees_the_proposal_and_confirms_it_with_the_words_that_say_so(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", TITLE, day="20300307")))
    found = entry_of(store, TITLE)
    shown = _calendar_section(store, cfg, NOW.date())
    assert f"may be with {KNOWN['id']} ({KNOWN['full_name']}), not confirmed" in shown
    quote = f"lunch with {KNOWN['full_name'].split()[0]} is on"
    op = {"op": "event.guests", "id": found.id, "people": [KNOWN["id"]], "evidence": {"quote": quote}}
    cs = CHANGESET.validate_python({"ops": [op]}, context={"op_models": store.plugins.ops})
    ctx = Context(
        store,
        cfg,
        People(store, cfg),
        tuple(store.plugins.ops),
        Inputs(make_request(store, "input", task="notes"), None, "", f"Yes, {quote} for Thursday.", "untrusted"),
    )
    assert [p.message for p in check(cs, ctx) if p.severity == "refuse"] == []
    cs_id = apply_changeset(cs, [], ctx, run=None)
    done = store.read().get("event", found.id).data
    assert (done["people"], done["proposed_guests"]) == ([KNOWN["id"]], [])
    ledger = [r for r in store.read().changes_of(cs_id) if r["kind"] == "event"]
    assert ledger and all(r["evidence"]["quote"] == quote for r in ledger)
    assert "may be with" not in _calendar_section(store, cfg, NOW.date())
    undo_changeset(store, cs_id)
    assert store.read().get("event", found.id).data["people"] == []


def test_event_guests_is_a_data_op_notes_is_offered_and_it_refuses_what_isnt_one_known_person(cal):
    ws, cfg, store, put = cal
    assert TIERS["event.guests"] == "data" and "event.guests" in TASKS["notes"].ops
    assert OP_MODELS["event.guests"].model_fields["evidence"].is_required()
    put(calendar(vevent("a", TITLE, day="20300307")))
    found = entry_of(store, TITLE)
    with store.transaction() as tx:
        gone = tx.create(
            "event", {"title": "Gone", "start": "2030-03-07", "cancelled": True, "trust": "trusted"}, _TEST
        )
    quote = "lunch is on"
    ctx = Context(
        store,
        cfg,
        People(store, cfg),
        tuple(store.plugins.ops),
        Inputs(make_request(store, "input", task="notes"), None, "", f"Yes, {quote}.", "untrusted"),
    )

    def refusals(**more):
        op = {"op": "event.guests", "id": found.id, "people": [KNOWN["id"]], "evidence": {"quote": quote}, **more}
        cs = CHANGESET.validate_python({"ops": [op]}, context={"op_models": store.plugins.ops})
        return [p.message for p in check(cs, ctx) if p.severity == "refuse"]

    assert "isn't one known person" in refusals(people=["Nobody Known At All"])[0]
    assert "isn't one known person" in refusals(people=[SHARED])[0]
    assert "themselves" in refusals(people=[ME["id"]])[0]
    assert "called off" in refusals(id=gone.id)[0]
    assert "no calendar entry" in refusals(id="EVT-999")[0]
    assert store.read().get("event", found.id).data["people"] == []


def test_the_routes_confirm_and_decline_with_undo_and_refuse_when_nobody_is_proposed(api):
    client, store, cfg = api
    found = entry_of(store, "Planning reminder")
    with store.transaction() as tx:
        current = tx.get("event", found.id)
        tx.update("event", found.id, {"proposed_guests": [KNOWN["id"]]}, _TEST, read_version=current.version)
    (line,) = [x for x in client.get("/api/today/queue").json() if x["kind"] == "guests"]
    assert (line["key"], line["entry"], line["names"]) == (f"guests:{found.id}", found.id, [KNOWN["full_name"]])
    said = client.post(f"/api/events/{found.id}/guests/not-them")
    assert said.status_code == 200, said.text
    assert [x for x in client.get("/api/today/queue").json() if x["kind"] == "guests"] == []
    assert client.post(f"/api/events/{found.id}/guests/not-them").status_code == 409
    assert client.post(f"/api/events/{found.id}/guests/confirm").status_code == 409
    assert client.post(f"/api/suggestions/not-now/{said.json()['signal']}/undo").status_code == 200
    done = client.post(f"/api/events/{found.id}/guests/confirm")
    assert done.status_code == 200, done.text
    assert store.read().get("event", found.id).data["people"] == [KNOWN["id"]]
    assert client.post(f"/api/events/{found.id}/guests/confirm").status_code == 409
    assert client.post(f"/api/changesets/{done.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    assert store.read().get("event", found.id).data["people"] == []
    assert client.post("/api/events/EVT-999/guests/confirm").status_code == 404
