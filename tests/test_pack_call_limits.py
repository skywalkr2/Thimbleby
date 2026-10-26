"""A pack that never returns is as fatal as one that crashes (design 3.5, 6.13): its event handlers, validators and
Today lines are held to a time limit, and a call still running then counts as a failure of that place under the existing
containment. What happens to a pack's held changes and queued requests when it is turned off is fixed here too. The
packs are the example plugin and its fixtures; nothing sleeps for long, because the limit is moved to a few
hundredths of a second."""

from __future__ import annotations

import threading

import pytest

from engine.applier import apply_changeset, check, release
from engine.dispatcher import parse
from engine.pack_calls import PackCalls, PackExit, PackTimeout
from engine.storage import Store, StoreError, WriteContext
from tests.test_plugins import EXAMPLE, KIND, OP, TASK, changeset, context

QUICK = 0.05
WRITE = WriteContext(actor="pm", trust="trusted", op="test")


def quick(store, seconds=QUICK):
    store.plugins.pack_calls._limit = lambda: seconds


# ---- the limit itself --------------------------------------------------------------------------------------------


def test_a_call_that_returns_gives_its_result_and_one_that_raises_gives_its_error():
    calls = PackCalls(lambda: 5)
    try:
        assert calls.run("a", lambda x, y=1: x + y, 2, y=3) == 5
        with pytest.raises(ValueError, match="broken"):
            calls.run("a", lambda: (_ for _ in ()).throw(ValueError("broken")))
    finally:
        calls.close()


def test_an_exit_from_a_pack_comes_back_as_an_ordinary_error_and_the_pack_can_be_called_again():
    calls = PackCalls(lambda: 5)

    def leaves():
        raise SystemExit(3)

    try:
        with pytest.raises(PackExit, match="SystemExit"):
            calls.run("a", leaves)
        assert calls.run("a", lambda: "still here") == "still here"
    finally:
        calls.close()


def test_a_call_still_running_at_the_limit_is_given_up_and_the_next_call_to_that_pack_fails_at_once():
    calls = PackCalls(lambda: QUICK)
    stop = threading.Event()
    try:
        with pytest.raises(PackTimeout, match="took longer than 0.05 seconds"):
            calls.run("slow", stop.wait)
        with pytest.raises(PackTimeout, match="earlier call has not finished"):
            calls.run("slow", lambda: "never runs")
        assert calls.run("other", lambda: "unaffected") == "unaffected"
        stop.set()
        # once the abandoned call ends, the pack answers again (its thread needs a moment to notice)
        for _ in range(200):
            try:
                answer = calls.run("slow", lambda: "back")
                break
            except PackTimeout:
                threading.Event().wait(0.01)
        assert answer == "back"
    finally:
        stop.set()
        calls.close()


def test_a_pack_that_calls_back_into_itself_does_not_wait_on_itself():
    calls = PackCalls(lambda: 5)
    try:
        assert calls.run("a", lambda: calls.run("a", lambda: "inner")) == "inner"
    finally:
        calls.close()


# ---- through the host ---------------------------------------------------------------------------------------------


def test_a_handler_that_hangs_is_noted_then_turns_the_pack_off_after_the_configured_failures(workspace):
    store = Store(workspace.db_path)
    stop = threading.Event()
    try:
        quick(store)
        store.plugins.registrars[EXAMPLE.name].handlers["record.changed"] = lambda event, context: stop.wait()
        with store.transaction() as tx:
            made = tx.create("note", {"text": "Committed before the handler"}, WRITE)
        assert store.read().get("note", made.id), "the commit never waits on a pack"
        assert store.plugins.active(EXAMPLE.name)
        assert "event record.changed failed: took longer than" in store.plugins.status[EXAMPLE.name].notes[-1]
        for _ in range(store.plugins.cfg.workspace.plugins.failures_before_off - 1):
            with store.transaction() as tx:
                tx.create("note", {"text": "Again"}, WRITE)
        assert not store.plugins.active(EXAMPLE.name)
        assert "event record.changed failed" in store.plugins.status[EXAMPLE.name].reason
    finally:
        stop.set()
        store.close()


def test_a_validator_that_hangs_refuses_the_op_it_was_checking_and_turns_the_pack_off(workspace):
    store = Store(workspace.db_path)
    stop = threading.Event()
    try:
        quick(store)
        ctx = context(workspace, store)
        store.plugins.registrars[EXAMPLE.name].validators["note"] = [lambda op, view: stop.wait()]
        cs = changeset(store)
        cs_note = apply_changeset(
            parse('{"ops":[{"op":"note","text":"Refuse this"}]}'),
            [],
            ctx,
            run=None,
        )
        assert store.read().get("changeset", cs_note).data["ops"][0]["status"] == "refused"
        assert not store.plugins.active(EXAMPLE.name)
        assert "validator failed: took longer than" in store.plugins.status[EXAMPLE.name].reason
        assert check(cs, ctx) is not None  # the core carries on without the pack
    finally:
        stop.set()
        store.close()


def test_today_lines_that_hang_are_skipped_noted_and_then_turn_the_pack_off(workspace):
    store = Store(workspace.db_path)
    stop = threading.Event()
    registrar = store.plugins.registrars[EXAMPLE.name]
    try:
        quick(store)

        class Hangs:
            def lines(self, view, settings):
                stop.wait()

        registrar.today_lines = {"example/hangs": Hangs()}
        assert store.plugins.today() == []
        assert store.plugins.active(EXAMPLE.name)
        assert "Today lines example/hangs failed: took longer than" in store.plugins.status[EXAMPLE.name].notes[-1]
        for _ in range(store.plugins.cfg.workspace.plugins.failures_before_off - 1):
            store.plugins.today()
        assert not store.plugins.active(EXAMPLE.name)
    finally:
        stop.set()
        store.close()


def test_the_limit_is_a_setting_with_a_default_and_a_description(workspace):
    cfg = workspace.config(env={})
    assert cfg.steward.pack_call_limit_seconds == 20
    store = Store(workspace.db_path, cfg=cfg)
    try:
        assert store.plugins.pack_calls._limit() == 20.0
    finally:
        store.close()


# ---- what a pack that is off leaves behind ---------------------------------------------------------------------


def turn_off(store):
    store.plugins.disable(EXAMPLE.name, "three failures in a row")


def test_a_held_change_of_a_pack_that_is_off_stays_held_and_is_released_when_it_is_on_again(workspace):
    store = Store(workspace.db_path)
    ctx = context(workspace, store, origin="input", trust="untrusted")
    store.plugins.tiers[OP] = "system"
    cs_id = apply_changeset(changeset(store), [], ctx, run=None)
    before = len(store.read().list(KIND))
    turn_off(store)
    with pytest.raises(StoreError, match="the add-on example is turned off, so this waits until it is on again"):
        release(store, ctx.cfg, cs_id, 0)
    held = store.read().get("changeset", cs_id).data
    assert held["ops"][0]["status"] == "held" and len(store.read().list(KIND)) == before, "nothing applied or dropped"
    store.close()
    again = Store(workspace.db_path)  # the add-on is on again
    again.plugins.tiers[OP] = "system"
    release(again, ctx.cfg, cs_id, 0)
    assert again.read().get("changeset", cs_id).data["ops"][0]["status"] == "applied"
    assert len(again.read().list(KIND)) == before + 1
    again.close()


def test_what_a_pack_already_wrote_stays_when_it_is_off(workspace):
    store = Store(workspace.db_path)
    records = store.read().list(KIND)
    turn_off(store)
    assert store.read().list(KIND) == records
    store.close()


def test_a_request_for_the_tasks_of_a_pack_that_is_off_stops_with_a_line_that_says_so(workspace):
    from engine.ai.router import Router
    from engine.intake import hand_in
    from engine.worker import Events, Worker

    store = Store(workspace.db_path)
    cfg = workspace.config(env={})
    made = hand_in(workspace, store, note="Capture a reminder").request
    with store.transaction() as tx:
        request = tx.get("request", made)
        tx.update("request", made, {"task": TASK, "state": "queued"}, WRITE, read_version=request.version)
    turn_off(store)
    worker = Worker(workspace, store, cfg, Events(), router_factory=lambda: Router(cfg, store, env={}))
    worker.run_pending()
    stopped = store.read().get("request", made).data
    assert stopped["state"] == "needs_you"
    assert stopped["waiting"] == (
        "This couldn't be processed: the add-on example is turned off, so this waits until it is on again."
    )
    store.close()


def test_the_cores_own_work_carries_on_while_a_pack_is_off(workspace):
    store = Store(workspace.db_path)
    ctx = context(workspace, store)
    turn_off(store)
    cs = apply_changeset(
        parse('{"ops":[{"op":"note","text":"Still applies"}]}'),
        [],
        ctx,
        run=None,
    )
    assert store.read().get("changeset", cs).data["ops"][0]["status"] == "applied"
    store.close()
