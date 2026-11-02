"""What dismissals show the attention budget (design 6.32, 6.22): putting off the same kind of suggestion again and
again only raises one question on Today, "Quiet them into the morning brief?" (or "Stop offering them?"), with the
person's own taps as its reason. Nothing is quieted until the person says yes; Keep showing puts the question off for a
configured number of days; Undo, a snooze, a window that has passed and a different kind count for nothing; and what the
counts had quieted before the question existed stays quieted. Names and ids are made up."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.app import create_app
from engine import attention_learning, brief, patterns, suggestions, today_queue
from engine.config import load_config
from engine.config.schema import AttentionSettings
from engine.storage import Store
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

TOKEN = "attention-token"

NOW = datetime(2026, 10, 19, 9, 0, tzinfo=UTC)
ZONE_UTC = {"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"}


class Clock:
    def __call__(self) -> str:
        return NOW.isoformat(timespec="seconds")


class Fake:
    def __init__(self, kind, key, count=1, actions=(), questions=()):
        self.kind, self.key, self.count = kind, key, count
        self.actions, self.questions = list(actions), list(questions)


def keys(lines):
    return [x.key for x in lines]


def build(tmp_path, **env):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={**ZONE_UTC, "COCKPIT__STEWARD__ATTENTION__DAILY_CAP": "20", **env})
    return ws, cfg, Store(ws.db_path, cfg=cfg, clock=Clock())


@pytest.fixture
def env(tmp_path):
    ws, cfg, store = build(tmp_path)
    yield ws, cfg, store
    store.close()


def put_off_stale(store, cfg, times, when=NOW):
    """Put off `times` different stale lines, so every dismissal is on its own line."""
    made = []
    for n in range(times):
        made.append(suggestions.put_off(store, cfg, Fake("stale", f"stale:{n}", actions=[f"ACT-{n}"]), when))
    return made


def split(cfg, store, lines, now=NOW):
    return suggestions.split(cfg, store.read(), lines, now)


def asked(ws, store, cfg, now=NOW):
    """The attention questions on Today's queue, as (kind, state, count)."""
    return [(x.text, x.state, x.count) for x in today_queue.queue(ws, store, cfg, now) if x.kind == "attention"]


def stale_lines():
    return [Fake("stale", "stale:new", actions=["ACT-9"]), Fake("unfiled", "unfiled", count=2)]


def test_reaching_the_threshold_only_asks_and_quiets_nothing(env):
    ws, cfg, store = env
    assert cfg.steward.attention.quiet_after_dismissals == 3
    fresh, other = stale_lines()
    put_off_stale(store, cfg, 2)
    assert asked(ws, store, cfg) == []
    put_off_stale(store, cfg, 1)
    found = split(cfg, store, [fresh, other])
    assert keys(found.shown) == ["stale:new", "unfiled"] and found.digest == []
    assert attention_learning.verdicts(cfg) == {}
    assert asked(ws, store, cfg) == [("stale", "quiet", 3)]


def test_saying_yes_to_quiet_them_keeps_the_kind_for_the_brief_and_the_question_goes(env):
    ws, cfg, store = env
    fresh, other = stale_lines()
    put_off_stale(store, cfg, 3)
    attention_learning.choose(ws, cfg, store, "stale", attention_learning.QUIET)
    cfg = ws.config(env={**ZONE_UTC, "COCKPIT__STEWARD__ATTENTION__DAILY_CAP": "20"})
    assert cfg.steward.attention.quieted_kinds == ["stale"]
    assert attention_learning.verdicts(cfg) == {"stale": attention_learning.QUIET}
    found = split(cfg, store, [fresh, other])
    assert keys(found.shown) == ["unfiled"] and keys(found.digest) == ["stale:new"]
    assert asked(ws, store, cfg) == []
    # Taking the yes back (the toast's Undo) shows the kind and asks again.
    attention_learning.choose(ws, cfg, store, "stale", None)
    cfg = ws.config(env={**ZONE_UTC, "COCKPIT__STEWARD__ATTENTION__DAILY_CAP": "20"})
    assert keys(split(cfg, store, [fresh]).shown) == ["stale:new"]
    assert asked(ws, store, cfg) == [("stale", "quiet", 3)]


def test_a_kind_put_off_enough_times_asks_to_stop_it_and_only_a_yes_stops_it(tmp_path):
    ws, cfg, store = build(tmp_path, COCKPIT__STEWARD__ATTENTION__STOP_AFTER_DISMISSALS="5")
    try:
        fresh = Fake("stale", "stale:new", actions=["ACT-9"])
        put_off_stale(store, cfg, 4)
        assert asked(ws, store, cfg) == [("stale", "quiet", 4)]
        put_off_stale(store, cfg, 1)
        assert asked(ws, store, cfg) == [("stale", "stopped", 5)]
        assert keys(split(cfg, store, [fresh]).shown) == ["stale:new"]
        cfg.steward.attention.stopped_kinds = ["stale"]
        found = split(cfg, store, [fresh])
        assert found.shown == [] and found.digest == []
        assert attention_learning.verdicts(cfg) == {"stale": attention_learning.STOPPED}
        assert asked(ws, store, cfg) == []
    finally:
        store.close()


def test_keep_showing_hides_the_question_for_the_configured_days_and_the_kind_keeps_showing(env):
    ws, cfg, store = env
    fresh = Fake("stale", "stale:new", actions=["ACT-9"])
    put_off_stale(store, cfg, 3)
    assert cfg.steward.attention.keep_showing_days == 14
    until = (NOW + timedelta(days=cfg.steward.attention.keep_showing_days)).date()
    suggestions.snooze(store, cfg, attention_learning.line_key("stale"), [], until, NOW)
    assert asked(ws, store, cfg) == []
    assert asked(ws, store, cfg, NOW + timedelta(days=13)) == []
    assert keys(split(cfg, store, [fresh]).shown) == ["stale:new"]
    assert attention_learning.counts(store.read(), cfg, NOW) == {"stale": 3}  # the answer isn't itself a dismissal
    assert asked(ws, store, cfg, NOW + timedelta(days=14)) == [("stale", "quiet", 3)]


def test_a_kind_the_counts_had_quieted_before_the_question_stays_quiet(env):
    ws, cfg, store = env
    fresh = Fake("stale", "stale:new", actions=["ACT-9"])
    put_off_stale(store, cfg, 3)
    steward = ws.config_dir / "steward.yaml"
    steward.write_text(
        "\n".join(
            line
            for line in steward.read_text().splitlines()
            if not line.strip().startswith(("quieted_kinds", "stopped_kinds"))
        )
        + "\n"
    )
    cfg = ws.config(env={**ZONE_UTC, "COCKPIT__STEWARD__ATTENTION__DAILY_CAP": "20"})
    attention_learning.keep_earlier_choices(ws, store.read(), cfg, NOW)
    cfg = ws.config(env={**ZONE_UTC, "COCKPIT__STEWARD__ATTENTION__DAILY_CAP": "20"})
    assert cfg.steward.attention.quieted_kinds == ["stale"]
    found = split(cfg, store, [fresh])
    assert found.shown == [] and keys(found.digest) == ["stale:new"]
    assert asked(ws, store, cfg) == []
    # Done once: later dismissals only ask, and what the person undid isn't quieted again.
    attention_learning.choose(ws, cfg, store, "stale", None)
    cfg = ws.config(env={**ZONE_UTC, "COCKPIT__STEWARD__ATTENTION__DAILY_CAP": "20"})
    attention_learning.keep_earlier_choices(ws, store.read(), cfg, NOW)
    assert ws.config(env=ZONE_UTC).steward.attention.quieted_kinds == []


def test_taking_dismissals_back_removes_the_question(env):
    ws, cfg, store = env
    made = put_off_stale(store, cfg, 3)
    assert asked(ws, store, cfg) == [("stale", "quiet", 3)]
    assert suggestions.take_back(store, made[0])
    assert asked(ws, store, cfg) == []


def test_a_snooze_and_dismissing_a_clash_teach_nothing(env):
    ws, cfg, store = env
    for n in range(4):
        suggestions.snooze(store, cfg, f"stale:{n}", [f"ACT-{n}"], (NOW + timedelta(days=2)).date(), NOW)
    assert attention_learning.counts(store.read(), cfg, NOW) == {}
    assert asked(ws, store, cfg) == []


def test_only_dismissals_inside_the_window_count_so_the_assistant_forgets_old_ones(env):
    ws, cfg, store = env
    put_off_stale(store, cfg, 3, when=NOW - timedelta(days=cfg.steward.attention.learn_days + 1))
    assert asked(ws, store, cfg) == []
    put_off_stale(store, cfg, 2, when=NOW - timedelta(days=2))
    assert attention_learning.counts(store.read(), cfg, NOW) == {"stale": 2}


def test_a_kind_the_person_quieted_still_waits_for_a_change_when_a_line_was_put_off(env):
    _, cfg, store = env
    cfg.steward.attention.quieted_kinds = ["stale"]
    line = Fake("stale", "stale:one", actions=["ACT-1"])
    put_off_stale(store, cfg, 1)
    # A line of the quieted kind that was put off and is unchanged is held back, not saved for the brief.
    off = Fake("stale", "stale:0", actions=["ACT-0"])
    found = split(cfg, store, [off, line])
    assert keys(found.digest) == ["stale:one"] and found.shown == []
    assert patterns.STAYS_OFF == ("leave",)


def test_the_settings_can_turn_asking_off_and_stopping_needs_more_dismissals_than_quieting(tmp_path):
    ws, cfg, store = build(tmp_path, COCKPIT__STEWARD__ATTENTION__QUIET_AFTER_DISMISSALS="0")
    try:
        put_off_stale(store, cfg, 6)
        assert asked(ws, store, cfg) == []
    finally:
        store.close()
    with pytest.raises(ValidationError, match="more dismissals"):
        AttentionSettings(quiet_after_dismissals=3, stop_after_dismissals=3)
    with pytest.raises(ValidationError, match="not a kind of suggestion"):
        AttentionSettings(quieted_kinds=["overdue"])
    assert AttentionSettings(quiet_after_dismissals=0, stop_after_dismissals=2).stop_after_dismissals == 2


def test_the_queue_and_the_brief_follow_what_the_person_chose(tmp_path, monkeypatch):
    ws, cfg, store = build(tmp_path)
    try:
        lines = [
            today_queue.Line(key="stale", group="review", kind="stale", count=2, actions=["ACT-1", "ACT-2"], since="a"),
            today_queue.Line(key="overdue", group="risk", kind="overdue", count=1, since="a"),
        ]
        monkeypatch.setattr(today_queue, "_everything", lambda *a, **k: lines)
        assert set(keys(today_queue.queue(ws, store, cfg, NOW))) == {"stale", "overdue"}
        put_off_stale(store, cfg, 3)
        assert set(keys(today_queue.queue(ws, store, cfg, NOW))) == {"stale", "overdue"}
        cfg.steward.attention.quieted_kinds = ["stale"]
        assert keys(today_queue.queue(ws, store, cfg, NOW)) == ["overdue"]
        yes = next(s for s in brief.build(ws, store, cfg, NOW, "morning").sections if s.key == "yes")
        assert [(x.change, x.queue) for x in yes.lines if x.kind == "digest"] == [("stale", "stale")]
    finally:
        store.close()


@pytest.fixture
def api(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = load_config(
        ws.config_dir,
        env=ZONE_UTC,
        flags={"server.base_path": "/", "storage.backups.automatic": False},
    )
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client, app.state.store, ws, cfg, app.state.worker


def put_off_now(store, cfg, worker, times):
    for n in range(times):
        suggestions.put_off(store, cfg, Fake("stale", f"stale:{n}", actions=[f"ACT-{n}"]), worker.now())


def test_the_routes_quiet_a_kind_on_a_yes_and_undo_shows_it_again(api):
    client, store, ws, cfg, worker = api
    put_off_now(store, cfg, worker, 3)
    queue_now = client.get("/api/today/queue").json()
    found = [x for x in queue_now if x["kind"] == "attention"]
    assert [(x["text"], x["state"], x["count"]) for x in found] == [("stale", "quiet", 3)]
    done = client.post("/api/attention/stale/quiet")
    assert done.status_code == 200 and done.json() == {"kind": "stale", "state": "quiet"}
    assert load_config(ws.config_dir, env=ZONE_UTC).steward.attention.quieted_kinds == ["stale"]
    assert [x for x in client.get("/api/today/queue").json() if x["kind"] == "attention"] == []
    assert client.post("/api/attention/stale/show").json()["state"] == "shown"
    assert load_config(ws.config_dir, env=ZONE_UTC).steward.attention.quieted_kinds == []
    assert client.post("/api/attention/overdue/quiet").status_code == 404


def test_the_routes_keep_showing_puts_the_question_off_and_undo_gives_it_back(api):
    client, store, ws, cfg, worker = api
    put_off_now(store, cfg, worker, 3)
    done = client.post("/api/attention/stale/keep")
    assert done.status_code == 200
    assert [x for x in client.get("/api/today/queue").json() if x["kind"] == "attention"] == []
    assert load_config(ws.config_dir, env=ZONE_UTC).steward.attention.quieted_kinds == []
    assert client.post(f"/api/suggestions/not-now/{done.json()['signal']}/undo").status_code == 200
    assert [x["text"] for x in client.get("/api/today/queue").json() if x["kind"] == "attention"] == ["stale"]
