"""Dates with no year and deliveries (decisions 2026-10-28; roadmap P85). The applier gives a month and day (`--MM-DD`)
its year from the day the input came; an `event.add` with a `delivery` keeps one entry per order or parcel, however many
mails come about it. Retailers, carriers and numbers here are invented."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest

from engine import schedule, today
from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.applier import Context, Inputs, apply_as_person, apply_changeset, check
from engine.dispatcher import process, undo_changeset
from engine.intake import hand_in
from engine.names import People
from engine.ops import CHANGESET
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

_ENGINE = WriteContext("engine", "trusted", "test")
RECEIVED = "2026-10-28"
RETAILER = "Parcel from the corner shop"
ORDER_A, ORDER_B = "ORD-4471-20", "ORD-9021-07"
TRACKING_A, TRACKING_B = "TRK000123456", "TRK000654321"
CARRIER = "Example Freight"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def mail(store, received: str = RECEIVED) -> tuple[str, str]:
    """A saved message received on a day, and the request that read it: what the received day is read from."""
    at = f"{received}T09:00:00+00:00"
    with store.transaction() as tx:
        source = tx.create(
            "source",
            {
                "received_at": at,
                "kind": "watched:mailbox",
                "title": "A mail about an order",
                "content_hash": "0" * 64,
                "trust": "untrusted",
            },
            _ENGINE,
        ).id
        request = tx.create(
            "request",
            {"task": "notes", "origin": "input", "state": "done", "source": source, "created_at": at},
            _ENGINE,
        ).id
    return request, source


def apply(env, ops: list[dict[str, Any]], *, received: str = RECEIVED, raw: str | None = None) -> str:
    """Apply ops as the assistant would for a mail received on `received`; the input text is the ops' quotes."""
    _, cfg, store = env
    text = raw if raw is not None else " ".join(o["evidence"]["quote"] for o in ops)
    request, source = mail(store, received)
    cs = CHANGESET.validate_python({"ops": ops}, context={"op_models": store.plugins.ops})
    ctx = Context(
        store, cfg, People(store, cfg), tuple(store.plugins.ops), Inputs(request, source, text, "", "untrusted")
    )
    return apply_changeset(cs, [], ctx, run=None)


def statuses(store, cs_id: str) -> list[str]:
    return [o["status"] for o in store.read().get("changeset", cs_id).data["ops"]]


def event_op(quote: str, start: str | None = None, end: str | None = None, **more: Any) -> dict[str, Any]:
    op: dict[str, Any] = {"op": "event.add", "title": "Delivery", "evidence": {"quote": quote}, **more}
    if start is not None:
        op["start"] = start
    if end is not None:
        op["end"] = end
    return op


def delivery_op(
    quote: str,
    start: str | None = None,
    end: str | None = None,
    *,
    order: str | None = ORDER_A,
    tracking: str | None = None,
    carrier: str | None = None,
    status: str = "on_its_way",
    **more: Any,
) -> dict[str, Any]:
    parcel = {"order": order, "tracking": tracking, "carrier": carrier, "status": status}
    return event_op(quote, start, end, delivery={k: v for k, v in parcel.items() if v is not None}, **more)


def entries(store) -> list[Any]:
    return store.read().list("event")


def only(store) -> Any:
    [entry] = entries(store)
    return entry


# ---- a date with no year -------------------------------------------------------------------------------------------


def test_a_window_with_no_year_takes_the_year_of_the_day_the_mail_came(env):
    _, _, store = env
    cs_id = apply(env, [event_op("Delivery: Oct 30-Nov 5", "--10-30", "--11-05")])
    assert statuses(store, cs_id) == ["applied"]
    entry = only(store)
    assert (entry.data["start"], entry.data["end"]) == ("2026-10-30", "2026-11-05")
    ledgered = store.read().get("changeset", cs_id).data["ops"][0]["op"]
    assert (ledgered["start"], ledgered["end"]) == ("2026-10-30", "2026-11-05")  # the ledger holds full dates too


def test_a_window_across_the_new_year_ends_in_the_next_year(env):
    _, _, store = env
    apply(env, [event_op("Delivery: Dec 28-Jan 3", "--12-28", "--01-03")], received="2026-12-20")
    assert (only(store).data["start"], only(store).data["end"]) == ("2026-12-28", "2027-01-03")


def test_a_day_already_gone_this_year_is_next_years(env):
    _, _, store = env
    apply(env, [event_op("Delivery: Jan 3", "--01-03")])
    assert only(store).data["start"] == "2027-01-03"


def test_a_date_the_input_says_already_happened_takes_the_latest_day_before_it(env):
    _, _, store = env
    apply(env, [event_op("Delivered Oct 25", "--10-25", past=True)])
    assert only(store).data["start"] == "2026-10-25"


def test_the_year_comes_from_the_day_the_mail_came_not_the_day_it_is_read(env):
    ws, cfg, store = env
    mailed = datetime(2026, 12, 20, 9, 0, tzinfo=UTC)
    set_responder(lambda task: json.dumps({"ops": [event_op("Delivery: Dec 28-Jan 3", "--12-28", "--01-03")]}))
    handed = hand_in(ws, store, note="", pasted="Delivery: Dec 28-Jan 3", now=mailed)
    process(ws, store, cfg, Router(cfg, store, env={}), handed.request, now=datetime(2027, 2, 1, tzinfo=UTC))
    assert (only(store).data["start"], only(store).data["end"]) == ("2026-12-28", "2027-01-03")


def test_a_persons_own_edit_with_no_year_takes_the_year_from_their_own_today(env):
    ws, _, _ = env
    # 23:30 UTC on 28 October is already the 29th in Auckland, so the 28th has gone and is next year's.
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "Pacific/Auckland"})
    store = Store(ws.db_path, cfg=cfg, clock=lambda: "2026-10-28T23:30:00+00:00")
    try:
        cs_id = apply_as_person(
            store, cfg, [event_op("Delivery on Oct 28", "--10-28")], "Added", note="Delivery on Oct 28"
        )
        assert statuses(store, cs_id) == ["applied"]
        assert only(store).data["start"] == "2027-10-28"
    finally:
        store.close()


def test_an_action_due_date_and_a_fact_day_with_no_year_are_given_one(env):
    _, _, store = env
    person = fixture_records(DEMO_B, "person")[0]["id"]
    quote = "Pay the deposit by Nov 3 and the lease ends Dec 1"
    cs_id = apply(
        env,
        [
            {
                "op": "action.add",
                "text": "Pay the deposit",
                "owners": [person],
                "due": "--11-03",
                "evidence": {"quote": quote},
            },
            {
                "op": "fact",
                "text": "The lease ends",
                "on": "--12-01",
                "on_kind": "expiry",
                "evidence": {"quote": quote},
            },
        ],
    )
    ops = store.read().get("changeset", cs_id).data["ops"]
    # The rules then propose a reminder for the dated fact, which waits for the person: only the first two ops count.
    assert [(o["status"], o.get("reason")) for o in ops[:2]] == [("applied", None), ("applied", None)]
    assert store.read().list("action")[-1].data["due"] == "2026-11-03"
    assert store.read().list("fact")[-1].data["on"] == "2026-12-01"


def test_a_month_and_day_that_is_not_a_real_day_is_unreadable(env):
    _, _, store = env
    with pytest.raises(ValueError):
        CHANGESET.validate_python(
            {"ops": [event_op("Delivery: Feb 30", "--02-30")]}, context={"op_models": store.plugins.ops}
        )


# ---- a delivery is one entry ---------------------------------------------------------------------------------------


def test_a_delivery_entry_carries_its_tracking_number_and_carrier(env):
    _, _, store = env
    apply(
        env, [delivery_op("Shipped, tracking TRK000123456", "--10-30", "--11-05", tracking=TRACKING_A, carrier=CARRIER)]
    )
    assert only(store).data["delivery"] == {
        "order": ORDER_A,
        "tracking": TRACKING_A,
        "carrier": CARRIER,
        "status": "on_its_way",
        "dated": True,
    }


def test_a_delivery_with_no_date_sits_on_the_day_the_mail_came_and_is_not_dated(env):
    _, _, store = env
    cs_id = apply(
        env, [delivery_op("Order shipped, tracking number ready", tracking=TRACKING_A)], received="2026-10-27"
    )
    assert statuses(store, cs_id) == ["applied"]
    entry = only(store)
    assert (entry.data["start"], entry.data["end"]) == ("2026-10-27", None)
    assert entry.data["delivery"]["dated"] is False


def test_an_event_with_no_date_and_no_delivery_is_unreadable(env):
    _, _, store = env
    with pytest.raises(ValueError):
        CHANGESET.validate_python({"ops": [event_op("Delivery soon")]}, context={"op_models": store.plugins.ops})
    with pytest.raises(ValueError):
        CHANGESET.validate_python(
            {"ops": [delivery_op("Delivery soon", end="2026-11-05")]}, context={"op_models": store.plugins.ops}
        )


def test_a_later_mail_with_the_same_order_number_moves_the_same_entry(env):
    _, _, store = env
    apply(env, [delivery_op("Delivery: Oct 30-Nov 5", "--10-30", "--11-05")])
    first = only(store).id
    cs_id = apply(env, [delivery_op("Now arriving Nov 2", "--11-02", carrier=CARRIER)], received="2026-10-31")
    assert statuses(store, cs_id) == ["applied"]
    entry = only(store)
    assert entry.id == first
    assert (entry.data["start"], entry.data["end"]) == ("2026-11-02", None)
    assert entry.data["delivery"]["carrier"] == CARRIER


def test_a_later_mail_with_the_same_tracking_number_moves_the_same_entry(env):
    _, _, store = env
    apply(env, [delivery_op("Shipped", "--10-30", "--11-05", tracking=TRACKING_A)])
    first = only(store).id
    apply(env, [delivery_op("Out for delivery", "--11-01", order=None, tracking=TRACKING_A, status="out_for_delivery")])
    entry = only(store)
    assert entry.id == first
    assert entry.data["start"] == "2026-11-01"
    assert entry.data["delivery"]["order"] == ORDER_A  # what the later mail leaves out stays
    assert entry.data["delivery"]["status"] == "out_for_delivery"


def test_matching_ignores_capitals_and_spaces_around_a_number(env):
    _, _, store = env
    apply(env, [delivery_op("Shipped", "--10-30", tracking=TRACKING_A)])
    apply(env, [delivery_op("Moved", "--10-31", order=None, tracking=f"  {TRACKING_A.lower()} ")])
    assert len(entries(store)) == 1
    assert only(store).data["start"] == "2026-10-31"


def test_a_status_only_moves_forward(env):
    _, _, store = env
    apply(env, [delivery_op("Out for delivery", "--10-30", status="out_for_delivery")])
    apply(env, [delivery_op("Shipped", "--11-04", status="on_its_way")])
    assert only(store).data["delivery"]["status"] == "out_for_delivery"
    apply(env, [delivery_op("Delivered", "--10-30", status="arrived", past=True)])
    apply(env, [delivery_op("Out for delivery", "--11-04", status="out_for_delivery")])
    assert only(store).data["delivery"]["status"] == "arrived"


def test_an_older_mail_read_late_leaves_the_dates_alone(env):
    _, _, store = env
    apply(env, [delivery_op("Out for delivery", "--10-30", status="out_for_delivery")])
    apply(env, [delivery_op("Delivery: Nov 8-Nov 12", "--11-08", "--11-12")], received="2026-10-29")
    assert (only(store).data["start"], only(store).data["end"]) == ("2026-10-30", None)


def test_a_new_day_replaces_the_old_window_whole(env):
    _, _, store = env
    apply(env, [delivery_op("Delivery: Oct 30-Nov 5", "--10-30", "--11-05")])
    apply(env, [delivery_op("Now Nov 3", "--11-03")])
    assert (only(store).data["start"], only(store).data["end"]) == ("2026-11-03", None)


def test_an_undated_delivery_then_a_dated_one_then_arrived_are_one_entry(env):
    _, _, store = env
    apply(env, [delivery_op("Order shipped", tracking=TRACKING_A)], received="2026-10-27")
    entry = only(store)
    assert entry.data["delivery"]["dated"] is False
    apply(
        env, [delivery_op("Delivery: Oct 30-Nov 5", "--10-30", "--11-05", tracking=TRACKING_A)], received="2026-10-28"
    )
    dated = only(store)
    assert dated.id == entry.id
    assert (dated.data["start"], dated.data["end"]) == ("2026-10-30", "2026-11-05")
    assert dated.data["delivery"]["dated"] is True
    apply(env, [delivery_op("Delivered today", status="arrived", tracking=TRACKING_A)], received="2026-11-02")
    arrived = only(store)
    assert arrived.id == entry.id
    assert arrived.data["delivery"]["status"] == "arrived"
    assert (arrived.data["start"], arrived.data["end"]) == ("2026-10-30", "2026-11-05")  # no date given: dates stay


def test_an_arrival_with_no_date_puts_an_undated_entry_on_the_day_it_came(env):
    _, _, store = env
    apply(env, [delivery_op("Order shipped")], received="2026-10-27")
    apply(env, [delivery_op("Delivered", status="arrived")], received="2026-11-02")
    entry = only(store)
    assert (entry.data["start"], entry.data["end"]) == ("2026-11-02", None)
    assert entry.data["delivery"]["status"] == "arrived"
    assert entry.data["delivery"]["dated"] is True


def test_undoing_a_merge_restores_the_entry_exactly(env):
    _, _, store = env
    apply(env, [delivery_op("Delivery: Oct 30-Nov 5", "--10-30", "--11-05", tracking=TRACKING_A)])
    before = only(store)
    cs_id = apply(
        env, [delivery_op("Delivered Nov 2", "--11-02", status="arrived", carrier=CARRIER)], received="2026-11-02"
    )
    assert only(store).data != before.data
    report = undo_changeset(store, cs_id)
    assert report.restored == [0]
    after = only(store)
    assert after.id == before.id and after.data == before.data


def test_two_different_orders_make_two_entries(env):
    _, _, store = env
    apply(env, [delivery_op("Shipped", "--10-30", order=ORDER_A, tracking=TRACKING_A)])
    apply(env, [delivery_op("Shipped", "--10-31", order=ORDER_B, tracking=TRACKING_B)])
    assert sorted(e.data["delivery"]["order"] for e in entries(store)) == sorted([ORDER_A, ORDER_B])


def test_one_order_with_two_tracking_numbers_is_two_parcels_and_two_entries(env):
    _, _, store = env
    apply(env, [delivery_op("First parcel shipped", "--10-30", tracking=TRACKING_A)])
    apply(env, [delivery_op("Second parcel shipped", "--10-31", tracking=TRACKING_B)])
    assert sorted(e.data["delivery"]["tracking"] for e in entries(store)) == sorted([TRACKING_A, TRACKING_B])
    # A mail with the order number alone has no tracking number to tell them apart, so it joins the first.
    apply(env, [delivery_op("Order update", "--11-02")])
    assert len(entries(store)) == 2
    assert entries(store)[0].data["start"] == "2026-11-02"


def test_an_order_match_merges_when_the_entry_has_no_tracking_number_yet(env):
    _, _, store = env
    apply(env, [delivery_op("Order shipped")])
    apply(env, [delivery_op("Tracking ready", "--10-30", tracking=TRACKING_A)])
    assert len(entries(store)) == 1
    assert only(store).data["delivery"]["tracking"] == TRACKING_A


def test_a_called_off_entry_is_not_merged_into(env):
    _, _, store = env
    apply(env, [delivery_op("Shipped", "--10-30")])
    with store.transaction() as tx:
        cur = tx.get("event", only(store).id)
        tx.update("event", cur.id, {"cancelled": True}, _ENGINE, read_version=cur.version)
    apply(env, [delivery_op("Shipped again", "--11-02")])
    assert len(entries(store)) == 2


def test_a_delivery_with_neither_number_is_always_a_new_entry(env):
    _, _, store = env
    apply(env, [delivery_op("Shipped", "--10-30", order=None, carrier=CARRIER)])
    apply(env, [delivery_op("Shipped", "--10-31", order=None, carrier=CARRIER)])
    assert len(entries(store)) == 2


def test_the_event_with_a_delivery_is_still_a_data_op_that_needs_its_quote(env):
    _, cfg, store = env
    cs = CHANGESET.validate_python(
        {"ops": [delivery_op("Words that are not in the mail", "--10-30")]}, context={"op_models": store.plugins.ops}
    )
    ctx = Context(
        store, cfg, People(store, cfg), ("event.add",), Inputs("REQ-1", None, "Shipped", "Shipped", "untrusted")
    )
    assert [p.check for p in check(cs, ctx) if p.severity == "refuse"] == ["evidence"]
    assert store.plugins.tiers["event.add"] == "data"


# ---- what the screens read -----------------------------------------------------------------------------------------

NOW = datetime(2026, 10, 28, 12, 0, tzinfo=UTC)


def test_a_dated_delivery_is_on_its_days_and_an_undated_one_is_on_none(env):
    _, cfg, store = env
    apply(env, [delivery_op("Delivery: Oct 30-Nov 1", "--10-30", "--11-01", tracking=TRACKING_A, carrier=CARRIER)])
    apply(env, [delivery_op("Order shipped", order=ORDER_B)])
    items = today.agenda(store, cfg, NOW, through=date(2026, 11, 2))
    assert [(i.days[0], i.delivery["tracking"]) for i in items] == [(date(2026, 10, 30), TRACKING_A)]
    assert items[0].days == [date(2026, 10, 30), date(2026, 10, 31), date(2026, 11, 1)]
    listed = today.agenda(store, cfg, NOW, through=date(2026, 11, 2), undated=True)
    assert [i.days for i in listed] == [[date(2026, 10, 30), date(2026, 10, 31), date(2026, 11, 1)], []]
    assert listed[1].delivery["order"] == ORDER_B and listed[1].delivery["dated"] is False
    # The schedule's days read only what is on a day.
    days = schedule.schedule(store, cfg, NOW, date(2026, 10, 28), 6)
    assert [e.item.delivery["tracking"] for d in days for e in d.all_day + d.timed] == [TRACKING_A] * 3


def test_the_agenda_route_carries_the_delivery(env):
    from fastapi.testclient import TestClient

    from api.app import create_app

    ws, cfg, store = env
    soon = date.today() + timedelta(days=1)
    window = (soon.isoformat(), (soon + timedelta(days=1)).isoformat())
    apply(env, [delivery_op("Delivery in two days", *window, tracking=TRACKING_A, carrier=CARRIER)])
    apply(env, [delivery_op("Order shipped", order=ORDER_B)])
    client = TestClient(create_app(ws, cfg, "t", start_worker=False))
    client.headers["Authorization"] = "Bearer t"
    found = client.get(cfg.server.base_path.rstrip("/") + "/api/today/agenda").json()
    deliveries = {i["delivery"]["order"]: i for i in found if i.get("delivery")}
    assert deliveries[ORDER_A]["delivery"] == {
        "order": ORDER_A,
        "tracking": TRACKING_A,
        "carrier": CARRIER,
        "status": "on_its_way",
        "dated": True,
    }
    assert deliveries[ORDER_B]["days"] == [] and deliveries[ORDER_B]["delivery"]["dated"] is False


# ---- the evaluation scorer -----------------------------------------------------------------------------------------


def test_the_scorer_compares_the_delivery_a_case_states_and_only_that(env):
    from engine.evaluate import _op_matches

    _, _, store = env
    cs_id = apply(env, [delivery_op("Shipped", "--10-30", tracking=TRACKING_A, carrier=CARRIER)])
    outcome = store.read().get("changeset", cs_id).data["ops"][0]

    def met(**delivery) -> bool:
        return _op_matches({"op": "event.add", "delivery": delivery}, outcome, store)

    assert met(tracking=f" {TRACKING_A.lower()} ", carrier=CARRIER, order=ORDER_A, status="on_its_way", dated=True)
    assert met()
    assert _op_matches({"op": "event.add"}, outcome, store)
    assert not met(tracking=TRACKING_B)
    assert not met(carrier="Another Carrier")
    assert not met(status="arrived")
    assert not met(dated=False)
    # An entry with no delivery cannot meet an expected one.
    plain = apply(env, [event_op("Meeting on Nov 9", "--11-09")])
    assert not _op_matches(
        {"op": "event.add", "delivery": {"order": ORDER_A}}, store.read().get("changeset", plain).data["ops"][0], store
    )
