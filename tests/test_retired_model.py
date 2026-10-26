"""The owner's path (promise P36): adding an AI account must never pick a model the service has retired or one that
isn't a text model, and a check that stops on a retired model says which one and offers the next that fits. The pick is
read from the service's listing only, never from a model's name (design 6.16)."""

from __future__ import annotations

import sys

import httpx

from engine.ai import adapters
from engine.ai.presets import plan_tiers, suggest_models, usable_models
from engine.ai.task import AiError, AiResult, ModelInfo
from engine.setup import known_endpoints
from tests.conftest import connection_answer
from tests.test_setup import COMMON, client, make
from tests.test_tier_presets import short_names, stock_tiers

HOSTED = [e for e in known_endpoints() if e["needs_key"] and e["base_url"] and not e["local"]]


def listing_with_retired_first():
    """A service's listing whose first entries are a retired model and a model that isn't a chat model."""
    return {
        "old-retired": ModelInfo(retired=True, released="2020-01-01T00:00:00+00:00"),
        "speech-only": ModelInfo(chat=False, released="2030-01-01T00:00:00+00:00"),
        "fit-a": ModelInfo(retired=None, chat=True, input_per_million=1, output_per_million=2),
        "fit-b": ModelInfo(input_per_million=5, output_per_million=9),
    }


def entry_with(family="fit"):
    return {"adapter": "x", "tier_presets": {"routine": {"family": family, "effort": ""}}}


def test_a_listing_pick_skips_retired_and_non_chat_models():
    got = usable_models(listing_with_retired_first())
    assert list(got) == ["fit-a", "fit-b"]
    easy, hard = suggest_models(None, listing_with_retired_first())
    assert easy == "fit-a" and hard == "fit-b"  # no preset: cheapest and dearest of the usable ones


def test_a_preset_family_never_picks_a_retired_model_even_if_newest():
    listing = {"fit-9": ModelInfo(retired=True, released="2031-01-01T00:00:00+00:00"), "fit-2": ModelInfo()}
    easy, _ = suggest_models(entry_with(), listing)
    assert easy == "fit-2"


def test_the_tiers_a_new_account_fills_skip_a_retired_model():
    ids = list(listing_with_retired_first())
    tiers, stand_in = stock_tiers()
    entry = {"adapter": "x", "tier_presets": {"routine": {"family": "old", "effort": ""}}}
    plan = plan_tiers(entry, short_names(ids), tiers, stand_in, lambda: {}, listing_with_retired_first)
    assert plan.use == {} and plan.unmatched == ["routine"]  # the only match was retired: nothing is picked
    entry = {"adapter": "x", "tier_presets": {"routine": {"family": "fit", "effort": ""}}}
    plan = plan_tiers(entry, short_names(ids), tiers, stand_in, lambda: {}, listing_with_retired_first)
    assert plan.new_models == {} and set(plan.use) == {"routine"}
    assert short_names(ids)[plan.use["routine"]] in ("fit-a", "fit-b")


def test_a_split_by_price_skips_a_retired_model():
    listing = {
        "cheap-retired": ModelInfo(retired=True, input_per_million=0.1, output_per_million=0.1),
        "mid": ModelInfo(input_per_million=1, output_per_million=1),
        "dear": ModelInfo(input_per_million=9, output_per_million=9),
    }
    tiers, stand_in = stock_tiers()
    plan = plan_tiers({"adapter": "x"}, short_names(list(listing)), tiers, stand_in, lambda: listing)
    names = short_names(list(listing))
    assert names[plan.use["routine"]] == "mid" and names[plan.use["deep"]] == "dear"


def test_only_a_listing_that_says_so_makes_a_model_unusable():
    from engine.ai.task import usable_for_chat

    assert not usable_for_chat(ModelInfo(retired=True)) and not usable_for_chat(ModelInfo(chat=False))
    assert usable_for_chat(None) and usable_for_chat(ModelInfo())


def classifier(name):
    """The error classifier of the adapter registered under this name."""
    return sys.modules[adapters.ADAPTERS[name].__module__].classify_http_error


classify_common = classifier(COMMON)
classify_messages = classifier(next(n for n in adapters.ADAPTERS if n not in (COMMON, "stub", "cli-agent")))


def response(status, message, **body):
    return httpx.Response(status, json={"error": {"message": message, **body}})


def test_classify_error_reads_a_retired_model_in_both_adapters():
    said = "The model `gone` has been deprecated and is no longer offered"
    assert classify_common(response(404, said)).kind == "model_retired"
    assert classify_common(response(400, said)).kind == "model_retired"
    assert classify_messages(response(404, said)).kind == "model_retired"
    # An ordinary bad request or a missing page is not a retired model.
    assert classify_common(response(400, "bad field")).kind == "other"
    assert classify_messages(response(404, "no such page")).kind == "other"
    assert classify_common(response(401, said)).kind == "auth"


def a_service(retired: set[str], listing):
    base = adapters.ADAPTERS[COMMON]

    class Fake(base):
        def __init__(self, settings, secret=None):
            self.settings, self.secret = settings, secret

        def run(self, task, model):
            if model in retired:
                raise AiError("model_retired", "has been deprecated")
            return AiResult(text=connection_answer(task), model_served=model, seconds=0.0)

        def list_models(self):
            return listing

    return Fake


def test_the_models_list_leaves_out_retired_models_and_suggests_one_that_fits(tmp_path, monkeypatch):
    monkeypatch.setitem(adapters.ADAPTERS, COMMON, a_service(set(), listing_with_retired_first()))
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    got = c.post(f"{api}/ai/models", json={"endpoint": HOSTED[0]["id"], "key": "not-a-real-key"}).json()
    ids = [m["id"] for m in got["models"]]
    assert ids == ["fit-a", "fit-b"]
    assert got["suggested"] in ids  # never the first listed (a retired one)


def test_a_check_stopped_by_a_retired_model_names_it_and_offers_the_next(tmp_path, monkeypatch):
    monkeypatch.setitem(adapters.ADAPTERS, COMMON, a_service({"fit-a"}, listing_with_retired_first()))
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    body = {
        "endpoint": HOSTED[0]["id"],
        "key": "not-a-real-key",
        "models": {"everyday": "fit-a"},
        "use": {"routine": "everyday", "deep": "everyday"},
    }
    got = c.post(f"{api}/ai/account-check", json=body).json()
    assert got["ok"] is False and got["reason"] == "model_retired"
    assert got["message"] == "The model this account was using for everyday work is no longer offered by this service"
    assert "fit-a" not in got["message"] and "fit-b" not in got["message"]  # the model's name is never shown
    assert got["model"] == "fit-a" and got["next_model"] == "fit-b"
    assert "deprecated" not in got["message"]  # the service's words are not the explanation
