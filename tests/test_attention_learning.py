"""What dismissals teach the attention budget (design 6.32, 6.22): putting off the same kind of suggestion again and
again keeps that kind for the morning brief, and further still stops it, by rules; Undo, a snooze, a window that has
passed and a different kind teach nothing. Names and ids are made up."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from engine import attention_learning, brief, patterns, suggestions, today_queue
from engine.config.schema import AttentionSettings
from engine.storage import Store
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

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


def test_a_kind_put_off_the_configured_number_of_times_goes_to_the_brief_instead_of_today(env):
    _, cfg, store = env
    assert cfg.steward.attention.quiet_after_dismissals == 3
    fresh = Fake("stale", "stale:new", actions=["ACT-9"])
    other = Fake("unfiled", "unfiled", count=2)
    put_off_stale(store, cfg, 2)
    found = split(cfg, store, [fresh, other])
    assert keys(found.shown) == ["stale:new", "unfiled"] and found.digest == []
    put_off_stale(store, cfg, 1)
    found = split(cfg, store, [fresh, other])
    assert keys(found.shown) == ["unfiled"] and keys(found.digest) == ["stale:new"]
    assert attention_learning.verdicts(store.read(), cfg, NOW) == {"stale": attention_learning.QUIET}


def test_a_kind_put_off_enough_times_is_not_offered_at_all_when_the_setting_says_to_stop(tmp_path):
    _, cfg, store = build(tmp_path, COCKPIT__STEWARD__ATTENTION__STOP_AFTER_DISMISSALS="5")
    try:
        fresh = Fake("stale", "stale:new", actions=["ACT-9"])
        put_off_stale(store, cfg, 4)
        found = split(cfg, store, [fresh])
        assert found.shown == [] and keys(found.digest) == ["stale:new"]
        put_off_stale(store, cfg, 1)
        found = split(cfg, store, [fresh])
        assert found.shown == [] and found.digest == []
        assert attention_learning.verdicts(store.read(), cfg, NOW) == {"stale": attention_learning.STOPPED}
    finally:
        store.close()


def test_taking_dismissals_back_teaches_nothing_and_the_kind_comes_back(env):
    _, cfg, store = env
    fresh = Fake("stale", "stale:new", actions=["ACT-9"])
    made = put_off_stale(store, cfg, 3)
    assert keys(split(cfg, store, [fresh]).digest) == ["stale:new"]
    assert suggestions.take_back(store, made[0])
    assert keys(split(cfg, store, [fresh]).shown) == ["stale:new"]


def test_a_snooze_and_dismissing_a_clash_teach_nothing(env):
    _, cfg, store = env
    for n in range(4):
        suggestions.snooze(store, cfg, f"stale:{n}", [f"ACT-{n}"], (NOW + timedelta(days=2)).date(), NOW)
    assert attention_learning.counts(store.read(), cfg, NOW) == {}
    assert attention_learning.verdicts(store.read(), cfg, NOW) == {}


def test_only_dismissals_inside_the_window_count_so_the_assistant_forgets_old_ones(env):
    _, cfg, store = env
    put_off_stale(store, cfg, 3, when=NOW - timedelta(days=cfg.steward.attention.learn_days + 1))
    assert attention_learning.verdicts(store.read(), cfg, NOW) == {}
    put_off_stale(store, cfg, 2, when=NOW - timedelta(days=2))
    assert attention_learning.counts(store.read(), cfg, NOW) == {"stale": 2}


def test_leaving_a_pattern_counts_for_its_kind_and_a_kind_taught_to_be_quiet_still_waits_for_a_change(env):
    _, cfg, store = env
    line = Fake("stale", "stale:one", actions=["ACT-1"])
    put_off_stale(store, cfg, 3)
    # A line of the quieted kind that was put off and is unchanged is held back, not saved for the brief.
    off = Fake("stale", "stale:0", actions=["ACT-0"])
    found = split(cfg, store, [off, line])
    assert keys(found.digest) == ["stale:one"] and found.shown == []
    assert patterns.STAYS_OFF == ("leave",)


def test_the_settings_can_turn_learning_off_and_stopping_needs_more_dismissals_than_quieting(tmp_path):
    _, cfg, store = build(tmp_path, COCKPIT__STEWARD__ATTENTION__QUIET_AFTER_DISMISSALS="0")
    try:
        put_off_stale(store, cfg, 6)
        assert keys(split(cfg, store, [Fake("stale", "stale:new", actions=["ACT-9"])]).shown) == ["stale:new"]
    finally:
        store.close()
    with pytest.raises(ValidationError, match="more dismissals"):
        AttentionSettings(quiet_after_dismissals=3, stop_after_dismissals=3)
    assert AttentionSettings(quiet_after_dismissals=0, stop_after_dismissals=2).stop_after_dismissals == 2


def test_the_queue_and_the_brief_follow_what_was_taught(tmp_path, monkeypatch):
    ws, cfg, store = build(tmp_path)
    try:
        lines = [
            today_queue.Line(key="stale", group="review", kind="stale", count=2, actions=["ACT-1", "ACT-2"], since="a"),
            today_queue.Line(key="overdue", group="risk", kind="overdue", count=1, since="a"),
        ]
        monkeypatch.setattr(today_queue, "_everything", lambda *a, **k: lines)
        assert set(keys(today_queue.queue(ws, store, cfg, NOW))) == {"stale", "overdue"}
        put_off_stale(store, cfg, 3)
        assert keys(today_queue.queue(ws, store, cfg, NOW)) == ["overdue"]
        yes = next(s for s in brief.build(ws, store, cfg, NOW, "morning").sections if s.key == "yes")
        assert [(x.change, x.queue) for x in yes.lines if x.kind == "digest"] == [("stale", "stale")]
    finally:
        store.close()
