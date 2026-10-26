"""One appointment held in a calendar and made again from its booking confirmation: the agenda reaches a week ahead, the
copy is not made, and an existing copy never clashes with its original. Names come from the fixtures and the booking
samples; the calendar is the fake connector."""

from __future__ import annotations

from datetime import UTC, timedelta
from pathlib import Path

import pytest

from engine import booking_entries, day_clashes
from engine.ops import CHANGESET
from engine.same_entry import same_entry
from engine.storage import WriteContext
from engine.today import agenda, agenda_span
from engine.watch import refresh
from tests.test_today_dashboard import event, make
from tests.test_watch import NOW

BOOKING = (Path(__file__).parent / "fixtures" / "bookings" / "restaurant_jsonld.html").read_text(encoding="utf-8")
_PM = WriteContext("pm", "trusted", "test")
DINNER = "2026-11-20T14:00:00+00:00"  # the booking sample's start, 09:00 at -05:00


def calendar(key, start, title, **more):
    return {**event(key, start, **more), "title": title}


def test_a_calendar_entry_two_days_ahead_is_on_the_agenda_with_the_defaults(tmp_path):
    soon = (NOW + timedelta(days=2)).isoformat()
    ws, cfg, store = make(tmp_path, [calendar("vet", soon, "Vet visit")])
    try:
        refresh(ws, store, cfg, "s", NOW)
        # The fictional workspace states its own reach; the schema's default is what a fresh workspace has.
        cfg.ui.today.agenda_days_ahead = type(cfg.ui.today).model_fields["agenda_days_ahead"].default
        assert [a.title for a in agenda(store, cfg, NOW)] == ["Vet visit"]
        first, last = agenda_span(cfg, NOW)
        assert (last - first).days == 6 and first == NOW.date()
    finally:
        store.close()


def test_titles_one_inside_the_other_at_one_moment_are_one_appointment():
    assert same_entry("Vet visit", "2030-03-06T10:00:00+00:00", "vet visit at Elm Clinic", "2030-03-06T10:00:00Z")
    assert same_entry("Vet, visit!", "2030-03-06T10:00:00+00:00", "Vet  visit at Elm", "2030-03-06T11:00:00+01:00")
    assert not same_entry("Vet visit", "2030-03-06T10:00:00+00:00", "Vet visit at Elm", "2030-03-06T10:30:00+00:00")
    assert not same_entry("Vet visit", "2030-03-06T10:00:00+00:00", "Dentist", "2030-03-06T10:00:00+00:00")
    assert not same_entry("Vet", "2030-03-06T10:00:00+00:00", "Veterinary board", "2030-03-06T10:00:00+00:00")


def test_a_booking_already_on_a_calendar_makes_no_second_entry(tmp_path):
    ws, cfg, store = make(tmp_path, [calendar("table", DINNER, "Table")])
    try:
        refresh(ws, store, cfg, "s", NOW)
        empty = CHANGESET.validate_python({"ops": []}, context={"op_models": store.plugins.ops})
        assert booking_entries.entries(cfg, BOOKING).ops, "the booking alone does make an entry"
        assert booking_entries.add_to(empty, cfg, store.read(), BOOKING).ops == []
    finally:
        store.close()


def test_a_booking_not_on_any_calendar_still_makes_its_entry(tmp_path):
    ws, cfg, store = make(tmp_path, [calendar("table", "2026-11-21T14:00:00+00:00", "Table")])
    try:
        refresh(ws, store, cfg, "s", NOW)
        empty = CHANGESET.validate_python({"ops": []}, context={"op_models": store.plugins.ops})
        assert len(booking_entries.add_to(empty, cfg, store.read(), BOOKING).ops) == 1
    finally:
        store.close()


@pytest.mark.parametrize("own_title", ["Vet visit at Elm Clinic", "Dentist"])
def test_the_clash_check_pairs_different_entries_but_not_an_entry_with_its_own_copy(tmp_path, own_title):
    start = (NOW + timedelta(days=2)).replace(hour=10).isoformat()
    ws, cfg, store = make(tmp_path, [calendar("vet", start, "Vet visit", end=None)])
    try:
        refresh(ws, store, cfg, "s", NOW)
        with store.transaction() as tx:
            tx.create("event", {"trust": "trusted", "title": own_title, "start": start}, _PM)
        found = day_clashes.upcoming(store, cfg, NOW.astimezone(UTC))
        assert (len(found) == 1) == (own_title == "Dentist")
    finally:
        store.close()
