"""The background work never stops silently: every pass of every loop is guarded (an exit counts as a failure), each
loop beats, and a watchdog starts a stopped loop again and reports a stuck one. Nothing sleeps; the monotonic time is
passed in."""

from __future__ import annotations

import threading
from datetime import timedelta

from engine.assistant_status import assistant_state
from engine.today_queue import queue
from tests.test_silent_stops import NOTE, data, env, hand, worker_of  # noqa: F401


def test_a_jobs_pass_that_exits_does_not_stop_the_next_pass(env):
    worker = worker_of(env)
    calls = []

    def exits():
        calls.append(1)
        worker._read_now.set()
        if len(calls) == 1:
            raise SystemExit(1)
        worker._stop.set()
        return 0

    worker.run_due_jobs = exits  # type: ignore[method-assign]
    worker._read_now.set()
    worker._jobs_loop()
    assert len(calls) == 2


def test_each_loop_survives_a_pass_that_exits(env):
    worker = worker_of(env)
    for name, loop, step in (
        ("backups", worker._backup_loop, "backup_if_due"),
        ("requests", worker._loop, "run_pending"),
    ):
        calls = []

        def exits(calls=calls):
            calls.append(1)
            if len(calls) == 1:
                raise SystemExit(1)
            worker._stop.set()
            return 0

        setattr(worker, step, exits)
        worker._wake.set()
        worker._stop.clear()
        loop()
        assert len(calls) == 2, name
        assert name in worker._beats


def test_a_request_whose_processing_exits_gets_its_needs_you_line_and_the_next_one_runs(env, monkeypatch):
    worker = worker_of(env)
    first = hand(env)
    second = hand(env, NOTE + " Second.")
    seen = []
    import engine.worker as w

    real = w.process

    def process(ws, store, cfg, router, request_id, **kw):
        seen.append(request_id)
        if len(seen) == 1:
            raise SystemExit(2)
        return real(ws, store, cfg, router, request_id, **kw)

    monkeypatch.setattr(w, "process", process)
    worker.run_pending()
    assert data(env, first)["state"] == "needs_you"
    assert len(seen) == 2 and seen[1] != first
    assert data(env, second)["state"] != "queued"


def test_a_dead_loop_is_stopped_and_one_check_starts_it_again(env):
    worker = worker_of(env)
    ran = threading.Event()

    def quick():
        ran.set()

    worker._loop_fns["jobs"] = quick
    dead = threading.Thread(target=lambda: None)
    dead.start()
    dead.join()
    worker._loop_threads["jobs"] = dead
    worker._beats["jobs"] = 100.0
    assert worker.loop_health(now_monotonic=101.0)["jobs"] == "stopped"
    worker.watchdog_check(now_monotonic=101.0)
    worker._loop_threads["jobs"].join(timeout=5)
    assert ran.is_set()
    assert worker.loop_restarts == 1
    assert worker.loop_restarted_at is not None


def test_a_loop_is_not_stopped_while_the_worker_is_stopping_or_restarting(env):
    worker = worker_of(env)
    dead = threading.Thread(target=lambda: None)
    dead.start()
    dead.join()
    worker._loop_threads["jobs"] = dead
    worker._stop.set()
    assert worker.loop_health(now_monotonic=1.0)["jobs"] == "ok"


def test_an_old_beat_is_stuck_is_never_started_twice_and_shows_on_status_and_today(env):
    ws, cfg, store, clock = env
    worker = worker_of(env)
    started = []
    worker._loop_fns["jobs"] = lambda: started.append(1)
    alive = threading.Event()
    holder = threading.Thread(target=alive.wait, daemon=True)
    holder.start()
    worker._loop_threads["jobs"] = holder
    limit = cfg.steward.background_stuck_after_minutes * 60
    worker._beats["jobs"] = 1000.0
    try:
        assert worker.loop_health(now_monotonic=1000.0 + limit - 1)["jobs"] == "ok"
        late = 1000.0 + limit + 5
        assert worker.loop_health(now_monotonic=late)["jobs"] == "stuck"
        worker.watchdog_check(now_monotonic=late)
        worker.watchdog_check(now_monotonic=late + 30)
        assert started == [] and worker.loop_restarts == 0 and not worker.restarting
        since = worker.stuck_since(now_monotonic=late)
        assert since is not None and since < clock()
        state = assistant_state(store, cfg, clock(), loop_stuck_since=since)
        assert state.loop_stuck_since == since.astimezone(state.loop_stuck_since.tzinfo)
        lines = queue(ws, store, cfg, clock(), stuck=since.isoformat())
        stuck = [x for x in lines if x.kind == "stuck"]
        assert len(stuck) == 1 and stuck[0].group == "decide" and stuck[0].waiting_since == since.isoformat()
    finally:
        alive.set()
        holder.join(timeout=5)


def test_a_restart_in_the_last_hour_shows_and_an_older_one_does_not(env):
    _, cfg, store, clock = env
    at = clock() - timedelta(minutes=10)
    assert assistant_state(store, cfg, clock(), loop_restarted_at=at).loop_restarted_at is not None
    old = clock() - timedelta(hours=2)
    assert assistant_state(store, cfg, clock(), loop_restarted_at=old).loop_restarted_at is None
