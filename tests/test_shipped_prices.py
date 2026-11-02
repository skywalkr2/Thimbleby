"""The prices the app ships for services whose model list has none (P97): found by family and version, used for every
estimate and run cost, so the spending limits count those runs."""

from __future__ import annotations

import httpx
import pytest

from engine.ai import shipped_prices
from engine.ai.router import BudgetReached
from engine.ai.task import ModelInfo
from tests.test_ai import NOW, TASK, cfg, ok_body, router_with, store  # noqa: F401  (fixtures)

TABLE = {
    "made-up-service": {
        "models": [
            {"family": "fit", "version": "2.5", "input": 4, "output": 20, "cached_input": 0.2},
            {"family": "fit", "version": "2", "input": 5, "output": 25},
        ]
    }
}


@pytest.fixture
def table(monkeypatch):
    monkeypatch.setattr(shipped_prices, "_table", lambda: TABLE)


def test_a_price_is_found_by_family_and_version_with_a_date_stamp_left_out(table):
    assert shipped_prices.price_for("made-up-service", "fit-2-5-20260101")["input"] == 4
    assert shipped_prices.price_for("made-up-service", "vendor-fit-2")["output"] == 25
    # Cached input defaults to the input price when the table gives none.
    assert shipped_prices.price_for("made-up-service", "fit-2")["cached_input"] == 5
    assert shipped_prices.price_for("made-up-service", "fit-3") is None
    assert shipped_prices.price_for("made-up-service", "other-2") is None
    assert shipped_prices.price_for("another-service", "fit-2") is None
    assert shipped_prices.price_for(None, "fit-2") is None


def test_a_listing_with_no_prices_gets_the_shipped_ones_and_keeps_its_own(table):
    listing = {
        "fit-2": ModelInfo(),
        "fit-9": ModelInfo(),
        "own-1": ModelInfo(input_per_million=1, output_per_million=2),
    }
    got = shipped_prices.with_prices("made-up-service", listing)
    assert (got["fit-2"].input_per_million, got["fit-2"].output_per_million) == (5, 25)
    assert got["fit-9"].input_per_million is None and got["own-1"].input_per_million == 1


def test_every_shipped_price_is_complete_and_readable():
    for service in shipped_prices._table().values():
        assert service["checked"] and service["page"].startswith("https://")
        for entry in service["models"]:
            assert entry["family"] and shipped_prices._version(entry["version"])
            assert entry["input"] > 0 and entry["output"] > 0


def test_runs_on_a_service_that_lists_no_prices_count_against_the_daily_limit(cfg, store, table):  # noqa: F811
    """The person's path: a week of runs on a service whose list has no prices counted nothing, so the daily and
    monthly limits never stopped them."""
    main = cfg.ai.providers["main"]
    main.kind = "made-up-service"
    short = cfg.ai.tiers["routine"].use.partition("/")[2]
    main.models[short] = "fit-2"
    cfg.ai.prices.clear()
    cfg.ai.tiers["routine"].fallback = []
    cfg.ai.budgets.per_day_usd = 0.02
    router, _ = router_with(cfg, store, {"main": lambda r: httpx.Response(200, json=ok_body())})
    router.catalogs.model = lambda provider, model_id, fetch: ModelInfo()  # the service's list carries no prices
    assert router.estimate(TASK) is not None
    router.call(TASK, request_id="REQ-1")  # 1,000 in and 500 out at $5/$25 per million: about $0.0175
    run = store.read().list("run")[-1].data
    assert run["cost_usd"] == pytest.approx(0.0175)
    router.call(TASK, request_id="REQ-2")
    with pytest.raises(BudgetReached):
        router.call(TASK, request_id="REQ-3")
