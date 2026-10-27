"""The AI tiers on Settings show what each costs a day (roadmap B-11b): the recorded cost of its calls over the days
the settings name for use (`ai.models.use_days`), per day, with how many calls had no price. Names come from the
fixtures."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from engine.ai import tier_costs
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

NOW = datetime(2026, 10, 28, 12, 0, tzinfo=UTC)
_TEST = WriteContext(actor="engine", trust="trusted", op="test.tier-costs")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def run(store, tier: str, cost: float | None, *, days_ago: float = 1, **more) -> None:
    store.clock = lambda: NOW.isoformat()
    with store.transaction() as tx:
        tx.create(
            "run",
            {
                "task": "notes",
                "provider": "stub",
                "model": "default",
                "tier": tier,
                "outcome": "ok",
                "cost_usd": cost,
                "started_at": (NOW - timedelta(days=days_ago)).isoformat(),
                **more,
            },
            _TEST,
        )


def test_a_tier_costs_its_calls_over_the_use_days_divided_by_the_days(env):
    _, cfg, store = env
    days = cfg.ai.models.use_days
    run(store, "routine", 0.7)
    run(store, "routine", 0.7, days_ago=2)
    run(store, "deep", 3.5)
    found = tier_costs.per_tier(store.read(), cfg, NOW)
    assert found["routine"].runs == 2 and found["routine"].days == days
    assert found["routine"].per_day_usd == pytest.approx(1.4 / days)
    assert found["deep"].per_day_usd == pytest.approx(3.5 / days)


def test_calls_outside_the_days_and_calls_that_did_no_work_are_not_counted(env):
    _, cfg, store = env
    run(store, "routine", 9.0, days_ago=cfg.ai.models.use_days + 2)
    run(store, "routine", 9.0, no_work=True)
    found = tier_costs.per_tier(store.read(), cfg, NOW)
    assert found["routine"].runs == 0 and found["routine"].per_day_usd is None


def test_a_call_with_no_price_is_counted_apart_and_never_as_free(env):
    _, cfg, store = env
    run(store, "routine", 0.5)
    run(store, "routine", None)
    found = tier_costs.per_tier(store.read(), cfg, NOW)["routine"]
    assert (found.runs, found.unpriced) == (2, 1)
    assert found.per_day_usd == pytest.approx(0.5 / cfg.ai.models.use_days)


def test_every_core_tier_is_listed_even_with_no_calls_and_an_add_ons_tier_is_not(env):
    _, cfg, store = env
    found = tier_costs.per_tier(store.read(), cfg, NOW)
    assert set(found) == {name for name in cfg.ai.tiers if "/" not in name}


def test_the_routing_view_gives_each_tier_its_cost_a_day(tmp_path):
    from tests.test_setup import client, make

    ws, cfg, store = make(tmp_path)
    with store.transaction() as tx:
        tx.create(
            "run",
            {
                "task": "notes",
                "provider": "stub",
                "model": "default",
                "tier": "routine",
                "outcome": "ok",
                "cost_usd": 0.7,
                "started_at": (datetime.now(UTC) - timedelta(hours=3)).isoformat(),
            },
            _TEST,
        )
    c, api = client(ws, cfg, store)
    tiers = {t["name"]: t for t in c.get(f"{api}/ai/routing").json()["tiers"]}
    days = cfg.ai.models.use_days
    assert tiers["routine"]["runs"] == 1 and tiers["routine"]["cost_days"] == days
    assert tiers["routine"]["cost_per_day_usd"] == pytest.approx(0.7 / days)
    assert tiers["deep"]["runs"] == 0 and tiers["deep"]["cost_per_day_usd"] is None
