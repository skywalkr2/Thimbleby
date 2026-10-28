"""The gate week's other instruments (design 6.32, "Measures"; the drafted pass bar, rows 1, 3, 6 and 7): the median
review time a day (the review on Today included), promises that vanished with no ending anyone saw, connected sources
unread for more than a day while Today said nothing, and the independent reading of a consented sample of messages.
Each is a count with its denominator, read from the records alone. Names and ids come from the fixtures."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, time, timedelta

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import gate_measures, gate_sample, outcome
from engine.applier import apply_as_person, undo
from engine.storage import Store, StoreError, WriteContext
from engine.today import zone
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.test_gate_measures import from_input, keep
from tests.test_hold_drop_fold import OPEN, drop_op

_TEST = WriteContext(actor="pm", trust="trusted", op="test.gate-instruments")
TOKEN = "gate-token"
PEOPLE = fixture_records(DEMO_B, "person")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def window_of(cfg, days: int = 28) -> gate_measures.Window:
    return gate_measures.window(datetime.now(UTC), days, zone(cfg))


def me(cfg) -> str:
    return cfg.workspace.user.person


def someone(cfg) -> str:
    return next(p["id"] for p in PEOPLE if p["id"] != me(cfg))


def promise(store, cfg, text: str, *, when: datetime | None = None) -> str:
    """A promise (an action that says who it was promised to), made at `when`."""
    store.clock = lambda: (when or datetime.now(UTC)).isoformat(timespec="seconds")
    with store.transaction() as tx:
        return tx.create(
            "action",
            {"text": text, "owners": [{"person": me(cfg)}], "promised_to": [someone(cfg)], "basis": "said"},
            _TEST,
        ).id


def write(store, record_id: str, changes: dict, ctx: WriteContext) -> None:
    with store.transaction() as tx:
        tx.update("action", record_id, changes, ctx, read_version=tx.get("action", record_id).version)


def lost_of(store, cfg, days: int = 28) -> gate_measures.LostMeasure:
    view = store.read()
    return gate_measures.lost_measure(view, view.ledger(kind="action"), window_of(cfg, days), zone(cfg))


# ---- review time: the review on Today is timed, and the median is a day's total ------------------------------------


def test_the_review_on_today_is_a_screen_that_counts_toward_review_time(env):
    _, cfg, store = env
    assert "today" in outcome.SCREENS
    assert outcome.record_review_time(store, cfg, "today", 75, datetime.now(UTC)) == 75


def test_the_median_review_time_is_the_median_of_the_days_with_any_and_counts_every_screen(env):
    _, cfg, store = env
    # A moment just past, never later today: noon would still be ahead just after midnight, and fall outside the window.
    now = datetime.now(UTC).replace(microsecond=0) - timedelta(minutes=1)
    cap = cfg.dispatch.knowledge.review_visit_max_seconds
    assert cap > 600
    for days_ago, screen, seconds in [
        (0, "today", 300),
        (0, "review", 100),  # day total 400
        (1, "today", 600),  # 600
        (2, "since", 60),
        (2, "today", 140),  # 200
        (3, "changes", cap * 2),  # held to the most for a visit
    ]:
        moment = now - timedelta(days=days_ago)
        store.clock = lambda moment=moment: moment.isoformat(timespec="seconds")
        outcome.record_review_time(store, cfg, screen, seconds, moment)
    found = gate_measures.review_measure(store.read(), window_of(cfg), zone(cfg))
    assert [(d.seconds, d.visits) for d in found.days] == [(400, 2), (600, 1), (200, 2), (cap, 1)]  # newest first
    assert found.days_reviewed == 4 and found.total_seconds == 1200 + cap and found.visits == 6
    assert found.median_seconds == int((400 + 600) / 2) if cap > 600 else True


def test_a_window_with_no_review_time_has_no_median(env):
    _, cfg, store = env
    found = gate_measures.review_measure(store.read(), window_of(cfg), zone(cfg))
    assert (found.days_reviewed, found.median_seconds, found.days) == (0, None, [])


# ---- lost promises -------------------------------------------------------------------------------------------------


def test_a_promise_ended_by_an_ending_op_or_by_the_person_is_not_lost(env):
    _, cfg, store = env
    kept_drop = promise(store, cfg, "Send the proofs")
    persons_close = promise(store, cfg, "Pay the printer")
    assistants_close = promise(store, cfg, "Book the room")
    still_open = promise(store, cfg, "Call the venue")
    held = from_input(store, cfg, [drop_op(OPEN[0]["id"])])[0]  # an unrelated held drop stays out of the count
    keep(store, cfg, held)
    # An action the person's own held drop ended: the ledger records the person releasing it.
    store.clock = lambda: datetime.now(UTC).isoformat(timespec="seconds")
    from_input_cs = from_input(store, cfg, [drop_op(kept_drop)])[0]
    keep(store, cfg, from_input_cs)
    apply_as_person(store, cfg, [{"op": "action.close", "id": persons_close}], "Closed")
    write(
        store,
        assistants_close,
        {"status": "done"},
        WriteContext(actor="assistant", trust="untrusted", op="action.close#0", changeset="CS-900"),
    )
    found = lost_of(store, cfg)
    assert found.lost == 0 and found.items == []
    assert found.existed >= 4
    assert store.read().get("action", still_open).data["status"] == "open"


def test_a_promise_that_left_open_with_no_ending_op_and_no_person_is_lost(env):
    _, cfg, store = env
    gone = promise(store, cfg, "Send the floor plan")
    write(store, gone, {"status": "dropped"}, WriteContext(actor="engine", trust="trusted", op="sweep"))
    other = promise(store, cfg, "Reply to the shop")
    write(
        store,
        other,
        {"status": "done"},
        WriteContext(actor="assistant", trust="untrusted", op="record.set#0", changeset="CS-901"),
    )
    found = lost_of(store, cfg)
    assert found.lost == 2
    assert {i.id for i in found.items} == {gone, other}
    (day,) = found.days
    assert (day.lost, day.existed) == (2, found.existed)


def test_a_promise_deleted_by_the_engine_is_lost_but_deleted_by_the_person_is_not(env):
    _, cfg, store = env
    engine_deleted = promise(store, cfg, "Hand in the form")
    person_deleted = promise(store, cfg, "Pick up the keys")
    with store.transaction() as tx:
        tx.delete("action", engine_deleted, WriteContext("engine", "trusted", "cleanup"), read_version=1)
        tx.delete("action", person_deleted, WriteContext("pm", "trusted", "record.delete"), read_version=1)
    found = lost_of(store, cfg)
    assert [i.id for i in found.items] == [engine_deleted]


def test_a_promise_that_vanished_and_was_brought_back_is_not_lost(env):
    _, cfg, store = env
    back = promise(store, cfg, "Send the second proof")
    cs = apply_as_person(store, cfg, [{"op": "action.drop", "id": back, "reason": "Not needed"}], "Dropped")
    undo(store, cs)
    swept = promise(store, cfg, "Return the samples")
    write(store, swept, {"status": "dropped"}, WriteContext("engine", "trusted", "sweep"))
    write(store, swept, {"status": "open"}, WriteContext("pm", "trusted", "undo"))
    assert lost_of(store, cfg).lost == 0


def test_a_plain_to_do_that_names_nobody_it_was_promised_to_is_not_a_promise(env):
    _, cfg, store = env
    store.clock = lambda: datetime.now(UTC).isoformat(timespec="seconds")
    with store.transaction() as tx:
        todo = tx.create("action", {"text": "Water the plants", "owners": [{"person": me(cfg)}]}, _TEST).id
    write(store, todo, {"status": "dropped"}, WriteContext("engine", "trusted", "sweep"))
    assert (lost_of(store, cfg).existed, lost_of(store, cfg).lost) == (0, 0)


def test_a_promise_that_vanished_before_the_window_is_neither_counted_nor_lost(env):
    _, cfg, store = env
    long_ago = datetime.now(UTC) - timedelta(days=90)
    old = promise(store, cfg, "Settle the invoice", when=long_ago)
    store.clock = lambda: (long_ago + timedelta(days=1)).isoformat(timespec="seconds")
    write(store, old, {"status": "dropped"}, WriteContext("engine", "trusted", "sweep"))
    found = lost_of(store, cfg)
    assert (found.existed, found.lost) == (0, 0)


# ---- sources unread for more than a day ----------------------------------------------------------------------------


def source_id(cfg) -> str:
    return cfg.watch.sources[0].id


def run(store, cfg, hours_ago: float, outcome_name: str = "ok", *, now: datetime) -> None:
    store.clock = lambda: now.isoformat(timespec="seconds")
    with store.transaction() as tx:
        tx.create(
            "watch_run",
            {
                "source": source_id(cfg),
                "started_at": (now - timedelta(hours=hours_ago)).isoformat(),
                "outcome": outcome_name,
                **({"error_kind": "outage", "error": "down"} if outcome_name == "failed" else {}),
            },
            _TEST,
        )


def sources_of(store, cfg, now: datetime) -> gate_measures.SourcesMeasure:
    win = gate_measures.window(now, 3, zone(cfg))
    return gate_measures.sources_measure(store.read(), cfg, win, zone(cfg))


def with_file(cfg, name: str, **changes):
    """The configuration with some keys of one file changed, whole."""
    return replace(cfg, files={**cfg.files, name: cfg.files[name].model_copy(update=changes)})


def only_this_source(cfg, **changes):
    """The configuration with just the first watched source on, so one source's days are what is counted."""
    first = cfg.watch.sources[0].model_copy(update={"enabled": True, **changes})
    return with_file(cfg, "watch", sources=[first])


def test_a_source_read_within_the_day_is_checked_and_never_unread(env):
    _, cfg, store = env
    cfg = only_this_source(cfg)
    now = datetime(2026, 10, 20, 15, 0, tzinfo=zone(cfg))
    run(store, cfg, 2, now=now)
    found = sources_of(store, cfg, now)
    assert found.over_a_day == 0 and found.silent == 0 and found.checked >= 1


def test_a_source_unread_over_a_day_that_today_names_is_counted_but_not_silent(env):
    _, cfg, store = env
    cfg = only_this_source(cfg, enabled=True)
    now = datetime(2026, 10, 20, 15, 0, tzinfo=zone(cfg))
    run(store, cfg, 40, now=now - timedelta(hours=40))
    run(store, cfg, 1, "failed", now=now)  # the failure is a line on Today
    found = sources_of(store, cfg, now)
    assert found.over_a_day >= 1 and found.silent == 0


def test_a_source_unread_over_a_day_with_no_line_is_silent(env):
    _, cfg, store = env
    # The configured stale time is longer than a day, so a source read 30 hours ago has no line.
    cfg = with_file(only_this_source(cfg), "watch", stale_after_hours=72)
    now = datetime(2026, 10, 20, 15, 0, tzinfo=zone(cfg))
    run(store, cfg, 30, now=now - timedelta(hours=30))
    found = sources_of(store, cfg, now)
    assert found.silent >= 1
    today = found.days[-1]
    assert today.day == now.date() and today.silent == 1 and today.over_a_day == 1


def test_a_source_not_yet_connected_on_a_day_is_not_checked_that_day(env):
    _, cfg, store = env
    cfg = only_this_source(cfg)
    now = datetime(2026, 10, 20, 15, 0, tzinfo=zone(cfg))
    run(store, cfg, 1, now=now)
    found = sources_of(store, cfg, now)
    assert [d.day for d in found.days] == [now.date()]


def test_a_source_turned_off_is_not_connected_and_is_never_counted(env):
    _, cfg, store = env
    cfg = only_this_source(cfg, enabled=False)
    now = datetime(2026, 10, 20, 15, 0, tzinfo=zone(cfg))
    run(store, cfg, 90, now=now - timedelta(hours=90))
    assert sources_of(store, cfg, now).checked == 0


# ---- the independent reading of a consented sample -----------------------------------------------------------------


def consenting(cfg, size: int = 3):
    knowledge = cfg.dispatch.knowledge.model_copy(update={"sample_consent": True, "sample_size": size})
    return with_file(cfg, "dispatch", knowledge=knowledge)


def message(store, title: str, *, received: datetime, sent: bool = True) -> str:
    store.clock = lambda: received.isoformat(timespec="seconds")
    with store.transaction() as tx:
        return tx.create(
            "source",
            {
                "received_at": received.isoformat(),
                **({"sent_at": received.isoformat()} if sent else {}),
                "kind": "watched:mailbox",
                "title": title,
                "content_hash": "0" * 64,
                "trust": "untrusted",
            },
            _TEST,
        ).id


def messages(store, n: int, *, days_ago: int = 2) -> list[str]:
    when = datetime.now(UTC) - timedelta(days=days_ago)
    return [message(store, f"Message {i}", received=when + timedelta(minutes=i)) for i in range(n)]


def test_nothing_is_drawn_without_the_persons_consent(env):
    _, cfg, store = env
    messages(store, 5)
    with pytest.raises(StoreError, match="Settings"):
        gate_sample.draw(store, cfg, datetime.now(UTC))
    assert store.read().list("gate_sample") == []


def test_the_sample_is_drawn_from_the_windows_messages_only_at_the_configured_size(env):
    _, cfg, store = env
    cfg = consenting(cfg, 3)
    here = messages(store, 8)
    message(store, "Pasted note", received=datetime.now(UTC) - timedelta(days=1), sent=False)  # not a message
    message(store, "Too old", received=datetime.now(UTC) - timedelta(days=200))
    sample = gate_sample.draw(store, cfg, datetime.now(UTC), seed="fixed")
    items = [i["source"] for i in sample.data["items"]]
    assert len(items) == 3 and set(items) <= set(here)
    assert (sample.data["candidates"], sample.data["size"], sample.data["seed"]) == (8, 3, "fixed")
    assert all(i["present"] is None and i["missed"] is None for i in sample.data["items"])


def test_the_same_seed_draws_the_same_messages_and_a_small_window_draws_them_all(env):
    _, cfg, store = env
    cfg = consenting(cfg, 3)
    messages(store, 8)
    first = gate_sample.chosen(store.read(), cfg, window_of(cfg), "seed-one")
    assert first == gate_sample.chosen(store.read(), cfg, window_of(cfg), "seed-one")
    assert first != gate_sample.chosen(store.read(), cfg, window_of(cfg), "seed-two")
    assert len(gate_sample.chosen(store.read(), consenting(cfg, 50), window_of(cfg), "seed-one")) == 8


def test_a_second_draw_in_the_same_window_is_refused_so_the_choice_is_not_the_persons(env):
    _, cfg, store = env
    cfg = consenting(cfg)
    messages(store, 5)
    gate_sample.draw(store, cfg, datetime.now(UTC))
    with pytest.raises(StoreError, match="already"):
        gate_sample.draw(store, cfg, datetime.now(UTC))


def test_a_window_with_no_messages_draws_nothing(env):
    _, cfg, store = env
    with pytest.raises(StoreError, match="no messages"):
        gate_sample.draw(store, consenting(cfg), datetime.now(UTC))


def test_the_readers_counts_are_saved_corrected_undone_and_checked(env):
    _, cfg, store = env
    cfg = consenting(cfg)
    messages(store, 4)
    sample = gate_sample.draw(store, cfg, datetime.now(UTC))
    first, second = (i["source"] for i in sample.data["items"][:2])
    assert gate_sample.record_reading(store, sample.id, first, 3, 1) is None
    assert gate_sample.record_reading(store, sample.id, first, 2, 0) == {"present": 3, "missed": 1}
    gate_sample.record_reading(store, sample.id, second, 1, 1)
    found = gate_sample.measure(store.read())
    assert (found.size, found.read, found.present, found.missed) == (3, 2, 3, 1)
    gate_sample.restore_reading(store, sample.id, second, None)
    assert gate_sample.measure(store.read()).read == 1
    with pytest.raises(StoreError, match="more"):
        gate_sample.record_reading(store, sample.id, first, 1, 2)
    with pytest.raises(StoreError, match="sample"):
        gate_sample.record_reading(store, sample.id, "SRC-999", 1, 0)
    with pytest.raises(StoreError, match="less than zero"):
        gate_sample.record_reading(store, sample.id, first, -1, 0)


def test_no_sample_is_zero_over_zero(env):
    _, _, store = env
    found = gate_sample.measure(store.read())
    assert (found.size, found.read, found.present, found.missed, found.items) == (0, 0, 0, 0, [])


# ---- the quality route serves them all -----------------------------------------------------------------------------


def client_for(ws, cfg):
    app = create_app(ws, cfg, TOKEN, ui_dist=ws.root / "no-ui", start_worker=False)
    base = f"{cfg.server.base_path.rstrip('/')}/api"
    return TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}), base, app


def test_the_quality_route_serves_the_new_instruments_and_the_review_pane_is_timed(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = consenting(ws.config(env={}, flags={"storage.backups.automatic": False}))
    client, api, app = client_for(ws, cfg)
    with client:
        assert client.post(f"{api}/quality/review-time", json={"screen": "today", "seconds": 90}).json() == {
            "seconds": 90
        }
        body = client.get(f"{api}/quality").json()
        assert body["review"]["days_reviewed"] == 1 and body["review"]["median_seconds"] == 90
        assert body["lost"] == {"existed": 0, "lost": 0, "days": [], "items": []}
        assert body["sources"]["over_a_day"] == 0 and body["sources"]["silent"] == 0
        assert body["sample"] is None and body["sample_allowed"] is True


def test_the_sample_is_drawn_and_read_through_the_api_and_joins_the_missed_out_of_present_figure(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = consenting(ws.config(env={}, flags={"storage.backups.automatic": False}), 2)
    client, api, app = client_for(ws, cfg)
    with client:
        store = app.state.store
        ids = messages(store, 5)
        drawn = client.post(f"{api}/quality/sample")
        assert drawn.status_code == 200, drawn.text
        sample = drawn.json()
        assert sample["size"] == 2 and len(sample["items"]) == 2 and sample["candidates"] == 5
        assert {i["source"] for i in sample["items"]} <= set(ids)
        assert all(i["title"].startswith("Message") for i in sample["items"])
        again = client.post(f"{api}/quality/sample")
        assert again.status_code == 409 and "already" in again.json()["detail"]
        target = sample["items"][0]["source"]
        saved = client.put(f"{api}/quality/sample/{sample['id']}/items/{target}", json={"present": 4, "missed": 1})
        assert saved.status_code == 200 and saved.json()["previous"] is None
        refused = client.put(f"{api}/quality/sample/{sample['id']}/items/{target}", json={"present": 1, "missed": 3})
        assert refused.status_code == 409
        client.put(
            f"{api}/quality/counts/{datetime.now(UTC).astimezone(zone(cfg)).date().isoformat()}",
            json={"present": 6, "missed": 1},
        )
        body = client.get(f"{api}/quality").json()
        assert (body["sample"]["read"], body["sample"]["present"], body["sample"]["missed"]) == (1, 4, 1)
        assert body["missed_total"] == {"present": 10, "missed": 2, "days": 1, "messages": 1}
        undone = client.post(
            f"{api}/quality/sample/{sample['id']}/items/{target}/undo", json={"previous": saved.json()["previous"]}
        )
        assert undone.status_code == 200
        assert client.get(f"{api}/quality").json()["sample"]["read"] == 0


def test_a_draw_without_consent_is_refused_through_the_api(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    client, api, _ = client_for(ws, cfg)
    with client:
        assert client.get(f"{api}/quality").json()["sample_allowed"] is False
        refused = client.post(f"{api}/quality/sample")
        assert refused.status_code == 409 and "Settings" in refused.json()["detail"]


def test_the_end_of_a_day_is_in_the_persons_own_clock(env):
    _, cfg, _ = env
    assert gate_measures.end_of(window_of(cfg).until, zone(cfg)).time() == time(23, 59, 59)
